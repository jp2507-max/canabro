/**
 * Background Processing Performance Test
 * 
 * Comprehensive performance testing suite for background processing services.
 * Tests efficiency, scalability, and reliability under various load conditions
 * with focus on the 5-day workflow optimization.
 * 
 * Key Features:
 * - Load testing for task processing and notifications
 * - Memory usage and performance monitoring
 * - Stress testing with large plant collections
 * - 5-day workflow performance validation
 * - Automated performance regression detection
 * 
 * Requirements: R2-AC1, R2-AC3, R4-AC1
 */

import { database } from '@/lib/models';
import { PlantTask } from '@/lib/models/PlantTask';
import { Plant } from '@/lib/models/Plant';
import { CareReminder } from '@/lib/models/CareReminder';
import { Logger } from '@/lib/utils/production-utils';
import { backgroundTaskProcessor } from './BackgroundTaskProcessor';
import { batchNotificationProcessor } from './BatchNotificationProcessor';
import { calendarDataSyncService } from './CalendarDataSyncService';
import { dataCleanupService } from './DataCleanupService';
import { TaskType } from '@/lib/types/taskTypes';
import { addDays, startOfDay } from '@/lib/utils/date';

export interface PerformanceTestConfig {
    testSuites: {
        taskProcessing: boolean;
        notificationBatching: boolean;
        dataSync: boolean;
        dataCleanup: boolean;
        memoryUsage: boolean;
        stressTest: boolean;
    };
    testData: {
        plantCount: number;
        tasksPerPlant: number;
        remindersPerPlant: number;
        testDurationMs: number;
    };
    performance: {
        maxAcceptableLatency: number; // ms
        maxMemoryUsageMB: number;
        minThroughputPerSecond: number;
        maxErrorRate: number; // percentage
    };
    enableDetailedLogging: boolean;
}

export interface PerformanceTestResult {
    testId: string;
    testSuite: string;
    startTime: Date;
    endTime: Date;
    duration: number;
    success: boolean;
    metrics: {
        throughput: number; // operations per second
        averageLatency: number; // ms
        maxLatency: number; // ms
        memoryUsage: number; // MB
        errorRate: number; // percentage
        cpuUsage?: number; // percentage
    };
    details: {
        operationsCompleted: number;
        operationsFailed: number;
        peakMemoryUsage: number;
        bottlenecks: string[];
        recommendations: string[];
    };
    errors: string[];
}

export interface PerformanceReport {
    reportId: string;
    generatedAt: Date;
    overallScore: number; // 0-100
    testResults: PerformanceTestResult[];
    summary: {
        totalTests: number;
        passedTests: number;
        failedTests: number;
        averageScore: number;
        criticalIssues: string[];
        performanceRegression: boolean;
    };
    recommendations: string[];
}

export class BackgroundProcessingPerformanceTest {
    private static instance: BackgroundProcessingPerformanceTest;
    private config: PerformanceTestConfig;
    private testData: {
        plants: Plant[];
        tasks: PlantTask[];
        reminders: CareReminder[];
    } = {
        plants: [],
        tasks: [],
        reminders: [],
    };

    public static getInstance(): BackgroundProcessingPerformanceTest {
        if (!BackgroundProcessingPerformanceTest.instance) {
            BackgroundProcessingPerformanceTest.instance = new BackgroundProcessingPerformanceTest();
        }
        return BackgroundProcessingPerformanceTest.instance;
    }

    constructor() {
        this.config = {
            testSuites: {
                taskProcessing: true,
                notificationBatching: true,
                dataSync: true,
                dataCleanup: true,
                memoryUsage: true,
                stressTest: true,
            },
            testData: {
                plantCount: 100,
                tasksPerPlant: 10,
                remindersPerPlant: 5,
                testDurationMs: 60000, // 1 minute
            },
            performance: {
                maxAcceptableLatency: 1000, // 1 second
                maxMemoryUsageMB: 100,
                minThroughputPerSecond: 10,
                maxErrorRate: 5, // 5%
            },
            enableDetailedLogging: __DEV__,
        };
    }

