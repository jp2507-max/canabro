import * as Haptics from '@/lib/utils/haptics';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import {
  generateCDNImageURL,
  IMAGE_CACHE_POLICY,
  IMAGE_TRANSITION_DURATION,
  PLACEHOLDER_BLUR_HASH,
} from '@/lib/utils/image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  cancelAnimation,
  runOnJS,
} from 'react-native-reanimated';
import { COMMUNITY_ANIMATION_CONFIG, COMMUNITY_SCALE_VALUES } from '@/lib/types/community';

import { OptimizedIcon } from '../ui/OptimizedIcon';

// Using shared animation configurations from community types
const ANIMATION_CONFIG = COMMUNITY_ANIMATION_CONFIG;
const SCALE_VALUES = COMMUNITY_SCALE_VALUES;

/**
 * Enhanced UserAvatar component with sophisticated press animations and error handling
 * Updated to use NativeWind v4 with automatic dark mode support
 */
export default function UserAvatar({
  uri,
  size = 40,
  verified = false,
  onPress,
  accessibilityLabel,
}: {
  uri: string;
  size?: number;
  verified?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  // 🖼️ Image Loading State Management
  const [imageError, setImageError] = useState(!uri || uri.trim() === '');

  // 🎬 Enhanced Animation System
  const scale = useSharedValue(1);
  const badgeScale = useSharedValue(1);
  const shadowOpacity = useSharedValue(0.1);

  const animatedContainerStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: scale.value }],
      shadowOpacity: shadowOpacity.value,
    };
  });

  const animatedBadgeStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: badgeScale.value }],
    };
  });

  // 🔄 Reset error state when URI changes
  useEffect(() => {
    setImageError(!uri || uri.trim() === '');
  }, [uri]);

  // ♻️ Cleanup animations on unmount
  useEffect(() => {
    return () => {
      cancelAnimation(scale);
      cancelAnimation(badgeScale);
      cancelAnimation(shadowOpacity);
    };
  }, []);

  // Define haptic feedback function outside of gesture handler
  const triggerPressHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  // 🎯 Enhanced Gesture Handlers
  const pressGesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(SCALE_VALUES.avatarPress, ANIMATION_CONFIG.scale);
      shadowOpacity.value = withSpring(0.2, ANIMATION_CONFIG.quick);
      if (verified) {
        badgeScale.value = withSpring(SCALE_VALUES.badgePressed, ANIMATION_CONFIG.scale);
      }
    })
    .onEnd(() => {
      'worklet';
      scale.value = withSpring(SCALE_VALUES.default, ANIMATION_CONFIG.scale);
      shadowOpacity.value = withSpring(0.1, ANIMATION_CONFIG.quick);
      if (verified) {
        badgeScale.value = withSpring(SCALE_VALUES.default, ANIMATION_CONFIG.scale);
      }
      if (onPress) {
        runOnJS(triggerPressHaptic)();
      }
    })
    .enabled(!!onPress);

  // 🎨 Fallback Avatar Component
  const FallbackAvatar = () => (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
      }}
      className="items-center justify-center border-2 border-white bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-700">
      <OptimizedIcon
        name="person"
        size={size * 0.5}
        color="#9ca3af"
        accessibilityLabel="Default avatar"
      />
    </View>
  );

  const AvatarContent = (
    <Animated.View
      style={[
        animatedContainerStyle,
        {
          shadowColor: '#10b981',
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 4,
          elevation: 2,
        },
      ]}
      className="relative">
      {imageError || !uri || uri.trim() === '' ? (
        <FallbackAvatar />
      ) : (
        <ExpoImage
          source={generateCDNImageURL(uri, 'thumbnail')}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
          }}
          className="border-2 border-white bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
          accessibilityRole="image"
          accessibilityLabel={accessibilityLabel || 'User avatar'}
          cachePolicy={IMAGE_CACHE_POLICY}
          transition={{ duration: IMAGE_TRANSITION_DURATION }}
          placeholder={{ blurhash: PLACEHOLDER_BLUR_HASH }}
          onError={() => setImageError(true)}
        />
      )}

      {verified && (
        <Animated.View
          style={[
            animatedBadgeStyle,
            {
              width: size / 3,
              height: size / 3,
            },
          ]}
          className="absolute bottom-0 right-0 items-center justify-center rounded-full border-2 border-white bg-primary-500 dark:border-zinc-700 dark:bg-primary-600">
          <OptimizedIcon
            name="checkmark"
            size={size / 5}
            color="white"
            accessibilityLabel="Verified user"
          />
        </Animated.View>
      )}
    </Animated.View>
  );

  // 🎯 Conditionally wrap with gesture detector if interactive
  if (onPress) {
    return <GestureDetector gesture={pressGesture}>{AvatarContent}</GestureDetector>;
  }

  return AvatarContent;
}
