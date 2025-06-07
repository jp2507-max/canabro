import React from 'react';
import { View } from 'react-native';

import ThemedText from '../ui/ThemedText';

interface PlantHeaderProps {
  name: string;
  strain?: string;
}

export function PlantHeader({ name, strain }: PlantHeaderProps) {
  return (
    <View className="items-center bg-transparent px-4 py-8">
      <ThemedText
        variant="heading"
        className="text-center text-4xl font-extrabold text-neutral-900 dark:text-white">
        {name}
      </ThemedText>
      {strain && (
        <ThemedText
          variant="muted"
          className="mt-2 text-center text-xl text-neutral-600 dark:text-neutral-300">
          {strain}
        </ThemedText>
      )}
    </View>
  );
}
