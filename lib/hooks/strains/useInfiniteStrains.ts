import { useInfiniteQuery } from '@tanstack/react-query';
// Switched to WeedDbService so we fetch the full ~1k strains directly from the Weed DB API instead of our limited Supabase mirror.
import { WeedDbService } from '@/lib/services/weed-db.service';
import { strainLocalService } from '@/lib/services';
import NetInfo from '@react-native-community/netinfo';
import { ActiveFilters } from '@/components/strains/StrainFilterModal';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { Strain } from '@/lib/types/strain';
import { Strain as WeedDbStrain } from '@/lib/types/weed-db';
import { generateStableFallbackKey, isValidId } from '@/lib/utils/string-utils';

interface UseInfiniteStrainsParams {
  search?: string;
  species?: string; // fallback species when activeFilters.species is null
  limit?: number;
  enabled?: boolean;
  activeFilters?: ActiveFilters;
}

/**
 * Interface representing the paginated response structure for strain queries
 */
interface StrainQueryResponse {
  strains: Strain[];
  total: number;
  hasMore: boolean;
}

// Constants for pagination
const MAX_SEARCH_RESULTS_PER_PAGE = 100; // Maximum results per page to prevent memory issues
const MIN_SEARCH_RESULTS_PER_PAGE = 10; // Minimum results per page for good UX

/**
 * Maps WeedDB strain format to app strain format
 * Ensures all strains have valid IDs to prevent key extraction issues
 */
function mapWeedDbStrainToAppStrain(weedDbStrain: WeedDbStrain): Strain {
  // Ensure we have a valid ID, generate a stable fallback if needed
  const primaryId = weedDbStrain.id ?? weedDbStrain.api_id ?? weedDbStrain.originalId;
  const validId = isValidId(primaryId) ? String(primaryId) : null;
  const finalId = validId || generateStableFallbackKey(
    weedDbStrain.name,
    weedDbStrain.type,
    weedDbStrain.genetics,
    'strain'
  );

  return {
    ...weedDbStrain,
    id: finalId, // Ensure ID is always valid
    thc: weedDbStrain.thc ?? undefined,
    cbd: weedDbStrain.cbd ?? undefined,
    species: weedDbStrain.type as Strain['species'],
    image: weedDbStrain.image ?? undefined,
    imageUrl: weedDbStrain.imageUrl ?? undefined,
    createdAt: typeof weedDbStrain.createdAt === 'number' 
      ? new Date(weedDbStrain.createdAt).toISOString() 
      : weedDbStrain.createdAt ?? undefined,
    updatedAt: typeof weedDbStrain.updatedAt === 'number' 
      ? new Date(weedDbStrain.updatedAt).toISOString() 
      : weedDbStrain.updatedAt ?? undefined,
    created_at: typeof weedDbStrain.created_at === 'number' 
      ? new Date(weedDbStrain.created_at).toISOString() 
      : weedDbStrain.created_at ?? undefined,
    updated_at: typeof weedDbStrain.updated_at === 'number' 
      ? new Date(weedDbStrain.updated_at).toISOString() 
      : weedDbStrain.updated_at ?? undefined,
  };
}

/**
 * Infinite query hook for fetching paginated cannabis strain data with support for search, filtering, and offline mode.
 *
 * Fetches strain data from Weed DB or a local service, applying debounced search, species, effect, flavor, and THC filters. Supports infinite scrolling via React Query, with automatic handling of online and offline scenarios.
 *
 * @param search - Optional search string to filter strains by name or description
 * @param species - Optional species filter (e.g., 'sativa', 'indica', 'hybrid')
 * @param limit - Number of strains to fetch per page (default: 20)
 * @param enabled - Whether the query is enabled (default: true)
 * @param activeFilters - Additional filters including effects, flavors, and THC range
 * @returns A React Query infinite query result containing paginated strain data and metadata
 */
