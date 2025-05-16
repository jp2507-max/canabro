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
    <View className="mb-2.5 flex-row items-center justify-between">
      <ThemedText
        className={`text-base ${labelClassName}`}
        lightClassName="text-neutral-600"
        darkClassName="text-neutral-300">
        {label}
      </ThemedText>
      <ThemedText
        className={`text-base font-medium ${valueClassName}`}
        lightClassName="text-neutral-800"
        darkClassName="text-neutral-100">
        {value}
        {unit}
      </ThemedText>
    </View>
  );
}
