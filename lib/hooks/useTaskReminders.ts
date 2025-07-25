/**
 * useTaskReminders Hook
 * 
 * React hook for integrating TaskReminderEngine with task management components.
 * Provides easy-to-use interface for scheduling, managing, and monitoring task notifications.
 */

import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { taskReminderEngine, TaskNotificationConfig } from '@/lib/services/TaskReminderEngine';
import { PlantTask } from '@/lib/models/PlantTask';
import { TaskType } from '@/lib/types/taskTypes';
import { Logger } from '@/lib/utils/production-utils';

export interface TaskReminderHookResult {
  // Scheduling functions
  scheduleTaskNotification: (config: TaskNotificationConfig) => Promise<void>;
  scheduleMultipleNotifications: (configs: TaskNotificationConfig[]) => Promise<void>;
  cancelTaskNotifications: (taskId: string) => Promise<void>;
  rescheduleTaskNotification: (taskId: string, newDueDate: Date) => Promise<void>;
  
  // Batch operations
  scheduleNotificationsForTasks: (tasks: PlantTask[]) => Promise<void>;
  cancelNotificationsForTasks: (taskIds: string[]) => Promise<void>;
  
  // Monitoring
  processOverdueTasks: () => Promise<void>;
  optimizeNotificationTiming: (userId: string, tasks: TaskNotificationConfig[]) => Promise<Date[]>;
  
  // State
  isProcessing: boolean;
  lastProcessedAt: Date | null;
  notificationStats: {
    activeBatches: number;
    overdueEscalations: number;
    cachedUserPatterns: number;
  };
  
  // Error handling
  error: Error | null;
  clearError: () => void;
}

