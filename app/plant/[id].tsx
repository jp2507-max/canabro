import { Database } from '@nozbe/watermelondb';
import { withDatabase, withObservables } from '@nozbe/watermelondb/react';
import dayjs from 'dayjs'; // For date formatting
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  View, // Keep standard View for specific layout cases if needed
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// NEW IMPORTS for sub-components
import { OptimizedIcon } from '../../components/ui/OptimizedIcon';
import { PlantHeroImage } from '../../components/plant-detail/PlantHeroImage';
import { PlantHeader } from '../../components/plant-detail/PlantHeader';
import { PlantInfoCard } from '../../components/plant-detail/PlantInfoCard';
import { PlantDetailRow } from '../../components/plant-detail/PlantDetailRow';
import { PlantActions } from '../../components/plant-detail/PlantActions';

import StorageImage from '../../components/ui/StorageImage';
import ThemedText from '../../components/ui/ThemedText';
import ThemedView from '../../components/ui/ThemedView';
import { useDatabase } from '../../lib/contexts/DatabaseProvider';
import { useTheme } from '../../lib/contexts/ThemeContext';
import useWatermelon from '../../lib/hooks/useWatermelon';
import { Plant } from '../../lib/models/Plant'; // GrowthStage enum is not exported/used in model
import { colors as themeColors } from '../../lib/theme'; // Import theme colors directly if needed
// PlantImageSection is no longer needed here as PlantHeroImage handles it
// import PlantImageSection from '../../screens/PlantImageSection';
import { formatDate, formatBoolean, formatNumber } from '../../screens/plantHelpers';

