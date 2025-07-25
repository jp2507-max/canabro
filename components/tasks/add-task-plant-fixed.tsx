import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeRouter } from '@/lib/hooks/useSafeRouter';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import useWatermelon from '../../lib/hooks/useWatermelon';
import { PlantTask } from '../../lib/models/PlantTask';
import { isTaskType } from '@/lib/types/taskTypes';
import { Plant } from '../../lib/models/Plant';
import { useColorScheme } from 'nativewind';
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';

// Task type definitions
interface TaskType {
  id: string;
  name: string;
  icon: string;
  colorKey: string;
}

export default function AddTaskToPlantScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useSafeRouter();
  const { database } = useWatermelon();
  const { t } = useTranslation('tasks');

  // Define task types with associated colors and icons
  const TASK_TYPES: TaskType[] = useMemo(
    () => [
      {
        id: 'watering',
        name: t('types.watering'),
        icon: 'water-outline',
        colorKey: '#3b82f6',
      },
      {
        id: 'feeding',
        name: t('types.feeding'),
        icon: 'leaf-outline',
        colorKey: '#8b5cf6',
      },
      {
        id: 'pruning',
        name: t('types.pruning'),
        icon: 'cut-outline',
        colorKey: '#10b981',
      },
      {
        id: 'harvesting',
        name: t('types.harvesting'),
        icon: 'basket-outline',
        colorKey: '#f59e0b',
      },
    ],
    [t]
  );

  const [plants, setPlants] = useState<Plant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlant, setSelectedPlant] = useState<string | null>(null);
  const [selectedTaskType, setSelectedTaskType] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Load plants on component mount
  useEffect(() => {
    loadPlants();
  }, []);
  const loadPlants = useCallback(async () => {
    try {
      setIsLoading(true);
      const plantsCollection = database.get('plants');
      const allPlants = await plantsCollection.query().fetch();
      setPlants(allPlants);
    } catch (error) {
      console.error('Error loading plants:', error);
      Alert.alert(t('error'), t('failedToLoadPlants'));
    } finally {
      setIsLoading(false);
    }
  }, [database]);

  const handleAddTask = useCallback(async () => {
    if (!selectedPlant || !selectedTaskType) {
      Alert.alert(t('error'), t('selectPlantAndTaskType'));
      return;
    }

    try {
      setIsCreating(true);
        await database.write(async () => {
        const tasksCollection = database.get('plant_tasks');
        await tasksCollection.create((task: PlantTask) => {
          task.taskId = `task_${Date.now()}`;
          task.plantId = selectedPlant;
          task.title = TASK_TYPES.find(t => t.id === selectedTaskType)?.name || selectedTaskType;
          task.description = notes;
          if (isTaskType(selectedTaskType)) {
            task.taskType = selectedTaskType;
          } else {
            throw new Error('Invalid task type');
          }
          task.dueDate = dueDate.toISOString();
          task.status = 'pending';
          task.userId = 'current_user'; // TODO: Get from auth context
        });
      });

      Alert.alert(t('success'), t('taskAddedSuccessfully'), [
        {
          text: t('ok'),
          onPress: () => {
            router.back();
          },
        },
      ]);
    } catch (error) {
      console.error('Error creating task:', error);
      Alert.alert(t('error'), t('failedToCreateTasks'));
    } finally {
      setIsCreating(false);
    }
  }, [selectedPlant, selectedTaskType, dueDate, notes, database, router]);

  // Handle date picker change
  const handleDateChange = useCallback((event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  }, []);

  // Format date for display
  const formatDate = useCallback((date: Date): string => {
    return date.toLocaleDateString(undefined, {
      // Use system locale instead of hardcoded 'de-DE'
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  // Memoized empty state component
  const EmptyPlantsState = useMemo(
    () => (
      <View className="flex-1 items-center justify-center py-8">
        <Ionicons
          name="leaf-outline"
          size={48}
          className="text-neutral-500 dark:text-neutral-400"
        />
        <ThemedText
          className="mt-4 text-center text-base"
          lightClassName="text-neutral-600"
          darkClassName="text-neutral-400">
          {t('noPlantsAvailable')}
        </ThemedText>
        <TouchableOpacity
          className="mt-4 rounded-full bg-primary-500 px-6 py-3"
          onPress={() => router.push('/plant/add')}
          accessibilityRole="button"
          accessibilityLabel={t('addNewPlant')}>
          <ThemedText
            className="font-medium text-white">
            {t('addPlant')}
          </ThemedText>
        </TouchableOpacity>
      </View>
    ),
    [router]
  );

  // Loading state component
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-black">
        <ThemedView className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" className="text-primary-500" />
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-black">
      <ThemedView className="flex-1">
        {/* Header */}
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3 rounded-full p-2"
            accessibilityRole="button"
            accessibilityLabel={t('goBack')}>
            <Ionicons
              name="arrow-back"
              size={24}
              className="text-neutral-700 dark:text-neutral-300"
            />
          </TouchableOpacity>
          <ThemedText className="flex-1 text-xl font-bold">
            {t('addTaskToPlant')}
          </ThemedText>
        </View>

        {plants.length === 0 ? (
          EmptyPlantsState
        ) : (
          <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
            {/* Plant Selection */}
            <View className="mb-6">
              <ThemedText className="mb-3 text-lg font-semibold">
                {t('selectPlant')}
              </ThemedText>
              <View className="space-y-2">
                {plants.map((plant) => (
                  <TouchableOpacity
                    key={plant.id}
                    className={`rounded-xl border-2 p-4 ${
                      selectedPlant === plant.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                        : isDark
                          ? 'border-neutral-700 bg-neutral-800'
                          : 'border-neutral-200 bg-white'
                    }`}
                    onPress={() => setSelectedPlant(plant.id)}
                    accessibilityRole="button"
                    accessibilityLabel={t('selectPlantAccessibility', { plantName: plant.name })}
                    accessibilityState={{ selected: selectedPlant === plant.id }}>
                    <View className="flex-row items-center">
                      <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                        <Ionicons
                          name="leaf"
                          size={24}
                          className="text-green-600 dark:text-green-400"
                        />
                      </View>
                      <View className="flex-1">
                        <ThemedText className="text-base font-medium">
                          {plant.name}
                        </ThemedText>
                        <ThemedText
                          className="text-sm"
                          lightClassName="text-neutral-600"
                          darkClassName="text-neutral-400">
                          {plant.strain || t('unknownStrain')}
                        </ThemedText>
                      </View>
                      {selectedPlant === plant.id && (
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          className="text-primary-500"
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Task Type Selection */}
            <View className="mb-6">
              <ThemedText className="mb-3 text-lg font-semibold">
                {t('taskType')}
              </ThemedText>
              <View className="space-y-2">
                {TASK_TYPES.map((taskType) => (
                  <TouchableOpacity
                    key={taskType.id}
                    className={`rounded-xl border-2 p-4 ${
                      selectedTaskType === taskType.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                        : isDark
                          ? 'border-neutral-700 bg-neutral-800'
                          : 'border-neutral-200 bg-white'
                    }`}
                    onPress={() => setSelectedTaskType(taskType.id)}
                    accessibilityRole="button"
                    accessibilityLabel={t('selectTaskTypeAccessibility', { taskTypeName: taskType.name })}
                    accessibilityState={{ selected: selectedTaskType === taskType.id }}>
                    <View className="flex-row items-center">
                      <View
                        className="mr-3 h-10 w-10 items-center justify-center rounded-full"
                        style={{ backgroundColor: taskType.colorKey + '20' }}>
                        <Ionicons
                          name={taskType.icon as any}
                          size={20}
                          style={{ color: taskType.colorKey }}
                        />
                      </View>
                      <ThemedText className="flex-1 text-base font-medium">
                        {taskType.name}
                      </ThemedText>
                      {selectedTaskType === taskType.id && (
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          className="text-primary-500"
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Due Date Selection */}
            <View className="mb-6">
              <ThemedText className="mb-3 text-lg font-semibold">
                {t('dueDate')}
              </ThemedText>
              <TouchableOpacity
                className={`rounded-xl border-2 p-4 ${
                  isDark
                    ? 'border-neutral-700 bg-neutral-800'
                    : 'border-neutral-200 bg-white'
                }`}
                onPress={() => setShowDatePicker(true)}
                accessibilityRole="button"
                accessibilityLabel={t('selectDueDateAccessibility', { currentDate: formatDate(dueDate) })}>
                <View className="flex-row items-center">
                  <Ionicons
                    name="calendar-outline"
                    size={24}
                    className="mr-3 text-neutral-500 dark:text-neutral-400"
                  />
                  <ThemedText className="flex-1 text-base">
                    {formatDate(dueDate)}
                  </ThemedText>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    className="text-neutral-400 dark:text-neutral-500"
                  />
                </View>
              </TouchableOpacity>
            </View>

            {/* Notes */}
            <View className="mb-6">
              <ThemedText className="mb-3 text-lg font-semibold">
                {t('notesOptional')}
              </ThemedText>
              <TextInput
                className={`rounded-xl border-2 p-4 text-base ${
                  isDark
                    ? 'border-neutral-700 bg-neutral-800 text-white'
                    : 'border-neutral-200 bg-white text-black'
                }`}
                placeholder={t('addNotesPlaceholder')}
                placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                accessibilityLabel={t('taskNotesAccessibility')}
                accessibilityHint={t('taskNotesHint')}
              />
            </View>

            {/* Add Task Button */}
            <TouchableOpacity
              className={`mb-8 rounded-xl bg-primary-500 py-4 ${
                !selectedPlant || !selectedTaskType || isCreating
                  ? 'opacity-50'
                  : ''
              }`}
              onPress={handleAddTask}
              disabled={!selectedPlant || !selectedTaskType || isCreating}
              accessibilityRole="button"
              accessibilityLabel={t('addTask')}
              accessibilityState={{
                disabled: !selectedPlant || !selectedTaskType || isCreating,
              }}>
              {isCreating ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <ThemedText className="text-center text-lg font-semibold text-white">
                  {t('addTask')}
                </ThemedText>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            value={dueDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}
      </ThemedView>
    </SafeAreaView>
  );
}
