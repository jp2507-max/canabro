import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Alert, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { format, addDays, startOfDay } from '@/lib/utils/date';

import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import TaskReminder5Day from './TaskReminder5Day';

import { useTaskReminder5Day } from '@/lib/hooks/useTaskReminder5Day';
import { PlantTask } from '@/lib/models/PlantTask';
import { triggerLightHapticSync } from '@/lib/utils/haptics';

interface TaskReminderIntegration5DayProps {
  selectedDate?: Date;
  plantId?: string;
  onTaskPress?: (task: PlantTask) => void;
  showCompleted?: boolean;
  layoutMode?: 'horizontal' | 'vertical';
}

/**
 * TaskReminderIntegration5Day Component
 * 
 * Integrates the 5-day optimized task reminder system with the horizontal
 * task view interface. Provides seamless notification management optimized
 * for daily plant care workflows.
 * 
 * Features:
 * - 5-day focus window with horizontal navigation
 * - Optimized notification scheduling for daily workflows
 * - Task-specific quiet hours handling
 * - Performance caching for smooth scrolling
 * 
 * Requirements: R2-AC2, R2-AC5, R5-AC2
 */
const TaskReminderIntegration5Day: React.FC<TaskReminderIntegration5DayProps> = ({
  selectedDate = new Date(),
  plantId,
  onTaskPress,
  showCompleted = false,
  layoutMode = 'horizontal',
}) => {
  const { t } = useTranslation();
  
  // Use 5-day task reminder hook
  const {
    focusStartDate,
    focusEndDate,
    dailyTaskBatches,
    tasks,
    overdueTasks,
    todayTasks,
    loading,
    refreshing,
    refreshTasks,
    markTaskComplete,
    snoozeTask,
    rescheduleTask,
    scheduleNotifications,
    setFocusDate,
    navigateToToday,
    navigateToPrevious,
    navigateToNext,
  } = useTaskReminder5Day({
    focusStartDate: selectedDate,
    enableAutoFocus: true,
    enableCaching: true,
  });

  // Handle task completion
  const handleTaskComplete = useCallback(async (task: PlantTask) => {
    try {
      triggerLightHapticSync();
      await markTaskComplete(task.id);
    } catch (error) {
      Alert.alert(
        t('taskReminders.error'),
        t('taskReminders.errorCompletingTask')
      );
    }
  }, [markTaskComplete, t]);

  // Handle task snooze
  const handleTaskSnooze = useCallback(async (task: PlantTask, minutes: number) => {
    try {
      triggerLightHapticSync();
      await snoozeTask(task.id, minutes);
    } catch (error) {
      Alert.alert(
        t('taskReminders.error'),
        t('taskReminders.errorSnoozingTask')
      );
    }
  }, [snoozeTask, t]);

  // Handle task reschedule
  const handleTaskReschedule = useCallback(async (task: PlantTask) => {
    // This would typically open a date picker
    // For now, reschedule to tomorrow
    try {
      triggerLightHapticSync();
      const tomorrow = addDays(new Date(), 1);
      await rescheduleTask(task.id, tomorrow);
    } catch (error) {
      Alert.alert(
        t('taskReminders.error'),
        t('taskReminders.errorReschedulingTask')
      );
    }
  }, [rescheduleTask, t]);

  // Handle task press
  const handleTaskPress = useCallback((task: PlantTask) => {
    triggerLightHapticSync();
    onTaskPress?.(task);
  }, [onTaskPress]);

  // Navigation handlers
  const handleNavigateToToday = useCallback(() => {
    triggerLightHapticSync();
    navigateToToday();
  }, [navigateToToday]);

  const handleNavigatePrevious = useCallback(() => {
    triggerLightHapticSync();
    navigateToPrevious();
  }, [navigateToPrevious]);

  const handleNavigateNext = useCallback(() => {
    triggerLightHapticSync();
    navigateToNext();
  }, [navigateToNext]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.isCompleted).length;
    const overdueCount = overdueTasks.length;
    const todayCount = todayTasks.length;
    
    return {
      totalTasks,
      completedTasks,
      overdueCount,
      todayCount,
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
    };
  }, [tasks, overdueTasks, todayTasks]);

  return (
    <ThemedView className="flex-1">
      {/* Header with navigation and stats */}
      <ThemedView className="border-b border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
        {/* Navigation controls */}
        <ThemedView className="mb-3 flex-row items-center justify-between">
          <Pressable onPress={handleNavigatePrevious}>
            <ThemedView className="rounded-full bg-neutral-100 p-2 dark:bg-neutral-700">
              <OptimizedIcon
                name="chevron-back"
                size={20}
                className="text-neutral-600 dark:text-neutral-400"
              />
            </ThemedView>
          </Pressable>

          <Pressable onPress={handleNavigateToToday}>
            <ThemedView className="rounded-lg bg-primary-500 px-4 py-2">
              <ThemedText className="font-medium text-white">
                {t('calendar.today')}
              </ThemedText>
            </ThemedView>
          </Pressable>

          <Pressable onPress={handleNavigateNext}>
            <ThemedView className="rounded-full bg-neutral-100 p-2 dark:bg-neutral-700">
              <OptimizedIcon
                name="chevron-forward"
                size={20}
                className="text-neutral-600 dark:text-neutral-400"
              />
            </ThemedView>
          </Pressable>
        </ThemedView>

        {/* Date range display */}
        <ThemedView className="mb-3 items-center">
          <ThemedText variant="heading" className="text-lg font-semibold">
            {format(focusStartDate, 'MMM d')} - {format(focusEndDate, 'MMM d, yyyy')}
          </ThemedText>
        </ThemedView>

        {/* Summary statistics */}
        <ThemedView className="flex-row items-center justify-between">
          <ThemedView className="flex-row items-center">
            <OptimizedIcon
              name="checkmark-circle"
              size={16}
              className="mr-1 text-green-500"
            />
            <ThemedText variant="muted" className="text-sm">
              {summaryStats.completedTasks}/{summaryStats.totalTasks} {t('taskReminders.completed')}
            </ThemedText>
          </ThemedView>

          {summaryStats.overdueCount > 0 && (
            <ThemedView className="flex-row items-center">
              <OptimizedIcon
                name="warning"
                size={16}
                className="mr-1 text-red-500"
              />
              <ThemedText className="text-sm font-medium text-red-500">
                {summaryStats.overdueCount} {t('taskReminders.overdue')}
              </ThemedText>
            </ThemedView>
          )}

          {summaryStats.todayCount > 0 && (
            <ThemedView className="flex-row items-center">
              <OptimizedIcon
                name="calendar"
                size={16}
                className="mr-1 text-blue-500"
              />
              <ThemedText className="text-sm font-medium text-blue-500">
                {summaryStats.todayCount} {t('taskReminders.today')}
              </ThemedText>
            </ThemedView>
          )}
        </ThemedView>
      </ThemedView>

      {/* Task reminder component */}
      <TaskReminder5Day
        plantId={plantId}
        selectedDate={selectedDate}
        showCompleted={showCompleted}
        onTaskPress={handleTaskPress}
        layoutMode={layoutMode}
      />

      {/* Loading overlay */}
      {loading && (
        <ThemedView className="absolute inset-0 items-center justify-center bg-white/80 dark:bg-neutral-900/80">
          <OptimizedIcon
            name="refresh"
            size={32}
            className="mb-2 animate-spin text-primary-500"
          />
          <ThemedText variant="muted">
            {t('taskReminders.loading')}
          </ThemedText>
        </ThemedView>
      )}
    </ThemedView>
  );
};

export default TaskReminderIntegration5Day;