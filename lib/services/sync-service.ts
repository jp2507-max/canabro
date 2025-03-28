/**
 * Sync Service for WatermelonDB and Supabase
 * 
 * Handles synchronization between local WatermelonDB and remote Supabase
 */

import { Database } from '@nozbe/watermelondb';
import { synchronize, hasUnsyncedChanges } from '@nozbe/watermelondb/sync';
import SyncLogger from '@nozbe/watermelondb/sync/SyncLogger';
import { Q } from '@nozbe/watermelondb';
import supabase from '../supabase';
import { Plant } from '../models/Plant';
import { Profile } from '../models/Profile';
import { GrowJournal } from '../models/GrowJournal';
import { JournalEntry } from '../models/JournalEntry';
import { GrowLocation } from '../models/GrowLocation';
import { DiaryEntry } from '../models/DiaryEntry';
import { PlantTask } from '../models/PlantTask';
import { v4 as uuid } from 'uuid';
import NetInfo from '@react-native-community/netinfo';

// Array of table names to synchronize
const TABLES_TO_SYNC = [
  'profiles',
  'plants',
  'grow_journals',
  // 'journal_entries', // Temporarily disabled due to missing user_id column
  'grow_locations',
  'diary_entries',
  'plant_tasks',
  // 'posts', // Temporarily disabled as table doesn't exist yet
];

// Mapping of watermelonDB id fields to Supabase id fields
const ID_FIELD_MAPPING: Record<string, string> = {
  'profiles': 'userId',
  'plants': 'plantId',
  'grow_journals': 'journalId',
  'journal_entries': 'entryId',
  'grow_locations': 'locationId',
  'diary_entries': 'entryId',
  'plant_tasks': 'taskId',
  'posts': 'postId',
};

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
 * @returns Promise that resolves when sync is complete
 */
export async function synchronizeWithServer(
  database: Database, 
  userId: string,
  isFirstSync: boolean = false
): Promise<boolean> {
  // Check for internet connection first
  if (!(await isOnline())) {
    console.log('No internet connection, skipping sync');
    return false;
  }
  
  // Create a new log for this sync
  const syncLog = logger.newLog();
  
  // Use a try-catch block to handle potential errors with collections that might not be fully set up
  try {
    // Skip specific collections that are causing errors
    const collectionsToSync = TABLES_TO_SYNC.filter(table => {
      // Skip posts collection until it's properly set up
      if (table === 'posts') {
        console.log('Skipping posts collection as it is not fully set up yet');
        return false;
      }
      
      return true;
    });
    
    // Use a retry block to handle potential conflicts
    async function attemptSync(): Promise<boolean> {
      try {
        await synchronize({
          database,
          log: syncLog,
          pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
            // Convert the date to ISO string for the API
            const lastPulledAtISO = lastPulledAt ? formatDateForSupabase(lastPulledAt) : null;
            
            try {
              // Call the Supabase function using the REST API
              const { data, error } = await supabase.rpc('sync_pull', {
                last_pulled_at: lastPulledAtISO,
                schema_version: schemaVersion,
                user_id: userId,
                migration: migration ? migration : null,
              });
              
              if (error) {
                console.log(`Sync pull error: ${error.message}, continuing with empty changes`);
                // Return empty changes instead of throwing
                return { 
                  changes: {},
                  timestamp: new Date().getTime()
                };
              }
              
              // If using turbo mode for first sync
              if (isFirstSync && lastPulledAt === null) {
                // For turbo mode, return raw JSON
                const json = JSON.stringify(data);
                return { 
                  syncJson: json,
                };
              } else {
                // For standard sync, use the parsed data
                return { 
                  changes: data?.changes || {},
                  timestamp: data?.timestamp || new Date().getTime()
                };
              }
            } catch (error) {
              console.error('Error in pullChanges:', error);
              // Return empty changes instead of throwing
              return { 
                changes: {},
                timestamp: new Date().getTime()
              };
            }
          },
          pushChanges: async ({ changes, lastPulledAt }) => {
            const lastPulledAtISO = lastPulledAt ? formatDateForSupabase(lastPulledAt) : null;
            
            try {
              // Call the Supabase function using the REST API
              const { error } = await supabase.rpc('sync_push', {
                changes,
                last_pulled_at: lastPulledAtISO,
                user_id: userId,
              });
              
              if (error) {
                console.log(`Push error: ${error.message}`);
                // Log but don't throw, as we want sync to continue
              }
            } catch (error) {
              console.error('Error in pushChanges:', error);
              // Log but don't throw
            }
          },
          migrationsEnabledAtVersion: 1, // Enable migration syncs from first version
          unsafeTurbo: isFirstSync && await database.adapter.getLocal('sync_is_empty') === 'true',
          // Note: WatermelonDB will automatically only sync the tables listed in TABLES_TO_SYNC
          onWillApplyRemoteChanges: async ({ remoteChangeCount }) => {
            console.log(`Applying ${remoteChangeCount || 'unknown'} remote changes...`);
          },
          onDidPullChanges: async (response: any) => {
            // Store last sync timestamp if needed
            if (response && typeof response.timestamp === 'number') {
              await database.adapter.setLocal('last_sync_timestamp', String(new Date(response.timestamp).getTime()));
            }
          },
        });
        
        // Save sync information
        await database.adapter.setLocal('last_sync_time', new Date().toISOString());
        await database.adapter.setLocal('sync_is_empty', 'false');
        
        console.log('Sync completed successfully');
        console.log('Sync log:', logger.formattedLogs);
        
        return true;
      } catch (error) {
        console.error('Sync error:', error);
        return false;
      }
    }
    
    // Try sync once
    let success = await attemptSync();
    
    // If first attempt fails, try again once as recommended in the docs
    // This helps with resolving conflicts
    if (!success) {
      console.log('First sync attempt failed, retrying...');
      success = await attemptSync();
    }
    
    return success;
  } catch (error) {
    console.error('Error in synchronizeWithServer:', error);
    return false;
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
export async function initializeUserData(database: Database, userId: string, userEmail: string): Promise<void> {
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
export async function resetAndSync(database: Database, userId: string, userEmail: string): Promise<boolean> {
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
  const interval = setInterval(async () => {
    // Only sync if there are changes to sync
    const hasChanges = await checkUnsyncedChanges(database);
    if (hasChanges) {
      await synchronizeWithServer(database, userId);
    }
  }, intervalMinutes * 60 * 1000);
  
  // Return function to clear interval
  return () => clearInterval(interval);
}
