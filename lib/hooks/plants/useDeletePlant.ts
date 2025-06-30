import { useDatabase } from '../../contexts/DatabaseProvider';
import { Plant } from '../../types';
import { useSupabaseMutation } from '../supabase';

/**
 * Hook for deleting a plant
 */
export function useDeletePlant() {
  const database = useDatabase();

  // Use the base mutation hook
  const { mutate, loading, error, reset } = useSupabaseMutation<Plant>({
    table: 'plants',
    type: 'DELETE',
    returning: 'representation',
  });

  /**
   * Delete a plant from both Supabase and WatermelonDB
   */
  const deletePlant = async (plantId: string) => {
    if (!plantId) {
      throw new Error('Plant ID is required');
    }

    // Delete from Supabase
    const result = await mutate(plantId, 'id');

    // If successful and we have a database instance, also delete locally
    if (result.data && database.database) {
      try {
        await database.database.write(async () => {
          const plantCollection = database.database.get('plants');
          const plant = await plantCollection.find(plantId);
          await plant.markAsDeleted();
        });
      } catch (e) {
        console.error('Error deleting plant in local database:', e);
      }
    }

    return result;
  };

  return {
    deletePlant,
    loading,
    error,
    reset,
  };
}
