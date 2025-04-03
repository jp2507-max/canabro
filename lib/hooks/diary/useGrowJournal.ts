// import { useAuth } from '../../contexts/AuthProvider'; // useAuth is unused
import { DiaryEntry, GrowJournal, PaginationParams } from '../../types';
import { useSupabaseQuery, useSupabaseItem } from '../supabase';

/**
 * Options for the useGrowJournal hook
 */
interface UseGrowJournalOptions {
  // Optional pagination parameters
  pagination?: PaginationParams;

  // Whether to fetch on mount
  fetchOnMount?: boolean;

  // Whether to include entries
  includeEntries?: boolean;
}

/**
 * Hook for fetching a grow journal with its entries
 */
export function useGrowJournal(journalId: string | null, options: UseGrowJournalOptions = {}) {
  // Fetch the journal details
  const journalQuery = useSupabaseItem<GrowJournal>({
    table: 'grow_journals',
    matchColumn: 'id',
    matchValue: journalId,
    fetchOnMount: options.fetchOnMount,
  });

  // Fetch the journal entries if requested
  const entriesQuery = useSupabaseQuery<DiaryEntry>({
    table: 'diary_entries',
    filter: journalId
      ? [
          {
            column: 'journal_id',
            operator: 'eq',
            value: journalId,
          },
        ]
      : [],
    orderBy: {
      column: 'date',
      ascending: false,
    },
    pagination: options.pagination,
    fetchOnMount: options.fetchOnMount && options.includeEntries,
  });

  return {
    journal: journalQuery.data,
    entries: entriesQuery.data,
    journalLoading: journalQuery.loading,
    entriesLoading: entriesQuery.loading,
    journalError: journalQuery.error,
    entriesError: entriesQuery.error,
    refetchJournal: journalQuery.refetch,
    refetchEntries: entriesQuery.refetch,
  };
}
