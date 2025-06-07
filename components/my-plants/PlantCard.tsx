import * as Haptics from 'expo-haptics';
import { Image as ExpoImage } from 'expo-image';
import React from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  SharedTransition,
} from 'react-native-reanimated';

import { OptimizedIcon } from '../ui/OptimizedIcon';
import ThemedText from '../ui/ThemedText';

const placeholderImageSource = require('../../assets/images/placeholder.png');

export interface Plant {
  id: string;
  name: string;
  strainName: string;
  imageUrl: string;
  healthPercentage: number;
  nextWateringDays: number;
  nextNutrientDays: number;
}

interface PlantCardProps {
  plant: Plant;
  onPress?: (plantId: string) => void;
}

const StyledReanimatedImage = Animated.createAnimatedComponent(ExpoImage);

// Custom transition for smoother navigation effect
const customCardImageTransition = SharedTransition.custom((values) => {
  'worklet';
  return {
    height: withSpring(values.targetHeight),
    width: withSpring(values.targetWidth),
    originX: withSpring(values.targetOriginX),
    originY: withSpring(values.targetOriginY),
  };
});

export function PlantCard({ plant, onPress }: PlantCardProps) {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const shadowOpacity = useSharedValue(0.15);

  // Generate deterministic rotation based on plant ID
  const getRotationForPlant = (plantId: string): number => {
    // Simple hash function to generate deterministic "random" value
    let hash = 0;
    for (let i = 0; i < plantId.length; i++) {
      const char = plantId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Use hash to determine rotation direction and return consistent value
    return hash % 2 === 0 ? 1.5 : -1.5;
  };

  const tapRotation = plant?.id ? getRotationForPlant(plant.id) : 0;

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
      rotation.value = withSpring(tapRotation, { damping: 15, stiffness: 400 });
    })
    .onEnd(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      rotation.value = withSpring(0, { damping: 15, stiffness: 400 });
      if (onPress && plant?.id) {
        runOnJS(onPress)(plant.id);
      }
    })
    .onFinalize(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      rotation.value = withSpring(0, { damping: 15, stiffness: 400 });
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(350)
    .onBegin(() => {
      runOnJS(triggerHaptic)();
      scale.value = withSpring(1.05, { damping: 10, stiffness: 300 });
      shadowOpacity.value = withSpring(0.4, { damping: 10, stiffness: 300 });
    })
    .onEnd(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      shadowOpacity.value = withSpring(0.15, { damping: 15, stiffness: 400 });
    })
    .onFinalize(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      shadowOpacity.value = withSpring(0.15, { damping: 15, stiffness: 400 });
    });

  const composedGesture = Gesture.Exclusive(longPressGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }, { rotateZ: `${rotation.value}deg` }],
      shadowOpacity: shadowOpacity.value,
    };
  });

  if (!plant || typeof plant !== 'object') {
    console.warn('[PlantCard] Received invalid plant data:', plant);
    return null;
  }

  // Determine the image source more robustly
  const imageSourceToUse =
    typeof plant.imageUrl === 'string' && plant.imageUrl.trim() !== ''
      ? { uri: plant.imageUrl }
      : placeholderImageSource;

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        className="mx-4 mb-6 overflow-hidden rounded-3xl bg-white shadow-lg shadow-primary-500/20 dark:bg-zinc-900 dark:shadow-black/40"
        style={[
          animatedStyle,
          {
            // ✅ Enhanced shadow system with NativeWind v4 compatible styling
            shadowColor: '#16a34a', // primary-600 equivalent for light theme shadows
            shadowOffset: { width: 0, height: 8 },
            shadowRadius: 16,
            elevation: 8,
          },
        ]}>
        {/* Enhanced Image Container */}
        <View className="h-52 w-full overflow-hidden">
          <StyledReanimatedImage
            source={imageSourceToUse}
            style={{
              width: '100%',
              height: '100%',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
            }}
            contentFit="cover"
            accessibilityIgnoresInvertColors
            placeholder={placeholderImageSource}
            transition={300}
            sharedTransitionTag={`plantImage-${plant.id}`}
            sharedTransitionStyle={customCardImageTransition}
          />
        </View>

        {/* Enhanced Content Section */}
        <View className="px-6 py-5">
          {/* Enhanced Header Section */}
          <View className="mb-4 flex-row items-start justify-between">
            <View className="mr-3 flex-1">
              <ThemedText
                className="mb-1 text-2xl font-extrabold text-neutral-900 dark:text-white"
                style={{ letterSpacing: 0.2 }}
                numberOfLines={1}
                ellipsizeMode="tail">
                {plant.name}
              </ThemedText>
              <ThemedText
                className="text-base font-medium text-neutral-600 dark:text-neutral-400"
                numberOfLines={1}
                ellipsizeMode="tail">
                {plant.strainName}
              </ThemedText>
            </View>
            <View className="pt-1">
              <OptimizedIcon
                name="chevron-forward-outline"
                size={24}
                className="text-zinc-500 dark:text-zinc-400"
              />
            </View>
          </View>

          {/* Enhanced Stats Section */}
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-1 flex-row items-center justify-center rounded-xl bg-neutral-50 px-3.5 py-2.5 dark:bg-zinc-800">
              <OptimizedIcon name="heart-outline" size={18} className="text-primary-500" />
              <ThemedText className="ml-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                {plant.healthPercentage}%
              </ThemedText>
            </View>

            <View className="flex-1 flex-row items-center justify-center rounded-xl bg-neutral-50 px-3.5 py-2.5 dark:bg-zinc-800">
              <OptimizedIcon name="water-outline" size={18} className="text-primary-500" />
              <ThemedText className="ml-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                {plant.nextWateringDays}d
              </ThemedText>
            </View>

            <View className="flex-1 flex-row items-center justify-center rounded-xl bg-neutral-50 px-3.5 py-2.5 dark:bg-zinc-800">
              <OptimizedIcon name="leaf-outline" size={18} className="text-primary-500" />
              <ThemedText className="ml-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                {plant.nextNutrientDays}d
              </ThemedText>
            </View>
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}
