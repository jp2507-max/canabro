import * as Notifications from 'expo-notifications';
import { initializeTaskNotificationCategories } from './taskNotificationConfig';
import { taskNotificationNavigationHandler } from '@/lib/utils/taskNotificationNavigation';

/**
 * Initialize notification configuration globally
 * This should be called once during app startup
 * Integrates both plant management and task management notifications
 */
export const initializeNotifications = async (): Promise<void> => {
  // Configure notification behavior (unified for both plant care and task management)
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
  try {
    // Legacy plant-care category (maintain compatibility)
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

    // Initialize task-focused notification categories
    await initializeTaskNotificationCategories();

    console.log('Notification categories initialized successfully');
  } catch (error) {
    console.warn('Failed to set up notification categories:', error);
  }

  // Initialize task notification navigation handler
  try {
    taskNotificationNavigationHandler.initialize();
    console.log('Task notification navigation handler initialized');
  } catch (error) {
    console.warn('Failed to initialize task notification navigation:', error);
  }
};
