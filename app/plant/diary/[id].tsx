import { Database, Q } from '@nozbe/watermelondb';
import { withDatabase, withObservables } from '@nozbe/watermelondb/react';
import { format } from 'date-fns';
import { useLocalSearchParams, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useRef } from 'react';
import {
  View,
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OptimizedIcon } from '../../../components/ui/OptimizedIcon';
import ThemedText from '../../../components/ui/ThemedText';
import ThemedView from '../../../components/ui/ThemedView';
// import { isExpoGo } from '../../../lib/config'; // isExpoGo is unused
import { useAuth } from '../../../lib/contexts/AuthProvider';
import useWatermelon from '../../../lib/hooks/useWatermelon';
import { DiaryEntry } from '../../../lib/models/DiaryEntry';
import { Plant } from '../../../lib/models/Plant';

// Simplified interfaces for props
interface PlantDiaryScreenProps {
  plant: Plant | null;
  diaryEntries: DiaryEntry[];
}

// Base component that receives data from withObservables
const PlantDiaryScreenBase = React.memo(function PlantDiaryScreenBase({ plant, diaryEntries }: PlantDiaryScreenProps) {
  const { session } = useAuth();
  const { sync, isSyncing } = useWatermelon();

  const [refreshing, setRefreshing] = useState(false);

  // New entry form state
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [entryTitle, setEntryTitle] = useState('');
  const [entryContent, setEntryContent] = useState('');
  const [entryType, setEntryType] = useState<string>('general');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const contentInputRef = useRef<TextInput>(null);

  // Sort entries by date - newest first
  const sortedEntries = [...diaryEntries].sort((a, b) => {
    return new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime();
  });

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await sync();
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddEntry = async () => {
    if (!plant) return;
    if (!entryContent.trim()) {
      Alert.alert('Error', 'Please enter some content for your diary entry');
      return;
    }

    try {
      setIsSubmitting(true);

      await plant.database.write(async () => {
        const entriesCollection = plant.database.get<DiaryEntry>('diary_entries');
        await entriesCollection.create((entry) => {
          entry.plantId = plant.id;
          entry.content = entryContent.trim();
          entry.entryType = entryType;
          entry.entryDate = new Date().toISOString();
          entry.userId = session?.user?.id || '';
        });
      });

      // Clear form and close it
      setEntryTitle('');
      setEntryContent('');
      setEntryType('general');
      setIsAddingEntry(false);

      // Sync with Supabase
      sync();
    } catch (error) {
      console.error('Error adding diary entry:', error);
      Alert.alert('Error', 'Failed to add diary entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = (entry: DiaryEntry) => {
    Alert.alert('Delete Entry', 'Are you sure you want to delete this diary entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await entry.markAsDeleted();
            sync(); // Sync with Supabase
          } catch (error) {
            console.error('Error deleting entry:', error);
            Alert.alert('Error', 'Failed to delete entry');
          }
        },
      },
    ]);
  };

  // Handle loading state
  if (!plant) {
    return (
      <SafeAreaView className="flex-1">
        <ThemedView variant="default" className="flex-1 items-center justify-center p-4">
          <ActivityIndicator size="large" color="rgb(var(--color-primary-500))" />
          <ThemedText variant="muted" className="mt-4">
            Loading plant diary...
          </ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  // 🎯 Performance optimized render functions
  const keyExtractor = React.useCallback((item: DiaryEntry) => item.id, []);

  const renderDiaryEntryItem = React.useCallback(
    ({ item }: { item: DiaryEntry }) => {
      const entryDate = new Date(item.entryDate);

      // Get entry type styling classes based on type
      const getTypeStyles = (type: string) => {
        switch (type) {
          case 'watering':
            return {
              iconClasses: 'text-special-watering',
              tagClasses: 'bg-blue-100 dark:bg-blue-900',
            };
          case 'feeding':
            return {
              iconClasses: 'text-special-feeding',
              tagClasses: 'bg-purple-100 dark:bg-purple-900',
            };
          case 'pruning':
            return {
              iconClasses: 'text-status-success',
              tagClasses: 'bg-green-100 dark:bg-green-900',
            };
          case 'issue':
            return {
              iconClasses: 'text-status-danger',
              tagClasses: 'bg-red-100 dark:bg-red-900',
            };
          default:
            return {
              iconClasses: 'text-neutral-500',
              tagClasses: 'bg-neutral-100 dark:bg-neutral-800',
            };
        }
      };

      const typeStyles = getTypeStyles(item.entryType);

      return (
        <ThemedView variant="card" className="mb-4">
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <ThemedText variant="heading" className="text-lg">
                {`Entry - ${format(entryDate, 'MMM d, yyyy')}`}
              </ThemedText>

              <View className="mb-2 mt-1 flex-row items-center">
                <ThemedText variant="muted" className="mr-2 text-xs">
                  {format(entryDate, 'MMM d, yyyy • h:mm a')}
                </ThemedText>

                <View className={`rounded-full px-2 py-0.5 ${typeStyles.tagClasses}`}>
                  <ThemedText className={`text-xs font-medium capitalize ${typeStyles.iconClasses}`}>
                    {item.entryType}
                  </ThemedText>
                </View>
              </View>
            </View>

            <Pressable
              onPress={() => handleDeleteEntry(item)}
              className="p-2"
              accessibilityLabel="Delete diary entry">
              <OptimizedIcon name="trash-outline" size={18} color="rgb(var(--color-status-danger))" />
            </Pressable>
          </View>

          <ThemedText className="mt-1">{item.content}</ThemedText>
        </ThemedView>
      );
    },
    [handleDeleteEntry]
  );

  return (
    <>
      <StatusBar style="auto" />
      <Stack.Screen
        options={{
          title: plant?.name ? `${plant.name}'s Diary` : 'Plant Diary',
          headerBackTitle: 'Back',
        }}
      />

      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1">
          <ThemedView variant="default" className="flex-1 p-4 transition-colors">
            {/* Plant Header */}
            <ThemedView variant="card" className="mb-4 flex-row items-center p-4">
              <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
                <OptimizedIcon name="leaf-outline" size={24} className="text-primary-500" />
              </View>
              <View className="flex-1">
                <ThemedText variant="heading">{plant.name}</ThemedText>
                <ThemedText variant="muted">
                  {plant.strain} • {plant.growthStage}
                </ThemedText>
              </View>
            </ThemedView>

            {/* Diary Entries List */}
            <FlatList
              data={sortedEntries}
              renderItem={renderDiaryEntryItem}
              keyExtractor={keyExtractor}
              contentContainerClassName="pb-20"
              refreshControl={
                <RefreshControl
                  refreshing={refreshing || isSyncing}
                  onRefresh={onRefresh}
                  colors={['rgb(var(--color-primary-500))']}
                  tintColor="rgb(var(--color-primary-500))"
                />
              }
              ListEmptyComponent={
                <ThemedView variant="card" className="items-center p-6">
                  <OptimizedIcon
                    name="document-text-outline"
                    size={48}
                    className="text-neutral-300 dark:text-neutral-600"
                  />
                  <ThemedText variant="heading" className="mt-3 text-center">
                    No diary entries yet
                  </ThemedText>
                  <ThemedText variant="muted" className="mt-1 text-center">
                    Start keeping track of your plant's journey by adding your first entry!
                  </ThemedText>
                </ThemedView>
              }
              // ⚡ Performance optimizations for diary entries
              initialNumToRender={8}
              windowSize={10}
              maxToRenderPerBatch={6}
              updateCellsBatchingPeriod={100}
              removeClippedSubviews={true}
            />

            {/* Add Entry Button (visible when not adding entry) */}
            {!isAddingEntry && (
              <View className="absolute bottom-4 right-4">
                <Pressable
                  accessibilityLabel="Add diary entry"
                  className="h-14 w-14 items-center justify-center rounded-full bg-primary-500 shadow-xl transition-colors"
                  onPress={() => {
                    setIsAddingEntry(true);
                    setTimeout(() => {
                      contentInputRef.current?.focus();
                    }, 100);
                  }}
                  style={({ pressed }) => [
                    {
                      backgroundColor: pressed
                        ? 'rgb(var(--color-primary-600))'
                        : 'rgb(var(--color-primary-500))',
                      elevation: 4,
                    },
                  ]}>
                  <OptimizedIcon name="add" size={28} color="white" />
                </Pressable>
              </View>
            )}

            {/* Add Entry Form (shown when isAddingEntry is true) */}
            {isAddingEntry && (
              <ThemedView
                className="absolute bottom-0 left-0 right-0 rounded-t-xl border-t border-neutral-200 bg-white p-4 shadow-xl dark:border-neutral-700 dark:bg-neutral-800"
                style={[{ elevation: 8 }]}>
                <View className="mb-3 flex-row items-center justify-between">
                  {' '}
                  <ThemedText className="text-lg font-bold">New Diary Entry</ThemedText>
                  <Pressable
                    accessibilityLabel="Close entry form"
                    onPress={() => {
                      setIsAddingEntry(false);
                      setEntryTitle('');
                      setEntryContent('');
                      setEntryType('general');
                    }}>
                    <OptimizedIcon
                      name="close"
                      size={24}
                      className="text-neutral-500 dark:text-neutral-400"
                    />
                  </Pressable>
                </View>

                {/* Entry Type Selection */}
                <ScrollableEntryTypeSelector selectedType={entryType} onSelect={setEntryType} />

                {/* Entry Form */}
                <ThemedView className="mb-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-900">
                  <TextInput
                    placeholder="Title (optional)"
                    placeholderTextColor="rgb(var(--color-neutral-400))"
                    value={entryTitle}
                    onChangeText={setEntryTitle}
                    className="mb-1 text-base font-medium text-neutral-900 dark:text-neutral-100"
                  />
                  <TextInput
                    ref={contentInputRef}
                    placeholder="What's happening with your plant today?"
                    placeholderTextColor="rgb(var(--color-neutral-400))"
                    value={entryContent}
                    onChangeText={setEntryContent}
                    multiline
                    numberOfLines={4}
                    className="min-h-[100px] text-base text-neutral-900 dark:text-neutral-100"
                    textAlignVertical="top"
                  />
                </ThemedView>

                {/* Submit Button */}
                <Pressable
                  className="items-center rounded-lg bg-primary-500 py-3 transition-colors"
                  onPress={handleAddEntry}
                  disabled={isSubmitting || !entryContent.trim()}
                  style={({ pressed }) => [
                    {
                      backgroundColor:
                        isSubmitting || !entryContent.trim()
                          ? 'rgb(var(--color-neutral-300))'
                          : pressed
                            ? 'rgb(var(--color-primary-600))'
                            : 'rgb(var(--color-primary-500))',
                    },
                  ]}>
                  {isSubmitting ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <ThemedText className="font-bold text-white">Add Entry</ThemedText>
                  )}
                </Pressable>
              </ThemedView>
            )}
          </ThemedView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
});

