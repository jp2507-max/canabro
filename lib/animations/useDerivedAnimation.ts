/**
 * 🔄 useDerivedAnimation Hook
 * 
 * Provides optimized derived value utilities for complex animations.
 * Reduces unnecessary calculations and improves performance.
 * 
 * 🚨 PERFORMANCE NOTE:
 * When passing complex objects to the dependencies array, always memoize them
 * to prevent unnecessary worklet re-evaluations. Objects are compared by reference,
 * so recreating them on every render will cause worklets to be torn down and recreated.
 * 
 * @example
 * // ❌ Bad - creates new object on every render
 * const config = { min: 0, max: 1 };
 * useDerivedAnimation(fn, { dependencies: [value, config] });
 * 
 * // ✅ Good - memoized for referential stability
 * const memoConfig = useMemo(() => config, [config.min, config.max]);
 * useDerivedAnimation(fn, { dependencies: [value, memoConfig] });
 */

import { useDerivedValue, useSharedValue, SharedValue } from 'react-native-reanimated';
import { useMemo } from 'react';
import { useAnimationCleanup } from './useAnimationCleanup';

/**
 * Helper to safely memoize objects for animation dependencies.
 * Prevents unnecessary worklet re-evaluations by maintaining referential stability.
 */
export function useMemoizedDeps<T extends Record<string, any>>(
  obj: T,
  keys: (keyof T)[]
): T {
  return useMemo(() => obj, keys.map(key => obj[key]));
}

interface UseDerivedAnimationConfig {
  /**
   * Dependencies that trigger re-evaluation.
   * Accept any value, the same way React's deps array works.
   */
  dependencies?: ReadonlyArray<any>;
  
  // Optional bounds for clamping values
  bounds?: {
    min?: number;
    max?: number;
  };
  
  // Whether to enable cleanup on unmount
  enableCleanup?: boolean;
}

export function useDerivedAnimation<T>(
  derivedFn: () => T,
  config: UseDerivedAnimationConfig
) {
  const { dependencies = [], bounds, enableCleanup = true } = config;
  
  // Create derived value with bounds checking
  const derivedValue = useDerivedValue(() => {
    const result = derivedFn();
    
    // Apply bounds if specified and result is numeric
    if (bounds && typeof result === 'number') {
      const { min = -Infinity, max = Infinity } = bounds;
      return Math.max(min, Math.min(max, result));
    }
    
    return result;
  }, dependencies as any);
    // Always call; internally the hook can noop when disabled
  useAnimationCleanup({
    sharedValues: [derivedValue as SharedValue<any>],
    disabled: !enableCleanup,
  });
  
  return {
    derivedValue,
    // Helper to get current value
    getValue: () => derivedValue.value,
  };
}

// Specialized derived animation hooks

/**
 * Creates a parallax effect derived from scroll position
 */
export function useParallaxDerived(
  scrollY: SharedValue<number>,
  factor: number = 0.5,
  bounds?: { min?: number; max?: number }
) {
  return useDerivedAnimation(
    () => scrollY.value * factor,
    { dependencies: [scrollY, factor], bounds }
  );
}

/**
 * Creates a fade effect based on distance from a reference point
 */
export function useFadeDerived(
  position: SharedValue<number>,
  fadeDistance: number,
  fadeStart: number = 0
) {
  return useDerivedAnimation(
    () => {
      const distance = Math.abs(position.value - fadeStart);
      return Math.max(0, 1 - distance / fadeDistance);
    },
    { 
      dependencies: [position, fadeDistance, fadeStart],
      bounds: { min: 0, max: 1 }
    }
  );
}

/**
 * Creates a scale effect based on progress between two values
 */
export function useScaleDerived(
  progress: SharedValue<number>,
  scaleRange: { min: number; max: number } = { min: 0.8, max: 1 },
  progressRange: { start: number; end: number } = { start: 0, end: 1 }
) {
  // Memoize config objects to maintain referential stability and prevent unnecessary worklet re-evaluations
  const memoScaleRange = useMemoizedDeps(scaleRange, ['min', 'max']);
  const memoProgressRange = useMemoizedDeps(progressRange, ['start', 'end']);

  return useDerivedAnimation(
    () => {
      const { start, end } = memoProgressRange;
      const { min, max } = memoScaleRange;
      
      // Normalize progress to 0-1 range
      const normalizedProgress = Math.max(0, Math.min(1, 
        (progress.value - start) / (end - start)
      ));
      
      // Interpolate between min and max scale
      return min + (max - min) * normalizedProgress;
    },
    { 
      dependencies: [progress, memoScaleRange, memoProgressRange],
      bounds: { min: memoScaleRange.min, max: memoScaleRange.max }
    }
  );
}

/**
 * Creates a rotation effect that oscillates based on input value
 */
export function useRotationDerived(
  input: SharedValue<number>,
  intensity: number = 1,
  frequency: number = 1
) {
  return useDerivedAnimation(
    () => {
      return Math.sin(input.value * frequency) * intensity;
    },
    { 
      dependencies: [input, intensity, frequency],
      bounds: { min: -intensity, max: intensity }
    }
  );
}

/**
 * Combines multiple derived values with custom logic
 */
export function useCombinedDerived<T>(
  combineFn: () => T,
  dependencies: ReadonlyArray<any>,
  bounds?: { min?: number; max?: number }
) {
  return useDerivedAnimation(combineFn, { dependencies, bounds });
}

/**
 * Creates a spring-like derived value that smoothly follows a target
 */
export function useSpringDerived(
  target: SharedValue<number>,
  config: { damping?: number; stiffness?: number } = {}
) {
  const { damping = 15, stiffness = 300 } = config;
  const currentValue = useSharedValue(0);
  const velocity = useSharedValue(0);
  
  // Memoize config values to prevent unnecessary re-evaluations
  const memoDamping = useMemo(() => damping, [damping]);
  const memoStiffness = useMemo(() => stiffness, [stiffness]);
  
  const { derivedValue, getValue } = useDerivedAnimation(
    () => {
      // Simple spring physics simulation
      const displacement = target.value - currentValue.value;
      const springForce = displacement * memoStiffness;
      const dampingForce = velocity.value * memoDamping;
      
      velocity.value += (springForce - dampingForce) * 0.016; // 60fps delta
      currentValue.value += velocity.value * 0.016;
      
      return currentValue.value;
    },
    { dependencies: [target, memoDamping, memoStiffness] }
  );

  // Additional cleanup for the spring-specific shared values
  useAnimationCleanup({
    sharedValues: [currentValue, velocity],
  });

  return { derivedValue, getValue };
}
