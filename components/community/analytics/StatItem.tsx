import React from 'react';
import { View } from 'react-native';
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
  <View className="items-center">
    <OptimizedIcon name={icon} size={24} className={`${color} mb-2`} />
    <ThemedText className={`text-2xl font-bold ${color}`}>
      {value.toLocaleString()}
    </ThemedText>
    <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
      {label}
    </ThemedText>
  </View>
);

export default StatItem;
