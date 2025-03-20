import { useEffect, useState } from 'react';
import database, { synchronizeWithSupabase } from '../lib/database/database';
import { Collection } from '@nozbe/watermelondb';
import { Plant } from '../lib/models/Plant';
import { DiaryEntry } from '../lib/models/DiaryEntry';
import { Profile } from '../lib/models/Profile';
import { supabase } from '../lib/supabase';

export function useDatabase() {
  const [plants, setPlants] = useState<Collection<Plant>>(database.get<Plant>('plants'));
  const [diaryEntries, setDiaryEntries] = useState<Collection<DiaryEntry>>(database.get<DiaryEntry>('diary_entries'));
  const [profiles, setProfiles] = useState<Collection<Profile>>(database.get<Profile>('profiles'));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Sync with Supabase when auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        try {
          setIsLoading(true);
          await synchronizeWithSupabase();
        } catch (err) {
          setError(err instanceof Error ? err : new Error('Failed to synchronize database'));
        } finally {
          setIsLoading(false);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Function to manually trigger synchronization
  const syncDatabase = async () => {
    try {
      setIsLoading(true);
      await synchronizeWithSupabase();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to synchronize database'));
    } finally {
      setIsLoading(false);
    }
  };

  return {
    database,
    plants,
    diaryEntries,
    profiles,
    isLoading,
    error,
    syncDatabase,
  };
}
