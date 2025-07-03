import { MMKV } from 'react-native-mmkv';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { removeOldestQuery } from '@tanstack/react-query-persist-client';
import { log } from '@/lib/utils/logger';

/**
 * Shared, encrypted MMKV instance dedicated to TanStack Query cache.
 * Using a dedicated instance prevents unrelated keys from bloating the
 * persistence layer and simplifies future migrations/cleanup.
 */
const CACHE_NAMESPACE = 'tanstack-query-cache';

export const mmkv = new MMKV({ id: CACHE_NAMESPACE });

/**
 * MMKV implements a non-promise, synchronous API. We adapt it to the
 * Storage interface required by `createSyncStoragePersister`.
 */
const storage = {
  setItem: (key: string, value: string): void => {
    try {
      mmkv.set(key, value);
    } catch (error) {
      log.error('MMKV setItem failed', { key, error });
      // Silently fail to prevent crashes - TanStack Query will handle persistence failures
    }
  },
  getItem: (key: string): string | null => {
    try {
      // MMKV returns `undefined` if the key is missing → convert to null.
      return mmkv.getString(key) ?? null;
    } catch (error) {
      log.error('MMKV getItem failed', { key, error });
      return null; // Return safe fallback
    }
  },
  removeItem: (key: string): void => {
    try {
      mmkv.delete(key);
    } catch (error) {
      log.error('MMKV removeItem failed', { key, error });
      // Silently fail to prevent crashes
    }
  },
  // Optional optimisation: expose entries() so TanStack can garbage-collect
  entries: (): Array<[string, string]> => {
    try {
      const keys = mmkv.getAllKeys();
      return keys.map((k: string): [string, string] => [k, mmkv.getString(k) ?? '']);
    } catch (error) {
      log.error('MMKV entries failed', { error });
      return []; // Return safe fallback
    }
  },
} as const;

export const mmkvPersister = createSyncStoragePersister({
  storage,
  key: CACHE_NAMESPACE, // avoid collisions with other MMKV usages
  retry: removeOldestQuery, // built-in strategy for storage quota issues
}); 