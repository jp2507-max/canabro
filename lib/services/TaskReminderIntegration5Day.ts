/**
 * Task Reminder Integration - 5-Day Workflow
 * 
 * Integrates the 5-day optimized TaskReminderEngine with the existing
 * task management system, providing seamless notification management
 * optimized for the horizontal 5-day task view.
 * 
 * Key Features:
 * - 5-day focus window optimization
 * - Daily plant care workflow timing
 * - Performance optimizations for horizontal view
 * - Task-specific quiet hours handling
 * 
 * Requirements: R2-AC2, R2-AC5, R5-AC2
 */

import { Logger } from '@/lib/utils/production-utils';
import { PlantTask } from '@/lib/models/PlantTask';
import { Plant } from '@/lib/models/Plant';
import { 
    taskReminderEngine5Day, 
    TaskNotificationConfig, 
    DailyTaskBatch,
    FiveDayWorkflowConfig 
} from './TaskReminderEngine5Day';

export type { DailyTaskBatch } from './TaskReminderEngine5Day';
import { 
    validateNotificationSchedule5Day, 
    optimizeForDailyPlantCare,
    getPlantCareLeadTime,
    FiveDayScheduleOptions 
} from '@/lib/utils/notification-scheduling';
import { TaskType } from '@/lib/types/taskTypes';
import { startOfDay, addDays } from '@/lib/utils/date';

export interface FiveDayTaskScheduleOptions {
    focusStartDate?: Date;
    enableCriticalOverride?: boolean;
    optimizeForDailyWorkflow?: boolean;
    batchingStrategy?: '5day-optimized' | 'daily-focused' | 'plant-grouped';
}

export class TaskReminderIntegration5Day {
    private static instance: TaskReminderIntegration5Day;

    public static getInstance(): TaskReminderIntegration5Day {
        if (!TaskReminderIntegration5Day.instance) {
            TaskReminderIntegration5Day.instance = new TaskReminderIntegration5Day();
        }
        return TaskReminderIntegration5Day.instance;
    }

    /**
     * Schedule notifications for tasks with 5-day workflow optimization
     * 
     * @param tasks - Tasks to schedule notifications for
     * @param options - 5-day workflow specific options
     */
    async scheduleTasksFor5DayWorkflow(
        tasks: PlantTask[],
        options: FiveDayTaskScheduleOptions = {}
    ): Promise<void> {
        try {
            Logger.info('[TaskReminderIntegration5Day] Scheduling tasks for 5-day workflow', {
                taskCount: tasks.length,
                options
            });

            // Convert PlantTask to TaskNotificationConfig with 5-day optimizations
            const notificationConfigs = await this.convertToNotificationConfigs5Day(tasks, options);

            // Filter for 5-day focus if specified
            const focusedConfigs = options.focusStartDate 
                ? this.filterFor5DayFocus(notificationConfigs, options.focusStartDate)
                : notificationConfigs;

            // Schedule with 5-day optimized engine
            await taskReminderEngine5Day.scheduleTaskNotifications5Day(focusedConfigs);

            Logger.info('[TaskReminderIntegration5Day] Successfully scheduled 5-day workflow tasks', {
                originalCount: tasks.length,
                focusedCount: focusedConfigs.length
            });

        } catch (error) {
            Logger.error('[TaskReminderIntegration5Day] Error scheduling 5-day workflow tasks', { error });
            throw error;
        }
    }

    /**
     * Update the 5-day focus window (e.g., when user navigates days)
     * 
     * @param startDate - New start date for 5-day focus
     */
    updateFiveDayFocus(startDate: Date): void {
        try {
            taskReminderEngine5Day.updateFiveDayFocus(startDate);
            
            Logger.info('[TaskReminderIntegration5Day] Updated 5-day focus window', {
                startDate: startDate.toISOString(),
                endDate: addDays(startDate, 4).toISOString()
            });
        } catch (error) {
            Logger.error('[TaskReminderIntegration5Day] Error updating 5-day focus', { error });
        }
    }

    /**
     * Get cached daily batches for performance optimization
     * Used by the 5-day UI components to avoid re-computation
     * 
     * @param userId - User ID to get cached batches for
     * @returns Cached daily batches or undefined
     */
    getCachedDailyBatches(userId: string = 'current_user'): DailyTaskBatch[] | undefined {
        return taskReminderEngine5Day.getCachedDailyBatches(userId);
    }

