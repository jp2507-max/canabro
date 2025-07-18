import * as Haptics from '@/lib/utils/haptics';
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
import { NotificationBadge, AttentionIndicator } from '../ui/NotificationBadge';
import { useSinglePlantAttention } from '@/lib/hooks/usePlantAttention';
import { useTranslation } from 'react-i18next';

const placeholderImageSource = require('../../assets/placeholder.png');

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
  const { t } = useTranslation();
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const shadowOpacity = useSharedValue(0.15);
  
  // Get attention status for this plant
  const { attentionStatus } = useSinglePlantAttention(plant.id);

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
    'worklet';
    return {
      transform: [{ scale: scale.value }, { rotateZ: `${rotation.value}deg` }],
      shadowOpacity: shadowOpacity.value,
    };
  });

  // Get priority border color for attention highlighting
  const getPriorityBorderColor = (priority: string, needsAttention: boolean) => {
    if (!needsAttention) return '';
    
    switch (priority) {
      case 'urgent':
        return 'border-l-4 border-l-status-danger';
      case 'high':
        return 'border-l-4 border-l-status-warning';
      case 'medium':
        return 'border-l-4 border-l-primary-500';
      default:
        return '';
    }
  };

  // Get priority background glow for attention highlighting
  const getPriorityGlow = (priority: string, needsAttention: boolean) => {
    if (!needsAttention) return '';
    
    switch (priority) {
      case 'urgent':
        return 'shadow-status-danger/30';
      case 'high':
        return 'shadow-status-warning/30';
      case 'medium':
        return 'shadow-primary-500/30';
      default:
        return '';
    }
  };

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
        className={`
          mx-4 mb-6 overflow-hidden rounded-3xl bg-white shadow-lg shadow-primary-500/20 dark:bg-zinc-900 dark:shadow-black/40
          ${getPriorityBorderColor(attentionStatus.priorityLevel, attentionStatus.needsAttention)}
          ${getPriorityGlow(attentionStatus.priorityLevel, attentionStatus.needsAttention)}
        `}
        style={[
          animatedStyle,
          {
            // ✅ Enhanced shadow system with NativeWind v4 compatible styling
            shadowColor: attentionStatus.needsAttention && attentionStatus.priorityLevel === 'urgent' 
              ? '#dc2626' // red-600 for urgent
              : attentionStatus.needsAttention && attentionStatus.priorityLevel === 'high'
              ? '#f59e0b' // amber-500 for high
              : '#16a34a', // primary-600 for normal
            shadowOffset: { width: 0, height: 8 },
            shadowRadius: 16,
            elevation: 8,
          },
        ]}>
        {/* Enhanced Image Container */}
        <View className="relative h-52 w-full overflow-hidden">
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
          
          {/* Attention indicators overlay */}
          {attentionStatus.needsAttention && (
            <View className="absolute right-3 top-3 flex-row space-x-2">
              {/* Notification badge for reminder count */}
              {attentionStatus.reminderCount > 0 && (
                <NotificationBadge
                  count={attentionStatus.overdueCount + attentionStatus.dueTodayCount}
                  priority={attentionStatus.priorityLevel}
                  size="medium"
                  animate={true}
                />
              )}
              
              {/* Attention indicator */}
              <AttentionIndicator
                priority={attentionStatus.priorityLevel}
                size="medium"
                animate={true}
              />
            </View>
          )}
        </View>

        {/* Enhanced Content Section */}
        <View className="px-6 py-5">
          {/* Enhanced Header Section */}
          <View className="mb-4 flex-row items-start justify-between">
            <View className="mr-3 flex-1">
              <View className="flex-row items-center">
                <ThemedText
                  className="mb-1 text-2xl font-extrabold text-neutral-900 dark:text-white"
                  style={{ letterSpacing: 0.2 }}
                  numberOfLines={1}
                  ellipsizeMode="tail">
                  {plant.name}
                </ThemedText>
                {/* Small attention indicator next to name for urgent items */}
                {attentionStatus.needsAttention && attentionStatus.priorityLevel === 'urgent' && (
                  <View className="ml-2">
                    <AttentionIndicator
                      priority="urgent"
                      size="small"
                      animate={true}
                    />
                  </View>
                )}
              </View>
              <ThemedText
                className="text-base font-medium text-neutral-600 dark:text-neutral-400"
                numberOfLines={1}
                ellipsizeMode="tail">
                {plant.strainName}
              </ThemedText>
              
              {/* Attention reasons summary */}
              {attentionStatus.needsAttention && attentionStatus.reasons.length > 0 && (
                <ThemedText
                  className={`mt-1 text-sm font-medium ${
                    attentionStatus.priorityLevel === 'urgent'
                      ? 'text-status-danger'
                      : attentionStatus.priorityLevel === 'high'
                      ? 'text-status-warning'
                      : 'text-primary-500'
                  }`}
                  numberOfLines={1}
                  ellipsizeMode="tail">
                  {attentionStatus.overdueCount > 0 
                    ? t('plantAttention.overdueTask', { count: attentionStatus.overdueCount })
                    : attentionStatus.dueTodayCount > 0
                    ? t('plantAttention.dueToday', { count: attentionStatus.dueTodayCount })
                    : t('plantAttention.needsAttention')
                  }
                </ThemedText>
              )}
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
            <View className={`
              flex-1 flex-row items-center justify-center rounded-xl px-3.5 py-2.5
              ${plant.healthPercentage < 50 
                ? 'bg-status-danger/10 dark:bg-status-danger/20' 
                : 'bg-component-100 dark:bg-component-200'
              }
            `}>
              <OptimizedIcon 
                name="heart-outline" 
                size={18} 
                className={plant.healthPercentage < 50 ? "text-status-danger" : "text-primary-500"} 
              />
              <ThemedText className={`
                ml-2 text-sm font-semibold
                ${plant.healthPercentage < 50 
                  ? 'text-status-danger' 
                  : 'text-component-700 dark:text-component-800'
                }
              `}>
                {plant.healthPercentage}%
              </ThemedText>
            </View>

            <View className={`
              flex-1 flex-row items-center justify-center rounded-xl px-3.5 py-2.5
              ${plant.nextWateringDays <= 0 
                ? 'bg-status-warning/10 dark:bg-status-warning/20' 
                : 'bg-component-100 dark:bg-component-200'
              }
            `}>
              <OptimizedIcon 
                name="water-outline" 
                size={18} 
                className={plant.nextWateringDays <= 0 ? "text-status-warning" : "text-primary-500"} 
              />
              <ThemedText className={`
                ml-2 text-sm font-semibold
                ${plant.nextWateringDays <= 0 
                  ? 'text-status-warning' 
                  : 'text-component-700 dark:text-component-800'
                }
              `}>
                {plant.nextWateringDays}d
              </ThemedText>
            </View>

            <View className={`
              flex-1 flex-row items-center justify-center rounded-xl px-3.5 py-2.5
              ${plant.nextNutrientDays <= 0 
                ? 'bg-status-warning/10 dark:bg-status-warning/20' 
                : 'bg-component-100 dark:bg-component-200'
              }
            `}>
              <OptimizedIcon 
                name="leaf-outline" 
                size={18} 
                className={plant.nextNutrientDays <= 0 ? "text-status-warning" : "text-primary-500"} 
              />
              <ThemedText className={`
                ml-2 text-sm font-semibold
                ${plant.nextNutrientDays <= 0 
                  ? 'text-status-warning' 
                  : 'text-component-700 dark:text-component-800'
                }
              `}>
                {plant.nextNutrientDays}d
              </ThemedText>
            </View>
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}