// Type selector component for entry form
function ScrollableEntryTypeSelector({
  selectedType,
  onSelect,
}: {
  selectedType: string;
  onSelect: (type: string) => void;
}) {
  const options = [
    { id: 'general', label: 'General', icon: 'document-text-outline' },
    { id: 'watering', label: 'Watering', icon: 'water-outline' },
    { id: 'feeding', label: 'Feeding', icon: 'nutrition-outline' },
    { id: 'pruning', label: 'Pruning', icon: 'cut-outline' },
    { id: 'issue', label: 'Issue', icon: 'warning-outline' },
  ];

  return (
    <View className="-mx-1 mb-3 flex-row">
      {options.map((option) => (
        <Pressable
          key={option.id}
          onPress={() => onSelect(option.id)}
          className={`mx-1 flex-1 items-center justify-center rounded-lg py-2 transition-colors ${
            selectedType === option.id
              ? 'bg-primary-100 dark:bg-primary-900'
              : 'bg-neutral-100 dark:bg-neutral-800'
          }`}>
          <OptimizedIcon
            name={option.icon as any}
            size={20}
            className={
              selectedType === option.id
                ? 'text-primary-500'
                : 'text-neutral-500 dark:text-neutral-400'
            }
          />
          <ThemedText
            className={`mt-1 text-xs ${selectedType === option.id ? 'font-bold' : ''} ${
              selectedType === option.id
                ? 'text-primary-700 dark:text-primary-400'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}>
            {option.label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

// Higher-order component to enhance with database
const PlantDiaryScreenWithDatabase = withDatabase(PlantDiaryScreenBase);

// Enhance with observables
const PlantDiaryScreen = withObservables(
  ['route', 'database'],
  ({ database, route }: { database: Database; route: any }) => {
    const plantId = route?.params?.id;

    if (!plantId || !database) {
      console.error('[PlantDiaryScreen] Missing plantId or database:', {
        plantId,
        hasDb: !!database,
      });
      return {
        plant: null,
        diaryEntries: [],
      };
    }

    try {
      return {
        plant: database.get<Plant>('plants').findAndObserve(plantId),
        diaryEntries: database
          .get<DiaryEntry>('diary_entries')
          .query(Q.where('plant_id', plantId))
          .observe(),
      };
    } catch (error) {
      console.error('[PlantDiaryScreen] Error setting up observables:', error);
      return {
        plant: null,
        diaryEntries: [],
      };
    }
  }
)(PlantDiaryScreenWithDatabase);

// Wrapper component to handle params
export default function PlantDiaryWrapper() {
  const params = useLocalSearchParams();
  const id = params.id as string;
  const { database } = useWatermelon(); // Get database from context

  // Show loading state if database is not ready
  if (!database) {
    return (
      <SafeAreaView className="flex-1">
        <ThemedView className="flex-1 items-center justify-center bg-white p-4 dark:bg-neutral-900">
          <ActivityIndicator size="large" color="rgb(var(--color-primary-500))" />
          <ThemedText className="mt-4 text-center text-neutral-600 dark:text-neutral-400">
            Loading plant data...
          </ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return <PlantDiaryScreen route={{ params: { id } }} database={database} />;
}
