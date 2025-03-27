/**
 * useWatermelon Hook
 * 
 * Custom hook for accessing WatermelonDB collections and synchronization
 * This hooks into the existing DatabaseProvider to provide a consistent interface
 */

import { useContext, useState, useEffect } from 'react';
import { Collection } from '@nozbe/watermelondb';
import { useDatabase } from '../contexts/DatabaseProvider';
import { Plant } from '../models/Plant';
import { Profile } from '../models/Profile';
import { GrowJournal } from '../models/GrowJournal';
import { JournalEntry } from '../models/JournalEntry';
import { GrowLocation } from '../models/GrowLocation';
import { DiaryEntry } from '../models/DiaryEntry';
import { PlantTask } from '../models/PlantTask';
import { Post } from '../models/Post';
import { synchronizeWithServer } from '../services/sync-service';
import { useAuth } from '../contexts/AuthProvider';

interface WatermelonContextType {
  database: any;
  plants: Collection<Plant>;
  profiles: Collection<Profile>;
  growJournals: Collection<GrowJournal>;
  journalEntries: Collection<JournalEntry>;
  growLocations: Collection<GrowLocation>;
  diaryEntries: Collection<DiaryEntry>;
  plantTasks: Collection<PlantTask>;
  posts: Collection<Post>;
  sync: () => Promise<void>;
  isInitialized: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
}

/**
 * useWatermelon Hook
 * 
 * Custom hook for accessing WatermelonDB collections and synchronization
 * This provides a consistent interface for all database operations
 */
export default function useWatermelon(): WatermelonContextType {
  // Use the existing DatabaseProvider context
  const { database, sync, isSyncing } = useDatabase();
  const { session } = useAuth();
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  // Access collections
  const plants = database.get<Plant>('plants');
  const profiles = database.get<Profile>('profiles');
  const growJournals = database.get<GrowJournal>('grow_journals');
  const journalEntries = database.get<JournalEntry>('journal_entries');
  const growLocations = database.get<GrowLocation>('grow_locations');
  const diaryEntries = database.get<DiaryEntry>('diary_entries');
  const plantTasks = database.get<PlantTask>('plant_tasks');
  const posts = database.get<Post>('posts');
  
  // Enhanced sync function that updates lastSyncTime
  const syncWithTracking = async () => {
    if (!session?.user?.id) return;
    
    try {
      await sync();
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };
  
  // Initial sync on auth change
  useEffect(() => {
    if (session?.user?.id) {
      syncWithTracking();
    }
  }, [session?.user?.id]);
  
  return {
    database,
    plants,
    profiles,
    growJournals,
    journalEntries,
    growLocations,
    diaryEntries,
    plantTasks,
    posts,
    sync: syncWithTracking,
    isInitialized: true,
    isSyncing,
    lastSyncTime,
  };
}
