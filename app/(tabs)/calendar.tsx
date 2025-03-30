import React, { useState, useEffect, useMemo } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, isToday, parseISO } from 'date-fns';
import { useAuth } from '../../lib/contexts/AuthProvider';
import { useTheme } from '../../lib/contexts/ThemeContext';
import { useNotifications, TaskNotificationParams } from '../../lib/contexts/NotificationContext';
import ThemedView from '../../components/ui/ThemedView';
import ThemedText from '../../components/ui/ThemedText';
// import { isExpoGo } from '../../lib/config'; // Not used directly after refactor
import useWatermelon from '../../lib/hooks/useWatermelon';

// WatermelonDB imports
import { withObservables, withDatabase } from '@nozbe/watermelondb/react';
import { Database, Q } from '@nozbe/watermelondb';
import { PlantTask } from '../../lib/models/PlantTask'; // Import WatermelonDB PlantTask model
import { Plant } from '../../lib/models/Plant'; // Import Plant model for relation

// --- Date Selector Component ---
interface DateSelectorProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

function DateSelector({ selectedDate, onDateSelect }: DateSelectorProps) {
  const { isDarkMode } = useTheme(); // Use theme context

  const dates = useMemo(() => {
    const result = [];
    const today = new Date(); // Base calculations on today
    // Generate dates relative to today for a stable week view
    for (let i = -3; i <= 3; i++) {
      result.push(addDays(today, i));
    }
    return result;
  }, []); // Calculate only once

  return (
    <View className="flex-row mb-4">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {dates.map((date, index) => {
          const dateString = format(date, 'yyyy-MM-dd');
          const selectedDateString = format(selectedDate, 'yyyy-MM-dd');
          const isSelected = dateString === selectedDateString;
          const isCurrentDateToday = isToday(date);

          return (
            <TouchableOpacity
              key={index}
              onPress={() => onDateSelect(date)} // Use the passed handler
              className={`items-center justify-center mx-2 w-16 h-16 rounded-full ${
                isSelected
                  ? 'bg-green-600'
                  : isCurrentDateToday
                  ? 'bg-green-100 dark:bg-green-900'
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}
            >
              <ThemedText
                className={`text-xs ${
                  isSelected
                    ? 'text-white'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {format(date, 'E')}
              </ThemedText>
              <ThemedText
                className={`text-lg font-bold ${
                  isSelected
                    ? 'text-white'
                    : isCurrentDateToday
                    ? 'text-green-700 dark:text-green-500'
                    : 'text-gray-800 dark:text-gray-300'
                }`}
              >
                {format(date, 'd')}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}


// --- Task Item Component ---
interface TaskItemProps {
  task: PlantTask;
  database: Database; // Passed down for potential actions if needed
  isDarkMode: boolean;
  onComplete: (task: PlantTask) => void;
  onNavigate: (plantId: string) => void;
}

// Base Task Item component (receives task and plant as props from HOC)
function TaskItemBase({ task, plant, isDarkMode, onComplete, onNavigate }: TaskItemProps & { plant: Plant | null }) {
  const plantName = plant?.name ?? 'Loading Plant...'; // Handle loading/null plant
  const taskType = task.taskType as TaskNotificationParams['taskType']; // Cast type

  return (
    <ThemedView className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-4 overflow-hidden">
      <View className="flex-row p-4">
        {/* Task type icon */}
        <View
          className={`mr-4 h-12 w-12 rounded-full items-center justify-center ${
            taskType === 'water'
              ? 'bg-blue-100 dark:bg-blue-900'
              : taskType === 'feed'
              ? 'bg-yellow-100 dark:bg-yellow-900'
              : taskType === 'prune'
              ? 'bg-green-100 dark:bg-green-900'
              : taskType === 'transplant'
              ? 'bg-purple-100 dark:bg-purple-900'
              : taskType === 'harvest'
              ? 'bg-red-100 dark:bg-red-900'
              : 'bg-gray-100 dark:bg-gray-700'
          }`}
        >
          <Ionicons
            name={
              taskType === 'water'
                ? 'water'
                : taskType === 'feed'
                ? 'nutrition'
                : taskType === 'prune'
                ? 'cut'
                : taskType === 'transplant'
                ? 'swap-horizontal'
                : taskType === 'harvest'
                ? 'basket'
                : 'calendar'
            }
            size={24}
            color={
              taskType === 'water'
                ? '#3b82f6'
                : taskType === 'feed'
                ? '#f59e0b'
                : taskType === 'prune'
                ? '#10b981'
                : taskType === 'transplant'
                ? '#8b5cf6'
                : taskType === 'harvest'
                ? '#ef4444'
                : '#6b7280'
            }
          />
        </View>

        {/* Task details */}
        <View className="flex-1">
          <ThemedText className="font-bold text-lg mb-1">
            {task.title}
          </ThemedText>

          <TouchableOpacity
            onPress={() => onNavigate(task.plantId)}
            className="flex-row items-center mb-1"
            disabled={!plant} // Disable if plant is not loaded yet
          >
            <Ionicons
              name="leaf"
              size={14}
              color={isDarkMode ? '#10b981' : '#047857'}
            />
            <ThemedText className="text-green-700 dark:text-green-500 ml-1 text-sm">
              {plantName}
            </ThemedText>
          </TouchableOpacity>

          {task.description && (
            <ThemedText className="text-gray-600 dark:text-gray-400 text-sm mb-2">
              {task.description}
            </ThemedText>
          )}

          <View className="flex-row items-center">
            <Ionicons
              name="time-outline"
              size={14}
              color={isDarkMode ? '#d1d5db' : '#6b7280'}
            />
            <ThemedText className="text-gray-500 dark:text-gray-400 ml-1 text-xs">
              {format(parseISO(task.dueDate), 'h:mm a')}
            </ThemedText>
          </View>
        </View>

        {/* Complete button */}
        <TouchableOpacity
          onPress={() => onComplete(task)} // Pass the full task model instance
          className="self-center ml-2 bg-green-100 dark:bg-green-900 h-10 w-10 rounded-full items-center justify-center"
        >
          <Ionicons
            name="checkmark"
            size={24}
            color={isDarkMode ? '#10b981' : '#047857'}
          />
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

// Enhance TaskItemBase with plant observable
const TaskItem = withObservables(
  ['task'], // Trigger update if task changes
  ({ task }: { task: PlantTask }) => ({
    plant: task.plant, // Observe the related plant
  })
)(TaskItemBase);


// --- Base Calendar Screen Component (Receives props from HOC) ---
interface CalendarScreenBaseProps {
  tasks: PlantTask[];
  database: Database;
  selectedDate: Date; // Receive selectedDate as prop
  userId: string | undefined;
  // No need for onDateSelect here, handled by container
}

function CalendarScreenBaseComponent({ tasks, database, selectedDate, userId }: CalendarScreenBaseProps) {
  const { isDarkMode } = useTheme();
  const {
    isNotificationsEnabled,
    requestPermissions,
    scheduleTaskNotification,
    cancelTaskNotification
  } = useNotifications();
  const { sync, isSyncing } = useWatermelon();

  const [isRefreshingManually, setIsRefreshingManually] = useState(false);

  // Effect to schedule notifications for pending tasks without one
  useEffect(() => {
    if (isNotificationsEnabled && tasks) {
      tasks.forEach((task) => {
        if (!task.notificationId && task.status === 'pending') {
          scheduleNotificationForTask(task);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, isNotificationsEnabled]); // Dependencies: tasks array and notification status

  // Schedule notification for a single task
  const scheduleNotificationForTask = async (task: PlantTask) => {
    try {
      if (!isNotificationsEnabled) {
        const permissionGranted = await requestPermissions();
        if (!permissionGranted) return;
      }

      let plantName = 'Unknown Plant';
      try {
        // Fetch the related plant explicitly using the database context
        const plant = await database.get<Plant>('plants').find(task.plantId);
        if (plant) {
          plantName = plant.name;
        }
      } catch (e) {
        console.warn(`Could not fetch plant for task ${task.id} notification`, e);
        // Proceed with 'Unknown Plant'
      }

      const notificationParams: TaskNotificationParams = {
        taskId: task.id,
        plantId: task.plantId,
        plantName: plantName,
        taskType: task.taskType as TaskNotificationParams['taskType'],
        taskTitle: task.title,
        dueDate: parseISO(task.dueDate)
      };

      const notificationId = await scheduleTaskNotification(notificationParams);

      if (notificationId) {
        await database.write(async () => {
          await task.update((t) => {
            t.notificationId = notificationId;
          });
        });
        // Sync will eventually push this change
      }
    } catch (err) {
      console.error('Error scheduling notification for task:', err);
    }
  };

  // Mark task as completed using the @writer method on the model
  const markTaskAsCompleted = async (task: PlantTask) => {
    try {
      // Still need to handle notification cancellation outside the model method
      if (task.notificationId) {
        await cancelTaskNotification(task.id); // Use task.id here, assuming it's the correct identifier for cancellation
      }

      // Call the @writer method directly on the task instance
      await task.markAsCompleted();

      // Sync after the model method completes
      await sync(); // Trigger sync after local update
    } catch (err) {
      console.error('Error marking task as completed:', err);
      Alert.alert('Error', 'Failed to update task status');
    }
  };

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshingManually(true);
    try {
      await sync();
    } catch (error) {
      console.error("Sync failed:", error);
      Alert.alert("Sync Error", "Could not refresh tasks.");
    } finally {
      setIsRefreshingManually(false);
    }
  };

  // Navigation handler
  const navigateToPlant = (plantId: string) => {
    router.push(`/plant/${plantId}` as any);
  };

  // Render function for FlatList items
  const renderTaskItem = ({ item }: { item: PlantTask }) => {
    return (
      <TaskItem
        task={item}
        database={database}
        isDarkMode={isDarkMode}
        onComplete={markTaskAsCompleted}
        onNavigate={navigateToPlant}
      />
    );
  };

  return (
    // Note: SafeAreaView is applied in the Container now
    <ThemedView className="flex-1">
      {/* FlatList for tasks */}
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={renderTaskItem}
        contentContainerClassName="px-4 pb-4" // Use className for NativeWind
        refreshControl={
          <RefreshControl
            refreshing={isRefreshingManually || isSyncing} // Combine manual and auto sync indicators
            onRefresh={handleRefresh}
            colors={['#16a34a']} // Customize color if needed
            tintColor={isDarkMode ? '#16a34a' : '#16a34a'}
          />
        }
        ListEmptyComponent={
          // Show loading indicator only when syncing initially and no tasks are present
          isSyncing && !isRefreshingManually && tasks?.length === 0 ? (
            <View className="flex-1 justify-center items-center py-12">
              <ActivityIndicator size="large" color="#16a34a" />
            </View>
          ) : (
            // Empty state message
            <View className="flex-1 justify-center items-center py-12 px-6">
              <Ionicons
                name="calendar-outline"
                size={48}
                color={isDarkMode ? '#9ca3af' : '#6b7280'}
              />
              <ThemedText className="mt-4 text-center text-lg font-semibold text-gray-700 dark:text-gray-300">
                All Clear!
              </ThemedText>
              <ThemedText className="mt-1 text-center text-gray-500 dark:text-gray-400">
                No tasks scheduled for {format(selectedDate, 'MMMM d, yyyy')}.
              </ThemedText>
              <TouchableOpacity
                 // TODO: Verify this route exists and is correct for adding tasks
                onPress={() => router.push('/(tabs)/index' as any)} // Example: Navigate home or to a task creation screen
                className="mt-6 flex-row items-center bg-green-600 py-2.5 px-5 rounded-lg shadow"
              >
                <Ionicons name="add" size={18} color="white" />
                <ThemedText className="ml-1.5 text-white font-medium">
                  Add New Task
                </ThemedText>
              </TouchableOpacity>
            </View>
          )
        }
      />
    </ThemedView>
  );
}


// --- HOC Composition ---
// Enhance Base Component with Database and Observables
const EnhancedCalendar = withObservables(
  ['selectedDate', 'userId'], // Trigger re-query if selectedDate or userId changes
  ({ database, selectedDate, userId }: { database: Database; selectedDate: Date; userId: string | undefined }) => {
    const startDate = format(selectedDate, 'yyyy-MM-dd');

    // Base query for tasks
    let tasksQuery = database.get<PlantTask>('plant_tasks').query(
      Q.where('status', 'pending'),
      Q.where('due_date', startDate)
      // We need to filter by user ID if available
    );

    // Add user ID filter if userId is present
    if (userId) {
      tasksQuery = tasksQuery.extend(Q.where('user_id', userId));
    } else {
      // If no user ID, return an empty observable (or handle appropriately)
      tasksQuery = tasksQuery.extend(Q.where('id', Q.eq('__never__'))); // Ensures no results if no user
    }

    return {
      tasks: tasksQuery.observeWithColumns(['title', 'status', 'due_date', 'plant_id', 'notification_id']), // Observe tasks and relevant columns
      // Pass selectedDate and userId through to the base component
      selectedDate: selectedDate,
      userId: userId,
    };
  }
)(withDatabase(CalendarScreenBaseComponent)); // Apply withDatabase first


// --- Container Component ---
// Manages state (selectedDate) and renders enhanced component + DateSelector
function CalendarScreenContainer() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { session } = useAuth(); // Get session here to pass userId

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
      <ThemedView className="px-4 pt-4">
        <ThemedText className="text-2xl font-bold mb-4">Calendar</ThemedText>
      </ThemedView>
      {/* Date Selector is rendered here, managing its own interaction via onDateSelect */}
      <DateSelector selectedDate={selectedDate} onDateSelect={setSelectedDate} />
      {/* Enhanced Calendar component receives selectedDate and userId */}
      <EnhancedCalendar selectedDate={selectedDate} userId={session?.user?.id} />
    </SafeAreaView>
  );
}

// Export the container component as the default export for this screen
export default CalendarScreenContainer;
