import { useQuery } from '@tanstack/react-query';

import { WeedDbService, weedDbKeys } from '@/lib/services/weed-db.service';
import { Strain } from '@/lib/types/weed-db';

// Import the types file to ensure our custom declarations are recognized
import '@/lib/types/react-query';

type StrainType = 'indica' | 'sativa' | 'hybrid';

/**
 * Reusable query options for fetching strains by type
 */
export function strainsByTypeQueryOptions(type?: StrainType) {
  return {
    queryKey: type ? weedDbKeys.type(type) : weedDbKeys.lists(),
    queryFn: async () => {
      if (!type) {
        // Fetch indica as default if no type specified
        const result = await WeedDbService.filterByType('indica');
        return result.data;
      }
      const result = await WeedDbService.filterByType(type);
      return result.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  } as const;
}

/**
 * Hook for fetching strains by type using the queryOptions pattern
 */
export function useStrainsByType(type: StrainType) {
  // Use the custom hook pattern with explicit generic type
  // to avoid TypeScript errors with query key types
  return useQuery<Strain[]>(strainsByTypeQueryOptions(type));
}
