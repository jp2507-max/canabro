/**
 * Core synchronization functionality for WatermelonDB and Supabase
 */

import { Database } from '@nozbe/watermelondb';
import { synchronize } from '@nozbe/watermelondb/sync';
import type { SyncTableChangeSet } from '@nozbe/watermelondb/sync';
import { Strain } from '../../types/strain';

// Import DirtyRaw type from WatermelonDB
import type { DirtyRaw } from '@nozbe/watermelondb';

/**
 * Accepts a partial strain-like object and normalises `effects`/`flavors`
 * so they are always `string[] | undefined`.
 */
function normaliseStrainArrays<T extends { effects?: any; flavors?: any }>(
  strain: T
): T & { effects?: string[]; flavors?: string[] } {
  const normalise = (value: any): string[] | undefined => {
    if (Array.isArray(value)) return value.filter(v => typeof v === 'string');
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.filter(v => typeof v === 'string');
      } catch (_) { /* fall through */ }
      return [value];
    }
    return undefined;
  };
  return {
    ...strain,
    effects: normalise(strain.effects),
    flavors: normalise(strain.flavors),
  };
}

// Extended type definitions for sync changes
interface SyncDatabaseChangeSet {
  [tableName: string]: SyncTableChangeSet;
}

import { handleTableConflicts, getPriorityForTable } from './conflict-resolver';
import { sanitizeRecord, isValidUuid } from './data-sanitizer';
import { ensureStrainExistsForSync } from './ensure-strain-exists';
import { loadStrainFromDatabase } from './strain-loader';
import { getSyncLogger, persistSyncMetadata, updateSyncMetrics } from './metrics';
import { getNetworkStatus, getSyncConfig } from './network-manager';
import {
  validateRecord,
  validateRecordBatch,
  validateProfileChanges,
  sanitizeProfileRecords,
  validatePlantRecord,
} from './record-validator';
import { SYNC_CONSTANTS } from './types';
import { executeRpcWithRetry, syncMutex } from './utils';

// Track sync attempts to avoid too many logs
let recentSyncAttempts = 0;
let lastSyncAttemptLogTime = 0;

