/**
 * Cache system for frequently accessed data
 */

import { CacheEntry } from './types';

/**
 * Simple cache system for frequently accessed data
 */
export class DataCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 60 * 60 * 1000; // 1 hour by default
  private maxEntries = 100; // Maximum number of entries to prevent memory leaks

  /**
   * Get a cached item or fetch it if not available/expired
   * 
   * @param key Cache key
   * @param fetcher Function to fetch data if not in cache
   * @param ttl Time to live in milliseconds
   * @returns The cached or freshly fetched data
   */
  async get<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const now = Date.now();
    const cached = this.cache.get(key);
    
    // Return from cache if valid
    if (cached && now < cached.expiresAt) {
      return cached.data;
    }
    
    // Fetch fresh data
    try {
      const data = await fetcher();
      this.set(key, data, ttl);
      return data;
    } catch (error) {
      // If fetching fails but we have stale data, return it with a console warning
      if (cached) {
        console.warn(`[DataCache] Failed to refresh ${key}, using stale data from ${new Date(cached.timestamp).toLocaleString()}`, error);
        return cached.data;
      }
      throw error; // No cached data to fall back to
    }
  }

  /**
   * Manually store data in the cache
   * 
   * @param key Cache key
   * @param data Data to cache
   * @param ttl Time to live in milliseconds
   */
  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    const now = Date.now();
    
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl
    });
    
    // Evict oldest entries if we exceed the maximum
    if (this.cache.size > this.maxEntries) {
      this.evictOldest();
    }
  }

  /**
   * Manually remove an item from the cache
   * 
   * @param key Cache key to remove
   */
  remove(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all items from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Evict expired entries from the cache
   */
  evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Remove the oldest entries when cache is too large
   */
  private evictOldest(): void {
    // Convert to array for sorting
    const entries = Array.from(this.cache.entries());
    
    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest entries until we're under the limit
    const entriesToRemove = this.cache.size - this.maxEntries;
    for (let i = 0; i < entriesToRemove && i < entries.length; i++) {
      // Ensure entry exists before attempting deletion
      const entry = entries[i];
      if (entry && entry[0]) {
        this.cache.delete(entry[0]);
      }
    }
  }
}

// Create a singleton instance of the cache
export const dataCache = new DataCache();

/**
 * Add a function to prefetch common lookup data
 */
export async function prefetchCommonData(userId: string): Promise<void> {
  try {
    const supabase = (await import('../../supabase')).default;
    
    // Start prefetching in background
    Promise.all([
      // Prefetch current user profile
      dataCache.get(`profile:${userId}`, async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
          
        if (error) throw error;
        return data;
      }, 30 * 60 * 1000), // 30 minute TTL

      // Prefetch lookup data that doesn't change often
      dataCache.get('plant_categories', async () => {
        const { data, error } = await supabase
          .from('plant_categories')
          .select('*')
          .order('name');
          
        if (error) throw error;
        return data;
      }, 24 * 60 * 60 * 1000) // 24 hour TTL
    ]).catch(err => {
      // Silently catch errors in background prefetching
      console.warn('[Prefetch] Error prefetching common data:', err);
    });
  } catch (error) {
    // Prefetch errors shouldn't interrupt app flow
    console.warn('[Prefetch] Error setting up prefetch:', error);
  }
}