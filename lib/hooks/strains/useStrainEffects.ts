import { queryOptions, useQuery, skipToken } from '@tanstack/react-query';

import { getEffectsByStrainId } from '../../services/the-cannabis-api-service';
import { TheCannabisApiEffectsResponse } from '../../types/the-cannabis-api';

/**
 * Defines query options for fetching effects for a single strain by its ID (_id).
 * Uses skipToken if the ID is missing to prevent the query from running.
 *
 * @param strainId The MongoDB ObjectId (_id) of the strain to fetch effects for.
 * @returns The query options object.
 */
export function strainEffectsQueryOptions(strainId: string | undefined | null) {
  return queryOptions<
    TheCannabisApiEffectsResponse,
    Error,
    TheCannabisApiEffectsResponse,
    readonly ['strainEffects', string | undefined | null] // Query key includes the ID
  >({
    // Use a unique query key including the strain ID for effects
    queryKey: ['strainEffects', strainId],
    // Use skipToken if strainId is falsy, otherwise call getEffectsByStrainId
    queryFn: strainId ? () => getEffectsByStrainId(strainId) : skipToken,
    // Optional: Configure staleTime if needed
    // staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Custom hook to fetch effects for a single strain by ID using TanStack Query.
 * Handles caching, background updates, loading, and error states.
 * Uses the shared strainEffectsQueryOptions.
 *
 * @param strainId The MongoDB ObjectId (_id) of the strain to fetch effects for.
 * @returns The query result object from TanStack Query.
 */
export function useStrainEffects(strainId: string | undefined | null) {
  // Use the defined query options
  return useQuery(strainEffectsQueryOptions(strainId));
}
