// Common types and interfaces for sync functionality
// This file helps break circular dependencies between DatabaseProvider and SyncContext

import { Database } from '@nozbe/watermelondb';

// Common validation function used by both contexts
export function isValidUuid(uuid: string | undefined | null): boolean {
  return typeof uuid === 'string' && uuid.length === 36 && /^[0-9a-f-]{36}$/i.test(uuid);
}

// Type for sync options, used in both contexts
export interface SyncOptions {
  showFeedback?: boolean;
  force?: boolean;
}

// Type for sharing sync state between contexts
export interface SyncStateInterface {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncError: Error | null;
  isFirstSync: boolean;
}

// Keys for AsyncStorage
export const LAST_SYNC_KEY = 'last_sync_timestamp';
export const FIRST_SYNC_COMPLETED_KEY = 'first_sync_completed';

// Minimum time between sync operations
export const MIN_SYNC_INTERVAL_MS = 30000; // 30 seconds