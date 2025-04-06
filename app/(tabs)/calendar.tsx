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
import { useTheme } from '../../lib/contexts/ThemeContext'; // Keep useTheme
import usePullToRefresh from '../../lib/hooks/usePullToRefresh'; // Import the pull-to-refresh hook
import { Plant } from '../../lib/models/Plant'; // Import Plant model for relation
import { PlantTask } from '../../lib/models/PlantTask'; // Import WatermelonDB PlantTask model

// --- Date Selector Component ---
interface DateSelectorProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

function DateSelector({ selectedDate, onDateSelect }: DateSelectorProps) {
  const { theme, isDarkMode } = useTheme(); // Get theme object and isDarkMode

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
    <View style={{ marginBottom: 16, flexDirection: 'row' }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}>
        {dates.map((date, index) => {
          const dateString = format(date, 'yyyy-MM-dd');
          const selectedDateString = format(selectedDate, 'yyyy-MM-dd');
          const isSelected = dateString === selectedDateString;
          const isCurrentDateToday = isToday(date);

          // Determine background color based on selection state
          const bgColor = isSelected
            ? theme.colors.primary[600]
            : isCurrentDateToday
              ? isDarkMode ? theme.colors.primary[900] : theme.colors.primary[100]
              : isDarkMode ? theme.colors.neutral[800] : theme.colors.neutral[100];

          // Determine day text color
          const dayTextColor = isSelected
            ? theme.colors.neutral[50]
            : isDarkMode ? theme.colors.neutral[400] : theme.colors.neutral[500];

          // Determine date text color
          const dateTextColor = isSelected
            ? theme.colors.neutral[50]
            : isCurrentDateToday
              ? isDarkMode ? theme.colors.primary[500] : theme.colors.primary[700]
              : isDarkMode ? theme.colors.neutral[300] : theme.colors.neutral[800];

          return (
            <TouchableOpacity
              key={index}
              onPress={() => onDateSelect(date)}
              style={{
                marginHorizontal: 8,
                height: 64,
                width: 64,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 32,
                backgroundColor: bgColor
              }}>
              <ThemedText
                style={{
                  fontSize: 12,
                  color: dayTextColor
                }}>
                {`${format(date, 'E')}`}
              </ThemedText>
              <ThemedText
                style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: dateTextColor
                }}>
                {`${format(date, 'd')}`}
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
  isDarkMode, // Keep isDarkMode if needed elsewhere, or get from useTheme
  onComplete,
  onNavigate,
}: TaskItemProps & { plant: Plant | null }) {
  const { theme } = useTheme(); // Get theme object
  const plantName = plant?.name ?? 'Loading Plant...'; // Handle loading/null plant
  const taskType = task.taskType as TaskNotificationParams['taskType']; // Cast type

  // Define icon colors based on theme
  const iconColors: Record<TaskNotificationParams['taskType'] | 'default', string> = {
    water: theme.colors.status.info, // Use info blue
    feed: theme.colors.special.feeding, // Use feeding purple
    prune: theme.colors.primary[600], // Use primary green
    transplant: '#8b5cf6', // Keep purple for now, maybe add to theme?
    harvest: theme.colors.special.harvesting, // Use harvesting orange
    other: theme.colors.neutral[500], // Add 'other' type, use default color
    default: theme.colors.neutral[500], // Default neutral color
  };
  const iconBgClasses: Record<TaskNotificationParams['taskType'] | 'default', string> = {
    water: 'bg-blue-100 dark:bg-blue-900', // Keep specific status colors for now
    feed: 'bg-purple-100 dark:bg-purple-900', // Keep specific status colors for now
    prune: 'bg-primary-100 dark:bg-primary-900', // Use theme primary
    transplant: 'bg-purple-100 dark:bg-purple-900', // Keep specific status colors for now
    harvest: 'bg-orange-100 dark:bg-orange-900', // Use orange, maybe add to theme?
    other: 'bg-neutral-100 dark:bg-neutral-700', // Add 'other' type, use default background
    default: 'bg-neutral-100 dark:bg-neutral-700', // Use theme neutral
  };

  return (
    // Use theme neutral colors for card background
    <ThemedView className="mb-4 overflow-hidden rounded-lg bg-neutral-50 shadow-sm dark:bg-neutral-800">
      <View className="flex-row p-4">
        {/* Task type icon */}
        <View
          className={`mr-4 h-12 w-12 items-center justify-center rounded-full ${
            iconBgClasses[taskType] ?? iconBgClasses.default // Use dynamic background class
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
            color={iconColors[taskType] ?? iconColors.default} // Use dynamic icon color from theme
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
            {/* Use theme primary color for leaf icon */}
            <Ionicons name="leaf" size={14} color={theme.colors.primary[isDarkMode ? 500 : 700]} />
            {/* Use theme primary color for text */}
            <ThemedText className="ml-1 text-sm text-primary-700 dark:text-primary-500">
              {plantName}
            </ThemedText>
          </TouchableOpacity>

          {task.description && (
            // Use theme neutral color for description text
            <ThemedText className="mb-2 text-sm text-neutral-600 dark:text-neutral-400">
              {task.description}
            </ThemedText>
          )}

          <View className="flex-row items-center">
            {/* Use theme neutral color for time icon */}
            <Ionicons name="time-outline" size={14} color={theme.colors.neutral[isDarkMode ? 300 : 500]} />
            {/* Use theme neutral color for time text */}
            <ThemedText className="ml-1 text-xs text-neutral-500 dark:text-neutral-400">
              {`${format(parseISO(task.dueDate), 'h:mm a')}`}
            </ThemedText>
          </View>
        </View>

        {/* Complete button */}
        <TouchableOpacity
          onPress={() => onComplete(task)} // Pass the full task model instance
          // Use theme primary colors for background
          className="ml-2 h-10 w-10 items-center justify-center self-center rounded-full bg-primary-100 dark:bg-primary-900">
          {/* Use theme primary color for checkmark icon */}
          <Ionicons name="checkmark" size={24} color={theme.colors.primary[isDarkMode ? 500 : 700]} />
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
  const { theme, isDarkMode } = useTheme(); // Get theme object and isDarkMode
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
    <ThemedView style={{ flex: 1 }}>
      {/* FlatList for tasks */}
      <FlatList
        key="tasks-list"
        data={tasks} // Use tasks from component state
        keyExtractor={(item) => item.id}
        renderItem={renderTaskItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing} // Use refreshing from usePullToRefresh
            onRefresh={handleRefresh}
            colors={[theme.colors.primary[600]]} // Use theme color
            tintColor={theme.colors.primary[600]} // Use theme color
          />
        }
        ListEmptyComponent={() => {
          // Loading state
          if (showLoadingIndicator) {
            return (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 }}>
                <ActivityIndicator size="large" color={theme.colors.primary[600]} />
              </View>
            );
          }
          
          // Empty state
          if (showEmptyState) {
            const formattedDate = format(selectedDate, 'MMMM d, yyyy');
            return (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 }}>
                <Ionicons
                  name="calendar-outline"
                  size={48}
                  color={theme.colors.neutral[isDarkMode ? 400 : 500]}
                />
                <ThemedText 
                  style={{ 
                    marginTop: 16, 
                    textAlign: 'center', 
                    fontSize: 18, 
                    fontWeight: '600',
                    color: isDarkMode ? theme.colors.neutral[300] : theme.colors.neutral[700]
                  }}>
                  {"All Clear!"}
                </ThemedText>
                <ThemedText 
                  style={{ 
                    marginTop: 4, 
                    textAlign: 'center',
                    color: isDarkMode ? theme.colors.neutral[400] : theme.colors.neutral[500]
                  }}>
                  {`No tasks scheduled for ${formattedDate}.`}
                </ThemedText>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/index' as any)}
                  style={{
                    marginTop: 24,
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: theme.colors.primary[600],
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 8,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 3,
                    elevation: 2
                  }}>
                  <Ionicons name="add" size={18} color={theme.colors.neutral[50]} />
                  <ThemedText style={{ marginLeft: 6, fontWeight: '500', color: theme.colors.neutral[50] }}>
                    {"Add New Task"}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            );
          }
          
          // Default case - return null
          return null;
        }
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
  const { theme, isDarkMode } = useTheme(); // Add theme context

  return (
    <SafeAreaView 
      style={{ 
        flex: 1, 
        backgroundColor: isDarkMode ? theme.colors.neutral[900] : theme.colors.neutral[50] 
      }} 
      edges={['top']}>
      <ThemedView style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <ThemedText style={{ marginBottom: 16, fontSize: 24, fontWeight: 'bold' }}>Calendar</ThemedText>
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
