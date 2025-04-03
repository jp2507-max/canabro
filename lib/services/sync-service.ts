/**
 * Sync Service for WatermelonDB and Supabase
 *
 * Handles synchronization between local WatermelonDB and remote Supabase
 */

import { Database, Q } from '@nozbe/watermelondb';
import { synchronize, hasUnsyncedChanges } from '@nozbe/watermelondb/sync';
import type { SyncTableChangeSet } from '@nozbe/watermelondb/sync'; // SyncPullResult is unused
import SyncLogger from '@nozbe/watermelondb/sync/SyncLogger';
import NetInfo from '@react-native-community/netinfo';
import { Mutex } from 'async-mutex'; // Import Mutex
import { v4 as uuid } from 'uuid';

// Unused model imports removed: DiaryEntry, GrowJournal, GrowLocation, JournalEntry, Plant, PlantTask
import { Profile } from '../models/Profile';
import supabase from '../supabase';

// Create a Mutex instance for synchronization locking
const syncMutex = new Mutex();

// Add a minimum time between syncs (30 seconds)
const MIN_SYNC_INTERVAL_MS = 30 * 1000;
let lastSuccessfulSyncTime = 0;
// Add a sync lock timeout to prevent deadlocks
const SYNC_LOCK_TIMEOUT_MS = 30 * 1000; // 30 seconds

// Track sync attempts to avoid too many logs
let recentSyncAttempts = 0;
let lastSyncAttemptLogTime = 0;

// Array of table names to synchronize
const TABLES_TO_SYNC = [
  'profiles',
  'plants',
  'grow_journals',
  'journal_entries', // Re-enabled
  'grow_locations',
  'diary_entries',
  'plant_tasks',
  'posts', // Re-enabled
];

// Mapping of watermelonDB id fields to Supabase id fields - Unused
// const ID_FIELD_MAPPING: Record<string, string> = {
//   profiles: 'userId',
//   plants: 'plantId',
//   grow_journals: 'journalId',
//   journal_entries: 'entryId',
//   grow_locations: 'locationId',
//   diary_entries: 'entryId',
//   plant_tasks: 'taskId',
//   posts: 'postId',
// };

// Create a sync logger
const logger = new SyncLogger(20); // Keep last 20 sync logs

/**
 * Generates a unique ID for new records
 */
export const generateId = (): string => uuid();

/**
 * Checks if there is an active internet connection
 * @returns Promise that resolves to a boolean
 */
async function isOnline(): Promise<boolean> {
  const netInfo = await NetInfo.fetch();
  return netInfo.isConnected === true;
}

/**
 * Checks if there are any unsynced changes in the database
 * @param database The WatermelonDB database instance
 * @returns Promise that resolves to a boolean
 */
export async function checkUnsyncedChanges(database: Database): Promise<boolean> {
  return hasUnsyncedChanges({ database });
}

/**
 * Format a date for Supabase
 * Handles both Date objects and numeric timestamps from WatermelonDB
 */
function formatDateForSupabase(date: Date | number | string | null): string | null {
  if (date === null) return null;

  if (typeof date === 'number') {
    return new Date(date).toISOString();
  } else if (typeof date === 'string') {
    // Check if it's already an ISO string
    if (date.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      return date;
    }
    // Try to parse it
    const parsedDate = new Date(date);
    return isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
  } else if (date instanceof Date) {
    return date.toISOString();
  }

  return null;
}

/**
 * Synchronize local WatermelonDB with remote Supabase
 *
 * @param database The WatermelonDB database instance
 * @param userId The user ID to sync data for
 * @param isFirstSync Whether this is the first sync (for optimizing with turbo login)
 * @param forceSync Set to true to bypass the cooldown period
 * @returns Promise that resolves to a boolean indicating success
 */
