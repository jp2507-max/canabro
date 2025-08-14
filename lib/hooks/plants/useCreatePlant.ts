
import { useAuth } from '../../contexts/AuthProvider';
import { useDatabase } from '../../contexts/DatabaseProvider';
import { Plant, GrowthStage } from '../../types';
import { PlantType, BaselineKind, Environment, Hemisphere, YieldUnit, YieldCategory } from '../../types/plant';
import { useSupabaseMutation } from '../supabase';

/**
 * Data required to create a new plant
 */
export interface CreatePlantData {
  name: string;
  strain: string;
  strain_id?: string;
  growth_stage: GrowthStage;
  planted_date: string;
  location_id?: string;
  notes?: string;
  is_public?: boolean;
  is_auto_flower?: boolean;
  is_feminized?: boolean;
  image_url?: string;
  // v35 migration fields - normalized strain-based scheduling
  plant_type?: PlantType;
  baseline_kind?: BaselineKind;
  baseline_date?: string;
  environment?: Environment;
  hemisphere?: Hemisphere;
  predicted_flower_min_days?: number;
  predicted_flower_max_days?: number;
  predicted_harvest_start?: string;
  predicted_harvest_end?: string;
  schedule_confidence?: number;
  yield_unit?: YieldUnit;
  yield_min?: number;
  yield_max?: number;
  yield_category?: YieldCategory;
}

/**
 * Hook for creating a new plant
 */
export function useCreatePlant() {
  const { user } = useAuth();
  const database = useDatabase();

  // Use the base mutation hook
  const { mutate, loading, error, reset } = useSupabaseMutation<Plant>({
    table: 'plants',
    type: 'INSERT',
    returning: 'representation',
  });

  /**
   * Create a new plant in both Supabase and WatermelonDB
   */
  const createPlant = async (data: CreatePlantData) => {
    if (!user) {
      throw new Error('User must be authenticated to create a plant');
    }

    // Prepare the plant data with user ID
    const plantData: Omit<Plant, 'id' | 'created_at'> = {
      name: data.name,
      strain: data.strain,
      strain_id: data.strain_id,
      growth_stage: data.growth_stage,
      planted_date: data.planted_date,
      location_id: data.location_id,
      notes: data.notes,
      is_public: data.is_public,
      is_auto_flower: data.is_auto_flower,
      is_feminized: data.is_feminized,
      image_url: data.image_url,
      user_id: user.id,
      updated_at: new Date().toISOString(),
      // v35 migration fields
      plant_type: data.plant_type,
      baseline_kind: data.baseline_kind,
      baseline_date: data.baseline_date,
      environment: data.environment,
      hemisphere: data.hemisphere,
      predicted_flower_min_days: data.predicted_flower_min_days,
      predicted_flower_max_days: data.predicted_flower_max_days,
      predicted_harvest_start: data.predicted_harvest_start,
      predicted_harvest_end: data.predicted_harvest_end,
      schedule_confidence: data.schedule_confidence,
      yield_unit: data.yield_unit,
      yield_min: data.yield_min,
      yield_max: data.yield_max,
      yield_category: data.yield_category,
    };

    // Create in Supabase
    const result = await mutate(plantData);

    // If successful and we have a database instance, also create locally
    if (result.data && database.database) {
      // --- DEBUG LOG ---
      console.log('[useCreatePlant] Supabase result ID:', result.data?.id);
      // --- END DEBUG LOG ---
      try {
        // --- DEBUG LOG --- Add log *before* the write operation
        console.log('[useCreatePlant] Supabase result ID before local create:', result.data?.id);
        // --- END DEBUG LOG ---
        await database.database.write(async () => {
          const plantCollection = database.database.get('plants');
          await plantCollection.create((plant: any) => {
            // Set ID first using _raw.id for WatermelonDB
            plant._raw.id = result.data!.id;
            // Assign camelCase properties to match model decorators
            Object.assign(plant, {
              name: result.data!.name,
              strain: result.data!.strain,
              strainId: result.data!.strain_id,
              growthStage: result.data!.growth_stage,
              plantedDate: result.data!.planted_date,
              locationId: result.data!.location_id,
              notes: result.data!.notes,
              isAutoFlower: result.data!.is_auto_flower,
              isFeminized: result.data!.is_feminized,
              imageUrl: result.data!.image_url,
              userId: result.data!.user_id,
              createdAt: result.data!.created_at,
              updatedAt: result.data!.updated_at,
              // v35 migration fields - camelCase
              plantType: result.data!.plant_type,
              baselineKind: result.data!.baseline_kind,
              baselineDate: result.data!.baseline_date,
              environment: result.data!.environment,
              hemisphere: result.data!.hemisphere,
              predictedFlowerMinDays: result.data!.predicted_flower_min_days,
              predictedFlowerMaxDays: result.data!.predicted_flower_max_days,
              predictedHarvestStart: result.data!.predicted_harvest_start,
              predictedHarvestEnd: result.data!.predicted_harvest_end,
              scheduleConfidence: result.data!.schedule_confidence,
              yieldUnit: result.data!.yield_unit,
              yieldMin: result.data!.yield_min,
              yieldMax: result.data!.yield_max,
              yieldCategory: result.data!.yield_category,
            });
          });
        });
      } catch (e) {
        console.error('Error creating plant in local database:', e);
      }
    }

    return result;
  };

  return {
    createPlant,
    loading,
    error,
    reset,
  };
}
