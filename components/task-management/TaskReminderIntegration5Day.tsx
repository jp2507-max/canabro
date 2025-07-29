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
 * - 5-day focus window management
 * - Horizontal layout optimization
 * - Task-focused notification display
 * - Bulk operations integration
 * - Performance caching
 * 
 * Requirements: R2-AC2, R2-AC5
 */
const TaskReminderIntegration5Day: React.FC<TaskReminderIntegration5DayProps> = ({
  selectedDate = new Date(),
  plantId,
  onTaskPress,
  showCompleted = false,
  layoutMode = 'horizontal',

}) => {
  const { t } = useTranslation();
  
  // 5-day workflow hook integration
  const {
    focusStartDate,
    focusEndDate,
    updateFocus,
    scheduleTasksFor5Day,
    processOverdueTasks,
    cachedBatches,
    refreshCache,
    workflowStats,
    isScheduling,
    isProcessingOverdue,
    error: reminderError,
  } = useTaskReminder5Day({
    focusStartDate: startOfDay(selectedDate),
    enableAutoFocus: true,
    enableCaching: true,
  });

  // Local state for UI management
  const [showStats, setShowStats] = useState(false);

  // Update focus when selected date changes
  useEffect(() => {
    const newFocusDate = startOfDay(selectedDate);
    if (newFocusDate.getTime() !== focusStartDate.getTime()) {
      updateFocus(newFocusDate);
    }
  }, [selectedDate, focusStartDate, updateFocus]);

  // Handle refresh with 5-day optimization
  const handleRefresh = useCallback(async () => {
    try {
      // Process any overdue tasks first
      await processOverdueTasks();
      
      // Refresh cached data
      refreshCache();
      
      triggerLightHapticSync();
    } catch (error) {
      console.error('Error refreshing 5-day task reminders:', error);
      Alert.alert(
        t('taskReminders.error'),
        t('taskReminders.errorRefreshing')
      );
    }
  }, [processOverdueTasks, refreshCache, t]);



  // Toggle workflow statistics display
  const toggleStats = useCallback(() => {
    setShowStats(!showStats);
    triggerLightHapticSync();
  }, [showStats]);



  // Error handling display
  if (reminderError) {
    return (
      <ThemedView className="flex-1 items-center justify-center p-6">
        <OptimizedIcon
          name="alert-outline"
          size={64}
          className="mb-4 text-red-500"
        />
        <ThemedText variant="heading" className="mb-2 text-center text-xl">
          {t('taskReminders.errorTitle')}
        </ThemedText>
        <ThemedText variant="muted" className="mb-4 text-center">
          {reminderError}
        </ThemedText>
        <Pressable className="rounded-lg bg-primary-500 px-4 py-2" onPress={handleRefresh}>
          <ThemedText className="font-medium text-white">
            {t('common.retry')}
          </ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView className="flex-1">
      {/* 5-Day Focus Header */}
      <ThemedView className="border-b border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800">
        <ThemedView className="mb-2 flex-row items-center justify-between">
          <ThemedText variant="heading" className="text-lg">
            {t('taskReminders.fiveDayFocus')}
          </ThemedText>
          
          <ThemedView className="flex-row space-x-2">
            {/* Workflow Stats Toggle */}
            <Pressable
              className={`rounded-lg px-3 py-1 ${
                showStats ? 'bg-primary-500' : 'bg-neutral-200 dark:bg-neutral-700'
              }`}
              onPress={toggleStats}
            >
              <OptimizedIcon
                name="analytics-outline"
                size={16}
                className={showStats ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}
              />
            </Pressable>
            
            {/* Loading indicators */}
            {(isScheduling || isProcessingOverdue) && (
              <ThemedView className="rounded-lg bg-blue-100 px-3 py-1 dark:bg-blue-900">
                <OptimizedIcon
                  name="refresh"
                  size={16}
                  className="text-blue-600 dark:text-blue-400"
                />
              </ThemedView>
            )}
          </ThemedView>
        </ThemedView>

        {/* Date Range Display */}
        <ThemedView className="flex-row items-center justify-between">
          <ThemedText variant="muted" className="text-sm">
            {format(focusStartDate, 'MMM d')} - {format(focusEndDate, 'MMM d, yyyy')}
          </ThemedText>
          
          {cachedBatches && (
            <ThemedText variant="muted" className="text-xs">
              {t('taskReminders.cachedBatches', { count: cachedBatches.length })}
            </ThemedText>
          )}
        </ThemedView>

        {/* Workflow Statistics (collapsible) */}
        {showStats && workflowStats && (
          <ThemedView className="mt-3 rounded-lg bg-neutral-100 p-3 dark:bg-neutral-700">
            <ThemedText variant="heading" className="mb-2 text-sm">
              {t('taskReminders.workflowStats')}
            </ThemedText>
            <ThemedView className="space-y-1">
              <ThemedText variant="muted" className="text-xs">
                {t('taskReminders.batchingStrategy')}: {workflowStats.batchingStrategy}
              </ThemedText>
              <ThemedText variant="muted" className="text-xs">
                {t('taskReminders.cachedBatches')}: {workflowStats.cachedBatches}
              </ThemedText>
            </ThemedView>
          </ThemedView>
        )}
      </ThemedView>

      {/* Main Task Reminder Component */}
      <TaskReminder5Day
        plantId={plantId}
        selectedDate={selectedDate}
        showCompleted={showCompleted}
        onTaskPress={onTaskPress}
        layoutMode={layoutMode}
      />

      {/* Note: BulkTaskActions integration would be handled by the parent TaskReminder5Day component */}
      {/* The bulk actions are already integrated within TaskReminder5Day.tsx */}
    </ThemedView>
  );
};

export default TaskReminderIntegration5Day;