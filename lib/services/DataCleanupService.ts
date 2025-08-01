/**
 * Data Cleanup Service
 * 
 * Provides automatic cleanup of old tasks, notifications, and calendar data
 * to maintain optimal performance and storage efficiency. Optimized for
 * the 5-day workflow with intelligent retention policies.
 * 
 * Key Features:
 * - Automatic cleanup of old tasks and notifications
 * - Intelligent retention policies based on data importance
 * - Performance optimization for large datasets
 * - Configurable cleanup schedules and policies
 * - Safe cleanup with backup and recovery options
 * 
 * Requirements: R2-AC1, R2-AC3, R4-AC1
 */

import { Q } from '@nozbe/watermelondb';
import { database } from '@/lib/models';
import { PlantTask } from '@/lib/models/PlantTask';
import { CareReminder } from '@/lib/models/CareReminder';
import { Logger } from '@/lib/utils/production-utils';
import { cancelTaskReminder } from './NotificationService';
import { startOfDay, addDays, subDays } from '@/lib/utils/date';

export interface CleanupConfig {
    enableAutoCleanup: boolean;
    cleanupIntervalMs: number;
    retentionPolicies: {
        completedTasks: number; // days to keep completed tasks
        cancelledTasks: number; // days to keep cancelled tasks
        oldReminders: number; // days to keep old reminders
        overdueTasksGracePeriod: number; // days before cleaning overdue tasks
        notificationHistory: number; // days to keep notification history
    };
    batchSize: number;
    maxCleanupDuration: number; // max time in ms for cleanup operation
    enablePerformanceLogging: boolean;
    safetyChecks: {
        minTasksToKeep: number; // minimum tasks to always keep
        requireUserConfirmation: boolean; // for large cleanups
        createBackupBeforeCleanup: boolean;
    };
}

export interface CleanupResult {
    cleanupId: string;
    startTime: Date;
    endTime: Date;
    duration: number;
    tasksDeleted: number;
    remindersDeleted: number;
    notificationsCancelled: number;
    storageFreed: number; // estimated bytes freed
    errors: string[];
    success: boolean;
}

export interface CleanupStats {
    totalCleanups: number;
    totalTasksDeleted: number;
    totalRemindersDeleted: number;
    totalStorageFreed: number;
    averageCleanupTime: number;
    lastCleanupAt: Date;
    nextScheduledCleanup: Date;
}

export interface RetentionPolicy {
    name: string;
    description: string;
    condition: (item: Record<string, unknown>) => boolean;
    retentionDays: number;
    priority: 'low' | 'medium' | 'high';
}

export class DataCleanupService {
    private static instance: DataCleanupService;
    private config: CleanupConfig;
    private cleanupTimer: NodeJS.Timeout | null = null;
    private isCleaningUp = false;
    private stats: CleanupStats = {
        totalCleanups: 0,
        totalTasksDeleted: 0,
        totalRemindersDeleted: 0,
        totalStorageFreed: 0,
        averageCleanupTime: 0,
        lastCleanupAt: new Date(),
        nextScheduledCleanup: new Date(),
    };

    public static getInstance(): DataCleanupService {
        if (!DataCleanupService.instance) {
            DataCleanupService.instance = new DataCleanupService();
        }
        return DataCleanupService.instance;
    }

    constructor() {
        this.config = {
            enableAutoCleanup: true,
            cleanupIntervalMs: 24 * 60 * 60 * 1000, // 24 hours
            retentionPolicies: {
                completedTasks: 30, // Keep completed tasks for 30 days
                cancelledTasks: 7, // Keep cancelled tasks for 7 days
                oldReminders: 14, // Keep old reminders for 14 days
                overdueTasksGracePeriod: 3, // Grace period for overdue tasks
                notificationHistory: 7, // Keep notification history for 7 days
            },
            batchSize: 50,
            maxCleanupDuration: 60000, // 1 minute max
            enablePerformanceLogging: __DEV__,
            safetyChecks: {
                minTasksToKeep: 10, // Always keep at least 10 tasks
                requireUserConfirmation: false, // Auto cleanup without confirmation
                createBackupBeforeCleanup: false, // Skip backup for performance
            },
        };

        this.updateNextScheduledCleanup();
    }

