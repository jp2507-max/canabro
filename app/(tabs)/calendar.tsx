import { Ionicons } from '@expo/vector-icons';
import { Database, Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react'; // Re-add withObservables for TaskItem
import { format, addDays, isToday, parseISO } from 'date-fns';
import { router } from 'expo-router';
import React, { useState, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Subscription } from 'rxjs'; // Import Subscription for cleanup

import ThemedText from '../../components/ui/ThemedText';
import ThemedView from '../../components/ui/ThemedView';
import { useAuth } from '../../lib/contexts/AuthProvider';
import { useDatabase } from '../../lib/contexts/DatabaseProvider'; // Keep useDatabase import
import { useNotifications, TaskNotificationParams } from '../../lib/contexts/NotificationContext';
import { useTheme } from '../../lib/contexts/ThemeContext';
import usePullToRefresh from '../../lib/hooks/usePullToRefresh'; // Import the pull-to-refresh hook
import { Plant } from '../../lib/models/Plant'; // Import Plant model for relation
import { PlantTask } from '../../lib/models/PlantTask'; // Import WatermelonDB PlantTask model

// --- Date Selector Component ---
interface DateSelectorProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

function DateSelector({ selectedDate, onDateSelect }: DateSelectorProps) {
  // const { isDarkMode } = useTheme(); // isDarkMode is not used here

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
    <View className="mb-4 flex-row">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}>
        {dates.map((date, index) => {
          const dateString = format(date, 'yyyy-MM-dd');
          const selectedDateString = format(selectedDate, 'yyyy-MM-dd');
          const isSelected = dateString === selectedDateString;
          const isCurrentDateToday = isToday(date);

          return (
            <TouchableOpacity
              key={index}
              onPress={() => onDateSelect(date)} // Use the passed handler
              className={`mx-2 h-16 w-16 items-center justify-center rounded-full ${
                isSelected
                  ? 'bg-green-600'
                  : isCurrentDateToday
                    ? 'bg-green-100 dark:bg-green-900'
                    : 'bg-gray-100 dark:bg-gray-800'
              }`}>
              <ThemedText
                className={`text-xs ${
                  isSelected ? 'text-white' : 'text-gray-500 dark:text-gray-400'
                }`}>
                {format(date, 'E')}
              </ThemedText>
              <ThemedText
                className={`text-lg font-bold ${
                  isSelected
                    ? 'text-white'
                    : isCurrentDateToday
                      ? 'text-green-700 dark:text-green-500'
                      : 'text-gray-800 dark:text-gray-300'
                }`}>
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
function TaskItemBase({
  task,
  plant,
  isDarkMode,
  onComplete,
  onNavigate,
}: TaskItemProps & { plant: Plant | null }) {
  const plantName = plant?.name ?? 'Loading Plant...'; // Handle loading/null plant
  const taskType = task.taskType as TaskNotificationParams['taskType']; // Cast type

  return (
    <ThemedView className="mb-4 overflow-hidden rounded-lg bg-white shadow-sm dark:bg-gray-800">
      <View className="flex-row p-4">
        {/* Task type icon */}
        <View
          className={`mr-4 h-12 w-12 items-center justify-center rounded-full ${
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
          }`}>
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
          <ThemedText className="mb-1 text-lg font-bold">{task.title}</ThemedText>

          <TouchableOpacity
            onPress={() => onNavigate(task.plantId)}
            className="mb-1 flex-row items-center"
            disabled={!plant} // Disable if plant is not loaded yet
          >
            <Ionicons name="leaf" size={14} color={isDarkMode ? '#10b981' : '#047857'} />
            <ThemedText className="ml-1 text-sm text-green-700 dark:text-green-500">
              {plantName}
            </ThemedText>
          </TouchableOpacity>

          {task.description && (
            <ThemedText className="mb-2 text-sm text-gray-600 dark:text-gray-400">
              {task.description}
            </ThemedText>
          )}

          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={14} color={isDarkMode ? '#d1d5db' : '#6b7280'} />
            <ThemedText className="ml-1 text-xs text-gray-500 dark:text-gray-400">
              {format(parseISO(task.dueDate), 'h:mm a')}
            </ThemedText>
          </View>
        </View>

        {/* Complete button */}
        <TouchableOpacity
          onPress={() => onComplete(task)} // Pass the full task model instance
          className="ml-2 h-10 w-10 items-center justify-center self-center rounded-full bg-green-100 dark:bg-green-900">
          <Ionicons name="checkmark" size={24} color={isDarkMode ? '#10b981' : '#047857'} />
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

// --- Calendar Screen Component (Refactored to use hooks) ---
interface CalendarScreenProps {
  // Props passed from container
  selectedDate: Date;
  userId: string | undefined;
}

function CalendarScreen({ selectedDate, userId }: CalendarScreenProps) {
  const { database } = useDatabase(); // Get database via hook
  const { isDarkMode } = useTheme();
  const {
    isNotificationsEnabled,
    requestPermissions,
    scheduleTaskNotification,
    cancelTaskNotification,
  } = useNotifications();
  const { refreshing, handleRefresh } = usePullToRefresh({
    showFeedback: true,
    forceSync: true,
  });

  const [tasks, setTasks] = useState<PlantTask[]>([]); // State for tasks
  const [isLoadingTasks, setIsLoadingTasks] = useState(true); // Loading state
  const [plantsMap, setPlantsMap] = useState<Map<string, Plant>>(new Map()); // Store related plants

  // Effect to observe tasks based on selectedDate and userId
  useEffect(() => {
    // Don't run if the database isn't available yet
    if (!database) {
      setIsLoadingTasks(true); // Ensure loading state is true if db is not ready
      setTasks([]); // Clear tasks if DB is not ready
      setPlantsMap(new Map()); // Clear plants map
      return;
    }

    setIsLoadingTasks(true); // Start loading
    const startDate = format(selectedDate, 'yyyy-MM-dd');

    // Base query for tasks
    let tasksQuery = database
      .get<PlantTask>('plant_tasks')
      .query(Q.where('status', 'pending'), Q.where('due_date', startDate));

    // Add user ID filter if userId is present
    if (userId) {
      tasksQuery = tasksQuery.extend(Q.where('user_id', userId));
    } else {
      // If no user ID, ensure no results
      tasksQuery = tasksQuery.extend(Q.where('id', Q.eq('__never__')));
    }

    // Observe the query
    const taskSubscription: Subscription = tasksQuery
      .observeWithColumns([
        'title',
        'status',
        'due_date',
        'plant_id',
        'notification_id',
        'task_type',
        'description',
      ])
      .subscribe(
        async (observedTasks) => {
          setTasks(observedTasks);

          // Fetch related plants for the observed tasks
          const plantIds = observedTasks.map((t) => t.plantId).filter(Boolean); // Get unique, non-null plant IDs
          if (plantIds.length > 0) {
            try {
              // Ensure database is still available before fetching plants
              if (!database) {
                console.warn('Database became unavailable while fetching plants.');
                setPlantsMap(new Map());
                setIsLoadingTasks(false);
                return;
              }
              const fetchedPlants = await database
                .get<Plant>('plants')
                .query(Q.where('id', Q.oneOf(plantIds)))
                .fetch();
              const newPlantsMap = new Map<string, Plant>();
              fetchedPlants.forEach((p) => newPlantsMap.set(p.id, p));
              setPlantsMap(newPlantsMap);
            } catch (plantError) {
              console.error('Error fetching related plants:', plantError);
              setPlantsMap(new Map()); // Clear map on error
            }
          } else {
            setPlantsMap(new Map()); // Clear map if no tasks/plantIds
          }

          setIsLoadingTasks(false); // Stop loading after tasks (and plants) are set
        },
        (error) => {
          console.error('Error observing tasks:', error);
          setIsLoadingTasks(false); // Stop loading on error
          setTasks([]); // Clear tasks on error
          setPlantsMap(new Map());
        }
      );

    // Cleanup subscription on unmount or when deps change
    return () => {
      taskSubscription.unsubscribe();
    };
  }, [database, selectedDate, userId]); // Re-run effect if database, date, or user changes

  // Effect to schedule notifications for pending tasks without one
  useEffect(() => {
    // Ensure database is available before proceeding
    if (database && isNotificationsEnabled && tasks.length > 0) {
      tasks.forEach((task) => {
        if (!task.notificationId && task.status === 'pending') {
          // Ensure plant is available before scheduling
          const plant = plantsMap.get(task.plantId);
          if (plant) {
            scheduleNotificationForTask(task, plant); // Pass plant data
          } else {
            console.warn(
              `Plant ${task.plantId} not found in map for scheduling notification for task ${task.id}`
            );
          }
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, plantsMap, isNotificationsEnabled, database]); // Add database and plantsMap to dependencies

  // Schedule notification for a single task (now requires plant)
  const scheduleNotificationForTask = async (task: PlantTask, plant: Plant) => {
    // Ensure database is available
    if (!database) return;

    try {
      if (!isNotificationsEnabled) {
        const permissionGranted = await requestPermissions();
        if (!permissionGranted) return;
      }

      // No need to fetch plant again, it's passed in
      const notificationParams: TaskNotificationParams = {
        taskId: task.id,
        plantId: task.plantId,
        plantName: plant.name, // Use name from passed plant object
        taskType: task.taskType as TaskNotificationParams['taskType'], // Ensure taskType is valid
        taskTitle: task.title,
        dueDate: parseISO(task.dueDate),
      };

      const notificationId = await scheduleTaskNotification(notificationParams);

      if (notificationId) {
        // Use database from hook
        await database.write(async () => {
          // Fetch task again inside writer for safety
          const taskToUpdate = await database.get<PlantTask>('plant_tasks').find(task.id);
          await taskToUpdate.update((t: PlantTask) => {
            t.notificationId = notificationId;
          });
        });
        // Sync will eventually push this change
      }
    } catch (err) {
      console.error('Error scheduling notification for task:', task.id, err);
    }
  };

  // Mark task as completed using the @writer method on the model
  // Uses 'database' from the hook now
  const markTaskAsCompleted = async (task: PlantTask) => {
    // Ensure database is available
    if (!database) return;
    try {
      // Still need to handle notification cancellation outside the model method
      if (task.notificationId) {
        await cancelTaskNotification(task.id); // Use task.id here
      }

      // Use database from hook
      await database.write(async () => {
        const taskToComplete = await database.get<PlantTask>('plant_tasks').find(task.id);
        // Call the @writer method directly on the task instance
        await taskToComplete.markAsCompleted();
      });

      // Sync after the model method completes
      await handleRefresh(); // Trigger sync after local update
    } catch (err) {
      console.error('Error marking task as completed:', task.id, err);
      Alert.alert('Error', 'Failed to update task status.');
    }
  };

  // Navigation handler
  // No change needed
  const navigateToPlant = (plantId: string) => {
    router.push(`/plant/${plantId}` as any);
  };

  // Render function for FlatList items
  const renderTaskItem = ({ item }: { item: PlantTask }) => {
    // Ensure database is available before rendering TaskItem if it needs it
    if (!database) return null; // Or render a placeholder
    const relatedPlant = plantsMap.get(item.plantId); // Get plant from map

    return (
      <TaskItem
        task={item}
        plant={relatedPlant ?? null} // Pass plant or null
        database={database} // Pass database from hook
        isDarkMode={isDarkMode}
        onComplete={markTaskAsCompleted}
        onNavigate={navigateToPlant}
      />
    );
  };

  // Determine overall loading/syncing state
  // Show loading if tasks are loading OR if DB isn't ready
  const showLoadingIndicator = isLoadingTasks || !database;
  const showEmptyState = !isLoadingTasks && tasks.length === 0 && database; // Only show empty if not loading and DB is ready

  return (
    <ThemedView className="flex-1">
      {/* FlatList for tasks */}
      <FlatList
        data={tasks} // Use tasks from component state
        keyExtractor={(item) => item.id}
        renderItem={renderTaskItem}
        contentContainerClassName="px-4 pb-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing} // Use refreshing from usePullToRefresh
            onRefresh={handleRefresh}
            colors={['#16a34a']}
            tintColor={isDarkMode ? '#16a34a' : '#16a34a'}
          />
        }
        ListEmptyComponent={
          showLoadingIndicator ? (
            <View className="flex-1 items-center justify-center py-12">
              <ActivityIndicator size="large" color="#16a34a" />
            </View>
          ) : showEmptyState ? (
            <View className="flex-1 items-center justify-center px-6 py-12">
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
                className="mt-6 flex-row items-center rounded-lg bg-green-600 px-5 py-2.5 shadow">
                <Ionicons name="add" size={18} color="white" />
                <ThemedText className="ml-1.5 font-medium text-white">Add New Task</ThemedText>
              </TouchableOpacity>
            </View>
          ) : null // Render nothing if loading and tasks exist, or if not empty
        }
      />
    </ThemedView>
  );
}

// --- Container Component ---
// Renders the CalendarScreen directly, passing props
function CalendarScreenContainer() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { session } = useAuth(); // Get session here to pass userId

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
      <ThemedView className="px-4 pt-4">
        <ThemedText className="mb-4 text-2xl font-bold">Calendar</ThemedText>
      </ThemedView>
      {/* Date Selector is rendered here, managing its own interaction via onDateSelect */}
      <DateSelector selectedDate={selectedDate} onDateSelect={setSelectedDate} />
      {/* Render the CalendarScreen component directly */}
      {/* Pass selectedDate and userId as props */}
      <CalendarScreen selectedDate={selectedDate} userId={session?.user?.id} />
    </SafeAreaView>
  );
}

// Export the container component as the default export for this screen
export default CalendarScreenContainer;
