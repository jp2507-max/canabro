import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
} from 'react';

// Import from AuthProvider only
import { useAuth } from './AuthProvider';
// Import shared types from SyncTypes
import {
  isValidUuid,
  LAST_SYNC_KEY,
  FIRST_SYNC_COMPLETED_KEY,
  SyncStateInterface,
} from './SyncTypes';
import { synchronizeWithServer, getSyncHealth } from '../services/sync-service';

// Don't import from DatabaseProvider - we'll get the database instance as a prop

interface SyncContextProps extends SyncStateInterface {
  triggerSync: (force?: boolean) => Promise<boolean>;
  setIsSyncing: (syncing: boolean) => void;
  setLastSyncTime: (time: Date | null) => void;
  setSyncError: (error: Error | null) => void;
  clearSyncError: () => void;
  markFirstSyncCompleted: () => Promise<void>;
  getSyncMetrics: () => ReturnType<typeof getSyncHealth>;
}

const SyncContext = createContext<SyncContextProps | undefined>(undefined);

export const useSyncContext = (): SyncContextProps => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncContext must be used within a SyncProvider');
  }
  return context;
};

// Keeping the old name for backward compatibility
export const useSyncStatus = useSyncContext;

// Accept database as a prop instead of importing from DatabaseProvider
interface SyncProviderProps {
  children: ReactNode;
  database: any; // Using 'any' here to avoid importing WatermelonDB types
}

export const SyncProvider: React.FC<SyncProviderProps> = ({ children, database }) => {
  const { user } = useAuth();
  const [isSyncing, setIsSyncingState] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTimeState] = useState<Date | null>(null);
  const [syncError, setSyncErrorState] = useState<Error | null>(null);
  const [isFirstSync, setIsFirstSync] = useState<boolean>(true);

  // Load the last sync time and first sync status on mount
  useEffect(() => {
    async function loadSyncState() {
      try {
        // Load last sync time
        const lastSyncTimestamp = await AsyncStorage.getItem(LAST_SYNC_KEY);
        if (lastSyncTimestamp) {
          setLastSyncTimeState(new Date(parseInt(lastSyncTimestamp, 10)));
        }

        // Check if first sync has been completed
        const firstSyncCompleted = await AsyncStorage.getItem(FIRST_SYNC_COMPLETED_KEY);
        setIsFirstSync(firstSyncCompleted !== 'true');
      } catch (error) {
        console.error('Error loading sync state:', error);
      }
    }

    loadSyncState();
  }, []);

  // Rest of the component remains largely the same...
  // ... just make sure to use the database prop instead of the hook

  // The rest of your component remains the same
  const setIsSyncing = useCallback((syncing: boolean) => {
    setIsSyncingState(syncing);
    // Clear error when starting a new sync
    if (syncing) {
      setSyncErrorState(null);
    }
  }, []);

  const setLastSyncTime = useCallback((time: Date | null) => {
    setLastSyncTimeState(time);

    // Store the sync time in AsyncStorage
    if (time) {
      AsyncStorage.setItem(LAST_SYNC_KEY, time.getTime().toString()).catch((error) =>
        console.error('Failed to store last sync time:', error)
      );

      // Clear error on successful sync completion
      setSyncErrorState(null);
    }
  }, []);

  const setSyncError = useCallback((error: Error | null) => {
    setSyncErrorState(error);
    // Ensure syncing state is false if an error occurs
    if (error) {
      setIsSyncingState(false);
    }
  }, []);

  const clearSyncError = useCallback(() => {
    setSyncErrorState(null);
  }, []);

  const markFirstSyncCompleted = useCallback(async () => {
    try {
      await AsyncStorage.setItem(FIRST_SYNC_COMPLETED_KEY, 'true');
      setIsFirstSync(false);
      console.log('First sync marked as completed');
    } catch (error) {
      console.error('Error marking first sync as completed:', error);
    }
  }, []);

  // Function to trigger a sync with the server
  const triggerSync = useCallback(
    async (force: boolean = false): Promise<boolean> => {
      if (isSyncing) {
        console.log('Sync already in progress, skipping...');
        return false;
      }

      if (!database || !user?.id) {
        console.warn('Cannot sync: database or user ID not available');
        return false;
      }

      try {
        setIsSyncing(true);

        const syncSuccess = await synchronizeWithServer(database, user.id, isFirstSync, force);

        if (syncSuccess) {
          const now = new Date();
          setLastSyncTime(now);

          if (isFirstSync) {
            await markFirstSyncCompleted();
          }
        }

        return syncSuccess;
      } catch (error) {
        console.error('Sync error:', error);
        setSyncError(error instanceof Error ? error : new Error(String(error)));
        return false;
      } finally {
        setIsSyncing(false);
      }
    },
    [
      database,
      user,
      isSyncing,
      isFirstSync,
      setIsSyncing,
      setLastSyncTime,
      setSyncError,
      markFirstSyncCompleted,
    ]
  );

  // Retrieve current sync metrics
  const getSyncMetrics = useCallback(() => {
    return getSyncHealth();
  }, []);

  // Set up periodic sync (optional)
  useEffect(() => {
    if (!database || !user?.id) return;

    // Schedule sync every 10 minutes
    const intervalId = setInterval(
      () => {
        if (!isSyncing) {
          triggerSync(false).catch(console.error);
        }
      },
      10 * 60 * 1000
    );

    return () => clearInterval(intervalId);
  }, [database, user, isSyncing, triggerSync]);

  const value = {
    isSyncing,
    lastSyncTime,
    syncError,
    isFirstSync,
    triggerSync,
    setIsSyncing,
    setLastSyncTime,
    setSyncError,
    clearSyncError,
    markFirstSyncCompleted,
    getSyncMetrics,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};
