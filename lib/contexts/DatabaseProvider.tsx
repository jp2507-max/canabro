import { Database } from '@nozbe/watermelondb';
import { hasUnsyncedChanges } from '@nozbe/watermelondb/sync'; // Keep for checkUnsyncedChanges
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { ActivityIndicator, View, Text, Alert } from 'react-native';

import { useAuth } from './AuthProvider';
import { useSyncStatus } from './SyncContext'; // Import useSyncStatus
// Import database instance as default, and resetDatabase as named
import database, { resetDatabase as resetWatermelonDB } from '../database/database';
import { forceResetDatabaseIfNeeded } from '../database/resetUtil';
// Import the centralized sync function and background task helpers
import { synchronizeWithServer } from '../services/sync-service';
import { registerBackgroundSyncAsync, setLastActiveUserId } from '../tasks/syncTask'; // Import task functions

const MIN_SYNC_INTERVAL_MS = 30000; // 30 seconds

type DatabaseContextType = {
  database: Database;
  sync: (options?: { showFeedback?: boolean; force?: boolean }) => Promise<boolean>; // Update function signature
  isSyncing: boolean;
  hasUnsyncedChanges: () => Promise<boolean>;
  lastSyncTime: Date | null;
  resetDatabase: () => Promise<boolean>; // Keep reset functionality
};

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
  // Use SyncContext for sync state
  const { isSyncing, lastSyncTime, setIsSyncing, setLastSyncTime, setSyncError } = useSyncStatus();
  const [isInitializing, setIsInitializing] = useState(true); // Keep local state for initialization
  const [databaseError, setDatabaseError] = useState<Error | null>(null); // Keep local state for DB errors

  // Use refs to manage interval and setup state reliably
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const syncSetupDoneRef = useRef<boolean>(false);
  const currentUserIdRef = useRef<string | null | undefined>(undefined);
  const syncInProgressRef = useRef<boolean>(false);

  // Effect for initial setup like forceResetDatabaseIfNeeded (Keep this)
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
        console.error('Database initialization/reset check error:', error);
        if (isMounted) {
          setDatabaseError(error instanceof Error ? error : new Error(String(error)));
        }
        // Show the reset dialog if an error occurs during the check/reset process
        Alert.alert(
          'Database Error',
          'There was an error initializing the database. Would you like to reset it? This will clear all local data.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                if (isMounted) setIsInitializing(false);
              }, // Finish initializing on cancel
            },
            {
              text: 'Reset Database',
              onPress: async () => {
                // Use the imported reset function
                const resetSuccess = await resetWatermelonDB(); // Use the correctly imported function
                if (resetSuccess) {
                  Alert.alert(
                    'Database Reset',
                    'The database has been reset. Please restart the app.'
                  );
                  // No re-initialization needed here, just mark as done
                  if (isMounted) setIsInitializing(false);
                } else {
                  Alert.alert('Reset Failed', 'Could not reset the database.');
                  if (isMounted) setIsInitializing(false);
                }
              },
            },
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
  }, []);

  // Stable sync function that doesn't recreate on session changes
  const sync = useCallback(async () => {
    // Use syncInProgressRef to avoid concurrent calls within the component
    if (syncInProgressRef.current || !session?.user) {
      console.log(
        `Sync skipped: syncInProgressRef=${syncInProgressRef.current}, session=${session ? 'exists' : 'null'}`
      );
      return;
    }

    // Local flag to track sync in progress (component level protection)
    syncInProgressRef.current = true;
    setIsSyncing(true); // Use context setter
    setSyncError(null); // Clear previous errors on new sync attempt

    try {
      console.log('Starting sync via synchronizeWithServer...');
      // Call the imported sync function (which has its own mechanism to prevent concurrent calls)
      const syncSuccess = await synchronizeWithServer(database, session.user.id);

      if (syncSuccess) {
        const now = new Date();
        setLastSyncTime(now);
        console.log('Sync finished successfully via synchronizeWithServer at', now.toISOString());
      } else {
        console.warn('Sync via synchronizeWithServer reported failure.');
        // Optionally set an error if sync reports failure but doesn't throw
        // setSyncError(new Error('Synchronization reported failure.'));
      }
    } catch (error) {
      const syncErr = error instanceof Error ? error : new Error(String(error));
      console.error('Error during sync via synchronizeWithServer:', syncErr);
      setSyncError(syncErr); // Use context setter for errors
      Alert.alert('Sync Error', `Failed to sync with the server: ${syncErr.message}`);
    } finally {
      syncInProgressRef.current = false;
      setIsSyncing(false); // Use context setter
    }
  }, [session?.user?.id, setIsSyncing, setLastSyncTime, setSyncError]); // Add context setters to dependencies

  // Create a debounced version of the sync function - This is unused now
  // const debouncedSync = useMemo(() => {
  //   // Debounce the sync function with a 2-second wait time
  //   // leading: false ensures it only triggers after the wait time
  //   // trailing: true ensures it triggers after the wait time if called during the wait
  //   return debounce(sync, 2000, { leading: false, trailing: true });
  // }, [sync]); // Recreate debounced function only if sync function identity changes

  // Enhanced sync function that respects the throttling interval and provides user feedback
  const enhancedSync = useCallback(
    async (options?: { showFeedback?: boolean; force?: boolean }): Promise<boolean> => {
      // First check if a sync is already in progress
      if (syncInProgressRef.current) {
        console.log('Sync already in progress, skipping...');
        return false;
      }

      // Calculate time since last successful sync
      const now = Date.now();
      const lastSync = lastSyncTime?.getTime() || 0;
      const timeSinceLastSync = now - lastSync;

      // Check if we're within the throttling period - bypass if force option is true
      if (!options?.force && timeSinceLastSync < MIN_SYNC_INTERVAL_MS) {
        const secondsRemaining = Math.ceil((MIN_SYNC_INTERVAL_MS - timeSinceLastSync) / 1000);

        console.log(`Sync throttled. Next sync available in ${secondsRemaining} seconds.`);

        // Show feedback to user only if requested
        if (options?.showFeedback) {
          // Use Alert or some other notification mechanism
          if (secondsRemaining > 5) {
            Alert.alert(
              'Sync Throttled',
              `Please wait ${secondsRemaining} seconds before syncing again.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Force Sync',
                  onPress: () => {
                    // Call sync again with force option
                    enhancedSync({ force: true, showFeedback: true });
                  },
                },
              ]
            );
          }
        }

        return false;
      }

      // If we get here, we can attempt to sync
      try {
        console.log('Starting sync through enhanced sync function...');
        // Pass the force option to the synchronizeWithServer function
        const syncSuccess = await synchronizeWithServer(
          database,
          session?.user?.id || '',
          false,
          options?.force
        );
        return syncSuccess;
      } catch (error) {
        console.error('Enhanced sync error:', error);
        return false;
      }
    },
    [sync, lastSyncTime, session?.user?.id]
  );

  // Check for unsynchronized changes (Keep this as it uses WatermelonDB's utility)
  const checkUnsyncedChanges = useCallback(async () => {
    try {
      const hasChanges = await hasUnsyncedChanges({ database }); // Uses imported database
      console.log('Unsynced changes check:', hasChanges ? 'Changes found' : 'No changes');
      return hasChanges;
    } catch (error) {
      console.error('Error checking for unsynced changes:', error);
      return false;
    }
  }, []); // No dependencies needed as it uses imported database

  // Track user session changes and manage sync process
  useEffect(() => {
    const currentUserId = session?.user?.id;
    console.log(`[DatabaseProvider] Session change detected. UserId: ${currentUserId || 'null'}`);

    // Update the current user ID ref to track changes
    const prevUserId = currentUserIdRef.current;
    currentUserIdRef.current = currentUserId;

    // Clear any existing interval first to prevent duplicates
    if (intervalIdRef.current) {
      console.log('[DatabaseProvider] Clearing existing sync interval');
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    // Handle user login
    if (currentUserId && (!prevUserId || prevUserId !== currentUserId)) {
      console.log('[DatabaseProvider] User logged in or changed. Starting initial sync...');
      syncSetupDoneRef.current = true;

      // Perform initial sync (use the regular sync, not debounced, and force it)
      sync();

      // Set up periodic sync with a reasonable interval (5 minutes = 300,000ms)
      console.log('[DatabaseProvider] Setting up periodic sync interval (5 minutes)...');
      intervalIdRef.current = setInterval(
        () => {
          // Don't use debouncedSync here - use the regular sync
          // The interval itself provides the delay between calls
          sync();
        },
        5 * 60 * 1000
      ); // 5 minutes in milliseconds

      // Update user ID in background sync task
      setLastActiveUserId(currentUserId);
    } else if (!currentUserId) {
      console.log('[DatabaseProvider] No user session. Clearing last active user ID.');
      // Clear last active user ID when logging out
      setLastActiveUserId(null);
      syncSetupDoneRef.current = false;
    }

    return () => {
      // Clean up interval on component unmount
      if (intervalIdRef.current) {
        console.log('[DatabaseProvider] Clearing sync interval on cleanup.');
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, [session?.user?.id, sync]);

  // Effect to register background sync task on mount
  useEffect(() => {
    registerBackgroundSyncAsync();
    // We don't typically unregister on unmount unless the app is closing permanently
  }, []);

  // Effect to update the stored user ID for the background task
  useEffect(() => {
    setLastActiveUserId(session?.user?.id ?? null);
  }, [session?.user?.id]);

  // Render loading indicator during initial setup/reset check (Keep this)
  if (isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{ fontSize: 18, color: '#000000', textAlign: 'center', marginTop: 10 }}>
          Initializing database...
        </Text>
      </View>
    );
  }

  // Render error state if initialization/reset check failed (Keep this)
  if (databaseError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <Text style={{ fontSize: 18, color: '#ff0000', textAlign: 'center' }}>Database Error</Text>
        <Text style={{ fontSize: 16, color: '#000000', textAlign: 'center' }}>
          {databaseError.message}
        </Text>
        <Text style={{ fontSize: 16, color: '#000000', textAlign: 'center' }}>
          Please try restarting the app. If the problem persists, you may need to reset the
          database.
        </Text>
      </View>
    );
  }

  // Provide the context value using the imported database instance and the debounced sync
  return (
    <DatabaseContext.Provider
      value={{
        database, // Pass the imported instance
        // Expose the enhanced sync function instead of the debounced one
        sync: enhancedSync,
        isSyncing, // Get from SyncContext
        hasUnsyncedChanges: checkUnsyncedChanges, // Keep this utility
        lastSyncTime, // Get from SyncContext
        resetDatabase: resetWatermelonDB, // Pass the imported reset function
      }}>
      {children}
    </DatabaseContext.Provider>
  );
};
