import * as Haptics from 'expo-haptics';
import { useColorScheme } from 'nativewind';
import React from 'react';
import { Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
  interpolateColor as rInterpolateColor,
} from 'react-native-reanimated';

import { OptimizedIcon } from './OptimizedIcon';

interface ThemeToggleProps {
  showLabel?: boolean;
  compact?: boolean;
}

// Animation configurations
const SPRING_CONFIG = { damping: 15, stiffness: 200 };
const ICON_ROTATION = { light: 0, dark: 180 };
const SCALE_VALUES = { pressed: 0.95, default: 1 };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ThemeToggle({ showLabel = true, compact = false }: ThemeToggleProps) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  // Animation values
  const iconRotation = useSharedValue(isDarkMode ? ICON_ROTATION.dark : ICON_ROTATION.light);
  const iconScale = useSharedValue(1);
  const containerScale = useSharedValue(1);
  const backgroundProgress = useSharedValue(isDarkMode ? 1 : 0);

  // Update animations when theme changes
  React.useEffect(() => {
    iconRotation.value = withSpring(
      isDarkMode ? ICON_ROTATION.dark : ICON_ROTATION.light,
      SPRING_CONFIG
    );
    backgroundProgress.value = withSpring(isDarkMode ? 1 : 0, SPRING_CONFIG);
  }, [isDarkMode]);

  const toggleTheme = React.useCallback(() => {
    // Context-aware haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Icon bounce animation
    iconScale.value = withSequence(
      withTiming(1.2, { duration: 150 }),
      withSpring(1, SPRING_CONFIG)
    );

    setColorScheme(isDarkMode ? 'light' : 'dark');
  }, [isDarkMode, setColorScheme]);

  // Gesture handlers
  const toggleGesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      containerScale.value = withTiming(SCALE_VALUES.pressed, { duration: 100 });
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onFinalize(() => {
      'worklet';
      containerScale.value = withSpring(SCALE_VALUES.default, SPRING_CONFIG);
      runOnJS(toggleTheme)();
    });

  // Animated styles
  const containerAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = rInterpolateColor(
      backgroundProgress.value,
      [0, 1],
      ['rgb(245, 245, 245)', 'rgb(38, 38, 38)'] // neutral-100 to neutral-800
    );

    return {
      transform: [{ scale: containerScale.value }],
      backgroundColor,
    };
  });

  const iconContainerAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = rInterpolateColor(
      backgroundProgress.value,
      [0, 1],
      ['rgb(229, 229, 229)', 'rgb(34, 197, 94)'] // neutral-200 to primary-600
    );

    return {
      backgroundColor,
    };
  });

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${iconRotation.value}deg` }, { scale: iconScale.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => {
    const color = rInterpolateColor(
      backgroundProgress.value,
      [0, 1],
      ['rgb(38, 38, 38)', 'rgb(255, 255, 255)'] // neutral-800 to white
    );

    return { color };
  });

  const sizeClasses = compact ? 'p-1' : 'p-2';
  const iconSizeClasses = compact ? 'h-8 w-8' : 'h-10 w-10';
  const iconSize = compact ? 16 : 20;
  const textSizeClasses = compact ? 'text-sm' : 'text-base';

  return (
    <GestureDetector gesture={toggleGesture}>
      <AnimatedPressable
        style={containerAnimatedStyle}
        className={`flex-row items-center ${sizeClasses} rounded-full transition-colors`}
        accessibilityRole="switch"
        accessibilityState={{ checked: isDarkMode }}
        accessibilityLabel="Toggle dark mode"
        accessibilityHint="Switches between light and dark themes">
        <Animated.View
          style={iconContainerAnimatedStyle}
          className={`${iconSizeClasses} items-center justify-center rounded-full transition-colors`}>
          <Animated.View style={iconAnimatedStyle}>
            <OptimizedIcon
              name={isDarkMode ? 'moon' : 'sun'}
              size={iconSize}
              className={isDarkMode ? 'text-white' : 'text-primary-600'}
            />
          </Animated.View>
        </Animated.View>

        {showLabel && (
          <Animated.Text
            style={textAnimatedStyle}
            className={`ml-2 ${textSizeClasses} font-medium transition-colors`}>
            {isDarkMode ? 'Dark' : 'Light'}
          </Animated.Text>
        )}
      </AnimatedPressable>
    </GestureDetector>
  );
}

export default ThemeToggle;
