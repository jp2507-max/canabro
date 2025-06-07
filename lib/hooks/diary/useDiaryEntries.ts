/**
 * Hook for fetching diary entries
 */

import { useEffect, useState, useCallback } from 'react';

import { useAuth } from '../../contexts/AuthProvider';
import supabase from '../../supabase';
import { DiaryEntry } from '../../types/diary';

/**
 * Hook to fetch diary entries for a specific plant
 */
export function useDiaryEntries(plantId: string | null | undefined) {
  // Allow null/undefined
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { session } = useAuth();

  const fetchEntries = useCallback(async () => {
    if (!plantId || !session?.user) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('diary_entries')
        .select('*')
        .eq('plant_id', plantId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setEntries(data || []);
    } catch (err) {
      console.error('Error fetching diary entries:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch diary entries'));
    } finally {
      setIsLoading(false);
    }
  }, [plantId, session?.user]);

  useEffect(() => {
    fetchEntries();

    if (!plantId || !session?.user) return;

    // Subscribe to changes
    const subscription = supabase
      .channel(`diary_entries_${plantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'diary_entries',
          filter: `plant_id=eq.${plantId}`,
        },
        (payload) => {
          // Handle different events
          if (payload.eventType === 'INSERT') {
            setEntries((prev) => [payload.new as DiaryEntry, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setEntries((prev) =>
              prev.map((entry) =>
                entry.id === payload.new.id ? (payload.new as DiaryEntry) : entry
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setEntries((prev) => prev.filter((entry) => entry.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchEntries]);

  return { entries, isLoading, error, refetch: fetchEntries };
}
