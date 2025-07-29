import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Alert, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Q } from '@nozbe/watermelondb';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { format, addDays, isSameDay, startOfDay } from '@/lib/utils/date';
import { 
  validateNotificationSchedule, 
  formatScheduleError, 
  debugScheduleResult 
} from '@/lib/utils/notification-scheduling';
import { Logger } from '@/lib/utils/production-utils';
import Animated from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';

import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import { useButtonAnimation } from '@/lib/animations/useButtonAnimation';
import { useCardAnimation } from '@/lib/animations/useCardAnimation';
import { triggerLightHapticSync, triggerMediumHapticSync } from '@/lib/utils/haptics';
import { PlantTask } from '@/lib/models/PlantTask';
import { Plant } from '@/lib/models/Plant';
import { database } from '@/lib/models';
import { taskNotificationService } from '@/lib/services/taskNotificationService';
import BulkTaskActions from './BulkTaskActions';

interface TaskReminderCardProps {
  task: PlantTask;
  plant: Plant;
  onMarkDone: (task: PlantTask) => void;
  onSnooze: (task: PlantTask, minutes: number) => void;
  onReschedule: (task: PlantTask) => void;
  isSelected: boolean;
  onSelect: (task: PlantTask) => void;
  showSelection: boolean;
  isHorizontalLayout?: boolean;
}

