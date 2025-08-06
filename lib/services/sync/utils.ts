/**
 * Utility functions and concurrency controls for sync service
 */

import { Q, Database } from '@nozbe/watermelondb';
import { hasUnsyncedChanges } from '@nozbe/watermelondb/sync';
import { Mutex } from 'async-mutex';
import { v4 as uuid } from 'uuid';

import { SYNC_CONSTANTS } from './types';
import { Profile } from '../../models/Profile';
import supabase from '../../supabase';

// Create a Mutex instance for synchronization locking
export const syncMutex = new Mutex();

/**
 * Semaphore for limiting concurrent requests
 */
export class Semaphore {
  private counter: number;
  private waiting: (() => void)[] = [];

  constructor(concurrentLimit: number) {
    this.counter = concurrentLimit;
  }

  public acquire<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (this.counter > 0) {
        this.counter--;
        Promise.resolve(fn())
          .then(resolve)
          .catch(reject)
          .finally(() => this.release());
      } else {
        this.waiting.push(() => {
          Promise.resolve(fn())
            .then(resolve)
            .catch(reject)
            .finally(() => this.release());
        });
      }
    });
  }

  public release(): void {
    this.counter++;
    if (this.waiting.length > 0 && this.counter > 0) {
      this.counter--;
      const next = this.waiting.shift();
      if (next) {
        next();
      }
    }
  }

  public isLocked(): boolean {
    return this.counter === 0;
  }
}

// Create a semaphore to limit concurrent network requests
export const requestSemaphore = new Semaphore(SYNC_CONSTANTS.MAX_CONCURRENT_REQUESTS);

/**
 * Execute an RPC call with retry capability
 *
 * @param rpcName The name of the RPC function to call
 * @param params Parameters to pass to the RPC function
 * @param maxRetries Maximum number of retries before giving up
 * @returns Promise resolving to the data returned by the RPC call
 */
export async function executeRpcWithRetry(
  rpcName: string,
  params: Record<string, unknown>,
  maxRetries: number = 3
): Promise<unknown> {
  let retries = 0;
  let lastError: unknown = null;

  while (retries < maxRetries) {
    try {
      return await requestSemaphore.acquire(async () => {
        const startTime = Date.now();
        const { data, error } = await supabase.rpc(rpcName, params as Record<string, unknown>);
        const duration = Date.now() - startTime;

        // Track slow operations for performance monitoring
        if (duration > 2000) {
          console.warn(`[Performance] Slow RPC call to ${rpcName}: ${duration}ms`);
        }

        if (error) throw error;
        return data;
      });
    } catch (error) {
      lastError = error;
      retries++;

      // Log retry attempts
      console.warn(`RPC call to ${rpcName} failed (attempt ${retries}/${maxRetries}):`, error as unknown);

      // Exponential backoff with jitter to prevent request storms
      const delay = Math.min(1000 * Math.pow(2, retries) + Math.random() * 1000, 10000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Generates a unique ID for new records
 */
export function generateId(): string {
  return uuid();
}

/**
 * Checks if there are any unsynced changes in the database
 * @param database The WatermelonDB database instance
 * @returns Promise that resolves to a boolean
 */
export async function checkUnsyncedChanges(database: Database): Promise<boolean> {
  try {
    return await hasUnsyncedChanges({ database });
  } catch (error) {
    console.error('Error checking for unsynced changes:', error);
    // Default to true in case of error to trigger a sync attempt
    return true;
  }
}

/**
 * Initializes database with user profile if it doesn't exist yet
 *
 * @param database The WatermelonDB database instance
 * @param userId The user ID to initialize data for
 * @param userEmail Email address of the user
 */
export async function initializeUserData(
  database: Database,
  userId: string,
  userEmail: string
): Promise<void> {
  // Check if user profile exists
  const profiles = database.get<Profile>('profiles');
  const profile = await profiles.query(Q.where('userId', userId)).fetch();

  // If profile doesn't exist, create it
  if (profile.length === 0) {
    await database.write(async () => {
      await profiles.create((profile) => {
        profile.userId = userId;
        // Ensure username is always a string by providing a fallback
        const emailParts = userEmail.split('@');
        profile.username = emailParts.length > 0 && emailParts[0] ? emailParts[0] : 'user';
        profile.createdAt = new Date(); // Use Date object instead of number
        profile.updatedAt = new Date(); // Use Date object instead of number
      });
    });

    console.warn('User profile initialized');

    // Mark as first sync
    await database.adapter.setLocal('sync_is_empty', 'true');
  }
}

/**
 * Schedule periodic synchronization
 *
 * @param database The WatermelonDB database instance
 * @param userId The user ID to sync data for
 * @param syncFunction The function to call for synchronization
 * @param intervalMinutes How often to sync (in minutes)
 * @returns A function to cancel the scheduled sync
 */
export function scheduleSync(
  database: Database,
  userId: string,
  syncFunction: (db: Database, id: string, isFirst: boolean, force: boolean) => Promise<boolean>,
  intervalMinutes = 15
): () => void {
  const interval = setInterval(
    async () => {
      // Only sync if there are changes to sync
      const hasChanges = await checkUnsyncedChanges(database);
      if (hasChanges) {
        await syncFunction(database, userId, false, false);
      }
    },
    intervalMinutes * 60 * 1000
  );

  // Return function to clear interval
  return () => clearInterval(interval);
}

/**
 * Performs a full reset and sync from server
 * Use with caution as this will delete all local data
 *
 * @param database The WatermelonDB database instance
 * @param userId The user ID to sync data for
 * @param userEmail Email address of the user
 * @param syncFunction The function to call for synchronization
 * @returns Promise that resolves to a boolean indicating success
 */
export async function resetAndSync(
  database: Database,
  userId: string,
  userEmail: string,
  syncFunction: (db: Database, id: string, isFirst: boolean, force: boolean) => Promise<boolean>
): Promise<boolean> {
  try {
    // Reset database
    await database.write(async () => {
      await database.unsafeResetDatabase();
    });

    // Reinitialize user data
    await initializeUserData(database, userId, userEmail);

    // Mark as empty so we can use turbo sync
    await database.adapter.setLocal('sync_is_empty', 'true');

    // Perform full sync
    return syncFunction(database, userId, true, false);
  } catch (error) {
    console.error('Reset and sync failed:', error);
    return false;
  }
}
