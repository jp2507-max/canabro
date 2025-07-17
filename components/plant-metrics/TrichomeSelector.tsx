/**
 * TrichomeSelector - Visual selector for trichome status with color indicators
 * 
 * Features:
 * - Visual indicators for clear/cloudy/amber/mixed states
 * - Color-coded selection with haptic feedback
 * - Smooth animations between states
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';

import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { OptimizedIcon, type IconName } from '@/components/ui/OptimizedIcon';
import { triggerLightHaptic, triggerSelectionHaptic } from '@/lib/utils/haptics';

export type TrichomeStatus = 'clear' | 'cloudy' | 'amber' | 'mixed';

interface TrichomeOption {
  value: TrichomeStatus;
  label: string;
  description: string;
  color: string;
  darkColor: string;
  icon: string;
}

const TRICHOME_OPTIONS: TrichomeOption[] = [
  {
    value: 'clear',
    label: 'trichomeSelector.clear.label',
    description: 'trichomeSelector.clear.description',
    color: 'rgb(219 234 254)', // blue-100
    darkColor: 'rgb(30 58 138)', // blue-800
    icon: 'circle',
  },
  {
    value: 'cloudy',
    label: 'trichomeSelector.cloudy.label',
    description: 'trichomeSelector.cloudy.description',
    color: 'rgb(243 244 246)', // gray-100
    darkColor: 'rgb(55 65 81)', // gray-700
    icon: 'cloud',
  },
  {
    value: 'amber',
    label: 'trichomeSelector.amber.label',
    description: 'trichomeSelector.amber.description',
    color: 'rgb(254 215 170)', // orange-200
    darkColor: 'rgb(154 52 18)', // orange-800
    icon: 'sun',
  },
  {
    value: 'mixed',
    label: 'trichomeSelector.mixed.label',
    description: 'trichomeSelector.mixed.description',
    color: 'rgb(196 181 253)', // purple-200
    darkColor: 'rgb(91 33 182)', // purple-800
    icon: 'shuffle',
  },
];

interface TrichomeSelectorProps {
  value?: TrichomeStatus;
  onChange: (value: TrichomeStatus) => void;
  label?: string;
  error?: string;
}

export const TrichomeSelector: React.FC<TrichomeSelectorProps> = ({
  value,
  onChange,
  label,
  error,
}) => {
  const { t: _t } = useTranslation();

  const handleSelect = (selectedValue: TrichomeStatus) => {
    if (selectedValue === value) return;
    
    onChange(selectedValue);
    triggerSelectionHaptic();
  };

  return (
    <ThemedView className="space-y-3">
      {label && (
        <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {label}
        </ThemedText>
      )}

      <ThemedView className="space-y-2">
        {TRICHOME_OPTIONS.map((option) => (
          <TrichomeOption
            key={option.value}
            option={option}
            isSelected={value === option.value}
            onSelect={() => handleSelect(option.value)}
          />
        ))}
      </ThemedView>

      {error && (
        <ThemedText className="text-sm text-red-500 dark:text-red-400">
          {error}
        </ThemedText>
      )}
    </ThemedView>
  );
};

interface TrichomeOptionProps {
  option: TrichomeOption;
  isSelected: boolean;
  onSelect: () => void;
}

import { useColorScheme } from 'nativewind';

const TrichomeOption: React.FC<TrichomeOptionProps> = ({
  option,
  isSelected,
  onSelect,
}) => {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const scale = useSharedValue(1);
  const borderWidth = useSharedValue(isSelected ? 2 : 1);
  const backgroundColor = useSharedValue(isSelected ? 1 : 0);

  React.useEffect(() => {
    borderWidth.value = withSpring(isSelected ? 2 : 1);
    backgroundColor.value = withSpring(isSelected ? 1 : 0);
  }, [isSelected, borderWidth, backgroundColor]);

  // Cleanup: cancel scale animation on unmount to prevent memory leaks
  React.useEffect(() => {
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { cancelAnimation } = require('react-native-reanimated');
      cancelAnimation(scale);
    };
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    // Use semantic tokens and NativeWind colorScheme for theming
    const isDark = colorScheme === 'dark';
    return {
      transform: [{ scale: scale.value }],
      borderWidth: borderWidth.value,
      borderColor: isSelected
        ? 'rgb(34 197 94)' // green-500
        : isDark
          ? 'rgb(38 38 38)' // neutral-800
          : 'rgb(229 231 235)', // gray-200
      backgroundColor: interpolateColor(
        backgroundColor.value,
        [0, 1],
        isDark
          ? [
              'rgb(23 23 23)', // neutral-900
              'rgb(20 83 45)', // green-900
            ]
          : [
              'rgb(255 255 255)', // white
              'rgb(240 253 244)', // green-50
            ]
      ),
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.98);
    triggerLightHaptic();
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const handlePress = () => {
    onSelect();
  };

  return (
    <Animated.View
      style={[animatedStyle]}
      className="rounded-lg overflow-hidden"
    >
      <Pressable
        className="p-4"
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
      >
        <ThemedView className="flex-row items-center space-x-3">
          {/* Color Indicator */}
          <ThemedView
            className="w-8 h-8 rounded-full items-center justify-center"
            style={{ backgroundColor: option.color }}
          >
            <OptimizedIcon
              name={option.icon as IconName}
              size={16}
              style={{ color: option.darkColor }}
            />
          </ThemedView>

          {/* Content */}
          <ThemedView className="flex-1">
            <ThemedText className="font-medium text-neutral-900 dark:text-neutral-100">
              {t(option.label)}
            </ThemedText>
            <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              {t(option.description)}
            </ThemedText>
          </ThemedView>

          {/* Selection Indicator */}
          {isSelected && (
            <ThemedView className="w-6 h-6 bg-green-500 rounded-full items-center justify-center">
              <OptimizedIcon
                name="checkmark"
                size={12}
                className="text-white"
              />
            </ThemedView>
          )}
        </ThemedView>
      </Pressable>
    </Animated.View>
  );
};