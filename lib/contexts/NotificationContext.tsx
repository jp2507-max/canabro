import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as Notifications from 'expo-notifications';
import { 
  registerForPushNotificationsAsync, 
  registerNotificationChannels,
  NotificationType
} from '../services/NotificationService';

interface NotificationContextType {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  isNotificationsEnabled: boolean;
  requestPermissions: () => Promise<boolean>;
}

const defaultContextValue: NotificationContextType = {
  expoPushToken: null,
  notification: null,
  isNotificationsEnabled: false,
  requestPermissions: async () => false,
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
    const notificationListener = Notifications.addNotificationReceivedListener(
      notification => {
        setNotification(notification);
      }
    );

    const responseListener = Notifications.addNotificationResponseReceivedListener(
      response => {
        const { notification } = response;
        const data = notification.request.content.data;
        
        // Handle notification response based on type
        if (data && data.type) {
          handleNotificationResponse(data);
        }
      }
    );

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
    const { type, plantId } = data;

    // Navigate or perform actions based on notification type
    switch (type) {
      case NotificationType.WATERING:
      case NotificationType.FEEDING:
      case NotificationType.GROWTH_STAGE:
      case NotificationType.HARVEST:
        // If we have a plantId, navigate to the plant detail screen
        if (plantId) {
          // We'll implement navigation in a future update
          console.log(`Navigate to plant: ${plantId}`);
        }
        break;
      default:
        // For general notifications, no specific action needed
        break;
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        expoPushToken,
        notification,
        isNotificationsEnabled,
        requestPermissions,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
