import React, { memo } from 'react';
import { View, Text, TouchableOpacity, AccessibilityInfo, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { useButtonAnimation } from '../../lib/animations/useButtonAnimation';
import type { Strain } from '../../lib/types/strains.js';

interface StrainCardProps {
  strain: Strain;
  index: number;
  onToggleFavorite?: (strain: Strain) => void;
}

const StrainCard = memo<StrainCardProps>(({ strain, index, onToggleFavorite }) => {
  const { animatedStyle, handlers } = useButtonAnimation();

  const handlePress = () => {
    // Announce navigation for screen readers
    AccessibilityInfo.announceForAccessibility(`Opening ${strain.name} details`);
    router.push(`/catalog/${strain.id}`);
  };

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
        return '#9333ea'; // purple-600
      case 'sativa':
        return '#ea580c'; // orange-600
      case 'hybrid':
        return '#16a34a'; // green-600
      default:
        return '#525252'; // neutral-600
    }
  };
  const formatEffects = (effects: string[] | undefined) => {
    if (!effects?.length) return 'No effects listed';
    return effects.slice(0, 3).join(' • ');
  };

  return (
    <Animated.View 
      style={animatedStyle as ViewStyle}
      className="mx-4 mb-4"
    >
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlers.onPressIn}
        onPressOut={handlers.onPressOut}
        className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700 shadow-sm"
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${strain.name} strain card`}
        accessibilityHint={`Double tap to view details for ${strain.name}, a ${strain.type} strain`}
        testID={`strain-card-${strain.id}`}
      >
        {/* Header */}
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-1 mr-3">
            <Text 
              className="text-lg font-semibold text-neutral-900 dark:text-white mb-1"
              numberOfLines={2}
              accessible={true}
              accessibilityLabel={`Strain name: ${strain.name}`}
            >
              {strain.name}
            </Text>
              {strain.type && (
              <View className="flex-row items-center">
                <Ionicons 
                  name={getTypeIcon(strain.type)} 
                  size={16} 
                  color={getIconColor(strain.type)}
                />
                <Text 
                  className={`ml-2 text-sm font-medium ${getTypeColor(strain.type)}`}
                  accessible={true}
                  accessibilityLabel={`Type: ${strain.type}`}
                >
                  {strain.type.charAt(0).toUpperCase() + strain.type.slice(1)}
                </Text>
              </View>
            )}
          </View>

          {/* Favorite Icon */}
          <TouchableOpacity
            onPress={() => onToggleFavorite?.(strain)}
            className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-700"
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={strain.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
            testID={`favorite-button-${strain.id}`}
          >
            <Ionicons 
              name={strain.is_favorite ? 'heart' : 'heart-outline'} 
              size={20} 
              color={strain.is_favorite ? '#ef4444' : undefined}
              className="text-neutral-600 dark:text-neutral-400"
            />
          </TouchableOpacity>
        </View>

        {/* THC/CBD Info */}
        {(strain.thc_content || strain.cbd_content) && (
          <View className="flex-row justify-between mb-3">
            {strain.thc_content && (
              <View className="flex-1 mr-2">
                <Text 
                  className="text-xs text-neutral-500 dark:text-neutral-400 mb-1"
                  accessible={true}
                  accessibilityLabel="THC content"
                >
                  THC
                </Text>
                <Text 
                  className="text-sm font-medium text-neutral-900 dark:text-white"
                  accessible={true}
                  accessibilityLabel={`${strain.thc_content} percent THC`}
                >
                  {strain.thc_content}%
                </Text>
              </View>
            )}
            
            {strain.cbd_content && (
              <View className="flex-1 ml-2">
                <Text 
                  className="text-xs text-neutral-500 dark:text-neutral-400 mb-1"
                  accessible={true}
                  accessibilityLabel="CBD content"
                >
                  CBD
                </Text>
                <Text 
                  className="text-sm font-medium text-neutral-900 dark:text-white"
                  accessible={true}
                  accessibilityLabel={`${strain.cbd_content} percent CBD`}
                >
                  {strain.cbd_content}%
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Effects */}
        <View className="mb-3">
          <Text 
            className="text-xs text-neutral-500 dark:text-neutral-400 mb-1"
            accessible={true}
            accessibilityLabel="Effects"
          >
            Effects
          </Text>
          <Text 
            className="text-sm text-neutral-700 dark:text-neutral-300"
            numberOfLines={2}
            accessible={true}
            accessibilityLabel={`Effects: ${formatEffects(strain.effects)}`}
          >
            {formatEffects(strain.effects)}
          </Text>
        </View>

        {/* Description */}
        {strain.description && (
          <Text 
            className="text-sm text-neutral-600 dark:text-neutral-400 leading-5"
            numberOfLines={3}
            accessible={true}
            accessibilityLabel={`Description: ${strain.description}`}
          >
            {strain.description}
          </Text>
        )}        {/* View Details Indicator */}
        <View className="flex-row items-center justify-end mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700">
          <Text className="text-sm text-primary-600 dark:text-primary-400 mr-1">
            View Details
          </Text>
          <Ionicons 
            name="chevron-forward" 
            size={16} 
            color="#10b981"
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

StrainCard.displayName = 'StrainCard';

export default StrainCard;