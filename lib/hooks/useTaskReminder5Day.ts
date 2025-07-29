/**
 * Task Reminder Hook - 5-Day Workflow
 * 
 * React hook for managing task reminders with 5-day workflow optimization.
 * Provides easy integration with the horizontal 5-day task view components.
 * 
 * Features:
 * - 5-day focus window management
 * - Optimized notification scheduling
 * - Performance caching for horizontal view
 * - Task-specific quiet hours handling
 * 
 * Requirements: R2-AC2, R2-AC5, R5-AC2
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Logger } from '@/lib/utils/production-utils';
import { PlantTask } from '@/lib/models/PlantTask';
import { taskReminderIntegration5Day } from '@/lib/services/TaskReminderIntegration5Day';
import { DailyTaskBatch } from '@/lib/services/TaskReminderEngine5Day';
import { taskReminderIntegration } from '@/lib/services/TaskReminderIntegration';
import { startOfDay, addDays } from '@/lib/utils/date';

export interface Use5DayTaskReminderOptions {
  focusStartDate?: Date;
  enableAutoFocus?: boolean;
  enableCaching?: boolean;
  userId?: string;
}

export interface Use5DayTaskReminderReturn {
  // 5-day focus data
  focusStartDate: Date;
  focusEndDate: Date;
  dailyTaskBatches: DailyTaskBatch[];
  
  // Task management
  tasks: PlantTask[];
  overdueTasks: PlantTask[];
  todayTasks: PlantTask[];
  upcomingTasks: PlantTask[];
  
  // Loading states
  loading: boolean;
  refreshing: boolean;
  
  // Actions
  refreshTasks: () => Promise<void>;
  markTaskComplete: (taskId: string) => Promise<void>;
  snoozeTask: (taskId: string, minutes: number) => Promise<void>;
  rescheduleTask: (taskId: string, newDate: Date) => Promise<void>;
  
  // Notification management
  scheduleNotifications: () => Promise<void>;
  clearNotifications: () => Promise<void>;
  
  // Focus management
  setFocusDate: (date: Date) => void;
  navigateToToday: () => void;
  navigateToPrevious: () => void;
  navigateToNext: () => void;
}

/**
 * Hook for managing task reminders with 5-day workflow optimization
 */
