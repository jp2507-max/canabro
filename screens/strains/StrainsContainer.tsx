import { useRouter } from 'expo-router';
import React, { useState, useCallback, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import StrainsView from './StrainsView';

import { ActiveFilters } from '@/components/strains/StrainFilterModal';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import ThemedText from '@/components/ui/ThemedText';
import ThemedView from '@/components/ui/ThemedView';
import { useAuth } from '@/lib/contexts/AuthProvider';
import { useFavoriteManager } from '@/lib/hooks/strains/useFavoriteManager';
import { usePrefetchStrain } from '@/lib/hooks/strains/useStrainQueries';
import { useInfiniteStrains } from '@/lib/hooks/strains/useInfiniteStrains';
import { Strain as WeedDbStrain } from '@/lib/types/weed-db';
import { ensureUuid } from '@/lib/utils/uuid';

export function StrainsContainer() {
  // Call all hooks at the top level always
  const router = useRouter();
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
    showFavoritesOnly: false,
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
    data,
    isLoading,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    error,
    refetch,
  } = useInfiniteStrains({
    search: searchQuery,
    species: selectedStrainType,
    activeFilters,
    enabled: true,
  });

  // Flatten pages into a single array
  const strains = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((p) => p.strains);
  }, [data]) as WeedDbStrain[];

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

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleStrainHover = useCallback(
    (strain: WeedDbStrain) => {
      if (strain.id) {
        prefetchStrain(strain.id);
      }
    },
    [prefetchStrain]
  );

  // Render unauthenticated state with proper safe area
  if (!userId) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-black">
        <ThemedView variant="default" className="flex-1 items-center justify-center px-6">
          <ThemedText className="mb-2 text-center text-xl font-bold">
            User not authenticated
          </ThemedText>
          <ThemedText className="mb-4 text-center text-base">
            Please log in to view strains.
          </ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <ErrorBoundary>
      <StrainsView
        router={router}
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
        handleLoadMore={handleLoadMore}
        favoriteStrainIds={favoriteStrainIdSet}
        onToggleFavorite={handleToggleFavorite}
        onStrainHover={handleStrainHover}
        hasMore={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
      />
    </ErrorBoundary>
  );
}

export default StrainsContainer;