export function useInfiniteStrains({
  search = '',
  species = '',
  limit = 20,
  enabled = true,
  activeFilters,
}: UseInfiniteStrainsParams = {}) {
  // Debounce search so we don't fire a query on every key stroke
  const debouncedSearch = useDebounce(search, 300);

  // Derive filter parameters
  const effect = activeFilters?.effects?.[0] ?? '';
  const flavor = activeFilters?.flavors?.[0] ?? '';
  const minThc = activeFilters?.minThc ?? undefined;
  const maxThc = activeFilters?.maxThc ?? undefined;
  const speciesFilter = activeFilters?.species ?? species;

  // Debug logging for strain type filtering
  console.log('[useInfiniteStrains] Filtering parameters:', {
    species,
    'activeFilters.species': activeFilters?.species,
    speciesFilter,
    debouncedSearch,
    queryKey: ['strains', debouncedSearch, speciesFilter, effect, flavor, minThc, maxThc, limit]
  });

  return useInfiniteQuery<StrainQueryResponse, Error, StrainQueryResponse, (string | number | undefined)[], number>({
    queryKey: [
      'strains',
      debouncedSearch,
      speciesFilter,
      effect,
      flavor,
      minThc,
      maxThc,
      limit,
    ],
    queryFn: async ({ pageParam }: { pageParam: number }): Promise<StrainQueryResponse> => {
      const state = await NetInfo.fetch();

      if (!state.isConnected) {
        // Apply the same filtering logic offline as online for consistency
        const offset = (pageParam - 1) * limit;
        return strainLocalService.getFilteredStrains({
          search: debouncedSearch,
          species: speciesFilter,
          effect,
          flavor,
          minThc,
          maxThc,
          limit,
          offset,
        });
      }

      /* Fetch from WeedDB. We combine filtering params into a single request.
         WeedDbService utilities handle search vs. filter internally. */

      // 1. Search query takes precedence - now with server-side pagination
      if (debouncedSearch) {
        // Calculate intelligent pagination for search results
        // Use the user's limit but cap it between MIN and MAX for performance
        const searchPageSize = Math.min(
          Math.max(limit, MIN_SEARCH_RESULTS_PER_PAGE),
          MAX_SEARCH_RESULTS_PER_PAGE
        );
        
        const resp = await WeedDbService.searchPaginated(debouncedSearch, pageParam, searchPageSize);
        
        // Handle empty search results
        if (!resp.data || resp.data.items.length === 0) {
          return {
            strains: [],
            total: 0,
            hasMore: false,
          };
        }
        
        // Debug logging for pagination
        console.log(`[useInfiniteStrains] Search pagination: page=${pageParam}, pageSize=${searchPageSize}, total=${resp.data.total_count}, totalPages=${resp.data.total_pages}, returning=${resp.data.items.length} items`);
        
        return {
          strains: resp.data.items.map(mapWeedDbStrainToAppStrain),
          total: resp.data.total_count,
          hasMore: pageParam < resp.data.total_pages,
        };
      }

      // 2. Type filter (species) - Use paginated API
      if (speciesFilter) {
        console.log(`[useInfiniteStrains] Using type filter: "${speciesFilter}" (page ${pageParam})`);
        const resp = await WeedDbService.filterByTypePaginated(
          speciesFilter as 'sativa' | 'indica' | 'hybrid',
          pageParam,
          limit
        );
        
        console.log(`[useInfiniteStrains] Type filter response:`, {
          type: speciesFilter,
          total: resp.data.total_count,
          pageItems: resp.data.items.length,
          page: resp.data.page,
          totalPages: resp.data.total_pages
        });
        
        return {
          strains: resp.data.items.map(mapWeedDbStrainToAppStrain),
          total: resp.data.total_count,
          hasMore: pageParam < resp.data.total_pages,
        };
      }

      // 3. Fallback to simple paginated list
      console.log(`[useInfiniteStrains] Using fallback list (page ${pageParam})`);
      const resp = await WeedDbService.listPaginated(pageParam, limit);
      return {
        strains: resp.data.items.map(mapWeedDbStrainToAppStrain),
        total: resp.data.total_count,
        hasMore: pageParam < resp.data.total_pages,
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length + 1 : undefined,
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
} 