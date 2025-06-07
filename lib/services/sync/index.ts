/**
 * Sync Service for WatermelonDB and Supabase
 * Modular implementation for improved maintainability
 */

// Re-export core functionality
export { synchronizeWithServer } from './core-sync';

// Re-export data sanitization utilities
export { formatDateForSupabase, sanitizeRecord, isValidUuid } from './data-sanitizer';

// Re-export conflict resolution utilities
export { handleTableConflicts, getPriorityForTable } from './conflict-resolver';

// Re-export health monitoring
export {
  getSyncHealth,
  getLastSyncLogs,
  formatSyncLog,
  persistSyncMetadata,
  loadSyncMetadata,
} from './metrics';

// Re-export network utilities
export { getNetworkStatus, getSyncConfig, isOnline } from './network-manager';

// Re-export caching utilities
export { dataCache, prefetchCommonData, DataCache } from './cache';

// Re-export general utilities
export {
  generateId,
  checkUnsyncedChanges,
  initializeUserData,
  scheduleSync,
  resetAndSync,
  executeRpcWithRetry,
  syncMutex,
} from './utils';

// Export all types and constants from types.ts
export type {
  SyncHealthMetrics,
  NetworkStatus,
  SyncConfig,
  SyncMetadata,
  CacheEntry,
} from './types';
export { TABLES_TO_SYNC, SYNC_CONSTANTS, SYNC_METADATA_KEYS } from './types';
