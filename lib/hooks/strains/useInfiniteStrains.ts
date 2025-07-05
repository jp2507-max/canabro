import { useInfiniteQuery } from '@tanstack/react-query';
// Switched to WeedDbService so we fetch the full ~1k strains directly from the Weed DB API instead of our limited Supabase mirror.
import { WeedDbService } from '@/lib/services/weed-db.service';
import { strainLocalService } from '@/lib/services';
import NetInfo from '@react-native-community/netinfo';
import { ActiveFilters } from '@/components/strains/StrainFilterModal';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { Strain } from '@/lib/types/strain';
import { Strain as WeedDbStrain } from '@/lib/types/weed-db';

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

/**
 * Maps WeedDB strain format to app strain format
 */
function mapWeedDbStrainToAppStrain(weedDbStrain: WeedDbStrain): Strain {
  return {
    ...weedDbStrain,
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
 * React Query based infinite query hook for paginated strains data.
 * Fetches data from Supabase via strain-service using limit/offset strategy.
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

      // 1. Search query takes precedence.
      if (debouncedSearch) {
        const resp = await WeedDbService.search(debouncedSearch);
        return {
          strains: resp.data.map(mapWeedDbStrainToAppStrain),
          total: resp.data.length,
          hasMore: false, // API search endpoint returns all matches at once
        };
      }

      // 2. Type filter (species)
      if (speciesFilter) {
        const resp = await WeedDbService.filterByType(
          speciesFilter as 'sativa' | 'indica' | 'hybrid'
        );
        const paginatedData = resp.data.slice((pageParam - 1) * limit, pageParam * limit);
        return {
          strains: paginatedData.map(mapWeedDbStrainToAppStrain),
          total: resp.data.length,
          hasMore: pageParam * limit < resp.data.length,
        };
      }

      // 3. Fallback to simple paginated list
      const resp = await WeedDbService.list(pageParam, limit);
      return {
        strains: resp.data.map(mapWeedDbStrainToAppStrain),
        total: resp.data.length, // WeedDB API doesn't return global count
        hasMore: resp.data.length === limit,
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length + 1 : undefined,
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
} 