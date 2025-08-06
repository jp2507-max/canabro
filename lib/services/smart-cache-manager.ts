/**
 * Smart Caching Strategy Configuration
 * Implements intelligent caching for different asset types with iOS-specific optimizations
 * Following 2025 React Native best practices for performance and memory management
 */

import { Platform } from 'react-native';
import { Image as ExpoImage } from 'expo-image';

import { Logger } from '../utils/production-utils';

export interface CacheConfig {
  images: {
    memory: {
      maxSize: number; // MB
      maxItems: number;
      ttl: number; // milliseconds
    };
    disk: {
      maxSize: number; // MB
      maxItems: number;
      ttl: number; // milliseconds
    };
    strategy: 'memory-first' | 'disk-first' | 'balanced';
  };
  assets: {
    critical: {
      preload: boolean;
      persistent: boolean;
      priority: 'high' | 'normal' | 'low';
    };
    nonCritical: {
      lazyLoad: boolean;
      evictOnMemoryPressure: boolean;
      backgroundPrefetch: boolean;
    };
  };
  network: {
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
    maxConcurrent: number;
  };
}

// Platform-specific cache configurations optimized for iOS
const getCacheConfigForPlatform = (): CacheConfig => {
  const baseConfig: CacheConfig = {
    images: {
      memory: {
        maxSize: 50, // 50MB
        maxItems: 100,
        ttl: 30 * 60 * 1000, // 30 minutes
      },
      disk: {
        maxSize: 200, // 200MB
        maxItems: 500,
        ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
      strategy: 'balanced',
    },
    assets: {
      critical: {
        preload: true,
        persistent: true,
        priority: 'high',
      },
      nonCritical: {
        lazyLoad: true,
        evictOnMemoryPressure: true,
        backgroundPrefetch: false,
      },
    },
    network: {
      timeout: 15000, // 15 seconds
      retryAttempts: 3,
      retryDelay: 1000, // 1 second
      maxConcurrent: 6,
    },
  };

  // iOS-specific optimizations
  if (Platform.OS === 'ios') {
    return {
      ...baseConfig,
      images: {
        ...baseConfig.images,
        memory: {
          maxSize: 80, // iOS can handle more memory
          maxItems: 150,
          ttl: 45 * 60 * 1000, // 45 minutes
        },
        disk: {
          maxSize: 300, // Larger disk cache for iOS
          maxItems: 750,
          ttl: 14 * 24 * 60 * 60 * 1000, // 14 days
        },
        strategy: 'memory-first', // iOS has better memory management
      },
      network: {
        ...baseConfig.network,
        maxConcurrent: 8, // iOS can handle more concurrent requests
      },
    };
  }

  // Android-specific optimizations
  if (Platform.OS === 'android') {
    return {
      ...baseConfig,
      images: {
        ...baseConfig.images,
        memory: {
          maxSize: 40, // More conservative memory usage
          maxItems: 80,
          ttl: 20 * 60 * 1000, // 20 minutes
        },
        strategy: 'disk-first', // Android benefits from disk-first strategy
      },
      assets: {
        ...baseConfig.assets,
        nonCritical: {
          ...baseConfig.assets.nonCritical,
          evictOnMemoryPressure: true, // More aggressive eviction on Android
        },
      },
    };
  }

  return baseConfig;
};

class SmartCacheManager {
  private config: CacheConfig;
  private memoryPressureListeners: Array<() => void> = [];
  private currentConcurrentRequests = 0;
  private requestQueue: Array<() => Promise<unknown>> = [];

  constructor() {
    this.config = getCacheConfigForPlatform();
    this.setupMemoryPressureHandling();
  }
  /**
   * Get cache policy for a specific image type
   */
  getCachePolicyForImage(
    uri: string,
    isCritical: boolean = false,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): 'memory' | 'disk' | 'memory-disk' {
    if (!uri) return 'memory';

    // Critical images always use memory-disk
    if (isCritical) {
      return 'memory-disk';
    }

    // Development mode - use memory only for faster iteration
    if (__DEV__) {
      return 'memory';
    }

    // Based on strategy and priority
    switch (this.config.images.strategy) {
      case 'memory-first':
        return priority === 'high' ? 'memory-disk' : 'memory';
      case 'disk-first':
        return priority === 'high' ? 'memory-disk' : 'disk';
      case 'balanced':
      default:
        return priority === 'low' ? 'disk' : 'memory-disk';
    }
  }

  /**
   * Intelligent image prefetching with concurrency control
   */
  async prefetchImages(
    uris: string[],
    options: {
      priority?: 'high' | 'normal' | 'low';
      isCritical?: boolean;
      timeout?: number;
    } = {}
  ): Promise<{ success: number; failed: number; skipped: number }> {
    const { priority = 'normal', isCritical = false, timeout = this.config.network.timeout } = options;
    
    let success = 0;
    let failed = 0;
    let skipped = 0;

    Logger.debug(`Smart prefetching ${uris.length} images with priority: ${priority}`);

    // Filter out already cached images
    const uncachedUris = await this.filterUncachedImages(uris);
    skipped = uris.length - uncachedUris.length;

    if (uncachedUris.length === 0) {
      Logger.debug('All images already cached, skipping prefetch');
      return { success: 0, failed: 0, skipped };
    }

    // Process in batches based on concurrent limit
    const batches = this.createBatches(uncachedUris, this.config.network.maxConcurrent);

    for (const batch of batches) {
      const batchPromises = batch.map(uri => this.prefetchSingleImage(uri, { priority, isCritical, timeout }));
      const results = await Promise.allSettled(batchPromises);

      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          success++;
        } else {
          failed++;
        }
      });
    }

    Logger.info(`Image prefetch completed: ${success} success, ${failed} failed, ${skipped} skipped`);
    return { success, failed, skipped };
  }
  /**
   * Prefetch a single image with retry logic and concurrency control
   */
  private async prefetchSingleImage(
    uri: string,
    options: { priority: 'high' | 'normal' | 'low'; isCritical: boolean; timeout: number }
  ): Promise<boolean> {
    const cachePolicy = this.getCachePolicyForImage(uri, options.isCritical, options.priority);
    
    let attempt = 0;
    const maxAttempts = this.config.network.retryAttempts;

    while (attempt < maxAttempts) {
      try {
        // Wait if we're at the concurrent request limit
        await this.waitForAvailableSlot();
        this.currentConcurrentRequests++;
        
        const success = await Promise.race([
          ExpoImage.prefetch(uri, { cachePolicy }),
          new Promise<boolean>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), options.timeout)
          ),
        ]);

        return success;
      } catch (error) {
        attempt++;
        Logger.warn(`Prefetch attempt ${attempt}/${maxAttempts} failed for ${uri}:`, error);
        
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, this.config.network.retryDelay * attempt));
        }
      } finally {
        this.currentConcurrentRequests--;
      }
    }

    return false;
  }

  /**
   * Wait for an available concurrent request slot
   */
  private async waitForAvailableSlot(): Promise<void> {
    while (this.currentConcurrentRequests >= this.config.network.maxConcurrent) {
      await new Promise(resolve => setTimeout(resolve, 50)); // Check every 50ms
    }
  }
  /**
   * Filter out images that are already cached
   */
  private async filterUncachedImages(uris: string[]): Promise<string[]> {
    const checks = await Promise.allSettled(
      uris.map(async uri => {
        try {
          const cachePath = await ExpoImage.getCachePathAsync(uri);
          return { uri, cached: !!cachePath };
        } catch {
          return { uri, cached: false };
        }
      })
    );

    return checks
      .map((result, index) => {
        if (result.status === 'fulfilled' && !result.value.cached) {
          return uris[index];
        }
        return undefined;
      })
      .filter((uri): uri is string => uri !== undefined);
  }

  /**
   * Create batches for concurrent processing
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Handle memory pressure by clearing caches
   */
  async handleMemoryPressure(): Promise<void> {
    Logger.info('Handling memory pressure - clearing non-critical caches');

    try {
      // Clear memory cache first
      await ExpoImage.clearMemoryCache();
      
      // Notify listeners
      this.memoryPressureListeners.forEach(listener => {
        try {
          listener();
        } catch (error) {
          Logger.warn('Memory pressure listener error:', error);
        }
      });

      // If still under pressure, clear disk cache of non-critical items
      if (Platform.OS === 'android') {
        // On Android, be more aggressive with cache clearing
        await ExpoImage.clearDiskCache();
      }

      Logger.debug('Memory pressure handling completed');
    } catch (error) {
      Logger.error('Failed to handle memory pressure:', error);
    }
  }

  /**
   * Setup memory pressure handling
   */
  private setupMemoryPressureHandling(): void {
    if (Platform.OS === 'ios') {
      // iOS memory pressure handling would be implemented via native modules
      Logger.debug('iOS memory pressure handling initialized');
    } else if (Platform.OS === 'android') {
      // Android memory pressure handling
      Logger.debug('Android memory pressure handling initialized');
    }
  }

  /**
   * Add memory pressure listener
   */
  addMemoryPressureListener(listener: () => void): () => void {
    this.memoryPressureListeners.push(listener);
    
    return () => {
      const index = this.memoryPressureListeners.indexOf(listener);
      if (index > -1) {
        this.memoryPressureListeners.splice(index, 1);
      }
    };
  }

  /**
   * Get current cache statistics
   */
  async getCacheStats(): Promise<{
    memoryUsage: number;
    diskUsage: number;
    totalImages: number;
    config: CacheConfig;
  }> {
    // This would require native implementation to get actual cache sizes
    return {
      memoryUsage: 0, // Would be implemented via native modules
      diskUsage: 0, // Would be implemented via native modules
      totalImages: 0, // Would be implemented via native modules
      config: this.config,
    };
  }

  /**
   * Update cache configuration
   */
  updateConfig(partialConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...partialConfig };
    Logger.debug('Cache configuration updated:', partialConfig);
  }

  /**
   * Clear all caches
   */
  async clearAllCaches(): Promise<void> {
    try {
      await Promise.allSettled([
        ExpoImage.clearMemoryCache(),
        ExpoImage.clearDiskCache(),
      ]);
      Logger.info('All caches cleared successfully');
    } catch (error) {
      Logger.error('Failed to clear caches:', error);
    }
  }
}

// Export singleton instance
export const smartCacheManager = new SmartCacheManager();

// Export configuration for external use
export { getCacheConfigForPlatform };
