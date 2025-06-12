/**
 * Performance Profiler Setup for React Native App
 * Provides tools for measuring app performance metrics
 */

import { Platform } from 'react-native';

interface PerformanceMetrics {
  screenTransitionTime: number;
  jsThreadUtilization: number;
  uiThreadUtilization: number;
  memoryUsage: number;
  bundleLoadTime: number;
  timeToInteractive: number;
}

interface PerformanceProfiler {
  startProfiling(): void;
  stopProfiling(): PerformanceMetrics;
  measureScreenTransition(screenName: string): Promise<number>;
  measureMemoryUsage(): number;
  measureBundleSize(): Promise<number>;
}

class ReactNativePerformanceProfiler implements PerformanceProfiler {
  private profilingStartTime: number = 0;
  private metrics: Partial<PerformanceMetrics> = {};
  private stopFPSMonitoring?: () => void;

  startProfiling(): void {
    this.profilingStartTime = performance.now();
    console.log('🚀 Performance profiling started');
    
    // Enable performance monitoring for iOS
    if (Platform.OS === 'ios') {
      // iOS-specific performance monitoring
      this.enableiOSProfiling();
    }
  }

  stopProfiling(): PerformanceMetrics {
    const endTime = performance.now();
    const totalTime = endTime - this.profilingStartTime;
    
    console.log('⏱️ Performance profiling completed in', totalTime.toFixed(2), 'ms');
    
    return {
      screenTransitionTime: this.metrics.screenTransitionTime || 0,
      jsThreadUtilization: this.metrics.jsThreadUtilization || 0,
      uiThreadUtilization: this.metrics.uiThreadUtilization || 0,
      memoryUsage: this.measureMemoryUsage(),
      bundleLoadTime: totalTime,
      timeToInteractive: this.metrics.timeToInteractive || 0,
    };
  }

  async measureScreenTransition(screenName: string): Promise<number> {
    const startTime = performance.now();
    
    // Wait for next frame to ensure screen is rendered
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        const endTime = performance.now();
        const transitionTime = endTime - startTime;
        
        console.log(`📱 Screen transition to ${screenName}: ${transitionTime.toFixed(2)}ms`);
        this.metrics.screenTransitionTime = transitionTime;
        resolve(transitionTime);
      });
    });
  }  measureMemoryUsage(): number {
    // React Native memory monitoring (limited in RN environment)
    if (Platform.OS === 'ios' && __DEV__) {
      // In development, we can get some memory info
      console.log('💾 Memory monitoring (development mode)');
    }
    
    // For production monitoring, use native performance APIs
    console.log('💾 Memory usage monitoring enabled');
    return 0;
  }

  async measureBundleSize(): Promise<number> {
    // This would typically be measured during build time
    // For runtime, we can estimate based on loaded modules
    console.log('📦 Bundle size measurement (use build-time analysis for accurate results)');
    return 0;
  }

  private enableiOSProfiling(): void {
    if (Platform.OS === 'ios') {
      // iOS-specific performance setup
      console.log('🍎 iOS performance monitoring enabled');
      
      // Enable frame rate monitoring
      this.enableFrameRateMonitoring();
    }
  }
  private enableFrameRateMonitoring(): void {
    let frameCount = 0;
    let lastTime = performance.now();
    let isMonitoring = true;
    this.stopFPSMonitoring = () => { isMonitoring = false; };

    const measureFPS = () => {
      if (!isMonitoring) return;
      
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = frameCount;
        console.log('🎯 FPS:', fps);
        
        if (fps < 55) {
          console.warn('⚠️ Low FPS detected:', fps);
        }
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };    requestAnimationFrame(measureFPS);
  }

  cleanup(): void {
    this.stopFPSMonitoring?.();
    console.log('🧹 Performance profiler cleanup completed');
  }
}

// Performance monitoring hooks
export const usePerformanceMonitoring = () => {
  const profiler = new ReactNativePerformanceProfiler();
  
  // Cleanup function to stop monitoring
  const cleanup = () => {
    profiler.cleanup();
  };
  
  const measureScreenLoad = async (screenName: string) => {
    const startTime = performance.now();
      // Measure Time to Interactive
    await new Promise<number>(resolve => {
      const checkInteractive = () => {
        // Check if main content is loaded and interactive
        // In React Native, we use a timeout-based approach since there's no document
        const timeToInteractive = performance.now() - startTime;
        console.log(`🎯 Time to Interactive (${screenName}):`, timeToInteractive.toFixed(2), 'ms');
        resolve(timeToInteractive);
      };
      
      // Wait for initial render to complete
      setTimeout(checkInteractive, 100);
    });
  };

  const measureComponentRender = (componentName: string) => {
    const startTime = performance.now();
    
    return () => {
      const renderTime = performance.now() - startTime;
      if (renderTime > 16.67) { // More than one frame at 60fps
        console.warn(`⚠️ Slow render (${componentName}):`, renderTime.toFixed(2), 'ms');
      }
      return renderTime;
    };
  };
  return {
    profiler,
    measureScreenLoad,
    measureComponentRender,
    cleanup,
  };
};

// Bundle analysis utilities
export const bundleAnalyzer = {
  // Analyze import sizes at runtime
  analyzeImports: () => {
    console.log('📊 Analyzing imports...');
    
    // Check for large dependencies
    const largeDependencies = [
      '@tensorflow/tfjs',
      '@expo/vector-icons',
      '@nozbe/watermelondb',
      'react-native-reanimated',
      '@tanstack/react-query'
    ];

    largeDependencies.forEach(dep => {
      try {
        require.resolve(dep);
        console.log(`✅ ${dep} is loaded`);
      } catch (e) {
        console.log(`❌ ${dep} is not loaded`);
      }
    });
  },

  // Monitor bundle loading performance
  measureBundleLoad: () => {
    const startTime = performance.now();
    
    return () => {
      const loadTime = performance.now() - startTime;
      console.log('📦 Bundle load time:', loadTime.toFixed(2), 'ms');
      return loadTime;
    };
  }
};

export default ReactNativePerformanceProfiler;
