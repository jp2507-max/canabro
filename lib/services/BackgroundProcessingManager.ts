/**
 * Background Processing Manager
 * 
 * Unified manager for all background processing services. Provides a single
 * interface for task scheduling, notification batching, data sync, cleanup,
 * and performance monitoring. Optimized for the 5-day workflow.
 * 
 * Key Features:
 * - Unified API for all background processing services
 * - Coordinated service lifecycle management
 * - Performance monitoring and health checks
 * - Configuration management across services
 * - Error handling and recovery coordination
 * 
 * Requirements: R2-AC1, R2-AC3, R4-AC1
 */

import { Logger } from '@/lib/utils/production-utils';
import { backgroundTaskProcessor, BackgroundTaskConfig } from './BackgroundTaskProcessor';
import { batchNotificationProcessor, NotificationBatchConfig } from './BatchNotificationProcessor';
import { calendarDataSyncService, SyncConfig } from './CalendarDataSyncService';
import { dataCleanupService, CleanupConfig } from './DataCleanupService';
import { backgroundProcessingPerformanceTest, PerformanceTestConfig } from './BackgroundProcessingPerformanceTest';
import { PlantTask } from '@/lib/models/PlantTask';
import { Plant } from '@/lib/models/Plant';
import { TaskType } from '@/lib/types/taskTypes';

export interface BackgroundProcessingConfig {
    taskProcessor: Partial<BackgroundTaskConfig>;
    notificationBatcher: Partial<NotificationBatchConfig>;
    dataSync: Partial<SyncConfig>;
    dataCleanup: Partial<CleanupConfig>;
    performanceTest: Partial<PerformanceTestConfig>;
    manager: {
        enableAutoStart: boolean;
        healthCheckIntervalMs: number;
        enablePerformanceMonitoring: boolean;
        enableDetailedLogging: boolean;
    };
}

export interface BackgroundProcessingStatus {
    isRunning: boolean;
    services: {
        taskProcessor: {
            isProcessing: boolean;
            queueSize: number;
            stats: any;
        };
        notificationBatcher: {
            isProcessing: boolean;
            pendingNotifications: number;
            stats: any;
        };
        dataSync: {
            isSyncing: boolean;
            pendingChanges: any;
            stats: any;
        };
        dataCleanup: {
            isCleaningUp: boolean;
            nextScheduledCleanup: Date;
            stats: any;
        };
    };
    health: {
        overall: 'healthy' | 'warning' | 'critical';
        issues: string[];
        lastHealthCheck: Date;
    };
    performance: {
        lastTestScore: number;
        lastTestAt: Date;
        criticalIssues: string[];
    };
}

export interface BackgroundProcessingMetrics {
    uptime: number;
    totalTasksProcessed: number;
    totalNotificationsSent: number;
    totalSyncsCompleted: number;
    totalCleanupsCompleted: number;
    averagePerformanceScore: number;
    errorRate: number;
    memoryUsage: number;
}

export class BackgroundProcessingManager {
    private static instance: BackgroundProcessingManager;
    private config: BackgroundProcessingConfig;
    private isRunning = false;
    private startTime: Date | null = null;
    private healthCheckTimer: NodeJS.Timeout | null = null;
    private performanceMonitorTimer: NodeJS.Timeout | null = null;
    private metrics: BackgroundProcessingMetrics = {
        uptime: 0,
        totalTasksProcessed: 0,
        totalNotificationsSent: 0,
        totalSyncsCompleted: 0,
        totalCleanupsCompleted: 0,
        averagePerformanceScore: 100,
        errorRate: 0,
        memoryUsage: 0,
    };

    public static getInstance(): BackgroundProcessingManager {
        if (!BackgroundProcessingManager.instance) {
            BackgroundProcessingManager.instance = new BackgroundProcessingManager();
        }
        return BackgroundProcessingManager.instance;
    }

