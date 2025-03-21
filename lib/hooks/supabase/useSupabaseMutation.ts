import { useState } from 'react';
import { PostgrestError } from '@supabase/supabase-js';
import supabase from '../../supabase';
import { ApiResponse } from '../../types';

/**
 * Types of mutations
 */
export type MutationType = 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT';

/**
 * Options for the useSupabaseMutation hook
 */
interface UseSupabaseMutationOptions<T, R = T> {
  // The table to mutate
  table: string;
  
  // The type of mutation
  type: MutationType;
  
  // Optional callback after successful mutation
  onSuccess?: (data: R) => void;
  
  // Optional callback after error
  onError?: (error: PostgrestError) => void;
  
  // Whether to return the minimal data or the entire record
  returning?: 'minimal' | 'representation';
}

/**
 * Hook for mutating Supabase tables (insert, update, delete)
 */
export function useSupabaseMutation<T, R = T>(options: UseSupabaseMutationOptions<T, R>) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<PostgrestError | null>(null);

  const mutate = async (
    data: T | Partial<T> | string, 
    matchColumn?: string
  ): Promise<ApiResponse<R>> => {
    setLoading(true);
    setError(null);

    try {
      let result;

      switch (options.type) {
        case 'INSERT':
          result = await supabase
            .from(options.table)
            .insert(data as T | T[])
            .select(options.returning !== 'minimal' ? '*' : undefined);
          break;

        case 'UPSERT':
          result = await supabase
            .from(options.table)
            .upsert(data as T | T[])
            .select(options.returning !== 'minimal' ? '*' : undefined);
          break;

        case 'UPDATE':
          if (!matchColumn) {
            throw new Error('matchColumn is required for UPDATE operations');
          }
          
          // For update, data is an object and matchValue is extracted from it
          const updateData = data as Partial<T>;
          const matchValue = (updateData as any)[matchColumn];
          
          if (!matchValue) {
            throw new Error(`matchValue not found in data for column ${matchColumn}`);
          }
          
          result = await supabase
            .from(options.table)
            .update(updateData)
            .eq(matchColumn, matchValue)
            .select(options.returning !== 'minimal' ? '*' : undefined);
          break;

        case 'DELETE':
          if (!matchColumn) {
            throw new Error('matchColumn is required for DELETE operations');
          }
          
          // For delete, data can be just the ID value as a string
          const deleteMatchValue = typeof data === 'string' ? data : (data as any)[matchColumn];
          
          if (!deleteMatchValue) {
            throw new Error(`matchValue not found for column ${matchColumn}`);
          }
          
          result = await supabase
            .from(options.table)
            .delete()
            .eq(matchColumn, deleteMatchValue)
            .select(options.returning !== 'minimal' ? '*' : undefined);
          break;

        default:
          throw new Error(`Unsupported mutation type: ${options.type}`);
      }

      if (result.error) throw result.error;

      if (options.onSuccess) {
        options.onSuccess(result.data as unknown as R);
      }

      return { 
        data: result.data as unknown as R, 
        error: null, 
        status: 200 
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
        status: postgrestError.code === '23505' ? 409 : 500 
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    mutate,
    loading,
    error,
    reset: () => setError(null)
  };
}