// Base component receiving the plant observable
function PlantDetailsScreenBase({ plant }: { plant: Plant | null }) {
  const { sync, database } = useWatermelon();
  const { theme, isDarkMode } = useTheme();

  // ADD THESE LINES FOR DEBUGGING:
  console.log('--- PlantDetailsScreenBase ---');
  if (plant) {
    console.log('Plant ID:', plant.id);
    console.log('Plant Name:', plant.name);
    console.log('Plant Image URL:', plant.imageUrl);
    // You can log the whole plant object if it's not too large, or specific fields
    // console.log('Full plant object:', JSON.stringify(plant, null, 2));
  } else {
    console.log('Plant object is null or undefined.');
  }
  // --- END OF DEBUGGING LINES ---

  const handleDelete = async () => {
    if (!plant) return;
    Alert.alert(
      'Delete Plant',
      'Are you sure you want to delete this plant? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.write(async () => {
                await plant.markAsDeleted(); // Mark for deletion
                // Optionally, permanently delete if needed: await plant.destroyPermanently();
              });
              sync(); // Sync deletion with Supabase
              router.back();
            } catch (error) {
              console.error('Error deleting plant:', error);
              Alert.alert('Error', 'Failed to delete plant');
            }
          },
        },
      ]
    );
  };

  // Loading state
  if (!plant) {
    return (
      <ThemedView
        className="flex-1 items-center justify-center p-4"
        lightClassName="bg-neutral-50"
        darkClassName="bg-neutral-900">
        <ActivityIndicator
          size="large"
          color={isDarkMode ? themeColors.primary[400] : themeColors.primary[500]}
        />
        <ThemedText
          className="mt-4 text-center"
          lightClassName="text-neutral-500"
          darkClassName="text-neutral-400">
          Loading plant details...
        </ThemedText>
        <TouchableOpacity
          className="mt-6 rounded-lg bg-primary-500 px-4 py-2"
          onPress={() => router.back()}
          accessibilityLabel="Go back">
          <ThemedText className="font-medium text-white">Go Back</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  // Plant not found state (after observable resolves to null)
  // This check might be redundant if the loading state already covers plant being null
  // However, it's good for explicit "not found" vs "still loading"
  // For this refactor, we'll assume the initial !plant check is sufficient for loading,
  // and a more specific "not found" could be handled if plant is explicitly null after attempting to load.
  // The HOC wrapper already handles cases where ID is missing or DB is not ready.

  // Render actual content
  return (
    <ThemedView className="flex-1" lightClassName="bg-neutral-50" darkClassName="bg-neutral-900">
      {/* Header Buttons - Placed above ScrollView for fixed positioning */}
      <SafeAreaView edges={['top']} style={{ flex: 0, backgroundColor: 'transparent' }} />
      <ThemedView className="absolute left-0 right-0 top-0 z-10 mt-3 flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity
          className="rounded-full bg-black/40 p-2.5 shadow-md"
          onPress={() => router.back()}
          accessibilityLabel="Go back">
          <OptimizedIcon name="arrow-back" size={26} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
          className="rounded-full bg-black/40 p-2.5 shadow-md"
          onPress={() => router.push(`/plant/${plant.id}/edit`)}
          accessibilityLabel="Edit plant details">
          <OptimizedIcon name="pencil" size={24} color="white" />
        </TouchableOpacity>
      </ThemedView>

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <PlantHeroImage imageUrl={plant.imageUrl} plantId={plant.id} imageHeight={350} />

        <PlantHeader name={plant.name} strain={plant.strain} />

        <View className="px-4">
          {/* Details Card */}
          <PlantInfoCard title="Details">
            <PlantDetailRow label="Planted Date" value={formatDate(plant.plantedDate)} />
            <PlantDetailRow label="Growth Stage" value={plant.growthStage} />
            <PlantDetailRow label="Height" value={formatNumber(plant.height, ' cm')} />
            <PlantDetailRow
              label="Expected Harvest"
              value={formatDate(plant.expectedHarvestDate)}
            />
          </PlantInfoCard>

          {/* Genetics Card */}
          <PlantInfoCard title="Genetics">
            <PlantDetailRow label="Auto Flower" value={formatBoolean(plant.isAutoFlower)} />
            <PlantDetailRow label="Feminized" value={formatBoolean(plant.isFeminized)} />
            <PlantDetailRow label="THC Content" value={formatNumber(plant.thcContent, '%')} />
            <PlantDetailRow label="CBD Content" value={formatNumber(plant.cbdContent, '%')} />
          </PlantInfoCard>

          {/* Notes Card */}
          {plant.notes && plant.notes.trim() !== '' && (
            <PlantInfoCard title="Notes">
              <ThemedText
                className="text-base leading-relaxed"
                lightClassName="text-neutral-700"
                darkClassName="text-neutral-200">
                {plant.notes}
              </ThemedText>
            </PlantInfoCard>
          )}

          {/* Actions Card is now a dedicated component */}
          <PlantActions plantId={plant.id} onDelete={handleDelete} />
        </View>
      </ScrollView>
      {/* Ensure bottom safe area for content that might scroll behind a nav bar if any */}
      <SafeAreaView edges={['bottom']} style={{ flex: 0 }} />
    </ThemedView>
  );
}

// --- HOCs and Wrapper ---

// 1. Enhance with database
const PlantDetailsWithDB = withDatabase(PlantDetailsScreenBase);

// 2. Enhance with observables
const PlantDetailsEnhanced = withObservables(
  ['route', 'database'], // Depend on route and database props
  ({ database, route }: { database: Database; route: any }) => {
    const id = route?.params?.id as string | undefined;

    if (!database || !id) {
      console.error('[withObservables] Database or Plant ID missing.', {
        hasDb: !!database,
        hasId: !!id,
      });
      return { plant: null }; // Return null observable if DB or ID is missing
    }

    try {
      // Observe a single record by ID
      const plantObservable = database.collections.get<Plant>('plants').findAndObserve(id);

      // WORKAROUND: Instead of using the relationship directly, we'll manually fetch the strain
      // This bypasses the relationship issue between 'plants' and 'strains'
      return {
        plant: plantObservable,
      };
    } catch (error) {
      console.error(`[withObservables] Error observing plant with ID ${id}:`, error);
      return { plant: null }; // Return null observable on error
    }
  }
)(PlantDetailsWithDB);

// Wrapper component to handle route params and render the enhanced screen
export default function PlantDetailsWrapper() {
  const params = useLocalSearchParams();
  const id = params.id as string;
  const { database } = useDatabase(); // Get database from context
  const { isDarkMode } = useTheme(); // Get theme info for loading/error states

  // ID Missing State
  if (!id) {
    return (
      <ThemedView
        className="flex-1 items-center justify-center p-4"
        lightClassName="bg-neutral-50"
        darkClassName="bg-neutral-900">
        <OptimizedIcon
          name="help-circle-outline"
          size={48}
          color={isDarkMode ? themeColors.status.warning : themeColors.status.warning}
        />
        <ThemedText
          className="mt-4 text-center text-lg font-semibold"
          lightClassName="text-neutral-800"
          darkClassName="text-neutral-100">
          Missing Information
        </ThemedText>
        <ThemedText
          className="mt-2 text-center"
          lightClassName="text-neutral-600"
          darkClassName="text-neutral-300">
          No Plant ID was provided to view details.
        </ThemedText>
        <TouchableOpacity
          className="mt-6 rounded-lg bg-primary-500 px-4 py-2"
          onPress={() => router.back()}
          accessibilityLabel="Go back">
          <ThemedText className="font-medium text-white">Go Back</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  // Database Loading State
  if (!database) {
    return (
      <ThemedView
        className="flex-1 items-center justify-center p-4"
        lightClassName="bg-neutral-50"
        darkClassName="bg-neutral-900">
        <ActivityIndicator
          size="large"
          color={isDarkMode ? themeColors.primary[400] : themeColors.primary[500]}
        />
        <ThemedText
          className="mt-4 text-center"
          lightClassName="text-neutral-500"
          darkClassName="text-neutral-400">
          Connecting to database...
        </ThemedText>
        <TouchableOpacity
          className="mt-6 rounded-lg bg-primary-500 px-4 py-2"
          onPress={() => router.back()}
          accessibilityLabel="Go back">
          <ThemedText className="font-medium text-white">Go Back</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  // Render the enhanced component, passing route params and database
  // Key prop helps React re-mount if ID changes, ensuring observable updates
  return <PlantDetailsEnhanced key={id} route={{ params: { id } }} database={database} />;
}