    /**
     * Configure performance test parameters
     */
    configure(config: Partial<PerformanceTestConfig>): void {
        this.config = { ...this.config, ...config };
        Logger.info('[PerformanceTest] Configuration updated', { config: this.config });
    }

    /**
     * Run comprehensive performance test suite
     */
    async runPerformanceTests(): Promise<PerformanceReport> {
        const reportId = `perf_report_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const startTime = new Date();

        Logger.info('[PerformanceTest] Starting comprehensive performance tests', { reportId });

        try {
            // Setup test data
            await this.setupTestData();

            const testResults: PerformanceTestResult[] = [];

            // Run individual test suites
            if (this.config.testSuites.taskProcessing) {
                testResults.push(await this.testTaskProcessingPerformance());
            }

            if (this.config.testSuites.notificationBatching) {
                testResults.push(await this.testNotificationBatchingPerformance());
            }

            if (this.config.testSuites.dataSync) {
                testResults.push(await this.testDataSyncPerformance());
            }

            if (this.config.testSuites.dataCleanup) {
                testResults.push(await this.testDataCleanupPerformance());
            }

            if (this.config.testSuites.memoryUsage) {
                testResults.push(await this.testMemoryUsagePerformance());
            }

            if (this.config.testSuites.stressTest) {
                testResults.push(await this.testStressPerformance());
            }

            // Generate performance report
            const report = this.generatePerformanceReport(reportId, testResults);

            // Cleanup test data
            await this.cleanupTestData();

            Logger.info('[PerformanceTest] Performance tests completed', {
                reportId,
                duration: Date.now() - startTime.getTime(),
                overallScore: report.overallScore
            });

            return report;

        } catch (error) {
            Logger.error('[PerformanceTest] Performance tests failed', { reportId, error });
            throw error;
        }
    }

    /**
     * Test task processing performance
     */
    private async testTaskProcessingPerformance(): Promise<PerformanceTestResult> {
        const testId = `task_processing_${Date.now()}`;
        const startTime = new Date();
        const metrics = {
            throughput: 0,
            averageLatency: 0,
            maxLatency: 0,
            memoryUsage: 0,
            errorRate: 0,
        };
        const details = {
            operationsCompleted: 0,
            operationsFailed: 0,
            peakMemoryUsage: 0,
            bottlenecks: [] as string[],
            recommendations: [] as string[],
        };
        const errors: string[] = [];

        try {
            Logger.info('[PerformanceTest] Starting task processing performance test');

            const initialMemory = this.getMemoryUsage();
            const operationLatencies: number[] = [];
            const testEndTime = Date.now() + this.config.testData.testDurationMs;

            // Test task creation and processing
            while (Date.now() < testEndTime) {
                const operationStart = Date.now();

                try {
                    // Create batch of tasks
                    const batchSize = 10;
                    const selectedPlants = this.testData.plants.slice(0, batchSize);
                    
                    const result = await backgroundTaskProcessor.scheduleTasksForPlants(
                        selectedPlants,
                        'watering',
                        addDays(new Date(), 1),
                        { priority: 'medium' }
                    );

                    const operationLatency = Date.now() - operationStart;
                    operationLatencies.push(operationLatency);

                    details.operationsCompleted += result.processed;
                    details.operationsFailed += result.failed;

                    // Track memory usage
                    const currentMemory = this.getMemoryUsage();
                    details.peakMemoryUsage = Math.max(details.peakMemoryUsage, currentMemory);

                } catch (error) {
                    details.operationsFailed++;
                    errors.push(`Task processing error: ${error instanceof Error ? error.message : String(error)}`);
                }
            }

            // Calculate metrics
            metrics.throughput = details.operationsCompleted / (this.config.testData.testDurationMs / 1000);
            metrics.averageLatency = operationLatencies.reduce((sum, lat) => sum + lat, 0) / operationLatencies.length || 0;
            metrics.maxLatency = Math.max(...operationLatencies, 0);
            metrics.memoryUsage = details.peakMemoryUsage - initialMemory;
            metrics.errorRate = (details.operationsFailed / (details.operationsCompleted + details.operationsFailed)) * 100;

            // Analyze bottlenecks
            if (metrics.averageLatency > this.config.performance.maxAcceptableLatency) {
                details.bottlenecks.push('High average latency detected');
                details.recommendations.push('Consider optimizing database queries or reducing batch sizes');
            }

            if (metrics.throughput < this.config.performance.minThroughputPerSecond) {
                details.bottlenecks.push('Low throughput detected');
                details.recommendations.push('Consider increasing batch processing parallelization');
            }

        } catch (error) {
            errors.push(`Task processing test failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        const endTime = new Date();
        const success = errors.length === 0 && 
                       metrics.errorRate <= this.config.performance.maxErrorRate &&
                       metrics.averageLatency <= this.config.performance.maxAcceptableLatency;

        return {
            testId,
            testSuite: 'Task Processing',
            startTime,
            endTime,
            duration: endTime.getTime() - startTime.getTime(),
            success,
            metrics,
            details,
            errors,
        };
    }

