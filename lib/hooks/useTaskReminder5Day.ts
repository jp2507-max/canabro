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
  // Focus window management
  focusStartDate: Date;
  focusEndDate: Date;
  updateFocus: (startDate: Date) => void;
  
  // Notification scheduling
  scheduleTasksFor5Day: (tasks: PlantTask[]) => Promise<void>;
  processOverdueTasks: () => Promise<void>;
  
  // Performance optimization
  cachedBatches: DailyTaskBatch[] | undefined;
  refreshCache: () => void;
  
  // Statistics and monitoring
  workflowStats: {
    focusWindow: { start: Date; end: Date };
    cachedBatches: number;
    batchingStrategy: string;
  } | null;
  
  // Loading states
  isScheduling: boolean;
  isProcessingOverdue: boolean;
  error: string | null;
}

/**
 * Hook for managing 5-day workflow task reminders
 * 
 * @param options - Configuration options for the 5-day workflow
 * @returns Hook interface for 5-day task reminder management
 */
export function useTaskReminder5Day(
  options: Use5DayTaskReminderOptions = {}
): Use5DayTaskReminderReturn {
  const {
    focusStartDate: initialFocusDate = startOfDay(new Date()),
    enableAutoFocus = true,
    enableCaching = true,
    userId = 'current_user'
  } = options;

  // State management
  const [focusStartDate, setFocusStartDate] = useState<Date>(initialFocusDate);
  const [cachedBatches, setCachedBatches] = useState<DailyTaskBatch[] | undefined>();
  const [workflowStats, setWorkflowStats] = useState<any>(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isProcessingOverdue, setIsProcessingOverdue] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Computed values
  const focusEndDate = useMemo(() => addDays(focusStartDate, 4), [focusStartDate]);

  /**
   * Update the 5-day focus window
   */
  const updateFocus = useCallback((startDate: Date) => {
    try {
      const normalizedDate = startOfDay(startDate);
      setFocusStartDate(normalizedDate);
      
      // Update the integration service
      taskReminderIntegration.update5DayFocus(normalizedDate);
      
      // Clear cached batches to force refresh
      if (enableCaching) {
        setCachedBatches(undefined);
      }
      
      setError(null);
      
      Logger.info('[useTaskReminder5Day] Updated focus window', {
        startDate: normalizedDate.toISOString(),
        endDate: addDays(normalizedDate, 4).toISOString()
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update focus window';
      setError(errorMessage);
      Logger.error('[useTaskReminder5Day] Error updating focus window', { error: err });
    }
  }, [enableCaching]);

  /**
   * Schedule tasks with 5-day workflow optimization
   */
  const scheduleTasksFor5Day = useCallback(async (tasks: PlantTask[]) => {
    try {
      setIsScheduling(true);
      setError(null);

      await taskReminderIntegration.scheduleTasksFor5DayWorkflow(tasks, focusStartDate);
      
      // Refresh cached batches after scheduling
      if (enableCaching) {
        const newBatches = taskReminderIntegration5Day.getCachedDailyBatches(userId);
        setCachedBatches(newBatches);
      }

      Logger.info('[useTaskReminder5Day] Successfully scheduled tasks', { taskCount: tasks.length });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to schedule tasks';
      setError(errorMessage);
      Logger.error('[useTaskReminder5Day] Error scheduling tasks', { error: err });
      throw err;
    } finally {
      setIsScheduling(false);
    }
  }, [focusStartDate, enableCaching, userId]);

  /**
   * Process overdue tasks with 5-day workflow optimization
   */
  const processOverdueTasks = useCallback(async () => {
    try {
      setIsProcessingOverdue(true);
      setError(null);

      await taskReminderIntegration.processOverdueTasksFor5Day();

      Logger.info('[useTaskReminder5Day] Successfully processed overdue tasks');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process overdue tasks';
      setError(errorMessage);
      Logger.error('[useTaskReminder5Day] Error processing overdue tasks', { error: err });
      throw err;
    } finally {
      setIsProcessingOverdue(false);
    }
  }, []);

  /**
   * Refresh cached data
   */
  const refreshCache = useCallback(() => {
    try {
      if (enableCaching) {
        const newBatches = taskReminderIntegration5Day.getCachedDailyBatches(userId);
        setCachedBatches(newBatches);
      }

      // Update workflow stats
      const stats = taskReminderIntegration5Day.get5DayWorkflowStats();
      setWorkflowStats(stats);

      Logger.info('[useTaskReminder5Day] Refreshed cache and stats');
    } catch (err) {
      Logger.error('[useTaskReminder5Day] Error refreshing cache', { error: err });
    }
  }, [enableCaching, userId]);

  /**
   * Initialize and update cached data
   */
  useEffect(() => {
    if (enableCaching) {
      refreshCache();
    }
  }, [refreshCache, enableCaching, focusStartDate]);

  /**
   * Auto-focus management (optional)
   */
  useEffect(() => {
    if (enableAutoFocus) {
      const interval = setInterval(() => {
        const today = startOfDay(new Date());
        if (focusStartDate.getTime() !== today.getTime()) {
          updateFocus(today);
        }
      }, 60000); // Check every minute

      return () => clearInterval(interval);
    }
  }, [enableAutoFocus, focusStartDate, updateFocus]);

  return {
    // Focus window management
    focusStartDate,
    focusEndDate,
    updateFocus,
    
    // Notification scheduling
    scheduleTasksFor5Day,
    processOverdueTasks,
    
    // Performance optimization
    cachedBatches,
    refreshCache,
    
    // Statistics and monitoring
    workflowStats,
    
    // Loading states
    isScheduling,
    isProcessingOverdue,
    error,
  };
}

/**
 * Simplified hook for basic 5-day task reminder functionality
 * 
 * @param focusStartDate - Optional start date for 5-day focus
 * @returns Simplified interface for basic 5-day task management
 */
export function useSimpleTaskReminder5Day(focusStartDate?: Date) {
  const {
    scheduleTasksFor5Day,
    processOverdueTasks,
    updateFocus,
    isScheduling,
    isProcessingOverdue,
    error
  } = useTaskReminder5Day({
    focusStartDate,
    enableAutoFocus: true,
    enableCaching: false
  });

  return {
    scheduleTasksFor5Day,
    processOverdueTasks,
    updateFocus,
    isScheduling,
    isProcessingOverdue,
    error
  };
}

/**
 * Hook for performance-optimized 5-day task reminder with caching
 * 
 * @param userId - User ID for cache management
 * @returns Performance-optimized interface with caching
 */
export function useOptimizedTaskReminder5Day(userId?: string) {
  return useTaskReminder5Day({
    enableAutoFocus: true,
    enableCaching: true,
    userId
  });
}