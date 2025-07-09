import { useRouter } from 'expo-router';

import React, { useState, useCallback, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import StrainsView from '../../../screens/strains/StrainsView';

import { ActiveFilters } from '@/components/strains/StrainFilterModal';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import ThemedText from '@/components/ui/ThemedText';
import ThemedView from '@/components/ui/ThemedView';
import { useAuth } from '@/lib/contexts/AuthProvider';
import { useFavoriteManager } from '@/lib/hooks/strains/useFavoriteManager';
import { useInfiniteStrains } from '@/lib/hooks/strains/useInfiniteStrains';
import { Strain as WeedDbStrain } from '@/lib/types/weed-db';
import { ensureUuid } from '@/lib/utils/uuid';

export default function StrainsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id;

  // State hooks
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

  // Use the favorite manager hook for all favorites functionality
  const {
    favoriteStrainIds,
    toggleFavorite,
    error: favoritesError,
    isLoading: favoritesLoading,
  } = useFavoriteManager();

  // Strains query

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

  // Type for StrainQueryResponse
  type StrainQueryResponse = {
    strains: WeedDbStrain[];
    total: number;
    hasMore: boolean;
  };

  // Flatten pages into a single array
  const strains = useMemo(() => {
    const infiniteData = data as unknown as { pages: StrainQueryResponse[] } | undefined;
    if (!infiniteData) return [];
    return infiniteData.pages.flatMap((p: StrainQueryResponse) => p.strains);
  }, [data]) as WeedDbStrain[];

  // Memoized values
  const favoriteStrainIdSet = useMemo(
    () =>
      new Set(
        favoriteStrainIds
          .map(ensureUuid)
          .filter((id): id is string => typeof id === 'string' && !!id)
      ),
    [favoriteStrainIds]
  );

  // Event handlers with useCallback
  const handleStrainTypeChange = useCallback((type: 'sativa' | 'indica' | 'hybrid') => {
    try {
      console.log(`[StrainsScreen] Changing strain type to: ${type}`);
      setSelectedStrainType(type);
    } catch (error) {
      console.error('[StrainsScreen] Error changing strain type:', error);
    }
  }, []);

  const handleToggleFavorite = useCallback(
    async (strainId: string) => {
      // Check if strainId is valid
      if (!strainId || strainId.trim() === '') {
        console.warn('[StrainsScreen] Invalid strain ID provided:', strainId);
        return;
      }

      // Find the strain in our current data
      const strain = strains.find((s) => s.id === strainId);
      if (!strain) {
        console.warn('[StrainsScreen] Strain not found for ID:', strainId);
        return;
      }

      // Convert the ID to UUID for Supabase compatibility
      const uuid = ensureUuid(strain.id);
      if (!uuid) return;

      // Get the original MongoDB ObjectID if available
      const originalMongoId = /^[0-9a-f]{24}$/i.test(strain.id) ? strain.id : undefined;

      try {
        // Pass both UUID and MongoDB ObjectID to ensure proper creation in Supabase
        await toggleFavorite(uuid, {
          name: strain.name,
          originalId: originalMongoId,
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
          image: strain.image || strain.imageUrl || '',
        });
      } catch (err) {
        console.error('[ERROR] Failed to toggle favorite:', err);
      }
    },
    [toggleFavorite, strains]
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

  // Safe router object
  const safeRouter = useMemo(() => ({
    push: (path: string) => {
      try {
        router.push(path as never);
      } catch (error) {
        console.error('[StrainsScreen] Navigation error:', error);
      }
    },
    isReady: true,
  }), [router]);

  // Render unauthenticated state
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
        router={safeRouter}
        selectedStrainType={selectedStrainType}
        setSelectedStrainType={handleStrainTypeChange}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isFilterModalVisible={isFilterModalVisible}
        setIsFilterModalVisible={setIsFilterModalVisible}
        strains={strains}
        isLoading={isLoading || favoritesLoading}
        isFetching={isFetching}
  error={error || (favoritesError instanceof Error ? favoritesError : null)}
        activeFilters={activeFilters}
        setActiveFilters={setActiveFilters}
        handleApplyFilters={handleApplyFilters}
        handleRefresh={handleRefresh}
        handleLoadMore={handleLoadMore}
        favoriteStrainIds={favoriteStrainIdSet}
        onToggleFavorite={handleToggleFavorite}
        isFetchingNextPage={isFetchingNextPage}
      />
    </ErrorBoundary>
  );
}
