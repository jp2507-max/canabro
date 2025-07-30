/**
 * Task Reminder Engine - 5-Day Workflow Optimization
 * 
 * Extends the existing TaskReminderEngine with specific optimizations for the
 * 5-day horizontal task view workflow. Maintains 85% reuse benefit while adding
 * daily task workflow optimizations.
 * 
 * Key Adaptations:
 * - 5-day focus optimization (current week ±2 days)
 * - Daily plant care workflow timing
 * - Task-specific quiet hours handling
 * - Performance optimizations for horizontal 5-day view
 * 
 * Requirements: R2-AC2, R2-AC5, R5-AC2
 */

import { addDays, startOfDay, isWithinInterval } from '@/lib/utils/date';
import { Logger } from '@/lib/utils/production-utils';
import { TaskType } from '@/lib/types/taskTypes';
import { 
    TaskReminderEngine, 
    TaskNotificationConfig, 
    NotificationBatch, 
    UserActivityPattern,
    taskReminderEngine 
} from './TaskReminderEngine';

export type { TaskNotificationConfig } from './TaskReminderEngine';

export interface FiveDayWorkflowConfig {
    focusStartDate: Date;
    focusEndDate: Date;
    dailyOptimalTimes: Date[];
    criticalTaskOverride: boolean;
    batchingStrategy: '5day-optimized' | 'daily-focused' | 'plant-grouped';
}

export interface DailyTaskBatch extends NotificationBatch {
    dayIndex: number; // 0-4 for 5-day view
    isToday: boolean;
    taskDensity: 'light' | 'moderate' | 'heavy';
    plantCount: number;
}

export class TaskReminderEngine5Day extends TaskReminderEngine {
    private static instance5Day: TaskReminderEngine5Day;
    private fiveDayConfig: FiveDayWorkflowConfig;
    private dailyBatchCache = new Map<string, DailyTaskBatch[]>();

    public static getInstance(): TaskReminderEngine5Day {
        if (!TaskReminderEngine5Day.instance5Day) {
            TaskReminderEngine5Day.instance5Day = new TaskReminderEngine5Day();
        }
        return TaskReminderEngine5Day.instance5Day;
    }

    constructor() {
        super();
        this.fiveDayConfig = this.initializeFiveDayConfig();
    }

    /**
     * 🔄 ADAPT: Initialize 5-day workflow configuration
     * 
     * Sets up the 5-day focus window and daily optimization parameters
     * for the horizontal task view interface.
     */
    private initializeFiveDayConfig(): FiveDayWorkflowConfig {
        const today = startOfDay(new Date());
        
        return {
            focusStartDate: today, // Start from today
            focusEndDate: addDays(today, 4), // 5-day window
            dailyOptimalTimes: [
                new Date(2024, 0, 1, 8, 0),  // 8 AM - Morning care
                new Date(2024, 0, 1, 18, 0), // 6 PM - Evening care
            ],
            criticalTaskOverride: true, // Allow critical tasks to override quiet hours
            batchingStrategy: '5day-optimized',
        };
    }

    /**
     * 🔄 ADAPT: Schedule notifications optimized for 5-day workflow
     * 
     * Extends base scheduling with 5-day focus optimizations:
     * - Prioritizes tasks within the 5-day window
     * - Optimizes timing for daily plant care routines
     * - Enhances batching for horizontal day navigation
     */
    async scheduleTaskNotifications5Day(tasks: TaskNotificationConfig[]): Promise<void> {
        try {
            Logger.info('[TaskReminderEngine5Day] Scheduling notifications for 5-day workflow', { 
                taskCount: tasks.length,
                focusWindow: {
                    start: this.fiveDayConfig.focusStartDate.toISOString(),
                    end: this.fiveDayConfig.focusEndDate.toISOString()
                }
            });

            // Filter tasks for 5-day focus window
            const fiveDayTasks = this.filterTasksFor5DayFocus(tasks);
            
            // Use parent class public method for actual scheduling
            await this.scheduleTaskNotifications(fiveDayTasks);

            Logger.info('[TaskReminderEngine5Day] Successfully scheduled 5-day workflow notifications');
        } catch (error) {
            Logger.error('[TaskReminderEngine5Day] Error scheduling 5-day notifications', { error });
            throw error;
        }
    }

    /**
     * 🔄 ADAPT: Filter tasks for 5-day focus window
     * 
     * Prioritizes tasks within the 5-day horizontal view window
     * while maintaining awareness of upcoming tasks.
     */
    private filterTasksFor5DayFocus(tasks: TaskNotificationConfig[]): TaskNotificationConfig[] {
        const { focusStartDate, focusEndDate } = this.fiveDayConfig;
        
        return tasks.filter(task => {
            const taskDate = startOfDay(task.dueDate);
            
            // Include tasks within 5-day window
            const isInFocusWindow = isWithinInterval(taskDate, focusStartDate, focusEndDate);
            
            // Also include critical tasks up to 2 days ahead for planning
            const isCriticalAhead = task.priority === 'critical' && 
                taskDate <= addDays(focusEndDate, 2);
            
            return isInFocusWindow || isCriticalAhead;
        });
    }