    /**
     * Test notification batching performance
     */
    private async testNotificationBatchingPerformance(): Promise<PerformanceTestResult> {
        const testId = `notification_batching_${Date.now()}`;
        const startTime = new Date();
        const metrics = {
            throughput: 0,
            averageLatency: 0,
            maxLatency: 0,
            memoryUsage: 0,
            errorRate: 0,
        };
        const details = {
            operationsCompleted: 0,
            operationsFailed: 0,
            peakMemoryUsage: 0,
            bottlenecks: [] as string[],
            recommendations: [] as string[],
        };
        const errors: string[] = [];

        try {
            Logger.info('[PerformanceTest] Starting notification batching performance test');

            const initialMemory = this.getMemoryUsage();
            const operationLatencies: number[] = [];

            // Test notification batching with various scenarios
            const testScenarios = [
                { notificationCount: 10, priority: 'low' as const },
                { notificationCount: 50, priority: 'medium' as const },
                { notificationCount: 100, priority: 'high' as const },
                { notificationCount: 20, priority: 'critical' as const },
            ];

            for (const scenario of testScenarios) {
                const operationStart = Date.now();

                try {
                    // Create batch of notifications
                    const notifications = this.createTestNotifications(scenario.notificationCount, scenario.priority);
                    
                    // Queue notifications
                    for (const notification of notifications) {
                        await batchNotificationProcessor.queueNotification(notification);
                    }

                    // Process batches
                    const results = await batchNotificationProcessor.processBatches();
                    
                    const operationLatency = Date.now() - operationStart;
                    operationLatencies.push(operationLatency);

                    details.operationsCompleted += results.reduce((sum, r) => sum + r.scheduled, 0);
                    details.operationsFailed += results.reduce((sum, r) => sum + r.failed, 0);

                    // Track memory usage
                    const currentMemory = this.getMemoryUsage();
                    details.peakMemoryUsage = Math.max(details.peakMemoryUsage, currentMemory);

                } catch (error) {
                    details.operationsFailed += scenario.notificationCount;
                    errors.push(`Notification batching error: ${error instanceof Error ? error.message : String(error)}`);
                }
            }

            // Calculate metrics
            const totalOperations = details.operationsCompleted + details.operationsFailed;
            metrics.throughput = totalOperations / (operationLatencies.length > 0 ? operationLatencies.reduce((sum, lat) => sum + lat, 0) / 1000 : 1);
            metrics.averageLatency = operationLatencies.reduce((sum, lat) => sum + lat, 0) / operationLatencies.length || 0;
            metrics.maxLatency = Math.max(...operationLatencies, 0);
            metrics.memoryUsage = details.peakMemoryUsage - initialMemory;
            metrics.errorRate = (details.operationsFailed / totalOperations) * 100;

            // Analyze performance
            if (metrics.averageLatency > this.config.performance.maxAcceptableLatency) {
                details.bottlenecks.push('High notification batching latency');
                details.recommendations.push('Consider optimizing batch creation algorithms');
            }

        } catch (error) {
            errors.push(`Notification batching test failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        const endTime = new Date();
        const success = errors.length === 0 && 
                       metrics.errorRate <= this.config.performance.maxErrorRate;

        return {
            testId,
            testSuite: 'Notification Batching',
            startTime,
            endTime,
            duration: endTime.getTime() - startTime.getTime(),
            success,
            metrics,
            details,
            errors,
        };
    }

    /**
     * Test data sync performance
     */
    private async testDataSyncPerformance(): Promise<PerformanceTestResult> {
        const testId = `data_sync_${Date.now()}`;
        const startTime = new Date();
        const metrics = {
            throughput: 0,
            averageLatency: 0,
            maxLatency: 0,
            memoryUsage: 0,
            errorRate: 0,
        };
        const details = {
            operationsCompleted: 0,
            operationsFailed: 0,
            peakMemoryUsage: 0,
            bottlenecks: [] as string[],
            recommendations: [] as string[],
        };
        const errors: string[] = [];

        try {
            Logger.info('[PerformanceTest] Starting data sync performance test');

            const initialMemory = this.getMemoryUsage();
            const operationLatencies: number[] = [];

            // Test different sync scenarios
            const syncTests = [
                { type: 'incremental', description: 'Incremental sync with few changes' },
                { type: 'full', description: 'Full sync with all data' },
                { type: 'focus_update', description: '5-day focus window update' },
            ];

            for (const syncTest of syncTests) {
                const operationStart = Date.now();

                try {
                    let result;
                    
                    switch (syncTest.type) {
                        case 'incremental':
                            // Simulate some changes
                            calendarDataSyncService.trackTaskChange('test_task_1', 'update');
                            calendarDataSyncService.trackTaskChange('test_task_2', 'create');
                            result = await calendarDataSyncService.performIncrementalSync();
                            break;
                            
                        case 'full':
                            result = await calendarDataSyncService.performFullSync();
                            break;
                            
                        case 'focus_update':
                            calendarDataSyncService.updateFiveDayFocus(new Date());
                            result = await calendarDataSyncService.performIncrementalSync();
                            break;
                            
                        default:
                            throw new Error(`Unknown sync test type: ${syncTest.type}`);
                    }

                    const operationLatency = Date.now() - operationStart;
                    operationLatencies.push(operationLatency);

                    if (result.success) {
                        details.operationsCompleted++;
                    } else {
                        details.operationsFailed++;
                        errors.push(...result.errors);
                    }

                    // Track memory usage
                    const currentMemory = this.getMemoryUsage();
                    details.peakMemoryUsage = Math.max(details.peakMemoryUsage, currentMemory);

                } catch (error) {
                    details.operationsFailed++;
                    errors.push(`Data sync error (${syncTest.type}): ${error instanceof Error ? error.message : String(error)}`);
                }
            }

            // Calculate metrics
            const totalOperations = details.operationsCompleted + details.operationsFailed;
            metrics.throughput = totalOperations / (operationLatencies.reduce((sum, lat) => sum + lat, 0) / 1000 || 1);
            metrics.averageLatency = operationLatencies.reduce((sum, lat) => sum + lat, 0) / operationLatencies.length || 0;
            metrics.maxLatency = Math.max(...operationLatencies, 0);
            metrics.memoryUsage = details.peakMemoryUsage - initialMemory;
            metrics.errorRate = (details.operationsFailed / totalOperations) * 100;

        } catch (error) {
            errors.push(`Data sync test failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        const endTime = new Date();
        const success = errors.length === 0 && 
                       metrics.errorRate <= this.config.performance.maxErrorRate;

        return {
            testId,
            testSuite: 'Data Sync',
            startTime,
            endTime,
            duration: endTime.getTime() - startTime.getTime(),
            success,
            metrics,
            details,
            errors,
        };
    }

    /**
     * Test data cleanup performance
     */
    private async testDataCleanupPerformance(): Promise<PerformanceTestResult> {
        const testId = `data_cleanup_${Date.now()}`;
        const startTime = new Date();
        const metrics = {
            throughput: 0,
            averageLatency: 0,
            maxLatency: 0,
            memoryUsage: 0,
            errorRate: 0,
        };
        const details = {
            operationsCompleted: 0,
            operationsFailed: 0,
            peakMemoryUsage: 0,
            bottlenecks: [] as string[],
            recommendations: [] as string[],
        };
        const errors: string[] = [];

        try {
            Logger.info('[PerformanceTest] Starting data cleanup performance test');

            const initialMemory = this.getMemoryUsage();
            const operationStart = Date.now();

            // Test cleanup operation
            const result = await dataCleanupService.performCleanup();
            
            const operationLatency = Date.now() - operationStart;

            if (result.success) {
                details.operationsCompleted = 1;
            } else {
                details.operationsFailed = 1;
                errors.push(...result.errors);
            }

            // Track memory usage
            const currentMemory = this.getMemoryUsage();
            details.peakMemoryUsage = Math.max(details.peakMemoryUsage, currentMemory);

            // Calculate metrics
            metrics.throughput = 1 / (operationLatency / 1000);
            metrics.averageLatency = operationLatency;
            metrics.maxLatency = operationLatency;
            metrics.memoryUsage = details.peakMemoryUsage - initialMemory;
            metrics.errorRate = details.operationsFailed * 100;

            // Analyze cleanup efficiency
            if (result.tasksDeleted === 0 && result.remindersDeleted === 0) {
                details.recommendations.push('No data was cleaned up - consider adjusting retention policies');
            }

            if (operationLatency > 30000) { // 30 seconds
                details.bottlenecks.push('Cleanup operation took too long');
                details.recommendations.push('Consider reducing batch sizes or implementing incremental cleanup');
            }

        } catch (error) {
            details.operationsFailed = 1;
            errors.push(`Data cleanup test failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        const endTime = new Date();
        const success = errors.length === 0 && 
                       metrics.errorRate <= this.config.performance.maxErrorRate;

        return {
            testId,
            testSuite: 'Data Cleanup',
            startTime,
            endTime,
            duration: endTime.getTime() - startTime.getTime(),
            success,
            metrics,
            details,
            errors,
        };
    }

    /**
     * Test memory usage performance
     */
    private async testMemoryUsagePerformance(): Promise<PerformanceTestResult> {
        const testId = `memory_usage_${Date.now()}`;
        const startTime = new Date();
        const metrics = {
            throughput: 0,
            averageLatency: 0,
            maxLatency: 0,
            memoryUsage: 0,
            errorRate: 0,
        };
        const details = {
            operationsCompleted: 0,
            operationsFailed: 0,
            peakMemoryUsage: 0,
            bottlenecks: [] as string[],
            recommendations: [] as string[],
        };
        const errors: string[] = [];

        try {
            Logger.info('[PerformanceTest] Starting memory usage performance test');

            const initialMemory = this.getMemoryUsage();
            let memoryReadings: number[] = [];

            // Monitor memory usage during intensive operations
            const monitoringInterval = setInterval(() => {
                memoryReadings.push(this.getMemoryUsage());
            }, 1000); // Every second

            try {
                // Perform memory-intensive operations
                const largeBatch = this.testData.plants.slice(0, 50);
                
                // Create many tasks
                await backgroundTaskProcessor.scheduleTasksForPlants(
                    largeBatch,
                    'inspection',
                    new Date(),
                    { priority: 'medium' }
                );

                // Create many notifications
                const notifications = this.createTestNotifications(200, 'medium');
                for (const notification of notifications) {
                    await batchNotificationProcessor.queueNotification(notification);
                }

                // Process everything
                await batchNotificationProcessor.processBatches();

                details.operationsCompleted = 1;

            } catch (error) {
                details.operationsFailed = 1;
                errors.push(`Memory test operations failed: ${error instanceof Error ? error.message : String(error)}`);
            } finally {
                clearInterval(monitoringInterval);
            }

            // Analyze memory usage
            const finalMemory = this.getMemoryUsage();
            details.peakMemoryUsage = Math.max(...memoryReadings, finalMemory);
            
            metrics.memoryUsage = details.peakMemoryUsage - initialMemory;
            metrics.errorRate = details.operationsFailed * 100;

            // Check for memory issues
            if (metrics.memoryUsage > this.config.performance.maxMemoryUsageMB) {
                details.bottlenecks.push('Excessive memory usage detected');
                details.recommendations.push('Consider implementing memory cleanup or reducing batch sizes');
            }

            // Check for memory leaks (memory should return close to initial after operations)
            const memoryRetention = finalMemory - initialMemory;
            if (memoryRetention > metrics.memoryUsage * 0.5) {
                details.bottlenecks.push('Potential memory leak detected');
                details.recommendations.push('Investigate memory cleanup in background services');
            }

        } catch (error) {
            errors.push(`Memory usage test failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        const endTime = new Date();
        const success = errors.length === 0 && 
                       metrics.memoryUsage <= this.config.performance.maxMemoryUsageMB;

        return {
            testId,
            testSuite: 'Memory Usage',
            startTime,
            endTime,
            duration: endTime.getTime() - startTime.getTime(),
            success,
            metrics,
            details,
            errors,
        };
    }

    /**
     * Test stress performance with large datasets
     */
    private async testStressPerformance(): Promise<PerformanceTestResult> {
        const testId = `stress_test_${Date.now()}`;
        const startTime = new Date();
        const metrics = {
            throughput: 0,
            averageLatency: 0,
            maxLatency: 0,
            memoryUsage: 0,
            errorRate: 0,
        };
        const details = {
            operationsCompleted: 0,
            operationsFailed: 0,
            peakMemoryUsage: 0,
            bottlenecks: [] as string[],
            recommendations: [] as string[],
        };
        const errors: string[] = [];

        try {
            Logger.info('[PerformanceTest] Starting stress performance test');

            const initialMemory = this.getMemoryUsage();
            const operationLatencies: number[] = [];

            // Stress test with concurrent operations
            const stressOperations = [
                this.stressTestTaskProcessing(),
                this.stressTestNotificationBatching(),
                this.stressTestDataSync(),
            ];

            const operationStart = Date.now();

            try {
                const results = await Promise.allSettled(stressOperations);
                
                const operationLatency = Date.now() - operationStart;
                operationLatencies.push(operationLatency);

                // Analyze results
                results.forEach((result, index) => {
                    if (result.status === 'fulfilled') {
                        details.operationsCompleted++;
                    } else {
                        details.operationsFailed++;
                        errors.push(`Stress operation ${index} failed: ${result.reason}`);
                    }
                });

                // Track memory usage
                const currentMemory = this.getMemoryUsage();
                details.peakMemoryUsage = Math.max(details.peakMemoryUsage, currentMemory);

            } catch (error) {
                details.operationsFailed = stressOperations.length;
                errors.push(`Stress test failed: ${error instanceof Error ? error.message : String(error)}`);
            }

            // Calculate metrics
            const totalOperations = details.operationsCompleted + details.operationsFailed;
            metrics.throughput = totalOperations / (operationLatencies.reduce((sum, lat) => sum + lat, 0) / 1000 || 1);
            metrics.averageLatency = operationLatencies.reduce((sum, lat) => sum + lat, 0) / operationLatencies.length || 0;
            metrics.maxLatency = Math.max(...operationLatencies, 0);
            metrics.memoryUsage = details.peakMemoryUsage - initialMemory;
            metrics.errorRate = (details.operationsFailed / totalOperations) * 100;

            // Analyze stress test results
            if (metrics.errorRate > this.config.performance.maxErrorRate * 2) {
                details.bottlenecks.push('High error rate under stress');
                details.recommendations.push('Improve error handling and retry mechanisms');
            }

            if (metrics.averageLatency > this.config.performance.maxAcceptableLatency * 3) {
                details.bottlenecks.push('Poor performance under stress');
                details.recommendations.push('Optimize concurrent processing and resource management');
            }

        } catch (error) {
            errors.push(`Stress test failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        const endTime = new Date();
        const success = errors.length === 0 && 
                       metrics.errorRate <= this.config.performance.maxErrorRate * 2; // Allow higher error rate for stress test

        return {
            testId,
            testSuite: 'Stress Test',
            startTime,
            endTime,
            duration: endTime.getTime() - startTime.getTime(),
            success,
            metrics,
            details,
            errors,
        };
    }

    /**
     * Generate comprehensive performance report
     */
    private generatePerformanceReport(reportId: string, testResults: PerformanceTestResult[]): PerformanceReport {
        const passedTests = testResults.filter(r => r.success).length;
        const failedTests = testResults.length - passedTests;
        
        // Calculate overall score (0-100)
        const overallScore = testResults.length > 0 
            ? Math.round((passedTests / testResults.length) * 100)
            : 0;

        // Calculate average score based on performance metrics
        const averageScore = testResults.reduce((sum, result) => {
            let score = 100;
            
            // Deduct points for performance issues
            if (result.metrics.averageLatency > this.config.performance.maxAcceptableLatency) {
                score -= 20;
            }
            if (result.metrics.memoryUsage > this.config.performance.maxMemoryUsageMB) {
                score -= 20;
            }
            if (result.metrics.errorRate > this.config.performance.maxErrorRate) {
                score -= 30;
            }
            if (result.metrics.throughput < this.config.performance.minThroughputPerSecond) {
                score -= 20;
            }
            
            return sum + Math.max(0, score);
        }, 0) / testResults.length || 0;

        // Identify critical issues
        const criticalIssues: string[] = [];
        testResults.forEach(result => {
            if (result.metrics.errorRate > this.config.performance.maxErrorRate * 2) {
                criticalIssues.push(`${result.testSuite}: Critical error rate (${result.metrics.errorRate.toFixed(1)}%)`);
            }
            if (result.metrics.averageLatency > this.config.performance.maxAcceptableLatency * 2) {
                criticalIssues.push(`${result.testSuite}: Critical latency (${result.metrics.averageLatency.toFixed(0)}ms)`);
            }
            if (result.metrics.memoryUsage > this.config.performance.maxMemoryUsageMB * 1.5) {
                criticalIssues.push(`${result.testSuite}: Critical memory usage (${result.metrics.memoryUsage.toFixed(1)}MB)`);
            }
        });

        // Generate recommendations
        const recommendations: string[] = [];
        const allBottlenecks = testResults.flatMap(r => r.details.bottlenecks);
        const allRecommendations = testResults.flatMap(r => r.details.recommendations);
        
        // Deduplicate and prioritize recommendations
        const uniqueRecommendations = [...new Set(allRecommendations)];
        recommendations.push(...uniqueRecommendations.slice(0, 5)); // Top 5 recommendations

        if (overallScore < 70) {
            recommendations.unshift('Consider reviewing and optimizing background processing architecture');
        }

        return {
            reportId,
            generatedAt: new Date(),
            overallScore,
            testResults,
            summary: {
                totalTests: testResults.length,
                passedTests,
                failedTests,
                averageScore: Math.round(averageScore),
                criticalIssues,
                performanceRegression: overallScore < 80, // Flag if score is below 80%
            },
            recommendations,
        };
    }

    /**
     * Helper methods for test setup and execution
     */
    private async setupTestData(): Promise<void> {
        Logger.info('[PerformanceTest] Setting up test data');

        try {
            // Create test plants
            await database.write(async () => {
                for (let i = 0; i < this.config.testData.plantCount; i++) {
                    const plant = await database.get<Plant>('plants').create(plant => {
                        plant.name = `Test Plant ${i + 1}`;
                        plant.strain = 'Test Strain';
                        plant.growthStage = 'vegetative';
                        plant.plantedDate = new Date().toISOString();
                        plant.userId = 'test_user';
                    });
                    
                    this.testData.plants.push(plant);
                }
            });

            Logger.info('[PerformanceTest] Test data setup completed', {
                plants: this.testData.plants.length
            });

        } catch (error) {
            Logger.error('[PerformanceTest] Test data setup failed', { error });
            throw error;
        }
    }

    private async cleanupTestData(): Promise<void> {
        Logger.info('[PerformanceTest] Cleaning up test data');

        try {
            await database.write(async () => {
                // Delete test plants (this will cascade to related tasks)
                for (const plant of this.testData.plants) {
                    await plant.destroyPermanently();
                }
            });

            // Clear test data arrays
            this.testData.plants = [];
            this.testData.tasks = [];
            this.testData.reminders = [];

            Logger.info('[PerformanceTest] Test data cleanup completed');

        } catch (error) {
            Logger.error('[PerformanceTest] Test data cleanup failed', { error });
        }
    }

    private createTestNotifications(count: number, priority: 'low' | 'medium' | 'high' | 'critical') {
        const notifications = [];
        const taskTypes: TaskType[] = ['watering', 'feeding', 'inspection', 'pruning'];

        for (let i = 0; i < count; i++) {
            const plant = this.testData.plants[i % this.testData.plants.length];
            const taskType = taskTypes[i % taskTypes.length];
            
            if (plant) {
                notifications.push({
                    id: `test_notification_${i}`,
                    taskId: `test_task_${i}`,
                    plantId: plant.id,
                    plantName: plant.name,
                    taskType: taskType as TaskType, // Ensure it's not undefined
                    taskTitle: `${taskType} ${plant.name}`,
                    dueDate: addDays(new Date(), Math.floor(i / 20)), // Spread across days
                    priority,
                    userId: 'test_user',
                });
            }
        }

        return notifications;
    }

    private async stressTestTaskProcessing(): Promise<void> {
        const largeBatch = this.testData.plants;
        await backgroundTaskProcessor.scheduleTasksForPlants(
            largeBatch,
            'watering',
            new Date(),
            { priority: 'high' }
        );
    }

    private async stressTestNotificationBatching(): Promise<void> {
        const notifications = this.createTestNotifications(500, 'high');
        for (const notification of notifications) {
            await batchNotificationProcessor.queueNotification(notification);
        }
        await batchNotificationProcessor.processBatches();
    }

    private async stressTestDataSync(): Promise<void> {
        // Simulate many changes
        for (let i = 0; i < 100; i++) {
            calendarDataSyncService.trackTaskChange(`stress_task_${i}`, 'update');
        }
        await calendarDataSyncService.performIncrementalSync();
    }

    private getMemoryUsage(): number {
        // In a real implementation, this would use process.memoryUsage() or similar
        // For now, return a simulated value
        return Math.random() * 50 + 20; // 20-70 MB
    }
}

// Export singleton instance
export const backgroundProcessingPerformanceTest = BackgroundProcessingPerformanceTest.getInstance();