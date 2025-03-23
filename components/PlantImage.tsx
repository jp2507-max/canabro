import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  iconColor = '#9ca3af' 
}: PlantImageProps) => {
  return (
    <View 
      className="bg-gray-100 rounded-lg overflow-hidden justify-center items-center"
      style={{ width: size, height: size }}
    >
      <Ionicons name="leaf-outline" size={iconSize} color={iconColor} />
    </View>
  );
};
