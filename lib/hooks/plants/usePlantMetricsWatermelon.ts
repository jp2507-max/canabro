/**
 * WatermelonDB hook for plant metrics
 * 
 * This hook provides access to plant metrics data stored in WatermelonDB
 * for offline-first functionality
 */

import { Q } from '@nozbe/watermelondb';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { useEffect, useState } from 'react';

import { PlantMetrics } from '../../models/PlantMetrics';
import useWatermelon from '../useWatermelon';

interface UsePlantMetricsWatermelonOptions {
  // Filter by date range
  startDate?: Date;
  endDate?: Date;
  
  // Whether to fetch on mount
  fetchOnMount?: boolean;
}

/**
 * Hook for accessing plant metrics from WatermelonDB
 */
export function usePlantMetricsWatermelon(
  plantId: string | null,
  options: UsePlantMetricsWatermelonOptions = {}
) {
  const { plantMetrics } = useWatermelon();
  const [data, setData] = useState<PlantMetrics[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    if (!plantId) {
      setData([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build query conditions
      const conditions = [Q.where('plant_id', plantId)];

      // Add date range filters if provided
      if (options.startDate) {
        conditions.push(Q.where('recorded_at', Q.gte(options.startDate.getTime())));
      }
      if (options.endDate) {
        conditions.push(Q.where('recorded_at', Q.lte(options.endDate.getTime())));
      }

      // Add soft delete filter
      conditions.push(Q.where('is_deleted', Q.notEq(true)));

      const metrics = await plantMetrics.query(...conditions).fetch();
      
      // Sort by recorded_at (most recent first)
      const sortedMetrics = metrics.sort((a, b) => 
        b.recordedAt.getTime() - a.recordedAt.getTime()
      );

      setData(sortedMetrics);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch plant metrics'));
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount if specified
  useEffect(() => {
    if (options.fetchOnMount !== false) {
      fetchData();
    }
  }, [plantId, options.startDate, options.endDate, options.fetchOnMount]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
