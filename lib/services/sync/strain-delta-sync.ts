import supabase from '@/lib/supabase';
import database from '@/lib/database/database';
import { strainLocalService } from '@/lib/services';
import { Strain } from '@/lib/models/Strain';
import { Q } from '@nozbe/watermelondb';

const LAST_SYNC_KEY = 'strains_last_sync';

async function getLastSyncTimestamp(): Promise<string | null> {
  try {
    return (await database.adapter.getLocal(LAST_SYNC_KEY)) as string | null;
  } catch {
    return null;
  }
}

async function setLastSyncTimestamp(ts: string) {
  try {
    await database.adapter.setLocal(LAST_SYNC_KEY, ts);
  } catch (err) {
    console.warn('[StrainDeltaSync] Failed to persist last sync timestamp', err);
  }
}

// Map Supabase row to Watermelon upsert shape (keys must match Strain model props)
function mapRowToModel(row: Record<string, unknown>): Partial<Strain & { id: string }> {
  return {
    id: row.id, // Supabase UUID becomes WDB id
    apiId: row.api_id,
    name: row.name,
    type: row.type,
    description: row.description,
    thcPercentage: row.thc_percentage,
    cbdPercentage: row.cbd_percentage,
    floweringTime: row.flowering_time,
    growDifficulty: row.grow_difficulty,
    effects: row.effects ? JSON.stringify(row.effects) : undefined,
    flavors: row.flavors ? JSON.stringify(row.flavors) : undefined,
    createdAt: row.created_at ? new Date(row.created_at as string) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at as string) : undefined,
  } as Partial<Strain & { id: string }>;
}

export async function deltaSyncStrains() {
  const lastSync = await getLastSyncTimestamp();

  // Pull changed/created strains
  let query = supabase.from('strains').select('*');
  if (lastSync) {
    query = query.gt('updated_at', lastSync);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[StrainDeltaSync] Supabase fetch error', error);
    return;
  }

  const rows = data ?? [];
  if (rows.length) {
    try {
      // Wrap upsert and delete operations in a transaction for atomicity
      await database.write(async () => {
        const upserts = rows
          .filter((row) => !row.is_deleted)
          .map(mapRowToModel);
        
        if (upserts.length) {
          await strainLocalService.upsertStrains(upserts);
        }

        const deletedIds = rows.filter((row) => row.is_deleted).map((r) => r.id);
        if (deletedIds.length) {
          await strainLocalService.deleteStrains(deletedIds);
        }
      });

      // Only update sync timestamp if transaction succeeded
      const latestTimestamp = Math.max(
        ...rows.map((row) => new Date(row.updated_at as string).getTime())
      );
      const newTs = new Date(latestTimestamp).toISOString();
      await setLastSyncTimestamp(newTs);
    } catch (error) {
      console.error('[StrainDeltaSync] Transaction failed, rolling back changes', error);
      throw error; // Re-throw to allow caller to handle the error
    }
  }
} 