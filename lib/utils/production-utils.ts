/**
 * Production environment utilities for iOS optimization
 * Removes debug code and optimizes performance
 */

// Logger that gets stripped in production builds
export const Logger = {
  debug: (__DEV__ ? console.log : () => {}) as (...args: any[]) => void,
  info: (__DEV__ ? console.info : () => {}) as (...args: any[]) => void,
  warn: (__DEV__ ? console.warn : () => {}) as (...args: any[]) => void,
  error: console.error, // Keep errors in production for crash reporting
};

// Development-only code wrapper
export function devOnly<T>(callback: () => T): T | undefined {
  if (__DEV__) {
    return callback();
  }
  return undefined;
}

// Production-optimized asset loader
export const assetOptimizations = {
  // Enhanced WebP conversion with better format support and safer regex patterns
  getOptimizedImageFormat: (originalUri: string) => {
    if (!__DEV__) {
      // Handle multiple formats with safer regex patterns
      let optimizedUri = originalUri;

      // Convert PNG to WebP (case-insensitive, end-of-string or query parameter aware)
      if (/\.png(?=$|\?)/i.test(originalUri)) {
        optimizedUri = originalUri.replace(/\.png(?=$|\?)/i, '.webp');
      }
      // Convert JPG/JPEG to WebP (handles both jpg and jpeg extensions)
      else if (/\.jpe?g(?=$|\?)/i.test(originalUri)) {
        optimizedUri = originalUri.replace(/\.jpe?g(?=$|\?)/i, '.webp');
      }

      return optimizedUri;
    }
    return originalUri;
  },

  // Enhanced placeholder creation with better error handling
  createPlaceholderUri: (width: number, height: number, text: string = 'Loading...') => {
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text x="50%" y="50%" font-family="Arial" font-size="14" fill="#9ca3af" text-anchor="middle" dy=".3em">${text}</text>
    </svg>`;

    // Use Buffer.from for Node.js environments, with fallback
    try {
      if (typeof Buffer !== 'undefined') {
        return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
      }
      // Fallback for React Native environments where Buffer might not be available
      if (typeof btoa !== 'undefined') {
        return `data:image/svg+xml;base64,${btoa(svg)}`;
      }
      // Final fallback to encoded URI
      return `data:image/svg+xml,${encodeURIComponent(svg)}`;
    } catch (error) {
      Logger.warn('Failed to create base64 placeholder, using URI encoding:', error);
      return `data:image/svg+xml,${encodeURIComponent(svg)}`;
    }
  },

  // Check if WebP optimization should be attempted (basic heuristic)
  shouldUseOptimizedFormat: (originalUri: string): boolean => {
    // In development, always use original
    if (__DEV__) return false;

    // Don't optimize data URIs
    if (originalUri.startsWith('data:')) return false;

    // Don't optimize external URLs unless we know the CDN supports WebP
    if (originalUri.includes('://')) {
      // Known CDNs that support WebP conversion
      const webpSupportedCdns = ['cloudinary.com', 'imagekit.io', 'cloudflare.com', 'fastly.com'];
      return webpSupportedCdns.some((cdn) => originalUri.includes(cdn));
    }

    // Optimize local assets where we control the format availability
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

  // Validate if an image format is supported
  isFormatSupported: (uri: string, format: 'webp' | 'png' | 'jpg' | 'jpeg'): boolean => {
    const extension = `.${format}`;
    return uri.toLowerCase().includes(extension.toLowerCase());
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

// Memory optimization utilities
export const memoryOptimization = {
  // Clear image cache periodically in production
  clearImageCache: () => {
    if (!__DEV__) {
      // Implementation would clear any image caches here
      Logger.debug('Image cache cleared');
    }
  },

  // Optimize garbage collection
  triggerGC: () => {
    if (!__DEV__ && global.gc) {
      global.gc();
    }
  },
};

// iOS-specific optimizations
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
};
