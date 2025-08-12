import {
  searchStrainsInWatermelonDB,
  searchStrainsInSupabase,
  fetchStrainsFromApiByQuery,
  convertWdbStrainToRawApi,
  convertSupabaseStrainToRawApi,
} from './sync/strain-sync.service';
import { strainIndexService } from './strain-index.service';
import { Strain as WDBStrainModel } from '../models/Strain';
import { SupabaseStrain } from '../types/supabase';
import { RawStrainApiResponse } from '../types/weed-db';
import { log } from '../utils/logger';

interface SearchResult {
  strains: RawStrainApiResponse[];
  sources: {
    local: number;
    supabase: number;
    external: number;
  };
  hasMore: boolean;
}

/**
 * Intelligent strain search that balances cost optimization with user confidence
 *
 * Strategy:
 * - Short queries (1-3 chars): Show breadth by including external API results
 * - Long queries (4+ chars): Prioritize local/cached results for speed and cost
 */
export async function searchStrainsIntelligent(
  query: string,
  limit: number = 10
): Promise<SearchResult> {
  if (!query.trim()) {
    return { strains: [], sources: { local: 0, supabase: 0, external: 0 }, hasMore: false };
  }

  // Validate and sanitize limit
  const validLimit = Math.max(1, Math.min(limit, 100)); // Ensure limit is between 1 and 100

  const trimmedQuery = query.trim();
  const isShortQuery = trimmedQuery.length <= 3;

  log.info(
    `[StrainSearchService] Searching for "${trimmedQuery}" (${isShortQuery ? 'short' : 'long'} query)`
  );

  const foundApiIds = new Set<string>();
  const sources = { local: 0, supabase: 0, external: 0 };

  if (isShortQuery) {
    // For short queries: Show breadth by including external API results
    // This ensures users see the app has comprehensive data
    return await searchWithBreadthFirst(trimmedQuery, validLimit, sources, foundApiIds);
  } else {
    // For longer queries: Prioritize local/cached results for speed and cost
    return await searchWithLocalFirst(trimmedQuery, validLimit, sources, foundApiIds);
  }
}

/**
 * Breadth-first search: Shows variety to build user confidence
 * Used for short queries (1-3 characters)
 */
async function searchWithBreadthFirst(
  query: string,
  limit: number,
  sources: { local: number; supabase: number; external: number },
  foundApiIds: Set<string>
): Promise<SearchResult> {
  const combinedResults: RawStrainApiResponse[] = [];
  // Split the limit: show some local + some external to demonstrate breadth
  const localLimit = Math.max(1, Math.floor(limit * 0.4)); // 40% local/supabase, minimum 1
  const externalLimit = limit - localLimit; // Remaining goes to external

  try {
    // 1. Get some local results first (fast)
    log.info(`[StrainSearchService] Fetching local results for short query "${query}"`);

    // A) Try indexed search for instant suggestions
    const indexed = await strainIndexService.search(query, localLimit).catch(() => []);
    indexed.forEach((s) => {
      if (s.api_id && !foundApiIds.has(s.api_id) && combinedResults.length < localLimit) {
        combinedResults.push(s);
        foundApiIds.add(s.api_id);
        sources.local++;
      }
    });

    // B) Top up with WatermelonDB exact/partial
    const wdbResults = await searchStrainsInWatermelonDB(query).catch((error) => {
      log.warn(`[StrainSearchService] WatermelonDB search failed:`, error);
      return [] as WDBStrainModel[];
    });

    // C) Search Supabase
    const supabaseResults = await searchStrainsInSupabase(query, localLimit).catch((error) => {
      log.warn(`[StrainSearchService] Supabase search failed:`, error);
      return [] as SupabaseStrain[];
    });
    // Add local results with dynamic quota allocation
    let remaining = localLimit - sources.local;
    wdbResults.slice(0, Math.max(0, remaining)).forEach((wdbStrain) => {
      // WatermelonDB model may expose either api_id or apiId depending on sync origin
      const apiId = (wdbStrain as Partial<{ api_id: string; apiId: string }>).api_id
        ?? (wdbStrain as Partial<{ api_id: string; apiId: string }>).apiId;
      if (apiId && !foundApiIds.has(apiId)) {
        const strain = convertWdbStrainToRawApi(wdbStrain);
        strain._source = 'local';
        combinedResults.push(strain);
        foundApiIds.add(apiId);
        sources.local++;
      }
    });

    // Top up with Supabase results using remaining quota
    remaining = localLimit - sources.local;
    if (remaining > 0) {
      supabaseResults.slice(0, remaining).forEach((sbStrain) => {
        if (sbStrain.api_id && !foundApiIds.has(sbStrain.api_id)) {
          const strain = convertSupabaseStrainToRawApi(sbStrain);
          strain._source = 'supabase';
          combinedResults.push(strain);
          foundApiIds.add(sbStrain.api_id);
          sources.supabase++;
        }
      });
    }

    // 2. ALWAYS get external results for short queries to show breadth
    log.info(
      `[StrainSearchService] Fetching external results for short query "${query}" to show breadth`
    );
    const externalResults = await fetchStrainsFromApiByQuery(query, externalLimit).catch(
      (error) => {
        log.warn(`[StrainSearchService] External API search failed:`, error);
        return [] as RawStrainApiResponse[];
      }
    );
    externalResults.forEach((apiStrain) => {
      if (
        apiStrain.api_id &&
        !foundApiIds.has(apiStrain.api_id) &&
        combinedResults.length < limit
      ) {
        apiStrain._source = 'external';
        combinedResults.push(apiStrain);
        foundApiIds.add(apiStrain.api_id);
        sources.external++;
      }
    });

    log.info(
      `[StrainSearchService] Breadth-first search completed: ${sources.local} local, ${sources.supabase} supabase, ${sources.external} external`
    );
    return {
      strains: combinedResults,
      sources,
      hasMore: externalLimit > 0 && externalResults.length === externalLimit, // Likely more available
    };
  } catch (error) {
    log.error(`[StrainSearchService] Error in breadth-first search:`, error);
    return { strains: combinedResults, sources, hasMore: false };
  }
}