export function useTaskReminders(): TaskReminderHookResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastProcessedAt, setLastProcessedAt] = useState<Date | null>(null);
  const [notificationStats, setNotificationStats] = useState({
    activeBatches: 0,
    overdueEscalations: 0,
    cachedUserPatterns: 0,
  });
  const [error, setError] = useState<Error | null>(null);

  // Update stats when component focuses
  useFocusEffect(
    useCallback(() => {
      updateNotificationStats();
    }, [])
  );

  // Auto-process overdue tasks every 5 minutes when component is active
  useEffect(() => {
    const interval = setInterval(() => {
      processOverdueTasks();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  const updateNotificationStats = useCallback(() => {
    try {
      const stats = taskReminderEngine.getNotificationStats();
      setNotificationStats(stats);
    } catch (err) {
      Logger.error('[useTaskReminders] Error updating notification stats', { error: err });
    }
  }, []);

  const handleError = useCallback((err: unknown, operation: string) => {
    const error = err instanceof Error ? err : new Error(`Unknown error in ${operation}`);
    Logger.error(`[useTaskReminders] Error in ${operation}`, { error });
    setError(error);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Core scheduling functions
  const scheduleTaskNotification = useCallback(async (config: TaskNotificationConfig) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      await taskReminderEngine.scheduleTaskNotification(config);
      updateNotificationStats();
      
      Logger.info('[useTaskReminders] Scheduled task notification', { taskId: config.taskId });
    } catch (err) {
      handleError(err, 'scheduleTaskNotification');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [handleError, updateNotificationStats]);

  const scheduleMultipleNotifications = useCallback(async (configs: TaskNotificationConfig[]) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      await taskReminderEngine.scheduleTaskNotifications(configs);
      updateNotificationStats();
      
      Logger.info('[useTaskReminders] Scheduled multiple notifications', { count: configs.length });
    } catch (err) {
      handleError(err, 'scheduleMultipleNotifications');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [handleError, updateNotificationStats]);

  const cancelTaskNotifications = useCallback(async (taskId: string) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      await taskReminderEngine.cancelTaskNotifications(taskId);
      updateNotificationStats();
      
      Logger.info('[useTaskReminders] Cancelled task notifications', { taskId });
    } catch (err) {
      handleError(err, 'cancelTaskNotifications');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [handleError, updateNotificationStats]);

  const rescheduleTaskNotification = useCallback(async (taskId: string, newDueDate: Date) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      await taskReminderEngine.rescheduleTaskNotification(taskId, newDueDate);
      updateNotificationStats();
      
      Logger.info('[useTaskReminders] Rescheduled task notification', { taskId, newDueDate });
    } catch (err) {
      handleError(err, 'rescheduleTaskNotification');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [handleError, updateNotificationStats]);

  // Batch operations
  const scheduleNotificationsForTasks = useCallback(async (tasks: PlantTask[]) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      // Convert PlantTask objects to TaskNotificationConfig
      const configs: TaskNotificationConfig[] = [];
      
      for (const task of tasks) {
        try {
          const plant = task.plant;
          
          const config: TaskNotificationConfig = {
            taskId: task.id,
            plantId: task.plantId,
            plantName: plant.name,
            taskType: task.taskType as TaskType,
            taskTitle: task.title,
            dueDate: new Date(task.dueDate),
            priority: task.priority || 'medium',
            estimatedDuration: task.estimatedDuration,
            isRecurring: task.autoGenerated,
          };
          
          configs.push(config);
        } catch (plantError) {
          Logger.warn('[useTaskReminders] Could not access plant for task', { 
            taskId: task.id, 
            error: plantError 
          });
          // Continue with other tasks
        }
      }
      
      if (configs.length > 0) {
        await taskReminderEngine.scheduleTaskNotifications(configs);
        updateNotificationStats();
      }
      
      Logger.info('[useTaskReminders] Scheduled notifications for tasks', { 
        requestedCount: tasks.length, 
        scheduledCount: configs.length 
      });
    } catch (err) {
      handleError(err, 'scheduleNotificationsForTasks');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [handleError, updateNotificationStats]);

  const cancelNotificationsForTasks = useCallback(async (taskIds: string[]) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      // Cancel notifications for each task
      const cancelPromises = taskIds.map(taskId => 
        taskReminderEngine.cancelTaskNotifications(taskId)
      );
      
      await Promise.allSettled(cancelPromises);
      updateNotificationStats();
      
      Logger.info('[useTaskReminders] Cancelled notifications for multiple tasks', { 
        count: taskIds.length 
      });
    } catch (err) {
      handleError(err, 'cancelNotificationsForTasks');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [handleError, updateNotificationStats]);

  // Monitoring functions
  const processOverdueTasks = useCallback(async () => {
    try {
      setIsProcessing(true);
      setError(null);
      
      await taskReminderEngine.processOverdueTasks();
      updateNotificationStats();
      setLastProcessedAt(new Date());
      
      Logger.info('[useTaskReminders] Processed overdue tasks');
    } catch (err) {
      handleError(err, 'processOverdueTasks');
      // Don't throw here as this is often called automatically
    } finally {
      setIsProcessing(false);
    }
  }, [handleError, updateNotificationStats]);

  const optimizeNotificationTiming = useCallback(async (
    userId: string, 
    tasks: TaskNotificationConfig[]
  ): Promise<Date[]> => {
    try {
      setError(null);
      
      const optimizedTimes = await taskReminderEngine.optimizeNotificationTiming(userId, tasks);
      
      Logger.info('[useTaskReminders] Optimized notification timing', { 
        userId, 
        taskCount: tasks.length,
        optimizedCount: optimizedTimes.length 
      });
      
      return optimizedTimes;
    } catch (err) {
      handleError(err, 'optimizeNotificationTiming');
      // Return original due dates as fallback
      return tasks.map(task => task.dueDate);
    }
  }, [handleError]);

  return {
    // Scheduling functions
    scheduleTaskNotification,
    scheduleMultipleNotifications,
    cancelTaskNotifications,
    rescheduleTaskNotification,
    
    // Batch operations
    scheduleNotificationsForTasks,
    cancelNotificationsForTasks,
    
    // Monitoring
    processOverdueTasks,
    optimizeNotificationTiming,
    
    // State
    isProcessing,
    lastProcessedAt,
    notificationStats,
    
    // Error handling
    error,
    clearError,
  };
}

/**
 * Hook for automatically managing notifications for a single task
 */
export function useTaskNotification(task: PlantTask | null) {
  const { 
    scheduleTaskNotification, 
    cancelTaskNotifications, 
    rescheduleTaskNotification,
    error 
  } = useTaskReminders();
  
  const [isScheduled, setIsScheduled] = useState(false);

  // Schedule notification when task is provided and not completed
  useEffect(() => {
    if (!task || task.isCompleted) {
      setIsScheduled(false);
      return;
    }

    const scheduleNotification = async () => {
      try {
        const plant = task.plant;
        
        const config: TaskNotificationConfig = {
          taskId: task.id,
          plantId: task.plantId,
          plantName: plant.name,
          taskType: task.taskType as TaskType,
          taskTitle: task.title,
          dueDate: new Date(task.dueDate),
          priority: task.priority || 'medium',
          estimatedDuration: task.estimatedDuration,
          isRecurring: task.autoGenerated,
        };
        
        await scheduleTaskNotification(config);
        setIsScheduled(true);
      } catch (err) {
        Logger.error('[useTaskNotification] Error scheduling notification', { 
          taskId: task.id, 
          error: err 
        });
        setIsScheduled(false);
      }
    };

    scheduleNotification();
  }, [task, scheduleTaskNotification]);

  // Cancel notification when task is completed or removed
  useEffect(() => {
    return () => {
      if (task && isScheduled) {
        cancelTaskNotifications(task.id).catch(err => {
          Logger.error('[useTaskNotification] Error cancelling notification on cleanup', { 
            taskId: task.id, 
            error: err 
          });
        });
      }
    };
  }, [task, isScheduled, cancelTaskNotifications]);

  const reschedule = useCallback(async (newDueDate: Date) => {
    if (!task) return;
    
    try {
      await rescheduleTaskNotification(task.id, newDueDate);
      Logger.info('[useTaskNotification] Rescheduled task notification', { 
        taskId: task.id, 
        newDueDate 
      });
    } catch (err) {
      Logger.error('[useTaskNotification] Error rescheduling notification', { 
        taskId: task.id, 
        error: err 
      });
      throw err;
    }
  }, [task, rescheduleTaskNotification]);

  const cancel = useCallback(async () => {
    if (!task) return;
    
    try {
      await cancelTaskNotifications(task.id);
      setIsScheduled(false);
      Logger.info('[useTaskNotification] Cancelled task notification', { taskId: task.id });
    } catch (err) {
      Logger.error('[useTaskNotification] Error cancelling notification', { 
        taskId: task.id, 
        error: err 
      });
      throw err;
    }
  }, [task, cancelTaskNotifications]);

  return {
    isScheduled,
    reschedule,
    cancel,
    error,
  };
}