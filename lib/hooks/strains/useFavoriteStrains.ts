import { useCallback, useState, useEffect } from 'react'; // Import useState and useEffect
import { PostgrestError } from '@supabase/supabase-js'; // Import PostgrestError

import { useAuth } from '@/lib/contexts/AuthProvider';
import supabase from '@/lib/supabase'; // Default import
import { useSupabaseQuery, useSupabaseMutation } from '@/lib/hooks/supabase';

interface FavoriteStrain {
  user_id: string;
  strain_id: string;
  created_at: string;
}

/**
 * Hook to check if a specific strain is favorited by the current user.
 * @param strainId The ID of the strain to check.
 * @returns An object containing the favorite status, loading state, and error state.
 */
export function useIsStrainFavorite(strainId: string | undefined | null) {
  // --- MOCK IMPLEMENTATION FOR DEVELOPMENT ---
  // TODO: Remove this mock implementation when connecting to real data
  const [isMockFavorite, setIsMockFavorite] = useState(false); // Example mock state
  const [isLoadingMock, setIsLoadingMock] = useState(true);

  useEffect(() => {
    // Simulate instant loading for mock
    setIsLoadingMock(false);
    // Optionally set a mock favorite status, e.g., based on ID
    // setIsMockFavorite(strainId === 'f47ac10b-58cc-4372-a567-0e02b2c3d479'); // Example: Make OG Kush favorite
  }, [strainId]);

  return {
    isFavorite: isMockFavorite,
    isLoading: isLoadingMock, // Use mock loading state
    error: null, // No error in mock
    refetch: async () => { console.log('Mock refetch called'); }, // Mock refetch
  };
  // --- END MOCK IMPLEMENTATION ---

  /* --- REAL IMPLEMENTATION (Commented out for now) ---
  const { user } = useAuth();
  const userId = user?.id;

  const {
    data: favoriteData,
    loading,
    error,
    refetch,
  } = useSupabaseQuery<FavoriteStrain>({
    table: 'user_favorite_strains',
    select: 'strain_id',
    filter: userId && strainId ? [
      { column: 'user_id', operator: 'eq', value: userId },
      { column: 'strain_id', operator: 'eq', value: strainId },
    ] : undefined,
    fetchOnMount: !!userId && !!strainId,
  });

  return {
    isFavorite: favoriteData && favoriteData.length > 0,
    isLoading: loading,
    error,
    refetch,
  };
  */
}

/**
 * Hook to provide functions for adding and removing a favorite strain.
 * Handles refetching the favorite status after mutation.
 */
export function useMutateFavoriteStrain() {
  const { user } = useAuth();
  const userId = user?.id;
  const [isRemoving, setIsRemoving] = useState(false); // Local state for delete loading
  const [removeError, setRemoveError] = useState<PostgrestError | null>(null); // Local state for delete error

  // Use useSupabaseMutation for INSERT
  const addMutation = useSupabaseMutation<FavoriteStrain>({
    table: 'user_favorite_strains',
    type: 'INSERT',
    returning: 'minimal', // Don't need the full row back
    onError: (error) => {
      // Handle potential unique constraint violation (already favorited) gracefully
      if (error.code === '23505') {
        console.warn('Strain already favorited.');
      } else {
        console.error('Error adding favorite strain:', error.message);
      }
    },
  });

  // Handle DELETE manually because useSupabaseMutation doesn't support composite keys well
  const removeFavoriteFn = useCallback(async (strainId: string) => {
    if (!userId) throw new Error('User not authenticated');
    if (!strainId) throw new Error('Strain ID is required');

    setIsRemoving(true);
    setRemoveError(null);
    try {
      const { error } = await supabase
        .from('user_favorite_strains')
        .delete()
        .match({ user_id: userId, strain_id: strainId }); // Use match for composite key

      if (error) {
        console.error('Error removing favorite strain:', error.message);
        setRemoveError(error);
        throw error;
      }
    } catch (err) {
      // Error already logged and state set
    } finally {
      setIsRemoving(false);
    }
  }, [userId]);


  return {
    // Pass the data object needed by the INSERT mutation
    addFavorite: (strainId: string) => {
      if (!userId || !strainId) return Promise.reject('Missing user or strain ID');
      return addMutation.mutate({ user_id: userId, strain_id: strainId });
    },
    removeFavorite: removeFavoriteFn, // Use the manual delete function
    isAdding: addMutation.loading,
    isRemoving: isRemoving, // Use local state for delete loading
    error: addMutation.error || removeError, // Combine errors
  };
}
