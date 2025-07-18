import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

import { initializeNotifications } from '../config/notifications';
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

  // ---------------------------------------------------------------------------
  // Mount / unmount lifecycle
  // ---------------------------------------------------------------------------
  useEffect(() => {
    /**
     * Local flag that tracks whether this particular component instance is
     * still mounted. React 18 Strict-Mode mounts → unmounts → re-mounts every
     * component once in development. When async work started during the first
     * mount resolves after the unmount, calling setState() would trigger the
     * "state update on an unmounted component" warning we're seeing. Guarding
     * with a scoped boolean prevents that without relying on the ref pattern
     * the React team plans to deprecate.
     */
    let isMounted = true;

    // Register notification channels (Android only)
    registerNotificationChannels();

    // Request permission and get token. Wrap in IIFE so we can await and guard
    // the async state updates.
    (async () => {
      try {
        // Initialize notification configuration globally
        await initializeNotifications();
        
        const granted = await requestPermissions();
        if (isMounted && granted) {
          // requestPermissions internally sets state, but we keep the guard here
          // as an extra safety net in case its implementation ever changes.
        }
      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    })();

    // Set up notification listeners
    const notificationListener = Notifications.addNotificationReceivedListener((notif) => {
      if (isMounted) {
        setNotification(notif);
      }
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      if (!isMounted) return;
      const { notification } = response;
      const data = notification.request.content.data;

      // Handle notification response based on type
      if (data && data.type) {
        handleNotificationResponse(data);
      }
    });

    // Clean up listeners on unmount
    return () => {
      isMounted = false;
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  // Request notification permissions
  const requestPermissions = async () => {
    try {
      // Skip push notifications in development to avoid unnecessary API calls
      if (__DEV__) {
        console.log('Skipping push notifications in development mode');
        setIsNotificationsEnabled(true); // Still allow local notifications
        return true;
      }

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
          try {
            router.push({
              pathname: '/(app)/plant/[id]',
              params: { id: plantId },
            });
          } catch (error) {
            console.warn('Navigation not ready yet, skipping plant detail navigation:', error);
          }
        }
        break;
      case NotificationType.TASK_REMINDER:
        // For task reminders, navigate to the plant or diary screen
        if (plantId && taskId) {
          // Navigate to the plant detail screen
          try {
            router.push({
              pathname: '/(app)/plant/[id]',
              params: { id: plantId },
            });
          } catch (error) {
            console.warn('Navigation not ready yet, skipping plant detail navigation:', error);
          }
        } else if (taskId) {
          // Navigate to the diary screen (home tab)
          try {
            router.push('/(app)/(tabs)');
          } catch (error) {
            console.warn('Navigation not ready yet, skipping tabs navigation:', error);
          }
        }
        break;
      default:
        // For general notifications, navigate to diary screen (home tab)
        try {
          router.push('/(app)/(tabs)');
        } catch (error) {
          console.warn('Navigation not ready yet, skipping tabs navigation:', error);
        }
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
