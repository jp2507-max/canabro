import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EntryTypeSelector, { DiaryEntryType } from '../../../../components/diary/EntryTypeSelector';
import DiaryEntryForm from '../../../../components/diary/DiaryEntryForm';
import ThemedView from '../../../../components/ui/ThemedView';
import ThemedText from '../../../../components/ui/ThemedText'; // Added import for ThemedText
import { useTheme } from '../../../../lib/contexts/ThemeContext';

export default function CreateDiaryEntryScreen() {
  const { id: plantId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const [selectedEntryType, setSelectedEntryType] = useState<DiaryEntryType | null>(null);

  const handleTypeSelect = (type: DiaryEntryType) => {
    setSelectedEntryType(type);
  };

  const handleCancel = () => {
    // If a type is selected, go back to the type selector, otherwise go back to the journal
    if (selectedEntryType) {
      setSelectedEntryType(null);
    } else {
      router.back();
    }
  };

  const handleSubmitSuccess = () => {
    router.back(); // Go back to the journal screen after successful submission
  };

  // Determine screen title based on state
  const screenTitle = selectedEntryType ? `New ${selectedEntryType} Entry` : 'Select Entry Type';

  if (!plantId) {
    // Handle case where plantId is missing (shouldn't happen with proper routing)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ThemedView className="flex-1 items-center justify-center">
          <ThemedText>Error: Plant ID is missing.</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ title: screenTitle }} />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {!selectedEntryType ? (
          <EntryTypeSelector onSelectType={handleTypeSelect} />
        ) : (
          <DiaryEntryForm
            plantId={plantId}
            entryType={selectedEntryType}
            onSubmitSuccess={handleSubmitSuccess}
            onCancel={handleCancel}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
