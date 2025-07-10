/**
 * Asset Preloader Service
 * Implements intelligent asset preloading for critical resources during app startup
 * Following 2025 best practices for React Native performance optimization
 */

import { Platform } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Asset } from 'expo-asset';
import * as Font from 'expo-font';

import { Logger, assetOptimizations, memoryOptimization } from '../utils/production-utils';

// Critical assets that should be preloaded during app startup
const CRITICAL_IMAGES = [
  require('../../assets/icon.png'),
  require('../../assets/adaptive-icon.png'),
  require('../../assets/splash.png'),
  require('../../assets/placeholder.png'),
] as const;

// Critical fonts (if you add custom fonts)
const CRITICAL_FONTS = {
  // Add your custom fonts here when needed
  // 'CustomFont-Regular': require('../../assets/fonts/CustomFont-Regular.ttf'),
} as const;

// Remote CDN assets that are frequently accessed
const CRITICAL_REMOTE_ASSETS = [
  // Add frequently accessed remote image URLs here
  // 'https://your-cdn.com/critical-image.webp',
] as const;

interface PreloadOptions {
  images?: boolean;
  fonts?: boolean;
  remoteAssets?: boolean;
  priority?: 'high' | 'normal' | 'low';
  timeout?: number;
  batchSize?: number;
}

interface PreloadResult {
  images: {
    total: number;
    loaded: number;
    failed: number;
    duration: number;
  };
  fonts: {
    total: number;
    loaded: number;
    failed: number;
    duration: number;
  };
  remoteAssets: {
    total: number;
    loaded: number;
    failed: number;
    duration: number;
  };
  overall: {
    success: boolean;
    duration: number;
  memoryUsage?: Record<string, unknown> | null;
  };
}

class AssetPreloaderService {
  private isPreloading = false;
  private preloadResult: PreloadResult | null = null;
  private abortController: AbortController | null = null;

