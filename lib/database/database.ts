import { Database } from '@nozbe/watermelondb';
import { synchronize } from '@nozbe/watermelondb/sync';
import { supabase } from '../supabase';
import { plantSchema } from './schema';
import { Plant } from '../models/Plant';
import { DiaryEntry } from '../models/DiaryEntry';
import { Profile } from '../models/Profile';

// Create the database
const database = new Database({
  adapter: {
    schema: plantSchema,
  },
  modelClasses: [
    Plant,
    DiaryEntry,
    Profile,
  ],
});

// Function to synchronize local database with Supabase
export async function synchronizeWithSupabase() {
  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt }) => {
      const { data: plants, error: plantsError } = await supabase
        .from('plants')
        .select('*')
        .gt('updated_at', lastPulledAt ? new Date(lastPulledAt).toISOString() : '');

      const { data: diaryEntries, error: diaryError } = await supabase
        .from('diary_entries')
        .select('*')
        .gt('updated_at', lastPulledAt ? new Date(lastPulledAt).toISOString() : '');

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .gt('updated_at', lastPulledAt ? new Date(lastPulledAt).toISOString() : '');

      if (plantsError || diaryError || profilesError) {
        console.error('Error pulling changes:', plantsError || diaryError || profilesError);
        return { changes: { plants: [], diary_entries: [], profiles: [] }, timestamp: Date.now() };
      }

      return {
        changes: {
          plants: plants || [],
          diary_entries: diaryEntries || [],
          profiles: profiles || [],
        },
        timestamp: Date.now(),
      };
    },
    pushChanges: async ({ changes }) => {
      // Handle pushing local changes to Supabase
      if (changes.plants.length > 0) {
        const { error } = await supabase.from('plants').upsert(changes.plants);
        if (error) console.error('Error pushing plant changes:', error);
      }

      if (changes.diary_entries.length > 0) {
        const { error } = await supabase.from('diary_entries').upsert(changes.diary_entries);
        if (error) console.error('Error pushing diary entry changes:', error);
      }

      if (changes.profiles.length > 0) {
        const { error } = await supabase.from('profiles').upsert(changes.profiles);
        if (error) console.error('Error pushing profile changes:', error);
      }
    },
  });
}

export default database;