/**
 * Local-first search: Optimizes for speed and cost
 * Used for longer queries (4+ characters)
 */
async function searchWithLocalFirst(
  query: string,
  limit: number,
  sources: { local: number; supabase: number; external: number },
  foundApiIds: Set<string>
): Promise<SearchResult> {
  const combinedResults: RawStrainApiResponse[] = [];

  try {
    // 1. Indexed search first for instant suggestions
    log.info(`[StrainSearchService] Searching local index for "${query}"`);
    const indexed = await strainIndexService.search(query, limit).catch(() => []);
    indexed.forEach((s) => {
      if (s.api_id && !foundApiIds.has(s.api_id) && combinedResults.length < limit) {
        combinedResults.push(s);
        foundApiIds.add(s.api_id);
        sources.local++;
      }
    });

    if (combinedResults.length >= limit) {
      return { strains: combinedResults.slice(0, limit), sources, hasMore: true };
    }

    // 2. Search local WatermelonDB next
    log.info(`[StrainSearchService] Searching WatermelonDB for "${query}"`);
    const wdbResults = await searchStrainsInWatermelonDB(query).catch((error) => {
      log.warn(`[StrainSearchService] WatermelonDB search failed:`, error);
      return [] as WDBStrainModel[];
    });
    wdbResults.forEach((wdbStrain) => {
      const apiId = (wdbStrain as Partial<{ api_id: string; apiId: string }>).api_id
        ?? (wdbStrain as Partial<{ api_id: string; apiId: string }>).apiId;
      if (apiId && !foundApiIds.has(apiId)) {
        const strain = convertWdbStrainToRawApi(wdbStrain);
        strain._source = 'local';
        combinedResults.push(strain);
        foundApiIds.add(apiId);
        sources.local++;
      }
    });

    if (combinedResults.length >= limit) {
      log.info(
        `[StrainSearchService] Local-first search satisfied with ${combinedResults.length} WatermelonDB results`
      );
      return {
        strains: combinedResults.slice(0, limit),
        sources,
        hasMore: wdbResults.length > limit,
      };
    }

    // 3. Search Supabase if needed
    const remaining = limit - combinedResults.length;
    log.info(`[StrainSearchService] Need ${remaining} more results, searching Supabase`);

    const supabaseResults = await searchStrainsInSupabase(query, remaining).catch((error) => {
      log.warn(`[StrainSearchService] Supabase search failed:`, error);
      return [] as SupabaseStrain[];
    });
    supabaseResults.forEach((sbStrain) => {
      if (sbStrain.api_id && !foundApiIds.has(sbStrain.api_id)) {
        const strain = convertSupabaseStrainToRawApi(sbStrain);
        strain._source = 'supabase';
        combinedResults.push(strain);
        foundApiIds.add(sbStrain.api_id);
        sources.supabase++;
      }
    });

    if (combinedResults.length >= limit) {
      log.info(
        `[StrainSearchService] Local-first search satisfied with ${combinedResults.length} local+Supabase results`
      );
      return { strains: combinedResults.slice(0, limit), sources, hasMore: true };
    }

    // 4. Only search external API if we still need more results
    const stillRemaining = limit - combinedResults.length;
    if (stillRemaining > 0) {
      log.info(`[StrainSearchService] Need ${stillRemaining} more results, searching external API`);
      const externalResults = await fetchStrainsFromApiByQuery(query, stillRemaining).catch(
        (error) => {
          log.warn(`[StrainSearchService] External API search failed:`, error);
          return [] as RawStrainApiResponse[];
        }
      );
      externalResults.forEach((apiStrain) => {
        if (apiStrain.api_id && !foundApiIds.has(apiStrain.api_id)) {
          apiStrain._source = 'external';
          combinedResults.push(apiStrain);
          foundApiIds.add(apiStrain.api_id);
          sources.external++;
        }
      });
    }

    log.info(
      `[StrainSearchService] Local-first search completed: ${sources.local} local, ${sources.supabase} supabase, ${sources.external} external`
    );

    return {
      strains: combinedResults,
      sources,
      hasMore: combinedResults.length === limit,
    };
  } catch (error) {
    log.error(`[StrainSearchService] Error in local-first search:`, error);
    return { strains: combinedResults, sources, hasMore: false };
  }
}
