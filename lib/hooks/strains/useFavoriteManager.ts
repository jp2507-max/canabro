import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthProvider';
import { Q } from '@nozbe/watermelondb';
import supabase from '../../supabase';
import { database } from '../../models';
import { FavoriteStrain } from '../../models/FavoriteStrain';
import { addFavoriteStrain, removeFavoriteStrain, getUserFavoriteStrains } from '../../services/favorite-strain-service';
import { ensureUuid } from '../../utils/uuid';
import { getObjectIdFromUuid, isObjectId, isUuid, storeIdMapping } from '../../utils/strainIdMapping';

/**
 * Strain ID data interface with both UUID and MongoDB ObjectId
 */
interface FavoriteStrainIdData {
  uuid: string;
  objectId?: string;
}

interface UseFavoriteManagerResult {
  /**
   * Check if a strain is in the user's favorites
   */
  isFavorite: (strainId: string) => boolean;
  
  /**
   * Toggle a strain's favorite status (add or remove)
   */
  toggleFavorite: (strainId: string, strainData?: {
    name?: string;
    type?: string;
    description?: string | string[];
    effects?: string[];
    flavors?: string[];
    image?: string;
    originalId?: string; // MongoDB ObjectId
  }) => Promise<void>;
  
  /**
   * Get all favorited strain IDs (UUIDs)
   */
  favoriteStrainIds: string[];
  
  /**
   * Get all favorited strain IDs with their MongoDB ObjectIds
   * This is useful for API calls that require the original ObjectId
   */
  favoriteStrainIdPairs: FavoriteStrainIdData[];
  
  /**
   * Loading state for favorite operations
   */
  isLoading: boolean;
  
  /**
   * Error state for favorite operations
   */
  error: Error | null;
  
  /**
   * Refresh the favorites list
   */
  refreshFavorites: () => Promise<void>;
  
  /**
   * Get MongoDB ObjectId for a UUID if available
   */
  getObjectId: (uuid: string) => string | null;
}

/**
 * Hook to manage user's favorite strains using both Supabase and local WatermelonDB
 * Supports mapping between UUID and MongoDB ObjectId formats for API compatibility
 */
