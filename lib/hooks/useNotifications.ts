import { useState, useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Linking } from 'react-native';

export type NotificationPermissionStatus = 'unknown' | 'granted' | 'denied' | 'undetermined';

interface UseNotificationsReturn {
  permissionStatus: NotificationPermissionStatus;
  isLoading: boolean;
  requestPermissions: () => Promise<boolean>;
  scheduleNotification: (options: {
    identifier: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    scheduledFor: Date;
    repeatInterval?: number;
  }) => Promise<string | null>;
  scheduleRecurringNotification: (options: {
    identifier: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    scheduledFor: Date;
    repeatInterval: number;
  }) => Promise<string | null>;
  cancelNotification: (identifier: string) => Promise<void>;
  cancelAllNotifications: () => Promise<void>;
  openSettings: () => Promise<void>;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>('unknown');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize notifications and check permissions
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        // Check if device supports notifications
        if (!Device.isDevice) {
          setPermissionStatus('denied');
          setIsLoading(false);
          return;
        }

        // Get current permission status
        const { status } = await Notifications.getPermissionsAsync();
        setPermissionStatus(status);
      } catch (error) {
        console.error('Error initializing notifications:', error);
        setPermissionStatus('denied');
      } finally {
        setIsLoading(false);
      }
    };

    initializeNotifications();
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      if (!Device.isDevice) {
        return false;
      }

      const { status } = await Notifications.requestPermissionsAsync();
      setPermissionStatus(status);
      
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      setPermissionStatus('denied');
      return false;
    }
  }, []);

  const scheduleNotification = useCallback(async (options: {
    identifier: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    scheduledFor: Date;
    repeatInterval?: number; // days
  }): Promise<string | null> => {
    try {
      if (permissionStatus !== 'granted') {
        console.warn('Notification permissions not granted');
        return null;
      }

      // For recurring notifications, we'll schedule the first one and handle repeats in the app
      const notificationId = await Notifications.scheduleNotificationAsync({
        identifier: options.identifier,
        content: {
          title: options.title,
          body: options.body,
          data: {
            ...options.data,
            repeatInterval: options.repeatInterval,
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: 'plant-care',
        },
        trigger: {
          type: SchedulableTriggerInputTypes.DATE,
          date: options.scheduledFor,
        },
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }, [permissionStatus]);

  const cancelNotification = useCallback(async (identifier: string): Promise<void> => {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }, []);

  const cancelAllNotifications = useCallback(async (): Promise<void> => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }, []);

  const openSettings = useCallback(async (): Promise<void> => {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error('Error opening notification settings:', error);
    }
  }, []);

  const scheduleRecurringNotification = useCallback(async (options: {
    identifier: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    scheduledFor: Date;
    repeatInterval: number; // days
  }): Promise<string | null> => {
    try {
      if (permissionStatus !== 'granted') {
        console.warn('Notification permissions not granted');
        return null;
      }

      // Calculate next occurrence
      const nextDate = new Date(options.scheduledFor);
      nextDate.setDate(nextDate.getDate() + options.repeatInterval);

      const notificationId = await Notifications.scheduleNotificationAsync({
        identifier: `${options.identifier}_next`,
        content: {
          title: options.title,
          body: options.body,
          data: {
            ...options.data,
            repeatInterval: options.repeatInterval,
            isRecurring: true,
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: 'plant-care',
        },
        trigger: {
          type: SchedulableTriggerInputTypes.DATE,
          date: nextDate,
        },
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling recurring notification:', error);
      return null;
    }
  }, [permissionStatus]);

  return {
    permissionStatus,
    isLoading,
    requestPermissions,
    scheduleNotification,
    scheduleRecurringNotification,
    cancelNotification,
    cancelAllNotifications,
    openSettings,
  };
};