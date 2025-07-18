/**
 * Notifications Components Index
 * 
 * Exports all notification-related components for care reminders and scheduling
 */

export { default as CareReminders } from './CareReminders';
export { default as CareRemindersExample } from './CareRemindersExample';
export { default as NotificationScheduler } from './NotificationScheduler';

// Re-export services and hooks
export { careReminderService } from '@/lib/services/careReminderService';
export { useNotifications } from '@/lib/hooks/useNotifications';

// Re-export types if needed
export type { CareReminder } from '@/lib/models/CareReminder';
export type { CreateReminderOptions, ReminderStats } from '@/lib/services/careReminderService';