/**
 * Batch Notification Processor
 * 
 * Enhanced notification batching system optimized for the 5-day workflow.
 * Provides intelligent batching, performance optimization, and memory management
 * for handling large volumes of plant care notifications.
 * 
 * Key Features:
 * - Intelligent notification batching with priority handling
 * - Performance optimization for large plant collections
 * - Memory-efficient processing with cleanup
 * - Retry logic and error handling
 * - 5-day workflow optimization
 * 
 * Requirements: R2-AC1, R2-AC3, R4-AC1
 */

import { Logger } from '@/lib/utils/production-utils';
import { 
    scheduleNotification, 
    cancelTaskReminder,
    NotificationType 
} from './NotificationService';
import { 
    validateNotificationSchedule5Day,
    optimizeForDailyPlantCare,
    getPlantCareLeadTime,
    FiveDayScheduleOptions 
} from '@/lib/utils/notification-scheduling';
import { TaskType } from '@/lib/types/taskTypes';
import { startOfDay, addDays, isWithinInterval } from '@/lib/utils/date';

export interface NotificationBatchConfig {
    maxBatchSize: number;
    batchTimeoutMs: number;
    maxRetries: number;
    retryDelayMs: number;
    enablePerformanceLogging: boolean;
    fiveDayFocusEnabled: boolean;
}

export interface BatchNotificationRequest {
    id: string;
    taskId: string;
    plantId: string;
    plantName: string;
    taskType: TaskType;
    taskTitle: string;
    dueDate: Date;
    priority: 'low' | 'medium' | 'high' | 'critical';
    estimatedDuration?: number;
    isRecurring?: boolean;
    userId: string;
}

export interface NotificationBatch {
    id: string;
    notifications: BatchNotificationRequest[];
    scheduledTime: Date;
    priority: 'low' | 'medium' | 'high' | 'critical';
    userId: string;
    batchType: 'daily' | 'plant-grouped' | 'priority-grouped' | 'time-grouped';
    retryCount: number;
    createdAt: Date;
}

export interface BatchProcessingResult {
    batchId: string;
    scheduled: number;
    failed: number;
    skipped: number;
    duration: number;
    errors: string[];
    notificationIds: string[];
}

export interface BatchProcessingStats {
    totalBatches: number;
    totalNotifications: number;
    successRate: number;
    averageBatchSize: number;
    averageProcessingTime: number;
    lastProcessedAt: Date;
}

export class BatchNotificationProcessor {
    private static instance: BatchNotificationProcessor;
    private config: NotificationBatchConfig;
    private pendingNotifications: BatchNotificationRequest[] = [];
    private processingBatches: Map<string, NotificationBatch> = new Map();
    private batchTimer: NodeJS.Timeout | null = null;
    private isProcessing = false;
    private stats: BatchProcessingStats = {
        totalBatches: 0,
        totalNotifications: 0,
        successRate: 100,
        averageBatchSize: 0,
        averageProcessingTime: 0,
        lastProcessedAt: new Date(),
    };

    public static getInstance(): BatchNotificationProcessor {
        if (!BatchNotificationProcessor.instance) {
            BatchNotificationProcessor.instance = new BatchNotificationProcessor();
        }
        return BatchNotificationProcessor.instance;
    }

    constructor() {
        this.config = {
            maxBatchSize: 20, // Process up to 20 notifications per batch
            batchTimeoutMs: 5000, // 5 second timeout for batching
            maxRetries: 3,
            retryDelayMs: 2000, // 2 second base delay
            enablePerformanceLogging: __DEV__,
            fiveDayFocusEnabled: true,
        };
    }

    /**
     * Configure batch processing parameters
     */
    configure(config: Partial<NotificationBatchConfig>): void {
        this.config = { ...this.config, ...config };
        Logger.info('[BatchNotificationProcessor] Configuration updated', { config: this.config });
    }

