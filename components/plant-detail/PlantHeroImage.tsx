import * as Haptics from '@/lib/utils/haptics';
import { Image } from 'expo-image';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  SharedTransition,
  withSpring,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor as rInterpolateColor,
  runOnJS,
} from 'react-native-reanimated';

const AnimatedImage = Reanimated.createAnimatedComponent(Image);

interface PlantHeroImageProps {
  imageUrl: string | null | undefined;
  plantId: string;
  imageHeight?: number;
}

const DEFAULT_IMAGE_HEIGHT = 300;

// Helper function for processing URLs
const getProcessedUrl = (originalUrl: string | null | undefined): string | null => {
  if (!originalUrl) return null;
  // Return the URL as-is without cache-busting to prevent infinite renders
  return originalUrl;
};

// Enhanced custom transition with scale and spring physics
const customTransition = SharedTransition.custom((values) => {
  'worklet';
  return {
    height: withSpring(values.targetHeight, { damping: 20, stiffness: 200 }),
    width: withSpring(values.targetWidth, { damping: 20, stiffness: 200 }),
    originX: withSpring(values.targetOriginX, { damping: 25, stiffness: 300 }),
    originY: withSpring(values.targetOriginY, { damping: 25, stiffness: 300 }),
  };
});

export function PlantHeroImage({
  imageUrl,
  plantId,
  imageHeight = DEFAULT_IMAGE_HEIGHT,
}: PlantHeroImageProps) {
  const { t } = useTranslation('plants');
  const [imageLoadError, setImageLoadError] = useState(false);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);

  // Reanimated v3 shared values for gestures
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);
  const overlayOpacity = useSharedValue(0);

  // Process the URL when the component mounts or when imageUrl changes
  useEffect(() => {
    if (imageUrl) {
      const processed = getProcessedUrl(imageUrl);
      setProcessedUrl(processed);
      setImageLoadError(false); // Reset error state when URL changes
    } else {
      setProcessedUrl(null);
    }
  }, [imageUrl]);

  // Animated styles for gesture feedback
  const imageAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const overlayAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    const backgroundColor = rInterpolateColor(
      pressed.value,
      [0, 1],
      ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.2)']
    );

    return {
      backgroundColor,
      opacity: overlayOpacity.value,
    };
  });

  // Handle image press with modern gesture API
  const handleImagePress = useCallback(() => {
    if (imageLoadError || !processedUrl) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(t('noImage'), t('noImageAvailable'));
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // TODO: Add image viewer modal or navigation to edit screen
    Alert.alert(t('plantImage'), t('imageViewerComingSoon'));
  }, [imageLoadError, processedUrl, t]);

  // Modern tap gesture
  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
      pressed.value = withTiming(1, { duration: 150 });
      overlayOpacity.value = withTiming(1, { duration: 150 });
    })
    .onEnd(() => {
      'worklet';
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      pressed.value = withTiming(0, { duration: 200 });
      overlayOpacity.value = withTiming(0, { duration: 200 });

      // Execute callback on JS thread
      runOnJS(handleImagePress)();
    });

  // Determine the image source based on URL and load status
  const imageSource =
    imageLoadError || !processedUrl
  ? require('../../assets/placeholder.png')
      : { uri: processedUrl };

  // Debug logs removed to prevent terminal spam

  return (
    <GestureDetector gesture={tapGesture}>
      <View
        className="relative w-full overflow-hidden"
        style={{ height: imageHeight }}
        accessible
        accessibilityLabel={t('plantImageAccessibilityLabel', { plantId })}
        accessibilityRole="button"
        accessibilityHint={t('plantImageAccessibilityHint')}>
        <AnimatedImage
          source={imageSource}
          placeholder={require('../../assets/placeholder.png')}
          style={[
            {
              width: '100%',
              height: '100%',
            },
            imageAnimatedStyle,
          ]}
          contentFit="cover"
          transition={1000}
          sharedTransitionTag={`plantImage-${plantId}`}
          sharedTransitionStyle={customTransition}
          onLoad={(_e) => {
            // Image loaded successfully - console.log removed to prevent spam
          }}
          onError={(event: { nativeEvent?: { error?: string }; error?: string }) => {
            const err = event.nativeEvent?.error ?? event.error ?? 'unknown error';
            console.error('[PlantHeroImage] Image load error:', err);
            setImageLoadError(true);
          }}
        />

        {/* Gesture feedback overlay */}
        <Reanimated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            },
            overlayAnimatedStyle,
          ]}
          pointerEvents="none"
        />

        {/* Loading/error state indicator */}
        {imageLoadError && (
          <View className="absolute inset-0 items-center justify-center bg-neutral-200 dark:bg-neutral-700">
            <View className="items-center">
              <View className="mb-2 rounded-full bg-neutral-300 p-4 dark:bg-neutral-600">
                {/* Using a simple icon placeholder since OptimizedIcon might not be available */}
                <View className="h-8 w-8 rounded bg-neutral-400 dark:bg-neutral-500" />
              </View>
              <View className="rounded-full bg-neutral-100 px-3 py-1 dark:bg-neutral-800">
                <View className="h-4 w-20 rounded bg-neutral-300 dark:bg-neutral-600" />
              </View>
            </View>
          </View>
        )}
      </View>
    </GestureDetector>
  );
}
