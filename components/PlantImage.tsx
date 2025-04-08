import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image'; // Import expo-image
import React from 'react';
import { View } from 'react-native';

interface PlantImageProps {
  imageUrl?: string | null; // Keep imageUrl prop
  size?: number;
  iconSize?: number;
  iconColor?: string;
}

export const PlantImage = ({
  imageUrl,
  size = 100,
  iconSize = 40,
  iconColor = '#9ca3af', // Keep iconColor for fallback
}: PlantImageProps) => {
  // Define placeholder content (the icon)
  const placeholderContent = (
    <View className="h-full w-full items-center justify-center">
      <Ionicons name="leaf-outline" size={iconSize} color={iconColor} />
    </View>
  );

  return (
    <View
      className="items-center justify-center overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800" // Use themed background
      style={{ width: size, height: size }}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={300}
          placeholder={placeholderContent} // Use the icon view as placeholder
          recyclingKey={imageUrl} // Use imageUrl as recyclingKey
          onError={(error) => console.error(`Error loading plant image ${imageUrl}:`, error)}
        />
      ) : (
        // Render placeholder directly if no imageUrl
        placeholderContent
      )}
    </View>
  );
};
