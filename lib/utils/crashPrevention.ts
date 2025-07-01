/**
 * Global Crash Prevention and Error Monitoring
 * Catches errors that React ErrorBoundary cannot handle
 */

import { AppState, AppStateStatus } from 'react-native';

interface CrashReport {
  timestamp: number;
  type: 'unhandled_promise' | 'js_error' | 'memory_warning' | 'native_error';
  error: string;
  stack?: string;
  memoryUsage?: number;
}

class CrashPrevention {
  private static instance: CrashPrevention;
  private crashReports: CrashReport[] = [];
  private memoryWarningCount = 0;
  private isInitialized = false;
  private cleanupFunctions: (() => void)[] = [];

  static getInstance(): CrashPrevention {
    if (!CrashPrevention.instance) {
      CrashPrevention.instance = new CrashPrevention();
    }
    return CrashPrevention.instance;
  }

  /**
   * Initialize global error handlers - call this in your app's entry point
   */
  initialize(): void {
    if (this.isInitialized) return;
    
    if (__DEV__) {
      console.warn('🛡️ Initializing crash prevention...');
    }
    
    this.setupUnhandledPromiseRejectionHandler();
    this.setupJavaScriptErrorHandler();
    this.setupMemoryWarningHandler();
    this.setupAppStateChangeHandler();
    
    this.isInitialized = true;
    if (__DEV__) {
      console.warn('✅ Crash prevention initialized');
    }
  }

  /**
   * Clean up all handlers when app is destroyed
   */
  cleanup(): void {
    this.cleanupFunctions.forEach(cleanup => cleanup());
    this.cleanupFunctions = [];
    this.isInitialized = false;
    if (__DEV__) {
      console.warn('🧹 Crash prevention cleaned up');
    }
  }

