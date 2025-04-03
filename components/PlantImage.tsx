import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';

interface PlantImageProps {
  imageUrl?: string | null;
  size?: number;
  iconSize?: number;
  iconColor?: string;
}

export const PlantImage = ({
  imageUrl,
  size = 100,
  iconSize = 40,
  iconColor = '#9ca3af',
}: PlantImageProps) => {
  return (
    <View
      className="items-center justify-center overflow-hidden rounded-lg bg-gray-100"
      style={{ width: size, height: size }}>
      <Ionicons name="leaf-outline" size={iconSize} color={iconColor} />
    </View>
  );
};
