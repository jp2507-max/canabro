'use client';

import { Database, Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';

import { OptimizedIcon } from './ui/OptimizedIcon';
import ThemedText from './ui/ThemedText';
import { useTheme } from '../lib/contexts/ThemeContext';
import { Plant as WDBPlant } from '../lib/models/Plant'; // Renamed to WDBPlant to avoid conflict

// Import the new PlantCard and its data interface
import { PlantCard, Plant as PlantCardData } from './my-plants/PlantCard';

interface PlantListComponentProps {
  plants: WDBPlant[];
  isLoading: boolean;
  onCountChange?: (count: number) => void;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  refreshing?: boolean;
  onRefresh?: () => void;
}

// This function will now use real data from WDBPlant for status fields
const getPlantCardData = (plant: WDBPlant, isDarkMode: boolean): PlantCardData => {
  // const idNum = parseInt(plant.id.slice(-2), 16); // No longer needed for mock data generation
  return {
    id: plant.id,
    name: plant.name,
    strainName: plant.strain || 'Unknown Strain', 
    imageUrl: plant.imageUrl || '', 
    // Use real data, providing defaults if optional fields are undefined
    healthPercentage: plant.healthPercentage ?? 75, // Default to 75% if undefined
    nextWateringDays: plant.nextWateringDays ?? 3,  // Default to 3 days if undefined
    nextNutrientDays: plant.nextNutrientDays ?? 7, // Default to 7 days if undefined
  };
};

// Updated EmptyPlantList Component
const EmptyPlantList = () => {
  const { theme, isDarkMode } = useTheme();
  return (
    <View className="mt-10 flex-1 items-center justify-center p-6">
      <OptimizedIcon
        name="flower-tulip-outline"
        size={64}
        color={isDarkMode ? theme.colors.neutral[600] : theme.colors.neutral[400]}
      />
      <ThemedText
        className="mt-4 text-center text-lg font-medium"
        lightClassName="text-neutral-700"
        darkClassName="text-neutral-300">
        Keine Pflanzen hier
      </ThemedText>
      <ThemedText
        className="mt-2 px-6 text-center"
        lightClassName="text-neutral-500"
        darkClassName="text-neutral-400">
        Füge deine erste Pflanze zu diesem Standort hinzu.
      </ThemedText>
    </View>
  );
};

// Base component that receives plants as an array
const PlantListComponent = ({
  plants,
  isLoading,
  onCountChange,
  ListHeaderComponent,
  refreshing = false,
  onRefresh,
}: PlantListComponentProps) => {
  const { theme, isDarkMode } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (onCountChange) {
      onCountChange(plants?.length ?? 0);
    }
  }, [plants, onCountChange]);

  if (isLoading) {
    return (
      <View className="mt-10 flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        <ThemedText
          className="mt-3"
          lightClassName="text-neutral-600"
          darkClassName="text-neutral-400">
          Loading plants...
        </ThemedText>
      </View>
    );
  }

  const renderPlantCard = ({ item: wdbPlantItem }: { item: WDBPlant }) => {
    const plantCardData = getPlantCardData(wdbPlantItem, isDarkMode);
    
    return (
      <PlantCard
        plant={plantCardData}
        onPress={(plantId) => router.push(`/plant/${plantId}`)} // Corrected navigation path
      />
    );
  };

  return (
    <FlatList
      data={plants}
      keyExtractor={(item) => item.id}
      renderItem={renderPlantCard}
      ListEmptyComponent={<EmptyPlantList />}
      ListHeaderComponent={ListHeaderComponent}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDarkMode ? theme.colors.neutral[400] : theme.colors.neutral[600]}
            colors={[theme.colors.primary[500]]}
            progressBackgroundColor={
              isDarkMode ? theme.colors.neutral[800] : theme.colors.background
            }
          />
        ) : undefined
      }
      contentContainerStyle={{ 
        flexGrow: 1, 
        paddingTop: ListHeaderComponent ? 0 : 8,
        paddingBottom: 80,
      }} 
    />
  );
};

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
      'next_nutrient_days'
    ]), 
}));

export const EnhancedPlantList = enhance(PlantListComponent);
