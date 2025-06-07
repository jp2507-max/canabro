/**
 * 👆 useGestureAnimation Hook
 *
 * Advanced gesture-based animations extracted from the excellent PlantCard
 * implementation. Provides tap, long press, and micro-rotation animations.
 */

import * as Haptics from 'expo-haptics';
import { useColorScheme } from 'nativewind';
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';

import { ANIMATION_PRESETS, SHADOW_VALUES, SPRING_CONFIGS, ROTATION_VALUES } from './presets';
import { useAnimationCleanup } from './useAnimationCleanup';

interface UseGestureAnimationConfig {
  // Scale values
  tapScale?: number;
  longPressScale?: number;
  defaultScale?: number;

  // Rotation settings
  enableRotation?: boolean;
  rotationIntensity?: number;

  // Long press settings
  longPressDuration?: number;

  // Haptic feedback
  enableHaptics?: boolean;

  // Callbacks
  onTap?: () => void;
  onLongPress?: () => void;
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
}

export function useGestureAnimation(config: UseGestureAnimationConfig = {}) {
  const {
    tapScale = ANIMATION_PRESETS.plantCard.tap.scale,
    longPressScale = ANIMATION_PRESETS.plantCard.longPress.scale,
    defaultScale = 1,
    enableRotation = true,
    rotationIntensity = ROTATION_VALUES.subtle,
    longPressDuration = 350,
    enableHaptics = true,
    onTap,
    onLongPress,
    onGestureStart,
    onGestureEnd,
  } = config;

  // Get current theme for theme-aware shadows
  const { colorScheme } = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  // Theme-aware shadow values using presets
  const defaultShadow = isDarkMode ? SHADOW_VALUES.dark.default : SHADOW_VALUES.light.default;
  const prominentShadow = isDarkMode
    ? ANIMATION_PRESETS.plantCard.longPress.shadowDark
    : ANIMATION_PRESETS.plantCard.longPress.shadowLight;

  // Shared values
  const scale = useSharedValue(defaultScale);
  const rotation = useSharedValue(0);
  const shadowOpacity = useSharedValue(defaultShadow as number);

  // Haptic feedback
  const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (!enableHaptics) return;

    const hapticMap = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
    };

    Haptics.impactAsync(hapticMap[style]);
  };

  // Reset animations to default state
  const resetToDefault = () => {
    scale.value = withSpring(defaultScale, SPRING_CONFIGS.quick);
    rotation.value = withSpring(0, SPRING_CONFIGS.quick);
    shadowOpacity.value = withSpring(defaultShadow as number, SPRING_CONFIGS.quick);
  };

  // Tap gesture
  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      if (onGestureStart) runOnJS(onGestureStart)();

      scale.value = withSpring(tapScale, SPRING_CONFIGS.quick);

      if (enableRotation) {
        // Pre-compute random value on JS thread to avoid worklet issues
        const randomRotation = Math.random() > 0.5 ? rotationIntensity : -rotationIntensity;
        rotation.value = withSpring(randomRotation, SPRING_CONFIGS.quick);
      }
    })
    .onEnd(() => {
      resetToDefault();

      if (onTap) {
        runOnJS(onTap)();
      }

      if (onGestureEnd) runOnJS(onGestureEnd)();
    })
    .onFinalize(() => {
      // Ensure reset on cancellation
      resetToDefault();
    });

  // Long press gesture
  const longPressGesture = Gesture.LongPress()
    .minDuration(longPressDuration)
    .onBegin(() => {
      if (onGestureStart) runOnJS(onGestureStart)();
      runOnJS(triggerHaptic)('medium');

      scale.value = withSpring(longPressScale, SPRING_CONFIGS.smooth);
      shadowOpacity.value = withSpring(prominentShadow as number, SPRING_CONFIGS.smooth);
    })
    .onEnd(() => {
      resetToDefault();

      if (onLongPress) {
        runOnJS(onLongPress)();
      }

      if (onGestureEnd) runOnJS(onGestureEnd)();
    })
    .onFinalize(() => {
      resetToDefault();
    });

  // Composed gesture (exclusive - long press takes priority over tap)
  const composedGesture = Gesture.Exclusive(longPressGesture, tapGesture);

  // Animated style
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotateZ: `${rotation.value}deg` }],
    shadowOpacity: shadowOpacity.value,
  }));

  // Set up automatic cleanup for animations
  useAnimationCleanup({
    sharedValues: [scale, rotation, shadowOpacity],
    autoCleanup: true,
  });

  return {
    // Gesture to use with GestureDetector
    gesture: composedGesture,

    // Animated style to apply
    animatedStyle,

    // Individual gestures for custom composition
    gestures: {
      tap: tapGesture,
      longPress: longPressGesture,
    },

    // Manual controls
    controls: {
      reset: resetToDefault,
      triggerHaptic: (style?: 'light' | 'medium' | 'heavy') => runOnJS(triggerHaptic)(style),
    },

    // Shared values for advanced usage
    sharedValues: {
      scale,
      rotation,
      shadowOpacity,
    },
  };
}
