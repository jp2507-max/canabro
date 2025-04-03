import { DiaryEntry } from '../../types';
import { useSupabaseItem } from '../supabase';

/**
 * Hook for fetching a single diary entry by ID
 */
export function useDiaryEntry(entryId: string | null) {
  return useSupabaseItem<DiaryEntry>({
    table: 'diary_entries',
    matchColumn: 'id',
    matchValue: entryId,
    // Include related plant data
    select: `
      *,
      plants (
        id,
        name,
        strain_id,
        growth_stage,
        image_url
      )
    `,
  });
}
