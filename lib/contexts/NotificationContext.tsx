import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

import {
  registerForPushNotificationsAsync,
  registerNotificationChannels,
  NotificationType,
  scheduleTaskReminder,
  cancelTaskReminder,
  rescheduleTaskReminder,
} from '../services/NotificationService';

interface NotificationContextType {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  isNotificationsEnabled: boolean;
  requestPermissions: () => Promise<boolean>;
  scheduleTaskNotification: (params: TaskNotificationParams) => Promise<string | null>;
  cancelTaskNotification: (taskId: string) => Promise<void>;
  rescheduleTaskNotification: (params: TaskNotificationParams) => Promise<string | null>;
}

export interface TaskNotificationParams {
  taskId: string;
  plantId: string;
  plantName: string;
  taskType: 'water' | 'feed' | 'prune' | 'transplant' | 'harvest' | 'other';
  taskTitle: string;
  dueDate: Date;
}

const defaultContextValue: NotificationContextType = {
  expoPushToken: null,
  notification: null,
  isNotificationsEnabled: false,
  requestPermissions: async () => false,
  scheduleTaskNotification: async () => null,
  cancelTaskNotification: async () => {},
  rescheduleTaskNotification: async () => null,
};

const NotificationContext = createContext<NotificationContextType>(defaultContextValue);

export const useNotifications = () => useContext(NotificationContext);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(false);

  // Request notification permissions and set up listeners
  useEffect(() => {
    // Register notification channels (Android only)
    registerNotificationChannels();

    // Request permission and get token
    requestPermissions();

    // Set up notification listeners
    const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      setNotification(notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      const { notification } = response;
      const data = notification.request.content.data;

      // Handle notification response based on type
      if (data && data.type) {
        handleNotificationResponse(data);
      }
    });

    // Clean up listeners on unmount
    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  // Request notification permissions
  const requestPermissions = async () => {
    try {
      const token = await registerForPushNotificationsAsync();

      if (token) {
        setExpoPushToken(token.data);
        setIsNotificationsEnabled(true);
        return true;
      } else {
        setIsNotificationsEnabled(false);
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      setIsNotificationsEnabled(false);
      return false;
    }
  };

  // Handle notification responses
  const handleNotificationResponse = (data: any) => {
    const { type, plantId, taskId } = data;

    // Navigate or perform actions based on notification type
    switch (type) {
      case NotificationType.WATERING:
      case NotificationType.FEEDING:
      case NotificationType.GROWTH_STAGE:
      case NotificationType.HARVEST:
        // If we have a plantId, navigate to the plant detail screen
        if (plantId) {
          router.push(`/plant/${plantId}`);
        }
        break;
      case NotificationType.TASK_REMINDER:
        // For task reminders, navigate to the plant or diary screen
        if (plantId && taskId) {
          // Navigate to the plant detail screen
          router.push(`/plant/${plantId}`);
        } else if (taskId) {
          // Navigate to the diary screen
          router.push('/');
        }
        break;
      default:
        // For general notifications, navigate to diary screen
        router.push('/');
        break;
    }
  };

  // Schedule a task notification
  const scheduleTaskNotification = async (params: TaskNotificationParams) => {
    if (!isNotificationsEnabled) {
      const permissionGranted = await requestPermissions();
      if (!permissionGranted) {
        return null;
      }
    }

    return await scheduleTaskReminder(params);
  };

  // Cancel a task notification
  const cancelTaskNotification = async (taskId: string) => {
    await cancelTaskReminder(taskId);
  };

  // Reschedule a task notification
  const rescheduleTaskNotification = async (params: TaskNotificationParams) => {
    if (!isNotificationsEnabled) {
      const permissionGranted = await requestPermissions();
      if (!permissionGranted) {
        return null;
      }
    }

    return await rescheduleTaskReminder(params);
  };

  return (
    <NotificationContext.Provider
      value={{
        expoPushToken,
        notification,
        isNotificationsEnabled,
        requestPermissions,
        scheduleTaskNotification,
        cancelTaskNotification,
        rescheduleTaskNotification,
      }}>
      {children}
    </NotificationContext.Provider>
  );
}
