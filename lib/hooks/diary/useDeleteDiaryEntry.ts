import { useDatabase } from '../../contexts/DatabaseProvider';
import { DiaryEntry } from '../../types';
import { useSupabaseMutation } from '../supabase';

/**
 * Hook for deleting a diary entry
 */
export function useDeleteDiaryEntry() {
  const database = useDatabase();

  // Use the base mutation hook
  const { mutate, loading, error, reset } = useSupabaseMutation<DiaryEntry>({
    table: 'diary_entries',
    type: 'DELETE',
    returning: 'representation',
  });

  /**
   * Delete a diary entry from both Supabase and WatermelonDB
   */
  const deleteDiaryEntry = async (entryId: string) => {
    if (!entryId) {
      throw new Error('Diary entry ID is required');
    }

    // Delete from Supabase
    const result = await mutate(entryId, 'id');

    // If successful and we have a database instance, also delete locally
    if (result.data && database.database) {
      try {
        await database.database.write(async () => {
          const entryCollection = database.database.get('diary_entries');
          const entry = await entryCollection.find(entryId);
          await entry.markAsDeleted();
        });
      } catch (e) {
        console.error('Error deleting diary entry in local database:', e);
      }
    }

    return result;
  };

  return {
    deleteDiaryEntry,
    loading,
    error,
    reset,
  };
}
