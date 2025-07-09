interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  timeout: number; // Maximum duration for the entire operation in milliseconds
}

interface SyncOperation {
  type: 'pull' | 'push';
  attempt: number;
  startTime: number;
  lastError?: Error;
  timeoutId?: ReturnType<typeof setTimeout>;
}

export interface ConflictResolution {
  action: 'keep_modified' | 'delete_record' | 'no_conflict';
  reason: string;
  record_id: string;
  table: string;
}


// Functional implementation of SyncRetryService using closures
const createSyncRetryService = (initialConfig: Partial<RetryConfig> = {}) => {
  const defaultConfig: RetryConfig = {
    maxRetries: 5,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffMultiplier: 2,
    jitter: true,
    timeout: 300000, // 5 minutes default timeout
  };

  const config: Partial<RetryConfig> = { ...initialConfig };
  const activeOperations = new Map<string, SyncOperation>();

  const calculateDelay = (attempt: number, cfg: RetryConfig): number => {
    let delay = cfg.baseDelay * Math.pow(cfg.backoffMultiplier, attempt - 1);
    delay = Math.min(delay, cfg.maxDelay);
    if (cfg.jitter) {
      const jitterRange = delay * 0.1;
      delay += (Math.random() - 0.5) * 2 * jitterRange;
    }
    return Math.round(delay);
  };

  const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

  const attemptOperation = async <T>(
    operationId: string,
    operation: () => Promise<T>,
    cfg: RetryConfig
  ): Promise<T> => {
    const syncOp = activeOperations.get(operationId)!;
    while (syncOp.attempt < cfg.maxRetries) {
      try {
        const result = await operation();
        if (syncOp.attempt > 0) {
          console.warn(`Sync operation ${operationId} succeeded after ${syncOp.attempt} retries`);
        }
        return result;
      } catch (error) {
        syncOp.attempt++;
        syncOp.lastError = error as Error;
        if (syncOp.attempt >= cfg.maxRetries) {
          console.error(`Sync operation ${operationId} failed after ${cfg.maxRetries} retries:`, error);
          throw error;
        }
        const delay = calculateDelay(syncOp.attempt, cfg);
        console.warn(`Sync operation ${operationId} failed (attempt ${syncOp.attempt}/${cfg.maxRetries}), retrying in ${delay}ms:`, error);
        await sleep(delay);
      }
    }
    throw (activeOperations.get(operationId)?.lastError) || new Error('Unknown sync error');
  };

  async function executeWithRetry<T>(
    operationId: string,
    operation: () => Promise<T>,
    operationType: 'pull' | 'push',
    overrideConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const finalConfig = { ...defaultConfig, ...config, ...overrideConfig };
    const syncOp: SyncOperation = {
      type: operationType,
      attempt: 0,
      startTime: Date.now(),
    };
    activeOperations.set(operationId, syncOp);
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Operation ${operationId} timed out after ${finalConfig.timeout}ms`));
        }, finalConfig.timeout);
        syncOp.timeoutId = timeoutId as ReturnType<typeof setTimeout>;
      });
      const operationPromise = attemptOperation(operationId, operation, finalConfig);
      const result = await Promise.race([operationPromise, timeoutPromise]);
      if (syncOp.timeoutId !== undefined) {
        clearTimeout(syncOp.timeoutId);
      }
      return result;
    } finally {
      if (syncOp.timeoutId !== undefined) {
        clearTimeout(syncOp.timeoutId);
      }
      activeOperations.delete(operationId);
    }
  }

  function processConflictResolutions(resolutions: ConflictResolution[]) {
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
          break;
        default:
          conflicts.push(resolution);
      }
    }
    return { kept, deleted, conflicts };
  }

  function getActiveOperations(): Record<string, SyncOperation> {
    return Object.fromEntries(activeOperations.entries());
  }

  function isOperationActive(operationId: string): boolean {
    return activeOperations.has(operationId);
  }

  function cancelOperation(operationId: string): boolean {
    return activeOperations.delete(operationId);
  }

  function getRetryStats() {
    const stats = {
      activeOperations: activeOperations.size,
      operationDetails: {} as Record<string, {
        type: string;
        attempts: number;
        duration: number;
        lastError?: string;
      }>,
    };
    for (const [id, op] of activeOperations.entries()) {
      stats.operationDetails[id] = {
        type: op.type,
        attempts: op.attempt,
        duration: Date.now() - op.startTime,
        lastError: op.lastError?.message,
      };
    }
    return stats;
  }

  return {
    executeWithRetry,
    processConflictResolutions,
    getActiveOperations,
    isOperationActive,
    cancelOperation,
    getRetryStats,
  };
};

// Singleton instance for global use (API compatible)
export const syncRetryService = createSyncRetryService();