  /**
   * Main preload function - call this during app startup
   */
  async preloadCriticalAssets(options: PreloadOptions = {}): Promise<PreloadResult> {
    if (this.isPreloading) {
      Logger.warn('Asset preloading already in progress');
      return this.preloadResult!;
    }

    const startTime = Date.now();
    this.isPreloading = true;
    this.abortController = new AbortController();

    const {
      images = true,
      fonts = true,
      remoteAssets = true,
      priority = 'high',
      timeout = 10000, // 10 seconds timeout
      batchSize = 5,
    } = options;

    Logger.debug('Starting critical asset preloading with options:', options);

    const result: PreloadResult = {
      images: { total: 0, loaded: 0, failed: 0, duration: 0 },
      fonts: { total: 0, loaded: 0, failed: 0, duration: 0 },
      remoteAssets: { total: 0, loaded: 0, failed: 0, duration: 0 },
      overall: { success: false, duration: 0 },
    };

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Preload timeout')), timeout);
      });

      // Run all preload operations with timeout
      await Promise.race([
        this.runPreloadOperations(result, { images, fonts, remoteAssets, batchSize, priority }),
        timeoutPromise,
      ]);

      result.overall.success = true;
    } catch (error) {
      Logger.error('Asset preloading failed:', error);
      result.overall.success = false;
    } finally {
      result.overall.duration = Date.now() - startTime;
      
      // Capture memory usage if in development
      if (__DEV__) {
        result.overall.memoryUsage = memoryOptimization.getMemoryUsage();
      }

      this.isPreloading = false;
      this.preloadResult = result;
      this.abortController = null;

      Logger.info('Asset preloading completed:', {
        success: result.overall.success,
        duration: `${result.overall.duration}ms`,
        images: `${result.images.loaded}/${result.images.total}`,
        fonts: `${result.fonts.loaded}/${result.fonts.total}`,
        remoteAssets: `${result.remoteAssets.loaded}/${result.remoteAssets.total}`,
      });
    }

    return result;
  }

  /**
   * Run all preload operations in parallel with batching
   */
  private async runPreloadOperations(
    result: PreloadResult,
    options: { images: boolean; fonts: boolean; remoteAssets: boolean; batchSize: number; priority: string }
  ): Promise<void> {
    const operations: Promise<void>[] = [];

    if (options.images) {
      operations.push(this.preloadImages(result.images, options.batchSize));
    }

    if (options.fonts) {
      operations.push(this.preloadFonts(result.fonts));
    }

    if (options.remoteAssets) {
      operations.push(this.preloadRemoteAssets(result.remoteAssets, options.batchSize));
    }

    // Run all operations in parallel
    await Promise.allSettled(operations);
  }

  /**
   * Preload critical local images
   */
  private async preloadImages(
    result: { total: number; loaded: number; failed: number; duration: number },
    batchSize: number
  ): Promise<void> {
    const startTime = Date.now();
    result.total = CRITICAL_IMAGES.length;

    if (result.total === 0) {
      result.duration = Date.now() - startTime;
      return;
    }

    Logger.debug(`Preloading ${result.total} critical images`);

    try {
      // Use Asset.loadAsync for local images - more efficient than ExpoImage.prefetch for bundled assets
      const batches: (typeof CRITICAL_IMAGES[number])[][] = [];
      for (let i = 0; i < CRITICAL_IMAGES.length; i += batchSize) {
        batches.push(CRITICAL_IMAGES.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        if (this.abortController?.signal.aborted) break;

        const batchPromises = batch.map(async (asset) => {
          try {
            await Asset.loadAsync(asset);
            result.loaded++;
            Logger.debug(`Preloaded image asset: ${asset}`);
          } catch (error) {
            result.failed++;
            Logger.warn(`Failed to preload image asset:`, asset, error);
          }
        });

        await Promise.allSettled(batchPromises);
      }
    } catch (error) {
      Logger.error('Image preloading batch failed:', error);
    }

    result.duration = Date.now() - startTime;
    Logger.debug(`Image preloading completed: ${result.loaded}/${result.total} in ${result.duration}ms`);
  }

  /**
   * Preload critical fonts
   */
  private async preloadFonts(
    result: { total: number; loaded: number; failed: number; duration: number }
  ): Promise<void> {
    const startTime = Date.now();
    const fontEntries = Object.entries(CRITICAL_FONTS);
    result.total = fontEntries.length;

    if (result.total === 0) {
      result.duration = Date.now() - startTime;
      return;
    }

    Logger.debug(`Preloading ${result.total} critical fonts`);

    try {
      // Use Font.loadAsync for better performance and caching
      const fontLoadPromises = fontEntries.map(async ([fontName, fontSource]) => {
        try {
          await Font.loadAsync({
            [fontName]: fontSource as number,
          });
          result.loaded++;
          Logger.debug(`Preloaded font: ${fontName}`);
        } catch (error) {
          result.failed++;
          Logger.warn(`Failed to preload font: ${fontName}`, error);
        }
      });

      await Promise.allSettled(fontLoadPromises);
    } catch (error) {
      Logger.error('Font preloading failed:', error);
    }

    result.duration = Date.now() - startTime;
    Logger.debug(`Font preloading completed: ${result.loaded}/${result.total} in ${result.duration}ms`);
  }

  /**
   * Preload critical remote assets
   */
  private async preloadRemoteAssets(
    result: { total: number; loaded: number; failed: number; duration: number },
    batchSize: number
  ): Promise<void> {
    const startTime = Date.now();
    result.total = CRITICAL_REMOTE_ASSETS.length;

    if (result.total === 0) {
      result.duration = Date.now() - startTime;
      return;
    }

    Logger.debug(`Preloading ${result.total} critical remote assets`);

    try {
      // Batch remote asset loading to avoid overwhelming the network
      const batches: (typeof CRITICAL_REMOTE_ASSETS[number])[][] = [];
      for (let i = 0; i < CRITICAL_REMOTE_ASSETS.length; i += batchSize) {
        batches.push(CRITICAL_REMOTE_ASSETS.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        if (this.abortController?.signal.aborted) break;

        const batchPromises = batch.map(async (assetUri) => {
          try {
            // Optimize the URI if possible
            const optimizedUri = assetOptimizations.shouldUseOptimizedFormat(assetUri)
              ? assetOptimizations.getOptimizedImageFormat(assetUri)
              : assetUri;

            const success = await ExpoImage.prefetch(optimizedUri, {
              cachePolicy: 'memory-disk',
              headers: {
                ...(Platform.OS === 'android' && { 'Accept': 'image/webp,image/*,*/*;q=0.8' }),
              },
            });

            if (success) {
              result.loaded++;
              Logger.debug(`Preloaded remote asset: ${assetUri}`);
            } else {
              result.failed++;
              Logger.warn(`Failed to preload remote asset: ${assetUri}`);
            }
          } catch (error) {
            result.failed++;
            Logger.warn(`Error preloading remote asset: ${assetUri}`, error);
          }
        });

        await Promise.allSettled(batchPromises);
      }
    } catch (error) {
      Logger.error('Remote asset preloading failed:', error);
    }

    result.duration = Date.now() - startTime;
    Logger.debug(`Remote asset preloading completed: ${result.loaded}/${result.total} in ${result.duration}ms`);
  }

  /**
   * Preload specific images on demand (for screen-specific preloading)
   */
  async preloadSpecificImages(
    imageUris: string[],
    options: { priority?: 'high' | 'normal' | 'low'; timeout?: number } = {}
  ): Promise<{ loaded: number; failed: number; duration: number }> {
    const startTime = Date.now();
    const { priority = 'normal', timeout = 5000 } = options;

    Logger.debug(`Preloading ${imageUris.length} specific images with priority: ${priority}`);

    let loaded = 0;
    let failed = 0;

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Specific image preload timeout')), timeout);
      });

      const preloadPromise = Promise.allSettled(
        imageUris.map(async (uri) => {
          try {
            const optimizedUri = assetOptimizations.shouldUseOptimizedFormat(uri)
              ? assetOptimizations.getOptimizedImageFormat(uri)
              : uri;

            const success = await ExpoImage.prefetch(optimizedUri, {
              cachePolicy: priority === 'high' ? 'memory-disk' : 'disk',
            });

            if (success) {
              loaded++;
            } else {
              failed++;
            }
          } catch (error) {
            failed++;
            Logger.warn(`Failed to preload specific image: ${uri}`, error);
          }
        })
      );

      await Promise.race([preloadPromise, timeoutPromise]);
    } catch (error) {
      Logger.warn('Specific image preloading timeout or error:', error);
    }

    const duration = Date.now() - startTime;
    Logger.debug(`Specific image preloading completed: ${loaded}/${imageUris.length} in ${duration}ms`);

    return { loaded, failed, duration };
  }

  /**
   * Cancel ongoing preloading
   */
  cancelPreloading(): void {
    if (this.abortController) {
      this.abortController.abort();
      Logger.debug('Asset preloading cancelled');
    }
  }

  /**
   * Get the last preload result
   */
  getLastResult(): PreloadResult | null {
    return this.preloadResult;
  }

  /**
   * Check if preloading is currently in progress
   */
  isCurrentlyPreloading(): boolean {
    return this.isPreloading;
  }

  /**
   * Clear all cached assets (for memory management)
   */
  async clearAllCaches(): Promise<void> {
    try {
      await memoryOptimization.clearImageCache();
      Logger.debug('All asset caches cleared');
    } catch (error) {
      Logger.error('Failed to clear asset caches:', error);
    }
  }
}

