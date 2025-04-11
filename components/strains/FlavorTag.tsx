import React from 'react';
import { View } from 'react-native';

import { StrainFlavorType } from '../../lib/types/strain';
import ThemedText from '../ui/ThemedText';

interface FlavorTagProps {
  flavor: StrainFlavorType;
}

/**
 * Renders a tag representing a strain flavor with appropriate styling.
 */
export default function FlavorTag({ flavor }: FlavorTagProps) {
  // Map flavors to colors using NativeWind classes (consistent with original implementation)
  // Consider moving this mapping to the theme or a utility function for better centralization later.
  const flavorColors: Record<string, { bg: string; text: string }> = {
    [StrainFlavorType.SWEET]: {
      bg: 'bg-pink-100 dark:bg-pink-900',
      text: 'text-pink-800 dark:text-pink-300',
    },
    [StrainFlavorType.EARTHY]: {
      bg: 'bg-neutral-200 dark:bg-neutral-700',
      text: 'text-neutral-800 dark:text-neutral-300',
    },
    [StrainFlavorType.CITRUS]: {
      bg: 'bg-yellow-100 dark:bg-yellow-900',
      text: 'text-yellow-800 dark:text-yellow-300',
    },
    [StrainFlavorType.BERRY]: {
      bg: 'bg-purple-100 dark:bg-purple-900',
      text: 'text-purple-800 dark:text-purple-300',
    },
    [StrainFlavorType.PINE]: {
      bg: 'bg-primary-100 dark:bg-primary-900',
      text: 'text-primary-800 dark:text-primary-300',
    },
    [StrainFlavorType.WOODY]: {
      bg: 'bg-neutral-300 dark:bg-neutral-600',
      text: 'text-neutral-800 dark:text-neutral-200',
    },
    [StrainFlavorType.DIESEL]: {
      bg: 'bg-neutral-100 dark:bg-neutral-800',
      text: 'text-neutral-800 dark:text-neutral-300',
    },
    [StrainFlavorType.PUNGENT]: {
      bg: 'bg-indigo-100 dark:bg-indigo-900',
      text: 'text-indigo-800 dark:text-indigo-300',
    },
    [StrainFlavorType.SPICY]: {
      bg: 'bg-red-100 dark:bg-red-900',
      text: 'text-red-800 dark:text-red-300',
    },
    [StrainFlavorType.VANILLA]: {
      bg: 'bg-neutral-100 dark:bg-neutral-900',
      text: 'text-neutral-800 dark:text-neutral-300',
    },
    [StrainFlavorType.BLUEBERRY]: {
      bg: 'bg-blue-100 dark:bg-blue-900',
      text: 'text-blue-800 dark:text-blue-300',
    },
    [StrainFlavorType.GRAPE]: {
      bg: 'bg-purple-100 dark:bg-purple-900',
      text: 'text-purple-800 dark:text-purple-300',
    },
  };

  // Default style using theme neutral colors
  const defaultStyle = {
    bg: 'bg-neutral-100 dark:bg-neutral-700',
    text: 'text-neutral-800 dark:text-neutral-300',
  };

  const style = flavorColors[flavor] || defaultStyle;

  return (
    <View className={`${style.bg} mb-2 mr-2 rounded-full px-2 py-1`}>
      <ThemedText className={`${style.text} text-xs`}>{flavor}</ThemedText>
    </View>
  );
}
