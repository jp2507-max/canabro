/**
 * 🔘 useButtonAnimation Hook
 *
 * Standard button animation with quick response and optional haptic feedback.
 * Optimized for buttons, FABs, and interactive elements.
 */

import { ViewStyle } from 'react-native';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  SharedValue,
  AnimateStyle,
} from 'react-native-reanimated';

import { ANIMATION_PRESETS, SPRING_CONFIGS } from './presets';
import { useAnimationCleanup } from './useAnimationCleanup';
import { 
  triggerLightHapticSync,
  triggerMediumHapticSync,
  triggerHeavyHapticSync 
} from '../utils/haptics';

interface UseButtonAnimationConfig {
  // Scale values
  pressedScale?: number;
  defaultScale?: number;

  // Spring configuration
  springConfig?: typeof SPRING_CONFIGS.quick;

  // Haptic feedback
  enableHaptics?: boolean;
  hapticStyle?: 'light' | 'medium' | 'heavy';

  // Callbacks
  onPress?: () => void;
  onPressStart?: () => void;
  onPressEnd?: () => void;
}

export interface UseButtonAnimationReturn {
  animatedStyle: AnimateStyle<ViewStyle>;
  handlers: {
    onPressIn: () => void;
    onPressOut: () => void;
    onPress: () => void;
  };
  controls: {
    pressIn: () => void;
    pressOut: () => void;
    press: () => void;
  };
  sharedValues: { scale: SharedValue<number> };
}

export function useButtonAnimation(
  config: UseButtonAnimationConfig = {}
): UseButtonAnimationReturn {
  const {
    pressedScale = ANIMATION_PRESETS.button.scale,
    defaultScale = 1,
    springConfig = SPRING_CONFIGS.quick,
    enableHaptics = true,
    hapticStyle = 'light',
    onPress,
    onPressStart,
    onPressEnd,
  } = config;

  // Shared value for scale animation
  const scale = useSharedValue(defaultScale);

  // Haptic feedback
  const triggerHaptics = () => {
    if (!enableHaptics) return;

    switch (hapticStyle) {
      case 'light':
        triggerLightHapticSync();
        break;
      case 'medium':
        triggerMediumHapticSync();
        break;
      case 'heavy':
        triggerHeavyHapticSync();
        break;
    }
  };

  // Animated style
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Press handlers
  const handlePressIn = () => {
    scale.value = withSpring(pressedScale, springConfig);

    if (enableHaptics) {
      runOnJS(triggerHaptics)();
    }

    if (onPressStart) {
      runOnJS(onPressStart)();
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(defaultScale, springConfig);

    if (onPressEnd) {
      runOnJS(onPressEnd)();
    }
  };

  const handlePress = () => {
    if (onPress) {
      runOnJS(onPress)();
    }
  };
  // Set up automatic cleanup for animations
  useAnimationCleanup({
    sharedValues: [scale],
    autoCleanup: true,
  });

  return {
    // Animated style to apply to component
    animatedStyle,

    // Event handlers for Pressable/TouchableOpacity
    handlers: {
      onPressIn: handlePressIn,
      onPressOut: handlePressOut,
      onPress: handlePress,
    },

    // Manual controls
    controls: {
      pressIn: handlePressIn,
      pressOut: handlePressOut,
      press: handlePress,
    },

    // Shared values for advanced usage
    sharedValues: {
      scale,
    },
  };
}
