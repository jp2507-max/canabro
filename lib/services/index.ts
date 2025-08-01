/**
 * Background Processing Services - Index
 * 
 * Exports all background processing services and utilities for easy import
 * throughout the application. Provides a centralized access point for all
 * background processing functionality.
 */

// Core background processing services
export { backgroundTaskProcessor, BackgroundTaskProcessor } from './BackgroundTaskProcessor';
export type { 
    BackgroundTaskConfig, 
    TaskProcessingResult, 
    TaskUpdateBatch 
} from './BackgroundTaskProcessor';

export { batchNotificationProcessor, BatchNotificationProcessor } from './BatchNotificationProcessor';
export type { 
    NotificationBatchConfig, 
    BatchNotificationRequest, 
    NotificationBatch, 
    BatchProcessingResult 
} from './BatchNotificationProcessor';

export { calendarDataSyncService, CalendarDataSyncService } from './CalendarDataSyncService';
export type { 
    SyncConfig, 
    SyncWindow, 
    SyncResult, 
    ChangeTracker 
} from './CalendarDataSyncService';

export { dataCleanupService, DataCleanupService } from './DataCleanupService';
export type { 
    CleanupConfig, 
    CleanupResult, 
    CleanupStats 
} from './DataCleanupService';

export { backgroundProcessingPerformanceTest, BackgroundProcessingPerformanceTest } from './BackgroundProcessingPerformanceTest';
export type { 
    PerformanceTestConfig, 
    PerformanceTestResult, 
    PerformanceReport 
} from './BackgroundProcessingPerformanceTest';

// Unified manager
export { backgroundProcessingManager, BackgroundProcessingManager } from './BackgroundProcessingManager';
export type { 
    BackgroundProcessingConfig, 
    BackgroundProcessingStatus, 
    BackgroundProcessingMetrics 
} from './BackgroundProcessingManager';

// 5-Day workflow optimized services
export { taskReminderEngine5Day, TaskReminderEngine5Day } from './TaskReminderEngine5Day';
export type { 
    FiveDayWorkflowConfig, 
    DailyTaskBatch 
} from './TaskReminderEngine5Day';

export { taskReminderIntegration5Day, TaskReminderIntegration5Day } from './TaskReminderIntegration5Day';
export type { 
    FiveDayTaskScheduleOptions 
} from './TaskReminderIntegration5Day';

// Base services (reused from plant management)
export { taskReminderEngine, TaskReminderEngine } from './TaskReminderEngine';
export type { 
    TaskNotificationConfig, 
    NotificationBatch as BaseNotificationBatch, 
    UserActivityPattern 
} from './TaskReminderEngine';

// Notification utilities
export { 
    scheduleNotification,
    cancelTaskReminder,
    rescheduleTaskReminder,
    NotificationType
} from './NotificationService';

// Utility functions for background processing
export { 
    validateNotificationSchedule5Day,
    optimizeForDailyPlantCare,
    getPlantCareLeadTime
} from '../utils/notification-scheduling';

// Strain services
export { strainLocalService, default as StrainLocalService } from './strain-local.service';

// Community services
export { CommunityService } from './community-service';

// Content Moderation services (ACF-T04.1)
export { contentModerationService, default as ContentModerationService } from './content-moderation.service';
export type { 
    ModerationResult, 
    ModerationViolation, 
    ImageModerationResult, 
    SpamDetectionResult,
    ViolationType,
    ViolationSeverity,
    ModerationAction
} from './content-moderation.service';

// Realtime services (2025 Enhanced)
export { realtimeService } from './realtimeService';
export { realtimeConfig } from './realtimeConfig';
export type { 
    RealtimeSubscriptionConfig, 
    MessageBroadcast, 
    PresenceState 
} from './realtimeService';
export type { 
    RealtimeConfig, 
    RealtimeQuotas 
} from './realtimeConfig';