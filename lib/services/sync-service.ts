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
  if (date === null || date === undefined) return null;

  try {
    if (typeof date === 'number') {
      // Handle integers that could be timestamps - ensure correct millisecond conversion
      return new Date(date).toISOString();
    } else if (typeof date === 'string') {
      // Check if it's already an ISO string
      if (date.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
        return date;
      }

      // Reject non-date strings immediately (like "Jyby")
      if (!/^[\d\-/.\\s:]+$/.test(date)) {
        // Removed unnecessary escapes for / and .
        console.warn(`Invalid date string detected: "${date}" - contains non-date characters`);
        return null;
      }

      // Validate date string format - only accept standard formats
      if (!/^(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\.\d{1,2}\.\d{4})/.test(date)) {
        console.warn(`Invalid date format detected: "${date}" - not a recognized date pattern`);
        return null;
      }

      // Try to parse it
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        console.warn(`Could not parse date string: "${date}" - parsing resulted in Invalid Date`);
        return null;
      }
      return parsedDate.toISOString();
    } else if (date instanceof Date) {
      if (isNaN(date.getTime())) {
        console.warn(`Invalid Date object detected`);
        return null;
      }
      return date.toISOString();
    }
  } catch (error) {
    console.error(`Error formatting date: ${date}`, error);
    return null;
  }

  console.warn(`Unknown date format: ${typeof date}`, date);
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

            // Process created records with special handling for timestamps
            const createdRecords = (tableChanges.created || []).map((record) => {
              const sanitized = sanitizeRecord(record, tableName);

              // Ensure ALL timestamp fields are proper ISO strings
              if (sanitized.created_at !== undefined) {
                sanitized.created_at = formatDateForSupabase(sanitized.created_at);
                if (!sanitized.created_at) {
                  console.warn(`Invalid created_at for record in ${tableName}:`, record);
                  sanitized.created_at = new Date().toISOString(); // Default to current time
                }
              }

              if (sanitized.updated_at !== undefined) {
                sanitized.updated_at = formatDateForSupabase(sanitized.updated_at);
                if (!sanitized.updated_at) {
                  console.warn(`Invalid updated_at for record in ${tableName}:`, record);
                  sanitized.updated_at = new Date().toISOString(); // Default to current time
                }
              }

              // DEBUG: Log if any field contains "Jyby"
              for (const [field, value] of Object.entries(sanitized)) {
                if (typeof value === 'string' && value.includes('Jyby')) {
                  console.error(
                    `[DEBUG] Outgoing CREATED record with invalid date value "Jyby": table=${tableName}, id=${sanitized.id}, field=${field}, value=${value}, record=`,
                    sanitized
                  );
                }
              }

              return sanitized;
            });

            // Process updated records with special handling for timestamps
            const updatedRecords = (tableChanges.updated || []).map((record) => {
              const sanitized = sanitizeRecord(record, tableName);

              // Ensure ALL timestamp fields are proper ISO strings
              if (sanitized.created_at !== undefined) {
                sanitized.created_at = formatDateForSupabase(sanitized.created_at);
                if (!sanitized.created_at) {
                  console.warn(`Invalid created_at for record in ${tableName}:`, record);
                  sanitized.created_at = new Date().toISOString(); // Default to current time
                }
              }

              if (sanitized.updated_at !== undefined) {
                sanitized.updated_at = formatDateForSupabase(sanitized.updated_at);
                if (!sanitized.updated_at) {
                  console.warn(`Invalid updated_at for record in ${tableName}:`, record);
                  sanitized.updated_at = new Date().toISOString(); // Default to current time
                }
              }

              // DEBUG: Log if any field contains "Jyby"
              for (const [field, value] of Object.entries(sanitized)) {
                if (typeof value === 'string' && value.includes('Jyby')) {
                  console.error(
                    `[DEBUG] Outgoing UPDATED record with invalid date value "Jyby": table=${tableName}, id=${sanitized.id}, field=${field}, value=${value}, record=`,
                    sanitized
                  );
                }
              }

              return sanitized;
            });

            sanitizedChanges[tableName] = {
              created: createdRecords,
              updated: updatedRecords,
              deleted: (tableChanges.deleted || []).map((id) => ({ id })),
            };
          }
          try {
            // Ensure lastPulledAt is properly formatted
            let formattedLastPulledAt = null;
            if (lastPulledAt) {
              if (typeof lastPulledAt === 'number') {
                formattedLastPulledAt = new Date(lastPulledAt).toISOString();
              } else {
                formattedLastPulledAt = formatDateForSupabase(lastPulledAt);
              }
            }

            const { error } = await supabase.rpc('sync_push', {
              changes: sanitizedChanges,
              last_pulled_at: formattedLastPulledAt,
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

  // Remove WatermelonDB system fields that should not be synced
  delete cleanedRecord._status;
  delete cleanedRecord._changed;

  // Ensure id field exists AND is not an empty string or invalid type
  if (!cleanedRecord.id || typeof cleanedRecord.id !== 'string' || cleanedRecord.id.trim() === '') {
    // Throw a specific error instead of just warning
    throw new Error(
      `Record in table ${table} has missing or invalid primary id: '${cleanedRecord.id}'`
    );
  }

  // Special handling for plants table - convert non-UUID IDs to valid UUIDs
  if (table === 'plants') {
    // Check if the ID is not already a UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(cleanedRecord.id)) {
      const originalId = cleanedRecord.id;
      const newId = uuid();
      console.log(`Converting plant ID from ${originalId} to UUID format: ${newId}`);
      cleanedRecord.id = newId;
    }
  }

  // Check all potential foreign key fields (ending in _id)
  for (const key in cleanedRecord) {
    if (key.endsWith('_id') && key !== 'id' && cleanedRecord[key] === '') {
      // Throw an error if a foreign key is an empty string
      throw new Error(
        `Record in table ${table} (id: ${cleanedRecord.id}) has invalid foreign key ${key}: ''`
      );
    }
  }

  // ============================================================
  // Date field handling section - comprehensive validation
  // ============================================================

  // Common camelCase to snake_case date field conversions
  if (cleanedRecord.createdAt) {
    cleanedRecord.created_at = formatDateForSupabase(cleanedRecord.createdAt);
    delete cleanedRecord.createdAt;
  }

  if (cleanedRecord.updatedAt) {
    cleanedRecord.updated_at = formatDateForSupabase(cleanedRecord.updatedAt);
    delete cleanedRecord.updatedAt;
  }

  if (cleanedRecord.lastSyncedAt) {
    cleanedRecord.last_synced_at = formatDateForSupabase(cleanedRecord.lastSyncedAt);
    delete cleanedRecord.lastSyncedAt;
  }

  // Ensure required date fields always have valid values
  if (!cleanedRecord.created_at || cleanedRecord.created_at === null) {
    cleanedRecord.created_at = new Date().toISOString();
  }

  if (!cleanedRecord.updated_at || cleanedRecord.updated_at === null) {
    cleanedRecord.updated_at = new Date().toISOString();
  }

  // Table-specific date field handling
  switch (table) {
    case 'profiles':
      // Remove last_synced_at if present (not a column in Supabase profiles)
      if ('last_synced_at' in cleanedRecord) {
        delete cleanedRecord.last_synced_at;
      }
      // Handle growing_since (should be a valid date or null)
      if (cleanedRecord.growing_since) {
        const formattedDate = formatDateForSupabase(cleanedRecord.growing_since);
        if (formattedDate) {
          cleanedRecord.growing_since = formattedDate;
        } else {
          console.warn(
            `Invalid growing_since "${cleanedRecord.growing_since}" for profile ${cleanedRecord.id}, removing field`
          );
          delete cleanedRecord.growing_since;
        }
      }
      break;

    case 'plants':
      // Handle planted_date
      if (cleanedRecord.plantedDate) {
        const formattedDate = formatDateForSupabase(cleanedRecord.plantedDate);
        if (formattedDate) {
          cleanedRecord.planted_date = formattedDate;
        } else {
          console.warn(
            `Invalid planted_date "${cleanedRecord.plantedDate}" for plant ${cleanedRecord.id}, using current date`
          );
          cleanedRecord.planted_date = new Date().toISOString();
        }
        delete cleanedRecord.plantedDate;
      }

      // Handle expected_harvest_date (optional)
      if (cleanedRecord.expectedHarvestDate) {
        const formattedDate = formatDateForSupabase(cleanedRecord.expectedHarvestDate);
        if (formattedDate) {
          cleanedRecord.expected_harvest_date = formattedDate;
        } else {
          console.warn(
            `Invalid expected_harvest_date "${cleanedRecord.expectedHarvestDate}" for plant ${cleanedRecord.id}, removing field`
          );
          delete cleanedRecord.expected_harvest_date; // Don't send invalid optional field
        }
        delete cleanedRecord.expectedHarvestDate;
      }
      break;

    case 'diary_entries':
    case 'journal_entries':
      // Handle entry_date
      if (cleanedRecord.entryDate) {
        const formattedDate = formatDateForSupabase(cleanedRecord.entryDate);
        if (formattedDate) {
          cleanedRecord.entry_date = formattedDate;
        } else {
          console.warn(
            `Invalid entry_date "${cleanedRecord.entryDate}" for entry ${cleanedRecord.id}, using current date`
          );
          cleanedRecord.entry_date = cleanedRecord.created_at || new Date().toISOString();
        }
        delete cleanedRecord.entryDate;
      } else if (!cleanedRecord.entry_date) {
        // Ensure entry_date always exists
        cleanedRecord.entry_date = cleanedRecord.created_at || new Date().toISOString();
      }
      break;

    case 'plant_tasks':
      // Handle due_date
      if (cleanedRecord.dueDate) {
        const formattedDate = formatDateForSupabase(cleanedRecord.dueDate);
        if (formattedDate) {
          cleanedRecord.due_date = formattedDate;
        } else {
          console.warn(
            `Invalid due_date "${cleanedRecord.dueDate}" for task ${cleanedRecord.id}, using current date`
          );
          cleanedRecord.due_date = new Date().toISOString();
        }
        delete cleanedRecord.dueDate;
      } else if (!cleanedRecord.due_date) {
        // Ensure due_date always exists if it's a required field
        cleanedRecord.due_date = new Date().toISOString();
      }
      break;
  }

  // Final strict validation for any remaining date-like fields
  // Look for common naming patterns for date fields
  const dateFieldPatterns = [/_date$/, /_at$/, /Date$/, /At$/];
  Object.keys(cleanedRecord).forEach((key) => {
    const mightBeDateField = dateFieldPatterns.some((pattern) => pattern.test(key));
    if (!mightBeDateField) return;

    // Skip fields we've already properly handled
    if (
      key === 'created_at' ||
      key === 'updated_at' ||
      key === 'last_synced_at' ||
      key === 'planted_date' ||
      key === 'expected_harvest_date' ||
      key === 'entry_date' ||
      key === 'due_date'
    ) {
      return;
    }

    const value = cleanedRecord[key];
    // Only process string or number values
    if (typeof value !== 'string' && typeof value !== 'number') return;

    // Strict ISO 8601 check
    const isValidISODate =
      typeof value === 'string' &&
      /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)?$/.test(value) &&
      !isNaN(Date.parse(value));

    if (!isValidISODate) {
      // Try to format the date properly
      const formattedDate = formatDateForSupabase(value);
      if (formattedDate) {
        cleanedRecord[key] = formattedDate;
      } else {
        // If formatting fails, remove the field and log a warning
        console.warn(
          `Strict date validation: removing invalid date field ${key} with value "${value}" from ${table} record (id: ${cleanedRecord.id}) to avoid sync errors`
        );
        delete cleanedRecord[key];
      }
    }
  });

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