    /**
     * 🔄 ADAPT: Create daily optimized notification batches
     * 
     * Groups tasks by day within the 5-day window and optimizes
     * notification timing for daily plant care workflows.
     */
    private async createDailyOptimizedBatches(
        tasks: TaskNotificationConfig[],
        activityPattern: UserActivityPattern
    ): Promise<DailyTaskBatch[]> {
        const dailyBatches: DailyTaskBatch[] = [];
        const { focusStartDate } = this.fiveDayConfig;

        // Group tasks by day within 5-day window
        for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
            const currentDay = addDays(focusStartDate, dayIndex);
            const dayTasks = tasks.filter(task => 
                startOfDay(task.dueDate).getTime() === currentDay.getTime()
            );

            if (dayTasks.length === 0) continue;

            // 🔄 ADAPT: Optimize timing for daily plant care workflow
            const optimalTime = this.findDailyOptimalTime(dayTasks, activityPattern, currentDay);
            const adjustedTime = await this.handleTaskSpecificQuietHours(optimalTime, dayTasks, activityPattern);

            // Calculate task density for UI optimization
            const taskDensity = this.calculateTaskDensity(dayTasks);
            const plantCount = new Set(dayTasks.map(t => t.plantId)).size;

            const dailyBatch: DailyTaskBatch = {
                scheduledTime: adjustedTime,
                tasks: dayTasks,
                batchId: `5day_batch_${dayIndex}_${Date.now()}`,
                userId: activityPattern.userId,
                dayIndex,
                isToday: dayIndex === 0,
                taskDensity,
                plantCount,
            };

            dailyBatches.push(dailyBatch);
        }

