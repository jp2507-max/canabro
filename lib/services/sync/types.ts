/**
 * Types and interfaces for the sync service
 */

import { Database } from '@nozbe/watermelondb';
import type { SyncTableChangeSet } from '@nozbe/watermelondb/sync';

/**
 * Health metrics for sync monitoring
 */
export interface SyncHealthMetrics {
  lastSuccessfulSync: number;
  consecutiveFailures: number;
  averageSyncDuration: number;
  slowestOperation: string;
  successRate: number;
  totalSyncs: number;
  totalSuccessful: number;
}

/**
 * Network status information
 */
export interface NetworkStatus {
  isOnline: boolean;
  isMetered: boolean;
  type: string;
}

/**
 * Configuration for sync behavior based on network conditions
 */
export interface SyncConfig {
  tablesToSync: string[];
  batchSize: number;
  includeMedia: boolean;
}

/**
 * Metadata about previous syncs
 */
export interface SyncMetadata {
  lastSyncTime: number;
  lastSyncSummary?: Record<string, any>;
  lastSyncError?: Record<string, any>;
}

/**
 * Constants for localStorage keys
 */
export const SYNC_METADATA_KEYS = {
  LAST_SYNC_TIMESTAMP: 'sync_last_timestamp',
  LAST_SYNC_SUMMARY: 'sync_last_summary',
  LAST_SYNC_ERROR: 'sync_last_error',
  SYNC_CONFIG: 'sync_config'
};

/**
 * List of tables to synchronize
 */
export const TABLES_TO_SYNC = [
  'profiles',
  'plants',
  'grow_journals',
  'journal_entries',
  'grow_locations',
  'diary_entries',
  'plant_tasks',
  'posts',
];

/**
 * Cache entry for the DataCache system
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * Constants for sync timing and limits
 */
export const SYNC_CONSTANTS = {
  MIN_SYNC_INTERVAL_MS: 30 * 1000, // 30 seconds
  SYNC_LOCK_TIMEOUT_MS: 30 * 1000, // 30 seconds
  MAX_CONCURRENT_REQUESTS: 5
};