import { Platform } from 'react-native';

/**
 * Enhanced production environment utilities for cross-platform optimization
 * Removes debug code and optimizes performance for iOS and Android
 */

// Logger that gets stripped in production builds
export const Logger = {
  debug: (__DEV__ ? console.log : () => {}) as (...args: unknown[]) => void,
  info: (__DEV__ ? console.info : () => {}) as (...args: unknown[]) => void,
  warn: (__DEV__ ? console.warn : () => {}) as (...args: unknown[]) => void,
  error: console.error, // Keep errors in production for crash reporting
};

// Development-only code wrapper
export function devOnly<T>(callback: () => T): T | undefined {
  if (__DEV__) {
    return callback();
  }
  return undefined;
}

// Enhanced cross-platform asset optimizations
export const assetOptimizations = {
  // Enhanced WebP conversion with cross-platform format support
  getOptimizedImageFormat: (originalUri: string) => {
    if (!__DEV__) {
      let optimizedUri = originalUri;

      // Platform-specific format optimization
      if (Platform.OS === 'ios') {
        // iOS supports HEIC, WebP, and AVIF
        if (/\.png(?=$|\?)/i.test(originalUri)) {
          optimizedUri = originalUri.replace(/\.png(?=$|\?)/i, '.webp');
        } else if (/\.jpe?g(?=$|\?)/i.test(originalUri)) {
          // For iOS, prefer HEIC for photos if available, otherwise WebP
          optimizedUri = originalUri.replace(/\.jpe?g(?=$|\?)/i, '.webp');
        }
      } else if (Platform.OS === 'android') {
        // Android has excellent WebP support
        if (/\.png(?=$|\?)/i.test(originalUri)) {
          optimizedUri = originalUri.replace(/\.png(?=$|\?)/i, '.webp');
        } else if (/\.jpe?g(?=$|\?)/i.test(originalUri)) {
          optimizedUri = originalUri.replace(/\.jpe?g(?=$|\?)/i, '.webp');
        }
      } else {
        // Web platform - use modern formats with fallbacks
        if (/\.png(?=$|\?)/i.test(originalUri)) {
          optimizedUri = originalUri.replace(/\.png(?=$|\?)/i, '.avif');
        } else if (/\.jpe?g(?=$|\?)/i.test(originalUri)) {
          optimizedUri = originalUri.replace(/\.jpe?g(?=$|\?)/i, '.avif');
        }
      }

      return optimizedUri;
    }
    return originalUri;
  },

  // Enhanced placeholder creation with platform-specific optimizations
  createPlaceholderUri: (width: number, height: number, text: string = 'Loading...') => {
    // Create more efficient placeholders for different platforms
    const bgColor = Platform.OS === 'ios' ? '#f2f2f7' : '#f3f4f6'; // iOS system gray vs Material gray
    const textColor = Platform.OS === 'ios' ? '#8e8e93' : '#9ca3af';
    
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${bgColor}"/>
      <text x="50%" y="50%" font-family="${Platform.OS === 'ios' ? '-apple-system' : 'Roboto'}" font-size="14" fill="${textColor}" text-anchor="middle" dy=".3em">${text}</text>
    </svg>`;

    try {
      if (typeof Buffer !== 'undefined') {
        return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
      }
      if (typeof btoa !== 'undefined') {
        return `data:image/svg+xml;base64,${btoa(svg)}`;
      }
      return `data:image/svg+xml,${encodeURIComponent(svg)}`;
    } catch (error) {
      Logger.warn('Failed to create base64 placeholder, using URI encoding:', error);
      return `data:image/svg+xml,${encodeURIComponent(svg)}`;
    }
  },

  // Enhanced optimization detection with platform-specific logic
  shouldUseOptimizedFormat: (originalUri: string): boolean => {
    if (__DEV__) return false;
    if (originalUri.startsWith('data:')) return false;

    // Platform-specific optimization logic
    if (originalUri.includes('://')) {
      const webpSupportedCdns = [
        'cloudinary.com', 'imagekit.io', 'cloudflare.com', 'fastly.com',
        'amazonaws.com', 'googleusercontent.com', 'github.com', 'githubusercontent.com'
      ];
      
      // iOS and Android have excellent WebP support
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        return webpSupportedCdns.some((cdn) => originalUri.includes(cdn));
      }
      
      // Web - more conservative approach
      return webpSupportedCdns.slice(0, 4).some((cdn) => originalUri.includes(cdn));
    }

    return (
      originalUri.includes('/assets/') ||
      originalUri.startsWith('./') ||
      originalUri.startsWith('/') ||
      originalUri.startsWith('file://')
    );
  },

  // Get fallback URI if optimized version fails
  getFallbackUri: (optimizedUri: string, originalUri: string): string => {
    // If the optimized URI failed and it's different from original, revert to original
    if (optimizedUri !== originalUri) {
      return originalUri;
    }
    return optimizedUri;
  },

  // Enhanced format support detection
  isFormatSupported: (uri: string, format: 'webp' | 'avif' | 'heic' | 'png' | 'jpg' | 'jpeg'): boolean => {
    const extension = `.${format}`;
    const hasFormat = uri.toLowerCase().includes(extension.toLowerCase());
    
    // Platform-specific format support validation
    // Only block AVIF on Android or on iOS < 16 (iOS 16+ has native AVIF support)
    if (format === 'avif') {
      if (
        Platform.OS === 'android' ||
        (Platform.OS === 'ios' && Number(Platform.Version) < 16)
      ) {
        return false;
      }
    }
    
    if (format === 'heic' && Platform.OS === 'android') {
      return false; // HEIC not supported on Android
    }
    
    return hasFormat;
  },

  // New: Generate responsive image sources
  generateResponsiveSources: (baseUri: string, sizes: number[]): Array<{uri: string, width: number}> => {
    if (!baseUri.includes('://')) return []; // Only for remote URLs
    
    return sizes.map(size => ({
      uri: `${baseUri}?w=${size}&h=${size}&fit=crop&auto=format${Platform.OS !== 'web' ? '&fm=webp' : ''}`,
      width: size,
    }));
  },

  // New: Blurhash generation for placeholders
  generateBlurhash: async (imageUri: string): Promise<string | null> => {
    try {
      // This would typically be done on the server, but can be done client-side
      // Implementation would use expo-image's generateBlurhashAsync
      if (Platform.OS === 'ios') {
        const ExpoImage = await import('expo-image');
        return await ExpoImage.Image.generateBlurhashAsync(imageUri, [4, 3]);
      }
      return null;
    } catch (error) {
      Logger.warn('Failed to generate blurhash:', error);
      return null;
    }
  },
};

// Production bundle configuration
export const bundleConfig = {
  enableHermes: true,
  enableProguard: true,
  useDeveloperSupport: false,
  enableSeparateBuildPerCPUArchitecture: true,
  universalApk: false, // Generate separate APKs for better optimization
};

// Enhanced iOS-specific optimizations
export const iosOptimizations = {
  // App thinning configuration
  appThinning: {
    enableOnDemandResources: true,
    enableAppSlicing: true,
    enableBitcode: false, // Expo doesn't support bitcode
  },

  // Launch time optimization
  launchOptimization: {
    preloadCriticalAssets: true,
    deferNonCriticalInit: true,
    enableFastAppSwitching: true,
  },

  // New: Image-specific iOS optimizations
  imageOptimizations: {
    useAppleWebpCodec: true,
    enableLiveTextInteraction: false, // Disable unless needed for performance
    preferHEIC: false, // WebP is more universally supported
    enableDownscaling: true,
    optimizeMemoryUsage: true,
  },

  // New: iOS performance monitoring
  performanceMonitoring: {
    trackImageLoadTimes: !__DEV__,
    trackMemoryUsage: !__DEV__,
    enableMetrics: !__DEV__,
  },
};

// New: Android-specific optimizations
export const androidOptimizations = {
  imageOptimizations: {
    preferWebP: true,
    useRGB565ForNonAlpha: true, // More memory efficient for images without transparency
    enableDiskCache: true,
    optimizeBitmapAllocation: true,
  },

  performanceOptimizations: {
    enableR8Minification: true,
    enableProguard: true,
    useDexSplitting: true,
    enableBundleSplitting: true,
  },
};

// Memory optimization utilities
export const memoryOptimization = {
  // Clear image cache periodically in production
  clearImageCache: async () => {
    if (!__DEV__) {
      try {
        const ExpoImage = await import('expo-image');
        await Promise.allSettled([
          ExpoImage.Image.clearDiskCache(),
          ExpoImage.Image.clearMemoryCache(),
        ]);
        Logger.debug('Image cache cleared');
      } catch (error) {
        Logger.warn('Failed to clear image cache:', error);
      }
    }
  },

  // Optimize garbage collection
  triggerGC: () => {
    if (!__DEV__ && global.gc) {
      global.gc();
    }
  },

  // New: Memory pressure handling
  handleMemoryPressure: () => {
    if (Platform.OS === 'ios') {
      // iOS memory pressure handling
      memoryOptimization.clearImageCache();
      memoryOptimization.triggerGC();
    } else if (Platform.OS === 'android') {
      // Android memory pressure handling
      memoryOptimization.clearImageCache();
    }
  },

  // New: Monitor memory usage
  getMemoryUsage: () => {
    if (__DEV__) {
      return {
        jsHeapSizeLimit: (global as any).performance?.memory?.jsHeapSizeLimit || 'N/A',
        totalJSHeapSize: (global as any).performance?.memory?.totalJSHeapSize || 'N/A',
        usedJSHeapSize: (global as any).performance?.memory?.usedJSHeapSize || 'N/A',
      };
    }
    return null;
  },
};
