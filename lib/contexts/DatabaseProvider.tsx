import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { Database } from '@nozbe/watermelondb';
import { synchronize } from '@nozbe/watermelondb/sync';
import { hasUnsyncedChanges } from '@nozbe/watermelondb/sync';
import Constants from 'expo-constants';
import { useAuth } from './AuthProvider';
import supabase from '../supabase';
import { Q } from '@nozbe/watermelondb';

// Import database directly
import database from '../database/database';

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

type DatabaseContextType = {
  database: Database;
  sync: () => Promise<void>;
  isSyncing: boolean;
  hasUnsyncedChanges: () => Promise<boolean>;
  lastSyncTime: Date | null;
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
  const [isInitialized, setIsInitialized] = useState(false);
  const [showDevWarning, setShowDevWarning] = useState(Constants.appOwnership === 'expo');

  // Sync with Supabase
  const sync = useCallback(async () => {
    if (isSyncing || !session?.user) return;
    
    // Skip sync in Expo Go
    if (Constants.appOwnership === 'expo') {
      console.log('Sync skipped in Expo Go');
      return;
    }
    
    try {
      setIsSyncing(true);
      
      // Use the Watermelon synchronize API
      await synchronize({
        database,
        pullChanges: async ({ lastPulledAt }) => {
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
          // Process each table
          for (const [table, tableChanges] of Object.entries(changes)) {
            // Handle created records
            if (tableChanges.created.length > 0) {
              const { error: createError } = await supabase
                .from(table)
                .upsert(tableChanges.created.map((record: any) => {
                  // Clean up record for Supabase
                  return record;
                }));
              
              if (createError) {
                console.error(`Error pushing created ${table}:`, createError);
              }
            }
            
            // Handle updated records
            if (tableChanges.updated.length > 0) {
              const { error: updateError } = await supabase
                .from(table)
                .upsert(tableChanges.updated.map((record: any) => {
                  // Clean up record for Supabase
                  return record;
                }));
              
              if (updateError) {
                console.error(`Error pushing updated ${table}:`, updateError);
              }
            }
            
            // Handle deleted records
            if (tableChanges.deleted.length > 0) {
              const { error: deleteError } = await supabase
                .from(table)
                .delete()
                .in('id', tableChanges.deleted);
              
              if (deleteError) {
                console.error(`Error pushing deleted ${table}:`, deleteError);
              }
            }
          }
        },
        migrationsEnabledAtVersion: 1,
      });
      
      // Update last sync time
      setLastSyncTime(new Date());
      console.log('Sync complete');
    } catch (error) {
      console.error('Error syncing database:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, session]);

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
    // Initialize profile for the user if necessary
    const initializeProfile = async () => {
      if (!session?.user) return;
      
      try {
        // Get profiles collection
        const profiles = database.get<Profile>('profiles');
        
        // Check if profile exists
        const existingProfiles = await profiles
          .query(Q.where('user_id', session.user.id))
          .fetch();
        
        // Create profile if it doesn't exist
        if (existingProfiles.length === 0) {
          await database.write(async () => {
            await profiles.create((profile) => {
              profile.userId = session.user!.id;
              profile.username = session.user!.email || 'User';
              // Use other Supabase user data as needed
            });
          });
          console.log('Created user profile');
        }
        
        // Perform initial sync
        await sync();
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing profile:', error);
        setIsInitialized(true); // Continue anyway
      }
    };
    
    // Initialize with a short delay
    const timer = setTimeout(() => {
      initializeProfile();
      
      // Set up periodic sync (every 5 minutes)
      const syncInterval = setInterval(sync, 5 * 60 * 1000);
      
      return () => {
        clearInterval(syncInterval);
      };
    }, 500);
    
    return () => clearTimeout(timer);
  }, [session, sync]);

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
      hasUnsyncedChanges: checkUnsyncedChanges,
      lastSyncTime
    }}>
      {children}
      {showDevWarning && (
        <View style={{ 
          padding: 8,
          backgroundColor: '#FEF3C7', 
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          borderTopWidth: 1,
          borderTopColor: '#F59E0B'
        }}>
          <Text style={{ fontSize: 12, color: '#92400E', textAlign: 'center' }}>
            Running in Expo Go: Database sync is disabled and mock data is being used
          </Text>
        </View>
      )}
    </DatabaseContext.Provider>
  );
};
