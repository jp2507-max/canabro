import * as Localization from 'expo-localization';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ScrollView, ActivityIndicator, View, RefreshControl } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import DiaryEntryItem from '../../../components/diary/DiaryEntryItem';
import JournalCalendar from '../../../components/diary/JournalCalendar';
import { triggerLightHapticSync, triggerMediumHapticSync, triggerMediumHaptic, triggerLightHaptic } from '../../../lib/utils/haptics';
import { OptimizedIcon } from '../../../components/ui/OptimizedIcon';
import ThemedText from '../../../components/ui/ThemedText';
import ThemedView from '../../../components/ui/ThemedView';
import { useDiaryEntries } from '../../../lib/hooks/diary/useDiaryEntries';
import { usePlant } from '../../../lib/hooks/plants/usePlant';
import { DiaryEntry } from '../../../lib/types/diary';

const AnimatedPressable = Animated.createAnimatedComponent(View);

// Helper function to format date with validation
const formatDate = (date: Date): string => {
  // Validate that the date is valid
  if (!date || isNaN(date.getTime())) {
    console.warn('[PlantJournalScreen] Invalid date passed to formatDate:', date);
    return 'Invalid Date';
  }
  
  try {
    return date.toLocaleDateString(Localization.locale, { day: '2-digit', month: 'short' });
  } catch (error) {
    console.error('[PlantJournalScreen] Error formatting date:', error);
    return 'Invalid Date';
  }
};

// Helper function to group entries by date string 'YYYY-MM-DD'
const groupEntriesByDate = (entries: DiaryEntry[]) => {
  return entries.reduce<Record<string, DiaryEntry[]>>(
    (acc, entry) => {
      if (!entry.created_at) {
        return acc;
      }

      const entryDate = new Date(entry.created_at);
      
             // Validate the created date before proceeding
       if (isNaN(entryDate.getTime())) {
         console.warn('[PlantJournalScreen] Invalid created_at date for entry:', entry.id, entry.created_at);
         return acc;
       }

       let dateKey: string;
       try {
         const isoString = entryDate.toISOString().split('T')[0];
         if (!isoString) {
           console.warn('[PlantJournalScreen] Empty date key for entry:', entry.id);
           return acc;
         }
         dateKey = isoString;
       } catch (error) {
         console.error('[PlantJournalScreen] Error converting date to ISO string:', error);
         return acc;
       }

      if (!dateKey) {
        return acc;
      }

      if (!(dateKey in acc)) {
        acc[dateKey] = [];
      }

      acc[dateKey]!.push(entry);

      acc[dateKey]!.sort(
        (a: DiaryEntry, b: DiaryEntry) => {
          const dateA = new Date(a.created_at || '');
          const dateB = new Date(b.created_at || '');
          
          // Handle invalid dates in sorting
          if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
          if (isNaN(dateA.getTime())) return 1;
          if (isNaN(dateB.getTime())) return -1;
          
          return dateB.getTime() - dateA.getTime();
        }
      );

      return acc;
    },
    {} as Record<string, DiaryEntry[]>
  );
};

// Animated header button component
function AnimatedHeaderButton({
  onPress,
  iconName,
  accessibilityLabel,
}: {
  onPress: () => void;
  iconName: string;
  accessibilityLabel: string;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const gesture = Gesture.Tap()
    .onStart(() => {
      scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
      runOnJS(triggerLightHapticSync)();
    })
    .onEnd(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      runOnJS(onPress)();
    });

  return (
    <GestureDetector gesture={gesture}>
      <AnimatedPressable
        style={animatedStyle}
        className="p-2"
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}>
        <OptimizedIcon name={iconName as any} size={24} color={undefined} />
      </AnimatedPressable>
    </GestureDetector>
  );
}

