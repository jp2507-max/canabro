import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, View, Text, Alert } from 'react-native';
import { Database, DirtyRaw } from '@nozbe/watermelondb';
import { hasUnsyncedChanges } from '@nozbe/watermelondb/sync';
import Constants from 'expo-constants';
import { useAuth } from './AuthProvider';
import supabase from '../supabase';
import { Q } from '@nozbe/watermelondb';
import { SyncDatabaseChangeSet, SyncLog, synchronize, SyncPullArgs, SyncPushArgs } from '@nozbe/watermelondb/sync';
import { Plant } from '../models/Plant';
import { Profile } from '../models/Profile';
import { GrowJournal } from '../models/GrowJournal';
import { JournalEntry } from '../models/JournalEntry';
import { GrowLocation } from '../models/GrowLocation';
import { DiaryEntry } from '../models/DiaryEntry';
import { PlantTask } from '../models/PlantTask';
import { Post } from '../models/Post';
import * as Crypto from 'expo-crypto';

// Import database instance as default, and resetDatabase as named
import database, { resetDatabase as resetWatermelonDB } from '../database/database';
import { forceResetDatabaseIfNeeded } from '../database/resetUtil';

// List of tables to synchronize
const TABLES_TO_SYNC = [
  'profiles',
  'plants',
  'grow_journals',
  'journal_entries',
  'grow_locations',
  'diary_entries',
  'plant_tasks',
  'posts',
];

// WatermelonDB-specific fields that should not be sent to Supabase
const WATERMELON_FIELDS = ['_changed', '_status', '_raw'];

type DatabaseContextType = {
  database: Database; // Database instance is always expected now
  sync: () => Promise<void>;
  isSyncing: boolean;
  hasUnsyncedChanges: () => Promise<boolean>;
  lastSyncTime: Date | null;
  resetDatabase: () => Promise<boolean>;
};

