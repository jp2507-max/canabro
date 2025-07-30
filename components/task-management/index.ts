// Task Management Components
// Reuses and adapts notification infrastructure from plant management

export { default as TaskNotificationScheduler } from './TaskNotificationScheduler';
export { default as TaskNotificationExample } from './TaskNotificationExample';

// Performance Optimized Components (Task 8.1)
export { default as OptimizedDaySelector } from './OptimizedDaySelector';
export { default as OptimizedTaskList } from './OptimizedTaskList';
export { default as OptimizedWeeklyTaskView } from './OptimizedWeeklyTaskView';
export { default as TaskPerformanceTest } from './TaskPerformanceTest';

// Performance Utilities
export { TaskListPerformanceUtils } from './OptimizedTaskList';
export { WeeklyTaskViewPerformanceUtils } from './OptimizedWeeklyTaskView';

// Optimized Hooks
export { useOptimizedTaskData, useSimpleOptimizedTaskData } from '@/lib/hooks/useOptimizedTaskData';

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