// Last successful sync time
let lastSuccessfulSyncTime = 0;

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
  if (!isValidUuid(userId)) {
    console.warn(`[Sync Service] Skipping sync: invalid or missing userId:`, userId);
    return false;
  }

  const callTimestamp = Date.now(); // Timestamp for this specific call attempt

  // Check if we've synced recently (unless forceSync is true)
  if (
    !forceSync &&
    !isFirstSync &&
    callTimestamp - lastSuccessfulSyncTime < SYNC_CONSTANTS.MIN_SYNC_INTERVAL_MS
  ) {
    // Limit logging of frequent sync attempts to avoid console spam
    recentSyncAttempts++;
    const shouldLog = callTimestamp - lastSyncAttemptLogTime > 5000; // Only log once every 5 seconds

    if (shouldLog) {
      console.log(
        `[Sync Service @ ${callTimestamp}] Sync throttled. Next sync available in ${Math.ceil((SYNC_CONSTANTS.MIN_SYNC_INTERVAL_MS - (callTimestamp - lastSuccessfulSyncTime)) / 1000)}s. (${recentSyncAttempts} attempts since last log)`
      );
      lastSyncAttemptLogTime = callTimestamp;
      recentSyncAttempts = 0;
    }
    return false;
  }

  console.log(`[Sync Service Entry @ ${callTimestamp}] Attempting to acquire sync lock...`);

  // Get network status and adapt sync behavior
  const networkStatus = await getNetworkStatus();
  if (!networkStatus.isOnline) {
    console.log(`[Sync Service @ ${callTimestamp}] No internet connection, skipping sync.`);
    return false;
  }

  // Get sync configuration based on network conditions
  const syncConfig = await getSyncConfig(forceSync);
  if (syncConfig.tablesToSync.length === 0) {
    console.log(`[Sync Service @ ${callTimestamp}] No tables to sync based on network conditions.`);
    return false;
  }

  console.log(
    `[Sync Service @ ${callTimestamp}] Network status: ${networkStatus.type}, metered: ${networkStatus.isMetered}`
  );
  console.log(
    `[Sync Service @ ${callTimestamp}] Sync config: ${syncConfig.tablesToSync.length} tables, batch size: ${syncConfig.batchSize}`
  );

  // Check if the mutex is already locked
  if (syncMutex.isLocked()) {
    console.log(
      `[Sync Service @ ${callTimestamp}] Sync already in progress, skipping this attempt.`
    );
    return false; // Indicate that sync didn't run due to concurrency
  }

  // Performance measurement
  const syncStartTime = performance.now();

  // Use a timeout release mechanism to avoid deadlocks
  let release: (() => void) | null = null;
  let lockTimedOut = false;
  const timeoutId = setTimeout(() => {
    if (release) {
      console.error(
        `[Sync Service @ ${callTimestamp}] Sync lock timed out after ${SYNC_CONSTANTS.SYNC_LOCK_TIMEOUT_MS}ms. Forcing release.`
      );
      lockTimedOut = true;
      release();
    }
  }, SYNC_CONSTANTS.SYNC_LOCK_TIMEOUT_MS);

  // Define attemptSync function here, outside the try block
  async function attemptSync(): Promise<boolean> {
    let success = false; // Define success within attemptSync scope
    try {
      // For first sync, check if database is empty to decide on turbo mode
      // You can only use turbo mode if the local database is empty
      const syncIsEmpty = await database.adapter.getLocal('sync_is_empty');
      const useTurboMode = isFirstSync && syncIsEmpty === 'true';

      if (useTurboMode) {
        console.log('[Sync Service] Using Turbo mode for first sync');
      }

      const syncLog = getSyncLogger().newLog(); // Create a new log entry

      await synchronize({
        database,
        log: syncLog, // Pass the log object
        pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
          const lastPulledAtISO = lastPulledAt ? new Date(lastPulledAt).toISOString() : null;

          try {
            // Add networkType and tablesToSync info to improve server-side handling
            const data = await executeRpcWithRetry('sync_pull', {
              last_pulled_at: lastPulledAtISO,
              schema_version: schemaVersion,
              user_id: userId,
              migration: migration ? migration : null,
              use_turbo: useTurboMode,
              network_type: networkStatus.type,
              tables_to_sync: syncConfig.tablesToSync,
              include_media: syncConfig.includeMedia,
            });

            if (useTurboMode) {
              // For turbo mode, return the raw JSON string without parsing
              console.log(`[Turbo Sync] Received turbo sync data`);
              const json = data ? JSON.stringify(data) : '{}'; // Ensure empty object is a string
              return { syncJson: json };
            } else {
              // Standard sync processing
              const receivedChanges = data?.changes || {};
              const ensuredChanges: Record<string, SyncTableChangeSet> = {};

              // Initialize empty changes for all tracked tables
              for (const table of syncConfig.tablesToSync) {
                ensuredChanges[table] = { created: [], updated: [], deleted: [] };
              }

              // Process changes for each table
              for (const table of Object.keys(receivedChanges)) {
                if (syncConfig.tablesToSync.includes(table)) {
                  // Special handling for profiles table
                  if (table === 'profiles') {
                    // Get profile data
                    const tableChanges = receivedChanges[table] as SyncTableChangeSet;
                    const createdProfiles = tableChanges?.created || [];
                    const updatedProfiles = tableChanges?.updated || [];

                    try {
                      // Validate and sanitize all profile records upfront to catch any issues
                      const validCreated = [];
                      const validUpdated = [];

                      // Filter out invalid created records
                      for (const profile of createdProfiles) {
                        try {
                          if (typeof profile !== 'object' || !profile || Array.isArray(profile)) {
                            console.warn(`Skipping invalid profile: not an object`);
                            continue;
                          }

                          // Clean up WatermelonDB internal fields
                          const cleanedProfile = { ...profile };
                          delete cleanedProfile._status;
                          delete cleanedProfile._changed;

                          // Ensure ID is valid
                          if (!cleanedProfile.id || typeof cleanedProfile.id !== 'string') {
                            console.warn(`Skipping invalid profile: missing or invalid ID`);
                            continue;
                          }

                          validCreated.push(cleanedProfile);
                        } catch (validationError) {
                          console.warn(`Skipping invalid profile record:`, validationError);
                        }
                      }

                      // Filter out invalid updated records
                      for (const profile of updatedProfiles) {
                        try {
                          if (typeof profile !== 'object' || !profile || Array.isArray(profile)) {
                            console.warn(`Skipping invalid profile update: not an object`);
                            continue;
                          }

                          // Clean up WatermelonDB internal fields
                          const cleanedProfile = { ...profile };
                          delete cleanedProfile._status;
                          delete cleanedProfile._changed;

                          // Ensure ID is valid
                          if (!cleanedProfile.id || typeof cleanedProfile.id !== 'string') {
                            console.warn(`Skipping invalid profile update: missing or invalid ID`);
                            continue;
                          }

                          validUpdated.push(cleanedProfile);
                        } catch (validationError) {
                          console.warn(`Skipping invalid profile update record:`, validationError);
                        }
                      }

                      // Check local database for all profiles that are in the created array
                      // to determine if they already exist locally
                      const existingProfileIds = new Set();
                      try {
                        const profilesCollection = database.get('profiles');
                        // For each profile in the created array, check if it exists locally
                        for (const profile of validCreated) {
                          try {
                            // Try to find the profile by ID
                            const existingProfile = await profilesCollection.find(profile.id);
                            if (existingProfile) {
                              // If it exists, add to our set of known IDs
                              existingProfileIds.add(profile.id);
                            }
                          } catch (findError) {
                            // Profile doesn't exist locally, which is expected for most created records
                          }
                        }

                        // IMPORTANT FIX: Also check if user's own profile exists locally
                        // to avoid the error where we move it to created when it already exists
                        for (const profile of validUpdated) {
                          const isUserOwnProfile =
                            profile.user_id === userId ||
                            profile.userId === userId ||
                            profile.id === userId;
                          if (isUserOwnProfile) {
                            try {
                              // Try to find the user's profile by ID
                              const existingProfile = await profilesCollection.find(profile.id);
                              if (existingProfile) {
                                // If it exists, add to our set of known IDs
                                existingProfileIds.add(profile.id);
                              }
                            } catch (findError) {
                              // User's profile doesn't exist locally
                            }
                          }
                        }
                      } catch (dbError) {
                        console.warn('[Sync] Error checking for existing profiles:', dbError);
                      }

                      // Move created profiles to updated if they already exist locally
                      const finalCreated = [];
                      const finalUpdated = [...validUpdated];

                      for (const profile of validCreated) {
                        if (existingProfileIds.has(profile.id) || profile.id === userId) {
                          console.log(
                            `[Diagnostic info] Moving profile ${profile.id} from created to updated as it already exists locally`
                          );
                          finalUpdated.push(profile);
                        } else {
                          finalCreated.push(profile);
                        }
                      }

                      // Also handle the case where server sends updates for profiles that don't exist locally
                      const movedToCreated = [];
                      const remainingUpdated = [];

                      for (const profile of finalUpdated) {
                        // If this is the user's own profile that might be missing locally
                        const isUserOwnProfile =
                          profile.user_id === userId ||
                          profile.userId === userId ||
                          profile.id === userId;
                        const existsLocally = existingProfileIds.has(profile.id);

                        if (isUserOwnProfile && !existsLocally) {
                          console.log(
                            `[Diagnostic info] Moving profile ${profile.id} from updated to created as it might not exist locally`
                          );
                          movedToCreated.push(profile); // Add to created array
                        } else {
                          remainingUpdated.push(profile); // Keep as updated
                        }
                      }

                      // Final created array includes original valid creations + moved from updated
                      ensuredChanges[table] = {
                        created: [...finalCreated, ...movedToCreated],
                        updated: remainingUpdated,
                        deleted: receivedChanges[table]?.deleted || [],
                      };
                    } catch (error) {
                      console.error('[Sync] Error during profile handling:', error);
                      // Fallback to normal handling
                      ensuredChanges[table] = await handleTableConflicts(
                        table,
                        receivedChanges,
                        database
                      );
                    }
                  } else {
                    // Apply record validation and cleaning to other tables
                    try {
                      const tableChanges = receivedChanges[table] as SyncTableChangeSet;
                      const createdFromServer = tableChanges?.created || [];
                      const updatedFromServer = tableChanges?.updated || [];
                      const deletedIds = tableChanges?.deleted || [];

                      const mapAndCleanRecord = (record: unknown): Record<string, any> | null => {
                        if (typeof record !== 'object' || !record || Array.isArray(record)) {
                          // console.warn(`[Sync Clean] Skipping invalid record in ${table}: not an object`, record);
                          return null;
                        }
                        const cleaned = { ...(record as Record<string, unknown>) };
                        delete cleaned._status;
                        delete cleaned._changed;
                        if (!(cleaned.id && typeof cleaned.id === 'string' && cleaned.id.trim())) {
                          // console.warn(`[Sync Clean] Skipping invalid record in ${table}: missing or invalid id`, cleaned);
                          return null;
                        }
                        return cleaned;
                      };

                      const cleanedCreated = createdFromServer.map(mapAndCleanRecord).filter(Boolean);
                      const cleanedUpdated = updatedFromServer.map(mapAndCleanRecord).filter(Boolean);

                      ensuredChanges[table] = {
                        created: cleanedCreated as any[],
                        updated: cleanedUpdated as any[],
                        deleted: deletedIds,
                      };
                    } catch (validationError) {
                      console.warn(`[Sync] Error validating ${table} records:`, validationError);
                      // Fallback to conflict handler which also does some validation
                      ensuredChanges[table] = await handleTableConflicts(
                        table,
                        receivedChanges,
                        database
                      );
                    }
                  }
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

          // Cache to prevent N+1 queries when multiple plants reference the same strain
          const strainCache = new Map<string, any>();
          let cacheHits = 0;
          let cacheMisses = 0;
          
          // Cached strain loader to avoid hitting the database multiple times for the same strain
          async function getStrainFromCache(strainId: string) {
            if (!strainCache.has(strainId)) {
              console.log(`[Sync] Loading strain ${strainId} from database (cache miss)`);
              const strain = await loadStrainFromDatabase(database, strainId);
              strainCache.set(strainId, strain);
              cacheMisses++;
            } else {
              console.log(`[Sync] Using cached strain ${strainId} (cache hit)`);
              cacheHits++;
            }
            return strainCache.get(strainId);
          }

          // Helper to ensure strain exists before syncing a plant
          async function ensureStrainForPlantRecord(plant: Record<string, any>) {
            console.log(`[Sync] ensureStrainForPlantRecord called for plant "${plant?.name}" (ID: ${plant?.id})`);
            
            // Check both strain_id and strainId (camelCase vs snake_case)
            const strainId = plant?.strain_id || plant?.strainId;
            
            if (plant && strainId) {
              console.log(`[Sync] Plant has strain_id/strainId: ${strainId}`);
              
              if (plant.strainObj) {
                // Use the attached strain object
                console.log(`[Sync] Using existing strainObj for plant ${plant.id} (${plant.name})`, plant.strainObj);
                
                // Normalize effects and flavors arrays and ensure proper typing
                const strainDataForSync = normaliseStrainArrays({ ...plant.strainObj });
                await ensureStrainExistsForSync(strainDataForSync);
              } else {
                // If strainObj is missing but we have strain_id, try to load the strain from WatermelonDB
                try {
                  console.log(`[Sync] Attempting to load strain from WatermelonDB with ID: ${strainId}`);
                  
                  // Use the cached strain loader to prevent N+1 queries
                  const strainObj = await getStrainFromCache(strainId);
                  
                  if (strainObj) {
                    console.log(`[Sync] Successfully loaded strain "${strainObj.name}" for ID ${strainId}`);
                    // Store important strain data directly in the plant record for sync
                    plant.strain = strainObj.name; // Ensure name is present
                    
                    // If we have snake_case in the DB but camelCase in the app
                    if (!plant.strain_id && plant.strainId) {
                      plant.strain_id = plant.strainId;
                      console.log(`[Sync] Added strain_id (${plant.strain_id}) based on strainId`);
                    }
                    // If we have camelCase in the app but need snake_case for DB
                    if (!plant.strainId && plant.strain_id) {
                      plant.strainId = plant.strain_id;
                      console.log(`[Sync] Added strainId (${plant.strainId}) based on strain_id`);
                    }
                    
                    // Convert StrainObject to Strain format with proper field mapping
                    const strainData = {
                      id: strainObj.id,
                      name: strainObj.name,
                      description: strainObj.description,
                      genetics: strainObj.genetics,
                      type: strainObj.type,
                      thc: strainObj.thc_content,
                      cbd: strainObj.cbd_content,
                      thc_percentage: strainObj.thc_content,
                      cbd_percentage: strainObj.cbd_content,
                      floweringTime: String(strainObj.flowering_time || ''),
                      growDifficulty: strainObj.difficulty,
                      yieldIndoor: strainObj.yield_indoor,
                      yieldOutdoor: strainObj.yield_outdoor,
                      effects: strainObj.effects,
                      flavors: strainObj.flavors
                    };
                    
                    // Normalize effects and flavors arrays and ensure proper typing
                    const formattedStrain = normaliseStrainArrays(strainData);
                    await ensureStrainExistsForSync(formattedStrain);
                  } else {
                    console.warn(`[Sync] No strain found in WatermelonDB for ID ${strainId}, plant sync may fail`);
                  }
                } catch (error) {
                  console.error('[Sync] Error loading strain from WatermelonDB during sync:', error);
                  // Don't treat this as a fatal error - continue with sync
                  console.log('[Sync] Continuing with plant sync despite strain lookup error');
                }
              }
            } else {
              console.log(`[Sync] Plant has no strain ID, skipping strain relationship handling`);
            }
          }
          // Skip push for turbo mode initial sync
          if (useTurboMode && !lastPulledAt) {
            console.log('[Turbo Sync] Skipping initial push for turbo sync');
            return;
          }

          if (!changes || Object.keys(changes).length === 0) {
            console.log('No changes to push');
            return;
          }

          // Enhanced plant record logging for debugging strain_id synchronization
          if ('plants' in changes && changes.plants) {
            // Use type assertion to help TypeScript understand the structure
            const plantChanges = changes.plants as SyncTableChangeSet;
            
            // Log created plant records
            if (plantChanges.created && plantChanges.created.length > 0) {
              console.log(`[Sync Push] Processing ${plantChanges.created.length} new plant records`);
              plantChanges.created.forEach((plant: Record<string, any>) => {
                console.log(`[Plant Create] ID: ${plant.id}, Name: ${plant.name}, ` + 
                           `Strain: ${plant.strain || 'N/A'}, ` + 
                           `StrainId: ${plant.strainId || 'N/A'}, ` +
                           `strain_id: ${plant.strain_id || 'N/A'}`);
              });
            }
            
            // Log updated plant records
            if (plantChanges.updated && plantChanges.updated.length > 0) {
              console.log(`[Sync Push] Processing ${plantChanges.updated.length} updated plant records`);
              plantChanges.updated.forEach((plant: Record<string, any>) => {
                console.log(`[Plant Update] ID: ${plant.id}, Name: ${plant.name}, ` + 
                           `Strain: ${plant.strain || 'N/A'}, ` + 
                           `StrainId: ${plant.strainId || 'N/A'}, ` +
                           `strain_id: ${plant.strain_id || 'N/A'}`);
              });
            } else {
              console.log('[Sync Push] No plant updates in the current push.');
            }
          } else {
            console.log('[Sync Push] No plant records in the current push.');
          }

          try {
            // Ensure lastPulledAt is properly formatted
            let formattedLastPulledAt = null;
            if (lastPulledAt) {
              formattedLastPulledAt = new Date(lastPulledAt).toISOString();
            }

            // Process tables with batch processing for large datasets
            // Use batch size from network-aware sync config
            const BATCH_SIZE = syncConfig.batchSize;

            // Group tables by their priority for sync and ensure they are valid table names
            const tablesToProcess = [...Object.keys(changes)]
              .filter((table) => syncConfig.tablesToSync.includes(table))
              .sort((a, b) => getPriorityForTable(b) - getPriorityForTable(a));

            for (const tableName of tablesToProcess) {
              // Create a safe typed reference to the table changes
              const tableChanges: SyncTableChangeSet = { 
                created: [], 
                updated: [], 
                deleted: [] 
              };
              
              // Only access properties if they exist in the changes object
              // Ensure type safety by type assertion and property checks
              if (tableName in changes) {
                const currentTable = (changes as Record<string, SyncTableChangeSet>)[tableName];
                if (currentTable) {
                  if (currentTable.created) tableChanges.created = currentTable.created;
                  if (currentTable.updated) tableChanges.updated = currentTable.updated;
                  if (currentTable.deleted) tableChanges.deleted = currentTable.deleted;
                }
              }

              // Apply strict validation before sanitizing records
              let validCreated = [];
              let validUpdated = [];

              try {
                // Validate created records
                for (const record of tableChanges.created || [] as Record<string, any>[]) {
                  try {
                    if (typeof record !== 'object' || !record || Array.isArray(record)) {
                      console.warn(`[Push] Invalid created record in ${tableName}: Not an object`);
                      continue;
                    }

                    const cleaned = { ...record };
                    delete cleaned._status;
                    delete cleaned._changed;

                    if (!cleaned.id || typeof cleaned.id !== 'string') {
                      console.warn(
                        `[Push] Invalid created record in ${tableName}: Missing or invalid ID`
                      );
                      continue;
                    }

                    validCreated.push(cleaned);
                  } catch (recordError) {
                    console.warn(
                      `[Push] Error validating created record in ${tableName}:`,
                      recordError
                    );
                  }
                }

                // Validate updated records
                for (const record of tableChanges.updated || [] as Record<string, any>[]) {
                  try {
                    if (typeof record !== 'object' || !record || Array.isArray(record)) {
                      console.warn(`[Push] Invalid updated record in ${tableName}: Not an object`);
                      continue;
                    }

                    const cleaned = { ...record };
                    delete cleaned._status;
                    delete cleaned._changed;

                    if (!cleaned.id || typeof cleaned.id !== 'string') {
                      console.warn(
                        `[Push] Invalid updated record in ${tableName}: Missing or invalid ID`
                      );
                      continue;
                    }

                    validUpdated.push(cleaned);
                  } catch (recordError) {
                    console.warn(
                      `[Push] Error validating updated record in ${tableName}:`,
                      recordError
                    );
                  }
                }
              } catch (validationError) {
                console.error(`[Push] Validation error for ${tableName}:`, validationError);
                // Fall back to entire arrays in case of overall validation failure
                validCreated = tableChanges.created || [];
                validUpdated = tableChanges.updated || [];
              }

              // Sanitize records after validation with special handling for plants
              let sanitizedCreated;
              let sanitizedUpdated;
              if (tableName === 'plants') {
                sanitizedCreated = [];
                sanitizedUpdated = [];
                for (const record of validCreated) {
                  // Type assertion: DirtyRaw should contain the plant data with id and name
                  const validatedPlantRecord = await validatePlantRecord(record as any, database, strainCache);
                  // Ensure strain exists before syncing plant
                  await ensureStrainForPlantRecord(validatedPlantRecord);
                  const sanitized = sanitizeRecord(validatedPlantRecord, tableName);
                  // Log the outgoing plant payload for Supabase sync
                  console.log('[Sync] Outgoing plant payload (created):', JSON.stringify(sanitized, null, 2));
                  sanitizedCreated.push(sanitized);
                }
                for (const record of validUpdated) {
                  // Type assertion: DirtyRaw should contain the plant data with id and name
                  const validatedPlantRecord = await validatePlantRecord(record as any, database, strainCache);
                  await ensureStrainForPlantRecord(validatedPlantRecord);
                  const sanitized = sanitizeRecord(validatedPlantRecord, tableName);
                  console.log('[Sync] Outgoing plant payload (updated):', JSON.stringify(sanitized, null, 2));
                  sanitizedUpdated.push(sanitized);
                }
              } else {
                sanitizedCreated = validCreated.map((record: Record<string, any>) => sanitizeRecord(record, tableName));
                sanitizedUpdated = validUpdated.map((record: Record<string, any>) => sanitizeRecord(record, tableName));
              }
              const sanitizedDeleted = (tableChanges.deleted || []).map((id: string) => ({ id }));

              // Skip media-heavy content if configured
              if (!syncConfig.includeMedia) {
                // Simplify media fields to reduce payload size
                for (const record of [...sanitizedCreated, ...sanitizedUpdated] as Record<string, any>[]) {
                  // Handle common media field patterns
                  if (record.images && Array.isArray(record.images) && record.images.length > 0) {
                    // Just keep references, not actual base64 data
                    record.images = record.images.map((img: string) =>
                      typeof img === 'string' && img.startsWith('data:')
                        ? 'media-ref:' + record.id
                        : img
                    );
                  }

                  if (record.media && Array.isArray(record.media) && record.media.length > 0) {
                    record.media = record.media.map((item: string) =>
                      typeof item === 'string' && item.startsWith('data:')
                        ? 'media-ref:' + record.id
                        : item
                    );
                  }

                  // Handle image specific fields
                  ['image', 'image_url', 'avatar', 'avatar_url', 'thumbnail'].forEach((field) => {
                    if (
                      record[field] &&
                      typeof record[field] === 'string' &&
                      record[field].startsWith('data:')
                    ) {
                      record[field] = 'media-ref:' + record.id;
                    }
                  });
                }
              }

              // Batch processing for created records
              if (sanitizedCreated.length > BATCH_SIZE) {
                const batches = [];
                for (let i = 0; i < sanitizedCreated.length; i += BATCH_SIZE) {
                  batches.push(sanitizedCreated.slice(i, i + BATCH_SIZE));
                }

                console.log(
                  `[Batch Processing] Processing ${sanitizedCreated.length} created records in ${batches.length} batches for table ${tableName}`
                );

                for (let i = 0; i < batches.length; i++) {
                  const batch = batches[i];
                  const batchChanges = {
                    [tableName]: {
                      created: batch,
                      updated: i === 0 ? sanitizedUpdated : [], // Include updates only in first batch
                      deleted: i === 0 ? sanitizedDeleted : [], // Include deletes only in first batch
                    },
                  };

                  await executeRpcWithRetry('sync_push', {
                    changes: batchChanges,
                    last_pulled_at: formattedLastPulledAt,
                    user_id: userId,
                    network_type: networkStatus.type,
                  });

                  console.log(
                    `[Batch Processing] Completed batch ${i + 1}/${batches.length} for ${tableName} created records`
                  );
                }
              }
              // Batch processing for updated records if created were small but updates are large
              else if (sanitizedUpdated.length > BATCH_SIZE) {
                const batches = [];
                for (let i = 0; i < sanitizedUpdated.length; i += BATCH_SIZE) {
                  batches.push(sanitizedUpdated.slice(i, i + BATCH_SIZE));
                }

                console.log(
                  `[Batch Processing] Processing ${sanitizedUpdated.length} updated records in ${batches.length} batches for table ${tableName}`
                );

                for (let i = 0; i < batches.length; i++) {
                  const batch = batches[i];
                  const batchChanges = {
                    [tableName]: {
                      created: i === 0 ? sanitizedCreated : [], // Include created only in first batch
                      updated: batch,
                      deleted: i === 0 ? sanitizedDeleted : [], // Include deleted only in first batch
                    },
                  };

                  await executeRpcWithRetry('sync_push', {
                    changes: batchChanges,
                    last_pulled_at: formattedLastPulledAt,
                    user_id: userId,
                    network_type: networkStatus.type,
                  });

                  console.log(
                    `[Batch Processing] Completed batch ${i + 1}/${batches.length} for ${tableName} updated records`
                  );
                }
              }
              // No batching needed, process normally
              else {
                const tableSanitizedChanges = {
                  [tableName]: {
                    created: sanitizedCreated,
                    updated: sanitizedUpdated,
                    deleted: sanitizedDeleted,
                  },
                };

                await executeRpcWithRetry('sync_push', {
                  changes: tableSanitizedChanges,
                  last_pulled_at: formattedLastPulledAt,
                  user_id: userId,
                  network_type: networkStatus.type,
                });
              }
            }

            console.log('Push completed successfully');
            
            // Log strain cache statistics for performance monitoring
            const totalQueries = cacheHits + cacheMisses;
            if (totalQueries > 0) {
              console.log(`[Sync] Strain cache stats: ${cacheHits} hits, ${cacheMisses} misses (${((cacheHits / totalQueries) * 100).toFixed(1)}% hit rate)`);
              console.log(`[Sync] Cached ${strainCache.size} unique strains, saved ${cacheHits} database queries`);
            }
          } catch (error) {
            console.error('Error during pushChanges:', error);
            throw error;
          }
        },
        unsafeTurbo: useTurboMode,
        migrationsEnabledAtVersion: 1,
        onDidPullChanges: async (_pullResult: { timestamp?: number; messages?: string[] }) => {
          // Clear the empty flag after first sync
          if (useTurboMode) {
            await database.adapter.setLocal('sync_is_empty', 'false');
            console.log('[Turbo Sync] First sync completed, cleared empty flag');
          }
        },
      });

      success = true; // Mark success if synchronize completes without error

      // If this was the first sync using turbo mode, clear the turbo mode flag
      if (useTurboMode) {
        await database.adapter.setLocal('sync_is_empty', 'false');
      }
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
      // Calculate sync duration
      const syncDuration = performance.now() - syncStartTime;

      // Update sync health metrics
      updateSyncMetrics(true, syncDuration);

      console.log(`Sync completed successfully in ${syncDuration.toFixed(0)}ms`);
      lastSuccessfulSyncTime = Date.now();

      // Persist sync metadata for fault tolerance
      const latestLog = getSyncLogger().logs[0];
      if (latestLog) {
        await persistSyncMetadata(database, latestLog);
      }
    } else {
      console.error('Sync failed after retry attempt');

      // Update failure metrics
      updateSyncMetrics(false, performance.now() - syncStartTime);

      // Store error information even on failure
      const latestLog = getSyncLogger().logs[0];
      if (latestLog) {
        await persistSyncMetadata(database, latestLog);
      }
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
