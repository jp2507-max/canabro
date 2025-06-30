import React from 'react';
import { View } from 'react-native';

// Removed StrainFlavorType import as we now accept strings
import ThemedText from '../ui/ThemedText';

interface FlavorTagProps {
  flavor: string; // Accept string (aroma) from API
  emoji?: boolean;
}

// Map flavor/aroma strings (lowercase) to colors
// Consider moving this mapping to a utility or theme file
const flavorColors: Record<string, { bg: string; text: string }> = {
  sweet: {
    bg: 'bg-pink-100 dark:bg-pink-900',
    text: 'text-pink-800 dark:text-pink-300',
  },
  earthy: {
    bg: 'bg-neutral-200 dark:bg-neutral-700',
    text: 'text-neutral-800 dark:text-neutral-300',
  },
  citrus: {
    bg: 'bg-yellow-100 dark:bg-yellow-900',
    text: 'text-yellow-800 dark:text-yellow-300',
  },
  berry: {
    bg: 'bg-purple-100 dark:bg-purple-900',
    text: 'text-purple-800 dark:text-purple-300',
  },
  pine: {
    bg: 'bg-primary-100 dark:bg-primary-900',
    text: 'text-primary-800 dark:text-primary-300',
  },
  woody: {
    bg: 'bg-neutral-300 dark:bg-neutral-600',
    text: 'text-neutral-800 dark:text-neutral-200',
  },
  diesel: {
    bg: 'bg-neutral-100 dark:bg-neutral-800',
    text: 'text-neutral-800 dark:text-neutral-300',
  },
  pungent: {
    bg: 'bg-indigo-100 dark:bg-indigo-900',
    text: 'text-indigo-800 dark:text-indigo-300',
  },
  spicy: {
    bg: 'bg-red-100 dark:bg-red-900',
    text: 'text-red-800 dark:text-red-300',
  },
  vanilla: {
    bg: 'bg-neutral-100 dark:bg-neutral-900',
    text: 'text-neutral-800 dark:text-neutral-300',
  },
  blueberry: {
    bg: 'bg-blue-100 dark:bg-blue-900',
    text: 'text-blue-800 dark:text-blue-300',
  },
  grape: {
    bg: 'bg-purple-100 dark:bg-purple-900',
    text: 'text-purple-800 dark:text-purple-300',
  },
  // Add other potential flavors/aromas from API if known
  skunk: {
    bg: 'bg-lime-100 dark:bg-lime-900',
    text: 'text-lime-800 dark:text-lime-300',
  },
  tropical: {
    bg: 'bg-orange-100 dark:bg-orange-900',
    text: 'text-orange-800 dark:text-orange-300',
  },
  mint: {
    bg: 'bg-teal-100 dark:bg-teal-900',
    text: 'text-teal-800 dark:text-teal-300',
  },
  cheese: {
    bg: 'bg-yellow-200 dark:bg-yellow-800',
    text: 'text-yellow-900 dark:text-yellow-200',
  },
  chemical: {
    bg: 'bg-gray-200 dark:bg-gray-700',
    text: 'text-gray-800 dark:text-gray-300',
  },
  pepper: {
    bg: 'bg-red-200 dark:bg-red-800',
    text: 'text-red-900 dark:text-red-200',
  },
  flowery: {
    bg: 'bg-pink-200 dark:bg-pink-800',
    text: 'text-pink-900 dark:text-pink-200',
  },
  lavender: {
    bg: 'bg-purple-200 dark:bg-purple-800',
    text: 'text-purple-900 dark:text-purple-200',
  },
  lemon: {
    bg: 'bg-yellow-100 dark:bg-yellow-900',
    text: 'text-yellow-800 dark:text-yellow-300',
  },
  lime: {
    bg: 'bg-lime-100 dark:bg-lime-900',
    text: 'text-lime-800 dark:text-lime-300',
  },
};

// Default style using theme neutral colors
const defaultStyle = {
  bg: 'bg-neutral-100 dark:bg-neutral-700',
  text: 'text-neutral-800 dark:text-neutral-300',
};

/**
 * Renders a tag representing a strain flavor/aroma with appropriate styling.
 * Accepts flavor/aroma as a string from the API.
 */
export default function FlavorTag({ flavor, emoji }: FlavorTagProps) {
  if (typeof flavor !== 'string' || !flavor.trim()) return null;
  // Normalize the flavor/aroma string (lowercase) for mapping
  const normalizedFlavor = flavor.toLowerCase();
  const style = flavorColors[normalizedFlavor] || defaultStyle;

  // Capitalize the first letter for display
  const displayFlavor = flavor.charAt(0).toUpperCase() + flavor.slice(1);

  // Emoji mapping for flavors
  const flavorEmojis: Record<string, string> = {
    sweet: '🍬',
    earthy: '🌱',
    citrus: '🍋',
    berry: '🫐',
    pine: '🌲',
    woody: '🪵',
    diesel: '⛽',
    pungent: '👃',
    spicy: '🌶️',
    vanilla: '🍦',
    blueberry: '🫐',
    grape: '🍇',
    skunk: '🦨',
    tropical: '🥭',
    mint: '🌿',
    cheese: '🧀',
    chemical: '⚗️',
    pepper: '🫑',
    flowery: '🌸',
    lavender: '💜',
    lemon: '🍋',
    lime: '🍈',
  };
  const emojiIcon = emoji ? flavorEmojis[normalizedFlavor] || '' : '';

  return (
    <View className={`${style.bg} mb-2 mr-2 rounded-full px-2 py-1`}>
      <ThemedText className={`${style.text} text-xs`}>
        {emojiIcon ? `${emojiIcon} ` : ''}
        {displayFlavor}
      </ThemedText>
    </View>
  );
}
