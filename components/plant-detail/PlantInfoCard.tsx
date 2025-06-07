import React from 'react';

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
    <ThemedView variant="card" className={`mb-4 rounded-3xl p-6 shadow-lg ${containerClassName}`}>
      <ThemedText variant="heading" className={`mb-4 text-2xl font-extrabold ${titleClassName}`}>
        {title}
      </ThemedText>
      {children}
    </ThemedView>
  );
}
