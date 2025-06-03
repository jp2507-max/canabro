import React from 'react';
import { Pressable, View, Text } from 'react-native';

import { OptimizedIcon } from './OptimizedIcon';
import { useTheme } from '../../lib/contexts/ThemeContext';

interface ThemeToggleProps {
  showLabel?: boolean;
  compact?: boolean;
}

function ThemeToggle({ showLabel = true, compact = false }: ThemeToggleProps) {
  const { isDarkMode, toggleTheme } = useTheme();

  const sizeClasses = compact ? 'p-1' : 'p-2';
  const iconSizeClasses = compact ? 'h-8 w-8' : 'h-10 w-10';
  const iconSize = compact ? 16 : 20;
  const textSizeClasses = compact ? 'text-sm' : 'text-base';

  return (
    <Pressable
      onPress={toggleTheme}
      className={`flex-row items-center ${sizeClasses} rounded-full bg-neutral-100 dark:bg-neutral-800 transition-colors`}
      accessibilityRole="switch"
      accessibilityState={{ checked: isDarkMode }}
      accessibilityLabel="Toggle dark mode">
      
      <View className={`${iconSizeClasses} items-center justify-center rounded-full bg-neutral-200 dark:bg-primary-600 transition-colors`}>
        <OptimizedIcon
          name={isDarkMode ? 'moon' : 'sun'}
          size={iconSize}
          color={isDarkMode ? 'white' : '#059669'}
        />
      </View>

      {showLabel && (
        <Text className={`ml-2 ${textSizeClasses} text-neutral-800 dark:text-white transition-colors`}>
          {isDarkMode ? 'Dark' : 'Light'}
        </Text>
      )}
    </Pressable>
  );
}

export default ThemeToggle;
