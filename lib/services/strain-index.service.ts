import { MMKV } from 'react-native-mmkv';
import { log } from '../utils/logger';
import database from '../database/database';
import { Strain as WDBStrainModel } from '../models/Strain';
import { getAllStrainsFromWatermelonDB } from './sync/strain-sync.service';
import type { RawStrainApiResponse } from '../types/weed-db';

type IndexedStrain = {
  api_id: string;
  name: string;
  type: string | null;
  growDifficulty?: string | null;
};

type StrainIndex = {
  // prefix (lowercased, normalized) → array of compact strain items
  byPrefix: Record<string, IndexedStrain[]>;
  // total entries
  count: number;
  // version to allow future migrations
  version: number;
  // last updated timestamp (ms)
  updatedAt: number;
};

const INDEX_VERSION = 1;
const INDEX_PREFIX_LEN = 3; // 3-char prefix buckets balance speed and memory for ~2k items
const MMKV_ID = 'strain-index-v1';
const INDEX_KEY = 'strainIndex';

const store = new MMKV({ id: MMKV_ID });

function normalizeName(value: string): string {
  return (value || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s]/g, '').trim();
}

function prefixOf(name: string): string {
  const n = normalizeName(name).replace(/\s+/g, '');
  return n.slice(0, INDEX_PREFIX_LEN);
}

function makeRawFromIndexed(item: IndexedStrain): RawStrainApiResponse {
  return {
    api_id: item.api_id,
    name: item.name,
    type: item.type,
    growDifficulty: item.growDifficulty ?? null,
    _source: 'local',
  } as RawStrainApiResponse;
}

export class StrainIndexService {
  private static instance: StrainIndexService;
  private index: StrainIndex | null = null;
  private building = false;
  private buildAttempts = 0;
  private lastBuildError: Error | null = null;
  private unsubscribeFn: (() => void) | null = null;

  static getInstance(): StrainIndexService {
    if (!StrainIndexService.instance) {
      StrainIndexService.instance = new StrainIndexService();
    }
    return StrainIndexService.instance;
  }

