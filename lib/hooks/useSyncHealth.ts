import { useCallback, useEffect, useState } from 'react';

import { getSyncHealth, SyncHealthMetrics } from '../services/sync-service';

export interface SyncHealthStatus {
  /** Last successful sync timestamp (ms) */
  lastSuccessfulSync: number;

  /** How many consecutive failures occurred */
  consecutiveFailures: number;

  /** Average sync duration in ms */
  averageSyncDuration: number;

  /** Slowest operation during sync */
  slowestOperation: string;

  /** Success rate (0.0-1.0) */
  successRate: number;

  /** Total sync operations */
  totalSyncs: number;

  /** Total successful syncs */
  totalSuccessful: number;

  /** Human readable status text */
  statusText: string;

  /** Sync health status */
  status: 'healthy' | 'warning' | 'error';

  /** Time elapsed since last successful sync in seconds */
  elapsedSinceLastSync: number;

  /** Whether sync should be recommended to the user */
  shouldRecommendSync: boolean;
}

/**
 * Hook to provide sync health metrics and status for display in UI
 *
 * @param refreshInterval Interval in ms to refresh status (default: 30 sec)
 * @returns Sync health status and refresh function
 */
export function useSyncHealth(refreshInterval = 30000): {
  health: SyncHealthStatus;
  refresh: () => void;
} {
  const [health, setHealth] = useState<SyncHealthStatus>({
    lastSuccessfulSync: 0,
    consecutiveFailures: 0,
    averageSyncDuration: 0,
    slowestOperation: '',
    successRate: 1.0,
    totalSyncs: 0,
    totalSuccessful: 0,
    statusText: 'Loading...',
    status: 'healthy',
    elapsedSinceLastSync: 0,
    shouldRecommendSync: false,
  });

  // Function to process raw metrics into a user-friendly status
  const processMetrics = useCallback((metrics: SyncHealthMetrics): SyncHealthStatus => {
    const now = Date.now();
    const elapsedMs = metrics.lastSuccessfulSync > 0 ? now - metrics.lastSuccessfulSync : 0;
    const elapsedSec = Math.floor(elapsedMs / 1000);
    const elapsedMin = Math.floor(elapsedSec / 60);
    const elapsedHours = Math.floor(elapsedMin / 60);

    // Determine sync health status
    let status: 'healthy' | 'warning' | 'error' = 'healthy';
    let statusText = '';
    let shouldRecommendSync = false;

    if (metrics.consecutiveFailures > 3) {
      status = 'error';
      statusText = `Sync failed ${metrics.consecutiveFailures} times`;
      shouldRecommendSync = true;
    } else if (metrics.consecutiveFailures > 0) {
      status = 'warning';
      statusText = `Sync failed ${metrics.consecutiveFailures} time${metrics.consecutiveFailures > 1 ? 's' : ''}`;
      shouldRecommendSync = metrics.consecutiveFailures > 1;
    } else if (elapsedHours > 24) {
      status = 'warning';
      statusText = `Last sync was over ${elapsedHours} hours ago`;
      shouldRecommendSync = true;
    } else if (elapsedHours > 0) {
      statusText = `Last synced ${elapsedHours} hour${elapsedHours > 1 ? 's' : ''} ago`;
    } else if (elapsedMin > 0) {
      statusText = `Last synced ${elapsedMin} minute${elapsedMin > 1 ? 's' : ''} ago`;
    } else if (elapsedSec > 0) {
      statusText = `Last synced ${elapsedSec} second${elapsedSec > 1 ? 's' : ''} ago`;
    } else if (metrics.lastSuccessfulSync > 0) {
      statusText = 'Synced just now';
    } else {
      statusText = 'Not synced yet';
      shouldRecommendSync = true;
    }

    // If sync success rate is low, show a warning
    if (metrics.totalSyncs > 5 && metrics.successRate < 0.7) {
      status = 'warning';
      statusText += ` (${Math.round(metrics.successRate * 100)}% success rate)`;
    }

    return {
      ...metrics,
      statusText,
      status,
      elapsedSinceLastSync: elapsedSec,
      shouldRecommendSync,
    };
  }, []);

  // Function to refresh the status
  const refresh = useCallback(() => {
    try {
      const metrics = getSyncHealth();
      setHealth(processMetrics(metrics));
    } catch (error) {
      console.error('Error getting sync health:', error);
    }
  }, [processMetrics]);

  // Set up periodic refresh
  useEffect(() => {
    // Initial refresh
    refresh();

    // Set up interval for periodic refresh
    const intervalId = setInterval(refresh, refreshInterval);

    // Clean up on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [refresh, refreshInterval]);

  return { health, refresh };
}

export default useSyncHealth;
