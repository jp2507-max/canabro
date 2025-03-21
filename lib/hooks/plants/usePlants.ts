import { useAuth } from '../../contexts/AuthProvider';
import { Plant, PaginationParams } from '../../types';
import { useSupabaseQuery } from '../supabase';

/**
 * Options for the usePlants hook
 */
interface UsePlantsOptions {
  // Optional filter by strain ID
  strainId?: string;
  
  // Optional filter by growth stage
  growthStage?: string;
  
  // Optional filter for public plants only
  publicOnly?: boolean;
  
  // Optional pagination parameters
  pagination?: PaginationParams;
  
  // Whether to fetch on mount
  fetchOnMount?: boolean;
}

/**
 * Hook for fetching plants from Supabase
 */
export function usePlants(options: UsePlantsOptions = {}) {
  const { user } = useAuth();
  
  // Build filter conditions
  const filter = [];
  
  // If not public only, filter by user ID
  if (!options.publicOnly && user) {
    filter.push({
      column: 'user_id',
      operator: 'eq',
      value: user.id
    });
  }
  
  // If public only, filter for public plants
  if (options.publicOnly) {
    filter.push({
      column: 'is_public',
      operator: 'eq',
      value: true
    });
  }
  
  // Filter by strain ID if provided
  if (options.strainId) {
    filter.push({
      column: 'strain_id',
      operator: 'eq',
      value: options.strainId
    });
  }
  
  // Filter by growth stage if provided
  if (options.growthStage) {
    filter.push({
      column: 'growth_stage',
      operator: 'eq',
      value: options.growthStage
    });
  }
  
  // Use the base query hook with our filters
  return useSupabaseQuery<Plant>({
    table: 'plants',
    filter,
    orderBy: {
      column: 'created_at',
      ascending: false
    },
    pagination: options.pagination,
    fetchOnMount: options.fetchOnMount
  });
}
