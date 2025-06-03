import { Image as ExpoImage } from 'expo-image';
import React from 'react';
import { View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  SharedTransition,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import ThemedText from '../ui/ThemedText';
import { useTheme } from '../../lib/contexts/ThemeContext';
import { OptimizedIcon } from '../ui/OptimizedIcon';

const placeholderImageSource = require('../../assets/images/placeholder.png');
const { width } = Dimensions.get('window');

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
  const { isDarkMode } = useTheme();
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const shadowOpacity = useSharedValue(isDarkMode ? 0.3 : 0.15);

  if (!plant || typeof plant !== 'object') {
    console.warn('[PlantCard] Received invalid plant data:', plant);
    return null;
  }

  // Determine the image source more robustly
  const imageSourceToUse =
    typeof plant.imageUrl === 'string' && plant.imageUrl.trim() !== ''
      ? { uri: plant.imageUrl }
      : placeholderImageSource;

  // Generate deterministic rotation based on plant ID
  const getRotationForPlant = (plantId: string): number => {
    // Simple hash function to generate deterministic "random" value
    let hash = 0;
    for (let i = 0; i < plantId.length; i++) {
      const char = plantId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Use hash to determine rotation direction and return consistent value
    return (hash % 2 === 0) ? 1.5 : -1.5;
  };

  const tapRotation = getRotationForPlant(plant.id);

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
      if (onPress) {
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
      shadowOpacity.value = withSpring(isDarkMode ? 0.6 : 0.4, { damping: 10, stiffness: 300 });
    })
    .onEnd(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      shadowOpacity.value = withSpring(isDarkMode ? 0.3 : 0.15, { damping: 15, stiffness: 400 });
    })
    .onFinalize(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      shadowOpacity.value = withSpring(isDarkMode ? 0.3 : 0.15, { damping: 15, stiffness: 400 });
    });
  
  const composedGesture = Gesture.Exclusive(longPressGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { rotateZ: `${rotation.value}deg` }
      ],
      shadowOpacity: shadowOpacity.value,
    };
  });

  const iconColor = isDarkMode ? '#60a5fa' : '#3b82f6'; // blue-400/blue-500 for better contrast

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        className="mx-4 mb-6 bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden"
        style={[
          animatedStyle,
          {
            // Enhanced shadow system matching strains quality
            shadowColor: isDarkMode ? '#000' : '#10b981',
            shadowOffset: { width: 0, height: 8 },
            shadowRadius: 16,
            elevation: 8,
          }
        ]}
      >
        {/* Enhanced Image Container */}
        <View className="w-full h-52 overflow-hidden">
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
          <View className="flex-row justify-between items-start mb-4">
            <View className="flex-1 mr-3">
              <ThemedText 
                className="text-2xl font-extrabold text-neutral-900 dark:text-white mb-1" 
                style={{ letterSpacing: 0.2 }}
                numberOfLines={1} 
                ellipsizeMode="tail"
              >
                {plant.name}
              </ThemedText>
              <ThemedText 
                className="text-base text-neutral-600 dark:text-neutral-400 font-medium" 
                numberOfLines={1} 
                ellipsizeMode="tail"
              >
                {plant.strainName}
              </ThemedText>
            </View>
            <View className="pt-1">
              <OptimizedIcon 
                name="chevron-forward-outline" 
                size={24} 
                color={isDarkMode ? '#71717a' : '#52525b'} 
              />
            </View>
          </View>

          {/* Enhanced Stats Section */}
          <View className="flex-row justify-between items-center gap-2">
            <View className="flex-row items-center bg-neutral-50 dark:bg-zinc-800 py-2.5 px-3.5 rounded-xl flex-1 justify-center">
              <OptimizedIcon name="heart-outline" size={18} color={iconColor} />
              <ThemedText className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 ml-2">
                {plant.healthPercentage}%
              </ThemedText>
            </View>

            <View className="flex-row items-center bg-neutral-50 dark:bg-zinc-800 py-2.5 px-3.5 rounded-xl flex-1 justify-center">
              <OptimizedIcon name="water-outline" size={18} color={iconColor} />
              <ThemedText className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 ml-2">
                {plant.nextWateringDays}d
              </ThemedText>
            </View>

            <View className="flex-row items-center bg-neutral-50 dark:bg-zinc-800 py-2.5 px-3.5 rounded-xl flex-1 justify-center">
              <OptimizedIcon name="leaf-outline" size={18} color={iconColor} />
              <ThemedText className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 ml-2">
                {plant.nextNutrientDays}d
              </ThemedText>
            </View>
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}