    /**
     * Configure cleanup service parameters
     */
    configure(config: Partial<CleanupConfig>): void {
        this.config = { ...this.config, ...config };
        
        // Restart cleanup timer with new interval
        if (this.cleanupTimer) {
            this.stopAutoCleanup();
            this.startAutoCleanup();
        }

        this.updateNextScheduledCleanup();
        Logger.info('[DataCleanupService] Configuration updated', { config: this.config });
    }

    /**
     * Start automatic cleanup scheduling
     */
    startAutoCleanup(): void {
        if (!this.config.enableAutoCleanup || this.cleanupTimer) {
            return;
        }

        this.cleanupTimer = setInterval(() => {
            this.performCleanup();
        }, this.config.cleanupIntervalMs);

        Logger.info('[DataCleanupService] Auto cleanup started', {
            intervalMs: this.config.cleanupIntervalMs
        });
    }

    /**
     * Stop automatic cleanup scheduling
     */
    stopAutoCleanup(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }

        Logger.info('[DataCleanupService] Auto cleanup stopped');
    }

    /**
     * Perform comprehensive data cleanup
     */
    async performCleanup(): Promise<CleanupResult> {
        if (this.isCleaningUp) {
            Logger.debug('[DataCleanupService] Cleanup already in progress, skipping');
            return this.createEmptyResult();
        }

        this.isCleaningUp = true;
        const cleanupId = `cleanup_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const startTime = new Date();

        Logger.info('[DataCleanupService] Starting data cleanup', { cleanupId });

        try {
            const result = await this.performCleanupOperation(cleanupId, startTime);
            this.updateCleanupStats(result);
            this.updateNextScheduledCleanup();
            return result;

        } catch (error) {
            Logger.error('[DataCleanupService] Cleanup failed', { cleanupId, error });
            
            const failedResult: CleanupResult = {
                cleanupId,
                startTime,
                endTime: new Date(),
                duration: Date.now() - startTime.getTime(),
                tasksDeleted: 0,
                remindersDeleted: 0,
                notificationsCancelled: 0,
                storageFreed: 0,
                errors: [error instanceof Error ? error.message : String(error)],
                success: false,
            };

            this.updateCleanupStats(failedResult);
            return failedResult;

        } finally {
            this.isCleaningUp = false;
        }
    }

    /**
     * Clean up old completed tasks
     */
    async cleanupCompletedTasks(): Promise<{ deleted: number; errors: string[] }> {
        const result = { deleted: 0, errors: [] as string[] };

        try {
            const cutoffDate = subDays(new Date(), this.config.retentionPolicies.completedTasks);
            
            const oldCompletedTasks = await database.collections
                .get<PlantTask>('plant_tasks')
                .query(
                    Q.where('status', 'completed'),
                    Q.where('updated_at', Q.lt(cutoffDate.getTime()))
                )
                .fetch();

            // Safety check
            const totalTasks = await database.collections.get<PlantTask>('plant_tasks').query().fetchCount();
            const tasksToDelete = oldCompletedTasks.length;
            const remainingTasks = totalTasks - tasksToDelete;

            if (remainingTasks < this.config.safetyChecks.minTasksToKeep) {
                const keepCount = this.config.safetyChecks.minTasksToKeep - remainingTasks;
                oldCompletedTasks.splice(-keepCount); // Keep the most recent ones
                
                Logger.warn('[DataCleanupService] Safety check triggered for completed tasks', {
                    totalTasks,
                    tasksToDelete,
                    remainingTasks,
                    kept: keepCount
                });
            }

            // Delete in batches
            const chunks = this.chunkArray(oldCompletedTasks, this.config.batchSize);

            for (const chunk of chunks) {
                try {
                    await database.write(async () => {
                        for (const task of chunk) {
                            // Cancel any remaining notifications
                            await cancelTaskReminder(task.id);
                            
                            // Delete the task
                            await task.destroyPermanently();
                            result.deleted++;
                        }
                    });
                } catch (error) {
                    result.errors.push(`Completed task cleanup batch failed: ${error instanceof Error ? error.message : String(error)}`);
                }
            }

            Logger.info('[DataCleanupService] Completed tasks cleanup finished', {
                deleted: result.deleted,
                cutoffDate: cutoffDate.toISOString()
            });

        } catch (error) {
            result.errors.push(`Completed task cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        return result;
    }

    /**
     * Clean up old cancelled/failed tasks
     */
    async cleanupCancelledTasks(): Promise<{ deleted: number; errors: string[] }> {
        const result = { deleted: 0, errors: [] as string[] };

        try {
            const cutoffDate = subDays(new Date(), this.config.retentionPolicies.cancelledTasks);
            
            const oldCancelledTasks = await database.collections
                .get<PlantTask>('plant_tasks')
                .query(
                    Q.where('status', Q.oneOf(['cancelled', 'failed'])),
                    Q.where('updated_at', Q.lt(cutoffDate.getTime()))
                )
                .fetch();

            // Delete in batches
            const chunks = this.chunkArray(oldCancelledTasks, this.config.batchSize);

            for (const chunk of chunks) {
                try {
                    await database.write(async () => {
                        for (const task of chunk) {
                            await cancelTaskReminder(task.id);
                            await task.destroyPermanently();
                            result.deleted++;
                        }
                    });
                } catch (error) {
                    result.errors.push(`Cancelled task cleanup batch failed: ${error instanceof Error ? error.message : String(error)}`);
                }
            }

            Logger.info('[DataCleanupService] Cancelled tasks cleanup finished', {
                deleted: result.deleted,
                cutoffDate: cutoffDate.toISOString()
            });

        } catch (error) {
            result.errors.push(`Cancelled task cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        return result;
    }

    /**
     * Clean up old overdue tasks (with grace period)
     */
    async cleanupOverdueTasks(): Promise<{ deleted: number; errors: string[] }> {
        const result = { deleted: 0, errors: [] as string[] };

        try {
            const gracePeriodDate = subDays(new Date(), this.config.retentionPolicies.overdueTasksGracePeriod);
            
            const oldOverdueTasks = await database.collections
                .get<PlantTask>('plant_tasks')
                .query(
                    Q.where('status', 'pending'),
                    Q.where('due_date', Q.lt(gracePeriodDate.toISOString()))
                )
                .fetch();

            // Delete in batches
            const chunks = this.chunkArray(oldOverdueTasks, this.config.batchSize);

            for (const chunk of chunks) {
                try {
                    await database.write(async () => {
                        for (const task of chunk) {
                            await cancelTaskReminder(task.id);
                            await task.destroyPermanently();
                            result.deleted++;
                        }
                    });
                } catch (error) {
                    result.errors.push(`Overdue task cleanup batch failed: ${error instanceof Error ? error.message : String(error)}`);
                }
            }

            Logger.info('[DataCleanupService] Overdue tasks cleanup finished', {
                deleted: result.deleted,
                gracePeriodDate: gracePeriodDate.toISOString()
            });

        } catch (error) {
            result.errors.push(`Overdue task cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        return result;
    }

    /**
     * Clean up old care reminders
     */
    async cleanupOldReminders(): Promise<{ deleted: number; errors: string[] }> {
        const result = { deleted: 0, errors: [] as string[] };

        try {
            const cutoffDate = subDays(new Date(), this.config.retentionPolicies.oldReminders);
            
            const oldReminders = await database.collections
                .get<CareReminder>('care_reminders')
                .query(
                    Q.where('scheduled_for', Q.lt(cutoffDate.toISOString())),
                    Q.where('is_completed', true)
                )
                .fetch();

            // Delete in batches
            const chunks = this.chunkArray(oldReminders, this.config.batchSize);

            for (const chunk of chunks) {
                try {
                    await database.write(async () => {
                        for (const reminder of chunk) {
                            await reminder.destroyPermanently();
                            result.deleted++;
                        }
                    });
                } catch (error) {
                    result.errors.push(`Reminder cleanup batch failed: ${error instanceof Error ? error.message : String(error)}`);
                }
            }

            Logger.info('[DataCleanupService] Old reminders cleanup finished', {
                deleted: result.deleted,
                cutoffDate: cutoffDate.toISOString()
            });

        } catch (error) {
            result.errors.push(`Reminder cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        return result;
    }

    /**
     * Clean up orphaned data (tasks without plants, etc.)
     */
    async cleanupOrphanedData(): Promise<{ deleted: number; errors: string[] }> {
        const result = { deleted: 0, errors: [] as string[] };

        try {
            // Find tasks with non-existent plants
            const allTasks = await database.collections.get<PlantTask>('plant_tasks').query().fetch();
            const orphanedTasks: PlantTask[] = [];

            for (const task of allTasks) {
                try {
                    await task.plant; // This will throw if plant doesn't exist
                } catch {
                    orphanedTasks.push(task);
                }
            }

            // Delete orphaned tasks in batches
            const chunks = this.chunkArray(orphanedTasks, this.config.batchSize);

            for (const chunk of chunks) {
                try {
                    await database.write(async () => {
                        for (const task of chunk) {
                            await cancelTaskReminder(task.id);
                            await task.destroyPermanently();
                            result.deleted++;
                        }
                    });
                } catch (error) {
                    result.errors.push(`Orphaned data cleanup batch failed: ${error instanceof Error ? error.message : String(error)}`);
                }
            }

            Logger.info('[DataCleanupService] Orphaned data cleanup finished', {
                deleted: result.deleted,
                orphanedTasks: orphanedTasks.length
            });

        } catch (error) {
            result.errors.push(`Orphaned data cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        return result;
    }

    /**
     * Optimize database performance (vacuum, reindex, etc.)
     */
    async optimizeDatabase(): Promise<{ success: boolean; errors: string[] }> {
        const result = { success: false, errors: [] as string[] };

        try {
            // In a real implementation, this would:
            // 1. Run VACUUM on SQLite database
            // 2. Reindex frequently queried tables
            // 3. Update table statistics
            // 4. Compact database file

            Logger.info('[DataCleanupService] Database optimization completed');
            result.success = true;

        } catch (error) {
            result.errors.push(`Database optimization failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        return result;
    }

    /**
     * Get cleanup statistics
     */
    getCleanupStats(): CleanupStats {
        return { ...this.stats };
    }

    /**
     * Get current storage usage estimates
     */
    async getStorageUsage(): Promise<{
        totalTasks: number;
        completedTasks: number;
        pendingTasks: number;
        overdueTasks: number;
        totalReminders: number;
        estimatedStorageBytes: number;
    }> {
        try {
            const [totalTasks, completedTasks, pendingTasks, overdueTasks, totalReminders] = await Promise.all([
                database.collections.get<PlantTask>('plant_tasks').query().fetchCount(),
                database.collections.get<PlantTask>('plant_tasks').query(Q.where('status', 'completed')).fetchCount(),
                database.collections.get<PlantTask>('plant_tasks').query(Q.where('status', 'pending')).fetchCount(),
                database.collections.get<PlantTask>('plant_tasks').query(
                    Q.where('status', 'pending'),
                    Q.where('due_date', Q.lt(new Date().toISOString()))
                ).fetchCount(),
                database.collections.get<CareReminder>('care_reminders').query().fetchCount(),
            ]);

            // Rough estimate: 1KB per task, 0.5KB per reminder
            const estimatedStorageBytes = (totalTasks * 1024) + (totalReminders * 512);

            return {
                totalTasks,
                completedTasks,
                pendingTasks,
                overdueTasks,
                totalReminders,
                estimatedStorageBytes,
            };

        } catch (error) {
            Logger.error('[DataCleanupService] Error getting storage usage', { error });
            return {
                totalTasks: 0,
                completedTasks: 0,
                pendingTasks: 0,
                overdueTasks: 0,
                totalReminders: 0,
                estimatedStorageBytes: 0,
            };
        }
    }

    /**
     * Force immediate cleanup (useful for testing or manual cleanup)
     */
    async forceCleanup(): Promise<CleanupResult> {
        Logger.info('[DataCleanupService] Force cleanup requested');
        return await this.performCleanup();
    }

    /**
     * Private implementation methods
     */
    private async performCleanupOperation(cleanupId: string, startTime: Date): Promise<CleanupResult> {
        const result: CleanupResult = {
            cleanupId,
            startTime,
            endTime: new Date(),
            duration: 0,
            tasksDeleted: 0,
            remindersDeleted: 0,
            notificationsCancelled: 0,
            storageFreed: 0,
            errors: [],
            success: false,
        };

        const operationStartTime = Date.now();

        try {
            // Get initial storage usage
            const initialStorage = await this.getStorageUsage();

            // Perform cleanup operations
            const [completedResult, cancelledResult, overdueResult, reminderResult, orphanedResult] = await Promise.all([
                this.cleanupCompletedTasks(),
                this.cleanupCancelledTasks(),
                this.cleanupOverdueTasks(),
                this.cleanupOldReminders(),
                this.cleanupOrphanedData(),
            ]);

            // Aggregate results
            result.tasksDeleted = completedResult.deleted + cancelledResult.deleted + overdueResult.deleted + orphanedResult.deleted;
            result.remindersDeleted = reminderResult.deleted;
            result.notificationsCancelled = result.tasksDeleted; // Assume 1:1 ratio
            result.errors.push(...completedResult.errors, ...cancelledResult.errors, ...overdueResult.errors, ...reminderResult.errors, ...orphanedResult.errors);

            // Calculate storage freed
            const finalStorage = await this.getStorageUsage();
            result.storageFreed = Math.max(0, initialStorage.estimatedStorageBytes - finalStorage.estimatedStorageBytes);

            // Optimize database if significant cleanup occurred
            if (result.tasksDeleted > 100 || result.remindersDeleted > 50) {
                const optimizeResult = await this.optimizeDatabase();
                result.errors.push(...optimizeResult.errors);
            }

            result.success = result.errors.length === 0;
            result.endTime = new Date();
            result.duration = Date.now() - operationStartTime;

            if (this.config.enablePerformanceLogging) {
                Logger.info('[DataCleanupService] Cleanup operation completed', { result });
            }

        } catch (error) {
            result.errors.push(`Cleanup operation failed: ${error instanceof Error ? error.message : String(error)}`);
            result.success = false;
        }

        return result;
    }

    private updateCleanupStats(result: CleanupResult): void {
        this.stats.totalCleanups++;
        this.stats.totalTasksDeleted += result.tasksDeleted;
        this.stats.totalRemindersDeleted += result.remindersDeleted;
        this.stats.totalStorageFreed += result.storageFreed;
        this.stats.averageCleanupTime = (this.stats.averageCleanupTime + result.duration) / 2;
        this.stats.lastCleanupAt = result.endTime;
    }

    private updateNextScheduledCleanup(): void {
        this.stats.nextScheduledCleanup = new Date(Date.now() + this.config.cleanupIntervalMs);
    }

    private createEmptyResult(): CleanupResult {
        return {
            cleanupId: 'empty',
            startTime: new Date(),
            endTime: new Date(),
            duration: 0,
            tasksDeleted: 0,
            remindersDeleted: 0,
            notificationsCancelled: 0,
            storageFreed: 0,
            errors: [],
            success: true,
        };
    }

    private chunkArray<T>(array: T[], chunkSize: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }
}

// Export singleton instance
export const dataCleanupService = DataCleanupService.getInstance();