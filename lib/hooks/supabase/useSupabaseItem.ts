import { useEffect, useState } from 'react';
import { PostgrestError } from '@supabase/supabase-js';
import supabase from '../../supabase';
import { ApiResponse } from '../../types';

/**
 * Options for the useSupabaseItem hook
 */
interface UseSupabaseItemOptions<T> {
  // The table to query
  table: string;
  
  // The column to match (usually 'id')
  matchColumn: string;
  
  // The value to match
  matchValue: string | null;
  
  // Optional column selection
  select?: string;
  
  // Whether to fetch on mount
  fetchOnMount?: boolean;
  
  // Optional callback after successful fetch
  onSuccess?: (data: T) => void;
  
  // Optional callback after error
  onError?: (error: PostgrestError) => void;
}

/**
 * Hook for fetching a single item from a Supabase table
 */
export function useSupabaseItem<T>(options: UseSupabaseItemOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<PostgrestError | null>(null);

  const fetchItem = async (): Promise<ApiResponse<T>> => {
    // Don't fetch if matchValue is null
    if (!options.matchValue) {
      return { data: null, error: null, status: 200 };
    }

    setLoading(true);
    setError(null);

    try {
      // Build and execute the query
      const { data, error } = await supabase
        .from(options.table)
        .select(options.select || '*')
        .eq(options.matchColumn, options.matchValue)
        .single();

      if (error) throw error;

      setData(data as T);
      
      if (options.onSuccess) {
        options.onSuccess(data as T);
      }

      return { 
        data: data as T, 
        error: null, 
        status: 200 
      };
    } catch (err) {
      const postgrestError = err as PostgrestError;
      setError(postgrestError);
      
      if (options.onError) {
        options.onError(postgrestError);
      }
      
      // If not found, return 404 status
      const status = postgrestError.code === 'PGRST116' ? 404 : 500;
      
      return { 
        data: null, 
        error: postgrestError, 
        status 
      };
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount if specified and matchValue is provided
  useEffect(() => {
    if (options.fetchOnMount !== false && options.matchValue) {
      fetchItem();
    }
  }, [options.table, options.matchColumn, options.matchValue, options.select]);

  return {
    data,
    loading,
    error,
    refetch: fetchItem
  };
}