export function useFavoriteManager(): UseFavoriteManagerResult {
  const { session } = useAuth();
  const userId = session?.user?.id;
  
  const [favoriteStrainIds, setFavoriteStrainIds] = useState<string[]>([]);
  const [favoriteStrainIdPairs, setFavoriteStrainIdPairs] = useState<FavoriteStrainIdData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Memoize favorites Set for O(1) lookups
  const favoritesSet = useMemo(
    () => new Set(favoriteStrainIds),
    [favoriteStrainIds]
  );

  /**
   * Check if a strain is in the user's favorites - O(1) lookup with Set
   */
  const isFavorite = useCallback((strainId: string): boolean => {
    if (!strainId) return false;
    
    // Direct check using original ID
    if (favoritesSet.has(strainId)) return true;
    
    // Convert to UUID for consistent comparison
    const uuid = ensureUuid(strainId);
    if (!uuid) return false;
    
    // Check UUID in the favorites set
    if (favoritesSet.has(uuid)) return true;
    
    // Check all favorited strains in case there's a UUID match
    for (const favoriteId of favoritesSet) {
      // Convert each favorite ID to UUID for comparison
      const favoriteUuid = ensureUuid(favoriteId);
      if (favoriteUuid && favoriteUuid === uuid) return true;
    }
    
    return false;
  }, [favoritesSet]);

  /**
   * Fetch all favorite strains for the current user
   * Enhanced to handle missing ObjectIds by resolving them from the API when possible
   */
  const fetchFavorites = useCallback(async () => {
    if (!userId) {
      setFavoriteStrainIds([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Get favorites from service (local database)
      const strainIds = await getUserFavoriteStrains(userId);
      
      // Then try to sync with remote if we're online
      try {
        // Refresh the session first for reliable auth
        await supabase.auth.refreshSession();
        
        // Fetch from Supabase for most up-to-date data, including ObjectIds
        const { data, error } = await supabase
          .from('user_favorite_strains')
          .select('strain_id, strain_object_id, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
          
        if (error) throw new Error(error.message);
        
        // Extract strain IDs and object IDs
        const remoteStrainIds = data?.map(item => item.strain_id) || [];
        
        // Create ID pairs for strain mappings
        const idPairs: FavoriteStrainIdData[] = data?.map(item => ({
          uuid: item.strain_id,
          objectId: item.strain_object_id
        })) || [];
        
        // Store all ID mappings for future reference
        idPairs.forEach(pair => {
          if (pair.uuid && pair.objectId && isUuid(pair.uuid) && isObjectId(pair.objectId)) {
            storeIdMapping(pair.uuid, pair.objectId);
          }
        });
        
        // Set the ID pairs with original ObjectIds when available
        setFavoriteStrainIdPairs(idPairs);
        
        // Combine local and remote IDs to ensure we have a complete set
        const combinedIds = new Set([...strainIds]);
        
        // Add remote IDs as well
        remoteStrainIds.forEach(id => combinedIds.add(id));
        
        // Also add UUID versions of all strain IDs for consistent lookup
        const withUuids = new Set(combinedIds);
        combinedIds.forEach(id => {
          const uuid = ensureUuid(id);
          if (uuid) withUuids.add(uuid);
        });
        
        setFavoriteStrainIds(Array.from(withUuids));
      } catch (err) {
        console.log('Error fetching remote favorites - using local data:', err);
        setFavoriteStrainIds(strainIds);
        setFavoriteStrainIdPairs(strainIds.map(id => ({ uuid: id })));
      }
    } catch (err) {
      console.error('Error fetching favorite strains:', err);
      setError(err instanceof Error ? err : new Error('Unknown error fetching favorites'));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  /**
   * Toggle a strain's favorite status with optimistic updates
   */
  const toggleFavorite = useCallback(async (
    strainId: string, 
    strainData: {
      name?: string;
      type?: string;
      description?: string | string[];
      effects?: string[];
      flavors?: string[];
      image?: string;
      originalId?: string; // MongoDB ObjectId
    } = {}
  ): Promise<void> => {
    if (!userId || !strainId) {
      throw new Error('User must be logged in and strain ID must be provided');
    }

    try {
      setIsLoading(true);
      setError(null);

      // Check if strain is already a favorite
      const isCurrentlyFavorite = isFavorite(strainId);
      
      // Convert to UUID for consistent operations
      const uuidStrainId = ensureUuid(strainId);
      
      // Determine the ObjectId - either from the parameter or by looking it up
      let objectId = strainData.originalId;
      if (!objectId && isObjectId(strainId)) {
        objectId = strainId; // If strainId is already an ObjectId, use it directly
      }
      
      // Store mapping if we have both formats
      if (uuidStrainId && objectId && isUuid(uuidStrainId) && isObjectId(objectId)) {
        storeIdMapping(uuidStrainId, objectId);
      }
      
      // Log for debugging
      console.log(`[DEBUG] Toggling favorite for strain:`, {
        name: strainData.name,
        originalId: objectId,
        type: strainData.type,
        uuid: uuidStrainId
      });

      // Update local state immediately for responsive UI
      setFavoriteStrainIds(prev => {
        if (isCurrentlyFavorite) {
          return prev.filter(id => id !== strainId && id !== uuidStrainId);
        } else {
          // Ensure we're not adding duplicates
          const newSet = new Set([...prev, strainId]);
          // Also add the UUID version for consistent lookup
          if (uuidStrainId) newSet.add(uuidStrainId);
          return Array.from(newSet);
        }
      });
      
      // Also update ID pairs
      setFavoriteStrainIdPairs(prev => {
        if (isCurrentlyFavorite) {
          return prev.filter(pair => pair.uuid !== strainId && pair.uuid !== uuidStrainId);
        } else {
          return [...prev, { uuid: uuidStrainId || strainId, objectId }];
        }
      });

      // Use the favorite strain service with the enhanced strain creation
      if (isCurrentlyFavorite) {
        await removeFavoriteStrain(userId, strainId);
      } else {
        // Include originalId in the strain data for API calls
        const success = await addFavoriteStrain(userId, strainId, {
          ...strainData,
          originalId: objectId
        });
        
        if (!success) throw new Error('Failed to add favorite strain');
        
        // After successful addition, immediately fetch again for consistent data
        await fetchFavorites();
      }

    } catch (err) {
      console.error('Error toggling favorite strain:', err);
      setError(err instanceof Error ? err : new Error('Unknown error toggling favorite'));
      // Reset state since operation failed
      await fetchFavorites();
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [userId, isFavorite, fetchFavorites]);
  
  /**
   * Get MongoDB ObjectId for a UUID if available
   */
  const getObjectId = useCallback((uuid: string): string | null => {
    // First check our favoriteStrainIdPairs for a matching pair
    const pair = favoriteStrainIdPairs.find(p => p.uuid === uuid);
    if (pair?.objectId) {
      return pair.objectId;
    }
    
    // Otherwise check the global ID mapping
    return getObjectIdFromUuid(uuid);
  }, [favoriteStrainIdPairs]);

  // Load favorites on initial render or when auth state changes
  useEffect(() => {
    if (userId) {
      fetchFavorites();
    } else {
      setFavoriteStrainIds([]);
      setFavoriteStrainIdPairs([]);
    }
  }, [fetchFavorites, userId]);

  return {
    isFavorite,
    toggleFavorite,
    favoriteStrainIds,
    favoriteStrainIdPairs,
    isLoading,
    error,
    refreshFavorites: fetchFavorites,
    getObjectId,
  };
}