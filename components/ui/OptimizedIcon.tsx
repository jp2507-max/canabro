import React, { memo } from 'react';
import { View, Text, Platform } from 'react-native';

// Enhanced icon mapping with better semantic distinction
const IconSVG = {
  // Basic icons with distinct symbols
  add: '＋',
  'add-circle-outline': '⊕',
  'leaf-outline': '🍃',
  leaf: '🌿',
  heart: '♥',
  'heart-outline': '♡',
  close: '✕',
  'close-circle': '⊗',
  send: '📤',

  // Checkmarks with semantic distinction
  checkmark: '✓',
  'check-circle': '☑', // Different from checkmark
  'checkmark-circle': '✅',

  'pricetag-outline': '🏷️',
  'person-circle-outline': '👤',

  // Tab bar icons
  home: '🏠',
  calendar: '📅',
  'calendar-outline': '📆', // Slight distinction
  medkit: '🩺',
  people: '👥',

  // Navigation icons with better distinction
  'chevron-forward-outline': '›',
  'chevron-forward': '▶',
  'chevron-back-outline': '‹',
  'arrow-back': '←',
  pencil: '✏️',
  'chevron-up-outline': '⌃',
  'chevron-up': '▲', // More distinct
  'chevron-down-outline': '⌄',
  'chevron-down': '▼', // More distinct

  'water-outline': '💧',
  'layers-outline': '⧉',

  // Additional commonly used icons
  camera: '📷',
  'camera-outline': '📸', // Slight distinction
  search: '🔍',
  settings: '⚙️',
  edit: '✏️',
  trash: '🗑️',
  share: '📤',
  bookmark: '🔖',
  star: '⭐',
  notification: '🔔',
  'chatbubble-outline': '💬',
  'image-outline': '🖼️',
  'images-outline': '🗂️', // Different for multiple images
  'location-outline': '📍',
  flash: '⚡',
  'flash-off': '🔆',
  'camera-flip-outline': '🔄',

  // Community and help icons
  'help-circle': '❓',

  // Moon and sun icons
  'moon-outline': '🌙',
  'sunny-outline': '☀️',
  sun: '☀️',
  moon: '🌙',

  // Activity and stats icons
  'journal-outline': '📓',
  'stats-chart-outline': '📊',
  'trash-outline': '🗑️',

  // Loading
  loading1: '⭮',

  // MaterialCommunityIcons equivalents
  'flower-tulip-outline': '🌷',
  'image-plus': '🖼️➕',
  check: '✓',
  'note-text-outline': '📝',
  'flask-outline': '🧪',
  'content-cut': '✂️',
  'vector-polyline': '📐',
  waves: '🌊',
  'spider-thread': '🕷️',
  'thermometer-lines': '🌡️',
  'scissors-cutting': '✂️',
  'help-circle-outline': '❓',
  flower: '🌸',
  'flower-outline': '🌺', // Different from flower
  sprout: '🌱',
  'scale-balance': '⚖️',
  'arrow-expand-vertical': '↕️',
  'calendar-range': '📅',
  dna: '🧬',
  // Additional Ionicons
  'globe-outline': '🌐',

  // MaterialCommunityIcons for strains view
  'white-balance-sunny': '☀️',
  'moon-waning-crescent': '🌙',
  'palette-swatch': '🎨',

  // Additional Ionicons for journal and diary
  'settings-outline': '⚙️',
  'share-outline': '📤',
  'document-text-outline': '📄',
  'reader-outline': '📖',
  'nutrition-outline': '🥗',
  'cut-outline': '✂️',
  'warning-outline': '⚠️',

  // Missing icons from TypeScript errors
  'close-outline': '⊗',
  'add-outline': '⊕',
  'chatbubble-ellipses': '💬',
  person: '👤',
  mail: '✉️',
  medal: '🏅',

  // Fallback
  default: '◦',
} as const;