const TaskReminderCard: React.FC<TaskReminderCardProps> = ({
  task,
  plant,
  onMarkDone,
  onSnooze,
  onReschedule,
  isSelected,
  onSelect,
  showSelection,
  isHorizontalLayout = false,
}) => {
  const { t } = useTranslation();
  const { animatedStyle, handlers } = useCardAnimation({
    enableHaptics: true,
    hapticStyle: 'light',
    onPress: () => {
      if (showSelection) {
        onSelect(task);
      }
    },
  });

  const markDoneAnimation = useButtonAnimation({
    enableHaptics: true,
    hapticStyle: 'medium',
    onPress: () => onMarkDone(task),
  });

  const snoozeAnimation = useButtonAnimation({
    enableHaptics: true,
    hapticStyle: 'light',
    onPress: () => onSnooze(task, 60), // 1 hour snooze
  });

  const rescheduleAnimation = useButtonAnimation({
    enableHaptics: true,
    hapticStyle: 'light',
    onPress: () => onReschedule(task),
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/10';
      case 'high':
        return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/10';
      case 'medium':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10';
      default:
        return 'border-l-neutral-300 dark:border-l-neutral-600 bg-neutral-50 dark:bg-neutral-800';
    }
  };

  const getTaskTypeIcon = (taskType: string) => {
    switch (taskType) {
      case 'watering':
        return 'water-outline';
      case 'feeding':
        return 'leaf-outline';
      case 'inspection':
        return 'eye-outline';
      case 'pruning':
        return 'cut-outline';
      case 'harvest':
        return 'basket-outline';
      case 'training':
        return 'fitness-outline';
      default:
        return 'checkmark-circle';
    }
  };

  const formatDueTime = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffInMinutes = Math.floor((due.getTime() - now.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 0) {
      const overdue = Math.abs(diffInMinutes);
      if (overdue < 60) {
        return t('taskReminders.overdueMinutes', { minutes: overdue });
      } else {
        const hours = Math.floor(overdue / 60);
        return t('taskReminders.overdueHours', { hours });
      }
    } else if (diffInMinutes < 60) {
      return t('taskReminders.dueInMinutes', { minutes: diffInMinutes });
    } else {
      const hours = Math.floor(diffInMinutes / 60);
      return t('taskReminders.dueInHours', { hours });
    }
  };

  // Horizontal layout for 5-day view
  if (isHorizontalLayout) {
    return (
      <Animated.View style={animatedStyle} className="mr-3">
        <Pressable {...handlers}>
          <ThemedView
            variant="card"
            className={`w-64 border-l-4 p-3 ${getPriorityColor(task.priority || 'low')} ${
              isSelected ? 'ring-2 ring-primary-500' : ''
            }`}
          >
            {/* Compact header for horizontal layout */}
            <ThemedView className="mb-2 flex-row items-center justify-between">
              <ThemedView className="flex-1 flex-row items-center">
                {plant.imageUrl && (
                  <ThemedView className="mr-2 h-8 w-8 overflow-hidden rounded-lg">
                    <Animated.Image
                      source={{ uri: plant.imageUrl }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  </ThemedView>
                )}
                <ThemedView className="flex-1">
                  <ThemedText variant="heading" className="text-sm font-semibold">
                    {plant.name}
                  </ThemedText>
                  <ThemedText variant="muted" className="text-xs">
                    {plant.strain}
                  </ThemedText>
                </ThemedView>
              </ThemedView>
              
              {showSelection && (
                <Animated.View style={markDoneAnimation.animatedStyle}>
                  <Pressable {...markDoneAnimation.handlers}>
                    <ThemedView
                      className={`h-5 w-5 rounded-full border-2 ${
                        isSelected
                          ? 'border-primary-500 bg-primary-500'
                          : 'border-neutral-300 dark:border-neutral-600'
                      }`}
                    >
                      {isSelected && (
                        <OptimizedIcon
                          name="checkmark"
                          size={10}
                          className="text-white"
                        />
                      )}
                    </ThemedView>
                  </Pressable>
                </Animated.View>
              )}
            </ThemedView>

            {/* Task details - compact */}
            <ThemedView className="mb-2 flex-row items-center">
              <OptimizedIcon
                name={getTaskTypeIcon(task.taskType)}
                size={16}
                className="mr-2 text-primary-500"
              />
              <ThemedView className="flex-1">
                <ThemedText variant="heading" className="text-sm">
                  {task.title}
                </ThemedText>
                {task.estimatedDuration && (
                  <ThemedText variant="muted" className="text-xs">
                    ~{task.estimatedDurationFormatted}
                  </ThemedText>
                )}
              </ThemedView>
            </ThemedView>

            {/* Due time and priority - compact */}
            <ThemedView className="mb-3 flex-row items-center justify-between">
              <ThemedText
                className={`text-xs font-medium ${
                  task.isOverdue
                    ? 'text-red-500'
                    : task.priority === 'high' || task.priority === 'critical'
                    ? 'text-orange-500'
                    : 'text-neutral-600 dark:text-neutral-400'
                }`}
              >
                {formatDueTime(task.dueDate)}
              </ThemedText>
              <ThemedText variant="muted" className="text-xs">
                {format(new Date(task.dueDate), 'h:mm a')}
              </ThemedText>
            </ThemedView>

            {/* Compact action buttons */}
            {!showSelection && (
              <ThemedView className="flex-row space-x-1">
                <Animated.View style={markDoneAnimation.animatedStyle} className="flex-1">
                  <Pressable {...markDoneAnimation.handlers}>
                    <ThemedView className="flex-row items-center justify-center rounded-md bg-primary-500 px-2 py-1">
                      <OptimizedIcon name="checkmark" size={12} className="mr-1 text-white" />
                      <ThemedText className="text-xs font-medium text-white">
                        {t('taskReminders.done')}
                      </ThemedText>
                    </ThemedView>
                  </Pressable>
                </Animated.View>

                <Animated.View style={snoozeAnimation.animatedStyle}>
                  <Pressable {...snoozeAnimation.handlers}>
                    <ThemedView className="flex-row items-center justify-center rounded-md bg-neutral-200 px-2 py-1 dark:bg-neutral-700">
                      <OptimizedIcon
                        name="refresh"
                        size={12}
                        className="text-neutral-700 dark:text-neutral-300"
                      />
                    </ThemedView>
                  </Pressable>
                </Animated.View>
              </ThemedView>
            )}
          </ThemedView>
        </Pressable>
      </Animated.View>
    );
  }

  // Standard vertical layout (reused from CareReminders)
  return (
    <Animated.View style={animatedStyle}>
      <Pressable {...handlers}>
        <ThemedView
          variant="card"
          className={`mb-3 border-l-4 p-4 ${getPriorityColor(task.priority || 'low')} ${
            isSelected ? 'ring-2 ring-primary-500' : ''
          }`}
        >
          {/* Header with plant info and selection */}
          <ThemedView className="mb-3 flex-row items-center justify-between">
            <ThemedView className="flex-1 flex-row items-center">
              {plant.imageUrl && (
                <ThemedView className="mr-3 h-12 w-12 overflow-hidden rounded-lg">
                  <Animated.Image
                    source={{ uri: plant.imageUrl }}
                    className="h-full w-full"
                    resizeMode="cover"
                  />
                </ThemedView>
              )}
              <ThemedView className="flex-1">
                <ThemedText variant="heading" className="text-base">
                  {plant.name}
                </ThemedText>
                <ThemedText variant="muted" className="text-sm">
                  {plant.strain}
                </ThemedText>
              </ThemedView>
            </ThemedView>
            
            {showSelection && (
              <Animated.View style={markDoneAnimation.animatedStyle}>
                <Pressable {...markDoneAnimation.handlers}>
                  <ThemedView
                    className={`h-6 w-6 rounded-full border-2 ${
                      isSelected
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-neutral-300 dark:border-neutral-600'
                    }`}
                  >
                    {isSelected && (
                      <OptimizedIcon
                        name="checkmark"
                        size={12}
                        className="text-white"
                      />
                    )}
                  </ThemedView>
                </Pressable>
              </Animated.View>
            )}
          </ThemedView>

          {/* Task details */}
          <ThemedView className="mb-3 flex-row items-center">
            <OptimizedIcon
              name={getTaskTypeIcon(task.taskType)}
              size={20}
              className="mr-3 text-primary-500"
            />
            <ThemedView className="flex-1">
              <ThemedText variant="heading" className="text-base">
                {task.title}
              </ThemedText>
              {task.description && (
                <ThemedText variant="muted" className="text-sm">
                  {task.description}
                </ThemedText>
              )}
              {task.estimatedDuration && (
                <ThemedText variant="muted" className="text-sm">
                  Estimated: {task.estimatedDurationFormatted}
                </ThemedText>
              )}
            </ThemedView>
          </ThemedView>

          {/* Due date and priority */}
          <ThemedView className="mb-4 flex-row items-center justify-between">
            <ThemedText
              className={`text-sm font-medium ${
                task.isOverdue
                  ? 'text-red-500'
                  : task.priority === 'critical'
                  ? 'text-red-500'
                  : task.priority === 'high'
                  ? 'text-orange-500'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              {formatDueTime(task.dueDate)}
            </ThemedText>
            <ThemedText variant="muted" className="text-xs">
              {format(new Date(task.dueDate), 'MMM d, h:mm a')}
            </ThemedText>
          </ThemedView>

          {/* Action buttons */}
          {!showSelection && (
            <ThemedView className="flex-row space-x-2">
              <Animated.View style={markDoneAnimation.animatedStyle} className="flex-1">
                <Pressable {...markDoneAnimation.handlers}>
                  <ThemedView className="flex-row items-center justify-center rounded-lg bg-primary-500 px-4 py-2">
                    <OptimizedIcon name="checkmark" size={16} className="mr-2 text-white" />
                    <ThemedText className="font-medium text-white">
                      {t('taskReminders.markDone')}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              </Animated.View>

              <Animated.View style={snoozeAnimation.animatedStyle}>
                <Pressable {...snoozeAnimation.handlers}>
                  <ThemedView className="flex-row items-center justify-center rounded-lg bg-neutral-200 px-3 py-2 dark:bg-neutral-700">
                    <OptimizedIcon
                      name="refresh"
                      size={16}
                      className="mr-1 text-neutral-700 dark:text-neutral-300"
                    />
                    <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {t('taskReminders.snooze')}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              </Animated.View>

              <Animated.View style={rescheduleAnimation.animatedStyle}>
                <Pressable {...rescheduleAnimation.handlers}>
                  <ThemedView className="flex-row items-center justify-center rounded-lg bg-neutral-200 px-3 py-2 dark:bg-neutral-700">
                    <OptimizedIcon
                      name="calendar-outline"
                      size={16}
                      className="text-neutral-700 dark:text-neutral-300"
                    />
                  </ThemedView>
                </Pressable>
              </Animated.View>
            </ThemedView>
          )}
        </ThemedView>
      </Pressable>
    </Animated.View>
  );
};

interface TaskReminder5DayProps {
  plantId?: string; // Optional filter for specific plant
  selectedDate?: Date; // For 5-day view focus
  showCompleted?: boolean;
  onTaskPress?: (task: PlantTask) => void;
  layoutMode?: 'horizontal' | 'vertical'; // New prop for layout adaptation
}

const TaskReminder5Day: React.FC<TaskReminder5DayProps> = ({
  plantId,
  selectedDate = new Date(),
  showCompleted = false,
  onTaskPress,
  layoutMode = 'vertical',
}) => {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [tasks, setTasks] = useState<PlantTask[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);

  // Generate 5-day date range for task-focused view
  const dateRange = useMemo(() => {
    const startDate = startOfDay(selectedDate);
    return Array.from({ length: 5 }, (_, i) => addDays(startDate, i));
  }, [selectedDate]);

  // Load tasks and plants with 5-day focus
  useEffect(() => {
    let taskSubscription: any;
    let plantsSubscription: any;

    const loadData = async () => {
      try {
        setLoading(true);
        
        // Query tasks for 5-day range with error handling
        const startDate = dateRange[0];
        const endDate = dateRange[dateRange.length - 1];
        
        if (!startDate || !endDate) {
          Logger.warn('[TaskReminder5Day] Invalid date range', { dateRange });
          return;
        }
        
        const taskQuery = database.collections
          .get<PlantTask>('plant_tasks')
          .query(
            Q.where('is_deleted', false),
            showCompleted ? Q.where('is_completed', true) : Q.where('is_completed', false),
            Q.where('due_date', Q.between(startDate.getTime(), endDate.getTime())),
            ...(plantId ? [Q.where('plant_id', plantId)] : []),
            Q.sortBy('due_date', Q.asc),
            Q.sortBy('priority', Q.desc) // High priority first
          );

        // Query plants with error handling
        const plantsQuery = database.collections
          .get<Plant>('plants')
          .query(Q.where('is_deleted', false));

        // Set up observables with error handling
        try {
          taskSubscription = taskQuery.observe().subscribe({
            next: setTasks,
            error: (error) => {
              console.error('Error in task subscription:', error);
              Alert.alert(
                t('taskReminders.error'),
                t('taskReminders.errorLoadingTasks')
              );
            }
          });

          plantsSubscription = plantsQuery.observe().subscribe({
            next: setPlants,
            error: (error) => {
              console.error('Error in plants subscription:', error);
              Alert.alert(
                t('taskReminders.error'),
                t('taskReminders.errorLoadingPlants')
              );
            }
          });
        } catch (subscriptionError) {
          console.error('Error setting up database subscriptions:', subscriptionError);
          Alert.alert(
            t('taskReminders.error'),
            t('taskReminders.errorDatabaseConnection')
          );
        }
      } catch (error) {
        console.error('Error loading task reminders:', error);
        Alert.alert(
          t('taskReminders.error'),
          t('taskReminders.errorLoadingData')
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => {
      try {
        taskSubscription?.unsubscribe();
        plantsSubscription?.unsubscribe();
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }
    };
  }, [plantId, showCompleted, dateRange, t, retryKey]);

  const handleRetry = useCallback(() => {
    setRetryKey((prev) => prev + 1);
    setTasks([]);
    setPlants([]);
    setSelectedTasks(new Set());
    setShowBatchActions(false);
  }, []);

  // Create plant lookup map
  const plantMap = useMemo(() => {
    const map = new Map<string, Plant>();
    plants.forEach((plant) => map.set(plant.id, plant));
    return map;
  }, [plants]);

  // Group tasks by date for 5-day view
  const tasksByDate = useMemo(() => {
    const groups = new Map<string, PlantTask[]>();
    
    dateRange.forEach(date => {
      const dateKey = format(date, 'yyyy-MM-dd');
      groups.set(dateKey, []);
    });

    tasks.forEach((task) => {
      const taskDate = format(new Date(task.dueDate), 'yyyy-MM-dd');
      if (groups.has(taskDate)) {
        groups.get(taskDate)!.push(task);
      }
    });

    return groups;
  }, [tasks, dateRange]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // Refresh data - WatermelonDB will automatically update
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleMarkDone = useCallback(async (task: PlantTask) => {
    try {
      await taskNotificationService.markTaskCompleted(task.id);
      triggerMediumHapticSync();
      
      // Cancel any scheduled notification
      try {
        await Notifications.cancelScheduledNotificationAsync(task.id);
      } catch (notificationError) {
        console.error('Error cancelling notification:', notificationError);
      }
    } catch (error) {
      console.error('Error marking task as done:', error);
      Alert.alert(
        t('taskReminders.error'),
        t('taskReminders.errorMarkingDone')
      );
    }
  }, [t]);

  const handleSnooze = useCallback(async (task: PlantTask, minutes: number) => {
    try {
      await taskNotificationService.snoozeTask(task.id, minutes);
      triggerLightHapticSync();
      
      // Reschedule notification
      try {
        await scheduleTaskNotification(task, minutes);
      } catch (notificationError) {
        console.error('Error rescheduling notification:', notificationError);
      }
    } catch (error) {
      console.error('Error snoozing task:', error);
      Alert.alert(
        t('taskReminders.error'),
        t('taskReminders.errorSnoozing')
      );
    }
  }, [t]);

  const handleReschedule = useCallback((task: PlantTask) => {
    // This would open a date picker modal
    // For now, just snooze by 1 day
    handleSnooze(task, 24 * 60);
  }, [handleSnooze]);

  const handleSelectTask = useCallback((task: PlantTask) => {
    setSelectedTasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(task.id)) {
        newSet.delete(task.id);
      } else {
        newSet.add(task.id);
      }
      return newSet;
    });
  }, []);

  const handleBulkComplete = useCallback(async (taskIds: string[]) => {
    try {
      await taskNotificationService.batchMarkCompleted(taskIds);
      
      // Cancel notifications for all selected tasks
      try {
        await Promise.all(
          taskIds.map((id) => Notifications.cancelScheduledNotificationAsync(id))
        );
      } catch (notificationError) {
        console.error('Error cancelling batch notifications:', notificationError);
      }
      
      setSelectedTasks(new Set());
      setShowBatchActions(false);
      triggerMediumHapticSync();
    } catch (error) {
      console.error('Error batch marking tasks as done:', error);
      Alert.alert(
        t('taskReminders.error'),
        t('taskReminders.errorBatchMarkingDone')
      );
    }
  }, [t]);

  const handleBulkSnooze = useCallback(async (taskIds: string[], minutes: number) => {
    try {
      await taskNotificationService.batchSnooze(taskIds, minutes);
      
      // Reschedule notifications for all selected tasks
      try {
        const selectedTaskObjects = tasks.filter((t) => taskIds.includes(t.id));
        await Promise.all(
          selectedTaskObjects.map((task) => scheduleTaskNotification(task, minutes))
        );
      } catch (notificationError) {
        console.error('Error rescheduling batch notifications:', notificationError);
      }
      
      setSelectedTasks(new Set());
      setShowBatchActions(false);
      triggerLightHapticSync();
    } catch (error) {
      console.error('Error batch snoozing tasks:', error);
      Alert.alert(
        t('taskReminders.error'),
        t('taskReminders.errorBatchSnoozing')
      );
    }
  }, [tasks, t]);

  const handleBulkReschedule = useCallback(async (taskIds: string[], newDate: Date) => {
    try {
      await taskNotificationService.batchReschedule(taskIds, newDate);
      
      setSelectedTasks(new Set());
      setShowBatchActions(false);
      triggerLightHapticSync();
    } catch (error) {
      console.error('Error batch rescheduling tasks:', error);
      Alert.alert(
        t('taskReminders.error'),
        t('taskReminders.errorBatchRescheduling')
      );
    }
  }, [t]);

  const toggleBatchMode = useCallback(() => {
    setShowBatchActions(!showBatchActions);
    setSelectedTasks(new Set());
    triggerLightHapticSync();
  }, [showBatchActions]);

  // Helper function to schedule task notifications
  const scheduleTaskNotification = async (task: PlantTask, minutesFromNow: number = 0) => {
    try {
      const plant = plantMap.get(task.plantId);
      if (!plant) {
        console.warn(`Plant not found for task ${task.id}`);
        return;
      }

      const scheduleDate = new Date(new Date(task.dueDate).getTime() + minutesFromNow * 60 * 1000);
      
      // Validate the scheduled date
      const scheduleResult = validateNotificationSchedule(
        scheduleDate,
        0,
        1 // Minimum 1 minute in the future
      );

      debugScheduleResult(scheduleResult, `Schedule task notification for ${task.id}`);

      if (!scheduleResult.success) {
        const errorMessage = formatScheduleError(
          scheduleResult.error,
          t('taskReminders.scheduleErrorFallback', 'Unable to schedule notification')
        );
        
        Alert.alert(
          t('taskReminders.invalidDateTitle', 'Invalid Task Date'),
          errorMessage,
          [{ text: t('common.ok', 'OK') }]
        );
        return;
      }

      // Schedule the notification with task-focused content
      await Notifications.scheduleNotificationAsync({
        identifier: task.id,
        content: {
          title: `🌱 ${plant.name} - ${task.title}`,
          body: `${task.description || t('taskReminders.defaultTaskBody')} • Priority: ${task.priority}${task.estimatedDuration ? ` • ~${task.estimatedDurationFormatted}` : ''}`,
          data: {
            taskId: task.id,
            plantId: plant.id,
            taskType: task.taskType,
            priority: task.priority,
            navigateTo: 'calendar',
            selectedDate: scheduleDate.toISOString(),
          },
        },
        trigger: {
          type: SchedulableTriggerInputTypes.DATE,
          date: scheduleResult.scheduledDate!,
        },
      });
    } catch (error) {
      console.error('Error scheduling task notification:', error);
    }
  };

  const batchActionsAnimation = useButtonAnimation({
    enableHaptics: true,
    hapticStyle: 'medium',
    onPress: toggleBatchMode,
  });

  if (tasks.length === 0) {
    return (
      <ThemedView className="flex-1 items-center justify-center p-6">
        <OptimizedIcon
          name="checkmark-circle"
          size={64}
          className="mb-4 text-primary-500"
        />
        <ThemedText variant="heading" className="mb-2 text-center text-xl">
          {showCompleted
            ? t('taskReminders.noCompletedTasks')
            : t('taskReminders.noActiveTasks')
          }
        </ThemedText>
        <ThemedText variant="muted" className="text-center">
          {showCompleted
            ? t('taskReminders.noCompletedTasksDescription')
            : t('taskReminders.noActiveTasksDescription')
          }
        </ThemedText>
      </ThemedView>
    );
  }

  // Horizontal 5-day layout
  if (layoutMode === 'horizontal') {
    return (
      <ThemedView className="flex-1">
        {/* Header with batch actions */}
        <ThemedView className="flex-row items-center justify-between p-4">
          <ThemedText variant="heading" className="text-xl">
            {t('taskReminders.upcomingTasks')}
          </ThemedText>
          
          <Animated.View style={batchActionsAnimation.animatedStyle}>
            <Pressable {...batchActionsAnimation.handlers}>
              <ThemedView
                className={`rounded-lg px-3 py-2 ${
                  showBatchActions
                    ? 'bg-primary-500'
                    : 'bg-neutral-200 dark:bg-neutral-700'
                }`}
              >
                <OptimizedIcon
                  name="checkmark-circle"
                  size={16}
                  className={
                    showBatchActions
                      ? 'text-white'
                      : 'text-neutral-700 dark:text-neutral-300'
                  }
                />
              </ThemedView>
            </Pressable>
          </Animated.View>
        </ThemedView>

        {/* 5-day horizontal scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {dateRange.map((date) => {
            const dateKey = format(date, 'yyyy-MM-dd');
            const dayTasks = tasksByDate.get(dateKey) || [];
            
            return (
              <ThemedView key={dateKey} className="mr-4">
                {/* Day header */}
                <ThemedView className="mb-3 rounded-lg bg-neutral-100 p-3 dark:bg-neutral-800">
                  <ThemedText className="text-center text-sm font-semibold">
                    {format(date, 'EEE')}
                  </ThemedText>
                  <ThemedText className="text-center text-xs text-neutral-600 dark:text-neutral-400">
                    {format(date, 'MMM d')}
                  </ThemedText>
                  {dayTasks.length > 0 && (
                    <ThemedView className="mt-1 rounded-full bg-primary-500 px-2 py-1">
                      <ThemedText className="text-center text-xs text-white">
                        {dayTasks.length}
                      </ThemedText>
                    </ThemedView>
                  )}
                </ThemedView>

                {/* Tasks for this day */}
                <ThemedView className="w-64">
                  {dayTasks.map((task) => {
                    const plant = plantMap.get(task.plantId);
                    if (!plant) return null;
                    
                    return (
                      <TaskReminderCard
                        key={task.id}
                        task={task}
                        plant={plant}
                        onMarkDone={handleMarkDone}
                        onSnooze={handleSnooze}
                        onReschedule={handleReschedule}
                        isSelected={selectedTasks.has(task.id)}
                        onSelect={handleSelectTask}
                        showSelection={showBatchActions}
                        isHorizontalLayout={true}
                      />
                    );
                  })}
                  
                  {dayTasks.length === 0 && (
                    <ThemedView className="w-64 items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 p-6 dark:border-neutral-600">
                      <OptimizedIcon
                        name="checkmark-circle"
                        size={24}
                        className="mb-2 text-neutral-400"
                      />
                      <ThemedText variant="muted" className="text-center text-xs">
                        {t('taskReminders.noTasksForDay')}
                      </ThemedText>
                    </ThemedView>
                  )}
                </ThemedView>
              </ThemedView>
            );
          })}
        </ScrollView>

        {/* Bulk actions for horizontal layout */}
        <BulkTaskActions
          selectedTasks={selectedTasks}
          tasks={tasks}
          onBulkComplete={handleBulkComplete}
          onBulkReschedule={handleBulkReschedule}
          onBulkSnooze={handleBulkSnooze}
          onClearSelection={() => {
            setSelectedTasks(new Set());
            setShowBatchActions(false);
          }}
          isVisible={showBatchActions && selectedTasks.size > 0}
        />
      </ThemedView>
    );
  }

  // Vertical layout (standard)
  return (
    <ThemedView className="flex-1">
      {/* Header with batch actions */}
      <ThemedView className="flex-row items-center justify-between p-4">
        <ThemedText variant="heading" className="text-xl">
          {showCompleted ? t('taskReminders.completed') : t('taskReminders.active')}
        </ThemedText>
        
        <Animated.View style={batchActionsAnimation.animatedStyle}>
          <Pressable {...batchActionsAnimation.handlers}>
            <ThemedView
              className={`rounded-lg px-3 py-2 ${
                showBatchActions
                  ? 'bg-primary-500'
                  : 'bg-neutral-200 dark:bg-neutral-700'
              }`}
            >
              <OptimizedIcon
                name="checkmark-circle"
                size={16}
                className={
                  showBatchActions
                    ? 'text-white'
                    : 'text-neutral-700 dark:text-neutral-300'
                }
              />
            </ThemedView>
          </Pressable>
        </Animated.View>
      </ThemedView>

      {/* Tasks list */}
      <ScrollView
        className="flex-1 px-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {tasks.map((task) => {
          const plant = plantMap.get(task.plantId);
          if (!plant) return null;
          
          return (
            <TaskReminderCard
              key={task.id}
              task={task}
              plant={plant}
              onMarkDone={handleMarkDone}
              onSnooze={handleSnooze}
              onReschedule={handleReschedule}
              isSelected={selectedTasks.has(task.id)}
              onSelect={handleSelectTask}
              showSelection={showBatchActions}
              isHorizontalLayout={false}
            />
          );
        })}

        {/* Bottom padding for safe area */}
        <ThemedView className="h-20" />
      </ScrollView>

      {/* Bulk actions */}
      <BulkTaskActions
        selectedTasks={selectedTasks}
        tasks={tasks}
        onBulkComplete={handleBulkComplete}
        onBulkReschedule={handleBulkReschedule}
        onBulkSnooze={handleBulkSnooze}
        onClearSelection={() => {
          setSelectedTasks(new Set());
          setShowBatchActions(false);
        }}
        isVisible={showBatchActions && selectedTasks.size > 0}
      />
    </ThemedView>
  );
};

export default TaskReminder5Day;