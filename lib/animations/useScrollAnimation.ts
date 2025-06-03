/**
 * 📜 useScrollAnimation Hook
 * 
 * Provides scroll-based animations for parallax effects, fade-ins,
 * and other scroll-driven interactions. Based on Reanimated v3 best practices.
 * 
 * 🚨 PERFORMANCE NOTE:
 * This hook properly memoizes config objects to prevent unnecessary worklet
 * re-evaluations that could cause GC churn and animation jank.
 */

import { useSharedValue, useAnimatedStyle, useAnimatedScrollHandler, useDerivedValue, SharedValue } from 'react-native-reanimated';
import { useMemo } from 'react';
import { useAnimationCleanup } from './useAnimationCleanup';
import { SPRING_CONFIGS } from './presets';

interface UseScrollAnimationConfig {
  // Parallax effect configuration
  parallaxFactor?: number;
  
  // Fade animation configuration
  fadeDistance?: number;
  fadeStartOffset?: number;
  
  // Scale animation configuration
  scaleRange?: { min: number; max: number };
  scaleDistance?: number;
  
  // Transform bounds
  bounds?: {
    min?: number;
    max?: number;
  };
  
  // Whether to invert scroll direction
  inverted?: boolean;
}

export function useScrollAnimation(config: UseScrollAnimationConfig = {}) {
  const {
    parallaxFactor = 0.5,
    fadeDistance = 100,
    fadeStartOffset = 0,
    scaleRange = { min: 0.8, max: 1 },
    scaleDistance = 200,
    bounds,
    inverted = false,
  } = config;
  // Memoize scaleRange to prevent unnecessary worklet re-evaluations
  // Objects are compared by reference, so recreating them on every render
  // would cause useDerivedValue worklets to be torn down and recreated
  const memoScaleRange = useMemo(
    () => scaleRange,
    [scaleRange.min, scaleRange.max]
  );

  // Validate bounds configuration
  if (bounds?.min !== undefined && bounds?.max !== undefined && bounds.min > bounds.max) {
    console.warn('useScrollAnimation: bounds.min cannot be greater than bounds.max');
  }

  // Core scroll shared value
  const scrollY = useSharedValue(0);
  
  // Derived values for performance optimization
  const parallaxTranslateY = useDerivedValue(() => {
    const factor = inverted ? -parallaxFactor : parallaxFactor;
    const value = scrollY.value * factor;
    
    if (bounds) {
      if (bounds.min !== undefined && value < bounds.min) return bounds.min;
      if (bounds.max !== undefined && value > bounds.max) return bounds.max;
    }
    
    return value;
  });

  const fadeOpacity = useDerivedValue(() => {
    const progress = (scrollY.value - fadeStartOffset) / fadeDistance;
    const opacity = inverted ? progress : 1 - progress;
    return Math.max(0, Math.min(1, opacity));
  });  const scaleValue = useDerivedValue(() => {
    const progress = Math.min(1, scrollY.value / scaleDistance);
    // Use memoized scaleRange to maintain referential stability
    const scale = memoScaleRange.min + (memoScaleRange.max - memoScaleRange.min) * (inverted ? 1 - progress : progress);
    return Math.max(memoScaleRange.min, Math.min(memoScaleRange.max, scale));
  });

  // Setup cleanup for all shared values
  useAnimationCleanup({
    sharedValues: [scrollY, parallaxTranslateY, fadeOpacity, scaleValue],
  });

  // Scroll handler
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Pre-built animated styles
  const parallaxStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: parallaxTranslateY.value }],
  }));

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fadeOpacity.value,
  }));

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  const combinedStyle = useAnimatedStyle(() => ({
    opacity: fadeOpacity.value,
    transform: [
      { translateY: parallaxTranslateY.value },
      { scale: scaleValue.value },
    ],
  }));

  return {
    // Scroll handler for ScrollView/FlatList
    scrollHandler,
    
    // Raw shared values for custom usage
    scrollY,
    parallaxTranslateY,
    fadeOpacity,
    scaleValue,
    
    // Pre-built animated styles
    styles: {
      parallax: parallaxStyle,
      fade: fadeStyle,
      scale: scaleStyle,
      combined: combinedStyle,
    },
    
    // Utility functions
    utils: {
      // Get current scroll position
      getCurrentScrollY: () => scrollY.value,
      
      // Check if scrolled past threshold
      isScrolledPast: (threshold: number) => scrollY.value > threshold,
    },
  };
}

/**
 * 🎭 Preset scroll animations for common patterns
 */
export const SCROLL_ANIMATION_PRESETS = {
  // Hero section parallax
  heroParallax: {
    parallaxFactor: 0.3,
    fadeDistance: 150,
    scaleRange: { min: 1, max: 1.1 },
  },
  
  // Card list fade-in
  cardFadeIn: {
    fadeDistance: 100,
    fadeStartOffset: 50,
    scaleRange: { min: 0.95, max: 1 },
    scaleDistance: 100,
  },
  
  // Header collapse
  headerCollapse: {
    fadeDistance: 80,
    inverted: true,
    bounds: { min: 0, max: 80 },
  },
  
  // Image zoom out
  imageZoomOut: {
    scaleRange: { min: 0.8, max: 1 },
    scaleDistance: 200,
    inverted: true,
  },
} as const;

/**
 * 🚀 Quick preset hook
 */
export function useScrollAnimationPreset(preset: keyof typeof SCROLL_ANIMATION_PRESETS) {
  return useScrollAnimation(SCROLL_ANIMATION_PRESETS[preset]);
}
