import * as Notifications from 'expo-notifications';
import { careReminderService } from './careReminderService';

export class NotificationListenerService {
  private static instance: NotificationListenerService;
  private notificationListener?: Notifications.Subscription;
  private responseListener?: Notifications.Subscription;

  public static getInstance(): NotificationListenerService {
    if (!NotificationListenerService.instance) {
      NotificationListenerService.instance = new NotificationListenerService();
    }
    return NotificationListenerService.instance;
  }

  /**
   * Initialize notification listeners
   */
  public initialize(): void {
    // Listen for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(
      this.handleNotificationReceived
    );

    // Listen for user interactions with notifications
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse
    );
  }

  /**
   * Clean up listeners
   */
  public cleanup(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = undefined;
    }

    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = undefined;
    }
  }

  /**
   * Handle notification received while app is in foreground
   */
  private handleNotificationReceived = (notification: Notifications.Notification) => {
    console.log('Notification received:', notification);
    
    // You can customize foreground notification behavior here
    // For example, show a custom in-app notification
  };

  /**
   * Handle user interaction with notification
   */
  private handleNotificationResponse = async (response: Notifications.NotificationResponse) => {
    console.log('Notification response:', response);

    const { notification, actionIdentifier } = response;
    const { data } = notification.request.content;

    try {
      // Handle different action types
      switch (actionIdentifier) {
        case 'mark-done':
          await this.handleMarkDone(data);
          break;
        case 'snooze':
          await this.handleSnooze(data);
          break;
        default:
          // Default tap action - open the app
          await this.handleDefaultTap(data);
          break;
      }

      // Handle recurring notifications
      if (data.repeatInterval && data.isRecurring) {
        await this.scheduleNextRecurrence(data);
      }
    } catch (error) {
      console.error('Error handling notification response:', error);
    }
  };

  /**
   * Handle mark done action
   */
  private handleMarkDone = async (data: any) => {
    if (data.reminderId) {
      try {
        await careReminderService.markReminderCompleted(data.reminderId);
        console.log('Reminder marked as completed:', data.reminderId);
      } catch (error) {
        console.error('Error marking reminder as done:', error);
      }
    }
  };

  /**
   * Handle snooze action
   */
  private handleSnooze = async (data: any) => {
    if (data.reminderId) {
      try {
        // Snooze for 1 hour by default
        await careReminderService.snoozeReminder(data.reminderId, 1/24); // 1 hour in days
        console.log('Reminder snoozed:', data.reminderId);
      } catch (error) {
        console.error('Error snoozing reminder:', error);
      }
    }
  };

  /**
   * Handle default tap action
   */
  private handleDefaultTap = async (data: any) => {
    // Navigate to the relevant screen
    // This would typically use your navigation service
    console.log('Opening app for reminder:', data.reminderId);
  };

  /**
   * Schedule next occurrence for recurring notifications
   */
  private scheduleNextRecurrence = async (data: any) => {
    if (!data.repeatInterval || !data.reminderId) {
      return;
    }

    try {
      // Get the reminder to check if it's still active
      const reminders = await careReminderService.getAllActiveReminders();
      const reminder = reminders.find(r => r.id === data.reminderId);

      if (!reminder || reminder.isCompleted) {
        return; // Don't schedule if reminder is completed or deleted
      }

      // Calculate next occurrence
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + data.repeatInterval);

      // Schedule next notification
      await Notifications.scheduleNotificationAsync({
        identifier: `${data.reminderId}_${Date.now()}`,
        content: {
          title: data.title || 'Plant Care Reminder',
          body: data.body || 'Time to take care of your plant!',
          data: {
            ...data,
            isRecurring: true,
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: 'plant-care',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: nextDate,
        },
      });

      console.log('Next recurring notification scheduled for:', nextDate);
    } catch (error) {
      console.error('Error scheduling next recurrence:', error);
    }
  };
}

// Export singleton instance
export const notificationListenerService = NotificationListenerService.getInstance();