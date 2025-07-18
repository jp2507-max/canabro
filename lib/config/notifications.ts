import * as Notifications from 'expo-notifications';

/**
 * Initialize notification configuration globally
 * This should be called once during app startup
 */
export const initializeNotifications = async (): Promise<void> => {
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