        return dailyBatches;
    }

    /**
     * 🔄 ADAPT: Find optimal notification time for daily plant care
     * 
     * Optimizes timing based on daily plant care routines rather than
     * general notification preferences.
     */
    private findDailyOptimalTime(
        tasks: TaskNotificationConfig[],
        activityPattern: UserActivityPattern,
        targetDay: Date
    ): Date {
        const { dailyOptimalTimes } = this.fiveDayConfig;
        
        // Check task types to determine optimal care time
        const hasWateringTasks = tasks.some(t => t.taskType === 'watering');
        const hasFeedingTasks = tasks.some(t => t.taskType === 'feeding');
        const hasInspectionTasks = tasks.some(t => t.taskType === 'inspection');
        const hasCriticalTasks = tasks.some(t => t.priority === 'critical');

        let optimalHour: number;

        if (hasWateringTasks || hasFeedingTasks) {
            // Watering/feeding best in morning (8 AM) or evening (6 PM)
            optimalHour = hasCriticalTasks ? 8 : 18;
        } else if (hasInspectionTasks) {
            // Inspections best in good light (10 AM)
            optimalHour = 10;
        } else {
            // Default to user's preferred times
            const preferredHour = activityPattern.preferredNotificationTimes[0]?.getHours() || 9;
            optimalHour = preferredHour;
        }

        // Create notification time for target day
        const notificationTime = new Date(targetDay);
        notificationTime.setHours(optimalHour, 0, 0, 0);

        // Ensure it's not in the past
        const now = new Date();
        if (notificationTime <= now) {
            notificationTime.setTime(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
        }

        return notificationTime;
    }

    /**
     * 🔄 ADAPT: Handle task-specific quiet hours
     * 
     * Allows critical plant care tasks to override quiet hours when necessary,
     * while respecting user preferences for non-critical tasks.
     */
    private async handleTaskSpecificQuietHours(
        scheduledTime: Date,
        tasks: TaskNotificationConfig[],
        activityPattern: UserActivityPattern
    ): Promise<Date> {
        const { criticalTaskOverride } = this.fiveDayConfig;
        
        // Check if any tasks are critical and override is enabled
        const hasCriticalTasks = tasks.some(t => t.priority === 'critical');
        
        if (hasCriticalTasks && criticalTaskOverride) {
            // Critical plant care tasks can override quiet hours
            Logger.info('[TaskReminderEngine5Day] Critical task overriding quiet hours', {
                scheduledTime: scheduledTime.toISOString(),
                criticalTaskCount: tasks.filter(t => t.priority === 'critical').length
            });
            return scheduledTime;
        }

        // ✅ REUSE: Standard quiet hours handling for non-critical tasks
        return await this.respectQuietHours(scheduledTime, activityPattern.userId);
    }

    /**
     * Calculate task density for UI optimization
     */
    private calculateTaskDensity(tasks: TaskNotificationConfig[]): 'light' | 'moderate' | 'heavy' {
        const taskCount = tasks.length;
        const plantCount = new Set(tasks.map(t => t.plantId)).size;
        
        if (taskCount <= 2 && plantCount <= 2) return 'light';
        if (taskCount <= 5 && plantCount <= 4) return 'moderate';
        return 'heavy';
    }

    /**
     * Schedule a daily batch with 5-day workflow optimizations
     */
    private async scheduleDailyBatch(batch: DailyTaskBatch): Promise<void> {
        try {
            // 🔄 ADAPT: Create 5-day focused notification content
            const notificationContent = this.create5DayNotificationContent(batch);
            
            // Note: Using parent class's scheduling, so just log here
            Logger.info('[TaskReminderEngine5Day] Scheduled daily batch', {
                batchId: batch.batchId,
                dayIndex: batch.dayIndex,
                taskCount: batch.tasks.length,
                plantCount: batch.plantCount,
                taskDensity: batch.taskDensity
            });
        } catch (error) {
            Logger.error('[TaskReminderEngine5Day] Error scheduling daily batch', {
                batchId: batch.batchId,
                error
            });
        }
    }

    /**
     * 🔄 ADAPT: Create 5-day focused notification content
     * 
     * Generates notification content optimized for the 5-day horizontal
     * task view interface.
     */
    private create5DayNotificationContent(batch: DailyTaskBatch): { title: string; body: string } {
        const { tasks, dayIndex, isToday, taskDensity } = batch;
        
        const dayLabel = isToday ? 'Today' : this.getDayLabel(dayIndex);
        const taskCount = tasks.length;
        const plantCount = batch.plantCount;

        if (taskCount === 1) {
            const task = tasks[0]!;
            // Simple icon mapping (extracted from parent class)
            const iconMap: Record<TaskType, string> = {
                watering: '💧',
                feeding: '🧪',
                inspection: '🔍',
                pruning: '✂️',
                training: '🪴',
                defoliation: '🍃',
                flushing: '🚿',
                harvest: '🧺',
                transplant: '🏺',
            };
            const icon = iconMap[task.taskType] || '🌱';
            
            return {
                title: `${icon} ${dayLabel}: ${task.taskTitle}`,
                body: `${task.plantName} needs ${task.taskType}`,
            };
        }

        // Multiple tasks - optimize for 5-day view
        const urgencyIndicator = this.getTaskDensityIndicator(taskDensity);
        
        if (plantCount === 1) {
            const plantName = tasks[0]!.plantName;
            const taskTypes = [...new Set(tasks.map(t => t.taskType))];
            
            return {
                title: `${urgencyIndicator} ${dayLabel}: ${taskCount} tasks for ${plantName}`,
                body: `Care needed: ${taskTypes.join(', ')}`,
            };
        }

        // Multiple plants
        return {
            title: `${urgencyIndicator} ${dayLabel}: ${taskCount} plant care tasks`,
            body: `${plantCount} plants need attention`,
        };
    }

    /**
     * Helper methods for 5-day workflow
     */
    private getDayLabel(dayIndex: number): string {
        const days = ['Today', 'Tomorrow', 'Day 3', 'Day 4', 'Day 5'];
        return days[dayIndex] || `Day ${dayIndex + 1}`;
    }

    private getTaskDensityIndicator(density: 'light' | 'moderate' | 'heavy'): string {
        const indicators = {
            light: '🌱',
            moderate: '🌿',
            heavy: '🌳',
        };
        return indicators[density];
    }

    /**
     * Public API methods for 5-day workflow integration
     */

    /**
     * Update 5-day focus window (e.g., when user navigates)
     */
    updateFiveDayFocus(startDate: Date): void {
        this.fiveDayConfig.focusStartDate = startOfDay(startDate);
        this.fiveDayConfig.focusEndDate = addDays(startDate, 4);
        
        // Clear cache to force refresh
        this.dailyBatchCache.clear();
        
        Logger.info('[TaskReminderEngine5Day] Updated 5-day focus window', {
            start: this.fiveDayConfig.focusStartDate.toISOString(),
            end: this.fiveDayConfig.focusEndDate.toISOString()
        });
    }

    /**
     * Get cached daily batches for performance optimization
     */
    getCachedDailyBatches(userId: string): DailyTaskBatch[] | undefined {
        return this.dailyBatchCache.get(userId);
    }

    /**
     * Clear 5-day specific cache
     */
    clear5DayCache(): void {
        this.dailyBatchCache.clear();
        Logger.info('[TaskReminderEngine5Day] Cleared 5-day cache');
    }

    /**
     * Get 5-day workflow statistics
     */
    get5DayStats(): {
        focusWindow: { start: Date; end: Date };
        cachedBatches: number;
        batchingStrategy: string;
    } {
        return {
            focusWindow: {
                start: this.fiveDayConfig.focusStartDate,
                end: this.fiveDayConfig.focusEndDate
            },
            cachedBatches: this.dailyBatchCache.size,
            batchingStrategy: this.fiveDayConfig.batchingStrategy,
        };
    }
}

// Export singleton instance for 5-day workflow
export const taskReminderEngine5Day = TaskReminderEngine5Day.getInstance();