    /**
     * Handle task completion with 5-day workflow considerations
     * 
     * @param task - Completed task
     * @param rescheduleNext - Whether to schedule next occurrence
     */
    async handleTaskCompletion5Day(task: PlantTask, rescheduleNext: boolean = true): Promise<void> {
        try {
            Logger.info('[TaskReminderIntegration5Day] Handling task completion', { 
                taskId: task.id,
                rescheduleNext 
            });

            // Cancel existing notifications
            await taskReminderEngine5Day.cancelTaskNotifications(task.id);

            // If recurring and within 5-day focus, reschedule with optimization
            if (rescheduleNext && (task.parentTaskId || task.templateId)) {
                const nextDueDate = this.calculateNextDueDate(task);
                
                // Check if next occurrence is within extended 5-day focus (current + 7 days)
                const extendedFocusEnd = addDays(startOfDay(new Date()), 11);
                
                if (nextDueDate <= extendedFocusEnd) {
                    await this.rescheduleTaskFor5Day(task, nextDueDate);
                }
            }

            Logger.info('[TaskReminderIntegration5Day] Completed task completion handling', { taskId: task.id });

        } catch (error) {
            Logger.error('[TaskReminderIntegration5Day] Error handling task completion', { 
                taskId: task.id, 
                error 
            });
        }
    }

    /**
     * Reschedule a task with 5-day workflow optimization
     * 
     * @param task - Task to reschedule
     * @param newDueDate - New due date
     */
    async rescheduleTaskFor5Day(task: PlantTask, newDueDate: Date): Promise<void> {
        try {
            // Cancel existing notifications
            await taskReminderEngine5Day.cancelTaskNotifications(task.id);

            // Create optimized notification config
            const plant = await task.plant;
            const optimizedTime = optimizeForDailyPlantCare(
                newDueDate,
                task.taskType as TaskType,
                task.priority || 'medium'
            );

            const config: TaskNotificationConfig = {
                taskId: task.id,
                plantId: task.plantId,
                plantName: plant.name,
                taskType: task.taskType as TaskType,
                taskTitle: task.title,
                dueDate: optimizedTime,
                priority: task.priority || 'medium',
                estimatedDuration: task.estimatedDuration,
                isRecurring: !!(task.parentTaskId || task.templateId),
            };

            // Validate for 5-day workflow
            const scheduleOptions: FiveDayScheduleOptions = {
                taskPriority: config.priority,
                allowCriticalOverride: true,
            };

            const validationResult = validateNotificationSchedule5Day(optimizedTime, scheduleOptions);
            
            if (validationResult.success) {
                await taskReminderEngine5Day.scheduleTaskNotification(config);
                
                Logger.info('[TaskReminderIntegration5Day] Rescheduled task for 5-day workflow', {
                    taskId: task.id,
                    newDueDate: optimizedTime.toISOString()
                });
            } else {
                Logger.warn('[TaskReminderIntegration5Day] Task outside 5-day focus, skipping notification', {
                    taskId: task.id,
                    error: validationResult.error
                });
            }

        } catch (error) {
            Logger.error('[TaskReminderIntegration5Day] Error rescheduling task for 5-day workflow', { 
                taskId: task.id, 
                error 
            });
        }
    }

    /**
     * Process overdue tasks with 5-day workflow considerations
     * Focuses on tasks within the 5-day window for immediate attention
     */
    async processOverdueTasksFor5Day(): Promise<void> {
        try {
            Logger.info('[TaskReminderIntegration5Day] Processing overdue tasks for 5-day workflow');

            // Use base engine's overdue processing but with 5-day focus
            await taskReminderEngine5Day.processOverdueTasks();

            Logger.info('[TaskReminderIntegration5Day] Completed overdue task processing');

        } catch (error) {
            Logger.error('[TaskReminderIntegration5Day] Error processing overdue tasks', { error });
        }
    }

