import { queryOptions, useQuery, skipToken } from '@tanstack/react-query';

import { getFlavorsByStrainId } from '../../services/the-cannabis-api-service';
import { TheCannabisApiFlavorsResponse } from '../../types/the-cannabis-api';

/**
 * Defines query options for fetching flavors for a single strain by its ID (_id).
 * Uses skipToken if the ID is missing to prevent the query from running.
 *
 * @param strainId The MongoDB ObjectId (_id) of the strain to fetch flavors for.
 * @returns The query options object.
 */
export function strainFlavorsQueryOptions(strainId: string | undefined | null) {
  return queryOptions<
    TheCannabisApiFlavorsResponse,
    Error,
    TheCannabisApiFlavorsResponse,
    readonly ['strainFlavors', string | undefined | null] // Query key includes the ID
  >({
    // Use a unique query key including the strain ID for flavors
    queryKey: ['strainFlavors', strainId],
    // Use skipToken if strainId is falsy, otherwise call getFlavorsByStrainId
    queryFn: strainId ? () => getFlavorsByStrainId(strainId) : skipToken,
    // Optional: Configure staleTime if needed
    // staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Custom hook to fetch flavors for a single strain by ID using TanStack Query.
 * Handles caching, background updates, loading, and error states.
 * Uses the shared strainFlavorsQueryOptions.
 *
 * @param strainId The MongoDB ObjectId (_id) of the strain to fetch flavors for.
 * @returns The query result object from TanStack Query.
 */
export function useStrainFlavors(strainId: string | undefined | null) {
  // Use the defined query options
  return useQuery(strainFlavorsQueryOptions(strainId));
}
