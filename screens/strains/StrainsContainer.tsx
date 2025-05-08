import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { useProtectedRoute } from '@/lib/hooks/useProtectedRoute';
import { Strain } from '@/lib/types/weed-db';
import { ActiveFilters } from '@/components/strains/StrainFilterModal';
import StrainsView from './StrainsView';
import { useAuth } from '@/lib/contexts/AuthProvider';
import { useFavoriteManager } from '@/lib/hooks/strains/useFavoriteManager';
import { useFilteredStrains, usePrefetchStrain } from '@/lib/hooks/strains/useStrainQueries';
import { View, TouchableOpacity } from 'react-native';
import ThemedText from '@/components/ui/ThemedText';
import { ensureUuid } from '@/lib/utils/uuid';

export function StrainsContainer() {
  useProtectedRoute();
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { user } = useAuth();
  const userId = user?.id;
  const prefetchStrain = usePrefetchStrain();

  if (!userId) return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-black">
      <ThemedText className="text-xl font-bold mb-2 text-center">User not authenticated</ThemedText>
      <ThemedText className="text-base mb-4 text-center">Please log in to view strains.</ThemedText>
    </View>
  );

  // Use the favorite manager hook for all favorites functionality
  const { 
    favoriteStrainIds,
    toggleFavorite,
    error: favoritesError,
    isLoading: favoritesLoading
  } = useFavoriteManager();

  // Always use UUIDs for favorite logic
  const favoriteStrainIdSet = useMemo(
    () => new Set(favoriteStrainIds.map(ensureUuid).filter((id): id is string => typeof id === 'string' && !!id)),
    [favoriteStrainIds]
  );

  // Handle favorite toggle with UUID resolution
  const handleToggleFavorite = useCallback(async (strain: any) => {
    // Convert the ID to UUID for Supabase compatibility
    const uuid = ensureUuid(strain.id || strain._id);
    if (!uuid) return;
    
    // Get the original MongoDB ObjectID
    const originalMongoId = strain.originalId || (/^[0-9a-f]{24}$/i.test(strain.id) ? strain.id : undefined);
    
    try {
      // Pass both UUID and MongoDB ObjectID to ensure proper creation in Supabase
      await toggleFavorite(uuid, {
        name: strain.name,
        originalId: originalMongoId, // Explicitly pass the MongoDB ObjectID
        type: strain.type || (strain.genetics?.toLowerCase().includes('sativa') ? 'sativa' : 
                             strain.genetics?.toLowerCase().includes('indica') ? 'indica' : 'hybrid'),
        description: strain.description,
        effects: Array.isArray(strain.effects) ? strain.effects : [],
        flavors: Array.isArray(strain.flavors) ? strain.flavors : [],
        image: strain.image || strain.imageUrl
      });
    } catch (err) {
      console.error('[ERROR] Failed to toggle favorite:', err);
    }
  }, [toggleFavorite]);

  const [selectedStrainType, setSelectedStrainType] = useState<'sativa' | 'indica' | 'hybrid'>('indica');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    species: null,
    effects: [],
    flavors: [],
    minThc: null,
    maxThc: null,
    minCbd: null,
    maxCbd: null,
  });

  // Use our optimized hook that manages all filtered strain queries
  const {
    data: strains = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useFilteredStrains(activeFilters, selectedStrainType, searchQuery);

  const handleApplyFilters = useCallback((newFilters: ActiveFilters) => {
    setActiveFilters(newFilters);
    setIsFilterModalVisible(false);
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Prefetch strain details when a user hovers over a strain card
  const handleStrainHover = useCallback((strain: Strain) => {
    if (strain.id) {
      prefetchStrain(strain.id);
    }
  }, [prefetchStrain]);

  try {
    return (
      <StrainsView
        router={router}
        theme={theme}
        isDarkMode={isDarkMode}
        selectedStrainType={selectedStrainType}
        setSelectedStrainType={setSelectedStrainType}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isFilterModalVisible={isFilterModalVisible}
        setIsFilterModalVisible={setIsFilterModalVisible}
        strains={strains}
        isLoading={isLoading || favoritesLoading}
        isFetching={isFetching}
        error={error || favoritesError}
        activeFilters={activeFilters}
        setActiveFilters={setActiveFilters}
        handleApplyFilters={handleApplyFilters}
        handleRefresh={handleRefresh}
        favoriteStrainIds={favoriteStrainIdSet}
        onToggleFavorite={handleToggleFavorite}
        onStrainHover={handleStrainHover}
      />
    );
  } catch (err) {
    console.error('[ERROR] StrainsContainer crashed:', err);
    // Simple fallback UI
    return (
      <View className="flex-1 justify-center items-center p-5 bg-white dark:bg-zinc-900">
        <ThemedText className="text-lg font-bold mb-2.5">Something went wrong</ThemedText>
        <ThemedText className="mb-5 text-gray-700 dark:text-gray-300">We're having trouble loading the strains catalog.</ThemedText>
        <TouchableOpacity
          className="bg-emerald-400 px-4 py-3 rounded-lg"
          onPress={handleRefresh}
        >
          <ThemedText className="text-white font-medium">Try Again</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }
}

export default StrainsContainer;
