import { useState, useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform, Linking } from 'react-native';
import { useNotifications } from './useNotifications';
import { taskNotificationService } from '@/lib/services/taskNotificationService';
import { PlantTask } from '@/lib/models/PlantTask';
import { Plant } from '@/lib/models/Plant';
import { Logger } from '@/lib/utils/production-utils';
import { database } from '@/lib/models';

export type TaskNotificationPermissionStatus = 'unknown' | 'granted' | 'denied' | 'undetermined';

interface TaskNotificationOptions {
  task: PlantTask;
  plant: Plant;
  scheduledFor?: Date;
  repeatInterval?: number; // days
}

interface UseTaskNotificationsReturn {
  permissionStatus: TaskNotificationPermissionStatus;
  isLoading: boolean;
  requestPermissions: () => Promise<boolean>;
  scheduleTaskNotification: (options: TaskNotificationOptions) => Promise<string | null>;
  scheduleRecurringTaskNotification: (options: TaskNotificationOptions & { repeatInterval: number }) => Promise<string | null>;
  cancelTaskNotification: (taskId: string) => Promise<void>;
  cancelAllTaskNotifications: () => Promise<void>;
  rescheduleTaskNotification: (taskId: string, newDate: Date) => Promise<string | null>;
  openSettings: () => Promise<void>;
}

/**
 * Hook for managing task-focused notifications
 * Adapts the existing useNotifications hook for task management workflow
 */
export const useTaskNotifications = (): UseTaskNotificationsReturn => {
  const {
    permissionStatus,
    isLoading,
    requestPermissions,
    scheduleNotification,
    scheduleRecurringNotification,
    cancelNotification,
    cancelAllNotifications,
    openSettings,
  } = useNotifications();

  const scheduleTaskNotification = useCallback(async (options: TaskNotificationOptions): Promise<string | null> => {
    try {
      if (permissionStatus !== 'granted') {
        Logger.warn('Task notification permissions not granted');
        return null;
      }

      const { task, plant, scheduledFor, repeatInterval } = options;
      const notificationDate = scheduledFor || new Date(task.dueDate);

      // Generate task-focused notification content
      const notificationContent = taskNotificationService.generateTaskNotificationContent(task, plant);

      // Schedule notification with task-specific data
      const notificationId = await scheduleNotification({
        identifier: task.id,
        title: notificationContent.title,
        body: notificationContent.body,
        data: {
          ...notificationContent.data,
          repeatInterval,
        },
        scheduledFor: notificationDate,
        repeatInterval,
      });

      if (notificationId) {
        Logger.info('Task notification scheduled successfully', {
          taskId: task.id,
          plantId: plant.id,
          scheduledFor: notificationDate.toISOString(),
        });
      }

      return notificationId;
    } catch (error) {
      Logger.error('Error scheduling task notification', { error, taskId: options.task.id });
      return null;
    }
  }, [permissionStatus, scheduleNotification]);

  const scheduleRecurringTaskNotification = useCallback(async (
    options: TaskNotificationOptions & { repeatInterval: number }
  ): Promise<string | null> => {
    try {
      if (permissionStatus !== 'granted') {
        Logger.warn('Task notification permissions not granted');
        return null;
      }

      const { task, plant, scheduledFor, repeatInterval } = options;
      const notificationDate = scheduledFor || new Date(task.dueDate);

      // Generate task-focused notification content
      const notificationContent = taskNotificationService.generateTaskNotificationContent(task, plant);

      // Schedule recurring notification with task-specific data
      const notificationId = await scheduleRecurringNotification({
        identifier: task.id,
        title: notificationContent.title,
        body: notificationContent.body,
        data: {
          ...notificationContent.data,
          isRecurring: true,
        },
        scheduledFor: notificationDate,
        repeatInterval,
      });

      if (notificationId) {
        Logger.info('Recurring task notification scheduled successfully', {
          taskId: task.id,
          plantId: plant.id,
          scheduledFor: notificationDate.toISOString(),
          repeatInterval,
        });
      }

      return notificationId;
    } catch (error) {
      Logger.error('Error scheduling recurring task notification', { error, taskId: options.task.id });
      return null;
    }
  }, [permissionStatus, scheduleRecurringNotification]);

  const cancelTaskNotification = useCallback(async (taskId: string): Promise<void> => {
    try {
      await cancelNotification(taskId);
      
      // Also cancel any recurring notifications for this task
      await cancelNotification(`${taskId}_first`);
      await cancelNotification(`${taskId}_next`);
      
      Logger.info('Task notification cancelled successfully', { taskId });
    } catch (error) {
      Logger.error('Error canceling task notification', { error, taskId });
    }
  }, [cancelNotification]);

  const rescheduleTaskNotification = useCallback(async (taskId: string, newDate: Date): Promise<string | null> => {
    try {
      // Cancel existing notification
      await cancelTaskNotification(taskId);

      // Get task and plant data to reschedule
      const task = await taskNotificationService.getAllActiveTasks().then(tasks => 
        tasks.find(t => t.id === taskId)
      );

      if (!task) {
        Logger.warn('Task not found for rescheduling notification', { taskId });
        return null;
      }

      const plant = await database.get<Plant>('plants').find(task.plantId);

      // Schedule new notification
      return await scheduleTaskNotification({
        task,
        plant,
        scheduledFor: newDate,
      });
    } catch (error) {
      Logger.error('Error rescheduling task notification', { error, taskId, newDate });
      return null;
    }
  }, [cancelTaskNotification, scheduleTaskNotification]);

  return {
    permissionStatus,
    isLoading,
    requestPermissions,
    scheduleTaskNotification,
    scheduleRecurringTaskNotification,
    cancelTaskNotification,
    cancelAllTaskNotifications: cancelAllNotifications,
    rescheduleTaskNotification,
    openSettings,
  };
};

