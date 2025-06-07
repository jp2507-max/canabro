import { Database } from '@nozbe/watermelondb';
import { hasUnsyncedChanges } from '@nozbe/watermelondb/sync'; // Keep for checkUnsyncedChanges
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { ActivityIndicator, View, Text, Alert } from 'react-native';

import { useAuth } from './AuthProvider';
// Import the SyncProvider component instead of the hook
import { SyncProvider } from './SyncContext';
// Import shared types from SyncTypes
import { isValidUuid, MIN_SYNC_INTERVAL_MS, SyncOptions } from './SyncTypes';
// Import database instance as default, and resetDatabase as named
import database, { resetDatabase as resetWatermelonDB } from '../database/database';
import { forceResetDatabaseIfNeeded } from '../database/resetUtil';
// Import the centralized sync function and background task helpers
import { synchronizeWithServer, loadSyncMetadata } from '../services/sync-service';
import { registerBackgroundSyncAsync, setLastActiveUserId } from '../tasks/syncTask'; // Import task functions

type DatabaseContextType = {
  database: Database;
  sync: (options?: SyncOptions) => Promise<boolean>; // Use SyncOptions type
  isSyncing: boolean;
  hasUnsyncedChanges: () => Promise<boolean>;
  lastSyncTime: Date | null;
  resetDatabase: () => Promise<boolean>; // Keep reset functionality
};

const DatabaseContext = createContext<DatabaseContextType | null>(null);

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};

// Modify the DatabaseProvider component to handle potential missing SyncContext
export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();

  // Use state hooks for sync-related state
  const [isInitializing, setIsInitializing] = useState(true);
  const [databaseError, setDatabaseError] = useState<Error | null>(null);

  // Create internal state for sync status
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Use refs to manage interval and setup state reliably
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const syncSetupDoneRef = useRef<boolean>(false);
  const currentUserIdRef = useRef<string | null | undefined>(undefined);
  const syncInProgressRef = useRef<boolean>(false);

  // Effect for initial setup like forceResetDatabaseIfNeeded
  useEffect(() => {
    let isMounted = true;
    const performInitialSetup = async () => {
      setIsInitializing(true); // Start initializing state
      setDatabaseError(null);
      try {
        // Only run the reset check here. The database instance is already created.
        await forceResetDatabaseIfNeeded();

        // Load sync metadata from localStorage for fault tolerance
        const syncMetadata = await loadSyncMetadata(database);
        if (syncMetadata.lastSyncTime) {
          setLastSyncTime(new Date(syncMetadata.lastSyncTime));
          console.log(
            '[DatabaseProvider] Restored last sync time:',
            new Date(syncMetadata.lastSyncTime).toISOString()
          );
        }

        if (syncMetadata.lastSyncError) {
          console.log(
            '[DatabaseProvider] Found previous sync error:',
            syncMetadata.lastSyncError.message
          );
        }

        if (isMounted) {
          setDatabaseError(null);
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
    const userId = session?.user?.id;
    if (syncInProgressRef.current || !isValidUuid(userId)) {
      console.log(`Sync skipped: syncInProgressRef=${syncInProgressRef.current}, userId=${userId}`);
      return false;
    }

    // Local flag to track sync in progress (component level protection)
    syncInProgressRef.current = true;
    setIsSyncing(true);

    try {
      console.log('Starting sync via synchronizeWithServer...');
      // Call the imported sync function (which has its own mechanism to prevent concurrent calls)
      // Add null check for session before accessing session.user.id
      if (!session || !session.user) {
        throw new Error('No active session for synchronization');
      }
      const syncSuccess = await synchronizeWithServer(database, session.user.id, false, false);

      if (syncSuccess) {
        const now = new Date();
        setLastSyncTime(now);
        console.log('Sync finished successfully via synchronizeWithServer at', now.toISOString());
        return true;
      } else {
        console.warn('Sync via synchronizeWithServer reported failure.');
        return false;
      }
    } catch (error) {
      const syncErr = error instanceof Error ? error : new Error(String(error));
      console.error('Error during sync via synchronizeWithServer:', syncErr);
      Alert.alert('Sync Error', `Failed to sync with the server: ${syncErr.message}`);
      return false;
    } finally {
      syncInProgressRef.current = false;
      setIsSyncing(false);
    }
  }, [session?.user?.id]);

  // Enhanced sync function that respects the throttling interval and provides user feedback
  const enhancedSync = useCallback(
    async (options?: SyncOptions): Promise<boolean> => {
      if (syncInProgressRef.current) {
        console.log('Sync already in progress, skipping...');
        return false;
      }
      const userId = session?.user?.id;
      if (!isValidUuid(userId)) {
        console.log('Enhanced sync skipped: invalid or missing userId', userId);
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
      return sync();
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
  }, []);

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

      // Perform initial sync
      sync();

      // Set up periodic sync with a reasonable interval (5 minutes = 300,000ms)
      console.log('[DatabaseProvider] Setting up periodic sync interval (5 minutes)...');
      intervalIdRef.current = setInterval(
        () => {
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

  // Render loading indicator during initial setup/reset check
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

  // Render error state if initialization/reset check failed
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

  // Create the database context value
  const databaseContextValue = {
    database,
    sync: enhancedSync,
    isSyncing,
    hasUnsyncedChanges: checkUnsyncedChanges,
    lastSyncTime,
    resetDatabase: resetWatermelonDB,
  };

  // Provide the database context, and wrap children with the SyncProvider to break the dependency cycle
  return (
    <DatabaseContext.Provider value={databaseContextValue}>
      <SyncProvider database={database}>{children}</SyncProvider>
    </DatabaseContext.Provider>
  );
};
