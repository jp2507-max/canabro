import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import React from 'react';
import { View, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  SharedTransition, // Import SharedTransition
} from 'react-native-reanimated'; // Added runOnJS
import { Gesture, GestureDetector } from 'react-native-gesture-handler'; // Import Gesture and GestureDetector
import * as Haptics from 'expo-haptics'; // Import Haptics
import ThemedText from '../ui/ThemedText'; // Adjusted path
import { useTheme } from '../../lib/contexts/ThemeContext'; // Adjusted path

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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable); // Create AnimatedPressable
const StyledReanimatedImage = Animated.createAnimatedComponent(ExpoImage); // Create animated version of ExpoImage

// Custom transition for a smoother effect (can be the same as in PlantHeroImage or simpler)
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
  const scale = useSharedValue(1); // Shared value for scale
  const rotation = useSharedValue(0); // NEW: Shared value for rotation
  const shadowOpacity = useSharedValue(isDarkMode ? 0.8 : 0.1); // Initial shadow based on theme

  if (!plant || typeof plant !== 'object') {
    console.warn('[PlantCard] Received invalid plant data:', plant);
    return null;
  }

  // Determine the image source more robustly
  const imageSourceToUse =
    typeof plant.imageUrl === 'string' && plant.imageUrl.trim() !== ''
      ? { uri: plant.imageUrl }
      : placeholderImageSource;

  const handlePress = () => {
    if (onPress) {
      onPress(plant.id); // Use original plant.id
    }
  };

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
      rotation.value = withSpring(Math.random() > 0.5 ? 1.5 : -1.5, { damping: 15, stiffness: 400 });
    })
    .onEnd(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      rotation.value = withSpring(0, { damping: 15, stiffness: 400 });
      if (onPress) {
        runOnJS(onPress)(plant.id);
      }
    })
    .onFinalize(() => {
      // Reset in case of cancellation
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      rotation.value = withSpring(0, { damping: 15, stiffness: 400 });
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(350)
    .onBegin(() => {
      runOnJS(triggerHaptic)();
      scale.value = withSpring(1.05, { damping: 10, stiffness: 300 }); // Slightly larger scale for long press
      shadowOpacity.value = withSpring(isDarkMode ? 0.6 : 0.3, { damping: 10, stiffness: 300 }); // More prominent shadow
    })
    .onEnd(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      shadowOpacity.value = withSpring(isDarkMode ? 0.8 : 0.1, { damping: 15, stiffness: 400 });
    })
    .onFinalize(() => {
      // Ensure reset if gesture is cancelled
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      shadowOpacity.value = withSpring(isDarkMode ? 0.8 : 0.1, { damping: 15, stiffness: 400 });
    });
  
  const composedGesture = Gesture.Exclusive(longPressGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => { // Animated style for scale
    return {
      transform: [
        { scale: scale.value },
        { rotateZ: `${rotation.value}deg` } // NEW: Apply rotation
      ],
      shadowOpacity: shadowOpacity.value,
      // For iOS shadow to react to opacity change, we might need to ensure shadowColor is set
      // and potentially adjust shadowOffset/Radius if we want them to animate too.
      // For simplicity, we're focusing on opacity here.
    };
  });

  const iconColor = isDarkMode ? '#93C5FD' : '#3B82F6'; // Tailwind blue-300 (dark) / blue-500 (light)

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View // Changed from AnimatedPressable to Animated.View to use with GestureDetector
        className="bg-white dark:bg-neutral-800 rounded-2xl shadow-md dark:shadow-neutral-900/80 m-4 overflow-hidden"
        style={[
          animatedStyle,
          // Ensure base shadow properties are set for shadowOpacity to have an effect
          { 
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 3,
            elevation: 5, // for Android
          }
        ]}
      >
        <View className="w-full h-48">
          {/* MODIFIED IMAGE COMPONENT */}
          <StyledReanimatedImage
            source={imageSourceToUse} // Use the determined source
            className="w-full h-full" // Keep existing classNames
            style={{ width: '100%', height: '100%' }} // Add explicit styles
            contentFit="cover"
            accessibilityIgnoresInvertColors
            placeholder={placeholderImageSource}
            transition={300} // expo-image's own loading transition
            // Shared transition props for Reanimated
            sharedTransitionTag={`plantImage-${plant.id}`} // Match the tag in PlantHeroImage
            sharedTransitionStyle={customCardImageTransition}
          />
        </View>

        <View className="p-4">
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-1 mr-2">
              <ThemedText className="text-xl font-semibold text-neutral-900 dark:text-white" numberOfLines={1} ellipsizeMode="tail">
                {plant.name}
              </ThemedText>
              <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5" numberOfLines={1} ellipsizeMode="tail">
                {plant.strainName}
              </ThemedText>
            </View>
            <View className="pt-1">
              <Ionicons name="chevron-forward-outline" size={22} color={isDarkMode ? '#A3A3A3' : '#737373'} />
            </View>
          </View>

          <View className="flex-row justify-between items-center space-x-2">
            <View className="flex-row items-center bg-neutral-100 dark:bg-neutral-700/60 py-1.5 px-2.5 rounded-lg flex-1 justify-start space-x-1.5">
              <Ionicons name="heart-outline" size={16} color={iconColor} />
              <ThemedText className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
                {plant.healthPercentage}%
              </ThemedText>
            </View>

            <View className="flex-row items-center bg-neutral-100 dark:bg-neutral-700/60 py-1.5 px-2.5 rounded-lg flex-1 justify-start space-x-1.5">
              <Ionicons name="water-outline" size={16} color={iconColor} />
              <ThemedText className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
                {plant.nextWateringDays}d
              </ThemedText>
            </View>

            <View className="flex-row items-center bg-neutral-100 dark:bg-neutral-700/60 py-1.5 px-2.5 rounded-lg flex-1 justify-start space-x-1.5">
              <Ionicons name="leaf-outline" size={16} color={iconColor} />
              <ThemedText className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
                {plant.nextNutrientDays}d
              </ThemedText>
            </View>
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}