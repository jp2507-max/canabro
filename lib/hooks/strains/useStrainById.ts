import { queryOptions, useQuery, skipToken, type UseQueryOptions } from '@tanstack/react-query';

import { WeedDbService } from '../../services/weed-db.service';
import type { Strain } from '../../types/weed-db';

// Define the specific query key type
type StrainByIdQueryKey = readonly ['strain', string | undefined | null];

// Define the specific query options type, extending UseQueryOptions
// Use Omit again to correctly type the optional 'options' parameter,
// representing only the properties that can be overridden.
type StrainByIdOptions = Omit<
  UseQueryOptions<Strain | null, Error, Strain | null, StrainByIdQueryKey>,
  'queryKey' | 'queryFn' // Omit keys handled internally by strainByIdQueryOptions
>;

/**
 * Defines query options for fetching a single strain by its ID.
 * Uses skipToken if the ID is missing to prevent the query from running.
 *
 * @param strainId The ID of the strain to fetch.
 * @returns The query options object.
 */
export function strainByIdQueryOptions(strainId: string | undefined | null) {
  return queryOptions<Strain | null, Error, Strain | null, StrainByIdQueryKey>({
    // Use a unique query key including the strain ID
    queryKey: ['strain', strainId],
    // queryFn should now directly return the result of getById
    queryFn: strainId ? () => WeedDbService.getById(strainId) : skipToken,
    // Disable retries for API data unless needed, keep false for now
    retry: false,
  });
}

/**
 * Custom hook to fetch a single strain by ID using TanStack Query.
 * Handles caching, background updates, loading, and error states.
 * Uses the shared strainByIdQueryOptions and allows overriding/extending options.
 *
 * @param strainId The ID of the strain to fetch.
 * @param options Optional TanStack Query options to merge.
 * @returns The query result object from TanStack Query.
 */
export function useStrainById(
  strainId: string | undefined | null,
  options?: StrainByIdOptions, // Accept optional options
) {
  // Merge the base options with any provided options
  return useQuery({
    ...strainByIdQueryOptions(strainId),
    ...options, // Spread the passed options here
  });
}
