import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useMemo, useState, useCallback } from 'react';
import { View } from 'react-native';

import StrainsView from './StrainsView';

import { ActiveFilters } from '@/components/strains/StrainFilterModal';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import ThemedText from '@/components/ui/ThemedText';
import { useAuth } from '@/lib/contexts/AuthProvider';
import { useFavoriteManager } from '@/lib/hooks/strains/useFavoriteManager';
import { WeedDbService } from '@/lib/services/weed-db.service';
import { Strain } from '@/lib/types/weed-db';
import { isObjectId } from '@/lib/utils/strainIdMapping';
import { logger } from '@/lib/config/production';
import { ensureUuid } from '@/lib/utils/uuid';

/**
 * Custom hook to fetch and filter favorite strains, using MongoDB ObjectIds for API calls
 */
function useFavoriteStrains(
  favoriteData: {
    favoriteStrainIds: string[];
    favoriteStrainIdPairs: { uuid: string; objectId?: string }[];
    getObjectId: (uuid: string) => string | null;
  },
  searchQuery: string,
  activeFilters: ActiveFilters,
  selectedStrainType: 'sativa' | 'indica' | 'hybrid'
) {
  const { favoriteStrainIds, favoriteStrainIdPairs, getObjectId } = favoriteData;

  return useQuery<Strain[]>({
    queryKey: [
      'userFavoriteStrains',
      favoriteStrainIds,
      searchQuery,
      activeFilters,
      selectedStrainType,
    ],
    queryFn: async () => {
      if (!favoriteStrainIds.length) return [];

      logger.log(`[DEBUG] Fetching ${favoriteStrainIds.length} favorite strains`);

      // Map of UUID to fetched strain for deduplication
      const strainMap = new Map<string, Strain>();

      // Batch process to avoid too many concurrent API calls
      const batchSize = 10;
      const batches = Math.ceil(favoriteStrainIdPairs.length / batchSize);

      for (let i = 0; i < batches; i++) {
        const batchStart = i * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, favoriteStrainIdPairs.length);
        const batch = favoriteStrainIdPairs.slice(batchStart, batchEnd);

        // Process each strain ID in this batch
        await Promise.all(
          batch.map(async ({ uuid, objectId }) => {
            try {
              // Always prefer the MongoDB ObjectId for API calls if available
              const apiId =
                objectId && isObjectId(objectId)
                  ? objectId // Use MongoDB ObjectId if available (preferred)
                  : getObjectId(uuid) || uuid; // Try to resolve or fallback to UUID

              logger.log(`[DEBUG] Fetching strain ${uuid} with API ID ${apiId}`);

              const result = await WeedDbService.getById(apiId);

              if (result) {
                // Ensure UUID is preserved for consistent referencing
                const enrichedResult = {
                  ...result,
                  uuid, // Preserve UUID
                  originalId: apiId, // Preserve original MongoDB ID
                };
                strainMap.set(uuid, enrichedResult);
              }
            } catch (error) {
              logger.error(`Error fetching strain by ID ${uuid}:`, error);
            }
          })
        );
      }

      // Convert the map to an array
      let filtered = Array.from(strainMap.values());

      logger.log(`[DEBUG] Retrieved ${filtered.length} favorite strains before filtering`);

      // Apply search query filter
      if (searchQuery) {
        filtered = filtered.filter((strain) =>
          strain.name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // Apply strain type filter (indica, sativa, hybrid) - using a more flexible approach
      if (selectedStrainType) {
        filtered = filtered.filter((strain) => {
          // Get type from multiple possible sources
          const strainType = (strain.type || '').toLowerCase();
          const genetics = (strain.genetics || '').toLowerCase();

          // Check if the strain matches the selected type
          if (strainType === selectedStrainType) return true;

          // For hybrid type
          if (
            selectedStrainType === 'hybrid' &&
            (genetics.includes('hybrid') ||
              (genetics.includes('indica') && genetics.includes('sativa')) ||
              strainType.includes('hybrid'))
          ) {
            return true;
          }

          // For indica type
          if (
            selectedStrainType === 'indica' &&
            ((genetics.includes('indica') && !genetics.includes('sativa')) ||
              genetics.includes('indica dominant') ||
              strainType.includes('indica'))
          ) {
            return true;
          }

          // For sativa type
          if (
            selectedStrainType === 'sativa' &&
            ((genetics.includes('sativa') && !genetics.includes('indica')) ||
              genetics.includes('sativa dominant') ||
              strainType.includes('sativa'))
          ) {
            return true;
          }

          return false;
        });
      }

      // Apply effects filter
      if (activeFilters.effects.length) {
        filtered = filtered.filter((strain) => {
          // Fixed: Use 'effects' property consistently instead of 'effect'
          const effects = Array.isArray(strain.effects) ? strain.effects : [];
          return activeFilters.effects.every((effect) =>
            effects.some((e: string) => e.toLowerCase().includes(effect.toLowerCase()))
          );
        });
      }

      // Apply flavors filter
      if (activeFilters.flavors.length) {
        filtered = filtered.filter((strain) => {
          // Fixed: Use just 'flavors' property as 'smellAndFlavour' doesn't exist on the Strain type
          const flavors = Array.isArray(strain.flavors) ? strain.flavors : [];
          return activeFilters.flavors.every((flavor) =>
            flavors.some((f: string) => f.toLowerCase().includes(flavor.toLowerCase()))
          );
        });
      }

      // Apply THC content range filter
      if (
        activeFilters.minThc !== null &&
        activeFilters.maxThc !== null &&
        typeof activeFilters.minThc === 'number' &&
        typeof activeFilters.maxThc === 'number'
      ) {
        filtered = filtered.filter(
          (strain) =>
            typeof strain.thc === 'number' &&
            strain.thc >= (activeFilters.minThc || 0) &&
            strain.thc <= (activeFilters.maxThc || 100)
        );
      }

      logger.log(`[DEBUG] Returning ${filtered.length} favorite strains after filtering`);
      return filtered;
    },
    enabled: favoriteStrainIds.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    retry: 1,
  });
}

/**
 * Favorite strains screen component
 */
export function FavoriteStrainsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id;
  const {
    favoriteStrainIds,
    favoriteStrainIdPairs,
    toggleFavorite,
    getObjectId,
    error: favoritesError,
    isLoading: favoritesLoading,
  } = useFavoriteManager();

  // Create a set of valid UUIDs for favorite strains
  const favoriteStrainIdSet = useMemo(
    () =>
      new Set(
        favoriteStrainIds
          .map(ensureUuid)
          .filter((id): id is string => typeof id === 'string' && !!id)
      ),
    [favoriteStrainIds]
  );

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

  // Use the enhanced hook with both UUID and ObjectId data
  const {
    data: strains = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useFavoriteStrains(
    { favoriteStrainIds, favoriteStrainIdPairs, getObjectId },
    searchQuery,
    activeFilters,
    selectedStrainType
  );

  const handleApplyFilters = (newFilters: ActiveFilters) => {
    setActiveFilters(newFilters);
    setIsFilterModalVisible(false);
    refetch();
  };

  const handleRefresh = useCallback(() => refetch(), [refetch]);

  const handleStrainTypeChange = useCallback((type: 'sativa' | 'indica' | 'hybrid') => {
    setSelectedStrainType(type);
  }, []);

  // Safe router object
  const safeRouter = useMemo(() => ({
    push: (path: string) => {
      try {
        router.push(path as never);
      } catch (error) {
        console.error('[FavoriteStrainsScreen] Navigation error:', error);
      }
    },
    isReady: true,
  }), [router]);

  const handleToggleFavorite = useCallback(
    async (strain: Strain) => {
      const uuid = ensureUuid(strain.id);
      if (!uuid) return;

      // Only pass image if it's a string
      const safeImage = typeof strain.image === 'string' ? strain.image : undefined;

      // Include originalId when toggling favorites if the strain ID is a MongoDB ObjectId
      await toggleFavorite(uuid, {
        name: strain.name,
        type: strain.type,
        description: strain.description,
        effects: strain.effects,
        flavors: strain.flavors,
        image: safeImage,
        originalId: isObjectId(strain.id) ? strain.id : undefined,
      });
    },
    [toggleFavorite]
  );

  if (!userId)
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <ThemedText className="mb-2 text-center text-xl font-bold">
          User not authenticated
        </ThemedText>
        <ThemedText className="mb-4 text-center text-base">
          Please log in to view favorite strains.
        </ThemedText>
      </View>
    );

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
        error={error || favoritesError}
        activeFilters={activeFilters}
        setActiveFilters={setActiveFilters}
        handleApplyFilters={handleApplyFilters}
        handleRefresh={handleRefresh}
        favoriteStrainIds={favoriteStrainIdSet}
        onToggleFavorite={(id) => {
          const strain = strains.find((s) => s.id === id);
          if (strain) handleToggleFavorite(strain);
        }}
      />
    </ErrorBoundary>
  );
}

export default FavoriteStrainsScreen;
