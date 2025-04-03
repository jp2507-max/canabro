import { useDatabase } from '../../contexts/DatabaseProvider';
import { Plant } from '../../types';
import { useSupabaseMutation } from '../supabase';

/**
 * Data for updating a plant
 */
export type UpdatePlantData = Partial<Omit<Plant, 'id' | 'user_id' | 'created_at'>>;

/**
 * Hook for updating a plant
 */
export function useUpdatePlant(plantId: string) {
  const database = useDatabase();

  // Use the base mutation hook
  const { mutate, loading, error, reset } = useSupabaseMutation<Plant>({
    table: 'plants',
    type: 'UPDATE',
    returning: 'representation',
  });

  /**
   * Update a plant in both Supabase and WatermelonDB
   */
  const updatePlant = async (data: UpdatePlantData) => {
    if (!plantId) {
      throw new Error('Plant ID is required');
    }

    // Add updated_at timestamp
    const updateData: UpdatePlantData & { id: string } = {
      ...data,
      id: plantId,
      updated_at: new Date().toISOString(),
    };

    // Update in Supabase
    const result = await mutate(updateData, 'id');

    // If successful and we have a database instance, also update locally
    if (result.data && database.database) {
      try {
        await database.database.write(async () => {
          const plantCollection = database.database.get('plants');
          const plant = await plantCollection.find(plantId);

          await plant.update((p: any) => {
            // Update each field if it's in the data
            if (data.name) p.name = data.name;
            if (data.strain) p.strain = data.strain;
            if (data.strain_id !== undefined) p.strain_id = data.strain_id;
            if (data.growth_stage) p.growth_stage = data.growth_stage;
            if (data.planted_date) p.planted_date = data.planted_date;
            if (data.height !== undefined) p.height = data.height;
            if (data.notes !== undefined) p.notes = data.notes;
            if (data.image_url !== undefined) p.image_url = data.image_url;
            if (data.location_id !== undefined) p.location_id = data.location_id;
            if (data.is_auto_flower !== undefined) p.is_auto_flower = data.is_auto_flower;
            if (data.is_feminized !== undefined) p.is_feminized = data.is_feminized;
            if (data.is_public !== undefined) p.is_public = data.is_public;
            if (data.expected_harvest_date !== undefined)
              p.expected_harvest_date = data.expected_harvest_date;
            if (data.thc_content !== undefined) p.thc_content = data.thc_content;
            if (data.cbd_content !== undefined) p.cbd_content = data.cbd_content;
            if (updateData.updated_at) p.updated_at = updateData.updated_at;
          });
        });
      } catch (e) {
        console.error('Error updating plant in local database:', e);
      }
    }

    return result;
  };

  return {
    updatePlant,
    loading,
    error,
    reset,
  };
}
