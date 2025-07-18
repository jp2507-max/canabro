'use client';

import { Database, Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import { useSafeRouter } from '@/lib/hooks/useSafeRouter';
import React, { useEffect, useMemo } from 'react';
import { View, FlatList, ActivityIndicator, RefreshControl } from 'react-native';

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
const PlantListComponent = React.memo(
  ({
    plants,
    isLoading,
    onCountChange,
    ListHeaderComponent,
    refreshing = false,
    onRefresh,
  }: PlantListComponentProps) => {
    const router = useSafeRouter();
    
    // Get attention status for all plants
    const plantIds = useMemo(() => plants.map(plant => plant.id), [plants]);
    const { attentionMap } = usePlantAttention(plantIds);

    useEffect(() => {
      if (onCountChange) {
        onCountChange(plants?.length ?? 0);
      }
    }, [plants, onCountChange]);

    // Sort plants by attention priority
    const sortedPlants = useMemo(() => {
      if (!plants || plants.length === 0) return plants;
      
      return [...plants].sort((a, b) => {
        const aAttention = attentionMap[a.id];
        const bAttention = attentionMap[b.id];
        
        // Priority order: urgent > high > medium > low > no attention
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        
        const aPriority = aAttention?.needsAttention ? priorityOrder[aAttention.priorityLevel] || 0 : 0;
        const bPriority = bAttention?.needsAttention ? priorityOrder[bAttention.priorityLevel] || 0 : 0;
        
        // Sort by priority (highest first), then by name
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        return a.name.localeCompare(b.name);
      });
    }, [plants, attentionMap]);

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

        return <PlantCard plant={plantCardData} onPress={handlePress} />;
      },
      [handlePress, t]
    );

    const keyExtractor = React.useCallback((item: WDBPlant) => item.id, []);

    const getItemLayout = React.useCallback(
      (_data: ArrayLike<WDBPlant> | null | undefined, index: number) => ({
        length: 120, // Approximate height of PlantCard
        offset: 120 * index,
        index,
      }),
      []
    );

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
      <FlatList
        data={sortedPlants}
        keyExtractor={keyExtractor}
        renderItem={renderPlantCard}
        getItemLayout={getItemLayout}
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
        // Reanimated v3 + FlatList optimizations
        initialNumToRender={10}
        windowSize={10}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={100}
        removeClippedSubviews={true}
        // Performance optimizations
        scrollEventThrottle={16}
        contentContainerStyle={{
          flexGrow: 1,
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
    ]),
}));

export const EnhancedPlantList = enhance(PlantListComponent);
