
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
            // Update each field if it's in the data - use camelCase property names
            if (data.name) p.name = data.name;
            if (data.strain) p.strain = data.strain;
            if (data.strain_id !== undefined) p.strainId = data.strain_id;
            if (data.growth_stage) p.growthStage = data.growth_stage;
            if (data.planted_date) p.plantedDate = data.planted_date;
            if (data.height !== undefined) p.height = data.height;
            if (data.notes !== undefined) p.notes = data.notes;
            if (data.image_url !== undefined) p.imageUrl = data.image_url;
            if (data.location_id !== undefined) p.locationId = data.location_id;
            if (data.is_auto_flower !== undefined) p.isAutoFlower = data.is_auto_flower;
            if (data.is_feminized !== undefined) p.isFeminized = data.is_feminized;
            if (data.expected_harvest_date !== undefined)
              p.expectedHarvestDate = data.expected_harvest_date;
            if (data.thc_content !== undefined) p.thcContent = data.thc_content;
            if (data.cbd_content !== undefined) p.cbdContent = data.cbd_content;
            // v35 migration fields - camelCase property names
            if (data.plant_type !== undefined) p.plantType = data.plant_type;
            if (data.baseline_kind !== undefined) p.baselineKind = data.baseline_kind;
            if (data.baseline_date !== undefined) p.baselineDate = data.baseline_date;
            if (data.environment !== undefined) p.environment = data.environment;
            if (data.hemisphere !== undefined) p.hemisphere = data.hemisphere;
            if (data.predicted_flower_min_days !== undefined) p.predictedFlowerMinDays = data.predicted_flower_min_days;
            if (data.predicted_flower_max_days !== undefined) p.predictedFlowerMaxDays = data.predicted_flower_max_days;
            if (data.predicted_harvest_start !== undefined) p.predictedHarvestStart = data.predicted_harvest_start;
            if (data.predicted_harvest_end !== undefined) p.predictedHarvestEnd = data.predicted_harvest_end;
            if (data.schedule_confidence !== undefined) p.scheduleConfidence = data.schedule_confidence;
            if (data.yield_unit !== undefined) p.yieldUnit = data.yield_unit;
            if (data.yield_min !== undefined) p.yieldMin = data.yield_min;
            if (data.yield_max !== undefined) p.yieldMax = data.yield_max;
            if (data.yield_category !== undefined) p.yieldCategory = data.yield_category;
            if (updateData.updated_at) p.updatedAt = updateData.updated_at;
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
