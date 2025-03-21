import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { Database } from '@nozbe/watermelondb';
import { hasUnsyncedChanges } from '@nozbe/watermelondb/sync';
import Constants from 'expo-constants';

// Import database directly
import database, { synchronizeWithSupabase } from '../database/database';

type DatabaseContextType = {
  database: Database;
  sync: () => Promise<void>;
  isSyncing: boolean;
  hasUnsyncedChanges: () => Promise<boolean>;
};

const DatabaseContext = createContext<DatabaseContextType | null>(null);

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showDevWarning, setShowDevWarning] = useState(Constants.appOwnership === 'expo');

  const sync = async () => {
    if (isSyncing) return;
    
    // Skip sync in Expo Go
    if (Constants.appOwnership === 'expo') {
      console.log('Sync skipped in Expo Go');
      return;
    }
    
    try {
      setIsSyncing(true);
      await synchronizeWithSupabase();
    } catch (error) {
      console.error('Error syncing database:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const checkUnsyncedChanges = async () => {
    // Always return false in Expo Go
    if (Constants.appOwnership === 'expo') {
      return false;
    }
    
    try {
      return await hasUnsyncedChanges({ database });
    } catch (error) {
      console.error('Error checking unsynced changes:', error);
      return false;
    }
  };

  useEffect(() => {
    // Initialize with a short delay
    setTimeout(() => {
      setIsInitialized(true);
      
      // Set up periodic sync (every 5 minutes)
      const syncInterval = setInterval(sync, 5 * 60 * 1000);
      
      return () => {
        clearInterval(syncInterval);
      };
    }, 500);
  }, []);

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <DatabaseContext.Provider value={{ 
      database, 
      sync, 
      isSyncing,
      hasUnsyncedChanges: checkUnsyncedChanges 
    }}>
      {showDevWarning && (
        <View style={{ 
          padding: 8,
          backgroundColor: '#FEF3C7', 
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 999,
          opacity: 0.9
        }}>
          <Text style={{ fontSize: 12, textAlign: 'center', color: '#92400E' }}>
            Running in Expo Go with mock database. Create a development build for full functionality.
          </Text>
          <Text 
            style={{ fontSize: 12, textAlign: 'center', color: '#92400E', textDecorationLine: 'underline', marginTop: 4 }}
            onPress={() => setShowDevWarning(false)}
          >
            Dismiss
          </Text>
        </View>
      )}
      {children}
    </DatabaseContext.Provider>
  );
};
