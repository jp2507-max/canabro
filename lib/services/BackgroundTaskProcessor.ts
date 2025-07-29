/**
 * Background Task Processor
 * 
 * Handles efficient background processing for task scheduling, updates,
 * and maintenance operations. Optimized for the 5-day workflow with
 * performance considerations for large plant collections.
 * 
 * Key Features:
 * - Efficient task scheduling and updates
 * - Background processing with queue management
 * - Performance optimization for large datasets
 * - Error handling and retry logic
 * - Memory management and cleanup
 * 
 * Requirements: R2-AC1, R2-AC3, R4-AC1
 */

import { Q } from '@nozbe/watermelondb';
import { database } from '@/lib/models';
import { PlantTask } from '@/lib/models/PlantTask';
import { CareReminder } from '@/lib/models/CareReminder';
import { Plant } from '@/lib/models/Plant';
import { Logger } from '@/lib/utils/production-utils';
import { taskReminderEngine5Day } from './TaskReminderEngine5Day';
import { taskReminderIntegration5Day } from './TaskReminderIntegration5Day';
import { startOfDay, addDays, isWithinInterval } from '@/lib/utils/date';
import { TaskType } from '@/lib/types/taskTypes';

export interface BackgroundTaskConfig {
    batchSize: number;
    maxRetries: number;
    retryDelayMs: number;
    processingTimeoutMs: number;
    enablePerformanceLogging: boolean;
}

export interface TaskProcessingResult {
    processed: number;
    failed: number;
    skipped: number;
    duration: number;
    errors: string[];
}

export interface TaskUpdateBatch {
    id: string;
    tasks: PlantTask[];
    operation: 'create' | 'update' | 'delete' | 'complete';
    priority: 'low' | 'medium' | 'high' | 'critical';
    scheduledAt: Date;
    retryCount: number;
}

export class BackgroundTaskProcessor {
    private static instance: BackgroundTaskProcessor;
    private config: BackgroundTaskConfig;
    private processingQueue: TaskUpdateBatch[] = [];
    private isProcessing = false;
    private processingStats = {
        totalProcessed: 0,
        totalFailed: 0,
        averageProcessingTime: 0,
        lastProcessedAt: new Date(),
    };

    public static getInstance(): BackgroundTaskProcessor {
        if (!BackgroundTaskProcessor.instance) {
            BackgroundTaskProcessor.instance = new BackgroundTaskProcessor();
        }
        return BackgroundTaskProcessor.instance;
    }

    constructor() {
        this.config = {
            batchSize: 50, // Process 50 tasks at a time
            maxRetries: 3,
            retryDelayMs: 1000, // 1 second base delay
            processingTimeoutMs: 30000, // 30 second timeout
            enablePerformanceLogging: __DEV__,
        };
    }

    /**
     * Configure background processing parameters
     */
    configure(config: Partial<BackgroundTaskConfig>): void {
        this.config = { ...this.config, ...config };
        Logger.info('[BackgroundTaskProcessor] Configuration updated', { config: this.config });
    }

    /**
     * Add tasks to the background processing queue
     */
    async queueTaskUpdate(
        tasks: PlantTask[],
        operation: TaskUpdateBatch['operation'],
        priority: TaskUpdateBatch['priority'] = 'medium'
    ): Promise<string> {
        const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        
        const batch: TaskUpdateBatch = {
            id: batchId,
            tasks,
            operation,
            priority,
            scheduledAt: new Date(),
            retryCount: 0,
        };

        // Insert based on priority (higher priority first)
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const insertIndex = this.processingQueue.findIndex(
            item => priorityOrder[item.priority] > priorityOrder[priority]
        );

        if (insertIndex === -1) {
            this.processingQueue.push(batch);
        } else {
            this.processingQueue.splice(insertIndex, 0, batch);
        }

        Logger.info('[BackgroundTaskProcessor] Queued task batch', {
            batchId,
            operation,
            priority,
            taskCount: tasks.length,
            queueSize: this.processingQueue.length
        });

        // Start processing if not already running
        if (!this.isProcessing) {
            this.startProcessing();
        }

        return batchId;
    }

