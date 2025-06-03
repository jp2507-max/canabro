/**
 * 🎬 Animation Presets and Configurations
 * 
 * Standardized animation configurations extracted from the excellent 
 * strains screen and PlantCard implementations.
 */

import { WithSpringConfig } from 'react-native-reanimated';
import { ImpactFeedbackStyle } from 'expo-haptics';

// 🚀 Spring Animation Configurations
export const SPRING_CONFIGS = {
  // Quick and responsive - for button presses
  quick: {
    damping: 15,
    stiffness: 400,
    mass: 0.5,
  } as WithSpringConfig,

  // Smooth and polished - for card interactions (from strains screen)
  smooth: {
    damping: 15,
    stiffness: 300,
    mass: 0.8,
  } as WithSpringConfig,

  // Bouncy and playful - for special interactions
  bouncy: {
    damping: 10,
    stiffness: 200,
    mass: 1,
  } as WithSpringConfig,

  // Gentle - for loading states and subtle animations
  gentle: {
    damping: 20,
    stiffness: 200,
    mass: 1.2,
  } as WithSpringConfig,
} as const;

// 🎯 Animation Scale Values (extracted from strains and PlantCard patterns)
export const SCALE_VALUES = {
  // Standard card press (from strains screen)
  cardPress: 0.97,
  
  // Subtle press for small elements
  buttonPress: 0.95,
  
  // Micro-interaction for tap feedback (from PlantCard)
  microPress: 0.98,
  
  // Emphasis for long press (from PlantCard)
  longPress: 1.05,
  
  // Slight bounce for completion states
  bounce: 1.02,
  
  // Default state
  default: 1,
} as const;

// 🌑 Shadow and Opacity Values
export const SHADOW_VALUES = {
  // Light theme shadows
  light: {
    default: 0.1,
    pressed: 0.15,
    elevated: 0.25,
    prominent: 0.3,
  },
  
  // Dark theme shadows
  dark: {
    default: 0.6,
    pressed: 0.4,
    elevated: 0.8,
    prominent: 0.9,
  },
} as const;

// 🎨 Rotation Values (micro-interactions from PlantCard)
export const ROTATION_VALUES = {
  subtle: 1.5,    // Degrees for subtle rotation
  none: 0,        // No rotation
} as const;

// ⏱️ Duration Values (in milliseconds)
export const DURATION_VALUES = {
  instant: 0,
  quick: 150,
  normal: 250,
  slow: 400,
  loading: 300,
} as const;

// 🎵 Haptic Feedback Types
export const HAPTIC_TYPES = {
  light: ImpactFeedbackStyle.Light,
  medium: ImpactFeedbackStyle.Medium,
  heavy: ImpactFeedbackStyle.Heavy,
} as const;

// 🎭 Animation Presets combining multiple values
export const ANIMATION_PRESETS = {
  // From strains screen StrainCard
  strainCard: {
    scale: SCALE_VALUES.cardPress,
    spring: SPRING_CONFIGS.smooth,
    shadowLight: SHADOW_VALUES.light.pressed,
    shadowDark: SHADOW_VALUES.dark.pressed,
  },
  
  // From PlantCard gesture system
  plantCard: {
    tap: {
      scale: SCALE_VALUES.microPress,
      rotation: ROTATION_VALUES.subtle,
      spring: SPRING_CONFIGS.quick,
    },
    longPress: {
      scale: SCALE_VALUES.longPress,
      spring: SPRING_CONFIGS.smooth,
      shadowLight: SHADOW_VALUES.light.prominent,
      shadowDark: SHADOW_VALUES.dark.prominent,
      haptic: HAPTIC_TYPES.medium,
    },
  },
  
  // Standard button interactions
  button: {
    scale: SCALE_VALUES.buttonPress,
    spring: SPRING_CONFIGS.quick,
    haptic: HAPTIC_TYPES.light,
  },
  
  // Loading state animations
  loading: {
    scale: 0.9,
    opacity: 0,
    spring: SPRING_CONFIGS.gentle,
    duration: DURATION_VALUES.loading,
  },
} as const;

// 🎪 Export types for TypeScript
export type SpringConfigKey = keyof typeof SPRING_CONFIGS;
export type ScaleValueKey = keyof typeof SCALE_VALUES;
export type AnimationPresetKey = keyof typeof ANIMATION_PRESETS;