  /** Load index from MMKV if present and valid */
  private loadIndexFromStorage(): void {
    if (this.index) return;
    try {
      const raw = store.getString(INDEX_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StrainIndex;
      if (parsed && parsed.version === INDEX_VERSION && parsed.byPrefix) {
        this.index = parsed;
      }
    } catch (error) {
      log.warn('[StrainIndex] Failed to load index from storage', error);
    }
  }

  private saveIndexToStorage(): void {
    if (!this.index) return;
    try {
      store.set(INDEX_KEY, JSON.stringify(this.index));
    } catch (error) {
      log.warn('[StrainIndex] Failed to persist index', error);
    }
  }

  /**
   * Build an index map from a list of WatermelonDB strains with duplicate api_id filtering.
   */
  private buildIndexFromStrains(
    wdbStrains: WDBStrainModel[]
  ): { byPrefix: Record<string, IndexedStrain[]>; duplicateSkips: number } {
    const byPrefix: Record<string, IndexedStrain[]> = {};
    const seenApiIds = new Set<string>();
    let duplicateSkips = 0;

    for (const s of wdbStrains) {
      // Prefer typed properties; fall back to legacy shape api_id if present
      const legacy = s as WDBStrainModel & { api_id?: string };
      const rawApiId = s.apiId ?? legacy.api_id; // keep compatibility with both shapes
      const name = s.name ?? '';
      if (!rawApiId || !name) continue;

      const apiId = String(rawApiId);
      if (seenApiIds.has(apiId)) {
        duplicateSkips++;
        log.debug('[StrainIndex] Skipping duplicate api_id', { api_id: apiId, name });
        continue;
      }
      seenApiIds.add(apiId);

      const item: IndexedStrain = {
        api_id: apiId,
        name: String(name),
        type: (s.type ?? null) as string | null,
        growDifficulty: (s.growDifficulty ?? null) as string | null,
      };
      const p = prefixOf(item.name);
      if (!p) continue;
      if (!byPrefix[p]) byPrefix[p] = [];
      byPrefix[p].push(item);
    }

    return { byPrefix, duplicateSkips };
  }

  /** Build index from WatermelonDB; safe to call multiple times */
  async buildIndex(): Promise<void> {
    if (this.building) return;
    this.building = true;
    this.buildAttempts++;
    try {
      log.info('[StrainIndex] Building local strain index from WatermelonDB...');
      const wdbStrains = await getAllStrainsFromWatermelonDB();
      const { byPrefix, duplicateSkips } = this.buildIndexFromStrains(wdbStrains);

      this.index = {
        byPrefix,
        count: Object.values(byPrefix).reduce((acc, arr) => acc + arr.length, 0),
        version: INDEX_VERSION,
        updatedAt: Date.now(),
      };
      this.saveIndexToStorage();
      log.info('[StrainIndex] Build complete', { entries: this.index.count, skippedDuplicates: duplicateSkips });
      this.buildAttempts = 0;
      this.lastBuildError = null;
    } catch (error) {
      log.error('[StrainIndex] Build failed', error);
      this.lastBuildError = error as Error;
      // Retry with exponential backoff if under attempt limit
      if (this.buildAttempts < 3) {
        const delayMs = Math.pow(2, this.buildAttempts) * 1000;
        setTimeout(() => {
          this.buildIndex().catch((e) => log.warn('[StrainIndex] Retry build failed', e));
        }, delayMs);
      }
    } finally {
      this.building = false;
    }
  }

  /** Ensure index exists and is reasonably fresh; triggers background rebuild when stale */
  async ensureFresh(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<void> {
    this.loadIndexFromStorage();
    const stale = !this.index || (Date.now() - (this.index.updatedAt || 0) > maxAgeMs);
    if (!this.index || stale) {
      // Build synchronously on first use if missing; otherwise refresh in background
      if (!this.index) {
        await this.buildIndex();
      } else {
        // Background refresh without blocking callers
        setTimeout(() => {
          this.buildIndex().catch((e) => log.warn('[StrainIndex] Background refresh failed', e));
        }, 0);
      }
    }
  }

  /** Fast local search over the index; returns minimal RawStrainApiResponse items */
  async search(query: string, limit: number = 10): Promise<RawStrainApiResponse[]> {
    if (!query || !query.trim()) return [];
    await this.ensureFresh();
    this.loadIndexFromStorage();
    if (!this.index) return [];

    const qNorm = normalizeName(query);
    const p = qNorm.replace(/\s+/g, '').slice(0, INDEX_PREFIX_LEN);
    const bucket = this.index.byPrefix[p] || [];

    // Prioritize prefix matches, then substring matches within the bucket
    const results: IndexedStrain[] = [];
    for (const item of bucket) {
      const n = normalizeName(item.name);
      if (n.startsWith(qNorm)) {
        results.push(item);
      }
      if (results.length >= limit) break;
    }
    if (results.length < limit) {
      for (const item of bucket) {
        const n = normalizeName(item.name);
        if (!n.startsWith(qNorm) && n.includes(qNorm)) {
          results.push(item);
        }
        if (results.length >= limit) break;
      }
    }

    return results.slice(0, limit).map(makeRawFromIndexed);
  }

  /** Subscribe to WatermelonDB changes and keep index fresh incrementally */
  startAutoSync(): () => void {
    // Avoid duplicate subscriptions
    if (this.unsubscribeFn) return this.unsubscribeFn;

    try {
      const collection = database.collections.get<WDBStrainModel>('strains');
      const sub = collection
        .query()
        .observe()
        .subscribe({
          next: (records: WDBStrainModel[]) => {
            try {
              const { byPrefix, duplicateSkips } = this.buildIndexFromStrains(records);
              this.index = {
                byPrefix,
                count: Object.values(byPrefix).reduce((acc, arr) => acc + arr.length, 0),
                version: INDEX_VERSION,
                updatedAt: Date.now(),
              };
              this.saveIndexToStorage();
              if (duplicateSkips > 0) {
                log.debug('[StrainIndex] AutoSync skipped duplicate api_id entries', { skippedDuplicates: duplicateSkips });
              }
            } catch (e) {
              log.warn('[StrainIndex] Failed to update index from change set', e);
            }
          },
          error: (e) => log.warn('[StrainIndex] Observe subscription error', e),
        });

      this.unsubscribeFn = () => {
        try {
          sub.unsubscribe();
        } catch (_err) {
          // noop
        }
        this.unsubscribeFn = null;
      };

      log.info('[StrainIndex] AutoSync subscription started');
      return this.unsubscribeFn;
    } catch (error) {
      log.warn('[StrainIndex] Failed to start AutoSync subscription', error);
      return () => {};
    }
  }

  /** Stats for diagnostics */
  getStats(): { count: number; updatedAt: number | null; version: number } {
    this.loadIndexFromStorage();
    if (!this.index) return { count: 0, updatedAt: null, version: INDEX_VERSION };
    return { count: this.index.count, updatedAt: this.index.updatedAt, version: this.index.version };
  }

  /** Build diagnostics */
  getBuildAttempts(): number {
    return this.buildAttempts;
  }

  getLastBuildError(): Error | null {
    return this.lastBuildError;
  }

  isBuilding(): boolean {
    return this.building;
  }
}

// Singleton export
export const strainIndexService = StrainIndexService.getInstance();


