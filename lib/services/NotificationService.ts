import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { GrowthStage } from '../types/plant';

// Notification types
export enum NotificationType {
  WATERING = 'watering',
  FEEDING = 'feeding',
  GROWTH_STAGE = 'growth_stage',
  HARVEST = 'harvest',
  GENERAL = 'general',
  TASK_REMINDER = 'task_reminder',
}

// Initialize notifications
export async function initializeNotifications() {
  if (Platform.OS === 'android') {
    await setupNotificationChannels();
  }

  return await registerForPushNotificationsAsync();
}

// Setup notification channels for Android
export async function setupNotificationChannels() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('plant-care', {
      name: 'Plant Care',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2196F3',
      description: 'Notifications about watering and feeding your plants',
    });

    await Notifications.setNotificationChannelAsync('growth-stages', {
      name: 'Growth Stages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4CAF50',
      description: 'Notifications about plant growth stage transitions',
    });

    await Notifications.setNotificationChannelAsync('harvest', {
      name: 'Harvest',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF9800',
      description: 'Notifications about plant harvest time',
    });

    await Notifications.setNotificationChannelAsync('task-reminders', {
      name: 'Task Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#9C27B0',
      description: 'Reminders for scheduled plant care tasks',
    });
  }
}

// For backward compatibility
export const registerNotificationChannels = setupNotificationChannels;

// Register for push notifications
export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    try {
      // Get the token that uniquely identifies this device
      // For development builds, we use the EAS project ID
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId || 'f04ff5d3-6a5d-4abf-8ac4-e471877b69e3';

      if (!projectId) {
        console.error('No projectId found for push notifications');
        return null;
      }

      token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      console.log('Push token:', token);
    } catch (error) {
      console.error('Error getting push token:', error);
      // Continue without push notification functionality
      return null;
    }
  } else {
    console.log('Must use physical device for push notifications');
  }

  return token;
}

// Schedule a notification
export async function scheduleNotification({
  title,
  body,
  data = {},
  trigger,
  type = NotificationType.GENERAL,
}: {
  title: string;
  body: string;
  data?: any;
  trigger: number; // Seconds from now
  type?: NotificationType;
}) {
  try {
    // Request permissions if not already granted
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      console.log('Notification permissions not granted');
      return null;
    }

    // Schedule the notification with the appropriate trigger format for Expo Notifications v0.29.14
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { ...data, type },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      // Using a cast to satisfy TypeScript - this is the correct format for this Expo version
      trigger: { seconds: trigger } as any,
    });

    console.log(`Scheduled notification (${type}): ${notificationId}`);
    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
}