    constructor() {
        this.config = {
            taskProcessor: {
                batchSize: 50,
                maxRetries: 3,
                enablePerformanceLogging: __DEV__,
            },
            notificationBatcher: {
                maxBatchSize: 20,
                batchTimeoutMs: 5000,
                enablePerformanceLogging: __DEV__,
                fiveDayFocusEnabled: true,
            },
            dataSync: {
                syncIntervalMs: 30000,
                enableIncrementalSync: true,
                fiveDayFocusEnabled: true,
                enablePerformanceLogging: __DEV__,
            },
            dataCleanup: {
                enableAutoCleanup: true,
                cleanupIntervalMs: 24 * 60 * 60 * 1000, // 24 hours
                enablePerformanceLogging: __DEV__,
            },
            performanceTest: {
                testSuites: {
                    taskProcessing: true,
                    notificationBatching: true,
                    dataSync: true,
                    dataCleanup: true,
                    memoryUsage: true,
                    stressTest: false, // Disabled by default
                },
                enableDetailedLogging: __DEV__,
            },
            manager: {
                enableAutoStart: true,
                healthCheckIntervalMs: 60000, // 1 minute
                enablePerformanceMonitoring: true,
                enableDetailedLogging: __DEV__,
            },
        };
    }

    /**
     * Configure all background processing services
     */
    configure(config: Partial<BackgroundProcessingConfig>): void {
        this.config = { ...this.config, ...config };

        // Configure individual services
        if (config.taskProcessor) {
            backgroundTaskProcessor.configure(config.taskProcessor);
        }

        if (config.notificationBatcher) {
            batchNotificationProcessor.configure(config.notificationBatcher);
        }

        if (config.dataSync) {
            calendarDataSyncService.configure(config.dataSync);
        }

        if (config.dataCleanup) {
            dataCleanupService.configure(config.dataCleanup);
        }

        if (config.performanceTest) {
            backgroundProcessingPerformanceTest.configure(config.performanceTest);
        }

        Logger.info('[BackgroundProcessingManager] Configuration updated', { config: this.config });
    }

    /**
     * Start all background processing services
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            Logger.warn('[BackgroundProcessingManager] Already running');
            return;
        }

        Logger.info('[BackgroundProcessingManager] Starting background processing services');

        try {
            this.startTime = new Date();
            this.isRunning = true;

            // Start individual services
            calendarDataSyncService.startAutoSync();
            dataCleanupService.startAutoCleanup();

            // Start health monitoring
            this.startHealthMonitoring();

            // Start performance monitoring if enabled
            if (this.config.manager.enablePerformanceMonitoring) {
                this.startPerformanceMonitoring();
            }

            Logger.info('[BackgroundProcessingManager] All background processing services started');

        } catch (error) {
            Logger.error('[BackgroundProcessingManager] Failed to start services', { error });
            await this.stop(); // Cleanup on failure
            throw error;
        }
    }

    /**
     * Stop all background processing services
     */
    async stop(): Promise<void> {
        if (!this.isRunning) {
            Logger.warn('[BackgroundProcessingManager] Not running');
            return;
        }

        Logger.info('[BackgroundProcessingManager] Stopping background processing services');

        try {
            this.isRunning = false;

            // Stop individual services
            calendarDataSyncService.stopAutoSync();
            dataCleanupService.stopAutoCleanup();

            // Stop monitoring
            this.stopHealthMonitoring();
            this.stopPerformanceMonitoring();

            // Clear queues
            backgroundTaskProcessor.clearQueue();
            batchNotificationProcessor.clear();

            Logger.info('[BackgroundProcessingManager] All background processing services stopped');

        } catch (error) {
            Logger.error('[BackgroundProcessingManager] Error stopping services', { error });
            throw error;
        }
    }

    /**
     * Restart all background processing services
     */
    async restart(): Promise<void> {
        Logger.info('[BackgroundProcessingManager] Restarting background processing services');
        await this.stop();
        await this.start();
    }

