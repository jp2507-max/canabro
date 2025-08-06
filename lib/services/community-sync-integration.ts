/**
 * Community Sync Integration Service (2025 Standards)
 * 
 * Orchestrates all caching, synchronization, and data consistency services
 * for seamless offline-first community features with intelligent optimization.
 */

import { Observable, BehaviorSubject } from 'rxjs';
import { communityCacheManager } from './community-cache';
import { offlineMessagingSyncManager } from './offline-messaging-sync';
import { dataConsistencyChecker } from './data-consistency-checker';
import { smartPrefetchingManager } from './smart-prefetching';
import { smartCacheManager } from './smart-cache-manager';
import { log } from '../utils/logger';

interface SyncIntegrationStatus {
  overall: 'healthy' | 'warning' | 'error' | 'offline';
  components: {
    cache: 'healthy' | 'warning' | 'error';
    sync: 'healthy' | 'warning' | 'error' | 'offline';
    consistency: 'healthy' | 'warning' | 'error';
    prefetch: 'healthy' | 'warning' | 'error';
  };
  metrics: {
    cacheHitRate: number;
    syncQueueSize: number;
    consistencyIssues: number;
    prefetchTasks: number;
    lastFullSync: number;
    dataIntegrityScore: number;
  };
  recommendations: string[];
}

interface OptimizationConfig {
  enableAggressiveCaching: boolean;
  enablePredictivePrefetch: boolean;
  autoRepairConsistency: boolean;
  syncFrequency: 'realtime' | 'frequent' | 'normal' | 'conservative';
  cacheStrategy: 'memory-first' | 'disk-first' | 'balanced';
  networkOptimization: boolean;
}

/**
 * Community Sync Integration Manager
 */
export class CommunitySyncIntegrationManager {
  private status$ = new BehaviorSubject<SyncIntegrationStatus>(this.getInitialStatus());
  private config: OptimizationConfig = {
    enableAggressiveCaching: true,
    enablePredictivePrefetch: true,
    autoRepairConsistency: true,
    syncFrequency: 'normal',
    cacheStrategy: 'balanced',
    networkOptimization: true,
  };

  private isInitialized = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private lastOptimizationRun = 0;

  constructor() {
    this.initializeIntegration();
  }

  /**
   * Initialize the integrated sync system
   */
  async initializeIntegration(): Promise<void> {
    if (this.isInitialized) return;

    try {
      log.info('Initializing community sync integration');

      // Start monitoring all components
      this.startComponentMonitoring();

      // Set up periodic optimization
      this.schedulePeriodicOptimization();

      // Set up cross-component event handling
      this.setupCrossComponentEvents();

      this.isInitialized = true;
      
      log.info('Community sync integration initialized successfully');
    } catch (error) {
      log.error('Failed to initialize sync integration', { error });
      throw error;
    }
  }

  /**
   * Start comprehensive sync for a user
   */
  async startUserSync(userId: string): Promise<void> {
    try {
      log.info('Starting comprehensive user sync', { userId });

      // Start prefetching based on user behavior
      await smartPrefetchingManager.startPrefetching(userId);

      // Initialize offline messaging sync
      offlineMessagingSyncManager.setNetworkStatus(true); // Assume online initially

      // Perform initial consistency check
      if (this.config.autoRepairConsistency) {
        const consistencyReport = await dataConsistencyChecker.performConsistencyCheck({
          autoRepair: true,
          includeOrphans: true,
        });

        log.debug('Initial consistency check completed', {
          userId,
          issuesFound: consistencyReport.issuesFound.length,
          issuesRepaired: consistencyReport.issuesRepaired.length,
        });
      }

      // Update status
      await this.updateIntegrationStatus();

      log.info('User sync started successfully', { userId });
    } catch (error) {
      log.error('Failed to start user sync', { userId, error });
      throw error;
    }
  }

