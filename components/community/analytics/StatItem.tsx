import React from 'react';
import { View } from 'react-native';
import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';

import type { IconName } from '@/components/ui/OptimizedIcon';

interface StatItemProps {
  label: string;
  value: number;
  color: string;
  icon: IconName;
}

const StatItem: React.FC<StatItemProps> = ({ label, value, color, icon }) => (
  <ThemedView
    className="items-center"
    accessible={true}
    accessibilityRole="text"
    accessibilityLabel={`${label}: ${value.toLocaleString()}`}
  >
    <OptimizedIcon
      name={icon}
      size={24}
      className={`${color} mb-2`}
    />
    <ThemedText
      className={`text-2xl font-bold ${color}`}
      accessibilityRole="text"
      accessibilityLabel={value.toLocaleString()}
      // Prevent double announcement; parent provides combined label
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {value.toLocaleString()}
    </ThemedText>
    <ThemedText
      className="text-xs text-neutral-500 dark:text-neutral-400 text-center"
      accessibilityRole="text"
      accessibilityLabel={label}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {label}
    </ThemedText>
  </ThemedView>
);

export default StatItem;
