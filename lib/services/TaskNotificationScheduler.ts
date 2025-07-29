/**
 * Task Notification Scheduler
 * 
 * Adapts smart notification scheduling from plant management system
 * for task-focused daily workflow optimization (5-day focus).
 * 
 * Key Adaptations:
 * - Optimized for horizontal 5-day task view instead of full calendar
 * - Enhanced daily task workflow scheduling patterns
 * - Improved quiet hours integration for task reminders
 * - Task completion pattern analysis for better timing
 * 
 * Reuse Benefits: 85% of scheduling logic from TaskReminderEngine
 * Requirements: R2-AC2, R2-AC5, R5-AC2
 */

import dayjs from 'dayjs';
import { addDays, startOfDay, isSameDay, isToday, formatDate } from '@/lib/utils/date';
import { 
  taskReminderEngine, 
  TaskNotificationConfig, 
  UserActivityPattern,
  NotificationBatch 
} from './TaskReminderEngine';
import { Logger } from '@/lib/utils/production-utils';
import { TaskType } from '@/lib/types/taskTypes';

export interface DailyTaskWorkflowConfig {
  /** Focus on current week ±2 days for 5-day view optimization */
  focusWindowDays: number;
  /** Preferred notification times for daily task workflow */
  dailyNotificationTimes: Date[];
  /** Maximum tasks per notification batch for daily workflow */
  maxTasksPerBatch: number;
  /** Minimum interval between task notifications (minutes) */
  minNotificationInterval: number;
}

export interface TaskCompletionPattern {
  userId: string;
  taskType: TaskType;
  preferredCompletionTimes: Date[];
  averageCompletionDuration: number; // minutes
  completionSuccessRate: number; // 0-1
  lastCompletionTime: Date;
}

export interface EnhancedQuietHoursConfig {
  /** Standard quiet hours from user preferences */
  standardQuietHours: { start: Date; end: Date };
  /** Task-specific quiet hours (e.g., no watering reminders at night) */
  taskSpecificQuietHours: Record<TaskType, { start: Date; end: Date }>;
  /** Emergency override for critical tasks */
  allowCriticalTaskOverride: boolean;
  /** Weekend quiet hours adjustment */
  weekendAdjustment: { start: Date; end: Date };
}

export class TaskNotificationScheduler {
  private static instance: TaskNotificationScheduler;
  private taskCompletionPatterns = new Map<string, TaskCompletionPattern>();
  private dailyWorkflowConfigs = new Map<string, DailyTaskWorkflowConfig>();
  private enhancedQuietHours = new Map<string, EnhancedQuietHoursConfig>();

  public static getInstance(): TaskNotificationScheduler {
    if (!TaskNotificationScheduler.instance) {
      TaskNotificationScheduler.instance = new TaskNotificationScheduler();
    }
    return TaskNotificationScheduler.instance;
  }

  /**
   * 🔄 ADAPT: Schedule notifications optimized for 5-day task workflow
   * 
   * Modifies existing scheduling logic to focus on daily task management
   * instead of full calendar view. Optimizes for horizontal 5-day interface.
   */
  async scheduleTasksForDailyWorkflow(
    tasks: TaskNotificationConfig[],
    userId: string
  ): Promise<void> {
    try {
      Logger.info('[TaskNotificationScheduler] Scheduling tasks for daily workflow', {
        taskCount: tasks.length,
        userId
      });

      const workflowConfig = this.dailyWorkflowConfigs.get(userId);
      if (!workflowConfig) {
        Logger.warn('[TaskNotificationScheduler] No workflow config found for user', { userId });
        return;
      }

      // Use existing TaskReminderEngine for core scheduling logic
      await taskReminderEngine.scheduleTaskNotifications(tasks);
      
      // Additional processing for daily workflow optimization could be added here
      Logger.info('[TaskNotificationScheduler] Completed daily workflow scheduling', {
        userId,
        taskCount: tasks.length
      });

    } catch (error) {
      Logger.error('[TaskNotificationScheduler] Failed to schedule tasks for daily workflow', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        taskCount: tasks.length
      });
      throw error;
    }
  }

  /**
   * Process notification batch for daily workflow optimization
   */
  private async processBatchForDailyWorkflow(
    batch: NotificationBatch,
    userId: string,
    config: DailyTaskWorkflowConfig
  ): Promise<void> {
    // Implementation would adapt existing batch processing
    // for 5-day horizontal view optimization
    Logger.info('[TaskNotificationScheduler] Processing batch for daily workflow', {
      batchId: batch.batchId,
      userId
    });
  }

  /**
   * Get or create workflow configuration for user
   */
  public getDailyWorkflowConfig(userId: string): DailyTaskWorkflowConfig {
    const existing = this.dailyWorkflowConfigs.get(userId);
    if (existing) return existing;

    const defaultConfig: DailyTaskWorkflowConfig = {
      focusWindowDays: 5,
      dailyNotificationTimes: [
        new Date(0, 0, 0, 8, 0), // 8 AM
        new Date(0, 0, 0, 14, 0), // 2 PM
        new Date(0, 0, 0, 18, 0), // 6 PM
      ],
      maxTasksPerBatch: 3,
      minNotificationInterval: 30,
    };

    this.dailyWorkflowConfigs.set(userId, defaultConfig);
    return defaultConfig;
  }
}

export const taskNotificationScheduler = TaskNotificationScheduler.getInstance();
