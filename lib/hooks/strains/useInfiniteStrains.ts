import { useInfiniteQuery } from '@tanstack/react-query';
import { getStrains } from '@/lib/services/sync/strain-sync.service';
import { strainLocalService } from '@/lib/services';
import NetInfo from '@react-native-community/netinfo';
import { ActiveFilters } from '@/components/strains/StrainFilterModal';
import { useDebounce } from '@/lib/hooks/useDebounce';

interface UseInfiniteStrainsParams {
  search?: string;
  species?: string; // fallback species when activeFilters.species is null
  limit?: number;
  enabled?: boolean;
  activeFilters?: ActiveFilters;
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

  return useInfiniteQuery({
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
    queryFn: async ({ pageParam = 1 }) => {
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

      return getStrains({
        search: debouncedSearch,
        species: speciesFilter,
        effect,
        flavor,
        minThc,
        maxThc,
        page: pageParam as number,
        limit,
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length + 1 : undefined,
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
} 