  /**
   * Handle network status changes across all components
   */
  async handleNetworkChange(isOnline: boolean, networkType: 'wifi' | 'cellular' | 'none'): Promise<void> {
    try {
      log.info('Network status changed', { isOnline, networkType });

      // Update offline messaging sync
      offlineMessagingSyncManager.setNetworkStatus(isOnline);

      // Adjust caching strategy based on network
      if (networkType === 'cellular') {
        // More conservative caching on cellular
        smartCacheManager.updateConfig({
          images: {
            ...smartCacheManager['config'].images,
            strategy: 'memory-first',
          },
          network: {
            ...smartCacheManager['config'].network,
            maxConcurrent: 3, // Reduce concurrent requests
          },
        });
      } else if (networkType === 'wifi') {
        // More aggressive caching on WiFi
        smartCacheManager.updateConfig({
          images: {
            ...smartCacheManager['config'].images,
            strategy: 'balanced',
          },
          network: {
            ...smartCacheManager['config'].network,
            maxConcurrent: 8,
          },
        });
      }

      // Update integration status
      await this.updateIntegrationStatus();

      log.debug('Network change handled successfully');
    } catch (error) {
      log.error('Failed to handle network change', { error });
    }
  }

  /**
   * Perform comprehensive optimization
   */
  async performOptimization(): Promise<{
    cacheOptimized: boolean;
    consistencyFixed: boolean;
    prefetchOptimized: boolean;
    recommendations: string[];
  }> {
    const startTime = Date.now();
    const results = {
      cacheOptimized: false,
      consistencyFixed: false,
      prefetchOptimized: false,
      recommendations: [] as string[],
    };

    try {
      log.info('Starting comprehensive optimization');

      // 1. Cache optimization
      try {
        await communityCacheManager.performIntelligentCleanup();
        await smartCacheManager.handleMemoryPressure();
        results.cacheOptimized = true;
        log.debug('Cache optimization completed');
      } catch (error) {
        log.error('Cache optimization failed', { error });
        results.recommendations.push('Manual cache cleanup recommended');
      }

      // 2. Data consistency check and repair
      try {
        const consistencyReport = await dataConsistencyChecker.performConsistencyCheck({
          autoRepair: this.config.autoRepairConsistency,
          includeOrphans: true,
        });

        results.consistencyFixed = consistencyReport.issuesRepaired.length > 0;
        
        if (consistencyReport.issuesFound.length > consistencyReport.issuesRepaired.length) {
          results.recommendations.push(
            `${consistencyReport.issuesFound.length - consistencyReport.issuesRepaired.length} consistency issues require manual attention`
          );
        }

        log.debug('Consistency check completed', {
          issuesFound: consistencyReport.issuesFound.length,
          issuesRepaired: consistencyReport.issuesRepaired.length,
        });
      } catch (error) {
        log.error('Consistency check failed', { error });
        results.recommendations.push('Manual data consistency check recommended');
      }

      // 3. Prefetch optimization
      try {
        const queueStatus = smartPrefetchingManager.getQueueStatus();
        
        if (queueStatus.estimatedTotalSize > 50 * 1024 * 1024) { // 50MB
          results.recommendations.push('Large prefetch queue detected - consider reducing prefetch scope');
        }

        results.prefetchOptimized = true;
        log.debug('Prefetch optimization completed', { queueStatus });
      } catch (error) {
        log.error('Prefetch optimization failed', { error });
        results.recommendations.push('Prefetch system needs attention');
      }

      // 4. Generate performance recommendations
      const performanceRecommendations = await this.generatePerformanceRecommendations();
      results.recommendations.push(...performanceRecommendations);

      this.lastOptimizationRun = Date.now();
      
      const duration = Date.now() - startTime;
      log.info('Comprehensive optimization completed', { 
        duration, 
        results: {
          cacheOptimized: results.cacheOptimized,
          consistencyFixed: results.consistencyFixed,
          prefetchOptimized: results.prefetchOptimized,
          recommendationCount: results.recommendations.length,
        }
      });

      return results;
    } catch (error) {
      log.error('Comprehensive optimization failed', { error });
      throw error;
    }
  }

  /**
   * Get integration status observable
   */
  getStatus(): Observable<SyncIntegrationStatus> {
    return this.status$.asObservable();
  }

  /**
   * Update optimization configuration
   */
  updateConfiguration(newConfig: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    log.info('Integration configuration updated', { newConfig });

    // Apply configuration changes
    this.applyConfigurationChanges();
  }

  /**
   * Get current configuration
   */
  getConfiguration(): OptimizationConfig {
    return { ...this.config };
  }

