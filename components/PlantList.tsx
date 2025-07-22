'use client';

import { Database, Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import { useSafeRouter } from '@/lib/hooks/useSafeRouter';
import React, { useEffect, useMemo } from 'react';
import { View, ActivityIndicator, RefreshControl } from 'react-native';
import { FlashListWrapper } from './ui/FlashListWrapper';

import { PlantCard, Plant as PlantCardData } from './my-plants/PlantCard';
import { OptimizedIcon } from './ui/OptimizedIcon';
import ThemedText from './ui/ThemedText';
import { useTranslation } from 'react-i18next';
import { Plant as WDBPlant } from '../lib/models/Plant'; // Renamed to WDBPlant to avoid conflict
import { usePlantAttention } from '@/lib/hooks/usePlantAttention';

// Import the new PlantCard and its data interface

interface PlantListComponentProps {
  plants: WDBPlant[];
  isLoading: boolean;
  onCountChange?: (count: number) => void;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  refreshing?: boolean;
  onRefresh?: () => void;
  searchQuery?: string;
  filters?: {
    growthStages: string[];
    healthRange: [number, number];
    strainTypes: string[];
    needsAttention: boolean;
    sortBy: 'name' | 'planted_date' | 'health' | 'next_watering';
    sortOrder: 'asc' | 'desc';
  };
}

// This function now only needs the plant data, no theme dependency
const getPlantCardData = (plant: WDBPlant, unknownStrain: string): PlantCardData => {
  return {
    id: plant.id,
    name: plant.name,
    strainName: plant.strain || unknownStrain,
    imageUrl: plant.imageUrl || '',
    // Use real data, providing defaults if optional fields are undefined
    healthPercentage: plant.healthPercentage ?? 75, // Default to 75% if undefined
    nextWateringDays: plant.nextWateringDays ?? 3, // Default to 3 days if undefined
    nextNutrientDays: plant.nextNutrientDays ?? 7, // Default to 7 days if undefined
  };
};

// Updated EmptyPlantList Component - Full NativeWind v4 compliance
const EmptyPlantList = React.memo(() => {
  const { t } = useTranslation();
  return (
    <View className="mt-10 flex-1 items-center justify-center p-6">
      <OptimizedIcon
        name="flower-tulip-outline"
        size={64}
        className="text-neutral-400 dark:text-neutral-600"
      />
      <ThemedText className="mt-4 text-center text-lg font-medium text-neutral-700 dark:text-neutral-300">
        {t('plantList.empty.title')}
      </ThemedText>
      <ThemedText className="mt-2 px-6 text-center text-neutral-500 dark:text-neutral-400">
        {t('plantList.empty.description')}
      </ThemedText>
    </View>
  );
});

EmptyPlantList.displayName = 'EmptyPlantList';

// Base component that receives plants as an array - Optimized with React.memo
const PlantListComponent: React.FC<PlantListComponentProps> = React.memo(
  ({
    plants,
    isLoading,
    onCountChange,
    ListHeaderComponent,
    refreshing = false,
    onRefresh,
    searchQuery = '',
    filters,
  }: PlantListComponentProps) => {
    const router = useSafeRouter();
    const { t } = useTranslation();
    
    // Get attention status for all plants
    const plantIds = useMemo(() => plants.map(plant => plant.id), [plants]);
    const { attentionMap } = usePlantAttention(plantIds);

    // Filter and sort plants
    const filteredAndSortedPlants = useMemo(() => {
      if (!plants || plants.length === 0) return plants;
      
      let filtered = [...plants];

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(plant => 
          plant.name.toLowerCase().includes(query) ||
          (plant.strain && plant.strain.toLowerCase().includes(query))
        );
      }

      // Apply filters
      if (filters) {
        // Growth stage filter
        if (filters.growthStages.length > 0) {
          filtered = filtered.filter(plant => 
            filters.growthStages.includes(plant.growthStage)
          );
        }

        // Health range filter
        filtered = filtered.filter(plant => {
          const health = plant.healthPercentage ?? 75;
          return health >= filters.healthRange[0] && health <= filters.healthRange[1];
        });

        // Strain type filter
        if (filters.strainTypes.length > 0) {
          filtered = filtered.filter(plant => 
            filters.strainTypes.includes(plant.cannabisType || 'unknown')
          );
        }

        // Needs attention filter
        if (filters.needsAttention) {
          filtered = filtered.filter(plant => {
            const attention = attentionMap[plant.id];
            return attention?.needsAttention;
          });
        }
      }

      // Sort plants
      filtered.sort((a, b) => {
        const aAttention = attentionMap[a.id];
        const bAttention = attentionMap[b.id];
        
        // If no specific sort is requested, prioritize attention
        if (!filters?.sortBy || filters.sortBy === 'name') {
          // Priority order: urgent > high > medium > low > no attention
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          
          const aPriority = aAttention?.needsAttention ? priorityOrder[aAttention.priorityLevel] || 0 : 0;
          const bPriority = bAttention?.needsAttention ? priorityOrder[bAttention.priorityLevel] || 0 : 0;
          
          // Sort by priority (highest first), then by name
          if (aPriority !== bPriority) {
            return bPriority - aPriority;
          }
          
          const nameComparison = a.name.localeCompare(b.name);
          return filters?.sortOrder === 'desc' ? -nameComparison : nameComparison;
        }

        // Apply specific sorting
        let comparison = 0;
        switch (filters.sortBy) {
          case 'planted_date':
            comparison = new Date(a.plantedDate).getTime() - new Date(b.plantedDate).getTime();
            break;
          case 'health':
            comparison = (a.healthPercentage ?? 75) - (b.healthPercentage ?? 75);
            break;
          case 'next_watering':
            comparison = (a.nextWateringDays ?? 3) - (b.nextWateringDays ?? 3);
            break;
          default:
            comparison = a.name.localeCompare(b.name);
        }

        return filters.sortOrder === 'desc' ? -comparison : comparison;
      });

      return filtered;
    }, [plants, attentionMap, searchQuery, filters]);

    useEffect(() => {
      if (onCountChange) {
        onCountChange(filteredAndSortedPlants?.length ?? 0);
      }
    }, [filteredAndSortedPlants, onCountChange]);

    const handlePress = React.useCallback(
      (plantId: string) => {
        router.push({
          pathname: '/(app)/plant/[id]',
          params: { id: plantId },
        });
      },
      [router]
    );

    const renderPlantCard = React.useCallback(
      ({ item: wdbPlantItem }: { item: WDBPlant }) => {
        const plantCardData = getPlantCardData(wdbPlantItem, t('plantList.unknownStrain'));

        return (
          <PlantCard 
            plant={plantCardData} 
            onPress={handlePress}
          />
        );
      },
      [handlePress, t, searchQuery]
    );

    const keyExtractor = React.useCallback((item: WDBPlant) => item.id, []);

    if (isLoading) {
      return (
        <View className="mt-10 flex-1 items-center justify-center">
          <ActivityIndicator size="large" className="text-primary-500" />
          <ThemedText className="mt-3 text-neutral-600 dark:text-neutral-400">
            {t('plantList.loading')}
          </ThemedText>
        </View>
      );
    }

    return (
      <FlashListWrapper
        data={filteredAndSortedPlants}
        keyExtractor={keyExtractor}
        renderItem={renderPlantCard}
        ListEmptyComponent={<EmptyPlantList />}
        ListHeaderComponent={ListHeaderComponent}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#a3a3a3" // neutral-400 for universal compatibility
              colors={['#10b981']} // primary-500 for universal compatibility
              progressBackgroundColor="#ffffff" // Will be handled by system for dark mode
            />
          ) : undefined
        }
        estimatedItemSize={120} // Approximate height of PlantCard
        contentContainerStyle={{
          paddingTop: ListHeaderComponent ? 0 : 8,
          paddingBottom: 80,
        }}
      />
    );
  }
);

PlantListComponent.displayName = 'PlantListComponent';

// Enhanced component with observables (ensure observed columns match WDBPlant fields used)
const enhance = withObservables([], ({ database }: { database: Database }) => ({
  plants: database
    .get<WDBPlant>('plants')
    .query(Q.where('is_deleted', Q.notEq(true)))
    .observeWithColumns([
      'name',
      'strain',
      'image_url',
      'health_percentage',
      'next_watering_days',
      'next_nutrient_days',
      'growth_stage',
      'cannabis_type',
      'planted_date',
    ]),
}));

export const EnhancedPlantList = enhance(PlantListComponent);
