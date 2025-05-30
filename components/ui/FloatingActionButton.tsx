import React from 'react';
import { TouchableOpacity, GestureResponderEvent } from 'react-native';

import { useTheme } from '../../lib/contexts/ThemeContext';
import { OptimizedIcon, type IconName } from './OptimizedIcon';

interface FloatingActionButtonProps {
  onPress: () => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  iconName?: IconName;
  accessibilityLabel?: string;
  testID?: string;
  size?: number;
  className?: string; // Added className prop
}

export function FloatingActionButton({
  onPress,
  onLongPress,
  iconName = 'add',
  accessibilityLabel = 'Add',
  testID,
  size = 56,
  className = 'absolute bottom-6 right-6', // Default positioning, can be overridden
}: FloatingActionButtonProps) {
  const { theme, isDarkMode } = useTheme(); // Added isDarkMode
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      // Merged passed className with default styling for the button itself
      className={`items-center justify-center rounded-full shadow-lg dark:shadow-neutral-900/80 ${className}`}
      style={{
        backgroundColor: isDarkMode ? theme.colors.primary[500] : theme.colors.primary[600], // Adjusted for dark/light
        width: size,
        height: size,
        borderRadius: size / 2,
      }}
      activeOpacity={0.85}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      testID={testID}>
      <OptimizedIcon name={iconName} size={size * 0.54} color="white" />
    </TouchableOpacity>
  );
}

export default FloatingActionButton;