    /**
     * Get 5-day workflow statistics for monitoring and optimization
     */
    get5DayWorkflowStats(): {
        focusWindow: { start: Date; end: Date };
        cachedBatches: number;
        batchingStrategy: string;
        notificationStats: any;
    } {
        const fiveDayStats = taskReminderEngine5Day.get5DayStats();
        const notificationStats = taskReminderEngine5Day.getNotificationStats();

        return {
            ...fiveDayStats,
            notificationStats,
        };
    }

    /**
     * Clear 5-day workflow cache (useful for testing or memory management)
     */
    clear5DayCache(): void {
        taskReminderEngine5Day.clear5DayCache();
        Logger.info('[TaskReminderIntegration5Day] Cleared 5-day workflow cache');
    }

    /**
     * Private helper methods
     */

    /**
     * Convert PlantTask to TaskNotificationConfig with 5-day optimizations
     */
    private async convertToNotificationConfigs5Day(
        tasks: PlantTask[],
        options: FiveDayTaskScheduleOptions
    ): Promise<TaskNotificationConfig[]> {
        const configs: TaskNotificationConfig[] = [];

        for (const task of tasks) {
            try {
                const plant = await task.plant;
                
                // Optimize due date for daily plant care workflow
                let optimizedDueDate = new Date(task.dueDate);
                
                if (options.optimizeForDailyWorkflow !== false) {
                    optimizedDueDate = optimizeForDailyPlantCare(
                        new Date(task.dueDate),
                        task.taskType as TaskType,
                        task.priority || 'medium'
                    );
                }

                // Calculate notification time with plant care lead time
                const leadTimeMinutes = getPlantCareLeadTime(
                    task.taskType as TaskType,
                    task.priority || 'medium'
                );
                
                const notificationTime = new Date(optimizedDueDate.getTime() - (leadTimeMinutes * 60 * 1000));

                const config: TaskNotificationConfig = {
                    taskId: task.id,
                    plantId: task.plantId,
                    plantName: plant.name,
                    taskType: task.taskType as TaskType,
                    taskTitle: task.title,
                    dueDate: notificationTime,
                    priority: task.priority || 'medium',
                    estimatedDuration: task.estimatedDuration,
                    isRecurring: !!(task.parentTaskId || task.templateId),
                };

                configs.push(config);

            } catch (error) {
                Logger.error('[TaskReminderIntegration5Day] Error converting task to notification config', {
                    taskId: task.id,
                    error
                });
            }
        }

        return configs;
    }

    /**
     * Filter notification configs for 5-day focus window
     */
    private filterFor5DayFocus(
        configs: TaskNotificationConfig[],
        focusStartDate: Date
    ): TaskNotificationConfig[] {
        const focusEndDate = addDays(focusStartDate, 4);
        
        return configs.filter(config => {
            const taskDate = startOfDay(config.dueDate);
            const focusStart = startOfDay(focusStartDate);
            const focusEnd = startOfDay(focusEndDate);
            
            // Include tasks within 5-day window
            const isInWindow = taskDate >= focusStart && taskDate <= focusEnd;
            
            // Also include critical tasks up to 2 days ahead
            const isCriticalAhead = config.priority === 'critical' && 
                taskDate <= addDays(focusEnd, 2);
            
            return isInWindow || isCriticalAhead;
        });
    }

    /**
     * Calculate next due date for recurring tasks
     */
    private calculateNextDueDate(task: PlantTask): Date {
        const nextDate = new Date(task.dueDate);
        
        // Simple recurring logic - add interval based on task type
        const intervalDays = this.getRecurringInterval(task.taskType as TaskType);
        nextDate.setDate(nextDate.getDate() + intervalDays);
        
        return nextDate;
    }

    /**
     * Get recurring interval for different task types
     */
    private getRecurringInterval(taskType: TaskType): number {
        const intervals = {
            watering: 2,        // Every 2 days
            feeding: 7,         // Weekly
            inspection: 1,      // Daily
            pruning: 14,        // Bi-weekly
            training: 7,        // Weekly
            defoliation: 21,    // Every 3 weeks
            flushing: 14,       // Bi-weekly
            harvest: 0,         // Non-recurring
            transplant: 0,      // Non-recurring
        };

        return intervals[taskType] || 7; // Default to weekly
    }
}

// Export singleton instance
export const taskReminderIntegration5Day = TaskReminderIntegration5Day.getInstance();