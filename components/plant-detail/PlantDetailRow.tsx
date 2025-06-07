import React from 'react';
import { View } from 'react-native';

import ThemedText from '../ui/ThemedText';

interface PlantDetailRowProps {
  label: string;
  value: string | number | null | undefined;
  labelClassName?: string;
  valueClassName?: string;
  unit?: string; // e.g., 'cm', '%'
}

export function PlantDetailRow({
  label,
  value,
  labelClassName = '',
  valueClassName = '',
  unit = '',
}: PlantDetailRowProps) {
  if (value === null || typeof value === 'undefined' || value === '') {
    return null; // Don't render if value is not meaningful
  }

  return (
    <View className="mb-3 flex-row items-center justify-between">
      <ThemedText variant="muted" className={`text-base font-medium ${labelClassName}`}>
        {label}
      </ThemedText>
      <ThemedText
        className={`text-base font-bold text-neutral-900 dark:text-white ${valueClassName}`}>
        {value}
        {unit}
      </ThemedText>
    </View>
  );
}