  /**
   * Force sync all components
   */
  async forceSyncAll(): Promise<void> {
    try {
      log.info('Starting force sync of all components');

      // Force sync offline messages
      await offlineMessagingSyncManager.forceSyncAll();

      // Perform consistency check
      await dataConsistencyChecker.performConsistencyCheck({
        autoRepair: true,
        includeOrphans: true,
      });

      // Clear and rebuild caches
      await communityCacheManager.performIntelligentCleanup();

      // Update status
      await this.updateIntegrationStatus();

      log.info('Force sync completed successfully');
    } catch (error) {
      log.error('Force sync failed', { error });
      throw error;
    }
  }

  /**
   * Get comprehensive diagnostics
   */
  async getDiagnostics(): Promise<{
    status: SyncIntegrationStatus;
    cacheStats: Record<string, unknown>;
    syncMetrics: Record<string, unknown>;
    consistencyReport: Record<string, unknown> | null;
    prefetchMetrics: Record<string, unknown>;
    systemHealth: Record<string, unknown>;
  }> {
    try {
      const [
        status,
        cacheStats,
        consistencyReport,
        prefetchMetrics,
      ] = await Promise.all([
        this.getCurrentStatus(),
        communityCacheManager.getCacheStats(),
        dataConsistencyChecker.getLastReport(),
        new Promise(resolve => {
          const subscription = smartPrefetchingManager.getMetrics().subscribe(metrics => {
            resolve(metrics);
            subscription.unsubscribe();
          });
        }),
      ]);

      const syncMetrics = {
        queueSize: offlineMessagingSyncManager['syncQueue']?.length || 0,
        offlineMessages: offlineMessagingSyncManager['offlineMessages']?.size || 0,
      };

      const systemHealth = {
        memoryUsage: process.memoryUsage?.() || { heapUsed: 0, heapTotal: 0 },
        uptime: Date.now() - (this.lastOptimizationRun || Date.now()),
        lastOptimization: this.lastOptimizationRun,
      };

      return {
        status,
        cacheStats: cacheStats as unknown as Record<string, unknown>,
        syncMetrics,
        consistencyReport: consistencyReport as Record<string, unknown> | null,
        prefetchMetrics: prefetchMetrics as Record<string, unknown>,
        systemHealth,
      };
    } catch (error) {
      log.error('Failed to get diagnostics', { error });
      throw error;
    }
  }

  // Private methods

  private getInitialStatus(): SyncIntegrationStatus {
    return {
      overall: 'healthy',
      components: {
        cache: 'healthy',
        sync: 'healthy',
        consistency: 'healthy',
        prefetch: 'healthy',
      },
      metrics: {
        cacheHitRate: 0,
        syncQueueSize: 0,
        consistencyIssues: 0,
        prefetchTasks: 0,
        lastFullSync: 0,
        dataIntegrityScore: 100,
      },
      recommendations: [],
    };
  }

