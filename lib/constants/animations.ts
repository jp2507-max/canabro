/**
 * Shared Animation Constants - Eliminating duplicate ANIMATION_CONFIG objects
 * Centralized animation configurations for consistent behavior across components
 */

import type { WithSpringConfig, WithTimingConfig } from 'react-native-reanimated';

// Spring animation configurations
export const SPRING_CONFIGS = {
  // Quick, snappy animations for buttons and interactive elements
  button: { damping: 12, stiffness: 500 } as WithSpringConfig,
  
  // Smooth card animations for post items and containers
  card: { damping: 15, stiffness: 400 } as WithSpringConfig,
  
  // Gentle animations for like/heart effects
  like: { damping: 8, stiffness: 300 } as WithSpringConfig,
  
  // Responsive image press animations
  image: { damping: 20, stiffness: 500 } as WithSpringConfig,
  
  // Quick feedback animations
  quick: { damping: 20, stiffness: 600 } as WithSpringConfig,
  
  // Segmented control indicators
  indicator: { damping: 20, stiffness: 400 } as WithSpringConfig,
  
  // Modal and overlay animations
  modal: { damping: 15, stiffness: 300 } as WithSpringConfig,
  
  // Staggered entrance animations
  stagger: { damping: 18, stiffness: 350 } as WithSpringConfig,
} as const;

// Timing animation configurations
export const TIMING_CONFIGS = {
  fast: { duration: 150 } as WithTimingConfig,
  medium: { duration: 250 } as WithTimingConfig,
  slow: { duration: 400 } as WithTimingConfig,
} as const;

// Scale values for consistent press animations
export const SCALE_VALUES = {
  cardPress: 0.98,
  buttonPress: 0.9,
  likePress: 0.85,
  imagePress: 0.99,
  likeActive: 1.1,
} as const;

// Combined configuration object for backward compatibility
export const ANIMATION_CONFIG = {
  card: SPRING_CONFIGS.card,
  button: SPRING_CONFIGS.button,
  like: SPRING_CONFIGS.like,
  image: SPRING_CONFIGS.image,
  quick: SPRING_CONFIGS.quick,
  indicator: SPRING_CONFIGS.indicator,
  modal: SPRING_CONFIGS.modal,
  stagger: SPRING_CONFIGS.stagger,
  timing: TIMING_CONFIGS,
  scales: SCALE_VALUES,
} as const;
