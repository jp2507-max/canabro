import { Collection, Model } from '@nozbe/watermelondb';
import { useEffect, useState } from 'react';
import { Observable } from 'rxjs';

import database from '../database/database';
import { DiaryEntry } from '../models/DiaryEntry';
import { Plant } from '../models/Plant';
import { Profile } from '../models/Profile';
import supabase from '../supabase';

// Implement synchronizeWithSupabase function locally since it's not exported from database
async function synchronizeWithSupabase() {
  // Implement basic synchronization logic
  console.log('Synchronizing local database with Supabase...');
  // This would typically involve pulling remote changes and pushing local changes
  // For now, this is a placeholder function
  return Promise.resolve();
}

export function useDatabase() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Sync with Supabase when auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
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

  // Helper function to get observable query for any collection
  const observeCollection = <T extends Model>(
    collectionName: string,
    queryBuilder?: (collection: Collection<T>) => any
  ): Observable<T[]> => {
    const collection = database.get<T>(collectionName);
    if (queryBuilder) {
      return queryBuilder(collection).observe();
    }
    return collection.query().observe();
  };

  // Pre-defined observables for common collections
  const observePlants = (
    queryBuilder?: (collection: Collection<Plant>) => any
  ): Observable<Plant[]> => observeCollection<Plant>('plants', queryBuilder);

  const observeDiaryEntries = (
    queryBuilder?: (collection: Collection<DiaryEntry>) => any
  ): Observable<DiaryEntry[]> => observeCollection<DiaryEntry>('diary_entries', queryBuilder);

  const observeProfiles = (
    queryBuilder?: (collection: Collection<Profile>) => any
  ): Observable<Profile[]> => observeCollection<Profile>('profiles', queryBuilder);

  return {
    database,
    observeCollection,
    observePlants,
    observeDiaryEntries,
    observeProfiles,
    isLoading,
    error,
    syncDatabase,
  };
}
