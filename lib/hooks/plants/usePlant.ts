import { useState, useEffect, useCallback } from 'react';

import { useDatabase } from '../../contexts/DatabaseProvider'; // Restore context import
import { Plant as PlantModel } from '../../models/Plant';
import { Plant } from '../../types';
import { useSupabaseItem } from '../supabase';

/**
 * Hook for fetching a single plant by ID
 * This hook now handles both local WatermelonDB and remote Supabase data
 */
export function usePlant(plantId: string | null) {
  const { database } = useDatabase(); // Restore context usage
  const [localData, setLocalData] = useState<PlantModel | null>(null); // Restore local state
  const [localLoading, setLocalLoading] = useState(false); // Restore local state
  const [localError, setLocalError] = useState<Error | null>(null); // Restore local state

  // Fetch from Supabase
  const {
    data: remoteData,
    loading: remoteLoading,
    error: remoteError,
    refetch: refetchRemote,
  } = useSupabaseItem<Plant>({
    table: 'plants',
    matchColumn: 'id',
    matchValue: plantId,
    // Include related data like strain information
    select: `
      *,
      strain:strains (
        id,
        name,
        species,
        thc_content,
        cbd_content,
        image_url
      ),
      profiles (
        id,
        username,
        avatar_url
      )
    `,
  });

  // Local database fetch function
  const fetchLocalPlant = useCallback(async () => {
    if (!plantId || !database) return;

    try {
      setLocalLoading(true);
      setLocalError(null);

      const plantsCollection = database.get<PlantModel>('plants'); // Specify model type
      const plant = await plantsCollection.find(plantId);

      if (plant) {
        setLocalData(plant);
      } else {
        setLocalData(null);
      }
    } catch (err) {
      console.error('Error fetching local plant:', err);
      setLocalError(err instanceof Error ? err : new Error('Failed to fetch local plant'));
      setLocalData(null);
    } finally {
      setLocalLoading(false);
    }
  }, [plantId, database]);

  // Restore local database fetch useEffect
  useEffect(() => {
    fetchLocalPlant();
  }, [fetchLocalPlant]);

  // Combined refetch function
  const refetch = useCallback(async () => {
    await Promise.all([fetchLocalPlant(), refetchRemote()]);
  }, [fetchLocalPlant, refetchRemote]);

  // Restore combined data logic
  const data = localData || remoteData;
  const loading = localLoading || remoteLoading;
  const error = localError || remoteError;

  return { data, loading, error, refetch };
}
