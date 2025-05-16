import React from 'react';
import { View } from 'react-native';
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';

interface PlantInfoCardProps {
  title: string;
  children: React.ReactNode;
  // Optional class names for further customization if needed
  containerClassName?: string;
  titleClassName?: string;
}

export function PlantInfoCard({
  title,
  children,
  containerClassName = '',
  titleClassName = '',
}: PlantInfoCardProps) {
  return (
    <ThemedView
      className={`mb-4 rounded-xl p-5 shadow-sm ${containerClassName}`}
      lightClassName="bg-white border border-neutral-200"
      darkClassName="bg-neutral-800 border border-neutral-700">
      <ThemedText
        className={`mb-3 text-2xl font-semibold ${titleClassName}`}
        lightClassName="text-neutral-800"
        darkClassName="text-neutral-100">
        {title}
      </ThemedText>
      {children}
    </ThemedView>
  );
}