    /**
     * Get comprehensive status of all services
     */
    getStatus(): BackgroundProcessingStatus {
        const taskProcessorStats = backgroundTaskProcessor.getProcessingStats();
        const notificationBatcherStats = batchNotificationProcessor.getStats();
        const dataSyncStats = calendarDataSyncService.getSyncStats();
        const dataCleanupStats = dataCleanupService.getCleanupStats();

        // Determine overall health
        const issues: string[] = [];
        let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';

        // Check for issues
        if (taskProcessorStats.totalFailed > taskProcessorStats.totalProcessed * 0.1) {
            issues.push('High task processing failure rate');
            overallHealth = 'warning';
        }

        if (dataSyncStats.successRate < 90) {
            issues.push('Low data sync success rate');
            overallHealth = 'warning';
        }

        if (!this.isRunning) {
            issues.push('Background processing services are not running');
            overallHealth = 'critical';
        }

        return {
            isRunning: this.isRunning,
            services: {
                taskProcessor: {
                    isProcessing: taskProcessorStats.isProcessing,
                    queueSize: taskProcessorStats.queueSize,
                    stats: taskProcessorStats,
                },
                notificationBatcher: {
                    isProcessing: false, // Not exposed by batchNotificationProcessor
                    pendingNotifications: 0, // Not exposed by batchNotificationProcessor
                    stats: notificationBatcherStats,
                },
                dataSync: {
                    isSyncing: dataSyncStats.isSyncing,
                    pendingChanges: dataSyncStats.pendingChanges,
                    stats: dataSyncStats,
                },
                dataCleanup: {
                    isCleaningUp: false, // Not exposed by dataCleanupService
                    nextScheduledCleanup: dataCleanupStats.nextScheduledCleanup,
                    stats: dataCleanupStats,
                },
            },
            health: {
                overall: overallHealth,
                issues,
                lastHealthCheck: new Date(),
            },
            performance: {
                lastTestScore: this.metrics.averagePerformanceScore,
                lastTestAt: new Date(),
                criticalIssues: [],
            },
        };
    }

    /**
     * Get performance metrics
     */
    getMetrics(): BackgroundProcessingMetrics {
        if (this.startTime) {
            this.metrics.uptime = Date.now() - this.startTime.getTime();
        }

        return { ...this.metrics };
    }

    /**
     * High-level API methods for common operations
     */

    /**
     * Schedule tasks for multiple plants efficiently
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
    ): Promise<{ processed: number; failed: number; errors: string[] }> {
        try {
            const result = await backgroundTaskProcessor.scheduleTasksForPlants(
                plants,
                taskType,
                dueDate,
                options
            );

            this.metrics.totalTasksProcessed += result.processed;
            this.updateErrorRate(result.failed, result.processed + result.failed);

            return result;

        } catch (error) {
            Logger.error('[BackgroundProcessingManager] Error scheduling tasks for plants', { error });
            throw error;
        }
    }

    /**
     * Process task completion with background optimization
     */
    async completeTask(task: PlantTask, rescheduleNext: boolean = true): Promise<void> {
        try {
            // Mark task as completed
            await task.markAsCompleted();

            // Queue for background processing
            await backgroundTaskProcessor.queueTaskUpdate([task], 'complete', 'medium');

            this.metrics.totalTasksProcessed++;

        } catch (error) {
            Logger.error('[BackgroundProcessingManager] Error completing task', { taskId: task.id, error });
            throw error;
        }
    }

    /**
     * Update 5-day focus window across all services
     */
    updateFiveDayFocus(startDate: Date): void {
        try {
            calendarDataSyncService.updateFiveDayFocus(startDate);
            
            Logger.info('[BackgroundProcessingManager] Updated 5-day focus window', {
                startDate: startDate.toISOString()
            });

        } catch (error) {
            Logger.error('[BackgroundProcessingManager] Error updating 5-day focus', { error });
            throw error;
        }
    }

