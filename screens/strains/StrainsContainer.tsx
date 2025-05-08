import { useRouter } from 'expo-router';
import React, { useState, useCallback, useMemo } from 'react';
import { View, TouchableOpacity } from 'react-native';

import StrainsView from './StrainsView';

import { ActiveFilters } from '@/components/strains/StrainFilterModal';
import ThemedText from '@/components/ui/ThemedText';
import { useAuth } from '@/lib/contexts/AuthProvider';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { useFavoriteManager } from '@/lib/hooks/strains/useFavoriteManager';
import { useFilteredStrains, usePrefetchStrain } from '@/lib/hooks/strains/useStrainQueries';
import { useProtectedRoute } from '@/lib/hooks/useProtectedRoute';
import { Strain } from '@/lib/types/weed-db';
import { ensureUuid } from '@/lib/utils/uuid';

export function StrainsContainer() {
  // Call all hooks at the top level always
  useProtectedRoute();
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { user } = useAuth();
  const userId = user?.id;
  const prefetchStrain = usePrefetchStrain();

  // State hooks - always at top level
  const [selectedStrainType, setSelectedStrainType] = useState<'sativa' | 'indica' | 'hybrid'>(
    'indica'
  );
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

  // Use the favorite manager hook for all favorites functionality - always at top level
  const {
    favoriteStrainIds,
    toggleFavorite,
    error: favoritesError,
    isLoading: favoritesLoading,
  } = useFavoriteManager();

  // Strains query - always at top level
  const {
    data: strains = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useFilteredStrains(activeFilters, selectedStrainType, searchQuery);

  // Memoized values - always at top level
  const favoriteStrainIdSet = useMemo(
    () =>
      new Set(
        favoriteStrainIds
          .map(ensureUuid)
          .filter((id): id is string => typeof id === 'string' && !!id)
      ),
    [favoriteStrainIds]
  );

  // Event handlers with useCallback - always at top level
  const handleToggleFavorite = useCallback(
    async (strain: any) => {
      // Convert the ID to UUID for Supabase compatibility
      const uuid = ensureUuid(strain.id || strain._id);
      if (!uuid) return;

      // Get the original MongoDB ObjectID
      const originalMongoId =
        strain.originalId || (/^[0-9a-f]{24}$/i.test(strain.id) ? strain.id : undefined);

      try {
        // Pass both UUID and MongoDB ObjectID to ensure proper creation in Supabase
        await toggleFavorite(uuid, {
          name: strain.name,
          originalId: originalMongoId, // Explicitly pass the MongoDB ObjectID
          type:
            strain.type ||
            (strain.genetics?.toLowerCase().includes('sativa')
              ? 'sativa'
              : strain.genetics?.toLowerCase().includes('indica')
                ? 'indica'
                : 'hybrid'),
          description: strain.description,
          effects: Array.isArray(strain.effects) ? strain.effects : [],
          flavors: Array.isArray(strain.flavors) ? strain.flavors : [],
          image: strain.image || strain.imageUrl,
        });
      } catch (err) {
        console.error('[ERROR] Failed to toggle favorite:', err);
      }
    },
    [toggleFavorite]
  );

  const handleApplyFilters = useCallback((newFilters: ActiveFilters) => {
    setActiveFilters(newFilters);
    setIsFilterModalVisible(false);
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleStrainHover = useCallback(
    (strain: Strain) => {
      if (strain.id) {
        prefetchStrain(strain.id);
      }
    },
    [prefetchStrain]
  );

  // Render unauthenticated state
  if (!userId) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <ThemedText className="mb-2 text-center text-xl font-bold">
          User not authenticated
        </ThemedText>
        <ThemedText className="mb-4 text-center text-base">
          Please log in to view strains.
        </ThemedText>
      </View>
    );
  }

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
      <View className="flex-1 items-center justify-center bg-white p-5 dark:bg-zinc-900">
        <ThemedText className="mb-2.5 text-lg font-bold">Something went wrong</ThemedText>
        <ThemedText className="mb-5 text-gray-700 dark:text-gray-300">
          We're having trouble loading the strains catalog.
        </ThemedText>
        <TouchableOpacity className="rounded-lg bg-emerald-400 px-4 py-3" onPress={handleRefresh}>
          <ThemedText className="font-medium text-white">Try Again</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }
}

export default StrainsContainer;
