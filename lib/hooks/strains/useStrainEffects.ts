import { queryOptions, useQuery, skipToken, type UseQueryOptions } from '@tanstack/react-query';

import { getEffectsByStrainId } from '../../data/strains';

// Define the specific query key type
type StrainEffectsQueryKey = readonly ['strainEffects', string | undefined | null];

// Define the specific query options type, extending UseQueryOptions
type StrainEffectsOptions = Omit<
  UseQueryOptions<string[], Error, string[], StrainEffectsQueryKey>,
  'queryKey' | 'queryFn' // Omit keys handled internally
>;

/**
 * Defines query options for fetching effects for a single strain by its ID.
 * Uses skipToken if the ID is missing to prevent the query from running.
 *
 * @param strainId The ID of the strain to fetch effects for.
 * @returns The query options object.
 */
export function strainEffectsQueryOptions(strainId: string | undefined | null) {
  return queryOptions<string[], Error, string[], StrainEffectsQueryKey>({
    // Use a unique query key including the strain ID for effects
    queryKey: ['strainEffects', strainId],
    // Use skipToken if strainId is falsy, otherwise call getEffectsByStrainId
    queryFn: strainId ? () => getEffectsByStrainId(strainId) : skipToken,
    // Disable retries for local data
    retry: false,
  });
}

/**
 * Custom hook to fetch effects for a single strain by ID using TanStack Query.
 * Handles caching, background updates, loading, and error states.
 * Uses the shared strainEffectsQueryOptions and allows overriding/extending options.
 *
 * @param strainId The ID of the strain to fetch effects for.
 * @param options Optional TanStack Query options to merge.
 * @returns The query result object from TanStack Query.
 */
export function useStrainEffects(
  strainId: string | undefined | null,
  options?: StrainEffectsOptions // Accept optional options
) {
  // Merge the base options with any provided options
  return useQuery({
    ...strainEffectsQueryOptions(strainId),
    ...options, // Spread the passed options here
  });
}