    /**
     * Force immediate cleanup and optimization
     */
    async performMaintenance(): Promise<{
        cleanup: any;
        sync: any;
        optimization: boolean;
    }> {
        try {
            Logger.info('[BackgroundProcessingManager] Starting maintenance operations');

            // Force cleanup
            const cleanupResult = await dataCleanupService.forceCleanup();
            this.metrics.totalCleanupsCompleted++;

            // Force sync
            const syncResult = await calendarDataSyncService.performFullSync();
            this.metrics.totalSyncsCompleted++;

            // Clear caches for optimization
            calendarDataSyncService.clearSyncCache();
            backgroundTaskProcessor.clearQueue();
            batchNotificationProcessor.clear();

            Logger.info('[BackgroundProcessingManager] Maintenance operations completed');

            return {
                cleanup: cleanupResult,
                sync: syncResult,
                optimization: true,
            };

        } catch (error) {
            Logger.error('[BackgroundProcessingManager] Maintenance operations failed', { error });
            throw error;
        }
    }

    /**
     * Run performance tests
     */
    async runPerformanceTests(): Promise<any> {
        try {
            Logger.info('[BackgroundProcessingManager] Running performance tests');

            const report = await backgroundProcessingPerformanceTest.runPerformanceTests();
            
            this.metrics.averagePerformanceScore = report.overallScore;

            Logger.info('[BackgroundProcessingManager] Performance tests completed', {
                score: report.overallScore,
                criticalIssues: report.summary.criticalIssues.length
            });

            return report;

        } catch (error) {
            Logger.error('[BackgroundProcessingManager] Performance tests failed', { error });
            throw error;
        }
    }

    /**
     * Private helper methods
     */
    private startHealthMonitoring(): void {
        if (this.healthCheckTimer) {
            return;
        }

        this.healthCheckTimer = setInterval(() => {
            this.performHealthCheck();
        }, this.config.manager.healthCheckIntervalMs);

        Logger.info('[BackgroundProcessingManager] Health monitoring started');
    }

    private stopHealthMonitoring(): void {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }

        Logger.info('[BackgroundProcessingManager] Health monitoring stopped');
    }

    private startPerformanceMonitoring(): void {
        if (this.performanceMonitorTimer) {
            return;
        }

        // Run performance tests every hour
        this.performanceMonitorTimer = setInterval(() => {
            this.runPerformanceTests().catch(error => {
                Logger.error('[BackgroundProcessingManager] Scheduled performance test failed', { error });
            });
        }, 60 * 60 * 1000); // 1 hour

        Logger.info('[BackgroundProcessingManager] Performance monitoring started');
    }

    private stopPerformanceMonitoring(): void {
        if (this.performanceMonitorTimer) {
            clearInterval(this.performanceMonitorTimer);
            this.performanceMonitorTimer = null;
        }

        Logger.info('[BackgroundProcessingManager] Performance monitoring stopped');
    }

    private performHealthCheck(): void {
        try {
            const status = this.getStatus();

            if (status.health.overall === 'critical') {
                Logger.error('[BackgroundProcessingManager] Critical health issues detected', {
                    issues: status.health.issues
                });

                // Attempt automatic recovery
                this.attemptRecovery();
            } else if (status.health.overall === 'warning') {
                Logger.warn('[BackgroundProcessingManager] Health warnings detected', {
                    issues: status.health.issues
                });
            }

            if (this.config.manager.enableDetailedLogging) {
                Logger.info('[BackgroundProcessingManager] Health check completed', { status });
            }

        } catch (error) {
            Logger.error('[BackgroundProcessingManager] Health check failed', { error });
        }
    }

    private async attemptRecovery(): Promise<void> {
        try {
            Logger.info('[BackgroundProcessingManager] Attempting automatic recovery');

            // Clear queues and caches
            backgroundTaskProcessor.clearQueue();
            batchNotificationProcessor.clear();
            calendarDataSyncService.clearSyncCache();

            // Restart services if needed
            if (!this.isRunning) {
                await this.start();
            }

            Logger.info('[BackgroundProcessingManager] Automatic recovery completed');

        } catch (error) {
            Logger.error('[BackgroundProcessingManager] Automatic recovery failed', { error });
        }
    }

    private updateErrorRate(failed: number, total: number): void {
        if (total > 0) {
            const currentErrorRate = (failed / total) * 100;
            this.metrics.errorRate = (this.metrics.errorRate + currentErrorRate) / 2;
        }
    }
}

// Export singleton instance
export const backgroundProcessingManager = BackgroundProcessingManager.getInstance();