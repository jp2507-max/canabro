import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, View, Text, Alert } from 'react-native';
import { Database } from '@nozbe/watermelondb';
import { synchronize } from '@nozbe/watermelondb/sync';
import { hasUnsyncedChanges } from '@nozbe/watermelondb/sync';
import Constants from 'expo-constants';
import { useAuth } from './AuthProvider';
import supabase from '../supabase';
import { Q } from '@nozbe/watermelondb';

// Import database directly
import database, { resetDatabase } from '../database/database';
import { forceResetDatabaseIfNeeded } from '../database/resetUtil';

// Import models
import { Plant } from '../models/Plant';
import { Profile } from '../models/Profile';
import { GrowJournal } from '../models/GrowJournal';
import { JournalEntry } from '../models/JournalEntry';
import { GrowLocation } from '../models/GrowLocation';
import { DiaryEntry } from '../models/DiaryEntry';

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
  database: Database;
  sync: () => Promise<void>;
  isSyncing: boolean;
  hasUnsyncedChanges: () => Promise<boolean>;
  lastSyncTime: Date | null;
  resetDatabase: () => Promise<boolean>;
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
  const { session } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [showDevWarning, setShowDevWarning] = useState(false); 
  const [isInitializing, setIsInitializing] = useState(true);
  const [databaseError, setDatabaseError] = useState<Error | null>(null);

  // Initialize the database and handle database errors
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        // Force reset the database if needed (e.g., when the app is updated or a migration fails)
        await forceResetDatabaseIfNeeded();
        setDatabaseError(null);
      } catch (error) {
        console.error("Database initialization error:", error);
        setDatabaseError(error instanceof Error ? error : new Error(String(error)));
        
        // Show a database reset dialog to the user
        Alert.alert(
          "Database Error",
          "There was an error initializing the database. Would you like to reset it? This will clear all local data.",
          [
            {
              text: "Cancel",
              style: "cancel"
            },
            {
              text: "Reset Database",
              onPress: async () => {
                const reset = await resetDatabase();
                if (reset) {
                  Alert.alert(
                    "Database Reset",
                    "The database has been reset. Please restart the app."
                  );
                }
              }
            }
          ]
        );
      } finally {
        setIsInitializing(false);
      }
    };

    initializeDatabase();
  }, []);

  // Clean record for Supabase - remove WatermelonDB-specific fields
  const cleanRecordForSupabase = (record: any) => {
    const cleaned = { ...record };
    
    // Remove WatermelonDB internal fields
    WATERMELON_FIELDS.forEach(field => {
      if (field in cleaned) {
        delete cleaned[field];
      }
    });
    
    // Make sure we have necessary fields for Supabase
    if (!cleaned.id && cleaned.post_id) {
      cleaned.id = cleaned.post_id;
    } else if (!cleaned.id && cleaned.plant_id) {
      cleaned.id = cleaned.plant_id;
    } else if (!cleaned.id && cleaned.user_id) {
      // Only use as fallback if we don't have a better ID
      cleaned.id = cleaned.user_id + '_' + Date.now();
    }
    
    // Convert timestamps to ISO strings for Supabase
    if (cleaned.created_at && typeof cleaned.created_at === 'number') {
      cleaned.created_at = new Date(cleaned.created_at).toISOString();
    }
    
    if (cleaned.updated_at && typeof cleaned.updated_at === 'number') {
      cleaned.updated_at = new Date(cleaned.updated_at).toISOString();
    }
    
    return cleaned;
  };

  // Sync with Supabase
  const sync = useCallback(async () => {
    if (isSyncing || !session?.user) {
      console.log('Sync skipped: isSyncing=' + isSyncing + ', session=' + (session ? 'exists' : 'null'));
      return;
    }
    
    console.log('Starting sync with Supabase...');
    
    try {
      setIsSyncing(true);
      
      // Use the Watermelon synchronize API
      await synchronize({
        database,
        pullChanges: async ({ lastPulledAt }) => {
          console.log('Pulling changes since:', lastPulledAt ? new Date(lastPulledAt).toISOString() : 'initial sync');
          
          // Convert the date to ISO string for the API
          const lastPulledAtISO = lastPulledAt ? new Date(lastPulledAt).toISOString() : null;
          
          // Create a container for our changes
          const changes: any = { changes: {}, timestamp: Date.now() };
          
          // For each table, pull changes from Supabase
          for (const table of TABLES_TO_SYNC) {
            let query = supabase
              .from(table)
              .select('*')
              .eq('user_id', session.user.id);
            
            // Only fetch rows updated since last sync if we have a timestamp
            if (lastPulledAtISO) {
              query = query.filter('updated_at', 'gt', lastPulledAtISO);
            }
            
            const { data, error } = await query;
            
            if (error) {
              console.error(`Error pulling ${table}:`, error);
              continue;
            }
            
            console.log(`Pulled ${data?.length || 0} records from ${table}`);
            
            // Process the data for each table
            changes.changes[table] = {
              created: data || [],
              updated: [],
              deleted: []
            };
          }
          
          return changes;
        },
        pushChanges: async ({ changes, lastPulledAt }) => {
          console.log('Pushing local changes to Supabase...');
          
          // Process each table
          for (const [table, tableChanges] of Object.entries<any>(changes)) {
            // Handle created records
            if (tableChanges.created && tableChanges.created.length > 0) {
              console.log(`Pushing ${tableChanges.created.length} created records to ${table}`);
              
              // Clean records before sending to Supabase
              const cleanedRecords = tableChanges.created.map(cleanRecordForSupabase);
              
              // Skip empty records
              if (cleanedRecords.length === 0) {
                continue;
              }
              
              const { error: createError } = await supabase
                .from(table)
                .upsert(cleanedRecords);
              
              if (createError) {
                console.error(`Error pushing created ${table}:`, createError);
              } else {
                console.log(`Successfully pushed created records to ${table}`);
              }
            }
            
            // Handle updated records
            if (tableChanges.updated && tableChanges.updated.length > 0) {
              console.log(`Pushing ${tableChanges.updated.length} updated records to ${table}`);
              
              // Clean records before sending to Supabase
              const cleanedRecords = tableChanges.updated.map(cleanRecordForSupabase);
              
              // Skip empty records
              if (cleanedRecords.length === 0) {
                continue;
              }
              
              const { error: updateError } = await supabase
                .from(table)
                .upsert(cleanedRecords);
              
              if (updateError) {
                console.error(`Error pushing updated ${table}:`, updateError);
              } else {
                console.log(`Successfully pushed updated records to ${table}`);
              }
            }
            
            // Handle deleted records - skip if empty
            if (tableChanges.deleted && tableChanges.deleted.length > 0) {
              console.log(`Pushing ${tableChanges.deleted.length} deleted records from ${table}`);
              
              const { error: deleteError } = await supabase
                .from(table)
                .delete()
                .in('id', tableChanges.deleted);
              
              if (deleteError) {
                console.error(`Error pushing deleted ${table}:`, deleteError);
              } else {
                console.log(`Successfully deleted records from ${table}`);
              }
            }
          }
          
          console.log('Sync complete');
        },
        migrationsEnabledAtVersion: 1,
      });
      
      // Update last sync time
      setLastSyncTime(new Date());
      console.log('Sync finished successfully at', new Date().toISOString());
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [session, isSyncing]);

  // Check for unsynchronized changes
  const checkUnsyncedChanges = useCallback(async () => {
    try {
      const hasChanges = await hasUnsyncedChanges({ database });
      console.log('Unsynced changes check:', hasChanges ? 'Changes found' : 'No changes');
      return hasChanges;
    } catch (error) {
      console.error('Error checking for unsynced changes:', error);
      return false;
    }
  }, []);

  // Set up initial sync and periodic sync
  useEffect(() => {
    if (session?.user) {
      console.log('User session detected, scheduling initial sync');
      
      // Initial sync when user logs in
      sync();
      
      // Set up periodic sync (every 5 minutes)
      const syncInterval = setInterval(() => {
        console.log('Running periodic sync...');
        sync();
      }, 5 * 60 * 1000);
      
      return () => {
        console.log('Cleaning up sync interval');
        clearInterval(syncInterval);
      };
    } else {
      console.log('No user session, sync disabled');
    }
  }, [session, sync]);

  if (isInitializing) {
    return (
      <View style={{ 
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{ fontSize: 18, color: '#000000', textAlign: 'center' }}>
          Initializing database...
        </Text>
      </View>
    );
  }

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

  return (
    <DatabaseContext.Provider value={{ 
      database, 
      sync, 
      isSyncing,
      hasUnsyncedChanges: checkUnsyncedChanges,
      lastSyncTime,
      resetDatabase
    }}>
      {children}
    </DatabaseContext.Provider>
  );
};