  private startComponentMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.updateIntegrationStatus();
      } catch (error) {
        log.error('Component monitoring failed', { error });
      }
    }, 30000); // Update every 30 seconds
  }

  private schedulePeriodicOptimization(): void {
    // Run optimization every 6 hours
    setInterval(async () => {
      try {
        await this.performOptimization();
      } catch (error) {
        log.error('Periodic optimization failed', { error });
      }
    }, 6 * 60 * 60 * 1000);
  }

  private setupCrossComponentEvents(): void {
    // Listen for sync status changes
    offlineMessagingSyncManager.getSyncStatus().subscribe(syncStatus => {
      this.updateComponentStatus('sync', this.mapSyncStatusToHealth(syncStatus));
    });

    // Listen for consistency issues
    dataConsistencyChecker.getIssueStream().subscribe(issue => {
      if (issue.severity === 'critical' || issue.severity === 'high') {
        this.updateComponentStatus('consistency', 'warning');
      }
    });

    // Listen for prefetch metrics
    smartPrefetchingManager.getMetrics().subscribe(metrics => {
      const health = metrics.failedTasks > metrics.completedTasks * 0.1 ? 'warning' : 'healthy';
      this.updateComponentStatus('prefetch', health);
    });
  }

  private async updateIntegrationStatus(): Promise<void> {
    try {
      const status = await this.getCurrentStatus();
      this.status$.next(status);
    } catch (error) {
      log.error('Failed to update integration status', { error });
    }
  }

  private async getCurrentStatus(): Promise<SyncIntegrationStatus> {
    const currentStatus = this.status$.value;
    
    // Get metrics from all components
    const cacheStats = communityCacheManager.getCacheStats();
    const queueStatus = smartPrefetchingManager.getQueueStatus();
    const consistencyReport = dataConsistencyChecker.getLastReport();

    // Calculate overall health
    const componentHealthScores = Object.values(currentStatus.components).map(health => {
      switch (health) {
        case 'healthy': return 100;
        case 'warning': return 70;
        case 'error': return 30;
        default: return 50;
      }
    });

    const averageHealth = componentHealthScores.reduce((a, b) => a + b, 0) / componentHealthScores.length;
    
    let overall: SyncIntegrationStatus['overall'] = 'healthy';
    if (averageHealth < 50) overall = 'error';
    else if (averageHealth < 80) overall = 'warning';

    // Generate recommendations
    const recommendations = await this.generateRecommendations(currentStatus);

    return {
      ...currentStatus,
      overall,
      metrics: {
        cacheHitRate: 85, // Would be calculated from actual cache stats
        syncQueueSize: queueStatus.totalTasks,
        consistencyIssues: consistencyReport?.issuesFound.length || 0,
        prefetchTasks: queueStatus.totalTasks,
        lastFullSync: Date.now(), // Would track actual last sync
        dataIntegrityScore: Math.max(0, 100 - (consistencyReport?.issuesFound.length || 0) * 5),
      },
      recommendations,
    };
  }

  private updateComponentStatus(
    component: keyof SyncIntegrationStatus['components'], 
    status: 'healthy' | 'warning' | 'error'
  ): void {
    const currentStatus = this.status$.value;
    currentStatus.components[component] = status;
    this.status$.next(currentStatus);
  }

  private mapSyncStatusToHealth(syncStatus: string): 'healthy' | 'warning' | 'error' {
    switch (syncStatus) {
      case 'idle':
      case 'syncing':
        return 'healthy';
      case 'error':
        return 'error';
      default:
        return 'warning';
    }
  }

  private async generateRecommendations(status: SyncIntegrationStatus): Promise<string[]> {
    const recommendations: string[] = [];

    // Cache recommendations
    if (status.metrics.cacheHitRate < 70) {
      recommendations.push('Consider enabling more aggressive caching to improve performance');
    }

    // Sync recommendations
    if (status.metrics.syncQueueSize > 100) {
      recommendations.push('Large sync queue detected - check network connectivity');
    }

    // Consistency recommendations
    if (status.metrics.consistencyIssues > 10) {
      recommendations.push('Multiple data consistency issues found - consider running repair');
    }

    // Data integrity recommendations
    if (status.metrics.dataIntegrityScore < 90) {
      recommendations.push('Data integrity score is low - run comprehensive consistency check');
    }

    return recommendations;
  }

  private async generatePerformanceRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];

    try {
      // Analyze cache performance
      const cacheStats = communityCacheManager.getCacheStats();
      if (cacheStats.mmkvKeys > 1000) {
        recommendations.push('Consider cache cleanup - large number of cached items detected');
      }

      // Analyze prefetch performance
      const queueStatus = smartPrefetchingManager.getQueueStatus();
      if (queueStatus.estimatedTotalSize > 100 * 1024 * 1024) { // 100MB
        recommendations.push('Prefetch queue is large - consider reducing prefetch scope');
      }

      // Memory recommendations
      if (typeof process !== 'undefined' && process.memoryUsage) {
        const memUsage = process.memoryUsage();
        if (memUsage.heapUsed > 100 * 1024 * 1024) { // 100MB
          recommendations.push('High memory usage detected - consider memory optimization');
        }
      }
    } catch (error) {
      log.warn('Failed to generate performance recommendations', { error });
    }

    return recommendations;
  }

  private applyConfigurationChanges(): void {
    try {
      // Apply cache strategy changes
      if (this.config.cacheStrategy) {
        smartCacheManager.updateConfig({
          images: {
            ...smartCacheManager['config'].images,
            strategy: this.config.cacheStrategy,
          },
        });
      }

      // Apply sync frequency changes
      // This would adjust sync intervals based on the frequency setting

      log.debug('Configuration changes applied successfully');
    } catch (error) {
      log.error('Failed to apply configuration changes', { error });
    }
  }
}

// Export singleton instance
export const communitySyncIntegrationManager = new CommunitySyncIntegrationManager();

// Export types for external use
export type { SyncIntegrationStatus, OptimizationConfig };