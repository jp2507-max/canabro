import React from 'react';
import { TouchableOpacity, GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/contexts/ThemeContext';

interface FloatingActionButtonProps {
  onPress: () => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  iconName?: string;
  accessibilityLabel?: string;
  testID?: string;
  size?: number;
}

export function FloatingActionButton({
  onPress,
  onLongPress,
  iconName = 'add',
  accessibilityLabel = 'Add',
  testID,
  size = 56,
}: FloatingActionButtonProps) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      className="absolute bottom-6 right-6 items-center justify-center rounded-full shadow-lg dark:shadow-neutral-900"
      style={{ backgroundColor: theme.colors.primary[500], width: size, height: size, borderRadius: size / 2 }}
      activeOpacity={0.85}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      testID={testID}
    >
      <Ionicons name={iconName as any} size={size * 0.54} color="white" />
    </TouchableOpacity>
  );
}

export default FloatingActionButton;
