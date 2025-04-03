import { useAuth } from '../../contexts/AuthProvider';
import { useDatabase } from '../../contexts/DatabaseProvider';
import { DiaryEntry, DiaryEntryType } from '../../types';
import { useSupabaseMutation } from '../supabase';

/**
 * Data required to create a new diary entry
 */
export interface CreateDiaryEntryData {
  plant_id: string;
  entry_type: DiaryEntryType;
  title?: string;
  content: string;
  entry_date: string;
  image_url?: string;
  metrics?: {
    water_amount?: number;
    nutrient_amount?: number;
    ph_level?: number;
    temperature?: number;
    humidity?: number;
    light_hours?: number;
    ppm?: number;
  };
  is_public?: boolean;
  tags?: string[];
}

/**
 * Hook for creating a new diary entry
 */
export function useCreateDiaryEntry() {
  const { user } = useAuth();
  const database = useDatabase();

  // Use the base mutation hook
  const { mutate, loading, error, reset } = useSupabaseMutation<DiaryEntry>({
    table: 'diary_entries',
    type: 'INSERT',
    returning: 'representation',
  });

  /**
   * Create a new diary entry in both Supabase and WatermelonDB
   */
  const createDiaryEntry = async (data: CreateDiaryEntryData) => {
    if (!user) {
      throw new Error('User must be authenticated to create a diary entry');
    }

    // Convert metrics object to string for storage if needed - These are unused now
    // const metricsJson = data.metrics ? JSON.stringify(data.metrics) : undefined;
    // const tagsJson = data.tags ? JSON.stringify(data.tags) : undefined;

    // Prepare the entry data with user ID
    const entryData: Omit<DiaryEntry, 'id' | 'created_at'> = {
      plant_id: data.plant_id,
      user_id: user.id,
      entry_type: data.entry_type,
      title: data.title,
      content: data.content,
      entry_date: data.entry_date,
      image_url: data.image_url,
      metrics: data.metrics,
      is_public: data.is_public || false,
      updated_at: new Date().toISOString(),
    };

    // Create in Supabase
    const result = await mutate(entryData);

    // If successful and we have a database instance, also create locally
    if (result.data && database.database) {
      try {
        await database.database.write(async () => {
          const entryCollection = database.database.get('diary_entries');
          await entryCollection.create((entry: any) => {
            Object.assign(entry, {
              id: result.data!.id,
              plant_id: result.data!.plant_id,
              user_id: result.data!.user_id,
              entry_type: result.data!.entry_type,
              title: result.data!.title,
              content: result.data!.content,
              entry_date: result.data!.entry_date,
              image_url: result.data!.image_url,
              metrics: result.data!.metrics,
              is_public: result.data!.is_public,
              created_at: result.data!.created_at,
              updated_at: result.data!.updated_at,
            });
          });
        });
      } catch (e) {
        console.error('Error creating diary entry in local database:', e);
      }
    }

    return result;
  };

  return {
    createDiaryEntry,
    loading,
    error,
    reset,
  };
}
