import { queryOptions, useQuery, skipToken, type UseQueryOptions } from '@tanstack/react-query';

import { getFlavorsByStrainId } from '../../data/strains';

// Define the specific query key type
type StrainFlavorsQueryKey = readonly ['strainFlavors', string | undefined | null];

// Define the specific query options type, extending UseQueryOptions
type StrainFlavorsOptions = Omit<
  UseQueryOptions<string[], Error, string[], StrainFlavorsQueryKey>,
  'queryKey' | 'queryFn' // Omit keys handled internally
>;

/**
 * Defines query options for fetching flavors for a single strain by its ID.
 * Uses skipToken if the ID is missing to prevent the query from running.
 *
 * @param strainId The ID of the strain to fetch flavors for.
 * @returns The query options object.
 */
export function strainFlavorsQueryOptions(strainId: string | undefined | null) {
  return queryOptions<string[], Error, string[], StrainFlavorsQueryKey>({
    // Use a unique query key including the strain ID for flavors
    queryKey: ['strainFlavors', strainId],
    // Use skipToken if strainId is falsy, otherwise call getFlavorsByStrainId
    queryFn: strainId ? () => getFlavorsByStrainId(strainId) : skipToken,
    // Disable retries for local data
    retry: false,
  });
}

/**
 * Custom hook to fetch flavors for a single strain by ID using TanStack Query.
 * Handles caching, background updates, loading, and error states.
 * Uses the shared strainFlavorsQueryOptions and allows overriding/extending options.
 *
 * @param strainId The ID of the strain to fetch flavors for.
 * @param options Optional TanStack Query options to merge.
 * @returns The query result object from TanStack Query.
 */
export function useStrainFlavors(
  strainId: string | undefined | null,
  options?: StrainFlavorsOptions, // Accept optional options
) {
  // Merge the base options with any provided options
  return useQuery({
    ...strainFlavorsQueryOptions(strainId),
    ...options, // Spread the passed options here
  });
}
