interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

interface SyncOperation {
  type: 'pull' | 'push';
  attempt: number;
  startTime: number;
  lastError?: Error;
}

export interface ConflictResolution {
  action: 'keep_modified' | 'delete_record' | 'no_conflict';
  reason: string;
  record_id: string;
  table: string;
}

export class SyncRetryService {
  private defaultConfig: RetryConfig = {
    maxRetries: 5,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffMultiplier: 2,
    jitter: true,
  };

  private activeOperations = new Map<string, SyncOperation>();

  constructor(private config: Partial<RetryConfig> = {}) {
    this.config = { ...this.defaultConfig, ...this.config };
  }

  /**
   * Execute a sync operation with exponential backoff retry logic
   */
  async executeWithRetry<T>(
    operationId: string,
    operation: () => Promise<T>,
    operationType: 'pull' | 'push',
    config?: Partial<RetryConfig>
  ): Promise<T> {
    const finalConfig = { ...this.defaultConfig, ...this.config, ...config };
    
    const syncOp: SyncOperation = {
      type: operationType,
      attempt: 0,
      startTime: Date.now(),
    };

    this.activeOperations.set(operationId, syncOp);

    try {
      return await this.attemptOperation(operationId, operation, finalConfig);
    } finally {
      this.activeOperations.delete(operationId);
    }
  }

  private async attemptOperation<T>(
    operationId: string,
    operation: () => Promise<T>,
    config: RetryConfig
  ): Promise<T> {
    const syncOp = this.activeOperations.get(operationId)!;

    while (syncOp.attempt < config.maxRetries) {
      try {
        const result = await operation();
        
        // Log successful operation after retries
        if (syncOp.attempt > 0) {
          console.log(`Sync operation ${operationId} succeeded after ${syncOp.attempt} retries`);
        }
        
        return result;
      } catch (error) {
        syncOp.attempt++;
        syncOp.lastError = error as Error;

        // If we've exceeded max retries, throw the last error
        if (syncOp.attempt >= config.maxRetries) {
          console.error(`Sync operation ${operationId} failed after ${config.maxRetries} retries:`, error);
          throw error;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(syncOp.attempt, config);
        
        console.warn(`Sync operation ${operationId} failed (attempt ${syncOp.attempt}/${config.maxRetries}), retrying in ${delay}ms:`, error);

        // Wait before next attempt
        await this.sleep(delay);
      }
    }

    throw syncOp.lastError || new Error('Unknown sync error');
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    // Calculate exponential backoff delay
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    
    // Apply maximum delay limit
    delay = Math.min(delay, config.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (config.jitter) {
      const jitterRange = delay * 0.1; // 10% jitter
      delay += (Math.random() - 0.5) * 2 * jitterRange;
    }
    
    return Math.round(delay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Process conflict resolutions returned from sync operations
   */
  processConflictResolutions(resolutions: ConflictResolution[]): {
    kept: ConflictResolution[];
    deleted: ConflictResolution[];
    conflicts: ConflictResolution[];
  } {
    const kept: ConflictResolution[] = [];
    const deleted: ConflictResolution[] = [];
    const conflicts: ConflictResolution[] = [];

    for (const resolution of resolutions) {
      switch (resolution.action) {
        case 'keep_modified':
          kept.push(resolution);
          break;
        case 'delete_record':
          deleted.push(resolution);
          break;
        case 'no_conflict':
          // No action needed
          break;
        default:
          conflicts.push(resolution);
      }
    }

    return { kept, deleted, conflicts };
  }

  /**
   * Get status of currently active sync operations
   */
  getActiveOperations(): Record<string, SyncOperation> {
    return Object.fromEntries(this.activeOperations.entries());
  }

  /**
   * Check if a specific operation is currently running
   */
  isOperationActive(operationId: string): boolean {
    return this.activeOperations.has(operationId);
  }

  /**
   * Cancel an active operation (note: this only removes it from tracking, 
   * the actual operation might still complete)
   */
  cancelOperation(operationId: string): boolean {
    return this.activeOperations.delete(operationId);
  }

  /**
   * Get retry statistics for monitoring
   */
  getRetryStats(): {
    activeOperations: number;
    operationDetails: Record<string, {
      type: string;
      attempts: number;
      duration: number;
      lastError?: string;
    }>;
  } {
    const stats = {
      activeOperations: this.activeOperations.size,
      operationDetails: {} as Record<string, {
        type: string;
        attempts: number;
        duration: number;
        lastError?: string;
      }>,
    };

    for (const [id, op] of this.activeOperations.entries()) {
      stats.operationDetails[id] = {
        type: op.type,
        attempts: op.attempt,
        duration: Date.now() - op.startTime,
        lastError: op.lastError?.message,
      };
    }

    return stats;
  }
}

// Singleton instance for global use
export const syncRetryService = new SyncRetryService(); 