    /**
     * Add notification to batch processing queue
     */
    async queueNotification(request: BatchNotificationRequest): Promise<void> {
        // Validate notification for 5-day workflow if enabled
        if (this.config.fiveDayFocusEnabled) {
            const scheduleOptions: FiveDayScheduleOptions = {
                taskPriority: request.priority,
                allowCriticalOverride: true,
            };

            const validationResult = validateNotificationSchedule5Day(request.dueDate, scheduleOptions);
            
            if (!validationResult.success) {
                Logger.warn('[BatchNotificationProcessor] Notification outside 5-day focus', {
                    taskId: request.taskId,
                    error: validationResult.error
                });
                return; // Skip notifications outside focus window
            }
        }

        // Optimize notification timing for plant care
        const optimizedTime = optimizeForDailyPlantCare(
            request.dueDate,
            request.taskType,
            request.priority
        );

        // Calculate notification time with appropriate lead time
        const leadTimeMinutes = getPlantCareLeadTime(request.taskType, request.priority);
        const notificationTime = new Date(optimizedTime.getTime() - (leadTimeMinutes * 60 * 1000));

        // Update request with optimized timing
        const optimizedRequest: BatchNotificationRequest = {
            ...request,
            dueDate: notificationTime,
        };

        this.pendingNotifications.push(optimizedRequest);

        Logger.debug('[BatchNotificationProcessor] Notification queued', {
            taskId: request.taskId,
            originalTime: request.dueDate.toISOString(),
            optimizedTime: notificationTime.toISOString(),
            queueSize: this.pendingNotifications.length
        });

        // Start batch timer if not already running
        this.startBatchTimer();

        // Process immediately if batch is full or high priority
        if (this.shouldProcessImmediately(optimizedRequest)) {
            await this.processBatches();
        }
    }

    /**
     * Process all pending notifications in optimized batches
     */
    async processBatches(): Promise<BatchProcessingResult[]> {
        if (this.isProcessing || this.pendingNotifications.length === 0) {
            return [];
        }

        this.isProcessing = true;
        this.clearBatchTimer();

        const results: BatchProcessingResult[] = [];

        try {
            Logger.info('[BatchNotificationProcessor] Starting batch processing', {
                pendingCount: this.pendingNotifications.length
            });

            // Create optimized batches
            const batches = this.createOptimizedBatches(this.pendingNotifications);
            this.pendingNotifications = []; // Clear pending queue

            // Process each batch
            for (const batch of batches) {
                try {
                    const result = await this.processBatch(batch);
                    results.push(result);
                    this.updateStats(result);

                    if (this.config.enablePerformanceLogging) {
                        Logger.info('[BatchNotificationProcessor] Batch processed', {
                            batchId: batch.id,
                            result
                        });
                    }

                } catch (error) {
                    Logger.error('[BatchNotificationProcessor] Batch processing failed', {
                        batchId: batch.id,
                        error,
                        retryCount: batch.retryCount
                    });

                    // Retry logic
                    if (batch.retryCount < this.config.maxRetries) {
                        batch.retryCount++;
                        
                        // Exponential backoff
                        const delay = this.config.retryDelayMs * Math.pow(2, batch.retryCount - 1);
                        
                        setTimeout(() => {
                            this.retryBatch(batch);
                        }, delay);
                    } else {
                        const failedResult: BatchProcessingResult = {
                            batchId: batch.id,
                            scheduled: 0,
                            failed: batch.notifications.length,
                            skipped: 0,
                            duration: 0,
                            errors: [`Max retries exceeded: ${error instanceof Error ? error.message : String(error)}`],
                            notificationIds: [],
                        };
                        results.push(failedResult);
                        this.updateStats(failedResult);
                    }
                }
            }

        } finally {
            this.isProcessing = false;
            Logger.info('[BatchNotificationProcessor] Batch processing completed', {
                batchCount: results.length,
                totalScheduled: results.reduce((sum, r) => sum + r.scheduled, 0),
                totalFailed: results.reduce((sum, r) => sum + r.failed, 0)
            });
        }

        return results;
    }

    /**
     * Create optimized notification batches
     */
    private createOptimizedBatches(notifications: BatchNotificationRequest[]): NotificationBatch[] {
        const batches: NotificationBatch[] = [];

        // Sort notifications by priority and time
        const sortedNotifications = notifications.sort((a, b) => {
            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            
            if (priorityDiff !== 0) return priorityDiff;
            return a.dueDate.getTime() - b.dueDate.getTime();
        });

        // Group notifications using different strategies
        const groupedBatches = [
            ...this.createDailyBatches(sortedNotifications),
            ...this.createPlantGroupedBatches(sortedNotifications),
            ...this.createPriorityGroupedBatches(sortedNotifications),
        ];

        // Remove duplicates and optimize batch sizes
        const uniqueBatches = this.deduplicateAndOptimizeBatches(groupedBatches);

        return uniqueBatches;
    }

