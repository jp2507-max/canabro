/**
 * useWatermelon Hook
 *
 * Custom hook for accessing WatermelonDB collections and synchronization
 * This hooks into the existing DatabaseProvider to provide a consistent interface
 */

import { Collection } from '@nozbe/watermelondb';
import { useState, useEffect } from 'react'; // useContext is unused

import { useAuth } from '../contexts/AuthProvider';
import { useDatabase } from '../contexts/DatabaseProvider';
import { DiaryEntry } from '../models/DiaryEntry';
import { GrowJournal } from '../models/GrowJournal';
import { GrowLocation } from '../models/GrowLocation';
import { JournalEntry } from '../models/JournalEntry';
import { Plant } from '../models/Plant';
import { PlantMetrics } from '../models/PlantMetrics';
import { PlantTask } from '../models/PlantTask';
// Removed: import { Post } from '../models/Post'; - Post model has been deleted
import { Profile } from '../models/Profile';
// import { synchronizeWithServer } from '../services/sync-service'; // synchronizeWithServer is unused

interface WatermelonContextType {
  database: any;
  plants: Collection<Plant>;
  profiles: Collection<Profile>;
  growJournals: Collection<GrowJournal>;
  journalEntries: Collection<JournalEntry>;
  growLocations: Collection<GrowLocation>;
  diaryEntries: Collection<DiaryEntry>;
  plantTasks: Collection<PlantTask>;
  plantMetrics: Collection<PlantMetrics>;
  // Removed: posts: Collection<Post>; - posts table has been removed
  sync: (options?: { showFeedback?: boolean; force?: boolean }) => Promise<boolean>;
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
  const plantMetrics = database.get<PlantMetrics>('plant_metrics');
  // Removed: const posts = database.get<Post>('posts'); - posts table has been removed

  // Enhanced sync function that updates lastSyncTime
  const syncWithTracking = async (options?: { showFeedback?: boolean; force?: boolean }) => {
    if (!session?.user?.id) return false;

    try {
      // Pass the options through to the underlying sync function
      const result = await sync(options);
      if (result) {
        setLastSyncTime(new Date());
      }
      return result;
    } catch (error) {
      console.error('Sync failed:', error);
      return false;
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
    plantMetrics,
    // Removed: posts, - posts table has been removed
    sync: syncWithTracking,
    isInitialized: true,
    isSyncing,
    lastSyncTime,
  };
}
