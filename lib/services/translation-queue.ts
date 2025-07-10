/**
 * Translation Queue Service
 * 
 * Implements background translation processing to avoid blocking UI.
 * Uses React Native's InteractionManager and priority-based queuing
 * to ensure smooth user experience while processing translations.
 */

import { InteractionManager } from 'react-native';
import { logger } from '../config/production';
import { translationPerformance } from './translation-performance';

// Translation job interface
interface TranslationJob {
  id: string;
  key: string;
  value: string;
  contentType: 'strain_type' | 'strain_effect' | 'strain_flavor' | 'grow_difficulty' | 'description' | 'default';
  priority: JobPriority;
  translateFn: (value: string) => string;
  onComplete?: (result: string) => void;
  onError?: (error: Error) => void;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

// Job priority levels (higher number = higher priority)
export enum JobPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4,
}

// Queue statistics
interface QueueStats {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  activeJobs: number;
  averageProcessingTime: number;
  queueSize: number;
}

// Configuration
interface QueueConfig {
  maxConcurrentJobs: number;
  batchSize: number;
  processingInterval: number;
  maxRetries: number;
  timeoutMs: number;
  enableBatching: boolean;
}

class TranslationQueue {
  private queue: TranslationJob[] = [];
  private activeJobs = new Set<string>();
  private processingInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;
  
  // Statistics
  private stats: QueueStats = {
    totalJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    activeJobs: 0,
    averageProcessingTime: 0,
    queueSize: 0,
  };
  
  private processingTimes: number[] = [];
  
  // Configuration
  private config: QueueConfig = {
    maxConcurrentJobs: 3,        // Limit concurrent jobs to avoid overwhelming
    batchSize: 5,                // Process jobs in batches
    processingInterval: 100,     // Check queue every 100ms
    maxRetries: 2,               // Retry failed jobs twice
    timeoutMs: 5000,            // 5 second timeout per job
    enableBatching: true,        // Enable batch processing
  };

  constructor() {
    this.startProcessing();
  }

  /**
   * Map job content types to TTLConfig keys
   */
  private mapContentTypeToTTLKey(contentType: TranslationJob['contentType']): 'strainTypes' | 'effects' | 'flavors' | 'difficulties' | 'descriptions' | 'default' {
    switch (contentType) {
      case 'strain_type':
        return 'strainTypes';
      case 'strain_effect':
        return 'effects';
      case 'strain_flavor':
        return 'flavors';
      case 'grow_difficulty':
        return 'difficulties';
      case 'description':
        return 'descriptions';
      default:
        return 'default';
    }
  }

  /**
   * Update queue configuration
   */
  updateConfig(newConfig: Partial<QueueConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.restartProcessing();
    logger.log('Translation queue config updated:', this.config);
  }

  /**
   * Add translation job to queue
   */
  addJob(
    key: string,
    value: string,
    translateFn: (value: string) => string,
    options: {
      contentType?: TranslationJob['contentType'];
      priority?: JobPriority;
      onComplete?: (result: string) => void;
      onError?: (error: Error) => void;
      maxRetries?: number;
    } = {}
  ): string {
    const jobId = this.generateJobId();
    const job: TranslationJob = {
      id: jobId,
      key,
      value,
      contentType: options.contentType || 'default',
      priority: options.priority || JobPriority.NORMAL,
      translateFn,
      onComplete: options.onComplete,
      onError: options.onError,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: options.maxRetries || this.config.maxRetries,
    };

    // Insert job in priority order
    this.insertJobByPriority(job);
    this.stats.totalJobs++;
    this.updateQueueStats();

    logger.log('Translation job added to queue:', {
      jobId,
      key,
      priority: job.priority,
      queueSize: this.queue.length,
    });

    return jobId;
  }

  /**
   * Add multiple jobs as a batch
   */
  addBatch(
    jobs: Array<{
      key: string;
      value: string;
      translateFn: (value: string) => string;
      contentType?: TranslationJob['contentType'];
      priority?: JobPriority;
    }>,
    onBatchComplete?: (results: Record<string, string>) => void,
    onBatchError?: (errors: Record<string, Error>) => void
  ): string[] {
    const jobIds: string[] = [];
    const batchResults: Record<string, string> = {};
    const batchErrors: Record<string, Error> = {};
    let completedJobs = 0;

    for (const jobData of jobs) {
      const jobId = this.addJob(
        jobData.key,
        jobData.value,
        jobData.translateFn,
        {
          contentType: jobData.contentType,
          priority: jobData.priority,
          onComplete: (result) => {
            batchResults[jobData.key] = result;
            completedJobs++;
            
            if (completedJobs === jobs.length) {
              onBatchComplete?.(batchResults);
            }
          },
          onError: (error) => {
            batchErrors[jobData.key] = error;
            completedJobs++;
            
            if (completedJobs === jobs.length) {
              if (Object.keys(batchErrors).length > 0) {
                onBatchError?.(batchErrors);
              } else {
                onBatchComplete?.(batchResults);
              }
            }
          },
        }
      );
      jobIds.push(jobId);
    }

    logger.log('Translation batch added to queue:', {
      batchSize: jobs.length,
      jobIds,
    });

    return jobIds;
  }

  /**
   * Remove job from queue
   */
  removeJob(jobId: string): boolean {
    const index = this.queue.findIndex(job => job.id === jobId);
    if (index >= 0) {
      this.queue.splice(index, 1);
      this.updateQueueStats();
      return true;
    }
    return false;
  }

  /**
   * Clear all jobs from queue
   */
  clearQueue(): void {
    this.queue.length = 0;
    this.updateQueueStats();
    logger.log('Translation queue cleared');
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    this.updateQueueStats();
    return { ...this.stats };
  }