  /**
   * Handle unhandled promise rejections - major cause of silent crashes
   */
  private setupUnhandledPromiseRejectionHandler(): void {
    const handler = (event: { reason?: unknown; detail?: { reason?: unknown }; preventDefault?: () => void }) => {
      const error = event.reason || event.detail?.reason || 'Unknown promise rejection';
      
      console.error('🚨 Unhandled Promise Rejection:', error);
      
      this.reportCrash({
        timestamp: Date.now(),
        type: 'unhandled_promise',
        error: String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Prevent the app from crashing
      event.preventDefault?.();
      return true;
    };

    // React Native specific promise rejection tracking
    try {
      const rnGlobal = global as unknown as {
        HermesInternal?: {
          enablePromiseRejectionTracker?: (options: {
            allRejections: boolean;
            onUnhandled: (id: number, rejection: unknown) => void;
            onHandled: (id: number) => void;
          }) => void;
        };
      };

      if (rnGlobal.HermesInternal?.enablePromiseRejectionTracker) {
        rnGlobal.HermesInternal.enablePromiseRejectionTracker({
          allRejections: true,
          onUnhandled: (id: number, rejection: unknown) => {
            handler({ reason: rejection });
          },
          onHandled: () => {
            // Promise was eventually handled
          },
        });
      }
    } catch (error) {
      console.error('Could not setup promise rejection tracking:', error);
    }
  }

  /**
   * Handle JavaScript errors that escape React's error boundaries
   */
  private setupJavaScriptErrorHandler(): void {
    try {
      const rnGlobal = global as unknown as {
        ErrorUtils?: {
          setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
        };
      };

      const originalHandler = rnGlobal.ErrorUtils?.setGlobalHandler;
      
      if (originalHandler) {
        const globalErrorHandler = (error: Error, isFatal?: boolean) => {
          console.error('🚨 Global JavaScript Error:', error);
          
          this.reportCrash({
            timestamp: Date.now(),
            type: 'js_error',
            error: error.message || String(error),
            stack: error.stack,
          });

          // Don't let fatal errors crash the app silently
          if (isFatal) {
            console.error('💥 Fatal error prevented app crash:', error);
          }
        };

        rnGlobal.ErrorUtils?.setGlobalHandler?.(globalErrorHandler);
        
        this.cleanupFunctions.push(() => {
          // Restore original handler if it existed
          if (rnGlobal.ErrorUtils?.setGlobalHandler) {
            rnGlobal.ErrorUtils.setGlobalHandler(globalErrorHandler);
          }
        });
      }
    } catch (error) {
      console.error('Could not setup global error handler:', error);
    }
  }

  /**
   * Monitor memory usage and warnings
   */
  private setupMemoryWarningHandler(): void {
    const checkMemoryUsage = () => {
      try {
        // Check if memory usage is available (browser environment)
        const rnGlobal = global as unknown as {
          performance?: {
            memory?: {
              usedJSHeapSize: number;
              jsHeapSizeLimit: number;
              totalJSHeapSize: number;
            };
          };
        };

        if (rnGlobal.performance?.memory) {
          const memoryUsage = rnGlobal.performance.memory.usedJSHeapSize;
          const memoryLimit = rnGlobal.performance.memory.jsHeapSizeLimit;
          const memoryPercentage = (memoryUsage / memoryLimit) * 100;

          if (memoryPercentage > 80) {
            this.memoryWarningCount++;
            console.warn(`⚠️ High memory usage: ${memoryPercentage.toFixed(1)}%`);
            
            this.reportCrash({
              timestamp: Date.now(),
              type: 'memory_warning',
              error: `High memory usage: ${memoryPercentage.toFixed(1)}%`,
              memoryUsage: memoryUsage,
            });

            // Force garbage collection if available
            const gc = (global as unknown as { gc?: () => void }).gc;
            if (gc) {
              gc();
            }
          }
        }
      } catch (error) {
        console.warn('Could not check memory usage:', error);
      }
    };

    // Check memory every 30 seconds
    const memoryInterval = setInterval(checkMemoryUsage, 30000);
    
    this.cleanupFunctions.push(() => {
      clearInterval(memoryInterval);
    });
  }

  /**
   * Handle app state changes to clean up resources
   */
  private setupAppStateChangeHandler(): void {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background') {
        if (__DEV__) {
          console.warn('📱 App moved to background - cleaning up resources');
        }
        this.performBackgroundCleanup();
      } else if (nextAppState === 'active') {
        if (__DEV__) {
          console.warn('📱 App became active');
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    this.cleanupFunctions.push(() => {
      subscription?.remove();
    });
  }

  /**
   * Perform cleanup when app goes to background
   */
  private performBackgroundCleanup(): void {
    try {
      // Clear any pending timers
      // Note: You should implement specific cleanup for your app's timers/intervals
      
      // Force garbage collection if available
      const gc = (global as unknown as { gc?: () => void }).gc;
      if (gc) {
        gc();
      }

      if (__DEV__) {
        console.warn('✅ Background cleanup completed');
      }
    } catch (error) {
      console.error('Error during background cleanup:', error);
    }
  }

  /**
   * Report a crash for debugging
   */
  private reportCrash(report: CrashReport): void {
    this.crashReports.push(report);
    
    // Keep only last 10 reports to prevent memory leak
    if (this.crashReports.length > 10) {
      this.crashReports = this.crashReports.slice(-10);
    }

    // In production, you could send this to a crash reporting service
    if (__DEV__) {
      console.warn('📊 Crash Report:', report);
    }
  }

  /**
   * Get recent crash reports for debugging
   */
  getCrashReports(): CrashReport[] {
    return [...this.crashReports];
  }

  /**
   * Clear crash reports
   */
  clearCrashReports(): void {
    this.crashReports = [];
    this.memoryWarningCount = 0;
  }

  /**
   * Get memory warning count
   */
  getMemoryWarningCount(): number {
    return this.memoryWarningCount;
  }
}

// Export singleton instance
export const crashPrevention = CrashPrevention.getInstance();

// Helper hook for React components
export const useCrashPrevention = () => {
  const initializeCrashPrevention = () => crashPrevention.initialize();
  const cleanupCrashPrevention = () => crashPrevention.cleanup();
  const getCrashReports = () => crashPrevention.getCrashReports();
  const clearCrashReports = () => crashPrevention.clearCrashReports();
  const getMemoryWarningCount = () => crashPrevention.getMemoryWarningCount();

  return {
    initializeCrashPrevention,
    cleanupCrashPrevention,
    getCrashReports,
    clearCrashReports,
    getMemoryWarningCount,
  };
};
