'use client';

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'; // Added MaterialCommunityIcons
import { Database, Q } from '@nozbe/watermelondb'; // Added Q
import { withObservables } from '@nozbe/watermelondb/react';
import { Link, router } from 'expo-router'; // Use Link for navigation item
import React, { useEffect } from 'react'; // Added useEffect
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native'; // Added Image, ActivityIndicator

import { useTheme } from '../lib/contexts/ThemeContext'; // Added useTheme
import { Plant } from '../lib/models/Plant';
import ThemedText from './ui/ThemedText'; // Added ThemedText
import ThemedView from './ui/ThemedView'; // Added ThemedView

interface PlantListComponentProps {
  plants: Plant[];
  isLoading: boolean; // Add isLoading prop
  onCountChange?: (count: number) => void; // Callback for plant count
}

// Mock data function for status icons - replace with real data later
const getMockStatus = (plantId: string) => {
  const idNum = parseInt(plantId.slice(-2), 16); // Use plant ID for pseudo-randomness
  return {
    infoPercent: (idNum % 50) + 50, // 50-99%
    waterDays: (idNum % 7) + 1, // 1-7 days
    feedDays: (idNum % 14) + 7, // 7-20 days
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

  // Status Icon Component (Internal to PlantItem or defined outside if reused elsewhere)
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

  return (
    <Link href={`/plant/${plant.id}`} asChild>
      <TouchableOpacity
        className="mb-4 active:opacity-80" // Increased bottom margin
        key={plant.id}
        accessibilityLabel={`View details for plant: ${plant.name}, Strain: ${plant.strain}`}
        accessibilityRole="button">
        <ThemedView
          // Remove border and shadow, adjust padding
          className="flex-row items-center rounded-xl p-3"
          lightClassName="bg-transparent" // Make background transparent or match screen
          darkClassName="bg-transparent">
          {/* Circular Image */}
          <View className="mr-4 h-16 w-16 overflow-hidden rounded-full">
            {plant.imageUrl ? (
              <Image
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
              className="text-lg font-semibold" // Keep font size
              lightClassName="text-neutral-800"
              darkClassName="text-white"
              numberOfLines={1}>
              {plant.name}
            </ThemedText>
            <ThemedText
              className="text-sm" // Keep font size
              lightClassName="text-neutral-600"
              darkClassName="text-neutral-400"
              numberOfLines={1}>
              {plant.strain || 'Unknown Strain'} {/* Add fallback */}
            </ThemedText>
            {/* Status Icons Row */}
            <View className="mt-2 flex-row">
              <StatusIcon
                iconName="information-outline"
                text={`${mockStatus.infoPercent}%`}
                iconColor={theme.colors.primary[500]} // Example color
              />
              <StatusIcon
                  iconName="water-outline"
                  text={`in ${mockStatus.waterDays} Tg.`}
                  iconColor={theme.colors.special.watering} // Use theme's watering color
                 />
                 <StatusIcon
                   iconName="leaf" // Using leaf as a placeholder for fertilizer/nutrition
                   text={`in ${mockStatus.feedDays} Tg.`}
                   iconColor={theme.colors.primary[600]} // Use theme's primary green shade
                 />
            </View>
          </View>

          {/* Right Arrow Icon */}
          <View className="ml-2 p-1">
            <MaterialCommunityIcons
              name="chevron-right"
              size={28} // Slightly larger arrow
              color={isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[400]}
            />
          </View>
        </ThemedView>
      </TouchableOpacity>
    </Link>
  );
});

// Base component that receives plants as an array
const PlantListComponent = ({ plants, isLoading, onCountChange }: PlantListComponentProps) => {
  const { theme } = useTheme(); // Get theme for ActivityIndicator color

  // Report count change when plants array updates
  useEffect(() => {
    if (onCountChange) {
      onCountChange(plants?.length ?? 0);
    }
  }, [plants, onCountChange]);

  if (isLoading) {
    return (
      <View className="mt-10 flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        <ThemedText className="mt-3" lightClassName="text-neutral-600" darkClassName="text-neutral-400">
          Loading plants...
        </ThemedText>
      </View>
    );
  }

  return (
    // Removed outer View flex-1 as FlatList handles layout
    <FlatList
      data={plants}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <PlantItem plant={item} />}
      ListEmptyComponent={<EmptyPlantList />}
      // Make FlatList scrollable if needed, or disable if parent ScrollView handles it
      // scrollEnabled={false} // Example: if parent ScrollView handles scrolling
      contentContainerStyle={{ flexGrow: 1, paddingVertical: 5 }} // Add some padding
    />
  );
};

// Enhanced component with observables
// It now observes the plants query and also passes an isLoading state
export const PlantList = withObservables(
  [],
  ({ database }: { database: Database }) => {
    const plantsObserve = database
      .get<Plant>('plants')
      .query(Q.where('is_deleted', Q.notEq(true))) // Keep the query specific
      .observeWithColumns([ // Observe relevant columns for PlantItem
        'name',
        'strain',
        'imageUrl',
        'created_at', // Needed for mock status potentially
      ]);

    // We need a way to represent the loading state.
    // withObservables doesn't directly provide a loading flag.
    // A common pattern is to initially pass null/undefined or an empty array
    // until the first emission from the observable.
    // Let's pass the observable itself and handle loading in the component.
    // *Correction*: withObservables *does* handle the initial state.
    // It won't render the wrapped component until the observable emits.
    // However, we might want an explicit loading indicator.
    // Let's pass `isLoading` based on whether `plants` is available yet.
    // *Alternative*: We can use a separate state in the parent or enhance `withObservables`.
    // For simplicity here, let's assume the parent handles initial loading if needed,
    // and `PlantListComponent` shows loading based on its prop.
    // The HOC will pass the `plants` array once available.

    return {
      plants: plantsObserve,
      // isLoading: plantsObserve === undefined, // This check won't work as expected here
      // Let's rely on the parent passing an initial loading state or handle inside PlantListComponent
    };
  }
  // We need to map the props correctly. `isLoading` isn't from the observable.
  // Let's simplify the HOC to only provide `plants` and handle loading/count in the parent screen.
  // This avoids complexity in the HOC.
)(
  // Let's redefine the HOC structure slightly
  // The base component will just be PlantListComponent
  PlantListComponent
);

// Re-exporting with a simpler HOC setup for clarity
const enhance = withObservables([], ({ database }: { database: Database }) => ({
  plants: database
    .get<Plant>('plants')
    .query(Q.where('is_deleted', Q.notEq(true)))
    .observeWithColumns(['name', 'strain', 'imageUrl', 'created_at']),
}));

// Apply the HOC to the base component
export const EnhancedPlantList = enhance(PlantListComponent);


// Default export remains the enhanced version for backward compatibility if needed,
// but using EnhancedPlantList might be clearer.
export default EnhancedPlantList;