  /**
   * Start background processing
   */
  private startProcessing(): void {
    if (this.processingInterval) return;

    this.processingInterval = setInterval(() => {
      if (!this.isProcessing && this.queue.length > 0) {
        this.processJobs();
      }
    }, this.config.processingInterval);

    logger.log('Translation queue processing started');
  }

  /**
   * Stop background processing
   */
  private stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    logger.log('Translation queue processing stopped');
  }

  /**
   * Restart processing with new configuration
   */
  private restartProcessing(): void {
    this.stopProcessing();
    this.startProcessing();
  }

  /**
   * Process queued translation jobs
   */
  private async processJobs(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;

    try {
      // Use InteractionManager to avoid blocking UI
      await new Promise<void>((resolve) => {
        InteractionManager.runAfterInteractions(async () => {
          await this.processBatch();
          resolve();
        });
      });
    } catch (error) {
      logger.error('Error processing translation jobs:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a batch of jobs
   */
  private async processBatch(): Promise<void> {
    const availableSlots = this.config.maxConcurrentJobs - this.activeJobs.size;
    if (availableSlots <= 0) return;

    const batchSize = Math.min(
      this.config.enableBatching ? this.config.batchSize : 1,
      availableSlots,
      this.queue.length
    );

    const jobsToProcess = this.queue.splice(0, batchSize);
    
    for (const job of jobsToProcess) {
      this.processJob(job);
    }

    this.updateQueueStats();
  }

  /**
   * Process individual translation job
   */
  private async processJob(job: TranslationJob): Promise<void> {
    this.activeJobs.add(job.id);
    this.stats.activeJobs = this.activeJobs.size;

    const startTime = Date.now();

    try {
      // Check if already cached
      const cached = translationPerformance.getCacheEntry(job.key);
      if (cached) {
        this.completeJob(job, cached, startTime);
        return;
      }

      // Execute translation with timeout
      const result = await this.executeWithTimeout(
        () => job.translateFn(job.value),
        this.config.timeoutMs
      );

      // Cache the result
      const cacheContentType = this.mapContentTypeToTTLKey(job.contentType);
      translationPerformance.setCacheEntry(job.key, result, cacheContentType);

      this.completeJob(job, result, startTime);

    } catch (error) {
      await this.handleJobError(job, error as Error, startTime);
    }
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => T,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Translation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      try {
        const result = fn();
        clearTimeout(timeout);
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Handle successful job completion
   */
  private completeJob(job: TranslationJob, result: string, startTime: number): void {
    const duration = Date.now() - startTime;
    
    // Update statistics
    this.stats.completedJobs++;
    this.processingTimes.push(duration);
    if (this.processingTimes.length > 50) {
      this.processingTimes = this.processingTimes.slice(-50);
    }
    this.stats.averageProcessingTime = 
      this.processingTimes.reduce((sum, time) => sum + time, 0) / 
      this.processingTimes.length;

    // Track performance
    translationPerformance.trackTranslationTime(duration);

    // Cleanup and notify
    this.activeJobs.delete(job.id);
    this.stats.activeJobs = this.activeJobs.size;
    
    try {
      job.onComplete?.(result);
    } catch (error) {
      logger.warn('Error in job completion callback:', error);
    }

    logger.log('Translation job completed:', {
      jobId: job.id,
      key: job.key,
      duration,
      result: result.substring(0, 50) + (result.length > 50 ? '...' : ''),
    });
  }

  /**
   * Handle job error with retry logic
   */
  private async handleJobError(job: TranslationJob, error: Error, startTime: number): Promise<void> {
    const duration = Date.now() - startTime;
    
    this.activeJobs.delete(job.id);
    this.stats.activeJobs = this.activeJobs.size;

    job.retryCount++;

    if (job.retryCount <= job.maxRetries) {
      // Retry the job with exponential backoff
      const retryDelay = Math.min(1000 * Math.pow(2, job.retryCount - 1), 5000);
      
      setTimeout(() => {
        this.insertJobByPriority(job);
        this.updateQueueStats();
      }, retryDelay);

      logger.log('Translation job will retry:', {
        jobId: job.id,
        retryCount: job.retryCount,
        maxRetries: job.maxRetries,
        retryDelay,
      });
    } else {
      // Job failed permanently
      this.stats.failedJobs++;
      
      try {
        job.onError?.(error);
      } catch (callbackError) {
        logger.warn('Error in job error callback:', callbackError);
      }

      logger.error('Translation job failed permanently:', {
        jobId: job.id,
        key: job.key,
        error: error.message,
        duration,
        retryCount: job.retryCount,
      });
    }
  }

  /**
   * Insert job in queue by priority
   */
  private insertJobByPriority(job: TranslationJob): void {
    let inserted = false;
    
    for (let i = 0; i < this.queue.length; i++) {
      const currentJob = this.queue[i];
      if (currentJob && job.priority > currentJob.priority) {
        this.queue.splice(i, 0, job);
        inserted = true;
        break;
      }
    }
    
    if (!inserted) {
      this.queue.push(job);
    }
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `translation_job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update queue statistics
   */
  private updateQueueStats(): void {
    this.stats.queueSize = this.queue.length;
    
    // Update performance service with queue size
    const metrics = translationPerformance.getMetrics();
    metrics.backgroundQueueSize = this.stats.queueSize;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopProcessing();
    this.clearQueue();
    this.activeJobs.clear();
    logger.log('Translation queue destroyed');
  }
}

// Export singleton instance
export const translationQueue = new TranslationQueue();

// Export types
export type { TranslationJob, QueueStats, QueueConfig }; 