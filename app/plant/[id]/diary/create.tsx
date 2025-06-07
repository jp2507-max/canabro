import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ScrollView } from 'react-native';

import EntryTypeSelector, { DiaryEntryType } from '../../../../components/diary/EntryTypeSelector';
import ThemedText from '../../../../components/ui/ThemedText';
import ThemedView from '../../../../components/ui/ThemedView';

export default function CreateDiaryEntryScreen() {
  const { id: plantId } = useLocalSearchParams<{ id: string }>();

  const handleNavigateToForm = (type: DiaryEntryType) => {
    // Navigate to a dedicated form screen, passing plantId and type
    // TODO: Define the actual route for the form screen
    console.log(`Navigate to form for type: ${type}, plant: ${plantId}`);
    // Example navigation (adjust route as needed):
    // router.push(`/plant/${plantId}/diary/form?type=${type}`);
  };

  if (!plantId) {
    return (
      <ThemedView className="flex-1 items-center justify-center bg-neutral-50 p-4 dark:bg-neutral-900">
        <Stack.Screen
          options={{
            title: 'Error',
            headerStyle: {
              backgroundColor: 'transparent',
            },
            headerShadowVisible: false,
          }}
        />
        <ThemedText className="text-status-danger text-lg">Error: Plant ID is missing.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
      <Stack.Screen
        options={{
          title: 'Neuer Eintrag',
          headerStyle: {
            backgroundColor: 'transparent',
          },
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}>
        <ThemedText className="mb-6 text-base text-neutral-600 dark:text-neutral-400">
          Wähle eine der folgenden Aktionen aus, um sie in dein Grow-Tagebuch einzutragen
        </ThemedText>

        <EntryTypeSelector onSelectType={handleNavigateToForm} />
      </ScrollView>
    </ThemedView>
  );
}
