import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Task-focused notification configuration
 * Adapts existing notification setup for task management workflow
 */

// Configure notification behavior (reuses existing pattern)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Task notification categories for better organization
export const TASK_NOTIFICATION_CATEGORIES = {
  PLANT_CARE: 'plant-care',
  TASK_REMINDER: 'task-reminder',
  OVERDUE_ALERT: 'overdue-alert',
  BATCH_NOTIFICATION: 'batch-notification',
} as const;

// Task notification actions for interactive notifications
export const TASK_NOTIFICATION_ACTIONS = {
  COMPLETE_TASK: 'complete-task',
  SNOOZE_TASK: 'snooze-task',
  VIEW_TASK: 'view-task',
  MARK_ALL_DONE: 'mark-all-done',
} as const;

/**
 * Initialize task notification categories and actions
 * Extends existing notification configuration for task management
 */
export const initializeTaskNotificationCategories = async (): Promise<void> => {
  try {
    // Set up notification categories with task-focused actions
    await Notifications.setNotificationCategoryAsync(
      TASK_NOTIFICATION_CATEGORIES.TASK_REMINDER,
      [
        {
          identifier: TASK_NOTIFICATION_ACTIONS.COMPLETE_TASK,
          buttonTitle: '✅ Complete',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: TASK_NOTIFICATION_ACTIONS.SNOOZE_TASK,
          buttonTitle: '⏰ Snooze 1h',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: TASK_NOTIFICATION_ACTIONS.VIEW_TASK,
          buttonTitle: '👀 View',
          options: {
            opensAppToForeground: true,
          },
        },
      ],
      {
        previewPlaceholder: 'Plant care task reminder',
        intentIdentifiers: [],
        categorySummaryFormat: '%u more plant care tasks',
      }
    );

    // Overdue alert category with urgent actions
    await Notifications.setNotificationCategoryAsync(
      TASK_NOTIFICATION_CATEGORIES.OVERDUE_ALERT,
      [
        {
          identifier: TASK_NOTIFICATION_ACTIONS.COMPLETE_TASK,
          buttonTitle: '✅ Complete',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: TASK_NOTIFICATION_ACTIONS.VIEW_TASK,
          buttonTitle: '🚨 View Urgent',
          options: {
            opensAppToForeground: true,
          },
        },
      ],
      {
        previewPlaceholder: 'Overdue plant care task',
        intentIdentifiers: [],
        categorySummaryFormat: '%u overdue plant care tasks',
      }
    );

    // Batch notification category for multiple tasks
    await Notifications.setNotificationCategoryAsync(
      TASK_NOTIFICATION_CATEGORIES.BATCH_NOTIFICATION,
      [
        {
          identifier: TASK_NOTIFICATION_ACTIONS.MARK_ALL_DONE,
          buttonTitle: '✅ Mark All Done',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: TASK_NOTIFICATION_ACTIONS.VIEW_TASK,
          buttonTitle: '📋 View Tasks',
          options: {
            opensAppToForeground: true,
          },
        },
      ],
      {
        previewPlaceholder: 'Multiple plant care tasks',
        intentIdentifiers: [],
        categorySummaryFormat: '%u plant care tasks due',
      }
    );

    console.log('Task notification categories initialized successfully');
  } catch (error) {
    console.error('Failed to initialize task notification categories:', error);
  }
};

/**
 * Task notification deep linking configuration
 * Integrates with 5-day task view navigation
 */
export interface TaskNotificationData {
  taskId: string;
  plantId: string;
  taskType: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  navigateTo: 'calendar' | 'plant-detail' | 'task-list';
  selectedDate?: string; // ISO string
  batchTaskIds?: string[]; // For batch notifications
}

/**
 * Generate deep link URL for task notifications
 */
export const generateTaskDeepLink = (data: TaskNotificationData): string => {
  const baseUrl = 'canabro://';
  
  switch (data.navigateTo) {
    case 'calendar':
      return `${baseUrl}calendar?taskId=${data.taskId}&date=${data.selectedDate || new Date().toISOString()}`;
    case 'plant-detail':
      return `${baseUrl}plants/${data.plantId}?taskId=${data.taskId}`;
    case 'task-list':
      return `${baseUrl}tasks?plantId=${data.plantId}&priority=${data.priority}`;
    default:
      return `${baseUrl}calendar`;
  }
};

/**
 * Parse task notification data from notification response
 */
export const parseTaskNotificationData = (
  notificationData: Record<string, any>
): TaskNotificationData | null => {
  try {
    if (!notificationData.taskId || !notificationData.plantId) {
      return null;
    }

    return {
      taskId: notificationData.taskId,
      plantId: notificationData.plantId,
      taskType: notificationData.taskType || 'custom',
      priority: notificationData.priority || 'medium',
      navigateTo: notificationData.navigateTo || 'calendar',
      selectedDate: notificationData.selectedDate,
      batchTaskIds: notificationData.batchTaskIds,
    };
  } catch (error) {
    console.error('Failed to parse task notification data:', error);
    return null;
  }
};

/**
 * Task notification sound configuration
 */
export const TASK_NOTIFICATION_SOUNDS = {
  default: undefined, // Use system default
  gentle: Platform.OS === 'ios' ? 'gentle_notification.wav' : 'gentle_notification',
  urgent: Platform.OS === 'ios' ? 'urgent_notification.wav' : 'urgent_notification',
  success: Platform.OS === 'ios' ? 'success_notification.wav' : 'success_notification',
} as const;

/**
 * Get appropriate notification sound based on task priority
 */
export const getTaskNotificationSound = (priority: 'low' | 'medium' | 'high' | 'critical') => {
  switch (priority) {
    case 'critical':
      return TASK_NOTIFICATION_SOUNDS.urgent;
    case 'high':
      return TASK_NOTIFICATION_SOUNDS.urgent;
    case 'medium':
      return TASK_NOTIFICATION_SOUNDS.default;
    case 'low':
      return TASK_NOTIFICATION_SOUNDS.gentle;
    default:
      return TASK_NOTIFICATION_SOUNDS.default;
  }
};

/**
 * Task notification priority mapping to Android importance
 */
export const getAndroidNotificationImportance = (priority: 'low' | 'medium' | 'high' | 'critical') => {
  switch (priority) {
    case 'critical':
      return Notifications.AndroidImportance.MAX;
    case 'high':
      return Notifications.AndroidImportance.HIGH;
    case 'medium':
      return Notifications.AndroidImportance.DEFAULT;
    case 'low':
      return Notifications.AndroidImportance.LOW;
    default:
      return Notifications.AndroidImportance.DEFAULT;
  }
};