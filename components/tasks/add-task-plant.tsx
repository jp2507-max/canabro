import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../lib/contexts/ThemeContext';
import useWatermelon from '../../lib/hooks/useWatermelon';
import { Plant } from '../../lib/models/Plant';
import { PlantTask } from '../../lib/models/PlantTask';
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';

// TaskType definition for better type safety
interface TaskType {
  id: string;
  name: string;
  icon: string;
  colorKey: string;
}

export default function AddTaskToPlantScreen() {
  const { theme, isDarkMode } = useTheme();
  const router = useRouter();
  const { database } = useWatermelon();

  // Define task types with associated colors and icons - moved inside component to use theme
  const TASK_TYPES: TaskType[] = useMemo(
    () => [
      {
        id: 'watering',
        name: 'Watering',
        icon: 'water-outline',
        colorKey: theme.colors.special?.watering || '#3b82f6',
      },
      {
        id: 'feeding',
        name: 'Feeding',
        icon: 'leaf-outline',
        colorKey: theme.colors.special?.feeding || '#8b5cf6',
      },
      {
        id: 'pruning',
        name: 'Pruning',
        icon: 'cut-outline',
        colorKey: '#10b981', // Use a fixed green color for pruning since it's not in theme.colors.special
      },
      {
        id: 'harvesting',
        name: 'Harvesting',
        icon: 'basket-outline',
        colorKey: theme.colors.special?.harvesting || '#f59e0b',
      },
    ],
    [theme.colors.special]
  );

  const [plants, setPlants] = useState<Plant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlant, setSelectedPlant] = useState<string | null>(null);
  const [selectedTaskType, setSelectedTaskType] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch plants from database
  useEffect(() => {
    if (!database) return;

    const loadPlants = async () => {
      try {
        setIsLoading(true);
        // Fix: Remove explicit generic type parameter
        const plantsCollection = database.get('plants');
        const allPlants = await plantsCollection.query().fetch();
        setPlants(allPlants);
      } catch (error) {
        console.error('Error fetching plants:', error);
        Alert.alert('Error', 'Failed to load plants. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    loadPlants();
  }, [database]);

  // Handle adding the task with proper validation
  const handleAddTask = useCallback(async () => {
    if (!selectedPlant) {
      Alert.alert('Required Field', 'Please select a plant');
      return;
    }

    if (!selectedTaskType) {
      Alert.alert('Required Field', 'Please select a task type');
      return;
    }

    if (!taskTitle.trim()) {
      Alert.alert('Required Field', 'Please enter a task title');
      return;
    }

    // Confirm before adding task
    Alert.alert('Confirm Task', 'Are you sure you want to add this task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Add Task',
        onPress: async () => {
          setIsSubmitting(true);

          try {
            if (!database) {
              throw new Error('Database not initialized');
            }

            await database.write(async () => {
              const tasksCollection = database.get('plant_tasks');
              await tasksCollection.create((task: PlantTask) => {
                task.taskId = `task-${Date.now()}`;
                task.plantId = selectedPlant;
                task.title = taskTitle.trim();
                task.description = taskDescription.trim();
                task.taskType = selectedTaskType;
                task.dueDate = dueDate.toISOString();
                task.status = 'pending';
                // Generate a random user ID for now (should be from auth context in real app)
                task.userId = 'current-user';
              });
            });

            Alert.alert('Success', 'Task added successfully', [
              { text: 'OK', onPress: () => router.back() },
            ]);
          } catch (error) {
            console.error('Error adding task:', error);
            Alert.alert('Error', 'Failed to add task. Please try again later.');
          } finally {
            setIsSubmitting(false);
          }
        },
      },
    ]);
  }, [database, selectedPlant, selectedTaskType, taskTitle, taskDescription, dueDate, router]);

  // Function to format date for display with user's locale
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
          color={isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[400]}
        />
        <ThemedText
          className="mt-4 text-center text-base"
          lightClassName="text-neutral-600"
          darkClassName="text-neutral-400">
          No plants available. Please add a plant first.
        </ThemedText>
        <TouchableOpacity
          className="mt-4 rounded-full px-6 py-3"
          style={{ backgroundColor: theme.colors.primary[500] }}
          onPress={() => router.push('/plant/add')}
          accessibilityRole="button"
          accessibilityLabel="Add new plant">
          <ThemedText
            className="font-medium"
            lightClassName="text-white"
            darkClassName="text-white">
            Add Plant
          </ThemedText>
        </TouchableOpacity>
      </View>
    ),
    [isDarkMode, theme.colors, router]
  );

  // Loading state component
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-black">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-black">
      <ThemedView className="flex-1 px-4">
        {/* Header */}
        <View className="flex-row items-center justify-between py-4">
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Go back">
            <Ionicons
              name="arrow-back"
              size={24}
              color={isDarkMode ? theme.colors.neutral[300] : theme.colors.neutral[700]}
            />
          </TouchableOpacity>
          <ThemedText
            className="text-xl font-bold"
            lightClassName="text-neutral-800"
            darkClassName="text-white">
            Add Task to Plant
          </ThemedText>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {plants.length === 0 ? (
            EmptyPlantsState
          ) : (
            <>
              {/* Plant Selection Section */}
              <View className="mb-6">
                <ThemedText
                  className="mb-2 text-base font-medium"
                  lightClassName="text-neutral-700"
                  darkClassName="text-neutral-300">
                  Select Plant
                </ThemedText>

                <View className="flex-row flex-wrap">
                  {plants.map((plant) => (
                    <TouchableOpacity
                      key={plant.id}
                      className={`mb-2 mr-2 rounded-full px-4 py-2 ${
                        selectedPlant === plant.id
                          ? 'bg-primary-500'
                          : isDarkMode
                            ? 'bg-neutral-800'
                            : 'bg-neutral-200'
                      }`}
                      onPress={() => setSelectedPlant(plant.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selectedPlant === plant.id }}
                      accessibilityLabel={`Select plant ${plant.name}`}>
                      <ThemedText
                        className={`text-sm ${selectedPlant === plant.id ? 'font-medium' : ''}`}
                        lightClassName={
                          selectedPlant === plant.id ? 'text-white' : 'text-neutral-700'
                        }
                        darkClassName={
                          selectedPlant === plant.id ? 'text-white' : 'text-neutral-300'
                        }>
                        {plant.name}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Task Type Section */}
              <View className="mb-6">
                <ThemedText
                  className="mb-2 text-base font-medium"
                  lightClassName="text-neutral-700"
                  darkClassName="text-neutral-300">
                  Task Type
                </ThemedText>

                <View className="flex-row flex-wrap">
                  {TASK_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      className={`mb-2 mr-2 flex-row items-center rounded-full px-4 py-2 ${
                        selectedTaskType === type.id
                          ? ''
                          : isDarkMode
                            ? 'bg-neutral-800'
                            : 'bg-neutral-200'
                      }`}
                      style={{
                        backgroundColor: selectedTaskType === type.id ? type.colorKey : undefined,
                      }}
                      onPress={() => setSelectedTaskType(type.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selectedTaskType === type.id }}
                      accessibilityLabel={`Select task type ${type.name}`}>
                      <Ionicons
                        name={type.icon as any}
                        size={16}
                        color={
                          selectedTaskType === type.id
                            ? 'white'
                            : isDarkMode
                              ? theme.colors.neutral[300]
                              : theme.colors.neutral[700]
                        }
                        style={{ marginRight: 6 }}
                      />
                      <ThemedText
                        className="text-sm"
                        lightClassName={
                          selectedTaskType === type.id ? 'text-white' : 'text-neutral-700'
                        }
                        darkClassName={
                          selectedTaskType === type.id ? 'text-white' : 'text-neutral-300'
                        }>
                        {type.name}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Task Details Form */}
              <View className="mb-6">
                <ThemedText
                  className="mb-2 text-base font-medium"
                  lightClassName="text-neutral-700"
                  darkClassName="text-neutral-300">
                  Task Details
                </ThemedText>

                {/* Task Title Input */}
                <View
                  className="mb-4 rounded-xl px-4 py-3"
                  style={{
                    backgroundColor: isDarkMode
                      ? theme.colors.neutral[800]
                      : theme.colors.neutral[100],
                  }}>
                  <ThemedText
                    className="mb-1 text-xs"
                    lightClassName="text-neutral-500"
                    darkClassName="text-neutral-400">
                    Title
                  </ThemedText>
                  <TextInput
                    value={taskTitle}
                    onChangeText={setTaskTitle}
                    placeholder="Enter task title"
                    placeholderTextColor={
                      isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[400]
                    }
                    className="text-base"
                    style={{
                      color: isDarkMode ? theme.colors.neutral[200] : theme.colors.neutral[800],
                    }}
                    maxLength={50}
                    accessibilityLabel="Task title"
                    accessibilityHint="Enter a title for your task"
                  />
                </View>

                {/* Task Description Input */}
                <View
                  className="mb-4 rounded-xl px-4 py-3"
                  style={{
                    backgroundColor: isDarkMode
                      ? theme.colors.neutral[800]
                      : theme.colors.neutral[100],
                  }}>
                  <ThemedText
                    className="mb-1 text-xs"
                    lightClassName="text-neutral-500"
                    darkClassName="text-neutral-400">
                    Description (Optional)
                  </ThemedText>
                  <TextInput
                    value={taskDescription}
                    onChangeText={setTaskDescription}
                    placeholder="Enter task description"
                    placeholderTextColor={
                      isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[400]
                    }
                    className="text-base"
                    multiline
                    numberOfLines={3}
                    style={{
                      color: isDarkMode ? theme.colors.neutral[200] : theme.colors.neutral[800],
                      textAlignVertical: 'top',
                    }}
                    maxLength={200}
                    accessibilityLabel="Task description"
                    accessibilityHint="Enter an optional description for your task"
                  />
                </View>

                {/* Due Date Selector */}
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  className="flex-row items-center justify-between rounded-xl px-4 py-3"
                  style={{
                    backgroundColor: isDarkMode
                      ? theme.colors.neutral[800]
                      : theme.colors.neutral[100],
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Select due date"
                  accessibilityHint="Opens a date picker to set the due date">
                  <View>
                    <ThemedText
                      className="mb-1 text-xs"
                      lightClassName="text-neutral-500"
                      darkClassName="text-neutral-400">
                      Due Date
                    </ThemedText>
                    <ThemedText
                      className="text-base"
                      lightClassName="text-neutral-800"
                      darkClassName="text-neutral-200">
                      {formatDate(dueDate)}
                    </ThemedText>
                  </View>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={isDarkMode ? theme.colors.neutral[400] : theme.colors.neutral[500]}
                  />
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={dueDate}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      const currentDate = selectedDate || dueDate;
                      setShowDatePicker(false);
                      setDueDate(currentDate);
                    }}
                    minimumDate={new Date()} // Prevent selecting past dates
                  />
                )}
              </View>
            </>
          )}
        </ScrollView>

        {/* Bottom Action Button - Only show if plants are available */}
        {plants.length > 0 && (
          <View className="py-4">
            <TouchableOpacity
              className="items-center justify-center rounded-full py-3"
              style={{
                backgroundColor: theme.colors.primary[500],
                opacity: isSubmitting ? 0.7 : 1,
              }}
              onPress={handleAddTask}
              disabled={isSubmitting || !selectedPlant || !selectedTaskType || !taskTitle.trim()}
              accessibilityRole="button"
              accessibilityLabel="Add task"
              accessibilityState={{
                disabled: isSubmitting || !selectedPlant || !selectedTaskType || !taskTitle.trim(),
              }}>
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <ThemedText
                  className="text-base font-medium"
                  lightClassName="text-white"
                  darkClassName="text-white">
                  Add Task
                </ThemedText>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}
