import { useAuth } from '../../contexts/AuthProvider';
import { DiaryEntry, PaginationParams } from '../../types';
import { useSupabaseQuery } from '../supabase';

/**
 * Options for the useDiaryEntries hook
 */
interface UseDiaryEntriesOptions {
  // Optional filter by plant ID
  plantId?: string;
  
  // Optional filter by entry type
  entryType?: string;
  
  // Optional filter by date range
  startDate?: string;
  endDate?: string;
  
  // Optional pagination parameters
  pagination?: PaginationParams;
  
  // Whether to fetch on mount
  fetchOnMount?: boolean;
}

/**
 * Hook for fetching diary entries from Supabase
 */
export function useDiaryEntries(options: UseDiaryEntriesOptions = {}) {
  const { user } = useAuth();
  
  // Build filter conditions
  const filter = [];
  
  // Filter by user ID
  if (user) {
    filter.push({
      column: 'user_id',
      operator: 'eq',
      value: user.id
    });
  }
  
  // Filter by plant ID if provided
  if (options.plantId) {
    filter.push({
      column: 'plant_id',
      operator: 'eq',
      value: options.plantId
    });
  }
  
  // Filter by entry type if provided
  if (options.entryType) {
    filter.push({
      column: 'entry_type',
      operator: 'eq',
      value: options.entryType
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
  return useSupabaseQuery<DiaryEntry>({
    table: 'diary_entries',
    filter,
    orderBy: {
      column: 'date',
      ascending: false
    },
    pagination: options.pagination,
    fetchOnMount: options.fetchOnMount
  });
}