// Icon labels for accessibility
const IconLabels: Record<keyof typeof IconSVG, string> = {
  add: 'Add',
  'add-circle-outline': 'Add item',
  'leaf-outline': 'Leaf outline',
  leaf: 'Leaf',
  heart: 'Heart filled',
  'heart-outline': 'Heart outline',
  close: 'Close',
  'close-circle': 'Close circle',
  send: 'Send',
  checkmark: 'Checkmark',
  'check-circle': 'Check circle',
  'checkmark-circle': 'Checkmark circle',
  'pricetag-outline': 'Price tag',
  'person-circle-outline': 'Person profile',
  home: 'Home',
  calendar: 'Calendar',
  'calendar-outline': 'Calendar outline',
  medkit: 'Medical kit',
  people: 'People',
  'chevron-forward-outline': 'Forward arrow',
  'chevron-forward': 'Forward',
  'chevron-back-outline': 'Back arrow',
  'arrow-back': 'Back',
  pencil: 'Edit',
  'chevron-up-outline': 'Up arrow',
  'chevron-up': 'Up',
  'chevron-down-outline': 'Down arrow',
  'chevron-down': 'Down',
  'water-outline': 'Water',
  'layers-outline': 'Layers',
  camera: 'Camera',
  'camera-outline': 'Camera outline',
  search: 'Search',
  settings: 'Settings',
  edit: 'Edit',
  trash: 'Delete',
  share: 'Share',
  bookmark: 'Bookmark',
  star: 'Star',
  notification: 'Notification',
  'chatbubble-outline': 'Chat',
  'image-outline': 'Image',
  'images-outline': 'Images',
  'location-outline': 'Location',
  flash: 'Flash on',
  'flash-off': 'Flash off',
  'camera-flip-outline': 'Flip camera',
  'help-circle': 'Help',
  'moon-outline': 'Moon',
  'sunny-outline': 'Sun',
  sun: 'Sun',
  moon: 'Moon',
  'journal-outline': 'Journal',
  'stats-chart-outline': 'Statistics',
  'trash-outline': 'Delete',
  loading1: 'Loading',
  'flower-tulip-outline': 'Tulip flower',
  'image-plus': 'Add image',
  check: 'Check',
  'note-text-outline': 'Note',
  'flask-outline': 'Flask',
  'content-cut': 'Cut',
  'vector-polyline': 'Vector line',
  waves: 'Waves',
  'spider-thread': 'Thread',
  'thermometer-lines': 'Temperature',
  'scissors-cutting': 'Scissors',
  'help-circle-outline': 'Help',
  flower: 'Flower',
  'flower-outline': 'Flower outline',
  sprout: 'Sprout',
  'scale-balance': 'Balance',
  'arrow-expand-vertical': 'Expand vertical',
  'calendar-range': 'Date range',
  dna: 'DNA',
  'globe-outline': 'Globe',
  'white-balance-sunny': 'Sunny',
  'moon-waning-crescent': 'Moon crescent',
  'palette-swatch': 'Color palette',
  'settings-outline': 'Settings',
  'share-outline': 'Share',
  'document-text-outline': 'Document',
  'reader-outline': 'Reader',
  'nutrition-outline': 'Nutrition',
  'cut-outline': 'Cut',
  'warning-outline': 'Warning',

  // Missing icons from TypeScript errors
  'close-outline': 'Close',
  'add-outline': 'Add item',
  'chatbubble-ellipses': 'Messages',
  person: 'Person',
  mail: 'Email',
  medal: 'Achievement',

  default: 'Icon',
};

type IconName = keyof typeof IconSVG;

// Platform-specific fallbacks for problematic emojis
const PlatformFallbacks = Platform.select({
  web: {
    // Web fallbacks for better consistency
    'checkmark-circle': '✅',
    'flower-tulip-outline': '🌻', // Better web support
    'spider-thread': '🧵', // Thread emoji as fallback
  },
  android: {
    // Android-specific adjustments
    'thermometer-lines': '🌡️',
  },
  default: {},
}) as Partial<Record<IconName, string>>;

interface OptimizedIconProps {
  name: IconName;
  size?: number;
  color?: string;
  className?: string;
  style?: any;
  accessibilityLabel?: string;
  testID?: string;
  /**
   * Fallback to a more basic symbol if the primary one doesn't render well
   * on the current platform
   */
  allowFallback?: boolean;
}

/**
 * ✅ UPDATED: Lightweight icon component with NativeWind v4 support
 *
 * Now supports both color prop (legacy) and className prop (NativeWind v4)
 * Use className="text-primary-500" for theme colors that change globally
 * Use color="#ff0000" for hardcoded colors (legacy support)
 *
 * Features:
 * - ✅ NEW: NativeWind v4 className support for true "one file" theming
 * - Cross-platform emoji rendering
 * - Full accessibility support
 * - Semantic icon labeling
 * - Platform-specific optimizations
 * - Fallback support for problematic emojis
 *
 * @example
 * ```tsx
 * // ✅ NEW: Use className for theme colors (preferred)
 * <OptimizedIcon name="checkmark" size={24} className="text-primary-500" />
 *
 * // ✅ LEGACY: Still works for hardcoded colors
 * <OptimizedIcon name="checkmark" size={24} color="#00FF00" />
 * ```
 */
export const OptimizedIcon = memo(function OptimizedIcon({
  name,
  size = 24,
  color = '#000',
  className,
  style,
  accessibilityLabel,
  testID,
  allowFallback = true,
}: OptimizedIconProps) {
  // Get symbol with platform fallback support
  const getSymbol = () => {
    if (allowFallback && PlatformFallbacks[name]) {
      return PlatformFallbacks[name];
    }
    return IconSVG[name] || IconSVG.default;
  };

  const symbol = getSymbol();
  const defaultLabel = IconLabels[name] || IconLabels.default;
  const finalLabel = accessibilityLabel || defaultLabel;

  // Platform-specific font size adjustment for better rendering
  const fontSize = Platform.select({
    ios: size * 0.8,
    android: size * 0.75, // Android renders emojis slightly larger
    web: size * 0.8,
    default: size * 0.8,
  });

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={finalLabel}
      testID={testID}>
      <Text
        className={className}
        style={{
          fontSize,
          color: className ? undefined : color,
          lineHeight: size,
          textAlign: 'center',
          // Improve emoji rendering consistency
          fontVariant: Platform.OS === 'ios' ? ['tabular-nums'] : undefined,
        }}
        accessibilityElementsHidden
        selectable={false}>
        {symbol}
      </Text>
    </View>
  );
});

// Export type for TypeScript support
export type { IconName };
