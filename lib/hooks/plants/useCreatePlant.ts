import { useAuth } from '../../contexts/AuthProvider';
import { useDatabase } from '../../contexts/DatabaseProvider';
import { Plant, GrowthStage } from '../../types';
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
    };

    // Create in Supabase
    const result = await mutate(plantData);

    // If successful and we have a database instance, also create locally
    if (result.data && database.database) {
      try {
        await database.database.write(async () => {
          const plantCollection = database.database.get('plants');
          await plantCollection.create((plant: any) => {
            Object.assign(plant, {
              id: result.data!.id,
              name: result.data!.name,
              strain: result.data!.strain,
              strain_id: result.data!.strain_id,
              growth_stage: result.data!.growth_stage,
              planted_date: result.data!.planted_date,
              location_id: result.data!.location_id,
              notes: result.data!.notes,
              is_public: result.data!.is_public,
              is_auto_flower: result.data!.is_auto_flower,
              is_feminized: result.data!.is_feminized,
              image_url: result.data!.image_url,
              user_id: result.data!.user_id,
              created_at: result.data!.created_at,
              updated_at: result.data!.updated_at,
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