    /**
     * Create daily-focused batches for 5-day workflow
     */
    private createDailyBatches(notifications: BatchNotificationRequest[]): NotificationBatch[] {
        const batches: NotificationBatch[] = [];
        const dailyGroups = new Map<string, BatchNotificationRequest[]>();

        // Group by day
        for (const notification of notifications) {
            const dayKey = startOfDay(notification.dueDate).toISOString();
            if (!dailyGroups.has(dayKey)) {
                dailyGroups.set(dayKey, []);
            }
            dailyGroups.get(dayKey)!.push(notification);
        }

        // Create batches for each day
        for (const [dayKey, dayNotifications] of dailyGroups.entries()) {
            if (dayNotifications.length === 0) continue;

            // Split large daily groups into smaller batches
            const chunks = this.chunkArray(dayNotifications, this.config.maxBatchSize);
            
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                if (!chunk || chunk.length === 0) continue;

                const batchPriority = this.calculateBatchPriority(chunk);
                const scheduledTime = this.calculateOptimalBatchTime(chunk);

                const batch: NotificationBatch = {
                    id: `daily_${dayKey}_${i}_${Date.now()}`,
                    notifications: chunk,
                    scheduledTime,
                    priority: batchPriority,
                    userId: chunk[0]?.userId || 'current_user',
                    batchType: 'daily',
                    retryCount: 0,
                    createdAt: new Date(),
                };

                batches.push(batch);
            }
        }

