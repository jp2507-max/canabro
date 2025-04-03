import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';

interface SyncContextProps {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncError: Error | null;
  setIsSyncing: (syncing: boolean) => void;
  setLastSyncTime: (time: Date | null) => void;
  setSyncError: (error: Error | null) => void;
  clearSyncError: () => void;
}

const SyncContext = createContext<SyncContextProps | undefined>(undefined);

export const useSyncStatus = (): SyncContextProps => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncStatus must be used within a SyncProvider');
  }
  return context;
};

export const SyncProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isSyncing, setIsSyncingState] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTimeState] = useState<Date | null>(null);
  const [syncError, setSyncErrorState] = useState<Error | null>(null);

  const setIsSyncing = useCallback((syncing: boolean) => {
    setIsSyncingState(syncing);
    // Clear error when starting a new sync
    if (syncing) {
      setSyncErrorState(null);
    }
  }, []);

  const setLastSyncTime = useCallback((time: Date | null) => {
    setLastSyncTimeState(time);
    // Clear error on successful sync completion (indicated by setting time)
    if (time) {
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

  const value = {
    isSyncing,
    lastSyncTime,
    syncError,
    setIsSyncing,
    setLastSyncTime,
    setSyncError,
    clearSyncError,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};
