import { useDatabase } from '../../contexts/DatabaseProvider';
import { DiaryEntry } from '../../types';
import { useSupabaseMutation } from '../supabase';

/**
 * Data for updating a diary entry
 */
export type UpdateDiaryEntryData = Partial<
  Omit<DiaryEntry, 'id' | 'user_id' | 'plant_id' | 'created_at'>
>;

/**
 * Hook for updating a diary entry
 */
export function useUpdateDiaryEntry(entryId: string) {
  const database = useDatabase();

  // Use the base mutation hook
  const { mutate, loading, error, reset } = useSupabaseMutation<DiaryEntry>({
    table: 'diary_entries',
    type: 'UPDATE',
    returning: 'representation',
  });

  /**
   * Update a diary entry in both Supabase and WatermelonDB
   */
  const updateDiaryEntry = async (data: UpdateDiaryEntryData) => {
    if (!entryId) {
      throw new Error('Diary entry ID is required');
    }

    // Process metrics if provided
    const processedData: UpdateDiaryEntryData = { ...data };
    if (data.metrics && typeof data.metrics === 'object') {
      // Metrics is already an object, no need to stringify
      processedData.metrics = data.metrics;
    }

    // Add updated_at timestamp
    const updateData: UpdateDiaryEntryData & { id: string } = {
      ...processedData,
      id: entryId,
      updated_at: new Date().toISOString(),
    };

    // Update in Supabase
    const result = await mutate(updateData, 'id');

    // If successful and we have a database instance, also update locally
    if (result.data && database.database) {
      try {
        await database.database.write(async () => {
          const entryCollection = database.database.get('diary_entries');
          const entry = await entryCollection.find(entryId);

          await entry.update((e: any) => {
            // Update each field if it's in the data
            if (data.entry_type) e.entry_type = data.entry_type;
            if (data.title !== undefined) e.title = data.title;
            if (data.content) e.content = data.content;
            if (data.entry_date) e.entry_date = data.entry_date;
            if (data.image_url !== undefined) e.image_url = data.image_url;
            if (data.metrics !== undefined) e.metrics = data.metrics;
            if (data.is_public !== undefined) e.is_public = data.is_public;
            if (updateData.updated_at) e.updated_at = updateData.updated_at;
          });
        });
      } catch (e) {
        console.error('Error updating diary entry in local database:', e);
      }
    }

    return result;
  };

  return {
    updateDiaryEntry,
    loading,
    error,
    reset,
  };
}
