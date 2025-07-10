

import React, { memo } from 'react';
import { useColorScheme } from 'nativewind';
import { useSafeRouter } from '@/lib/hooks/useSafeRouter';
import { AccessibilityInfo, View, Text, Pressable, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { useButtonAnimation } from '../../lib/animations/useButtonAnimation';
import { useGestureAnimation } from '../../lib/animations/useGestureAnimation';
import type { Strain } from '../../lib/types/strains.js';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import { useStrainTranslation, useStrainEffectsTranslation, useStrainTypeTranslation } from '../../lib/hooks/useTranslation';

// Interface for translation input shape
interface StrainTranslationInput {
  [key: string]: unknown;
  type?: string;
  effects?: string[];
  flavors?: string[];
  growDifficulty?: string;
  description?: string | string[];
}
import { useTranslation } from 'react-i18next';

interface StrainCardProps {
  strain: Strain;
  index: number;
  onToggleFavorite?: (strain: Strain) => void;
}


const StrainCard = memo<StrainCardProps>(({ strain, onToggleFavorite }) => {
  const { colorScheme } = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const { t } = useTranslation();
  const router = useSafeRouter();

  // Use translation hook for strain
  const translatedStrainRaw = useStrainTranslation(strain as unknown as StrainTranslationInput);
  // Fallback to original strain if translation fails or is null
  const translatedStrain: Strain = (translatedStrainRaw && typeof translatedStrainRaw === 'object')
    ? { ...strain, ...translatedStrainRaw } as Strain
    : strain;
  const translatedType = useStrainTypeTranslation(translatedStrain.type);
  const translatedEffects = useStrainEffectsTranslation(translatedStrain.effects);

  // Modern gesture animation for main card
  const { gesture: cardGesture, animatedStyle } = useGestureAnimation({
    enableHaptics: true,
    onTap: () => {
      AccessibilityInfo.announceForAccessibility(
        t('strains.accessibility.openDetails', { name: translatedStrain.name })
      );
      router.push({
        pathname: '/(app)/catalog/[strain_id]',
        params: { strain_id: String(translatedStrain.id) },
      });
    },
  });

  // Animation for favorite button
  const { animatedStyle: favoriteAnimatedStyle, handlers: favoriteHandlers } = useButtonAnimation({
    enableHaptics: true,
    hapticStyle: 'light',
    onPress: () => onToggleFavorite?.(translatedStrain),
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
        return isDarkMode ? '#c084fc' : '#9333ea';
      case 'sativa':
        return isDarkMode ? '#fb923c' : '#ea580c';
      case 'hybrid':
        return isDarkMode ? '#4ade80' : '#16a34a';
      default:
        return isDarkMode ? '#a3a3a3' : '#525252';
    }
  };

  const formatEffects = (effects: string[] | undefined) => {
    if (!effects?.length) return t('strains.noEffects');
    return effects.slice(0, 3).join('  ');
  };

  return (
    <Animated.View className="mx-4 mb-4">
      <GestureDetector gesture={cardGesture}>
        <Animated.View
          style={animatedStyle as ViewStyle}
          className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800"
          accessible
          accessibilityRole="button"
          accessibilityLabel={t('strains.accessibility.cardLabel', { name: translatedStrain.name })}
          accessibilityHint={t('strains.accessibility.cardHint', { name: translatedStrain.name, type: translatedType })}
          testID={`strain-card-${translatedStrain.id}`}>
          {/* Header */}
          <View className="mb-3 flex-row items-start justify-between">
            <View className="mr-3 flex-1">
              <Text
                className="mb-1 text-lg font-semibold text-neutral-900 dark:text-white"
                numberOfLines={2}
                accessible
                accessibilityLabel={t('strains.accessibility.name', { name: translatedStrain.name })}>
                {translatedStrain.name}
              </Text>
              {translatedStrain.type && (
                <View className="flex-row items-center">
                  <OptimizedIcon
                    name={getTypeIcon(translatedStrain.type)}
                    size={16}
                    color={getIconColor(translatedStrain.type)}
                  />
                  <Text
                    className={`ml-2 text-sm font-medium ${getTypeColor(translatedStrain.type)}`}
                    accessible
                    accessibilityLabel={t('strains.accessibility.type', { type: translatedType })}>
                    {translatedType}
                  </Text>
                </View>
              )}
            </View>

            {/* Favorite Button */}
            <Animated.View style={favoriteAnimatedStyle as ViewStyle}>
              <Pressable
                onPressIn={favoriteHandlers.onPressIn}
                onPressOut={favoriteHandlers.onPressOut}
                onPress={favoriteHandlers.onPress}
                className="rounded-full bg-neutral-100 p-2 dark:bg-neutral-700"
                accessible
                accessibilityRole="button"
                accessibilityLabel={
                  translatedStrain.is_favorite
                    ? t('strains.accessibility.removeFavorite')
                    : t('strains.accessibility.addFavorite')
                }
                testID={`favorite-button-${translatedStrain.id}`}>
                <OptimizedIcon
                  name={translatedStrain.is_favorite ? 'heart' : 'heart-outline'}
                  size={20}
                  color={translatedStrain.is_favorite ? '#ef4444' : isDarkMode ? '#a3a3a3' : '#525252'}
                />
              </Pressable>
            </Animated.View>
          </View>

          {/* THC/CBD Info */}
          {(translatedStrain.thc_content || translatedStrain.cbd_content) && (
            <View className="mb-3 flex-row justify-between">
              {translatedStrain.thc_content && (
                <View className="mr-2 flex-1">
                  <Text
                    className="mb-1 text-xs text-neutral-500 dark:text-neutral-400"
                    accessible
                    accessibilityLabel={t('strains.accessibility.thcContent')}>
                    THC
                  </Text>
                  <Text
                    className="text-sm font-medium text-neutral-900 dark:text-white"
                    accessible
                    accessibilityLabel={t('strains.accessibility.thcValue', { value: translatedStrain.thc_content })}>
                    {String(translatedStrain.thc_content)}%
                  </Text>
                </View>
              )}

              {translatedStrain.cbd_content && (
                <View className="ml-2 flex-1">
                  <Text
                    className="mb-1 text-xs text-neutral-500 dark:text-neutral-400"
                    accessible
                    accessibilityLabel={t('strains.accessibility.cbdContent')}>
                    CBD
                  </Text>
                  <Text
                    className="text-sm font-medium text-neutral-900 dark:text-white"
                    accessible
                    accessibilityLabel={t('strains.accessibility.cbdValue', { value: translatedStrain.cbd_content })}>
                    {String(translatedStrain.cbd_content)}%
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
              accessibilityLabel={t('strains.accessibility.effectsLabel')}>
              {t('strains.effects')}
            </Text>
            <Text
              className="text-sm text-neutral-700 dark:text-neutral-300"
              numberOfLines={2}
              accessible
              accessibilityLabel={t('strains.accessibility.effects', { effects: formatEffects(translatedEffects) })}>
              {formatEffects(translatedEffects)}
            </Text>
          </View>

          {/* Description */}
          {translatedStrain.description && (
            <Text
              className="text-sm leading-5 text-neutral-600 dark:text-neutral-400"
              numberOfLines={3}
              accessible
              accessibilityLabel={t('strains.accessibility.description', { description: String(translatedStrain.description) })}>
              {String(translatedStrain.description)}
            </Text>
          )}

          {/* View Details Indicator */}
          <View className="mt-3 flex-row items-center justify-end border-t border-neutral-100 pt-3 dark:border-neutral-700">
            <Text className="mr-1 text-sm text-primary-600 dark:text-primary-400">
              {t('strains.viewDetails')}
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