// Cancel all scheduled notifications
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Cancel notifications for a specific plant
export async function cancelPlantNotifications(plantId: string) {
  // Get all scheduled notifications
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

  // Filter notifications for this plant and cancel them
  for (const notification of scheduledNotifications) {
    if (notification.content.data?.plantId === plantId) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

// Schedule watering reminder
export async function scheduleWateringReminder(
  plantId: string,
  plantName: string,
  daysFromNow: number = 3
) {
  // Convert days to seconds
  const secondsFromNow = daysFromNow * 24 * 60 * 60;

  return await scheduleNotification({
    title: ' Time to water your plant!',
    body: `${plantName} needs watering today.`,
    data: { plantId },
    trigger: secondsFromNow,
    type: NotificationType.WATERING,
  });
}

// Schedule feeding reminder
export async function scheduleFeedingReminder(
  plantId: string,
  plantName: string,
  daysFromNow: number = 7
) {
  // Convert days to seconds
  const secondsFromNow = daysFromNow * 24 * 60 * 60;

  return await scheduleNotification({
    title: ' Time to feed your plant!',
    body: `${plantName} needs nutrients today.`,
    data: { plantId },
    trigger: secondsFromNow,
    type: NotificationType.FEEDING,
  });
}

// Schedule growth stage transition notification
export async function scheduleGrowthStageNotification(
  plantId: string,
  plantName: string,
  currentStage: GrowthStage,
  nextStage: GrowthStage,
  daysFromNow: number
) {
  // Convert days to seconds
  const secondsFromNow = daysFromNow * 24 * 60 * 60;

  return await scheduleNotification({
    title: ' Growth Stage Transition',
    body: `${plantName} is ready to transition from ${formatGrowthStage(currentStage)} to ${formatGrowthStage(nextStage)}.`,
    data: { plantId, currentStage, nextStage },
    trigger: secondsFromNow,
    type: NotificationType.GROWTH_STAGE,
  });
}

// Schedule harvest notification
export async function scheduleHarvestNotification(
  plantId: string,
  plantName: string,
  harvestDate: Date
) {
  // Calculate days from now to harvest date
  const now = new Date();
  const diffTime = harvestDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // If harvest date is in the past, don't schedule
  if (diffDays <= 0) {
    console.log('Harvest date is in the past, not scheduling notification');
    return null;
  }

  // Convert days to seconds
  const secondsFromNow = diffDays * 24 * 60 * 60;

  return await scheduleNotification({
    title: ' Harvest Time!',
    body: `${plantName} is ready for harvest today!`,
    data: { plantId },
    trigger: secondsFromNow,
    type: NotificationType.HARVEST,
  });
}

// Schedule task reminder
export async function scheduleTaskReminder({
  taskId,
  plantId,
  plantName,
  taskType,
  taskTitle,
  dueDate,
}: {
  taskId: string;
  plantId: string;
  plantName: string;
  taskType: 'water' | 'feed' | 'prune' | 'transplant' | 'harvest' | 'other';
  taskTitle: string;
  dueDate: Date;
}) {
  try {
    // Calculate seconds until the due date
    // Default to notifying at 9:00 AM on the due date
    const now = new Date();
    const targetDate = new Date(dueDate);
    targetDate.setHours(9, 0, 0, 0); // Set to 9:00 AM

    // If the due date is today and it's already past 9 AM, notify immediately
    if (targetDate.getTime() < now.getTime()) {
      targetDate.setTime(now.getTime() + 60); // Notify in 1 minute
    }

    const secondsFromNow = Math.floor((targetDate.getTime() - now.getTime()) / 1000);

    // Get appropriate icon based on task type
    let icon = '🌱';
    switch (taskType) {
      case 'water':
        icon = '💧';
        break;
      case 'feed':
        icon = '🧪';
        break;
      case 'prune':
        icon = '✂️';
        break;
      case 'transplant':
        icon = '🪴';
        break;
      case 'harvest':
        icon = '🧺';
        break;
    }

    return await scheduleNotification({
      title: `${icon} ${taskTitle}`,
      body: `Time to ${taskType} your ${plantName}!`,
      data: { taskId, plantId, taskType },
      trigger: secondsFromNow,
      type: NotificationType.TASK_REMINDER,
    });
  } catch (error) {
    console.error('Error scheduling task reminder:', error);
    return null;
  }
}

// Cancel task reminder
export async function cancelTaskReminder(taskId: string) {
  // Get all scheduled notifications
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

  // Filter notifications for this task and cancel them
  for (const notification of scheduledNotifications) {
    if (notification.content.data?.taskId === taskId) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

// Reschedule task reminder (useful when task is updated)
export async function rescheduleTaskReminder({
  taskId,
  plantId,
  plantName,
  taskType,
  taskTitle,
  dueDate,
}: {
  taskId: string;
  plantId: string;
  plantName: string;
  taskType: 'water' | 'feed' | 'prune' | 'transplant' | 'harvest' | 'other';
  taskTitle: string;
  dueDate: Date;
}) {
  // Cancel existing reminder
  await cancelTaskReminder(taskId);

  // Schedule new reminder
  return await scheduleTaskReminder({
    taskId,
    plantId,
    plantName,
    taskType,
    taskTitle,
    dueDate,
  });
}

// Format growth stage for display
function formatGrowthStage(stage: GrowthStage): string {
  return stage.charAt(0).toUpperCase() + stage.slice(1).replace('_', ' ');
}

// Helper function to schedule all initial notifications for a new plant
export async function scheduleInitialPlantNotifications(
  plantId: string,
  plantName: string,
  growthStage: GrowthStage,
  plantedDate: Date
): Promise<void> {
  try {
    // Check if notifications are enabled
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      console.log('Notification permissions not granted, skipping notification scheduling');
      return;
    }

    // Schedule watering reminder (3 days from now)
    await scheduleWateringReminder(plantId, plantName, 3);

    // Schedule feeding reminder (7 days from now)
    await scheduleFeedingReminder(plantId, plantName, 7);

    // Schedule growth stage transitions based on current stage
    const currentDate = new Date();

    switch (growthStage) {
      case GrowthStage.SEEDLING:
        // Schedule transition to vegetative stage in 14 days
        await scheduleGrowthStageNotification(
          plantId,
          plantName,
          GrowthStage.SEEDLING,
          GrowthStage.VEGETATIVE,
          14
        );
        break;

      case GrowthStage.VEGETATIVE:
        // Schedule transition to flowering stage in 30 days
        await scheduleGrowthStageNotification(
          plantId,
          plantName,
          GrowthStage.VEGETATIVE,
          GrowthStage.FLOWERING,
          30
        );
        break;

      case GrowthStage.FLOWERING: {
        // Schedule harvest notification in 60 days
        const harvestDate = new Date(currentDate);
        harvestDate.setDate(harvestDate.getDate() + 60);
        await scheduleHarvestNotification(plantId, plantName, harvestDate);
        break;
      }

      default:
        // No stage-specific notifications for other stages
        break;
    }

    console.log(`All notifications scheduled for plant ${plantName}`);
  } catch (error) {
    console.error('Error scheduling initial plant notifications:', error);
    throw error;
  }
}
