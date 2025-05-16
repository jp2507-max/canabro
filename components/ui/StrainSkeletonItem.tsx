import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../lib/contexts/ThemeContext'; // Adjust path as needed

export function StrainSkeletonItem() {
  const { isDarkMode } = useTheme();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1, // Infinite repeat
      true // Reverse animation
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const placeholderBg = isDarkMode ? 'bg-neutral-700' : 'bg-neutral-200';

  return (
    <View className="flex-row items-center p-3 border-b border-neutral-200 dark:border-neutral-700">
      <Animated.View
        style={animatedStyle}
        className={`w-10 h-10 rounded-full mr-3 ${placeholderBg}`}
      />
      <View className="flex-1">
        <Animated.View
          style={animatedStyle}
          className={`h-4 w-3/4 rounded mb-2 ${placeholderBg}`}
        />
        <Animated.View
          style={animatedStyle}
          className={`h-3 w-1/2 rounded ${placeholderBg}`}
        />
      </View>
    </View>
  );
}
