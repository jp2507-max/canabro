import { Plant } from '../../types';
import { useSupabaseItem } from '../supabase';

/**
 * Hook for fetching a single plant by ID
 */
export function usePlant(plantId: string | null) {
  return useSupabaseItem<Plant>({
    table: 'plants',
    matchColumn: 'id',
    matchValue: plantId,
    // Include related data like strain information
    select: `
      *,
      strains (
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
    `
  });
}
