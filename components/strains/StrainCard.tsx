import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import React, { memo } from 'react';
import { View, Text, Pressable, AccessibilityInfo, ViewStyle } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { useButtonAnimation } from '../../lib/animations/useButtonAnimation';
import { useGestureAnimation } from '../../lib/animations/useGestureAnimation';
import type { Strain } from '../../lib/types/strains.js';
import { OptimizedIcon } from '../ui/OptimizedIcon';

interface StrainCardProps {
  strain: Strain;
  index: number;
  onToggleFavorite?: (strain: Strain) => void;
}

const StrainCard = memo<StrainCardProps>(({ strain, index, onToggleFavorite }) => {
  const { colorScheme } = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  // 🎯 Modern gesture animation for main card
  const { gesture: cardGesture, animatedStyle } = useGestureAnimation({
    enableHaptics: true,
    onTap: () => {
      // Announce navigation for screen readers
      AccessibilityInfo.announceForAccessibility(`Opening ${strain.name} details`);
      router.push({
        pathname: '/(app)/catalog/[strain_id]',
        params: { strain_id: strain.id },
      });
    },
  });

  // 🎯 Separate animation for favorite button
  const { animatedStyle: favoriteAnimatedStyle, handlers: favoriteHandlers } = useButtonAnimation({
    enableHaptics: true,
    hapticStyle: 'light',
    onPress: () => onToggleFavorite?.(strain),
  });

  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'indica':
        return 'moon-outline';
      case 'sativa':
        return 'sunny-outline';
      case 'hybrid':
        return 'partly-sunny-outline';
      default:
        return 'leaf-outline';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'indica':
        return 'text-purple-600 dark:text-purple-400';
      case 'sativa':
        return 'text-orange-600 dark:text-orange-400';
      case 'hybrid':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-neutral-600 dark:text-neutral-400';
    }
  };

  const getIconColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'indica':
        return isDarkMode ? '#c084fc' : '#9333ea'; // purple-400 : purple-600
      case 'sativa':
        return isDarkMode ? '#fb923c' : '#ea580c'; // orange-400 : orange-600
      case 'hybrid':
        return isDarkMode ? '#4ade80' : '#16a34a'; // green-400 : green-600
      default:
        return isDarkMode ? '#a3a3a3' : '#525252'; // neutral-400 : neutral-600
    }
  };

  const formatEffects = (effects: string[] | undefined) => {
    if (!effects?.length) return 'No effects listed';
    return effects.slice(0, 3).join(' • ');
  };

  return (
    <Animated.View className="mx-4 mb-4">
      <GestureDetector gesture={cardGesture}>
        <Animated.View
          style={animatedStyle as ViewStyle}
          className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800"
          accessible
          accessibilityRole="button"
          accessibilityLabel={`${strain.name} strain card`}
          accessibilityHint={`Double tap to view details for ${strain.name}, a ${strain.type} strain`}
          testID={`strain-card-${strain.id}`}>
          {/* Header */}
          <View className="mb-3 flex-row items-start justify-between">
            <View className="mr-3 flex-1">
              <Text
                className="mb-1 text-lg font-semibold text-neutral-900 dark:text-white"
                numberOfLines={2}
                accessible
                accessibilityLabel={`Strain name: ${strain.name}`}>
                {strain.name}
              </Text>
              {strain.type && (
                <View className="flex-row items-center">
                  <OptimizedIcon
                    name={getTypeIcon(strain.type)}
                    size={16}
                    color={getIconColor(strain.type)}
                  />
                  <Text
                    className={`ml-2 text-sm font-medium ${getTypeColor(strain.type)}`}
                    accessible
                    accessibilityLabel={`Type: ${strain.type}`}>
                    {strain.type.charAt(0).toUpperCase() + strain.type.slice(1)}
                  </Text>
                </View>
              )}
            </View>

            {/* 🎯 Enhanced Favorite Button with Modern Animation */}
            <Animated.View style={favoriteAnimatedStyle as ViewStyle}>
              <Pressable
                onPressIn={favoriteHandlers.onPressIn}
                onPressOut={favoriteHandlers.onPressOut}
                onPress={favoriteHandlers.onPress}
                className="rounded-full bg-neutral-100 p-2 dark:bg-neutral-700"
                accessible
                accessibilityRole="button"
                accessibilityLabel={
                  strain.is_favorite ? 'Remove from favorites' : 'Add to favorites'
                }
                testID={`favorite-button-${strain.id}`}>
                <OptimizedIcon
                  name={strain.is_favorite ? 'heart' : 'heart-outline'}
                  size={20}
                  color={strain.is_favorite ? '#ef4444' : isDarkMode ? '#a3a3a3' : '#525252'}
                />
              </Pressable>
            </Animated.View>
          </View>

          {/* THC/CBD Info */}
          {(strain.thc_content || strain.cbd_content) && (
            <View className="mb-3 flex-row justify-between">
              {strain.thc_content && (
                <View className="mr-2 flex-1">
                  <Text
                    className="mb-1 text-xs text-neutral-500 dark:text-neutral-400"
                    accessible
                    accessibilityLabel="THC content">
                    THC
                  </Text>
                  <Text
                    className="text-sm font-medium text-neutral-900 dark:text-white"
                    accessible
                    accessibilityLabel={`${strain.thc_content} percent THC`}>
                    {strain.thc_content}%
                  </Text>
                </View>
              )}

              {strain.cbd_content && (
                <View className="ml-2 flex-1">
                  <Text
                    className="mb-1 text-xs text-neutral-500 dark:text-neutral-400"
                    accessible
                    accessibilityLabel="CBD content">
                    CBD
                  </Text>
                  <Text
                    className="text-sm font-medium text-neutral-900 dark:text-white"
                    accessible
                    accessibilityLabel={`${strain.cbd_content} percent CBD`}>
                    {strain.cbd_content}%
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Effects */}
          <View className="mb-3">
            <Text
              className="mb-1 text-xs text-neutral-500 dark:text-neutral-400"
              accessible
              accessibilityLabel="Effects">
              Effects
            </Text>
            <Text
              className="text-sm text-neutral-700 dark:text-neutral-300"
              numberOfLines={2}
              accessible
              accessibilityLabel={`Effects: ${formatEffects(strain.effects)}`}>
              {formatEffects(strain.effects)}
            </Text>
          </View>

          {/* Description */}
          {strain.description && (
            <Text
              className="text-sm leading-5 text-neutral-600 dark:text-neutral-400"
              numberOfLines={3}
              accessible
              accessibilityLabel={`Description: ${strain.description}`}>
              {strain.description}
            </Text>
          )}

          {/* View Details Indicator */}
          <View className="mt-3 flex-row items-center justify-end border-t border-neutral-100 pt-3 dark:border-neutral-700">
            <Text className="mr-1 text-sm text-primary-600 dark:text-primary-400">
              View Details
            </Text>
            <OptimizedIcon name="chevron-forward" size={16} color="#10b981" />
          </View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
});

StrainCard.displayName = 'StrainCard';

export default StrainCard;
