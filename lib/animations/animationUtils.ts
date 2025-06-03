/**
 * 🛠️ Animation Utilities
 * 
 * Helper utilities for common animation patterns and performance monitoring.
 * Provides reusable functions for complex animations and debugging tools.
 */

import { 
  SharedValue, 
  withTiming, 
  withSpring, 
  withDelay, 
  withSequence,
  withRepeat,
  cancelAnimation,
  runOnJS
} from 'react-native-reanimated';
import { SPRING_CONFIGS } from './presets';

// Performance monitoring
interface AnimationPerformanceData {
  startTime: number;
  endTime?: number;
  duration?: number;
  animationType: string;
  target: string;
}

const performanceLog: AnimationPerformanceData[] = [];

/**
 * Performance monitoring utilities
 */
export const AnimationPerformance = {
  startTracking: (animationType: string, target: string): number => {
    const id = Date.now();
    performanceLog.push({
      startTime: id,
      animationType,
      target,
    });
    return id;
  },

  endTracking: (id: number) => {
    const entry = performanceLog.find(log => log.startTime === id);
    if (entry) {
      entry.endTime = Date.now();
      entry.duration = entry.endTime - entry.startTime;
    }
  },
  getReport: () => {
    const completedAnimations = performanceLog.filter(log => log.duration);
    const avgDuration =
      completedAnimations.length === 0
        ? 0
        : completedAnimations.reduce((sum, log) => sum + (log.duration || 0), 0) /
          completedAnimations.length;
    
    return {
      totalAnimations: performanceLog.length,
      completedAnimations: completedAnimations.length,
      averageDuration: avgDuration,
      slowAnimations: completedAnimations.filter(log => (log.duration || 0) > 100),
      animationsByType: completedAnimations.reduce((acc, log) => {
        acc[log.animationType] = (acc[log.animationType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  },

  clearLog: () => {
    performanceLog.length = 0;
  },
};

/**
 * Interpolation utilities
 */
export function interpolate(
  value: number,
  inputRange: [number, number],
  outputRange: [number, number],
  clamp: boolean = true
): number {
  const [inputMin, inputMax] = inputRange;
  const [outputMin, outputMax] = outputRange;
  
  const denominator = inputMax - inputMin;
  if (denominator === 0) {
    console.warn('[interpolate] inputRange min and max are equal.');
    return outputMin;
  }
  const ratio = (value - inputMin) / denominator;
  const result = outputMin + ratio * (outputMax - outputMin);
  
  if (clamp) {
    return Math.max(outputMin, Math.min(outputMax, result));
  }
  
  return result;
}

/**
 * Easing functions
 */
export const Easing = {
  bezier: (x1: number, y1: number, x2: number, y2: number) => {
    // Simplified cubic bezier implementation
    return (t: number) => {
      const c = 3 * x1;
      const b = 3 * (x2 - x1) - c;
      const a = 1 - c - b;
      return ((a * t + b) * t + c) * t;
    };
  },
  
  elastic: (amplitude: number = 1, period: number = 0.3) => {
    return (t: number) => {
      if (t === 0 || t === 1) return t;
      const s = period / 4;
      return -(amplitude * Math.pow(2, 10 * (t -= 1)) * Math.sin((t - s) * (2 * Math.PI) / period));
    };
  },
  
  bounce: (t: number) => {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  },
};

/**
 * Animation state management
 */
export class AnimationManager {
  private activeAnimations = new Map<string, { sharedValue: SharedValue<any>; id: string }>();

  track(id: string, sharedValue: SharedValue<any>) {
    this.activeAnimations.set(id, { sharedValue, id });
  }

  cancel(id: string) {
    const animation = this.activeAnimations.get(id);
    if (animation) {
      cancelAnimation(animation.sharedValue);
      this.activeAnimations.delete(id);
    }
  }

  cancelAll() {
    this.activeAnimations.forEach(({ sharedValue }) => {
      cancelAnimation(sharedValue);
    });
    this.activeAnimations.clear();
  }

  getActiveCount() {
    return this.activeAnimations.size;
  }

  isActive(id: string) {
    return this.activeAnimations.has(id);
  }
}

/**
 * Common animation patterns
 */
export const AnimationPatterns = {
  /**
   * Pulse animation - scales up and down repeatedly
   */
  pulse: (
    sharedValue: SharedValue<number>,
    config: { scale?: number; duration?: number; repeat?: number } = {}
  ) => {
    const { scale = 1.1, duration = 500, repeat = -1 } = config;
    
    sharedValue.value = withRepeat(
      withSequence(
        withTiming(scale, { duration: duration / 2 }),
        withTiming(1, { duration: duration / 2 })
      ),
      repeat,
      true
    );
  },

  /**
   * Shake animation - oscillates left and right
   */
  shake: (
    sharedValue: SharedValue<number>,
    config: { intensity?: number; duration?: number; repeat?: number } = {}
  ) => {
    const { intensity = 10, duration = 100, repeat = 3 } = config;
    
    sharedValue.value = withRepeat(
      withSequence(
        withTiming(intensity, { duration }),
        withTiming(-intensity, { duration }),
        withTiming(0, { duration })
      ),
      repeat,
      false
    );
  },

  /**
   * Fade animation - smooth opacity transition
   */
  fade: (
    sharedValue: SharedValue<number>,
    toValue: number,
    config: { duration?: number; delay?: number } = {}
  ) => {
    const { duration = 300, delay = 0 } = config;
    
    const animation = withTiming(toValue, { duration });
    sharedValue.value = delay > 0 ? withDelay(delay, animation) : animation;
  },

  /**
   * Bounce entrance - elastic scale animation
   */
  bounceIn: (
    sharedValue: SharedValue<number>,
    config: { springConfig?: typeof SPRING_CONFIGS.bouncy } = {}
  ) => {
    const { springConfig = SPRING_CONFIGS.bouncy } = config;
    
    sharedValue.value = 0;
    sharedValue.value = withSpring(1, springConfig);
  },

  /**
   * Slide animation - smooth position transition
   */
  slide: (
    sharedValue: SharedValue<number>,
    toValue: number,
    config: { springConfig?: typeof SPRING_CONFIGS.smooth; delay?: number } = {}
  ) => {
    const { springConfig = SPRING_CONFIGS.smooth, delay = 0 } = config;
    
    const animation = withSpring(toValue, springConfig);
    sharedValue.value = delay > 0 ? withDelay(delay, animation) : animation;
  },

  /**
   * Stagger animation - animate multiple values with delays
   */
  stagger: (
    sharedValues: SharedValue<number>[],
    toValue: number,
    config: { staggerDelay?: number; springConfig?: typeof SPRING_CONFIGS.smooth } = {}
  ) => {
    const { staggerDelay = 100, springConfig = SPRING_CONFIGS.smooth } = config;
    
    sharedValues.forEach((sharedValue, index) => {
      const delay = index * staggerDelay;
      sharedValue.value = withDelay(delay, withSpring(toValue, springConfig));
    });
  },
};

/**
 * Debug utilities
 */
export const AnimationDebug = {
  /**
   * Log animation values to console
   */
  logValue: (label: string, sharedValue: SharedValue<any>) => {
    console.log(`[Animation Debug] ${label}:`, sharedValue.value);
  },
  /**
   * Monitor shared value changes
   */
  monitor: (label: string, sharedValue: SharedValue<any>, interval: number = 100) => {
    const monitorId = setInterval(() => {
      console.log(`[Animation Monitor] ${label}:`, sharedValue.value);
    }, interval);

    return () => clearInterval(monitorId);
  },

  /**
   * Validate animation performance
   */
  validatePerformance: (targetFPS: number = 60) => {
    const report = AnimationPerformance.getReport();
    const frameTime = 1000 / targetFPS;
    
    console.log('[Animation Performance Report]', {
      ...report,
      isPerformant: report.averageDuration < frameTime,
      targetFrameTime: frameTime,
    });
    
    return report.averageDuration < frameTime;
  },
};

/**
 * Value transformers
 */
export const ValueTransformers = {
  /**
   * Clamp value between min and max
   */
  clamp: (value: number, min: number, max: number) => {
    return Math.max(min, Math.min(max, value));
  },

  /**
   * Convert degrees to radians
   */
  toRadians: (degrees: number) => {
    return (degrees * Math.PI) / 180;
  },

  /**
   * Convert radians to degrees
   */
  toDegrees: (radians: number) => {
    return (radians * 180) / Math.PI;
  },

  /**
   * Normalize value to 0-1 range
   */
  normalize: (value: number, min: number, max: number) => {
    return (value - min) / (max - min);
  },

  /**
   * Smooth step interpolation
   */
  smoothStep: (edge0: number, edge1: number, x: number) => {
    const t = ValueTransformers.clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  },
};

export default {
  AnimationPerformance,
  interpolate,
  Easing,
  AnimationManager,
  AnimationPatterns,
  AnimationDebug,
  ValueTransformers,
};
