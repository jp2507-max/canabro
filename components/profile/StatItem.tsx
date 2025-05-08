import { Ionicons } from '@expo/vector-icons';
import React from 'react';

import { useTheme } from '../../lib/contexts/ThemeContext';
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';

/**
 * Displays a profile statistic with an icon, value, and label.
 * Optimized for theming and mobile layout.
 */
export interface StatItemProps {
  value: number | string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const StatItem: React.FC<StatItemProps> = React.memo(function StatItem({ value, label, icon }) {
  const { isDarkMode, theme } = useTheme();
  return (
    <ThemedView
      className="mx-1.5 flex-1 items-center rounded-lg p-3"
      lightClassName="bg-neutral-100"
      darkClassName="bg-neutral-800">
      <Ionicons
        name={icon}
        size={22}
        color={isDarkMode ? theme.colors.primary[300] : theme.colors.primary[700]}
        style={{ marginBottom: 4 }}
      />
      <ThemedText
        className="text-lg font-bold"
        lightClassName="text-primary-700"
        darkClassName="text-primary-200"
        accessibilityRole="text">
        {value}
      </ThemedText>
      <ThemedText
        className="mt-1 text-xs"
        lightClassName="text-neutral-500"
        darkClassName="text-neutral-400"
        accessibilityRole="text">
        {label}
      </ThemedText>
    </ThemedView>
  );
});

export default StatItem;
