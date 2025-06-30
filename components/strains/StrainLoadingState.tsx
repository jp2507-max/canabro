import React, { memo, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';

interface StrainLoadingStateProps {
  message?: string;
  showSkeletons?: boolean;
}

const SkeletonCard = memo(() => {
  const opacity = useSharedValue(0.3);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: opacity.value,
    };
  });

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.8, { duration: 1200 }), -1, true);
  }, []);

  return (
    <Animated.View
      style={animatedStyle}
      className="mx-4 mb-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
      {/* Header skeleton */}
      <View className="mb-3 flex-row items-start justify-between">
        <View className="mr-3 flex-1">
          <View className="mb-2 h-6 w-3/4 rounded-md bg-neutral-200 dark:bg-neutral-700" />
          <View className="h-4 w-1/2 rounded-md bg-neutral-200 dark:bg-neutral-700" />
        </View>
        <View className="h-10 w-10 rounded-full bg-neutral-200 dark:bg-neutral-700" />
      </View>

      {/* THC/CBD skeleton */}
      <View className="mb-3 flex-row justify-between">
        <View className="mr-2 flex-1">
          <View className="mb-1 h-3 w-8 rounded-md bg-neutral-200 dark:bg-neutral-700" />
          <View className="h-4 w-12 rounded-md bg-neutral-200 dark:bg-neutral-700" />
        </View>
        <View className="ml-2 flex-1">
          <View className="mb-1 h-3 w-8 rounded-md bg-neutral-200 dark:bg-neutral-700" />
          <View className="h-4 w-12 rounded-md bg-neutral-200 dark:bg-neutral-700" />
        </View>
      </View>

      {/* Effects skeleton */}
      <View className="mb-3">
        <View className="mb-1 h-3 w-16 rounded-md bg-neutral-200 dark:bg-neutral-700" />
        <View className="h-4 w-full rounded-md bg-neutral-200 dark:bg-neutral-700" />
      </View>

      {/* Description skeleton */}
      <View className="space-y-2">
        <View className="h-4 w-full rounded-md bg-neutral-200 dark:bg-neutral-700" />
        <View className="h-4 w-5/6 rounded-md bg-neutral-200 dark:bg-neutral-700" />
        <View className="h-4 w-4/6 rounded-md bg-neutral-200 dark:bg-neutral-700" />
      </View>
    </Animated.View>
  );
});

SkeletonCard.displayName = 'SkeletonCard';

const StrainLoadingState = memo<StrainLoadingStateProps>(
  ({ message = 'Loading strains...', showSkeletons = true }) => {
    if (showSkeletons) {
      return (
        <View className="flex-1">
          {/* Search skeleton */}
          <View className="px-4 pb-3">
            <View className="h-12 rounded-xl border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800" />
          </View>

          {/* Strain cards skeletons */}
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={`skeleton-${index}`} />
          ))}
        </View>
      );
    }

    return (
      <ThemedView className="pt-safe flex-1 items-center justify-center px-4">
        <ActivityIndicator size="large" className="mb-4 text-primary-500 dark:text-primary-400" />
        <ThemedText
          variant="muted"
          className="text-center text-lg"
          accessible
          accessibilityLabel={message}>
          {message}
        </ThemedText>
      </ThemedView>
    );
  }
);

StrainLoadingState.displayName = 'StrainLoadingState';

export default StrainLoadingState;
