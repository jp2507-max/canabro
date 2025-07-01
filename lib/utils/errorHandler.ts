/**
 * Global error handling utilities for crash prevention
 * File: lib/utils/errorHandler.ts
 */

import { Alert } from 'react-native';

type ErrorHandler = (error: Error, info?: { componentStack?: string }) => void;

// Global error handler
const globalErrorHandler: ErrorHandler = (error, info) => {
  console.error('[GlobalError]', error);
  if (info?.componentStack) {
    console.error('[ComponentStack]', info.componentStack);
  }
  
  // In development, show alert for immediate feedback
  if (__DEV__) {
    Alert.alert(
      'Development Error',
      `${error.message}\n\nCheck console for details`,
      [{ text: 'OK' }]
    );
  }
};

// Set up global error handlers
export function setupGlobalErrorHandling() {
  // Handle React Native errors
  try {
    const globalAny = global as Record<string, unknown>;
    
    if (globalAny.ErrorUtils && typeof globalAny.ErrorUtils === 'object') {
      const errorUtils = globalAny.ErrorUtils as { setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void };
      if (errorUtils.setGlobalHandler) {
        errorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
          console.error('[GlobalErrorUtils]', error, 'isFatal:', isFatal);
          globalErrorHandler(error);
        });
      }
    }

    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: unknown) => {
      const errorEvent = event as { reason?: unknown; preventDefault?: () => void };
      console.error('[UnhandledPromiseRejection]', errorEvent.reason);
      globalErrorHandler(new Error(String(errorEvent.reason) || 'Unhandled Promise Rejection'));
      if (errorEvent.preventDefault) {
        errorEvent.preventDefault();
      }
    };

    // For React Native environment
    if (globalAny.HermesInternal || globalAny.__turboModuleProxy) {
      // Handle promise rejections in Hermes/New Architecture
      const addEventListener = globalAny.addEventListener as ((type: string, handler: (event: unknown) => void) => void) | undefined;
      addEventListener?.('unhandledrejection', handleUnhandledRejection);
    }
    
    // Also try the standard way
    if (typeof process !== 'undefined' && process.on) {
      process.on('unhandledRejection', (reason: unknown) => {
        console.error('[ProcessUnhandledRejection]', reason);
        globalErrorHandler(new Error(String(reason) || 'Process Unhandled Rejection'));
      });
    }
  } catch (setupError) {
    console.error('[ErrorHandler] Setup failed:', setupError);
  }
}

// Safe async wrapper to prevent unhandled rejections
export function safeAsync<T>(
  asyncFn: () => Promise<T>,
  fallback?: T,
  errorMessage?: string
): Promise<T | undefined> {
  return asyncFn().catch((error) => {
    console.error(errorMessage || '[SafeAsync] Error:', error);
    globalErrorHandler(error);
    return fallback;
  });
}

// Memory-safe timeout wrapper
export function safeTimeout(callback: () => void, delay: number): NodeJS.Timeout {
  let executed = false;
  
  const safeCallback = () => {
    if (!executed) {
      executed = true;
      try {
        callback();
      } catch (error) {
        console.error('[SafeTimeout] Callback error:', error);
        globalErrorHandler(error as Error);
      }
    }
  };
  
  const timeoutId = setTimeout(safeCallback, delay);
  return timeoutId;
}

// Memory-safe interval wrapper
export function safeInterval(callback: () => void, delay: number): NodeJS.Timeout {
  let isActive = true;
  
  const safeCallback = () => {
    if (isActive) {
      try {
        callback();
      } catch (error) {
        console.error('[SafeInterval] Callback error:', error);
        globalErrorHandler(error as Error);
        // Clear interval on error to prevent repeated failures
        isActive = false;
      }
    }
  };
  
  const intervalId = setInterval(safeCallback, delay);
  
  // Return the interval ID directly - cleanup will be handled by the caller
  return intervalId;
}

export { globalErrorHandler };