// Initialize context with null initially, though it should be populated quickly
const DatabaseContext = createContext<DatabaseContextType | null>(null);

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    // This error remains valid if used outside the provider
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  // No need to check context.database anymore, as the provider ensures it's set
  return context;
};

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  // No dbInstance state needed, use the imported 'database' directly
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [initialSyncDone, setInitialSyncDone] = useState(false); // Track initial sync
  const [showDevWarning, setShowDevWarning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true); // Still useful for initial setup/reset check
  const [databaseError, setDatabaseError] = useState<Error | null>(null);

  // Effect for initial setup like forceResetDatabaseIfNeeded
  useEffect(() => {
    let isMounted = true;
    const performInitialSetup = async () => {
      setIsInitializing(true); // Start initializing state
      setDatabaseError(null);
      try {
        // Only run the reset check here. The database instance is already created.
        await forceResetDatabaseIfNeeded();
        if (isMounted) {
          setDatabaseError(null); // Clear any previous error if reset check succeeds
        }
      } catch (error) {
        console.error("Database initialization/reset check error:", error);
        if (isMounted) {
          setDatabaseError(error instanceof Error ? error : new Error(String(error)));
        }
        // Show the reset dialog if an error occurs during the check/reset process
        Alert.alert(
          "Database Error",
          "There was an error initializing the database. Would you like to reset it? This will clear all local data.",
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => { if (isMounted) setIsInitializing(false); } // Finish initializing on cancel
            },
            {
              text: "Reset Database",
              onPress: async () => {
                // Use the imported reset function
                const resetSuccess = await resetWatermelonDB(); // Use the correctly imported function
                if (resetSuccess) {
                  Alert.alert(
                    "Database Reset",
                    "The database has been reset. Please restart the app."
                  );
                  // No re-initialization needed here, just mark as done
                  if (isMounted) setIsInitializing(false);
                } else {
                   Alert.alert("Reset Failed", "Could not reset the database.");
                   if (isMounted) setIsInitializing(false);
                }
              }
            }
          ]
        );
      } finally {
        if (isMounted) {
          setIsInitializing(false); // Mark initializing complete
        }
      }
    };

    performInitialSetup();

    return () => {
      isMounted = false;
    };
  }, []); // Run only once on mount

   // Helper function to check if a string is a valid UUID
  function isValidUUID(uuid: string): boolean {
    if (!uuid || typeof uuid !== 'string') return false;
    // Basic UUID v4 regex check
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    return uuidRegex.test(uuid);
  }

  // Clean record for Supabase - remove WatermelonDB-specific fields
  const cleanRecordForSupabase = (record: any, tableName: string, changeType: 'created' | 'updated') => {
    // Clone the record using _raw to get plain object representation
    const cleaned = { ...record._raw };

    // Assume WatermelonDB record.id SHOULD hold the Supabase UUID after a pull.

    // 1. Handle ID based on change type
    if (changeType === 'created') {
      // For INSERT: Remove 'id' so Supabase generates it.
      delete cleaned.id;
    } else if (changeType === 'updated') {
      // For UPDATE/UPSERT: The record.id SHOULD be the Supabase UUID.
      // Validate it. If invalid, something is wrong with the pull/sync state.
      if (!cleaned.id || !isValidUUID(String(cleaned.id))) { // Ensure ID is treated as string for validation
         console.error(`CRITICAL: Attempting to push UPDATE to '${tableName}' but record ID is missing or invalid: ${cleaned.id}. Record:`, JSON.stringify(cleaned));
         // Don't push this update, it will fail or corrupt data.
         return {}; // Return empty object to filter it out later
      }
      // If valid, keep cleaned.id - it's the Supabase PK for the upsert.
    }

    // 2. Remove WM specific potentially redundant ID fields like plant_id if they exist
    // These seem redundant if WM's own 'id' holds the canonical Supabase UUID.
    delete cleaned.plant_id;
    delete cleaned.profile_id; // Assuming profile PK is 'id' too
    delete cleaned.post_id;    // Assuming post PK is 'id' too
    // Add any other potentially redundant ID fields defined ONLY in WM models

    // 3. Ensure user_id is the actual UUID from the session if the field exists
    if ('user_id' in cleaned && session?.user?.id) {
        cleaned.user_id = session.user.id;
    }

    // 4. Convert timestamps (if they exist and are numbers from WM)
    if (cleaned.created_at && typeof cleaned.created_at === 'number') {
      cleaned.created_at = new Date(cleaned.created_at).toISOString();
    }
    if (cleaned.updated_at && typeof cleaned.updated_at === 'number') {
      cleaned.updated_at = new Date(cleaned.updated_at).toISOString();
    }

    // Remove any remaining WatermelonDB internal fields like _status, _changed
    delete cleaned._status;
    delete cleaned._changed;

    // Remove null values as Supabase might reject them depending on column constraints
     Object.keys(cleaned).forEach(key => {
         if (cleaned[key] === null) {
             delete cleaned[key];
         }
     });


    return cleaned;
  };

  // Define a basic sync log object (can be expanded later)
  const syncLog: SyncLog = {
    // Example: log pushes/pulls
    // onPull: (info) => console.log('[Sync Log] Pulled:', info),
    // onPush: (info) => console.log('[Sync Log] Pushed:', info),
    // Add more detailed logging as needed
  };

  // Sync with Supabase
  const sync = useCallback(async () => {
    // Use the imported 'database' instance directly
    if (isSyncing || !session?.user) {
      console.log('Sync skipped: isSyncing=' + isSyncing + ', session=' + (session ? 'exists' : 'null'));
      return;
    }

    console.log('Starting sync with Supabase...');

    try {
      setIsSyncing(true);

      // Use the session from the outer scope (retrieved via useAuth() at the top level of the component)
      const currentSession = session;

      if (!currentSession?.access_token) {
        console.error('No access token available for sync');
        // Don't throw here, maybe just log and return to allow offline operation?
        // For now, keep throwing to make the issue visible.
        throw new Error('Authentication token missing for sync');
      }

      // Log the user ID being used for the sync
      console.log('Sync using auth token for user:', currentSession.user.id);

      // The supabase-js client should automatically use the current session
      // managed by AuthProvider. No need to manually set auth here if AuthProvider is working.

      await synchronize({
        database, // Use the imported instance
        pullChanges: async ({ lastPulledAt }) => {
          console.log('Pulling changes since:', lastPulledAt ? new Date(lastPulledAt).toISOString() : 'initial sync');

          // Convert the date to ISO string for the API
          const lastPulledAtISO = lastPulledAt ? new Date(lastPulledAt).toISOString() : null;

          // Create a container for our changes
          const changes: any = { changes: {}, timestamp: Date.now() };

          // Ensure session is valid before proceeding
          if (!currentSession?.user?.id) {
            console.error('PullChanges: No user session available.');
            return changes; // Return empty changes if no session
          }

          // For each table, pull changes from Supabase
          for (const table of TABLES_TO_SYNC) {
            // Initialize change arrays for this table
            const tableCreated: any[] = [];
            const tableUpdated: any[] = [];
            const tableDeleted: string[] = []; // Deletion handling still needs server-side logic

            let query = supabase
              .from(table)
              .select('*')
              .eq('user_id', currentSession.user.id); // Use currentSession

            // Only fetch rows updated since last sync if we have a timestamp
            if (lastPulledAtISO) {
              query = query.filter('updated_at', 'gt', lastPulledAtISO);
            }

            const { data, error } = await query;

            if (error) {
              console.error(`Error pulling ${table}:`, error);
              // Decide how to handle partial failures. Continue for now.
              changes.changes[table] = { created: [], updated: [], deleted: [] };
              continue;
            }

            if (!data || data.length === 0) {
              console.log(`No records pulled for ${table}`);
              changes.changes[table] = { created: [], updated: [], deleted: [] };
              continue;
            }

            console.log(`Processing ${data.length} pulled records for ${table}`);

            // Get the WatermelonDB collection for the table
            const collection = database.get(table); // Use the imported instance

            // Check local DB to classify as created or updated
            // Consider batching DB checks for performance on large datasets
            for (const record of data) {
              if (!record.id) {
                console.warn(`Skipping record in ${table} due to missing ID:`, record);
                continue;
              }
              try {
                // Check if the record exists locally
                await collection.find(record.id);
                // Exists locally, add to updated
                tableUpdated.push(record);
              } catch (error) {
                // Does not exist locally (find throws error if not found), add to created
                tableCreated.push(record);
              }
            }

            // Process the data for each table
            changes.changes[table] = {
              created: tableCreated,
              updated: tableUpdated,
              deleted: tableDeleted // Still empty, needs server logic for deletions
            };
          }

          // Set the timestamp to the current server time (or close approximation)
          changes.timestamp = Date.now();

          return changes;
        },
        pushChanges: async ({ changes, lastPulledAt }) => {
          // --- NEW DEBUG LOG ---
          console.log('[Push Debug] Entered pushChanges function.');
          try {
            console.log('[Push Debug] Raw changes object received:', JSON.stringify(changes, null, 2));
          } catch (e) {
            console.log('[Push Debug] Raw changes object received (non-serializable?):', changes);
          }
          // --- END NEW DEBUG LOG ---
          console.log('Pushing changes to Supabase via RPC...'); // Updated log message

           // Check if session is still valid before making the call
           if (!currentSession?.user?.id) {
            console.error('PushChanges: No user session available.');
            throw new Error('Authentication token missing for push');
          }

          // Clean changes before sending (still necessary)
          const cleanedChanges: SyncDatabaseChangeSet = {};
          for (const tableName of TABLES_TO_SYNC) {
            const tableChanges = changes[tableName];
            // --- Start Debug Logging ---
            // console.log(`\n[Push Debug] Processing table: ${tableName}`);
            // try {
            //   console.log(`[Push Debug] Raw tableChanges:`, JSON.stringify(tableChanges, null, 2));
            // } catch (e) {
            //   console.log(`[Push Debug] Raw tableChanges (non-serializable?):`, tableChanges);
            // }
            // --- End Debug Logging ---

            if (!tableChanges) {
                // console.log(`[Push Debug] No changes object found for ${tableName}, skipping.`);
                continue; // Skip if no changes for this table
            }

            // --- Start Debug Logging ---
            // console.log(`[Push Debug] Accessing tableChanges.created...`);
            const rawCreated = tableChanges.created;
            // console.log(`[Push Debug] Raw created type: ${typeof rawCreated}, value:`, rawCreated);
            // console.log(`[Push Debug] Accessing tableChanges.updated...`);
            const rawUpdated = tableChanges.updated;
            // console.log(`[Push Debug] Raw updated type: ${typeof rawUpdated}, value:`, rawUpdated);
            // console.log(`[Push Debug] Accessing tableChanges.deleted...`);
            const rawDeleted = tableChanges.deleted;
            // console.log(`[Push Debug] Raw deleted type: ${typeof rawDeleted}, value:`, rawDeleted);
            // --- End Debug Logging ---

            // Create cleaned arrays, handling undefined originals
            const cleanedCreated = (rawCreated || [])
              .map(rec => cleanRecordForSupabase(rec, tableName, 'created'))
              .filter(r => r && Object.keys(r).length > 0); // Ensure record is not null/empty after cleaning
            // console.log(`[Push Debug] Cleaned created count: ${cleanedCreated.length}`); // Log count

            const cleanedUpdated = (rawUpdated || [])
              .map(rec => cleanRecordForSupabase(rec, tableName, 'updated'))
              .filter(r => r && Object.keys(r).length > 0); // Ensure record is not null/empty
            // console.log(`[Push Debug] Cleaned updated count: ${cleanedUpdated.length}`); // Log count

            const cleanedDeleted = rawDeleted || []; // This is just an array of IDs
            // console.log(`[Push Debug] Cleaned deleted count: ${cleanedDeleted.length}`); // Log count

            // Only add the table entry to cleanedChanges if there are actual changes
            // --- Start Debug Logging ---
            // console.log(`[Push Debug] Checking lengths: created=${cleanedCreated.length}, updated=${cleanedUpdated.length}, deleted=${cleanedDeleted.length}`);
            // --- End Debug Logging ---
            if (cleanedCreated.length > 0 || cleanedUpdated.length > 0 || cleanedDeleted.length > 0) {
              cleanedChanges[tableName] = {
                created: cleanedCreated,
                updated: cleanedUpdated,
                deleted: cleanedDeleted,
              };

              // Log counts *after* cleaning and confirming there are changes
              console.log(`Pushing ${tableName} via RPC: ${cleanedCreated.length} created, ${cleanedUpdated.length} updated, ${cleanedDeleted.length} deleted`); // Updated log
            }
          }

          // Only call RPC if there are actual changes to push
          if (Object.keys(cleanedChanges).length === 0) {
            console.log('No changes to push via RPC.');
            return; // Exit pushChanges early
          }

          // console.log('Cleaned changes for push RPC:', JSON.stringify(cleanedChanges, null, 2));

          // Call the Supabase RPC function 'push'
          const { error } = await supabase.rpc('push', { changes: cleanedChanges });

          if (error) {
            console.error('Push RPC error:', error);
            throw new Error(`Supabase push RPC error: ${error.message}`);
          }
          console.log('Push successful via RPC.');
        },
        // Optional: Add conflict resolver, logging, etc.
        log: syncLog, // Use the defined syncLog object
        // sendCreatedAsUpdated: true,
        migrationsEnabledAtVersion: 1, // Assuming schema version 1 was the first with migrations
      });

      // Update last sync time on successful sync
      const now = new Date();
      setLastSyncTime(now);
      // Optionally save lastSyncTime to AsyncStorage for persistence across app restarts
      // await AsyncStorage.setItem('@MyApp:lastSyncTime', now.toISOString());
      console.log('Sync finished successfully at', now.toISOString());

    } catch (error) {
      console.error('Sync error:', error);
      Alert.alert('Sync Error', `Failed to sync with the server: ${error instanceof Error ? error.message : String(error)}`);
      // Optionally, implement retry logic or notify the user more gracefully
    } finally {
      setIsSyncing(false);
    }
  }, [session, isSyncing]); // Remove dbInstance dependency, use imported 'database'

  // Check for unsynchronized changes
  const checkUnsyncedChanges = useCallback(async () => {
    // Use imported 'database' instance
    try {
      const hasChanges = await hasUnsyncedChanges({ database });
      console.log('Unsynced changes check:', hasChanges ? 'Changes found' : 'No changes');
      return hasChanges;
    } catch (error) {
      console.error('Error checking for unsynced changes:', error);
      return false;
    }
  }, []); // No dependency on dbInstance needed

  // Set up initial sync and periodic sync - Run only once when session becomes available
  useEffect(() => {
    let syncIntervalId: NodeJS.Timeout | null = null;

    // Sync logic depends only on session now (and implicitly on 'database' being ready)
    if (session?.user && !initialSyncDone) {
      console.log('User session detected, scheduling initial sync and interval.');
      setInitialSyncDone(true); // Mark initial sync as initiated

      // Initial sync
      sync();

      // Set up periodic sync (e.g., every 5 minutes)
      // Ensure interval is only set once per session initialization
      if (!syncIntervalId) {
        syncIntervalId = setInterval(() => {
          console.log('Running periodic sync...');
          sync();
        }, 5 * 60 * 1000); // 5 minutes
      }

    } else if (!session?.user) {
      // If session is lost, reset the flag and clear interval
      if (initialSyncDone) { // Only log reset if it was previously done
        console.log('Session lost, sync disabled, resetting initial sync flag.');
        setInitialSyncDone(false);
      }
      if (syncIntervalId) {
        console.log('Cleaning up sync interval due to session loss.');
        clearInterval(syncIntervalId);
        syncIntervalId = null;
      }
    }

    // Cleanup function on component unmount or when dependencies change
    return () => {
      if (syncIntervalId) {
        console.log('Cleaning up sync interval.');
        clearInterval(syncIntervalId);
      }
    };
    // Depend on session and initialSyncDone state. Sync dependency is handled by useCallback.
  }, [session, initialSyncDone, sync]);


  // Render loading indicator only during the initial setup/reset check phase
  if (isInitializing) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{ fontSize: 18, color: '#000000', textAlign: 'center', marginTop: 10 }}>
          Initializing database...
        </Text>
      </View>
    );
  }

  // Render error state if initialization/reset check failed
  if (databaseError) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16
      }}>
        <Text style={{ fontSize: 18, color: '#ff0000', textAlign: 'center' }}>
          Database Error
        </Text>
        <Text style={{ fontSize: 16, color: '#000000', textAlign: 'center' }}>
          {databaseError.message}
        </Text>
        <Text style={{ fontSize: 16, color: '#000000', textAlign: 'center' }}>
          Please try restarting the app. If the problem persists, you may need to reset the database.
        </Text>
      </View>
    );
  }

  if (showDevWarning) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FEF3C7'
      }}>
        <Text style={{ fontSize: 18, color: '#92400E', textAlign: 'center' }}>
          Running in Expo Go
        </Text>
        <Text style={{ fontSize: 16, color: '#000000', textAlign: 'center' }}>
          You're running the app in Expo Go. Some features like database synchronization
          might be limited or not work as expected.
        </Text>
        <Text style={{ fontSize: 16, color: '#000000', textAlign: 'center' }}>
          For the full experience, please run the app in a development build or production build.
        </Text>
        <Text
          style={{ fontSize: 16, color: '#0000ff', textDecorationLine: 'underline' }}
          onPress={() => setShowDevWarning(false)}
        >
          Continue anyway
        </Text>
      </View>
    );
  }

  // Provide the context value using the imported database instance
  return (
    <DatabaseContext.Provider value={{
      database, // Pass the imported instance
      sync,
      isSyncing,
      hasUnsyncedChanges: checkUnsyncedChanges,
      lastSyncTime,
      resetDatabase: resetWatermelonDB // Pass the imported reset function
    }}>
      {children}
    </DatabaseContext.Provider>
  );
};
