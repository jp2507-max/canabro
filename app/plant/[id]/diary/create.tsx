import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native'; // Removed SafeAreaView, added View
// Removed DiaryEntryForm import

import EntryTypeSelector, { DiaryEntryType } from '../../../../components/diary/EntryTypeSelector';
import ThemedView from '../../../../components/ui/ThemedView';
import ThemedText from '../../../../components/ui/ThemedText';
import { useTheme } from '../../../../lib/contexts/ThemeContext';

export default function CreateDiaryEntryScreen() {
  const { id: plantId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme, isDarkMode } = useTheme(); // Added isDarkMode

  // Removed selectedEntryType state and related handlers

  const handleNavigateToForm = (type: DiaryEntryType) => {
    // Navigate to a dedicated form screen, passing plantId and type
    // TODO: Define the actual route for the form screen
    console.log(`Navigate to form for type: ${type}, plant: ${plantId}`);
    // Example navigation (adjust route as needed):
    // router.push(`/plant/${plantId}/diary/form?type=${type}`);
  };


  if (!plantId) {
    // Use ThemedView for error state
    return (
      <ThemedView className="flex-1 items-center justify-center p-4" lightClassName="bg-neutral-50" darkClassName="bg-neutral-900">
         <Stack.Screen options={{ title: 'Error', headerStyle: { backgroundColor: isDarkMode ? theme.colors.neutral[900] : theme.colors.neutral[50] }, headerTintColor: isDarkMode ? theme.colors.neutral[100] : theme.colors.neutral[900] }} />
        <ThemedText className="text-lg text-status-danger">Error: Plant ID is missing.</ThemedText>
      </ThemedView>
    );
  }

  return (
    // Use ThemedView for the main container
    <ThemedView className="flex-1" lightClassName="bg-neutral-50" darkClassName="bg-neutral-900">
      <Stack.Screen
        options={{
          title: 'Neuer Eintrag', // Static title from image 4
          headerStyle: {
            backgroundColor: isDarkMode ? theme.colors.neutral[900] : theme.colors.neutral[50],
          },
          headerTintColor: isDarkMode ? theme.colors.neutral[100] : theme.colors.neutral[900],
          headerShadowVisible: false,
          // Add back button customization if needed
        }}
      />
      {/* Use ScrollView directly inside ThemedView */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}>
         {/* Subtitle */}
         <ThemedText className="mb-6 text-base" lightClassName="text-neutral-600" darkClassName="text-neutral-400">
           Wähle eine der folgenden Aktionen aus, um sie in dein Grow-Tagebuch einzutragen
         </ThemedText>

         {/* Render the type selector - it will be modified next */}
         <EntryTypeSelector onSelectType={handleNavigateToForm} />

      </ScrollView>
    </ThemedView>
  );
}
