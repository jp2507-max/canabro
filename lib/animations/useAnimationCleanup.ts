/**
 * 🧹 useAnimationCleanup Hook
 * 
 * Provides automatic cleanup for animations to prevent memory leaks
 * and ensure smooth performance. Based on React Native Reanimated v3 best practices.
 */

import { useEffect, useRef } from 'react';
import { cancelAnimation, SharedValue } from 'react-native-reanimated';

interface UseAnimationCleanupConfig {
  // Shared values to clean up on unmount
  sharedValues?: SharedValue<any>[];
  
  // Whether to auto-cleanup on unmount (default: true)
  autoCleanup?: boolean;
  
  // Whether cleanup is disabled (default: false)
  disabled?: boolean;
  
  // Custom cleanup function
  onCleanup?: () => void;
}

export function useAnimationCleanup(config: UseAnimationCleanupConfig = {}) {
  const {
    autoCleanup = true,
    disabled = false,
    onCleanup,
  } = config;

  // Track shared values internally to avoid mutating props
  const sharedValuesRef = useRef<SharedValue<any>[]>(config.sharedValues ?? []);
  
  // Track if component is mounted
  const isMountedRef = useRef(true);  // Manual cleanup function
  const cleanup = () => {
    // Skip cleanup if disabled
    if (disabled) return;
    
    // Cancel all shared value animations
    sharedValuesRef.current.forEach((sharedValue: SharedValue<any>) => {
      if (sharedValue && typeof sharedValue.value !== 'undefined') {
        cancelAnimation(sharedValue);
      }
    });

    // Call custom cleanup if provided
    onCleanup?.();
  };

  // Force cleanup function (can be called manually)
  const forceCleanup = () => {
    cleanup();
  };
  // Auto cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      
      if (autoCleanup) {
        cleanup();
      }
    };
  }, []);

  // Update internal ref when config.sharedValues changes
  useEffect(() => {
    if (config.sharedValues) {
      sharedValuesRef.current = [...config.sharedValues];
    }
  }, [config.sharedValues]);

  // Helper to check if component is still mounted
  const isMounted = () => isMountedRef.current;

  return {
    // Manual cleanup control
    cleanup: forceCleanup,
    
    // Check if component is mounted
    isMounted,
      // Add shared values for cleanup tracking
    addSharedValue: (sharedValue: SharedValue<any>) => {
      if (!sharedValuesRef.current.includes(sharedValue)) {
        sharedValuesRef.current.push(sharedValue);
      }
    },
    
    // Remove shared value from cleanup tracking
    removeSharedValue: (sharedValue: SharedValue<any>) => {
      const index = sharedValuesRef.current.indexOf(sharedValue);
      if (index > -1) {
        sharedValuesRef.current.splice(index, 1);
      }
    },
  };
}

/**
 * 🔧 Higher-order hook for automatic cleanup integration
 * 
 * Wraps any animation hook to automatically add cleanup capabilities
 */
export function withAnimationCleanup<T extends (...args: any[]) => any>(
  useAnimationHook: T,
  getSharedValues?: (result: ReturnType<T>) => SharedValue<any>[]
): T {
  return ((...args: Parameters<T>) => {
    const result = useAnimationHook(...args);
    
    // Extract shared values if getter provided
    const sharedValues = getSharedValues ? getSharedValues(result) : [];
    
    // Auto cleanup
    useAnimationCleanup({ sharedValues });
    
    return result;
  }) as T;
}

/**
 * 🎯 Utility for safe animation updates
 * 
 * Only updates animations if component is still mounted
 */
export function useSafeAnimationUpdate() {
  const { isMounted } = useAnimationCleanup({ autoCleanup: false });

  const safeUpdate = (updateFn: () => void) => {
    if (isMounted()) {
      updateFn();
    }
  };

  return { safeUpdate };
}
