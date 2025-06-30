/**
 * Health monitoring and metrics for sync service
 */

import SyncLogger from '@nozbe/watermelondb/sync/SyncLogger';

import { SyncHealthMetrics } from './types';

// Track sync metrics for health monitoring
const syncHealthMetrics: SyncHealthMetrics = {
  lastSuccessfulSync: 0,
  consecutiveFailures: 0,
  averageSyncDuration: 0,
  slowestOperation: '',
  successRate: 1.0,
  totalSyncs: 0,
  totalSuccessful: 0,
};

// Create a sync logger
const logger = new SyncLogger(50); // Keep 50 logs for better debugging

/**
 * Get current sync health metrics
 *
 * @returns Current sync health metrics
 */
export function getSyncHealth(): SyncHealthMetrics {
  return { ...syncHealthMetrics };
}

/**
 * Get the sync logger
 */
export function getSyncLogger(): SyncLogger {
  return logger;
}

/**
 * Update sync health metrics after a sync attempt
 *
 * @param success Whether the sync was successful
 * @param duration Duration of the sync in milliseconds
 * @param operation Optional name of slow operation to track
 */
export function updateSyncMetrics(success: boolean, duration: number, operation?: string): void {
  // Update sync attempt counter
  syncHealthMetrics.totalSyncs++;

  if (success) {
    // Update success metrics
    syncHealthMetrics.lastSuccessfulSync = Date.now();
    syncHealthMetrics.consecutiveFailures = 0;
    syncHealthMetrics.totalSuccessful++;

    // Update success rate
    syncHealthMetrics.successRate =
      syncHealthMetrics.totalSuccessful / syncHealthMetrics.totalSyncs;

    // Update average duration with exponential moving average
    const alpha = 0.3; // Weight for new value (30%)
    if (syncHealthMetrics.averageSyncDuration === 0) {
      syncHealthMetrics.averageSyncDuration = duration;
    } else {
      syncHealthMetrics.averageSyncDuration =
        (1 - alpha) * syncHealthMetrics.averageSyncDuration + alpha * duration;
    }
  } else {
    // Update failure metrics
    syncHealthMetrics.consecutiveFailures++;
    syncHealthMetrics.successRate =
      syncHealthMetrics.totalSuccessful / syncHealthMetrics.totalSyncs;
  }

  // Track slow operations
  if (operation && duration > 5000) {
    syncHealthMetrics.slowestOperation = `${operation} (${duration}ms)`;
  }
}

/**
 * Add a function to export logs for debugging/support
 */
export function getLastSyncLogs(): any[] {
  return logger.logs;
}

/**
 * Add a helper to format logs for display
 */
export function formatSyncLog(log: any): string {
  if (!log) return 'No sync log available';

  const startTime = new Date(log.startedAt).toLocaleTimeString();
  const endTime = log.finishedAt ? new Date(log.finishedAt).toLocaleTimeString() : 'unfinished';
  const duration = log.finishedAt
    ? ((log.finishedAt - log.startedAt) / 1000).toFixed(2) + 's'
    : 'ongoing';

  let result = `Sync ${log.success ? 'succeeded' : 'failed'} (${startTime} - ${endTime}, ${duration})`;

  if (log.error) {
    result += `\nError: ${log.error}`;
  }

  return result;
}

/**
 * Helper function to calculate the total number of changes in a sync result
 */
export function calculateChangeCount(changes: Record<string, any>): number {
  return Object.values(changes).reduce(
    (sum: number, table: any) =>
      sum +
      (table.created?.length || 0) +
      (table.updated?.length || 0) +
      (table.deleted?.length || 0),
    0
  );
}

/**
 * Persists sync metadata to localStorage for fault tolerance
 */
export async function persistSyncMetadata(database: any, syncLog: any): Promise<void> {
  try {
    // Import needed constants
    const { SYNC_METADATA_KEYS } = await import('./types');

    // Store last successful sync timestamp
    await database.localStorage.set(SYNC_METADATA_KEYS.LAST_SYNC_TIMESTAMP, Date.now().toString());

    // Store sync summary
    const syncSummary = {
      timestamp: Date.now(),
      success: syncLog.success,
      pullCount: calculateChangeCount(syncLog.pulled || {}),
      pushCount: calculateChangeCount(syncLog.pushed || {}),
    };

    await database.localStorage.set(
      SYNC_METADATA_KEYS.LAST_SYNC_SUMMARY,
      JSON.stringify(syncSummary)
    );

    // Store limited error information if applicable
    if (!syncLog.success && syncLog.error) {
      const errorInfo = {
        message: syncLog.error.message || String(syncLog.error),
        time: Date.now(),
      };

      await database.localStorage.set(
        SYNC_METADATA_KEYS.LAST_SYNC_ERROR,
        JSON.stringify(errorInfo)
      );
    } else {
      // Clear any previous error on success
      await database.localStorage.remove(SYNC_METADATA_KEYS.LAST_SYNC_ERROR);
    }

    console.log('[Sync Service] Sync metadata persisted successfully');
  } catch (error) {
    console.error('[Sync Service] Failed to persist sync metadata:', error);
  }
}

/**
 * Loads persisted sync metadata from localStorage at startup
 */
export async function loadSyncMetadata(database: any): Promise<{
  lastSyncTime: number;
  lastSyncSummary?: Record<string, any>;
  lastSyncError?: Record<string, any>;
}> {
  try {
    // Import needed constants
    const { SYNC_METADATA_KEYS } = await import('./types');

    // Load last sync timestamp
    const lastSyncTimestamp = await database.localStorage.get(
      SYNC_METADATA_KEYS.LAST_SYNC_TIMESTAMP
    );
    let lastSyncTime = 0;

    if (lastSyncTimestamp && typeof lastSyncTimestamp === 'string') {
      const parsedTime = parseInt(lastSyncTimestamp, 10);
      if (!isNaN(parsedTime)) {
        lastSyncTime = parsedTime;
      }
    }

    // Load last sync summary
    let lastSyncSummary: Record<string, any> | undefined;
    const syncSummaryStr = await database.localStorage.get(SYNC_METADATA_KEYS.LAST_SYNC_SUMMARY);
    if (syncSummaryStr && typeof syncSummaryStr === 'string') {
      try {
        lastSyncSummary = JSON.parse(syncSummaryStr);
      } catch (parseError) {
        console.warn('[Sync Service] Failed to parse sync summary:', parseError);
      }
    }

    // Load last sync error
    let lastSyncError: Record<string, any> | undefined;
    const syncErrorStr = await database.localStorage.get(SYNC_METADATA_KEYS.LAST_SYNC_ERROR);
    if (syncErrorStr && typeof syncErrorStr === 'string') {
      try {
        lastSyncError = JSON.parse(syncErrorStr);
      } catch (parseError) {
        console.warn('[Sync Service] Failed to parse sync error:', parseError);
      }
    }

    console.log('[Sync Service] Sync metadata loaded successfully', { lastSyncTime });

    return {
      lastSyncTime,
      lastSyncSummary,
      lastSyncError,
    };
  } catch (error) {
    console.error('[Sync Service] Failed to load sync metadata:', error);
    return { lastSyncTime: 0 };
  }
}
