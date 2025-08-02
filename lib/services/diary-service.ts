import supabase from '../supabase';
import { DiaryEntry, DiaryEntryType } from '../types/diary';

/**
 * Adapts a database diary entry to our frontend DiaryEntry model
 */
export function adaptDiaryEntryFromDB(dbEntry: Record<string, unknown>): DiaryEntry {
  return {
    id: dbEntry.id as string,
    plant_id: dbEntry.plant_id as string,
    user_id: dbEntry.user_id as string,
    entry_date: (dbEntry.entry_date || dbEntry.created_at) as string,
    entry_type: dbEntry.entry_type as DiaryEntryType,
    title: dbEntry.title as string | undefined,
    content: dbEntry.content as string,
    image_url: dbEntry.image_url as string | undefined,
    metrics: dbEntry.metrics ? JSON.parse(dbEntry.metrics as string) : undefined,
    is_public: dbEntry.is_public as boolean,
    created_at: dbEntry.created_at as string,
    updated_at: dbEntry.updated_at as string | undefined,
  };
}

/**
 * Fetches diary entries for a plant
 */
export async function getPlantDiaryEntries(plantId: string): Promise<DiaryEntry[]> {
  try {
    const { data, error } = await supabase
      .from('diary_entries')
      .select('*')
      .eq('plant_id', plantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(adaptDiaryEntryFromDB);
  } catch (error) {
    console.error('Error fetching diary entries:', error);
    return [];
  }
}

/**
 * Creates a new diary entry
 */
export async function createDiaryEntry(
  entry: Omit<DiaryEntry, 'id' | 'created_at' | 'updated_at'>
): Promise<DiaryEntry | null> {
  try {
    const { data, error } = await supabase
      .from('diary_entries')
      .insert([
        {
          plant_id: entry.plant_id,
          user_id: entry.user_id,
          entry_type: entry.entry_type,
          title: entry.title,
          content: entry.content,
          image_url: entry.image_url,
          metrics: entry.metrics,
          is_public: entry.is_public,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return adaptDiaryEntryFromDB(data);
  } catch (error) {
    console.error('Error creating diary entry:', error);
    return null;
  }
}

/**
 * Updates a diary entry
 */
export async function updateDiaryEntry(
  entryId: string,
  updates: Partial<Omit<DiaryEntry, 'id' | 'created_at' | 'updated_at'>>
): Promise<DiaryEntry | null> {
  try {
    const dbUpdates: Record<string, unknown> = {};

    if (updates.title) dbUpdates.title = updates.title;
    if (updates.content) dbUpdates.content = updates.content;
    if (updates.entry_type) dbUpdates.entry_type = updates.entry_type;
    if (updates.image_url) dbUpdates.image_url = updates.image_url;
    if (updates.metrics) dbUpdates.metrics = updates.metrics;
    if (updates.is_public) dbUpdates.is_public = updates.is_public;

    const { data, error } = await supabase
      .from('diary_entries')
      .update(dbUpdates)
      .eq('id', entryId)
      .select()
      .single();

    if (error) throw error;
    return adaptDiaryEntryFromDB(data);
  } catch (error) {
    console.error('Error updating diary entry:', error);
    return null;
  }
}

/**
 * Deletes a diary entry
 */
export async function deleteDiaryEntry(entryId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('diary_entries').delete().eq('id', entryId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting diary entry:', error);
    return false;
  }
}

/**
 * Gets diary entries by date range
 */
export async function getDiaryEntriesByDateRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<DiaryEntry[]> {
  try {
    const { data, error } = await supabase
      .from('diary_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(adaptDiaryEntryFromDB);
  } catch (error) {
    console.error('Error fetching diary entries by date range:', error);
    return [];
  }
}
