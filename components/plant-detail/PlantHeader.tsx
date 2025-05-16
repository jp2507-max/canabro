import React from 'react';
import { View } from 'react-native';
import ThemedText from '../ui/ThemedText'; // Assuming ThemedText is in components/ui/

interface PlantHeaderProps {
  name: string;
  strain?: string;
}

export function PlantHeader({ name, strain }: PlantHeaderProps) {
  return (
    <View className="items-center px-4 py-6 bg-transparent">
      <ThemedText
        className="text-center text-4xl font-bold"
        lightClassName="text-neutral-900"
        darkClassName="text-neutral-100">
        {name}
      </ThemedText>
      {strain && (
        <ThemedText
          className="mt-1 text-center text-xl"
          lightClassName="text-neutral-600"
          darkClassName="text-neutral-300">
          {strain}
        </ThemedText>
      )}
    </View>
  );
}
