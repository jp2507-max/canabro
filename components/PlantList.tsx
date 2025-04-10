'use client';

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Database, Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import { Link, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image, // Keep one Image import for the fallback/placeholder logic
  ActivityIndicator,
  RefreshControl,
} from 'react-native';

import { useTheme } from '../lib/contexts/ThemeContext'; // Corrected path
import { Plant } from '../lib/models/Plant'; // Ensure Plant is imported
import ThemedText from './ui/ThemedText';
import ThemedView from './ui/ThemedView';

interface PlantListComponentProps {
  plants: Plant[];
  isLoading: boolean;
  onCountChange?: (count: number) => void;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  refreshing?: boolean;
  onRefresh?: () => void;
}

// Mock data function for status icons - replace with real data later
const getMockStatus = (plantId: string) => {
  const idNum = parseInt(plantId.slice(-2), 16);
  return {
    infoPercent: (idNum % 50) + 50,
    waterDays: (idNum % 7) + 1,
    feedDays: (idNum % 14) + 7,
  };
};

// Updated EmptyPlantList Component
const EmptyPlantList = () => {
  const { theme, isDarkMode } = useTheme();
  return (
    <View className="mt-10 flex-1 items-center justify-center p-6">
      <MaterialCommunityIcons
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
      {/* Add Plant Button is handled by FAB on the main screen */}
    </View>
  );
};

// Updated PlantItem Component
const PlantItem = React.memo(({ plant }: { plant: Plant }) => {
  const { theme, isDarkMode } = useTheme();
  const mockStatus = getMockStatus(plant.id);

  // Status Icon Component
  const StatusIcon = ({
    iconName,
    text,
    iconColor,
  }: {
    iconName: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
    text: string;
    iconColor: string;
  }) => (
    <View className="mr-2 flex-row items-center rounded-full bg-neutral-200 px-2 py-1 dark:bg-neutral-700">
      <MaterialCommunityIcons name={iconName} size={14} color={iconColor} />
      <Text className="ml-1 text-xs text-neutral-700 dark:text-neutral-300">{text}</Text>
    </View>
  );

  const router = useRouter();

  return (
    <TouchableOpacity
      className="mb-4 active:opacity-80"
      key={plant.id}
      onPress={() => router.push(`/plant/diary/${plant.id}`)} // Reverted path
      accessibilityLabel={`View journal for plant: ${plant.name}, Strain: ${plant.strain}`} // Keep updated accessibility label
      accessibilityRole="button">
      <ThemedView
        className="flex-row items-center rounded-xl p-3"
        lightClassName="bg-transparent"
        darkClassName="bg-transparent">
        {/* Circular Image */}
        <View className="mr-4 h-16 w-16 overflow-hidden rounded-full">
          {plant.imageUrl ? (
            <Image // Using react-native Image here
              source={{ uri: plant.imageUrl }}
              className="h-full w-full"
              resizeMode="cover"
              accessibilityLabel={`Image of ${plant.name}`}
            />
          ) : (
            <View className="h-full w-full items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700">
              <MaterialCommunityIcons
                name="flower-tulip-outline"
                size={32}
                color={isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[400]}
                accessibilityLabel="Placeholder image for plant"
              />
            </View>
          )}
        </View>
        {/* Text Info & Status Icons */}
        <View className="flex-1">
          <ThemedText
            className="text-lg font-semibold"
            lightClassName="text-neutral-800"
            darkClassName="text-white"
            numberOfLines={1}>
            {plant.name}
          </ThemedText>
          <ThemedText
            className="text-sm"
            lightClassName="text-neutral-600"
            darkClassName="text-neutral-400"
            numberOfLines={1}>
            {plant.strain || 'Unknown Strain'}
          </ThemedText>
          {/* Status Icons Row */}
          <View className="mt-2 flex-row">
            <StatusIcon
              iconName="information-outline"
              text={`${mockStatus.infoPercent}%`}
              iconColor={theme.colors.primary[500]}
            />
            <StatusIcon
              iconName="water-outline"
              text={`in ${mockStatus.waterDays} Tg.`}
              iconColor={theme.colors.special.watering}
            />
            <StatusIcon
              iconName="leaf"
              text={`in ${mockStatus.feedDays} Tg.`}
              iconColor={theme.colors.primary[600]}
            />
          </View>
        </View>
        {/* Right Arrow Icon */}
        <View className="ml-2 p-1">
          <MaterialCommunityIcons
            name="chevron-right"
            size={28}
            color={isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[400]}
          />
        </View>
      </ThemedView>
    </TouchableOpacity>
  );
});

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

  return (
    <FlatList
      data={plants}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <PlantItem plant={item} />}
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
      scrollEnabled={true}
      contentContainerStyle={{ flexGrow: 1, paddingVertical: 5, paddingBottom: 80 }}
    />
  );
};

// Enhanced component with observables
const enhance = withObservables([], ({ database }: { database: Database }) => ({
  plants: database
    .get<Plant>('plants')
    .query(Q.where('is_deleted', Q.notEq(true)))
    .observeWithColumns(['name', 'strain', 'imageUrl', 'created_at']), // Added growthStage
}));

export const EnhancedPlantList = enhance(PlantListComponent);

export default EnhancedPlantList;
