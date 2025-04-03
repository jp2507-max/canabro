import { useDatabase } from '../../contexts/DatabaseProvider';
import { PlantMetrics } from '../../types';
import { useSupabaseMutation } from '../supabase';

/**
 * Data required to create plant metrics
 */
export interface CreatePlantMetricsData {
  plant_id: string;
  date: string;
  height: number;
  leaf_count?: number;
  node_count?: number;
  ph_level?: number;
  temperature?: number;
  humidity?: number;
  light_intensity?: number;
  water_amount?: number;
  nutrient_amount?: number;
}

/**
 * Hook for creating plant metrics
 */
export function useCreatePlantMetrics() {
  const database = useDatabase();

  // Use the base mutation hook
  const { mutate, loading, error, reset } = useSupabaseMutation<PlantMetrics>({
    table: 'plant_metrics',
    type: 'INSERT',
    returning: 'representation',
  });

  /**
   * Create plant metrics in both Supabase and WatermelonDB
   */
  const createPlantMetrics = async (data: CreatePlantMetricsData) => {
    // Prepare the metrics data
    const metricsData: Omit<PlantMetrics, 'id' | 'created_at'> = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    // Create in Supabase
    const result = await mutate(metricsData);

    // If successful and we have a database instance, also create locally
    if (result.data && database.database) {
      try {
        await database.database.write(async () => {
          const metricsCollection = database.database.get('plant_metrics');
          await metricsCollection.create((metrics: any) => {
            Object.assign(metrics, {
              id: result.data!.id,
              plant_id: result.data!.plant_id,
              date: result.data!.date,
              height: result.data!.height,
              leaf_count: result.data!.leaf_count,
              node_count: result.data!.node_count,
              ph_level: result.data!.ph_level,
              temperature: result.data!.temperature,
              humidity: result.data!.humidity,
              light_intensity: result.data!.light_intensity,
              water_amount: result.data!.water_amount,
              nutrient_amount: result.data!.nutrient_amount,
              created_at: result.data!.created_at,
              updated_at: result.data!.updated_at,
            });
          });
        });
      } catch (e) {
        console.error('Error creating plant metrics in local database:', e);
      }
    }

    return result;
  };

  return {
    createPlantMetrics,
    loading,
    error,
    reset,
  };
}
