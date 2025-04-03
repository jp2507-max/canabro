import { PostgrestError } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import supabase from '../../supabase';
import { ApiResponse, PaginationParams } from '../../types';

/**
 * Options for the useSupabaseQuery hook
 */
interface UseSupabaseQueryOptions<T> {
  // The table to query
  table: string;

  // Optional column selection
  select?: string;

  // Optional filter conditions
  filter?: {
    column: string;
    operator: string;
    value: any;
  }[];

  // Optional ordering
  orderBy?: {
    column: string;
    ascending?: boolean;
  };

  // Optional pagination
  pagination?: PaginationParams;

  // Whether to fetch on mount
  fetchOnMount?: boolean;

  // Optional callback after successful fetch
  onSuccess?: (data: T[]) => void;

  // Optional callback after error
  onError?: (error: PostgrestError) => void;
}

/**
 * Hook for querying Supabase tables with filtering, ordering, and pagination
 */
export function useSupabaseQuery<T>(options: UseSupabaseQueryOptions<T>) {
  const [data, setData] = useState<T[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<PostgrestError | null>(null);

  const fetchData = async (): Promise<ApiResponse<T[]>> => {
    setLoading(true);
    setError(null);

    try {
      // Start building the query
      let query = supabase.from(options.table).select(options.select || '*', { count: 'exact' });

      // Apply filters if provided
      if (options.filter && options.filter.length > 0) {
        options.filter.forEach((filter) => {
          query = query.filter(filter.column, filter.operator, filter.value);
        });
      }

      // Apply ordering if provided
      if (options.orderBy) {
        query = query.order(options.orderBy.column, {
          ascending: options.orderBy.ascending ?? true,
        });
      }

      // Apply pagination if provided
      if (options.pagination) {
        const { page = 1, limit = 10 } = options.pagination;
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);
      }

      // Execute the query
      const { data, error, count } = await query;

      if (error) throw error;

      setData(data as T[]);
      setCount(count);

      if (options.onSuccess) {
        options.onSuccess(data as T[]);
      }

      return {
        data: data as T[],
        error: null,
        status: 200,
      };
    } catch (err) {
      const postgrestError = err as PostgrestError;
      setError(postgrestError);

      if (options.onError) {
        options.onError(postgrestError);
      }

      return {
        data: null,
        error: postgrestError,
        status: postgrestError.code === '23505' ? 409 : 500,
      };
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount if specified
  useEffect(() => {
    if (options.fetchOnMount !== false) {
      fetchData();
    }
  }, [
    options.table,
    options.select,
    // We need to stringify these objects for dependency tracking
    JSON.stringify(options.filter),
    JSON.stringify(options.orderBy),
    JSON.stringify(options.pagination),
  ]);

  return {
    data,
    count,
    loading,
    error,
    refetch: fetchData,
  };
}