export default function PlantJournalScreen() {
  const { id: routePlantId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    data: plant,
    loading: isLoadingPlant,
    error: plantError,
    refetch: refetchPlant,
  } = usePlant(routePlantId);
  const {
    entries,
    isLoading: isLoadingEntries,
    error: entriesError,
    refetch: refetchEntries,
  } = useDiaryEntries(routePlantId);

  const [refreshing, setRefreshing] = React.useState(false);

  // Animation values for floating action
  const fabScale = useSharedValue(0);
  const fabOpacity = useSharedValue(0);

  useEffect(() => {
    // Animate FAB entrance with delay
    fabScale.value = withDelay(800, withSpring(1, { damping: 15, stiffness: 300 }));
    fabOpacity.value = withDelay(800, withSpring(1, { damping: 20, stiffness: 300 }));
  }, []);

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
    opacity: fabOpacity.value,
  }));

  // Handle refresh - properly wire to actual loading states
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    triggerMediumHaptic();

    try {
      // Execute both refetch functions in parallel
      await Promise.all([refetchPlant(), refetchEntries()]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchPlant, refetchEntries]);

  // Basic validation
  if (!routePlantId) {
    return (
      <ThemedView variant="default" className="flex-1 items-center justify-center p-4">
        <Animated.View entering={FadeIn.duration(600)}>
          <ThemedText variant="default" className="text-status-danger text-lg">
            Error: Invalid Plant ID.
          </ThemedText>
        </Animated.View>
      </ThemedView>
    );
  }

  const handleAddNewEntry = () => {
    triggerMediumHaptic();
    router.push(`/plant/${routePlantId}/diary/create`);
  };

  const handleGoToSettings = () => {
    triggerLightHaptic();
    console.log('Navigate to plant settings');
  };

  const handleExport = () => {
    triggerLightHaptic();
    console.log('Export journal');
  };

  // Loading state
  if (isLoadingPlant) {
    return (
      <ThemedView variant="default" className="flex-1 items-center justify-center">
        <Animated.View entering={FadeIn.duration(400)} className="items-center">
          <ActivityIndicator size="large" className="text-primary-500" />
          <ThemedText variant="muted" className="mt-4 text-center">
            Loading Plant Info...
          </ThemedText>
        </Animated.View>
      </ThemedView>
    );
  }

  // Error state
  if (plantError || !plant) {
    return (
      <ThemedView variant="default" className="flex-1 items-center justify-center p-4">
        <Stack.Screen
          options={{
            title: 'Error',
            headerStyle: { backgroundColor: 'transparent' },
            headerTintColor: undefined,
          }}
        />
        <Animated.View entering={FadeIn.duration(600)} className="items-center">
          <OptimizedIcon name="help-circle" size={48} color="#ef4444" />
          <ThemedText variant="default" className="text-status-danger text-center text-lg">
            Error loading plant data.
          </ThemedText>
          <ThemedText variant="muted" className="mt-2 text-center">
            {plantError?.message || 'Could not find the specified plant.'}
          </ThemedText>
        </Animated.View>
      </ThemedView>
    );
  }

  // Main component render
  return (
    <ThemedView variant="default" className="flex-1">
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: 'transparent' },
          headerTintColor: undefined,
          headerTitle: () => (
            <Animated.View
              entering={SlideInDown.delay(200).duration(600)}
              className="flex-row items-center">
              <OptimizedIcon name="leaf-outline" size={22} color="#10b981" />
              <ThemedText className="ml-2 text-lg font-extrabold">
                {plant?.name || 'Plant Journal'}
              </ThemedText>
            </Animated.View>
          ),
          headerRight: () => (
            <Animated.View
              entering={SlideInDown.delay(400).duration(600)}
              className="flex-row items-center space-x-2">
              <AnimatedHeaderButton
                onPress={handleGoToSettings}
                iconName="settings-outline"
                accessibilityLabel="Plant settings"
              />
              <AnimatedHeaderButton
                onPress={handleExport}
                iconName="share-outline"
                accessibilityLabel="Export journal"
              />
            </Animated.View>
          ),
          headerShadowVisible: false,
        }}
      />

      <SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1 }}>
        {/* Journal Calendar with entrance animation */}
        <Animated.View entering={FadeInDown.delay(300).duration(600)}>
          <JournalCalendar />
        </Animated.View>

        <ScrollView
          className="flex-1 px-4 pt-4"
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={undefined}
              colors={['#10b981']}
              progressBackgroundColor="transparent"
            />
          }>
          {/* Diary Entry Timeline */}
          {isLoadingEntries ? (
            <Animated.View
              entering={FadeIn.delay(400).duration(600)}
              className="flex-1 items-center justify-center py-20">
              <ActivityIndicator className="text-primary-500" />
              <ThemedText variant="muted" className="mt-4">
                Loading entries...
              </ThemedText>
            </Animated.View>
          ) : entriesError ? (
            <Animated.View
              entering={FadeIn.delay(400).duration(600)}
              className="flex-1 items-center justify-center py-20">
              <OptimizedIcon name="help-circle" size={40} color="#ef4444" />
              <ThemedText className="text-status-danger text-center">
                Error loading entries.
              </ThemedText>
            </Animated.View>
          ) : entries.length === 0 ? (
            <Animated.View
              entering={FadeInDown.delay(500).duration(800)}
              className="mt-20 items-center">
              <View className="mb-8 items-center">
                <View className="mb-4 rounded-full bg-neutral-100 p-6 dark:bg-neutral-800">
                  <OptimizedIcon name="document-text-outline" size={48} color="#9ca3af" />
                </View>
                <ThemedText variant="heading" className="mb-2 text-center text-xl font-extrabold">
                  No journal entries yet
                </ThemedText>
                <ThemedText variant="muted" className="max-w-sm text-center">
                  Start tracking your plant's journey and watch it grow!
                </ThemedText>
              </View>

              {/* Enhanced Add Entry Button */}
              <GestureDetector
                gesture={Gesture.Tap()
                  .onStart(() => {
                    runOnJS(triggerMediumHapticSync)();
                  })
                  .onEnd(() => {
                    runOnJS(handleAddNewEntry)();
                  })}>
                <AnimatedPressable
                  className="flex-row items-center rounded-2xl bg-primary-500 px-8 py-4 shadow-lg dark:bg-primary-600"
                  accessibilityRole="button"
                  accessibilityLabel="Add first journal entry">
                  <OptimizedIcon name="add-outline" size={20} color="white" />
                  <ThemedText className="ml-2 text-base font-bold text-white">
                    Add First Entry
                  </ThemedText>
                </AnimatedPressable>
              </GestureDetector>
            </Animated.View>
          ) : (
            // Render grouped entries with staggered animations
            Object.entries(groupEntriesByDate(entries))
              .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
              .map(([dateKey, dayEntries], dayIndex) => (
                <Animated.View
                  key={dateKey}
                  entering={FadeInDown.delay(600 + dayIndex * 100).duration(600)}
                  className="mb-6">
                  {/* Day Header */}
                  <View className="mb-4 flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className="mr-4 h-3 w-3 rounded-full bg-primary-500 shadow-sm dark:bg-primary-600" />
                      <ThemedText variant="heading" className="text-lg font-extrabold">
                        Day {dayIndex + 1}
                      </ThemedText>
                    </View>
                    <ThemedText variant="muted" className="text-sm font-medium">
                      {formatDate(new Date(dateKey))}
                    </ThemedText>
                  </View>

                  {/* Entries for the day */}
                  <View className="ml-[5px] border-l-2 border-neutral-300 pl-6 dark:border-neutral-600">
                    {dayEntries.map((entry, entryIndex) => (
                      <View
                        key={entry.id}
                        className={entryIndex < dayEntries.length - 1 ? 'mb-4' : ''}>
                        <DiaryEntryItem entry={entry} />
                      </View>
                    ))}

                    {/* Add Entry Section */}
                    <GestureDetector
                      gesture={Gesture.Tap()
                        .onStart(() => {
                          runOnJS(triggerLightHapticSync)();
                        })
                        .onEnd(() => {
                          runOnJS(handleAddNewEntry)();
                        })}>
                      <AnimatedPressable
                        className="-ml-6 mt-4 flex-row items-center rounded-xl p-3 active:opacity-70"
                        accessibilityRole="button"
                        accessibilityLabel="Add new journal entry">
                        <View className="mr-3 h-3 w-3 rounded-full border-2 border-primary-500 bg-primary-100 dark:border-primary-400 dark:bg-primary-800" />
                        <ThemedText className="text-base font-bold text-primary-600 dark:text-primary-400">
                          + Add Entry
                        </ThemedText>
                        <View className="ml-3 flex-row space-x-2">
                          <View className="rounded bg-neutral-200 p-1 dark:bg-neutral-700">
                            <OptimizedIcon name="reader-outline" size={14} color="#6b7280" />
                          </View>
                          <View className="rounded bg-neutral-200 p-1 dark:bg-neutral-700">
                            <OptimizedIcon name="water-outline" size={14} color="#6b7280" />
                          </View>
                          <View className="rounded bg-neutral-200 p-1 dark:bg-neutral-700">
                            <OptimizedIcon name="camera-outline" size={14} color="#6b7280" />
                          </View>
                        </View>
                      </AnimatedPressable>
                    </GestureDetector>
                  </View>
                </Animated.View>
              ))
          )}
        </ScrollView>

        {/* Floating Action Button with sophisticated animation */}
        {entries.length > 0 && (
          <Animated.View style={[fabAnimatedStyle]} className="absolute bottom-6 right-6">
            <GestureDetector
              gesture={Gesture.Tap()
                .onStart(() => {
                  fabScale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
                  runOnJS(triggerMediumHapticSync)();
                })
                .onEnd(() => {
                  fabScale.value = withSpring(1, { damping: 15, stiffness: 300 });
                  runOnJS(handleAddNewEntry)();
                })}>
              <AnimatedPressable
                className="elevation-4 h-14 w-14 items-center justify-center rounded-full bg-primary-500 shadow-lg dark:bg-primary-600"
                accessibilityRole="button"
                accessibilityLabel="Add new journal entry">
                <OptimizedIcon name="add" size={28} color="white" />
              </AnimatedPressable>
            </GestureDetector>
          </Animated.View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}
