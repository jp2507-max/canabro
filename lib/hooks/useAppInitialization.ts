/**
 * App Initialization Hook
 * Handles all app startup tasks including asset preloading, performance monitoring,
 * and critical resource initialization following 2025 React Native best practices
 */

import { useEffect, useState, useCallback } from 'react';
import { Platform, AppState } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { focusManager } from '@tanstack/react-query';
import type { AppStateStatus } from 'react-native';

import { AssetPreloader } from '../services/asset-preloader';
import { Logger, memoryOptimization } from '../utils/production-utils';

interface AppInitializationState {
  isInitialized: boolean;
  isLoading: boolean;
  assetsPreloaded: boolean;
  error: string | null;
  initializationTime: number;
}

interface AppInitializationOptions {
  enableAssetPreloading?: boolean;
  enableMemoryOptimization?: boolean;
  enablePerformanceMonitoring?: boolean;
  splashScreenDelay?: number; // Minimum time to show splash screen
  assetPreloadTimeout?: number;
}

/**
 * Hook to handle complete app initialization with performance optimizations
 */
export const useAppInitialization = (options: AppInitializationOptions = {}) => {
  const {
    enableAssetPreloading = true,
    enableMemoryOptimization = true,
    enablePerformanceMonitoring = !__DEV__,
    splashScreenDelay = 1000, // Minimum 1 second splash screen
    assetPreloadTimeout = 10000,
  } = options;

  const [state, setState] = useState<AppInitializationState>({
    isInitialized: false,
    isLoading: true,
    assetsPreloaded: false,
    error: null,
    initializationTime: 0,
  });

  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  // Handle app state changes for react-query focus manager
  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    if (Platform.OS !== 'web') {
      focusManager.setFocused(nextAppState === 'active');
    }
    setAppState(nextAppState);

    // Handle memory pressure when app becomes active
    if (nextAppState === 'active' && enableMemoryOptimization) {
      memoryOptimization.handleMemoryPressure();
    }
  }, [enableMemoryOptimization]);

  // Main initialization function
  const initializeApp = useCallback(async () => {
    const startTime = Date.now();
    Logger.info('Starting app initialization...');

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Create array of initialization tasks
      const initTasks: Promise<any>[] = [];

      // Add asset preloading task
      if (enableAssetPreloading) {
        Logger.debug('Adding asset preloading to initialization tasks');
        initTasks.push(
          AssetPreloader.preloadCriticalAssets({
            timeout: assetPreloadTimeout,
            priority: 'high',
          }).then(result => {
            setState(prev => ({ ...prev, assetsPreloaded: true }));
            Logger.info('Asset preloading completed:', {
              success: result.overall.success,
              duration: `${result.overall.duration}ms`,
              images: `${result.images.loaded}/${result.images.total}`,
            });
            return result;
          })
        );
      }      // Add memory optimization task
      if (enableMemoryOptimization) {
        Logger.debug('Adding memory optimization to initialization tasks');
        initTasks.push(
          Promise.resolve(memoryOptimization.triggerGC())
        );
      }

      // Add minimum splash screen delay to prevent flash
      const splashPromise = new Promise(resolve => {
        setTimeout(resolve, splashScreenDelay);
      });
      initTasks.push(splashPromise);

      // Wait for all initialization tasks to complete
      const results = await Promise.allSettled(initTasks);

      // Check if any critical tasks failed
      const criticalFailures = results.filter(
        (result, index) => result.status === 'rejected' && index < initTasks.length - 1 // Exclude splash delay
      );

      if (criticalFailures.length > 0) {
        Logger.warn('Some initialization tasks failed:', criticalFailures);
      }

      const initializationTime = Date.now() - startTime;

      setState(prev => ({
        ...prev,
        isInitialized: true,
        isLoading: false,
        initializationTime,
      }));

      Logger.info(`App initialization completed in ${initializationTime}ms`);

      // Hide splash screen after initialization
      await SplashScreen.hideAsync();

      // Log performance metrics if enabled
      if (enablePerformanceMonitoring) {
        logPerformanceMetrics(initializationTime, results);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
      Logger.error('App initialization failed:', error);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        initializationTime: Date.now() - startTime,
      }));

      // Still hide splash screen even if initialization fails
      await SplashScreen.hideAsync();
    }
  }, [
    enableAssetPreloading,
    enableMemoryOptimization,
    enablePerformanceMonitoring,
    splashScreenDelay,
    assetPreloadTimeout,
  ]);

  // Initialize app on mount
  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // Set up app state listener
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [handleAppStateChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      AssetPreloader.cancelPreloading();
    };
  }, []);

  return {
    ...state,
    appState,
    retry: initializeApp,
  };
};

/**
 * Log performance metrics for monitoring
 */
function logPerformanceMetrics(initializationTime: number, results: PromiseSettledResult<any>[]) {
  if (__DEV__) return;

  const metrics = {
    initializationTime,
    platform: Platform.OS,
    tasksCompleted: results.filter(r => r.status === 'fulfilled').length,
    tasksFailed: results.filter(r => r.status === 'rejected').length,
    memoryUsage: memoryOptimization.getMemoryUsage(),
    timestamp: new Date().toISOString(),
  };

  Logger.info('Performance metrics:', metrics);

  // In a real app, you would send these metrics to your analytics service
  // Example: Analytics.track('app_initialization', metrics);
}

/**
 * Enhanced splash screen prevention with better error handling
 */
export const useSplashScreen = () => {
  useEffect(() => {
    // Prevent auto-hide with error handling
    SplashScreen.preventAutoHideAsync().catch(error => {
      Logger.warn('Failed to prevent splash screen auto-hide:', error);
    });

    return () => {
      // Ensure splash screen is hidden on cleanup
      SplashScreen.hideAsync().catch(error => {
        Logger.warn('Failed to hide splash screen on cleanup:', error);
      });
    };
  }, []);
};

/**
 * Hook for handling app lifecycle with performance optimizations
 */
export const useAppLifecycle = () => {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [isAppActive, setIsAppActive] = useState(true);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      setAppState(nextAppState);
      setIsAppActive(nextAppState === 'active');

      if (nextAppState === 'active') {
        // App became active - trigger optimizations
        memoryOptimization.handleMemoryPressure();
      } else if (nextAppState === 'background') {
        // App went to background - clean up if needed
        if (!__DEV__) {
          memoryOptimization.clearImageCache();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  return {
    appState,
    isAppActive,
  };
};
