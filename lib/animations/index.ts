/**
 * 🎬 Animation System Exports
 * 
 * Centralized exports for the animation system based on strains screen patterns.
 */

// Core hooks
export { useCardAnimation } from './useCardAnimation';
export { useGestureAnimation } from './useGestureAnimation';
export { useButtonAnimation } from './useButtonAnimation';
export { useAnimationCleanup } from './useAnimationCleanup';
export { useScrollAnimation } from './useScrollAnimation';
export { useAnimationSequence, SEQUENCE_PRESETS } from './useAnimationSequence';

// New enhanced hooks
export { useDerivedAnimation } from './useDerivedAnimation';
export { useAdvancedGesture } from './useAdvancedGesture';

// Animation utilities
export { default as AnimationUtils } from './animationUtils';
export { 
  AnimationPerformance,
  AnimationPatterns,
  AnimationDebug,
  ValueTransformers,
  Easing,
  AnimationManager
} from './animationUtils';

// Components
export { AnimatedCard } from './AnimatedCard';

// Configuration and presets
export {
  SPRING_CONFIGS,
  SCALE_VALUES,
  SHADOW_VALUES,
  ROTATION_VALUES,
  DURATION_VALUES,
  HAPTIC_TYPES,
  ANIMATION_PRESETS,
  type SpringConfigKey,
  type ScaleValueKey,
  type AnimationPresetKey,
} from './presets';

// Re-export commonly used types
export type {
  WithSpringConfig,
  SharedValue,
  AnimatedStyle,
} from 'react-native-reanimated';