// Export singleton instance
export const AssetPreloader = new AssetPreloaderService();

// Hook for using asset preloader in components
export const useAssetPreloader = () => {
  return {
    preloadCriticalAssets: AssetPreloader.preloadCriticalAssets.bind(AssetPreloader),
    preloadSpecificImages: AssetPreloader.preloadSpecificImages.bind(AssetPreloader),
    cancelPreloading: AssetPreloader.cancelPreloading.bind(AssetPreloader),
    getLastResult: AssetPreloader.getLastResult.bind(AssetPreloader),
    isCurrentlyPreloading: AssetPreloader.isCurrentlyPreloading.bind(AssetPreloader),
    clearAllCaches: AssetPreloader.clearAllCaches.bind(AssetPreloader),
  };
};

// Utility for screen-specific preloading
export const preloadScreenAssets = {
  // Preload assets for plant detail screens
  plantDetail: async () => {
    const plantImages: string[] = [
      // Add common plant-related image URLs here
    ];
    return AssetPreloader.preloadSpecificImages(plantImages, { priority: 'high' });
  },

  // Preload assets for strain catalog
  strainCatalog: async () => {
    const strainImages: string[] = [
      // Add common strain image URLs here
    ];
    return AssetPreloader.preloadSpecificImages(strainImages, { priority: 'normal' });
  },

  // Preload assets for diagnosis feature
  diagnosis: async () => {
    const diagnosisImages: string[] = [
      // Add diagnosis-related image URLs here
    ];
    return AssetPreloader.preloadSpecificImages(diagnosisImages, { priority: 'high' });
  },
};
