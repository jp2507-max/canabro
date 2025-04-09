import { useState, useEffect } from 'react';
import { Plant } from '../../types';
import { useSupabaseItem } from '../supabase';
import { useDatabase } from '../../contexts/DatabaseProvider';

/**
 * Hook for fetching a single plant by ID
 * This hook now handles both local WatermelonDB and remote Supabase data
 */
export function usePlant(plantId: string | null) {
  const { database } = useDatabase();
  const [localData, setLocalData] = useState<any>(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<Error | null>(null);
  
  // Still fetch from Supabase as a fallback
  const { data: remoteData, loading: remoteLoading, error: remoteError } = useSupabaseItem<Plant>({
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

  // Try to fetch from local database first
  useEffect(() => {
    if (!plantId || !database) return;
    
    const fetchLocalPlant = async () => {
      try {
        setLocalLoading(true);
        setLocalError(null);
        
        // Try to find the plant in the local database
        const plantsCollection = database.get('plants');
        const plant = await plantsCollection.find(plantId);
        
        if (plant) {
          setLocalData(plant);
        } else {
          // If not found locally, we'll rely on the remote data
          setLocalData(null);
        }
      } catch (err) {
        console.error('Error fetching local plant:', err);
        setLocalError(err instanceof Error ? err : new Error('Failed to fetch local plant'));
        setLocalData(null);
      } finally {
        setLocalLoading(false);
      }
    };
    
    fetchLocalPlant();
  }, [plantId, database]);
  
  // Combine local and remote data
  const data = localData || remoteData;
  const loading = localLoading || remoteLoading;
  const error = localError || remoteError;
  
  return { data, loading, error };
}
