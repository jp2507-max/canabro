// iOS-optimized production configuration
export const productionConfig = {
  // Remove console.log in production
  enableLogging: __DEV__,

  // Optimize bundle size for iOS
  tensorflow: {
    // Only load TensorFlow.js when actually needed
    lazyLoad: true,
    // Use TensorFlow Lite for better iOS performance
    preferLite: true,
  },

  // Asset optimization for iOS
  images: {
    // Use iOS-optimized formats
    preferWebP: true,
    enableLazyLoading: true,
    compressionQuality: 0.8,
  },

  // Network optimization
  api: {
    // Enable request caching for iOS
    enableCaching: true,
    timeout: 10000,
  },

  // Memory management for older iOS devices
  memory: {
    // Clean up unused components
    enableCleanup: true,
    // Limit concurrent operations
    maxConcurrentOperations: 3,
  },
};

// Custom logger that's removed in production builds
export const logger = {
  log: (...args: any[]) => {
    if (productionConfig.enableLogging) {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    if (productionConfig.enableLogging) {
      console.error(...args);
    }
  },
  warn: (...args: any[]) => {
    if (productionConfig.enableLogging) {
      console.warn(...args);
    }
  },
};

// iOS-specific performance utilities
export const iosOptimizations = {
  // Debounce heavy operations for better iOS performance
  debounceDelay: 300,

  // Optimize image loading for iOS
  imageLoadingStrategy: 'lazy' as const,

  // Reduce memory pressure on iOS
  enableMemoryWarnings: true,

  // Optimize for iOS app launch time
  preloadCriticalAssets: true,
};