    /**
     * Process all queued task updates efficiently
     */
    private async startProcessing(): Promise<void> {
        if (this.isProcessing) {
            return;
        }

        this.isProcessing = true;
        Logger.info('[BackgroundTaskProcessor] Starting background processing');

        try {
            while (this.processingQueue.length > 0) {
                const batch = this.processingQueue.shift();
                if (!batch) continue;

                const startTime = Date.now();
                
                try {
                    const result = await this.processBatch(batch);
                    
                    const duration = Date.now() - startTime;
                    this.updateProcessingStats(result, duration);

                    if (this.config.enablePerformanceLogging) {
                        Logger.info('[BackgroundTaskProcessor] Batch processed', {
                            batchId: batch.id,
                            result,
                            duration
                        });
                    }

                } catch (error) {
                    Logger.error('[BackgroundTaskProcessor] Batch processing failed', {
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
                            this.processingQueue.unshift(batch); // Add back to front for retry
                        }, delay);
                    } else {
                        this.processingStats.totalFailed++;
                        Logger.error('[BackgroundTaskProcessor] Batch failed after max retries', {
                            batchId: batch.id,
                            maxRetries: this.config.maxRetries
                        });
                    }
                }
            }
        } finally {
            this.isProcessing = false;
            Logger.info('[BackgroundTaskProcessor] Background processing completed');
        }
    }

    /**
     * Process a single batch of task updates
     */
    private async processBatch(batch: TaskUpdateBatch): Promise<TaskProcessingResult> {
        const { tasks, operation } = batch;
        const result: TaskProcessingResult = {
            processed: 0,
            failed: 0,
            skipped: 0,
            duration: 0,
            errors: []
        };

        const startTime = Date.now();

        try {
            // Process tasks in smaller chunks for better performance
            const chunks = this.chunkArray(tasks, this.config.batchSize);

            for (const chunk of chunks) {
                try {
                    await database.write(async () => {
                        for (const task of chunk) {
                            try {
                                await this.processTaskUpdate(task, operation);
                                result.processed++;
                            } catch (error) {
                                result.failed++;
                                result.errors.push(`Task ${task.id}: ${error instanceof Error ? error.message : String(error)}`);
                                Logger.error('[BackgroundTaskProcessor] Task processing failed', {
                                    taskId: task.id,
                                    operation,
                                    error
                                });
                            }
                        }
                    });
                } catch (error) {
                    result.failed += chunk.length;
                    result.errors.push(`Chunk processing failed: ${error instanceof Error ? error.message : String(error)}`);
                    Logger.error('[BackgroundTaskProcessor] Chunk processing failed', { error });
                }
            }

        } catch (error) {
            result.failed = tasks.length;
            result.errors.push(`Batch processing failed: ${error instanceof Error ? error.message : String(error)}`);
            Logger.error('[BackgroundTaskProcessor] Batch processing failed', { error });
        }

        result.duration = Date.now() - startTime;
        return result;
    }

    /**
     * Process individual task update based on operation type
     */
    private async processTaskUpdate(task: PlantTask, operation: TaskUpdateBatch['operation']): Promise<void> {
        switch (operation) {
            case 'create':
                await this.processTaskCreation(task);
                break;
            case 'update':
                await this.processTaskUpdate(task);
                break;
            case 'complete':
                await this.processTaskCompletion(task);
                break;
            case 'delete':
                await this.processTaskDeletion(task);
                break;
            default:
                throw new Error(`Unknown operation: ${operation}`);
        }
    }

    /**
     * Process task creation with notification scheduling
     */
    private async processTaskCreation(task: PlantTask): Promise<void> {
        // Schedule notifications for the new task
        const plant = await task.plant;
        
        await taskReminderIntegration5Day.scheduleTasksFor5DayWorkflow([task], {
            optimizeForDailyWorkflow: true,
            enableCriticalOverride: true,
        });

        Logger.debug('[BackgroundTaskProcessor] Task created and scheduled', {
            taskId: task.id,
            plantName: plant.name,
            taskType: task.taskType,
            dueDate: task.dueDate
        });
    }

    /**
     * Process task updates with notification rescheduling
     */
    private async processTaskUpdate(task: PlantTask): Promise<void> {
        // Reschedule notifications for updated task
        await taskReminderIntegration5Day.rescheduleTaskFor5Day(task, new Date(task.dueDate));

        Logger.debug('[BackgroundTaskProcessor] Task updated and rescheduled', {
            taskId: task.id,
            dueDate: task.dueDate
        });
    }

    /**
     * Process task completion with next task generation
     */
    private async processTaskCompletion(task: PlantTask): Promise<void> {
        // Handle completion with 5-day workflow considerations
        await taskReminderIntegration5Day.handleTaskCompletion5Day(task, true);

        Logger.debug('[BackgroundTaskProcessor] Task completion processed', {
            taskId: task.id,
            completedAt: new Date().toISOString()
        });
    }

    /**
     * Process task deletion with notification cleanup
     */
    private async processTaskDeletion(task: PlantTask): Promise<void> {
        // Cancel notifications for deleted task
        await taskReminderEngine5Day.cancelTaskNotifications(task.id);

        Logger.debug('[BackgroundTaskProcessor] Task deletion processed', {
            taskId: task.id
        });
    }

    /**
     * Efficiently schedule tasks for multiple plants
     */
    async scheduleTasksForPlants(
        plants: Plant[],
        taskType: TaskType,
        dueDate: Date,
        options: {
            priority?: 'low' | 'medium' | 'high' | 'critical';
            estimatedDuration?: number;
            templateId?: string;
        } = {}
    ): Promise<TaskProcessingResult> {
        const startTime = Date.now();
        const result: TaskProcessingResult = {
            processed: 0,
            failed: 0,
            skipped: 0,
            duration: 0,
            errors: []
        };

        try {
            // Create tasks in batches for better performance
            const chunks = this.chunkArray(plants, this.config.batchSize);

            for (const chunk of chunks) {
                try {
                    const tasks: PlantTask[] = [];

                    await database.write(async () => {
                        for (const plant of chunk) {
                            try {
                                const task = await database.get<PlantTask>('plant_tasks').create(task => {
                                    task.taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
                                    task.plantId = plant.id;
                                    task.title = `${taskType.charAt(0).toUpperCase() + taskType.slice(1)} ${plant.name}`;
                                    task.taskType = taskType;
                                    task.dueDate = dueDate.toISOString();
                                    task.status = 'pending';
                                    task.userId = 'current_user'; // This would come from auth context
                                    task.priority = options.priority || 'medium';
                                    task.estimatedDuration = options.estimatedDuration;
                                    task.templateId = options.templateId;
                                    task.autoGenerated = true;
                                });

                                tasks.push(task);
                                result.processed++;
                            } catch (error) {
                                result.failed++;
                                result.errors.push(`Plant ${plant.id}: ${error instanceof Error ? error.message : String(error)}`);
                            }
                        }
                    });

                    // Queue tasks for notification scheduling
                    if (tasks.length > 0) {
                        await this.queueTaskUpdate(tasks, 'create', options.priority || 'medium');
                    }

                } catch (error) {
                    result.failed += chunk.length;
                    result.errors.push(`Chunk processing failed: ${error instanceof Error ? error.message : String(error)}`);
                }
            }

        } catch (error) {
            result.failed = plants.length;
            result.errors.push(`Bulk scheduling failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        result.duration = Date.now() - startTime;

        Logger.info('[BackgroundTaskProcessor] Bulk task scheduling completed', {
            plantCount: plants.length,
            taskType,
            result
        });

        return result;
    }

    /**
     * Process overdue tasks in background
     */
    async processOverdueTasksInBackground(): Promise<TaskProcessingResult> {
        const startTime = Date.now();
        const result: TaskProcessingResult = {
            processed: 0,
            failed: 0,
            skipped: 0,
            duration: 0,
            errors: []
        };

        try {
            Logger.info('[BackgroundTaskProcessor] Processing overdue tasks');

            // Get overdue tasks in batches
            const now = new Date();
            const overdueTasks = await database.collections
                .get<PlantTask>('plant_tasks')
                .query(
                    Q.where('status', 'pending'),
                    Q.where('due_date', Q.lt(now.toISOString())),
                    Q.sortBy('due_date', Q.asc)
                )
                .fetch();

            if (overdueTasks.length === 0) {
                Logger.info('[BackgroundTaskProcessor] No overdue tasks found');
                result.duration = Date.now() - startTime;
                return result;
            }

            // Process overdue tasks using the reminder engine
            await taskReminderIntegration5Day.processOverdueTasksFor5Day();

            result.processed = overdueTasks.length;

        } catch (error) {
            result.errors.push(`Overdue processing failed: ${error instanceof Error ? error.message : String(error)}`);
            Logger.error('[BackgroundTaskProcessor] Overdue task processing failed', { error });
        }

        result.duration = Date.now() - startTime;
        return result;
    }

    /**
     * Update tasks for growth stage changes in background
     */
    async updateTasksForGrowthStageChange(
        plantId: string,
        newGrowthStage: string,
        templateId?: string
    ): Promise<TaskProcessingResult> {
        const startTime = Date.now();
        const result: TaskProcessingResult = {
            processed: 0,
            failed: 0,
            skipped: 0,
            duration: 0,
            errors: []
        };

        try {
            const plant = await database.get<Plant>('plants').find(plantId);
            
            // Cancel future tasks for the old growth stage
            const futureTasks = await database.collections
                .get<PlantTask>('plant_tasks')
                .query(
                    Q.where('plant_id', plantId),
                    Q.where('status', 'pending'),
                    Q.where('due_date', Q.gt(new Date().toISOString()))
                )
                .fetch();

            // Queue cancellation of old tasks
            if (futureTasks.length > 0) {
                await this.queueTaskUpdate(futureTasks, 'delete', 'high');
            }

            // Generate new tasks for the new growth stage
            // This would integrate with the TaskScheduler service
            // For now, create a basic watering task as an example
            const newTask = await database.write(async () => {
                return await database.get<PlantTask>('plant_tasks').create(task => {
                    task.taskId = `growth_task_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
                    task.plantId = plantId;
                    task.title = `Growth stage care for ${plant.name}`;
                    task.taskType = 'inspection';
                    task.dueDate = addDays(new Date(), 1).toISOString();
                    task.status = 'pending';
                    task.userId = 'current_user';
                    task.priority = 'medium';
                    task.autoGenerated = true;
                    task.templateId = templateId;
                });
            });

            await this.queueTaskUpdate([newTask], 'create', 'high');

            result.processed = 1;

        } catch (error) {
            result.failed = 1;
            result.errors.push(`Growth stage update failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        result.duration = Date.now() - startTime;
        return result;
    }

    /**
     * Get processing statistics
     */
    getProcessingStats(): {
        totalProcessed: number;
        totalFailed: number;
        averageProcessingTime: number;
        lastProcessedAt: Date;
        queueSize: number;
        isProcessing: boolean;
    } {
        return {
            ...this.processingStats,
            queueSize: this.processingQueue.length,
            isProcessing: this.isProcessing,
        };
    }

    /**
     * Clear processing queue (useful for testing)
     */
    clearQueue(): void {
        this.processingQueue = [];
        Logger.info('[BackgroundTaskProcessor] Processing queue cleared');
    }

    /**
     * Private helper methods
     */
    private chunkArray<T>(array: T[], chunkSize: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    private updateProcessingStats(result: TaskProcessingResult, duration: number): void {
        this.processingStats.totalProcessed += result.processed;
        this.processingStats.totalFailed += result.failed;
        this.processingStats.averageProcessingTime = 
            (this.processingStats.averageProcessingTime + duration) / 2;
        this.processingStats.lastProcessedAt = new Date();
    }
}

// Export singleton instance
export const backgroundTaskProcessor = BackgroundTaskProcessor.getInstance();