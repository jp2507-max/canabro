import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  interpolateColor as rInterpolateColor,
} from 'react-native-reanimated';

// Animation configurations
const SHIMMER_CONFIG = {
  duration: 1200,
  easing: Easing.bezier(0.4, 0, 0.6, 1),
};

const STAGGER_DELAY = 150;

export function StrainSkeletonItem({ index = 0 }: { index?: number }) {
  // Animation values for shimmer effect
  const shimmerProgress = useSharedValue(0);
  const itemScale = useSharedValue(0.95);
  const itemOpacity = useSharedValue(0);

  useEffect(() => {
    // Staggered entrance animation
    const entranceDelay = index * STAGGER_DELAY;

    itemOpacity.value = withDelay(entranceDelay, withTiming(1, { duration: 300 }));

    itemScale.value = withDelay(
      entranceDelay,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.back(1.2)) })
    );

    // Enhanced shimmer animation
    shimmerProgress.value = withDelay(
      entranceDelay,
      withRepeat(
        withSequence(withTiming(1, SHIMMER_CONFIG), withTiming(0, SHIMMER_CONFIG)),
        -1, // Infinite repeat
        false // Don't reverse
      )
    );
  }, [index]);

  // Enhanced shimmer animated style
  const shimmerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = 0.3 + shimmerProgress.value * 0.4; // More pronounced shimmer

    // Shimmer color interpolation for better dark mode support
    const shimmerColor = rInterpolateColor(
      shimmerProgress.value,
      [0, 0.5, 1],
      [
        'rgba(229, 229, 229, 0.8)', // neutral-200 with opacity
        'rgba(255, 255, 255, 0.9)', // bright shimmer peak
        'rgba(229, 229, 229, 0.8)', // back to neutral-200
      ]
    );

    return {
      opacity,
      backgroundColor: shimmerColor,
    };
  });

  // Dark mode shimmer for better contrast
  const darkShimmerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = 0.4 + shimmerProgress.value * 0.3;

    const shimmerColor = rInterpolateColor(
      shimmerProgress.value,
      [0, 0.5, 1],
      [
        'rgba(64, 64, 64, 0.8)', // neutral-700 with opacity
        'rgba(115, 115, 115, 0.9)', // lighter shimmer peak (neutral-500)
        'rgba(64, 64, 64, 0.8)', // back to neutral-700
      ]
    );

    return {
      opacity,
      backgroundColor: shimmerColor,
    };
  });

  // Container entrance animation
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: itemScale.value }],
    opacity: itemOpacity.value,
  }));

  return (
    <Animated.View
      style={containerAnimatedStyle}
      className="flex-row items-center border-b border-neutral-200 p-3 dark:border-neutral-700">
      {/* Avatar placeholder with enhanced shimmer */}
      <View className="mr-3 h-10 w-10 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
        <Animated.View style={shimmerAnimatedStyle} className="h-full w-full dark:hidden" />
        <Animated.View
          style={darkShimmerAnimatedStyle}
          className="hidden h-full w-full dark:block"
        />
      </View>

      {/* Text content placeholders */}
      <View className="flex-1">
        {/* Title placeholder */}
        <View className="mb-2 h-4 w-3/4 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-700">
          <Animated.View
            style={[shimmerAnimatedStyle, { width: '100%', height: '100%' }]}
            className="dark:hidden"
          />
          <Animated.View
            style={[darkShimmerAnimatedStyle, { width: '100%', height: '100%' }]}
            className="hidden dark:block"
          />
        </View>

        {/* Subtitle placeholder */}
        <View className="h-3 w-1/2 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-700">
          <Animated.View
            style={[shimmerAnimatedStyle, { width: '100%', height: '100%' }]}
            className="dark:hidden"
          />
          <Animated.View
            style={[darkShimmerAnimatedStyle, { width: '100%', height: '100%' }]}
            className="hidden dark:block"
          />
        </View>
      </View>

      {/* Action indicator placeholder */}
      <View className="ml-3 h-6 w-6 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-700">
        <Animated.View style={shimmerAnimatedStyle} className="h-full w-full dark:hidden" />
        <Animated.View
          style={darkShimmerAnimatedStyle}
          className="hidden h-full w-full dark:block"
        />
      </View>
    </Animated.View>
  );
}

// Multiple skeleton items for lists
export function StrainSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <StrainSkeletonItem key={index} index={index} />
      ))}
    </>
  );
}
