import React from 'react';
import { View, Text } from 'react-native';

import { useTheme } from '../../lib/contexts/ThemeContext';

interface TagPillProps {
  text: string;
  isDarkMode?: boolean;
}

export function TagPill({ text, isDarkMode }: TagPillProps) {
  const { theme, isDarkMode: themeDarkMode } = useTheme();
  const dark = isDarkMode ?? themeDarkMode;
  return (
    <View
      className="mr-2 rounded-full px-3 py-1"
      style={{ backgroundColor: dark ? theme.colors.neutral[700] : theme.colors.neutral[200] }}>
      <Text
        className="text-xs font-medium"
        style={{ color: dark ? theme.colors.neutral[300] : theme.colors.neutral[700] }}>
        {text}
      </Text>
    </View>
  );
}

export default TagPill;
