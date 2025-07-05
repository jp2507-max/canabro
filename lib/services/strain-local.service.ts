import database from '@/lib/database/database';
import { Strain } from '@/lib/models/Strain';
import { Q, Collection } from '@nozbe/watermelondb';
import { Strain as StrainDTO } from '@/lib/types/strain';

// Helper to map Watermelon Strain model into frontend Strain type.
function adaptStrainFromModel(model: Strain): StrainDTO {
  return {
    id: model.id,
    api_id: model.apiId,
    name: model.name,
    type: model.type,
    description: model.description,
    thc_percentage: model.thcPercentage ?? undefined,
    cbd_percentage: model.cbdPercentage ?? undefined,
    flowering_time: model.floweringTime ?? undefined,
    growDifficulty: model.growDifficulty ?? undefined,
    effects: model.getEffects(),
    flavors: model.getFlavors(),
    created_at: model.createdAt?.toISOString(),
    updated_at: model.updatedAt?.toISOString(),
  } as StrainDTO;
}

/**
 * StrainLocalService
 *
 * Provides offline-first CRUD utilities for the `strains` WatermelonDB table.
 * All reads are performed against the local database for maximum speed and
 * resiliency. Remote updates should be performed via `StrainSyncService` and
 * then hydrated back into the local DB through the sync layer.
 */
class StrainLocalService {
  private readonly collection: Collection<Strain>;

  constructor() {
    this.collection = database.collections.get<Strain>('strains');
  }

  /**
   * Fetch all strains ordered alphabetically. Accepts optional limit/offset
   * for pagination so it can be wired into FlashList incremental loading.
   */
  async getStrains({ limit, offset }: { limit?: number; offset?: number } = {}): Promise<StrainDTO[]> {
    let query = this.collection.query(Q.sortBy('name', Q.asc));

    if (typeof offset === 'number') {
      query = query.extend(Q.skip(offset));
    }
    if (typeof limit === 'number') {
      query = query.extend(Q.take(limit));
    }

    const models = await query.fetch();
    return models.map(adaptStrainFromModel);
  }

  /**
   * Convenience wrapper around `getStrains` that always paginates using the
   * default page size (20). This is useful for infinite scrolling UIs.
   */
  async getPaginatedStrains(page: number, pageSize: number = 20): Promise<StrainDTO[]> {
    const offset = page * pageSize;
    return this.getStrains({ limit: pageSize, offset });
  }

  /**
   * Retrieve a single strain by its primary key.
   */
  async getStrainById(id: string): Promise<StrainDTO | null> {
    try {
      const model = await this.collection.find(id);
      return adaptStrainFromModel(model);
    } catch {
      return null;
    }
  }

  /**
   * Performs a naive full-text search on the `name` column. For more
   * sophisticated searching we could persist a pre-generated lowercase field
   * or leverage SQLite FTS, but this suffices for moderate data sets.
   */
  async searchStrains(term: string, limit = 30): Promise<StrainDTO[]> {
    const models = await this.collection
      .query(Q.where('name', Q.like(`%${term.toLowerCase()}%`)), Q.take(limit))
      .fetch();
    return models.map(adaptStrainFromModel);
  }

  /**
   * Comprehensive filtering for strains with pagination support.
   * Matches the filtering capabilities of the online strain service.
   */
  async getFilteredStrains({
    search,
    species,
    effect,
    flavor,
    minThc,
    maxThc,
    limit,
    offset
  }: {
    search?: string;
    species?: string;
    effect?: string;
    flavor?: string;
    minThc?: number;
    maxThc?: number;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ strains: StrainDTO[]; total: number; hasMore: boolean }> {
    // Build where conditions
    const whereConditions = [];

    // Apply search filter (name contains)
    if (search && search.trim()) {
      whereConditions.push(Q.where('name', Q.like(`%${search.toLowerCase()}%`)));
    }

    // Apply species filter (type equals)
    if (species && species.trim()) {
      whereConditions.push(Q.where('type', Q.like(`%${species.toLowerCase()}%`)));
    }

    // Apply THC range filters
    if (typeof minThc === 'number') {
      whereConditions.push(Q.where('thc_percentage', Q.gte(minThc)));
    }
    if (typeof maxThc === 'number') {
      whereConditions.push(Q.where('thc_percentage', Q.lte(maxThc)));
    }

    // Fetch all matching records first (we need to filter effects/flavors in memory)
    const query = this.collection.query(
      ...whereConditions,
      Q.sortBy('name', Q.asc)
    );
    const allModels = await query.fetch();

    // Filter by effects and flavors in memory (since they're JSON strings)
    let filteredModels = allModels;

    if (effect && effect.trim()) {
      filteredModels = filteredModels.filter(model => {
        const effects = model.getEffects();
        return effects.some(e => e.toLowerCase().includes(effect.toLowerCase()));
      });
    }

    if (flavor && flavor.trim()) {
      filteredModels = filteredModels.filter(model => {
        const flavors = model.getFlavors();
        return flavors.some(f => f.toLowerCase().includes(flavor.toLowerCase()));
      });
    }

    // Calculate total count before pagination
    const total = filteredModels.length;

    // Apply pagination
    const startIndex = offset || 0;
    const endIndex = limit ? startIndex + limit : filteredModels.length;
    const paginatedModels = filteredModels.slice(startIndex, endIndex);

    // Check if there are more items
    const hasMore = endIndex < total;

    return {
      strains: paginatedModels.map(adaptStrainFromModel),
      total,
      hasMore
    };
  }

  /**
   * Insert or update a batch of strains inside a single WatermelonDB batch for
   * maximum performance. Existing rows are matched by their Watermelon `id`.
   * If the strain does not exist it will be created.
   */
  async upsertStrains(strains: Partial<Strain & { id: string }>[]) {
    if (strains.length === 0) return;

    await database.write(async () => {
      // Build a lookup of existing records to minimize find calls
      const ids = strains.map((s) => s.id).filter(Boolean) as string[];
      const existingRecords = ids.length
        ? await this.collection.query(Q.where('id', Q.oneOf(ids))).fetch()
        : [];
      const existingMap = Object.fromEntries(existingRecords.map((r) => [r.id, r]));

      const ops = strains.map((raw) => {
        const { id, ...rest } = raw;
        if (id && existingMap[id]) {
          // Update path
          return existingMap[id].prepareUpdate((rec) => {
            Object.assign(rec, rest);
          });
        }
        // Create path – Watermelon will generate the primary key
        return this.collection.prepareCreate((rec) => {
          Object.assign(rec, raw);
        });
      });

      await database.batch(ops);
    });
  }

  /**
   * Delete strains that have been removed on the server side. Accepts an array
   * of Watermelon record IDs to remove.
   */
  async deleteStrains(ids: string[]) {
    if (ids.length === 0) return;

    await database.write(async () => {
      const records = await this.collection.query(Q.where('id', Q.oneOf(ids))).fetch();
      const batch = records.map((rec) => rec.prepareDestroyPermanently());
      await database.batch(batch);
    });
  }
}

export const strainLocalService = new StrainLocalService();
export default StrainLocalService; 