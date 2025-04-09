import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import ThemedText from '../../../components/ui/ThemedText';
import ThemedView from '../../../components/ui/ThemedView';
import DiaryEntryItem from '../../../components/diary/DiaryEntryItem'; // Import the new component
import { useTheme } from '../../../lib/contexts/ThemeContext';
import { usePlant } from '../../../lib/hooks/plants/usePlant'; // Restore usePlant
import { useDiaryEntries } from '../../../lib/hooks/diary/useDiaryEntries'; // Import the hook

// Commented placeholder block fully removed

export default function PlantJournalScreen() {
  const { id: routePlantId } = useLocalSearchParams<{ id: string }>(); // Rename to avoid confusion
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  // Fetch plant data using the route ID (which is likely the WatermelonDB ID)
  const { data: plant, loading: isLoadingPlant, error: plantError } = usePlant(routePlantId); // Restore usePlant

  // Removed problematic useEffect block that called the old getStrainData method

  // Fetch diary entries ONLY when the plant data is loaded
  // Use the plant ID directly from the route since that's what the diary entries are linked to
  const { entries, isLoading: isLoadingEntries, error: entriesError } = useDiaryEntries(routePlantId);

  // Ensure routePlantId is valid before proceeding (basic check)
  if (!routePlantId) {
     // Optionally render an error state or redirect
     return (
       <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
         <ThemedView className="flex-1 items-center justify-center">
           <ThemedText>Error: Invalid Plant ID.</ThemedText>
         </ThemedView>
       </SafeAreaView>
     );
  }


  const handleAddNewEntry = () => {
    // Navigate to the create diary entry screen using the route ID
    router.push(`/plant/${routePlantId}/diary/create`);
  };

  const handleGoToPlantDetails = () => {
    // Navigate to the plant detail screen using the route ID
    router.push(`/plant/${routePlantId}`);
  };

  // Display loading indicator while plant data is loading
  if (isLoadingPlant) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ThemedView className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <ThemedText className="mt-2">Loading Plant Info...</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (plantError || !plant) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <Stack.Screen options={{ title: 'Error' }} />
        <ThemedView className="flex-1 items-center justify-center p-4">
          <ThemedText className="text-lg text-status-danger">
            Error loading plant data.
          </ThemedText>
          <ThemedText className="mt-2 text-center">
            {plantError?.message || 'Could not find the specified plant.'}
          </ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          title: plant.name || 'Plant Journal',
          headerRight: () => (
            <TouchableOpacity onPress={handleGoToPlantDetails} className="mr-4">
              <MaterialCommunityIcons
                name="cog-outline" // Using settings icon for plant details for now
                size={24}
                color={isDarkMode ? theme.colors.primary[300] : theme.colors.primary[600]}
              />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        className="flex-1 p-4"
        contentContainerStyle={{ paddingBottom: 100 /* Adjust as needed for FAB */ }}>
        {/* Header Section (Optional - can add more details like days/weeks) */}
        <ThemedView className="mb-4 rounded-lg p-4" lightClassName="bg-neutral-100" darkClassName="bg-neutral-800">
          <ThemedText className="text-xl font-bold">{plant.name}</ThemedText>
          <ThemedText className="text-sm" lightClassName="text-neutral-600" darkClassName="text-neutral-400">
            Strain: {plant.strain || 'N/A'}
            {/* Avoid accessing strainObj directly until relationship is fixed */}
          </ThemedText>
          {/* Add more info like planted date, current stage etc. */}
        </ThemedView>

        {/* Add New Entry Button Area */}
        <TouchableOpacity
          onPress={handleAddNewEntry}
          className="mb-6 flex-row items-center justify-center rounded-full border border-dashed p-4 active:opacity-70"
          style={{
            borderColor: isDarkMode ? theme.colors.primary[600] : theme.colors.primary[400],
          }}>
          <MaterialCommunityIcons
            name="plus-circle-outline"
            size={22}
            color={isDarkMode ? theme.colors.primary[300] : theme.colors.primary[600]}
          />
          <ThemedText
            className="ml-2 text-lg font-medium"
            style={{ color: isDarkMode ? theme.colors.primary[300] : theme.colors.primary[600] }}>
            Add New Entry
          </ThemedText>
          {/* Add small icons for common entry types like in the example */}
        </TouchableOpacity>

        {/* Diary Entry List */}
        <ThemedText className="mb-3 text-lg font-semibold">Journal Entries</ThemedText>
        {isLoadingEntries ? (
          <ActivityIndicator color={theme.colors.primary[500]} />
        ) : entriesError ? (
          <ThemedText className="text-status-danger">Error loading entries.</ThemedText>
        ) : entries.length === 0 ? (
          <ThemedText className="text-center" lightClassName="text-neutral-500" darkClassName="text-neutral-400">
            No journal entries yet. Add one!
          </ThemedText>
        ) : (
          // Render actual entries using DiaryEntryItem
          entries.map((entry) => (
            <DiaryEntryItem key={entry.id} entry={entry} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
