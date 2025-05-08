import { useQuery, useQueryClient } from '@tanstack/react-query';
import { WeedDbService, weedDbKeys } from '@/lib/services/weed-db.service';
import { ActiveFilters } from '@/components/strains/StrainFilterModal';
import { Strain, CachedResponse } from '@/lib/types/weed-db';
import { useMemo, useState, useEffect } from 'react';

// Import our custom type declarations
import '@/lib/types/react-query';

/**
 * Custom hook to fetch a single strain by ID
 */
export function useStrain(id: string | null | undefined) {
  return useQuery<Strain | null>({
    queryKey: id ? weedDbKeys.detail(id) : ['strain-detail-placeholder'],
    queryFn: () => id ? WeedDbService.getById(id) : Promise.resolve(null),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Custom hook for strain search
 */
export function useStrainSearch(searchQuery: string) {
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  return useQuery<CachedResponse<Strain[]>>({
    queryKey: weedDbKeys.search(debouncedSearchQuery),
    queryFn: () => WeedDbService.searchByName(debouncedSearchQuery),
    enabled: debouncedSearchQuery.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Custom hook for strain type filtering
 */
export function useStrainsByType(type: 'sativa' | 'indica' | 'hybrid') {
  return useQuery<CachedResponse<Strain[]>>({
    queryKey: weedDbKeys.type(type),
    queryFn: () => WeedDbService.filterByType(type),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Custom hook for strain effect filtering
 */
export function useStrainsByEffect(effect: string | null) {
  return useQuery<CachedResponse<Strain[]>>({
    queryKey: effect ? weedDbKeys.effects(effect) : ['strains-effect-placeholder'],
    queryFn: () => effect ? WeedDbService.filterByEffect(effect) : Promise.resolve({ data: [], isFromCache: false }),
    enabled: !!effect,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Custom hook for strain flavor filtering
 */
export function useStrainsByFlavor(flavor: string | null) {
  return useQuery<CachedResponse<Strain[]>>({
    queryKey: flavor ? weedDbKeys.flavors(flavor) : ['strains-flavor-placeholder'],
    queryFn: () => flavor ? WeedDbService.filterByFlavor(flavor) : Promise.resolve({ data: [], isFromCache: false }),
    enabled: !!flavor,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Custom hook for strains by THC content
 */
export function useStrainsByThc(min: number | null, max: number | null) {
  return useQuery<CachedResponse<Strain[]>>({
    queryKey: min != null && max != null ? weedDbKeys.thc(min, max) : ['strains-thc-placeholder'],
    queryFn: () => min != null && max != null 
      ? WeedDbService.filterByThc(min, max)
      : Promise.resolve({ data: [], isFromCache: false }),
    enabled: min != null && max != null,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Optimized hook for strain filtering with all filter parameters
 */
export function useFilteredStrains(
  activeFilters: ActiveFilters,
  selectedStrainType: 'sativa' | 'indica' | 'hybrid',
  searchQuery: string
) {
  // Create a memoized query function to prevent unnecessary rerenders
  const queryFn = useMemo(() => async () => {
    // Clear debug logging to better track the flow
    console.log('----- Query Execution Start -----');
    console.log(`Search: "${searchQuery}", Type: ${selectedStrainType}`);
    
    // For search queries, search by name and return results as-is
    if (searchQuery && searchQuery.trim().length > 0) {
      console.log(`[DEBUG] Executing name search: "${searchQuery}"`);
      const result = await WeedDbService.searchByName(searchQuery);
      console.log(`[DEBUG] Name search completed with ${result.data.length} results`);
      
      // Return search results directly without additional filtering
      return result.data;
    }
    
    // If no search query, handle filters and default type selection
    console.log('[DEBUG] No search, handling filters');
    
    if (activeFilters.effects.length > 0) {
      const effect = activeFilters.effects[0];
      if (effect) {
        console.log(`[DEBUG] Filtering by effect: ${effect}`);
        const result = await WeedDbService.filterByEffect(effect);
        return result.data;
      }
    }
    
    if (activeFilters.flavors.length > 0) {
      const flavor = activeFilters.flavors[0];
      if (flavor) {
        console.log(`[DEBUG] Filtering by flavor: ${flavor}`);
        const result = await WeedDbService.filterByFlavor(flavor);
        return result.data;
      }
    }
    
    if (activeFilters.species) {
      console.log(`[DEBUG] Filtering by species: ${activeFilters.species}`);
      const result = await WeedDbService.filterByType(activeFilters.species as 'sativa' | 'indica' | 'hybrid');
      return result.data;
    }
    
    if (activeFilters.minThc !== null && activeFilters.maxThc !== null) {
      console.log(`[DEBUG] Filtering by THC range: ${activeFilters.minThc}-${activeFilters.maxThc}`);
      const result = await WeedDbService.filterByThc(activeFilters.minThc, activeFilters.maxThc);
      return result.data;
    }
    
    // Default: filter by the selected strain type
    console.log(`[DEBUG] Using default type filter: ${selectedStrainType}`);
    const result = await WeedDbService.filterByType(selectedStrainType);
    return result.data;
  }, [searchQuery, activeFilters.effects[0], activeFilters.flavors[0], 
      activeFilters.species, activeFilters.minThc, activeFilters.maxThc, selectedStrainType]);

  // Create a stable query key using only the dependencies that matter
  const queryKey = useMemo(() => [
    'filtered-strains',
    searchQuery,
    activeFilters.effects[0] || null,
    activeFilters.flavors[0] || null,
    activeFilters.species || null,
    activeFilters.minThc,
    activeFilters.maxThc,
    selectedStrainType,
  ] as const, [
    searchQuery,
    activeFilters.effects[0], 
    activeFilters.flavors[0], 
    activeFilters.species, 
    activeFilters.minThc, 
    activeFilters.maxThc, 
    selectedStrainType
  ]);

  return useQuery<Strain[]>({
    // Cast the queryKey to any to bypass TypeScript restrictions
    // This is safe because we've declared the types in react-query.d.ts
    queryKey: queryKey as any,
    queryFn,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

// Utility: Debounce hook for search inputs
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Prefetches strain data for improved UX
 */
export function usePrefetchStrain() {
  const queryClient = useQueryClient();
  
  return (id: string) => {
    if (!id) return;
    
    queryClient.prefetchQuery({
      // Again, cast to any to bypass TypeScript restrictions
      queryKey: weedDbKeys.detail(id) as any,
      queryFn: () => WeedDbService.getById(id),
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  };
}