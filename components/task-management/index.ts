// Task Management Components
// Reuses and adapts notification infrastructure from plant management

export { default as TaskNotificationScheduler } from './TaskNotificationScheduler';
export { default as TaskNotificationExample } from './TaskNotificationExample';

// Re-export services and hooks
export { taskNotificationService } from '@/lib/services/taskNotificationService';
export { useTaskNotifications, useTaskNotificationHandler, useTaskNotificationSettings } from '@/lib/hooks/useTaskNotifications';

// Re-export configuration and navigation
export { 
  initializeTaskNotificationCategories,
  TASK_NOTIFICATION_CATEGORIES,
  TASK_NOTIFICATION_ACTIONS,
  generateTaskDeepLink,
  parseTaskNotificationData,
} from '@/lib/config/taskNotificationConfig';
export { taskNotificationNavigationHandler } from '@/lib/utils/taskNotificationNavigation';

// Types
export type {
  CreateTaskWithNotificationOptions,
  TaskNotificationStats,
  TaskViewData,
} from '@/lib/services/taskNotificationService';
export type { TaskNotificationData } from '@/lib/config/taskNotificationConfig';