        return batches;
    }

    /**
     * Create plant-grouped batches
     */
    private createPlantGroupedBatches(notifications: BatchNotificationRequest[]): NotificationBatch[] {
        const batches: NotificationBatch[] = [];
        const plantGroups = new Map<string, BatchNotificationRequest[]>();

        // Group by plant
        for (const notification of notifications) {
            if (!plantGroups.has(notification.plantId)) {
                plantGroups.set(notification.plantId, []);
            }
            plantGroups.get(notification.plantId)!.push(notification);
        }

        // Create batches for plants with multiple notifications
        for (const [plantId, plantNotifications] of plantGroups.entries()) {
            if (plantNotifications.length < 2) continue; // Skip single notifications

            const chunks = this.chunkArray(plantNotifications, this.config.maxBatchSize);
            
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                if (!chunk || chunk.length === 0) continue;

                const batchPriority = this.calculateBatchPriority(chunk);
                const scheduledTime = this.calculateOptimalBatchTime(chunk);

                const batch: NotificationBatch = {
                    id: `plant_${plantId}_${i}_${Date.now()}`,
                    notifications: chunk,
                    scheduledTime,
                    priority: batchPriority,
                    userId: chunk[0]?.userId || 'current_user',
                    batchType: 'plant-grouped',
                    retryCount: 0,
                    createdAt: new Date(),
                };

                batches.push(batch);
            }
        }

        return batches;
    }

    /**
     * Create priority-grouped batches
     */
    private createPriorityGroupedBatches(notifications: BatchNotificationRequest[]): NotificationBatch[] {
        const batches: NotificationBatch[] = [];
        const priorityGroups = new Map<string, BatchNotificationRequest[]>();

        // Group by priority
        for (const notification of notifications) {
            if (!priorityGroups.has(notification.priority)) {
                priorityGroups.set(notification.priority, []);
            }
            priorityGroups.get(notification.priority)!.push(notification);
        }

        // Create batches for high and critical priority notifications
        for (const [priority, priorityNotifications] of priorityGroups.entries()) {
            if (priority !== 'high' && priority !== 'critical') continue;
            if (priorityNotifications.length === 0) continue;

            const chunks = this.chunkArray(priorityNotifications, this.config.maxBatchSize);
            
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                if (!chunk || chunk.length === 0) continue;

                const scheduledTime = this.calculateOptimalBatchTime(chunk);

                const batch: NotificationBatch = {
                    id: `priority_${priority}_${i}_${Date.now()}`,
                    notifications: chunk,
                    scheduledTime,
                    priority: priority as 'high' | 'critical',
                    userId: chunk[0]?.userId || 'current_user',
                    batchType: 'priority-grouped',
                    retryCount: 0,
                    createdAt: new Date(),
                };

                batches.push(batch);
            }
        }

        return batches;
    }

    /**
     * Process a single notification batch
     */
    private async processBatch(batch: NotificationBatch): Promise<BatchProcessingResult> {
        const startTime = Date.now();
        const result: BatchProcessingResult = {
            batchId: batch.id,
            scheduled: 0,
            failed: 0,
            skipped: 0,
            duration: 0,
            errors: [],
            notificationIds: [],
        };

        try {
            this.processingBatches.set(batch.id, batch);

            // Create batch notification content
            const notificationContent = this.createBatchNotificationContent(batch);

            // Calculate seconds until scheduled time
            const now = new Date();
            const secondsUntilScheduled = Math.floor((batch.scheduledTime.getTime() - now.getTime()) / 1000);

            if (secondsUntilScheduled <= 0) {
                Logger.warn('[BatchNotificationProcessor] Batch scheduled time is in the past', {
                    batchId: batch.id,
                    scheduledTime: batch.scheduledTime.toISOString()
                });
                result.skipped = batch.notifications.length;
                return result;
            }

            // Schedule the batch notification
            const notificationId = await scheduleNotification({
                title: notificationContent.title,
                body: notificationContent.body,
                data: {
                    type: NotificationType.TASK_REMINDER,
                    batchId: batch.id,
                    taskIds: batch.notifications.map(n => n.taskId),
                    plantIds: batch.notifications.map(n => n.plantId),
                    batchType: batch.batchType,
                },
                trigger: secondsUntilScheduled,
                type: NotificationType.TASK_REMINDER,
            });

            if (notificationId) {
                result.scheduled = batch.notifications.length;
                result.notificationIds.push(notificationId);
                
                Logger.info('[BatchNotificationProcessor] Batch notification scheduled', {
                    batchId: batch.id,
                    notificationId,
                    notificationCount: batch.notifications.length,
                    scheduledTime: batch.scheduledTime.toISOString()
                });
            } else {
                result.failed = batch.notifications.length;
                result.errors.push('Failed to schedule batch notification');
            }

        } catch (error) {
            result.failed = batch.notifications.length;
            result.errors.push(`Batch processing error: ${error instanceof Error ? error.message : String(error)}`);
            Logger.error('[BatchNotificationProcessor] Batch processing error', {
                batchId: batch.id,
                error
            });
        } finally {
            this.processingBatches.delete(batch.id);
            result.duration = Date.now() - startTime;
        }

        return result;
    }

    /**
     * Create notification content for a batch
     */
    private createBatchNotificationContent(batch: NotificationBatch): { title: string; body: string } {
        const { notifications, batchType } = batch;
        const notificationCount = notifications.length;

        if (notificationCount === 1) {
            const notification = notifications[0]!;
            const icon = this.getTaskIcon(notification.taskType);
            
            return {
                title: `${icon} ${notification.taskTitle}`,
                body: `Time to ${notification.taskType} your ${notification.plantName}!`,
            };
        }

        // Multiple notifications - create summary based on batch type
        switch (batchType) {
            case 'daily': {
                const dayLabel = this.getDayLabel(notifications[0]?.dueDate || new Date());
                const plantCount = new Set(notifications.map(n => n.plantName)).size;
                
                return {
                    title: `🌱 ${dayLabel}: ${notificationCount} plant care tasks`,
                    body: `${plantCount} plants need attention`,
                };
            }

            case 'plant-grouped': {
                const plantName = notifications[0]?.plantName || 'Your plant';
                const taskTypes = [...new Set(notifications.map(n => n.taskType))];
                
                return {
                    title: `🌱 ${notificationCount} tasks for ${plantName}`,
                    body: `Care needed: ${taskTypes.join(', ')}`,
                };
            }

            case 'priority-grouped': {
                const priority = batch.priority;
                const urgencyIcon = this.getUrgencyIcon(priority);
                
                return {
                    title: `${urgencyIcon} ${notificationCount} ${priority} priority tasks`,
                    body: 'Multiple plants need immediate attention',
                };
            }

            default: {
                const plantCount = new Set(notifications.map(n => n.plantName)).size;
                
                return {
                    title: `🌱 ${notificationCount} plant care reminders`,
                    body: `${plantCount} plants need attention`,
                };
            }
        }
    }

    /**
     * Cancel notifications for specific tasks
     */
    async cancelNotifications(taskIds: string[]): Promise<void> {
        try {
            // Remove from pending queue
            this.pendingNotifications = this.pendingNotifications.filter(
                notification => !taskIds.includes(notification.taskId)
            );

            // Cancel scheduled notifications
            for (const taskId of taskIds) {
                await cancelTaskReminder(taskId);
            }

            // Remove from processing batches
            for (const [batchId, batch] of this.processingBatches.entries()) {
                batch.notifications = batch.notifications.filter(
                    notification => !taskIds.includes(notification.taskId)
                );
                
                if (batch.notifications.length === 0) {
                    this.processingBatches.delete(batchId);
                }
            }

            Logger.info('[BatchNotificationProcessor] Notifications cancelled', {
                taskIds,
                remainingPending: this.pendingNotifications.length
            });

        } catch (error) {
            Logger.error('[BatchNotificationProcessor] Error cancelling notifications', {
                taskIds,
                error
            });
        }
    }

    /**
     * Get processing statistics
     */
    getStats(): BatchProcessingStats {
        return { ...this.stats };
    }

    /**
     * Clear all pending notifications and reset state
     */
    clear(): void {
        this.pendingNotifications = [];
        this.processingBatches.clear();
        this.clearBatchTimer();
        this.isProcessing = false;
        
        Logger.info('[BatchNotificationProcessor] Cleared all pending notifications');
    }

    /**
     * Private helper methods
     */
    private shouldProcessImmediately(request: BatchNotificationRequest): boolean {
        return (
            request.priority === 'critical' ||
            this.pendingNotifications.length >= this.config.maxBatchSize
        );
    }

    private startBatchTimer(): void {
        if (this.batchTimer) return;

        this.batchTimer = setTimeout(() => {
            this.processBatches();
        }, this.config.batchTimeoutMs);
    }

    private clearBatchTimer(): void {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }
    }

    private async retryBatch(batch: NotificationBatch): Promise<void> {
        Logger.info('[BatchNotificationProcessor] Retrying batch', {
            batchId: batch.id,
            retryCount: batch.retryCount
        });

        try {
            const result = await this.processBatch(batch);
            this.updateStats(result);
        } catch (error) {
            Logger.error('[BatchNotificationProcessor] Batch retry failed', {
                batchId: batch.id,
                error
            });
        }
    }

    private calculateBatchPriority(notifications: BatchNotificationRequest[]): 'low' | 'medium' | 'high' | 'critical' {
        const priorities = notifications.map(n => n.priority);
        
        if (priorities.includes('critical')) return 'critical';
        if (priorities.includes('high')) return 'high';
        if (priorities.includes('medium')) return 'medium';
        return 'low';
    }

    private calculateOptimalBatchTime(notifications: BatchNotificationRequest[]): Date {
        if (notifications.length === 0) return new Date();

        // Use the earliest due date as the batch time
        const earliestDue = notifications.reduce((earliest, notification) =>
            notification.dueDate < earliest ? notification.dueDate : earliest,
            notifications[0]!.dueDate
        );

        return earliestDue;
    }

    private deduplicateAndOptimizeBatches(batches: NotificationBatch[]): NotificationBatch[] {
        const seenNotifications = new Set<string>();
        const optimizedBatches: NotificationBatch[] = [];

        for (const batch of batches) {
            const uniqueNotifications = batch.notifications.filter(notification => {
                if (seenNotifications.has(notification.taskId)) {
                    return false;
                }
                seenNotifications.add(notification.taskId);
                return true;
            });

            if (uniqueNotifications.length > 0) {
                optimizedBatches.push({
                    ...batch,
                    notifications: uniqueNotifications,
                });
            }
        }

        return optimizedBatches;
    }

    private chunkArray<T>(array: T[], chunkSize: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    private updateStats(result: BatchProcessingResult): void {
        this.stats.totalBatches++;
        this.stats.totalNotifications += result.scheduled + result.failed;
        this.stats.successRate = (this.stats.successRate + (result.failed === 0 ? 100 : 0)) / 2;
        this.stats.averageBatchSize = (this.stats.averageBatchSize + result.scheduled + result.failed) / 2;
        this.stats.averageProcessingTime = (this.stats.averageProcessingTime + result.duration) / 2;
        this.stats.lastProcessedAt = new Date();
    }

    private getTaskIcon(taskType: TaskType): string {
        const icons: Record<TaskType, string> = {
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

        return icons[taskType] || '🌱';
    }

    private getUrgencyIcon(priority: 'low' | 'medium' | 'high' | 'critical'): string {
        const icons = {
            low: '🌱',
            medium: '⚠️',
            high: '🚨',
            critical: '🔴',
        };

        return icons[priority];
    }

    private getDayLabel(date: Date): string {
        const today = startOfDay(new Date());
        const targetDay = startOfDay(date);
        const diffDays = Math.floor((targetDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays === -1) return 'Yesterday';
        if (diffDays > 1 && diffDays <= 4) return `Day ${diffDays + 1}`;
        
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
}

// Export singleton instance
export const batchNotificationProcessor = BatchNotificationProcessor.getInstance();