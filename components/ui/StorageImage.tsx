import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
} from 'react-native-reanimated';

import { OptimizedIcon, IconName } from './OptimizedIcon';
import ThemedText from './ThemedText';

interface StorageImageProps {
  url: string | null;
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  fallbackIconName?: IconName;
  fallbackIconSize?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  enableRetry?: boolean;
  showProgress?: boolean;
  enableHaptics?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * A production-ready component for loading images from Supabase Storage with:
 * - Smooth fade-in animations using Reanimated v3
 * - Enhanced loading states with progress indicators
 * - Error state with retry functionality
 * - Haptic feedback for interactions
 * - NativeWind v4 automatic theming
 */
export default function StorageImage({
  url,
  width = '100%',
  height = '100%',
  borderRadius = 0,
  contentFit = 'cover',
  fallbackIconName = 'image-outline',
  fallbackIconSize = 30,
  onPress,
  accessibilityLabel = 'Image',
  enableRetry = true,
  showProgress = true,
  enableHaptics = true,
}: StorageImageProps) {
  // State management
  const [isLoading, setIsLoading] = useState(!!url);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Animation values
  const imageOpacity = useSharedValue(0);
  const placeholderOpacity = useSharedValue(1);
  const errorShake = useSharedValue(0);
  const loadingRotation = useSharedValue(0);
  const retryScale = useSharedValue(1);

  // Handle URL changes - reset state and animations
  useEffect(() => {
    setHasError(false);
    setIsLoading(!!url);
    setRetryCount(0);

    // Reset animations
    imageOpacity.value = 0;
    placeholderOpacity.value = 1;
    errorShake.value = 0;
  }, [url, imageOpacity, placeholderOpacity, errorShake]);

  // Loading rotation animation
  useEffect(() => {
    if (isLoading && !hasError) {
      loadingRotation.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1,
        false
      );
    }
  }, [isLoading, hasError, loadingRotation]);

  // Generate cache-busting URL
  const getProcessedUrl = (originalUrl: string | null) => {
    if (!originalUrl) return null;
    const separator = originalUrl.includes('?') ? '&' : '?';
    return `${originalUrl}${separator}t=${Date.now()}&retry=${retryCount}`;
  };

  // Handle successful image load
  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);

    // Fade in image, fade out placeholder
    imageOpacity.value = withTiming(1, { duration: 300 });
    placeholderOpacity.value = withTiming(0, { duration: 300 });
  };

  // Handle image error
  const handleImageError = (error: any) => {
    console.error(`Error loading image: ${url}`, error);
    setIsLoading(false);
    setHasError(true);

    // Error shake animation
    errorShake.value = withSequence(
      withTiming(-5, { duration: 50 }),
      withTiming(5, { duration: 50 }),
      withTiming(-3, { duration: 50 }),
      withTiming(3, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );

    // Keep placeholder visible
    placeholderOpacity.value = withTiming(1, { duration: 200 });
  };

  // Retry loading
  const handleRetry = () => {
    if (!enableRetry || retryCount >= 3) return;

    if (enableHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Retry animation
    retryScale.value = withTiming(0.9, { duration: 100 }, () => {
      retryScale.value = withTiming(1, { duration: 200 });
    });

    setRetryCount((prev) => prev + 1);
    setHasError(false);
    setIsLoading(true);
    imageOpacity.value = 0;
    placeholderOpacity.value = 1;
  };

  // Animated styles
  const imageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
  }));

  const placeholderAnimatedStyle = useAnimatedStyle(() => ({
    opacity: placeholderOpacity.value,
    transform: [{ translateX: errorShake.value }, { scale: retryScale.value }],
  }));

  const loadingAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${loadingRotation.value}deg`,
      },
    ],
  }));

  // Render loading indicator
  const renderLoadingIndicator = () => (
    <View className="h-full w-full items-center justify-center">
      <Animated.View style={loadingAnimatedStyle}>
        <ActivityIndicator size="small" className="text-primary-500" />
      </Animated.View>
      {showProgress && retryCount > 0 && (
        <ThemedText
          variant="caption"
          className="mt-2 text-center text-neutral-500 dark:text-neutral-400">
          Retry {retryCount}/3
        </ThemedText>
      )}
    </View>
  );

  // Render error state
  const renderErrorState = () => (
    <View className="h-full w-full items-center justify-center p-2">
      <OptimizedIcon
        name="warning-outline"
        size={fallbackIconSize}
        className="text-status-danger mb-2"
      />
      {enableRetry && retryCount < 3 ? (
        <Pressable
          onPress={handleRetry}
          className="rounded bg-primary-500 px-2 py-1"
          accessibilityRole="button"
          accessibilityLabel="Retry loading image">
          <ThemedText className="text-xs font-medium text-white">Retry</ThemedText>
        </Pressable>
      ) : (
        <ThemedText
          variant="caption"
          className="text-center text-neutral-500 dark:text-neutral-400">
          Failed to load
        </ThemedText>
      )}
    </View>
  );

  // Render fallback for no URL
  const renderFallback = () => (
    <View className="h-full w-full items-center justify-center">
      <OptimizedIcon
        name={fallbackIconName}
        size={fallbackIconSize}
        className="text-neutral-600 dark:text-neutral-400"
      />
    </View>
  );

  // Main component render
  const containerContent = (
    <View
      style={{
        width: width as any,
        height: height as any,
        borderRadius,
      }}
      className="relative overflow-hidden bg-neutral-200 dark:bg-neutral-800">
      {/* Image layer */}
      {url && (
        <Animated.View
          style={[{ position: 'absolute', width: '100%', height: '100%' }, imageAnimatedStyle]}>
          <Image
            source={{ uri: getProcessedUrl(url) || undefined }}
            style={{ width: '100%', height: '100%' }}
            contentFit={contentFit}
            accessibilityLabel={accessibilityLabel}
            transition={200}
            cachePolicy="memory-disk"
            onLoadStart={() => setIsLoading(true)}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </Animated.View>
      )}

      {/* Placeholder/Loading/Error overlay */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          },
          placeholderAnimatedStyle,
        ]}>
        {!url
          ? renderFallback()
          : isLoading
            ? renderLoadingIndicator()
            : hasError
              ? renderErrorState()
              : null}
      </Animated.View>
    </View>
  );

  // Wrap in pressable if onPress provided
  if (onPress) {
    return (
      <AnimatedPressable
        onPress={() => {
          if (enableHaptics) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel}, tap to open`}>
        {containerContent}
      </AnimatedPressable>
    );
  }

  return containerContent;
}
