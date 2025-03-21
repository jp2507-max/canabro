import { PlantMetrics } from '../../types';
import { useSupabaseQuery } from '../supabase';

/**
 * Options for the usePlantMetrics hook
 */
interface UsePlantMetricsOptions {
  // Filter by date range
  startDate?: string;
  endDate?: string;
  
  // Whether to fetch on mount
  fetchOnMount?: boolean;
}

/**
 * Hook for fetching plant metrics for a specific plant
 */
export function usePlantMetrics(plantId: string | null, options: UsePlantMetricsOptions = {}) {
  // Build filter conditions
  const filter = [];
  
  // Always filter by plant ID
  if (plantId) {
    filter.push({
      column: 'plant_id',
      operator: 'eq',
      value: plantId
    });
  }
  
  // Filter by start date if provided
  if (options.startDate) {
    filter.push({
      column: 'date',
      operator: 'gte',
      value: options.startDate
    });
  }
  
  // Filter by end date if provided
  if (options.endDate) {
    filter.push({
      column: 'date',
      operator: 'lte',
      value: options.endDate
    });
  }
  
  // Use the base query hook with our filters
  return useSupabaseQuery<PlantMetrics>({
    table: 'plant_metrics',
    filter,
    orderBy: {
      column: 'date',
      ascending: true
    },
    fetchOnMount: options.fetchOnMount
  });
}
