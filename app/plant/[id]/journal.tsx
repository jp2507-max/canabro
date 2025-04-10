import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, TouchableOpacity, ActivityIndicator, View } from 'react-native'; // Removed Text, added View
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'; // Added Ionicons

import ThemedText from '../../../components/ui/ThemedText';
import ThemedView from '../../../components/ui/ThemedView';
import DiaryEntryItem from '../../../components/diary/DiaryEntryItem';
import JournalCalendar from '../../../components/diary/JournalCalendar'; // Import the new calendar component
import { useTheme } from '../../../lib/contexts/ThemeContext';
import { usePlant } from '../../../lib/hooks/plants/usePlant'; // Restore usePlant hook
import { useDiaryEntries } from '../../../lib/hooks/diary/useDiaryEntries';
import { DiaryEntry } from '../../../lib/types/diary'; // Correct import path for the type

// Helper function to format date (adjust format as needed)
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }); // e.g., 26. März
};

// Helper function to group entries by date string 'YYYY-MM-DD'
const groupEntriesByDate = (entries: DiaryEntry[]) => {
  return entries.reduce((acc, entry) => {
    // Use created_at, assuming it's a string or Date parsable by new Date()
    const entryDate = new Date(entry.created_at);
    const dateKey = entryDate.toISOString().split('T')[0]; // 'YYYY-MM-DD'
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(entry);
    // Sort entries within the day by time (newest first) using created_at
    acc[dateKey].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return acc;
  }, {} as Record<string, DiaryEntry[]>);
};