/**
 * Hook for handling task notification responses and deep linking
 * Integrates with 5-day task view navigation
 */
export const useTaskNotificationHandler = () => {
  const [lastNotificationResponse, setLastNotificationResponse] = useState<Notifications.NotificationResponse | null>(null);

  useEffect(() => {
    // Handle notification responses when app is running
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      setLastNotificationResponse(response);
      handleTaskNotificationResponse(response);
    });

    // Handle notification that opened the app
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) {
        setLastNotificationResponse(response);
        handleTaskNotificationResponse(response);
      }
    });

    return () => subscription.remove();
  }, []);

  const handleTaskNotificationResponse = useCallback((response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;
    
    if (data?.navigateTo === 'calendar' && data?.taskId) {
      // Navigate to calendar with specific task/date
      // This will be handled by the navigation system
      Logger.info('Handling task notification response', {
        taskId: data.taskId,
        plantId: data.plantId,
        selectedDate: data.selectedDate,
      });
      
      // The actual navigation will be handled by the app's navigation system
      // based on the notification data
    }
  }, []);

  return {
    lastNotificationResponse,
    handleTaskNotificationResponse,
  };
};

/**
 * Hook for managing task notification settings and preferences
 */
export const useTaskNotificationSettings = () => {
  const [settings, setSettings] = useState({
    enableTaskReminders: true,
    enableOverdueAlerts: true,
    enableBatchNotifications: true,
    quietHoursStart: 22, // 10 PM
    quietHoursEnd: 8, // 8 AM
    notificationAdvanceTime: 15, // minutes before due time
  });

  const updateSettings = useCallback((newSettings: Partial<typeof settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    // Save to storage or sync with backend
  }, []);

  const isInQuietHours = useCallback((date: Date = new Date()): boolean => {
    const hour = date.getHours();
    const { quietHoursStart, quietHoursEnd } = settings;
    
    if (quietHoursStart < quietHoursEnd) {
      return hour >= quietHoursStart || hour < quietHoursEnd;
    } else {
      return hour >= quietHoursStart && hour < quietHoursEnd;
    }
  }, [settings]);

  const getOptimalNotificationTime = useCallback((dueDate: Date): Date => {
    const notificationTime = new Date(dueDate);
    notificationTime.setMinutes(notificationTime.getMinutes() - settings.notificationAdvanceTime);
    
    // Adjust if in quiet hours
    if (isInQuietHours(notificationTime)) {
      const adjustedTime = new Date(notificationTime);
      adjustedTime.setHours(settings.quietHoursEnd, 0, 0, 0);
      return adjustedTime;
    }
    
    return notificationTime;
  }, [settings, isInQuietHours]);

  return {
    settings,
    updateSettings,
    isInQuietHours,
    getOptimalNotificationTime,
  };
};