export async function synchronizeWithServer(
  database: Database,
  userId: string,
  isFirstSync: boolean = false,
  forceSync: boolean = false
): Promise<boolean> {
  const callTimestamp = Date.now(); // Timestamp for this specific call attempt

  // Check if we've synced recently (unless forceSync is true)
  if (!forceSync && callTimestamp - lastSuccessfulSyncTime < MIN_SYNC_INTERVAL_MS) {
    // Limit logging of frequent sync attempts to avoid console spam
    recentSyncAttempts++;
    const shouldLog = callTimestamp - lastSyncAttemptLogTime > 5000; // Only log once every 5 seconds

    if (shouldLog) {
      console.log(
        `[Sync Service @ ${callTimestamp}] Sync throttled. Next sync available in ${Math.ceil((MIN_SYNC_INTERVAL_MS - (callTimestamp - lastSuccessfulSyncTime)) / 1000)}s. (${recentSyncAttempts} attempts since last log)`
      );
      lastSyncAttemptLogTime = callTimestamp;
      recentSyncAttempts = 0;
    }
    return false;
  }

  console.log(`[Sync Service Entry @ ${callTimestamp}] Attempting to acquire sync lock...`);

  // Check for internet connection first before attempting to acquire the lock
  if (!(await isOnline())) {
    console.log(`[Sync Service @ ${callTimestamp}] No internet connection, skipping sync.`);
    return false;
  }

  // Check if the mutex is already locked
  if (syncMutex.isLocked()) {
    console.log(
      `[Sync Service @ ${callTimestamp}] Sync already in progress, skipping this attempt.`
    );
    return false; // Indicate that sync didn't run due to concurrency
  }

  // Use a timeout release mechanism to avoid deadlocks
  let release: (() => void) | null = null;
  let lockTimedOut = false;
  const timeoutId = setTimeout(() => {
    if (release) {
      console.error(
        `[Sync Service @ ${callTimestamp}] Sync lock timed out after ${SYNC_LOCK_TIMEOUT_MS}ms. Forcing release.`
      );
      lockTimedOut = true;
      release();
    }
  }, SYNC_LOCK_TIMEOUT_MS);

  // Define attemptSync function here, outside the try block
  async function attemptSync(): Promise<boolean> {
    let success = false; // Define success within attemptSync scope
    try {
      await synchronize({
        database,
        log: logger.newLog(), // Use a new log for each attempt if retrying
        pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
          const lastPulledAtISO = lastPulledAt ? formatDateForSupabase(lastPulledAt) : null;
          try {
            const { data, error } = await supabase.rpc('sync_pull', {
              last_pulled_at: lastPulledAtISO,
              schema_version: schemaVersion,
              user_id: userId,
              migration: migration ? migration : null,
            });
            if (error) throw new Error(`Sync pull failed: ${error.message}`);

            if (isFirstSync && lastPulledAt === null) {
              const json = data ? JSON.stringify(data) : '{}';
              return { syncJson: json };
            } else {
              const receivedChanges = data?.changes || {};
              const ensuredChanges: Record<string, SyncTableChangeSet> = {};
              for (const table of TABLES_TO_SYNC) {
                ensuredChanges[table] = { created: [], updated: [], deleted: [] };
              }
              for (const table of Object.keys(receivedChanges)) {
                if (TABLES_TO_SYNC.includes(table)) {
                  ensuredChanges[table] = {
                    created: receivedChanges[table]?.created || [],
                    updated: receivedChanges[table]?.updated || [],
                    deleted: receivedChanges[table]?.deleted || [],
                  };
                }
              }
              return {
                changes: ensuredChanges,
                timestamp: data?.timestamp || Date.now(),
              };
            }
          } catch (error) {
            console.error('Error during pullChanges:', error);
            throw error;
          }
        },
        pushChanges: async ({ changes, lastPulledAt }) => {
          if (!changes || Object.keys(changes).length === 0) {
            console.log('No changes to push');
            return;
          }
          const sanitizedChanges: Record<string, any> = {};
          for (const tableName of Object.keys(changes)) {
            if (!TABLES_TO_SYNC.includes(tableName)) continue;
            const tableChanges = changes[tableName];
            sanitizedChanges[tableName] = {
              created: (tableChanges.created || []).map((record) =>
                sanitizeRecord(record, tableName)
              ),
              updated: (tableChanges.updated || []).map((record) =>
                sanitizeRecord(record, tableName)
              ),
              deleted: (tableChanges.deleted || []).map((id) => ({ id })),
            };
          }
          try {
            const { error } = await supabase.rpc('sync_push', {
              changes: sanitizedChanges,
              last_pulled_at: lastPulledAt ? formatDateForSupabase(lastPulledAt) : null,
              user_id: userId,
            });
            if (error) throw new Error(`Sync push failed: ${error.message}`);
            console.log('Push completed successfully');
          } catch (error) {
            console.error('Error during pushChanges:', error);
            throw error;
          }
        },
        unsafeTurbo: isFirstSync,
        migrationsEnabledAtVersion: 1,
      });
      success = true; // Mark success if synchronize completes without error
    } catch (error) {
      console.error(
        `Sync attempt failed: ${error instanceof Error ? error.message : String(error)}`
      );
      success = false; // Mark failure
    }
    return success; // Return the success status of this attempt
  }

  try {
    // Acquire the lock
    release = await syncMutex.acquire();

    if (lockTimedOut) {
      console.log(`[Sync Service @ ${callTimestamp}] Lock was already released due to timeout.`);
      return false;
    }

    const lockAcquiredTimestamp = Date.now();
    console.log(
      `[Sync Service @ ${lockAcquiredTimestamp}] Lock acquired, starting sync process...`
    );

    // Attempt the sync
    let syncResult = await attemptSync();

    // If the first attempt failed, retry once
    if (!syncResult) {
      console.log('Sync failed on first attempt, retrying once...');
      await new Promise((resolve) => setTimeout(resolve, 1000));
      syncResult = await attemptSync();
    }

    // Log the final result
    if (syncResult) {
      console.log('Sync completed successfully');
      console.log('Sync log:', JSON.stringify(logger.logs, null, 2));
      lastSuccessfulSyncTime = Date.now();
    } else {
      console.error('Sync failed after retry attempt');
    }
    return syncResult; // Return the final success status
  } catch (error) {
    console.error(
      `Error acquiring sync lock or during sync process: ${error instanceof Error ? error.message : String(error)}`
    );
    return false; // Return false if lock acquisition or the process itself fails
  } finally {
    // Always clear the timeout and release the lock if it's still held
    clearTimeout(timeoutId);
    if (release && !lockTimedOut) {
      console.log(`[Sync Service @ ${callTimestamp}] Releasing lock.`);
      release();
    }
  }
}