export default function PlantJournalScreen() {
  const { id: routePlantId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  // Restore using usePlant hook
  const { data: plant, loading: isLoadingPlant, error: plantError } = usePlant(routePlantId);
  const { entries, isLoading: isLoadingEntries, error: entriesError } = useDiaryEntries(routePlantId);

  // Basic validation
  if (!routePlantId) {
    // Use theme classes for background
    return (
      <ThemedView className="flex-1 items-center justify-center p-4" lightClassName="bg-neutral-50" darkClassName="bg-neutral-900">
        <ThemedText className="text-lg text-status-danger">Error: Invalid Plant ID.</ThemedText>
      </ThemedView>
    );
  }

  const handleAddNewEntry = () => {
    router.push(`/plant/${routePlantId}/diary/create`);
  };

  const handleGoToSettings = () => {
    // TODO: Implement navigation to plant settings screen
    console.log('Navigate to plant settings');
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export journal');
  };

  // Loading state
  if (isLoadingPlant) {
    // Use theme classes for background
    return (
      <ThemedView className="flex-1 items-center justify-center" lightClassName="bg-neutral-50" darkClassName="bg-neutral-900">
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        {/* Use ThemedText for consistent styling */}
        <ThemedText className="mt-2" lightClassName="text-neutral-600" darkClassName="text-neutral-400">Loading Plant Info...</ThemedText>
      </ThemedView>
    );
  }

  // Error state
  // IMPORTANT: Check for the specific relationship error here if possible,
  // otherwise, any error in plant loading will show this generic message.
  if (plantError || !plant) {
    // Use theme classes for background and header
    return (
      <ThemedView className="flex-1 items-center justify-center p-4" lightClassName="bg-neutral-50" darkClassName="bg-neutral-900">
        <Stack.Screen options={{
            title: 'Error',
            headerStyle: { backgroundColor: isDarkMode ? theme.colors.neutral[900] : theme.colors.neutral[50] },
            headerTintColor: isDarkMode ? theme.colors.neutral[100] : theme.colors.neutral[900]
          }} />
        <ThemedText className="text-lg text-status-danger">
          Error loading plant data.
        </ThemedText>
        {/* Use ThemedText for consistent styling */}
        <ThemedText className="mt-2 text-center" lightClassName="text-neutral-600" darkClassName="text-neutral-400">
          {/* Display the actual error message */}
          {plantError?.message || 'Could not find the specified plant.'}
        </ThemedText>
      </ThemedView>
    );
  }

  // Main component render
  return (
    <ThemedView className="flex-1" darkClassName="bg-neutral-900" lightClassName="bg-neutral-50">
      <Stack.Screen
        options={{
          headerStyle: {
            backgroundColor: isDarkMode ? theme.colors.neutral[900] : theme.colors.neutral[50],
          },
          headerTintColor: isDarkMode ? theme.colors.neutral[100] : theme.colors.neutral[900],
          headerTitle: () => (
            <View className="flex-row items-center">
              {/* TODO: Add plant icon based on type/stage */}
              <Ionicons name="leaf-outline" size={22} color={isDarkMode ? theme.colors.primary[400] : theme.colors.primary[600]} />
              <ThemedText className="ml-2 text-lg font-semibold">
                {/* Access plant name safely */}
                {plant?.name || 'Plant Journal'}
              </ThemedText>
            </View>
          ),
          headerRight: () => (
            <View className="mr-2 flex-row items-center space-x-4">
              <TouchableOpacity onPress={handleGoToSettings}>
                <Ionicons
                  name="settings-outline"
                  size={24}
                  color={isDarkMode ? theme.colors.neutral[400] : theme.colors.neutral[600]}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleExport}>
                <Ionicons
                  name="share-outline" // Using share icon for export/upload
                  size={24}
                  color={isDarkMode ? theme.colors.neutral[400] : theme.colors.neutral[600]}
                />
              </TouchableOpacity>
            </View>
          ),
          headerShadowVisible: false, // Remove shadow like in the example
        }}
      />
      {/* Wrap content in SafeAreaView for insets */}
      <SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1 }}>
        {/* Integrate the JournalCalendar component */}
        <JournalCalendar />

        <ScrollView
          className="flex-1 px-4 pt-4" // Added padding top
          contentContainerStyle={{ paddingBottom: 40 }}>

          {/* Diary Entry Timeline */}
          {isLoadingEntries ? (
            <ActivityIndicator color={theme.colors.primary[500]} />
          ) : entriesError ? (
            <ThemedText className="text-center text-status-danger">Error loading entries.</ThemedText>
          ) : entries.length === 0 ? (
             <View className="mt-10 items-center">
                {/* Use theme colors for icon */}
                <Ionicons name="document-text-outline" size={40} color={isDarkMode ? theme.colors.neutral[600] : theme.colors.neutral[400]} />
                {/* Use ThemedText for consistent styling */}
                <ThemedText className="mt-2 text-center text-lg font-medium" lightClassName="text-neutral-700" darkClassName="text-neutral-300">
                  No journal entries yet.
                </ThemedText>
                 <ThemedText className="text-center" lightClassName="text-neutral-500" darkClassName="text-neutral-400">
                  Start tracking your plant's journey!
                </ThemedText>
                 {/* Add Entry Button for empty state */}
                 <TouchableOpacity
                    onPress={handleAddNewEntry}
                    className="mt-6 flex-row items-center rounded-full px-6 py-3 active:opacity-80"
                    style={{ backgroundColor: theme.colors.primary[500] }}
                  >
                    <Ionicons name="add-circle-outline" size={20} color="white" />
                    <ThemedText className="ml-2 text-base font-semibold text-white">
                      Add First Entry
                    </ThemedText>
                  </TouchableOpacity>
             </View>
          ) : (
            // Render grouped entries
            Object.entries(groupEntriesByDate(entries))
              // Sort days descending (newest first)
              .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
              .map(([dateKey, dayEntries], dayIndex) => (
                <View key={dateKey} className="mb-6">
                  {/* Day Header */}
                  <View className="mb-3 flex-row items-center justify-between">
                    <View className="flex-row items-center">
                       {/* Timeline Circle */}
                       <ThemedView className="mr-3 h-3 w-3 rounded-full" lightClassName="bg-neutral-400" darkClassName="bg-neutral-600" />
                       {/* TODO: Calculate actual day number */}
                       <ThemedText className="text-lg font-bold" lightClassName="text-neutral-800" darkClassName="text-neutral-200">
                         Tag {entries.length - dayIndex * dayEntries.length} {/* Placeholder Day */}
                       </ThemedText>
                    </View>
                    <ThemedText className="text-sm" lightClassName="text-neutral-500" darkClassName="text-neutral-400">
                      {formatDate(new Date(dateKey))}
                    </ThemedText>
                  </View>

                  {/* Entries for the day */}
                  <View className="ml-[5px] border-l-2 pl-6" style={{ borderColor: isDarkMode ? theme.colors.neutral[700] : theme.colors.neutral[300] }}>
                    {dayEntries.map((entry, entryIndex) => (
                      <View key={entry.id} className={entryIndex < dayEntries.length - 1 ? 'mb-4' : ''}>
                         {/* TODO: Redesign DiaryEntryItem to fit timeline */}
                        <DiaryEntryItem entry={entry} />
                      </View>
                    ))}

                    {/* Add Entry Section for the day */}
                    <TouchableOpacity
                      onPress={handleAddNewEntry}
                      className="mt-4 -ml-6 flex-row items-center rounded-lg p-2 active:opacity-70"
                      // Add subtle background on hover/press?
                      >
                       {/* Timeline Circle */}
                       <ThemedView className="mr-3 h-3 w-3 rounded-full border-2" lightClassName="border-primary-500 bg-neutral-50" darkClassName="border-primary-400 bg-neutral-900" />
                       <ThemedText className="text-base font-medium" lightClassName="text-primary-600" darkClassName="text-primary-400">
                         + Eintrag {/* "+ Entry" */}
                       </ThemedText>
                       {/* TODO: Add small icons for common entry types */}
                       <View className="ml-2 flex-row space-x-1">
                          <Ionicons name="reader-outline" size={16} color={isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[500]} />
                          <Ionicons name="water-outline" size={16} color={isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[500]} />
                          {/* Add more icons */}
                       </View>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
