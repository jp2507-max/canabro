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
  }) => Promise<string | null>;
  cancelNotification: (identifier: string) => Promise<void>;
  cancelAllNotifications: () => Promise<void>;
  openSettings: () => Promise<void>;
}

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Set up notification categories for better UX
const setupNotificationCategories = async () => {
  try {
    await Notifications.setNotificationCategoryAsync('plant-care', [
      {
        identifier: 'mark-done',
        buttonTitle: 'Mark Done',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: 'snooze',
        buttonTitle: 'Snooze 1h',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);
  } catch (error) {
    console.warn('Failed to set up notification categories:', error);
  }
};

export const useNotifications = (): UseNotificationsReturn => {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>('unknown');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize notifications and check permissions
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        // Set up notification categories
        await setupNotificationCategories();

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
  }): Promise<string | null> => {
    try {
      if (permissionStatus !== 'granted') {
        console.warn('Notification permissions not granted');
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        identifier: options.identifier,
        content: {
          title: options.title,
          body: options.body,
          data: options.data || {},
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
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
    } catch (error) {
      console.error('Error opening notification settings:', error);
    }
  }, []);

  return {
    permissionStatus,
    isLoading,
    requestPermissions,
    scheduleNotification,
    cancelNotification,
    cancelAllNotifications,
    openSettings,
  };
};