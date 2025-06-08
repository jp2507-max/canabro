/**
 * 🃏 useCardAnimation Hook
 *
 * Provides the standard card animation pattern extracted from the excellent
 * strains screen implementation. Creates smooth, professional card interactions.
 */

import * as Haptics from 'expo-haptics';
import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';

import { ANIMATION_PRESETS, SHADOW_VALUES, SPRING_CONFIGS } from './presets';
import { useAnimationCleanup } from './useAnimationCleanup';

interface UseCardAnimationConfig {
  // Override default scale values
  pressedScale?: number;
  defaultScale?: number;

  // Shadow configuration
  enableShadowAnimation?: boolean;
  customShadowValues?: {
    light: { default: number; pressed: number };
    dark: { default: number; pressed: number };
  };

  // Haptic feedback
  enableHaptics?: boolean;
  hapticStyle?: 'light' | 'medium' | 'heavy';

  // Callbacks
  onPress?: () => void;
  onPressStart?: () => void;
  onPressEnd?: () => void;
}

export function useCardAnimation(config: UseCardAnimationConfig = {}) {
  // Configuration with defaults
  const {
    pressedScale = ANIMATION_PRESETS.strainCard.scale,
    defaultScale = 1,
    enableShadowAnimation = true,
    customShadowValues,
    enableHaptics = false,
    hapticStyle = 'light',
    onPress,
    onPressStart,
    onPressEnd,
  } = config;

  // Get current theme for theme-aware shadows
  const { colorScheme } = useColorScheme();

  // Helper function to get current shadow values based on live theme state
  const getCurrentShadowValues = () => {
    const isDarkMode = colorScheme === 'dark';

    const defaultShadow = customShadowValues
      ? isDarkMode
        ? customShadowValues.dark.default
        : customShadowValues.light.default
      : isDarkMode
        ? ANIMATION_PRESETS.strainCard.shadowDark
        : ANIMATION_PRESETS.strainCard.shadowLight;

    // For pressed state, ensure higher opacity for better visibility
    // Dark mode needs higher values for visibility, light mode needs moderate increase
    const pressedShadow = customShadowValues
      ? isDarkMode
        ? customShadowValues.dark.pressed
        : customShadowValues.light.pressed
      : isDarkMode
        ? SHADOW_VALUES.dark.elevated
        : SHADOW_VALUES.light.elevated;

    return { defaultShadow, pressedShadow };
  };

  // Shared values for smooth animations - initialize with correct theme values
  const scale = useSharedValue(defaultScale);
  const shadowOpacity = useSharedValue(getCurrentShadowValues().defaultShadow);

  // React to theme changes and update shadow values accordingly
  useEffect(() => {
    if (enableShadowAnimation) {
      const { defaultShadow } = getCurrentShadowValues();
      shadowOpacity.value = withSpring(defaultShadow, SPRING_CONFIGS.gentle);
    }
  }, [colorScheme, customShadowValues, enableShadowAnimation]);

  // Trigger haptic feedback
  const triggerHaptics = () => {
    if (!enableHaptics) return;

    const hapticMap = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
    };

    Haptics.impactAsync(hapticMap[hapticStyle]);
  };

  // Animation style
  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const style: any = {
      transform: [{ scale: scale.value }],
    };

    if (enableShadowAnimation) {
      style.shadowOpacity = shadowOpacity.value;
    }

    return style;
  });

  // Press handlers
  const handlePressIn = () => {
    scale.value = withSpring(pressedScale, SPRING_CONFIGS.smooth);

    if (enableShadowAnimation) {
      const { pressedShadow } = getCurrentShadowValues();
      shadowOpacity.value = withSpring(pressedShadow, SPRING_CONFIGS.smooth);
    }

    if (enableHaptics) {
      runOnJS(triggerHaptics)();
    }

    if (onPressStart) {
      runOnJS(onPressStart)();
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(defaultScale, SPRING_CONFIGS.smooth);

    if (enableShadowAnimation) {
      const { defaultShadow } = getCurrentShadowValues();
      shadowOpacity.value = withSpring(defaultShadow, SPRING_CONFIGS.smooth);
    }

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
    sharedValues: [scale, shadowOpacity],
    autoCleanup: true,
  });

  return {
    // Animated style to apply to component
    animatedStyle,

    // Event handlers for Pressable
    handlers: {
      onPressIn: handlePressIn,
      onPressOut: handlePressOut,
      onPress: handlePress,
    },

    // Manual control (for gesture handlers)
    controls: {
      pressIn: handlePressIn,
      pressOut: handlePressOut,
      press: handlePress,
    },

    // Shared values for advanced usage
    sharedValues: {
      scale,
      shadowOpacity,
    },
  };
}
