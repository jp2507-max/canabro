import { queryOptions, useQuery } from '@tanstack/react-query';

import { getStrainsByType } from '../../services/the-cannabis-api-service';
import { TheCannabisApiStrainsResponse } from '../../types/the-cannabis-api';

type StrainType = 'indica' | 'sativa' | 'hybrid';

/**
 * Generates query options for fetching strains by type using TanStack Query.
 *
 * @param strainType - The type of strain to fetch ('indica', 'sativa', or 'hybrid'). Defaults to 'sativa'.
 * @returns The query options object.
 */
export function strainsByTypeQueryOptions(strainType: StrainType = 'sativa') {
  return queryOptions<
    TheCannabisApiStrainsResponse,
    Error,
    TheCannabisApiStrainsResponse,
    readonly ['strains', StrainType] // Updated query key structure
  >({
    // Query key identifies this specific query.
    // Include strainType in the key so the query refetches when it changes.
    queryKey: ['strains', strainType],
    // The function to fetch the data using the new service.
    queryFn: () => getStrainsByType(strainType),
    // Optional: Configure staleTime and cacheTime if needed.
    // staleTime: 5 * 60 * 1000, // 5 minutes
    // cacheTime: 15 * 60 * 1000, // 15 minutes
  });
}

/**
 * Custom hook to fetch strains by type using TanStack Query.
 * Handles caching, background updates, loading, and error states.
 * Uses the shared strainsByTypeQueryOptions.
 *
 * @param strainType - The type of strain to fetch ('indica', 'sativa', or 'hybrid'). Defaults to 'sativa'.
 * @returns The query result object from TanStack Query.
 */
export function useStrainsByType(strainType: StrainType = 'sativa') {
  // Use the defined query options
  return useQuery(strainsByTypeQueryOptions(strainType));
}