/**
 * Cleans up a record for Supabase insertion
 *
 * @param record The raw record from WatermelonDB
 * @param table The table name
 * @returns A cleaned record suitable for Supabase
 */
function sanitizeRecord(record: any, table: string): any {
  // Make a copy to avoid mutating the original
  const cleanedRecord = { ...record };

  // Format dates for Supabase
  if (cleanedRecord.createdAt) {
    cleanedRecord.createdAt = formatDateForSupabase(cleanedRecord.createdAt);
  }

  if (cleanedRecord.updatedAt) {
    cleanedRecord.updatedAt = formatDateForSupabase(cleanedRecord.updatedAt);
  }

  if (cleanedRecord.lastSyncedAt) {
    cleanedRecord.lastSyncedAt = formatDateForSupabase(cleanedRecord.lastSyncedAt);
  }

  // Convert any other date fields specific to the table
  // This depends on your schema
  if (table === 'plants' && cleanedRecord.plantedDate) {
    cleanedRecord.plantedDate = formatDateForSupabase(cleanedRecord.plantedDate);
  }

  if ((table === 'journal_entries' || table === 'diary_entries') && cleanedRecord.entryDate) {
    cleanedRecord.entryDate = formatDateForSupabase(cleanedRecord.entryDate);
  }

  if (table === 'plant_tasks' && cleanedRecord.dueDate) {
    cleanedRecord.dueDate = formatDateForSupabase(cleanedRecord.dueDate);
  }

  return cleanedRecord;
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
        profile.username = userEmail.split('@')[0]; // Default username from email
        profile.createdAt = new Date(); // Use Date object instead of number
        profile.updatedAt = new Date(); // Use Date object instead of number
      });
    });

    console.log('User profile initialized');

    // Mark as first sync
    await database.adapter.setLocal('sync_is_empty', 'true');
  }
}

/**
 * Performs a full reset and sync from server
 * Use with caution as this will delete all local data
 *
 * @param database The WatermelonDB database instance
 * @param userId The user ID to sync data for
 * @param userEmail Email address of the user
 * @returns Promise that resolves to a boolean indicating success
 */
export async function resetAndSync(
  database: Database,
  userId: string,
  userEmail: string
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
    return synchronizeWithServer(database, userId, true);
  } catch (error) {
    console.error('Reset and sync failed:', error);
    return false;
  }
}

/**
 * Schedule periodic synchronization
 *
 * @param database The WatermelonDB database instance
 * @param userId The user ID to sync data for
 * @param intervalMinutes How often to sync (in minutes)
 * @returns A function to cancel the scheduled sync
 */
export function scheduleSync(database: Database, userId: string, intervalMinutes = 15): () => void {
  const interval = setInterval(
    async () => {
      // Only sync if there are changes to sync
      const hasChanges = await checkUnsyncedChanges(database);
      if (hasChanges) {
        await synchronizeWithServer(database, userId);
      }
    },
    intervalMinutes * 60 * 1000
  );

  // Return function to clear interval
  return () => clearInterval(interval);
}
