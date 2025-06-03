import React, { memo, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming
} from 'react-native-reanimated';
import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';

interface StrainLoadingStateProps {
  message?: string;
  showSkeletons?: boolean;
}

const SkeletonCard = memo(() => {
  const opacity = useSharedValue(0.3);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.8, { duration: 1200 }),
      -1,
      true
    );
  }, []);

  return (
    <Animated.View 
      style={animatedStyle}
      className="mx-4 mb-4 bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700"
    >
      {/* Header skeleton */}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1 mr-3">
          <View className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded-md mb-2 w-3/4" />
          <View className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded-md w-1/2" />
        </View>
        <View className="w-10 h-10 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
      </View>

      {/* THC/CBD skeleton */}
      <View className="flex-row justify-between mb-3">
        <View className="flex-1 mr-2">
          <View className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded-md mb-1 w-8" />
          <View className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded-md w-12" />
        </View>
        <View className="flex-1 ml-2">
          <View className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded-md mb-1 w-8" />
          <View className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded-md w-12" />
        </View>
      </View>

      {/* Effects skeleton */}
      <View className="mb-3">
        <View className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded-md mb-1 w-16" />
        <View className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded-md w-full" />
      </View>

      {/* Description skeleton */}
      <View className="space-y-2">
        <View className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded-md w-full" />
        <View className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded-md w-5/6" />
        <View className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded-md w-4/6" />
      </View>
    </Animated.View>
  );
});

SkeletonCard.displayName = 'SkeletonCard';

const StrainLoadingState = memo<StrainLoadingStateProps>(({ 
  message = 'Loading strains...', 
  showSkeletons = true 
}) => {
  if (showSkeletons) {
    return (
      <View className="flex-1">
        {/* Search skeleton */}
        <View className="px-4 pb-3">
          <View className="h-12 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700" />
        </View>

        {/* Strain cards skeletons */}
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonCard key={`skeleton-${index}`} />
        ))}
      </View>
    );
  }

  return (
    <ThemedView className="flex-1 items-center justify-center pt-safe px-4">
      <ActivityIndicator 
        size="large" 
        className="text-primary-500 dark:text-primary-400 mb-4" 
      />
      <ThemedText 
        variant="muted" 
        className="text-center text-lg"
        accessible={true}
        accessibilityLabel={message}
      >
        {message}
      </ThemedText>
    </ThemedView>
  );
});

StrainLoadingState.displayName = 'StrainLoadingState';

export default StrainLoadingState;
