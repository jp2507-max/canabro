import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeRouter } from '@/lib/hooks/useSafeRouter';
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import useWatermelon from '../../lib/hooks/useWatermelon';
import { PlantTask } from '../../lib/models/PlantTask';
import { Plant } from '../../lib/models/Plant';
import { useColorScheme } from 'nativewind';
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';

// Task type definitions
const TASK_TYPES = [
  {
    id: 'watering',
    name: 'Watering',
    icon: 'water-outline',
    color: '#3b82f6',
  },
  {
    id: 'feeding',
    name: 'Feeding',
    icon: 'leaf-outline',
    color: '#8b5cf6',
  },
  {
    id: 'pruning',
    name: 'Pruning',
    icon: 'cut-outline',
    color: '#10b981',
  },
  {
    id: 'harvesting',
    name: 'Harvesting',
    icon: 'basket-outline',
    color: '#f59e0b',
  },
];

export default function AddTaskToAllPlantsScreen() {
  const { t } = useTranslation('tasks');
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useSafeRouter();
  const { database } = useWatermelon();

  const [selectedTaskType, setSelectedTaskType] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleAddTaskToAllPlants = useCallback(async () => {
    if (!selectedTaskType) {
      Alert.alert('Error', 'Please select a task type');
      return;
    }

    try {
      setIsCreating(true);

      // Get all plants
      const plantsCollection = database.get('plants');
      const allPlants = await plantsCollection.query().fetch();

      if (allPlants.length === 0) {
        Alert.alert('No Plants', 'No plants found to add tasks to');
        return;
      }

      await database.write(async () => {
        const tasksCollection = database.get('plant_tasks');

        // Create a task for each plant
        const taskPromises = allPlants.map((plant: any) =>
          tasksCollection.create((task: any) => {
            task.plantId = plant.id;
            task.taskType = selectedTaskType;
            task.dueDate = dueDate;
            task.notes = notes;
            task.isCompleted = false;
            task.createdAt = new Date();
          })
        );

        await Promise.all(taskPromises);
      });

      Alert.alert(
        'Success',
        `Task added to ${allPlants.length} plant${allPlants.length === 1 ? '' : 's'}!`,
        [
          {
            text: 'OK',
            onPress: () => {
              router.back();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error creating tasks:', error);
      Alert.alert('Error', 'Failed to create tasks');
    } finally {
      setIsCreating(false);
    }
  }, [selectedTaskType, dueDate, notes, database, router]);

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
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-black">
      <ThemedView className="flex-1">
        {/* Header */}
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3 rounded-full p-2"
            accessibilityRole="button"
            accessibilityLabel="Go back">
            <Ionicons
              name="arrow-back"
              size={24}
              className="text-neutral-700 dark:text-neutral-300"
            />
          </TouchableOpacity>
          <ThemedText className="flex-1 text-xl font-bold">{t('addTaskToAllPlants')}</ThemedText>
        </View>

        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
          {/* Task Type Selection */}
          <View className="mb-6">
            <ThemedText className="mb-3 text-lg font-semibold">{t('taskType')}</ThemedText>
            <View className="space-y-2">
              {TASK_TYPES.map((taskType) => (
                <TouchableOpacity
                  key={taskType.id}
                  className={`rounded-xl border-2 p-4 ${
                    selectedTaskType === taskType.id
                      ? 'dark:bg-primary-950 border-primary-500 bg-primary-50'
                      : isDark
                        ? 'border-neutral-700 bg-neutral-800'
                        : 'border-neutral-200 bg-white'
                  }`}
                  onPress={() => setSelectedTaskType(taskType.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Select task type ${taskType.name}`}
                  accessibilityState={{ selected: selectedTaskType === taskType.id }}>
                  <View className="flex-row items-center">
                    <View
                      className="mr-3 h-10 w-10 items-center justify-center rounded-full"
                      style={{ backgroundColor: taskType.color + '20' }}>
                      <Ionicons
                        name={taskType.icon as any}
                        size={20}
                        style={{ color: taskType.color }}
                      />
                    </View>
                    <ThemedText className="flex-1 text-base font-medium">
                      {taskType.name}
                    </ThemedText>
                    {selectedTaskType === taskType.id && (
                      <Ionicons name="checkmark-circle" size={24} className="text-primary-500" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Due Date Selection */}
          <View className="mb-6">
            <ThemedText className="mb-3 text-lg font-semibold">{t('dueDate')}</ThemedText>
            <TouchableOpacity
              className={`rounded-xl border-2 p-4 ${
                isDark ? 'border-neutral-700 bg-neutral-800' : 'border-neutral-200 bg-white'
              }`}
              onPress={() => setShowDatePicker(true)}
              accessibilityRole="button"
              accessibilityLabel={`${t('selectDueDate')}, ${t('currently')} ${formatDate(dueDate)}`}>
              <View className="flex-row items-center">
                <Ionicons
                  name="calendar-outline"
                  size={24}
                  className="mr-3 text-neutral-500 dark:text-neutral-400"
                />
                <ThemedText className="flex-1 text-base">{formatDate(dueDate)}</ThemedText>
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
            <ThemedText className="mb-3 text-lg font-semibold">Notes (Optional)</ThemedText>
            <TextInput
              className={`rounded-xl border-2 p-4 text-base ${
                isDark
                  ? 'border-neutral-700 bg-neutral-800 text-white'
                  : 'border-neutral-200 bg-white text-black'
              }`}
              placeholder="Add any notes for this task..."
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              accessibilityLabel="Task notes"
              accessibilityHint="Optional notes for the task"
            />
          </View>

          {/* Add Task Button */}
          <TouchableOpacity
            className={`mb-8 rounded-xl bg-primary-500 py-4 ${
              !selectedTaskType || isCreating ? 'opacity-50' : ''
            }`}
            onPress={handleAddTaskToAllPlants}
            disabled={!selectedTaskType || isCreating}
            accessibilityRole="button"
            accessibilityLabel={t('addTaskToAllPlants')}
            accessibilityState={{
              disabled: !selectedTaskType || isCreating,
            }}>
            {isCreating ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <ThemedText className="text-center text-lg font-semibold text-white">
                {t('addTaskToAllPlants')}
              </ThemedText>
            )}
          </TouchableOpacity>
        </ScrollView>

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
