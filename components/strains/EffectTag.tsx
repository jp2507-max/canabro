import React from 'react';
import { View } from 'react-native';

// Removed StrainEffectType import as we now accept strings
import ThemedText from '../ui/ThemedText';

interface EffectTagProps {
  effect: string; // Accept string from API
  size?: 'small' | 'large';
}

// Map effect strings (lowercase) to colors
// Consider moving this mapping to a utility or theme file
const effectColors: Record<string, { bg: string; text: string }> = {
  happy: {
    bg: 'bg-yellow-100 dark:bg-yellow-900',
    text: 'text-yellow-800 dark:text-yellow-300',
  },
  relaxed: {
    bg: 'bg-blue-100 dark:bg-blue-900',
    text: 'text-blue-800 dark:text-blue-300',
  },
  euphoric: {
    bg: 'bg-purple-100 dark:bg-purple-900',
    text: 'text-purple-800 dark:text-purple-300',
  },
  uplifted: {
    bg: 'bg-primary-100 dark:bg-primary-900',
    text: 'text-primary-800 dark:text-primary-300',
  },
  creative: {
    bg: 'bg-pink-100 dark:bg-pink-900',
    text: 'text-pink-800 dark:text-pink-300',
  },
  energetic: {
    bg: 'bg-red-100 dark:bg-red-900',
    text: 'text-red-800 dark:text-red-300',
  },
  focused: {
    bg: 'bg-indigo-100 dark:bg-indigo-900',
    text: 'text-indigo-800 dark:text-indigo-300',
  },
  sleepy: {
    bg: 'bg-neutral-100 dark:bg-neutral-800',
    text: 'text-neutral-800 dark:text-neutral-300',
  },
  hungry: {
    bg: 'bg-orange-100 dark:bg-orange-900',
    text: 'text-orange-800 dark:text-orange-300',
  },
  // Add other potential effects from API if known
  talkative: {
    bg: 'bg-teal-100 dark:bg-teal-900',
    text: 'text-teal-800 dark:text-teal-300',
  },
  giggly: {
    bg: 'bg-lime-100 dark:bg-lime-900',
    text: 'text-lime-800 dark:text-lime-300',
  },
  tingly: {
    bg: 'bg-cyan-100 dark:bg-cyan-900',
    text: 'text-cyan-800 dark:text-cyan-300',
  },
  aroused: {
    bg: 'bg-rose-100 dark:bg-rose-900',
    text: 'text-rose-800 dark:text-rose-300',
  },
};

// Default style using theme neutral colors
const defaultStyle = {
  bg: 'bg-neutral-100 dark:bg-neutral-700',
  text: 'text-neutral-800 dark:text-neutral-300',
};

/**
 * Renders a tag representing a strain effect with appropriate styling.
 * Accepts effect as a string from the API.
 */
export default function EffectTag({ effect, size = 'small' }: EffectTagProps) {
  // Normalize the effect string (lowercase) for mapping
  const normalizedEffect = effect.toLowerCase();
  const style = effectColors[normalizedEffect] || defaultStyle;

  // Capitalize the first letter for display
  const displayEffect = effect.charAt(0).toUpperCase() + effect.slice(1);

  return (
    <View className={`${style.bg} mb-2 mr-2 rounded-full px-2 py-1`}>
      <ThemedText className={`${style.text} text-xs ${size === 'large' ? 'font-medium' : ''}`}>
        {displayEffect}
      </ThemedText>
    </View>
  );
}
