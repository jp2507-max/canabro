import { queryOptions, useQuery, skipToken } from '@tanstack/react-query';

import { getStrainById } from '../../services/the-cannabis-api-service';
import { TheCannabisApiStrain } from '../../types/the-cannabis-api';

/**
 * Defines query options for fetching a single strain by its ID (_id).
 * Uses skipToken if the ID is missing to prevent the query from running.
 *
 * @param strainId The MongoDB ObjectId (_id) of the strain to fetch.
 * @returns The query options object.
 */
export function strainByIdQueryOptions(strainId: string | undefined | null) {
  return queryOptions<
    TheCannabisApiStrain | null,
    Error,
    TheCannabisApiStrain | null,
    readonly ['strain', string | undefined | null] // Query key includes the ID
  >({
    // Use a unique query key including the strain ID
    queryKey: ['strain', strainId],
    // Use skipToken if strainId is falsy, otherwise call getStrainById
    queryFn: strainId ? () => getStrainById(strainId) : skipToken,
    // Optional: Configure staleTime if needed, e.g., keep data fresh longer
    // staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Custom hook to fetch a single strain by ID using TanStack Query.
 * Handles caching, background updates, loading, and error states.
 * Uses the shared strainByIdQueryOptions.
 *
 * @param strainId The MongoDB ObjectId (_id) of the strain to fetch.
 * @returns The query result object from TanStack Query.
 */
export function useStrainById(strainId: string | undefined | null) {
  // Use the defined query options
  return useQuery(strainByIdQueryOptions(strainId));
}
