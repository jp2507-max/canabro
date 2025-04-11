import React from 'react';
import { View } from 'react-native';

import { StrainEffectType } from '../../lib/types/strain';
import ThemedText from '../ui/ThemedText';

interface EffectTagProps {
  effect: StrainEffectType;
  size?: 'small' | 'large';
}

/**
 * Renders a tag representing a strain effect with appropriate styling.
 */
export default function EffectTag({ effect, size = 'small' }: EffectTagProps) {
  // Map effects to colors using NativeWind classes (consistent with original implementation)
  // Consider moving this mapping to the theme or a utility function for better centralization later.
  const effectColors: Record<string, { bg: string; text: string }> = {
    [StrainEffectType.HAPPY]: {
      bg: 'bg-yellow-100 dark:bg-yellow-900',
      text: 'text-yellow-800 dark:text-yellow-300',
    },
    [StrainEffectType.RELAXED]: {
      bg: 'bg-blue-100 dark:bg-blue-900',
      text: 'text-blue-800 dark:text-blue-300',
    },
    [StrainEffectType.EUPHORIC]: {
      bg: 'bg-purple-100 dark:bg-purple-900',
      text: 'text-purple-800 dark:text-purple-300',
    },
    [StrainEffectType.UPLIFTED]: {
      bg: 'bg-primary-100 dark:bg-primary-900',
      text: 'text-primary-800 dark:text-primary-300',
    },
    [StrainEffectType.CREATIVE]: {
      bg: 'bg-pink-100 dark:bg-pink-900',
      text: 'text-pink-800 dark:text-pink-300',
    },
    [StrainEffectType.ENERGETIC]: {
      bg: 'bg-red-100 dark:bg-red-900',
      text: 'text-red-800 dark:text-red-300',
    },
    [StrainEffectType.FOCUSED]: {
      bg: 'bg-indigo-100 dark:bg-indigo-900',
      text: 'text-indigo-800 dark:text-indigo-300',
    },
    [StrainEffectType.SLEEPY]: {
      bg: 'bg-neutral-100 dark:bg-neutral-800',
      text: 'text-neutral-800 dark:text-neutral-300',
    },
    [StrainEffectType.HUNGRY]: {
      bg: 'bg-orange-100 dark:bg-orange-900',
      text: 'text-orange-800 dark:text-orange-300',
    },
  };

  // Default style using theme neutral colors
  const defaultStyle = {
    bg: 'bg-neutral-100 dark:bg-neutral-700',
    text: 'text-neutral-800 dark:text-neutral-300',
  };

  const style = effectColors[effect] || defaultStyle;

  return (
    <View className={`${style.bg} mb-2 mr-2 rounded-full px-2 py-1`}>
      <ThemedText className={`${style.text} text-xs ${size === 'large' ? 'font-medium' : ''}`}>
        {effect}
      </ThemedText>
    </View>
  );
}