export function useTaskReminder5Day(
  options: Use5DayTaskReminderOptions = {}
): Use5DayTaskReminderReturn {
  const {
    focusStartDate: initialFocusDate = new Date(),
    enableAutoFocus = true,
    enableCaching = true,
    userId = 'current-user',
  } = options;

  // State management
  const [focusStartDate, setFocusStartDate] = useState(startOfDay(initialFocusDate));
  const [tasks, setTasks] = useState<PlantTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Computed focus window
  const focusEndDate = useMemo(() => 
    addDays(focusStartDate, 4), // 5-day window
    [focusStartDate]
  );

  // Load tasks for focus window
  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      
      const focusWindowTasks = await taskReminderIntegration5Day.getTasksForDateRange(
        focusStartDate,
        focusEndDate,
        { enableCaching }
      );
      
      setTasks(focusWindowTasks);
      
    } catch (error) {
      Logger.error('[useTaskReminder5Day] Error loading tasks', { error });
    } finally {
      setLoading(false);
    }
  }, [focusStartDate, focusEndDate, enableCaching]);

  // Refresh tasks
  const refreshTasks = useCallback(async () => {
    try {
      setRefreshing(true);
      await loadTasks();
    } finally {
      setRefreshing(false);
    }
  }, [loadTasks]);

  // Task categorization
  const { overdueTasks, todayTasks, upcomingTasks } = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    
    return {
      overdueTasks: tasks.filter(task => 
        !task.isCompleted && new Date(task.dueDate) < today
      ),
      todayTasks: tasks.filter(task => 
        !task.isCompleted && startOfDay(new Date(task.dueDate)).getTime() === today.getTime()
      ),
      upcomingTasks: tasks.filter(task => 
        !task.isCompleted && new Date(task.dueDate) > today
      ),
    };
  }, [tasks]);

  // Daily task batches for 5-day view
  const dailyTaskBatches = useMemo(() => {
    const batches: DailyTaskBatch[] = [];
    
    for (let i = 0; i < 5; i++) {
      const date = addDays(focusStartDate, i);
      const dayTasks = tasks.filter(task => 
        startOfDay(new Date(task.dueDate)).getTime() === startOfDay(date).getTime()
      );
      
      batches.push({
        date,
        tasks: dayTasks,
        totalCount: dayTasks.length,
        overdueCount: dayTasks.filter(task => task.isOverdue).length,
        completedCount: dayTasks.filter(task => task.isCompleted).length,
      });
    }
    
    return batches;
  }, [tasks, focusStartDate]);

  // Task actions
  const markTaskComplete = useCallback(async (taskId: string) => {
    try {
      await taskReminderIntegration.markTaskComplete(taskId);
      await refreshTasks();
    } catch (error) {
      Logger.error('[useTaskReminder5Day] Error marking task complete', { taskId, error });
      throw error;
    }
  }, [refreshTasks]);

  const snoozeTask = useCallback(async (taskId: string, minutes: number) => {
    try {
      await taskReminderIntegration.snoozeTask(taskId, minutes);
      await refreshTasks();
    } catch (error) {
      Logger.error('[useTaskReminder5Day] Error snoozing task', { taskId, minutes, error });
      throw error;
    }
  }, [refreshTasks]);

  const rescheduleTask = useCallback(async (taskId: string, newDate: Date) => {
    try {
      await taskReminderIntegration.rescheduleTask(taskId, newDate);
      await refreshTasks();
    } catch (error) {
      Logger.error('[useTaskReminder5Day] Error rescheduling task', { taskId, newDate, error });
      throw error;
    }
  }, [refreshTasks]);

  // Notification management
  const scheduleNotifications = useCallback(async () => {
    try {
      await taskReminderIntegration5Day.scheduleNotificationsForFocusWindow(
        focusStartDate,
        focusEndDate,
        userId
      );
    } catch (error) {
      Logger.error('[useTaskReminder5Day] Error scheduling notifications', { error });
      throw error;
    }
  }, [focusStartDate, focusEndDate, userId]);

  const clearNotifications = useCallback(async () => {
    try {
      await taskReminderIntegration5Day.clearNotificationsForFocusWindow(
        focusStartDate,
        focusEndDate
      );
    } catch (error) {
      Logger.error('[useTaskReminder5Day] Error clearing notifications', { error });
      throw error;
    }
  }, [focusStartDate, focusEndDate]);

  // Focus navigation
  const setFocusDate = useCallback((date: Date) => {
    setFocusStartDate(startOfDay(date));
  }, []);

  const navigateToToday = useCallback(() => {
    setFocusStartDate(startOfDay(new Date()));
  }, []);

  const navigateToPrevious = useCallback(() => {
    setFocusStartDate(prev => addDays(prev, -1));
  }, []);

  const navigateToNext = useCallback(() => {
    setFocusStartDate(prev => addDays(prev, 1));
  }, []);

  // Load tasks when focus window changes
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Auto-schedule notifications when tasks change
  useEffect(() => {
    if (tasks.length > 0 && enableAutoFocus) {
      scheduleNotifications().catch(error => {
        Logger.warn('[useTaskReminder5Day] Auto-scheduling notifications failed', { error });
      });
    }
  }, [tasks, scheduleNotifications, enableAutoFocus]);

  return {
    // 5-day focus data
    focusStartDate,
    focusEndDate,
    dailyTaskBatches,
    
    // Task management
    tasks,
    overdueTasks,
    todayTasks,
    upcomingTasks,
    
    // Loading states
    loading,
    refreshing,
    
    // Actions
    refreshTasks,
    markTaskComplete,
    snoozeTask,
    rescheduleTask,
    
    // Notification management
    scheduleNotifications,
    clearNotifications,
    
    // Focus management
    setFocusDate,
    navigateToToday,
    navigateToPrevious,
    navigateToNext,
  };
}