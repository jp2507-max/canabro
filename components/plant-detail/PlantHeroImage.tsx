import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import Reanimated, { SharedTransition, withSpring } from 'react-native-reanimated';

const AnimatedImage = Reanimated.createAnimatedComponent(Image);

interface PlantHeroImageProps {
  imageUrl: string | null | undefined;
  plantId: string;
  imageHeight?: number;
}

const DEFAULT_IMAGE_HEIGHT = 300;

// Helper function for cache-busting URLs
const getProcessedUrl = (originalUrl: string | null | undefined): string | null => {
  if (!originalUrl) return null;
  // Add a cache-busting parameter
  // If a '?' already exists, append with '&', otherwise with '?'
  const separator = originalUrl.includes('?') ? '&' : '?';
  return `${originalUrl}${separator}t=${Date.now()}`;
};

const customTransition = SharedTransition.custom((values) => {
  'worklet';
  return {
    height: withSpring(values.targetHeight),
    width: withSpring(values.targetWidth),
    originX: withSpring(values.targetOriginX),
    originY: withSpring(values.targetOriginY),
  };
});

export function PlantHeroImage({
  imageUrl,
  plantId,
  imageHeight = DEFAULT_IMAGE_HEIGHT,
}: PlantHeroImageProps) {
  const [imageLoadError, setImageLoadError] = useState(false);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  
  // Process the URL when the component mounts or when imageUrl changes
  useEffect(() => {
    if (imageUrl) {
      const processed = getProcessedUrl(imageUrl);
      setProcessedUrl(processed);
      setImageLoadError(false); // Reset error state when URL changes
    } else {
      setProcessedUrl(null);
    }
  }, [imageUrl]);

  // Determine the image source based on URL and load status
  const imageSource = imageLoadError || !processedUrl 
    ? require('../../assets/images/placeholder.png') 
    : { uri: processedUrl };

  console.log('[PlantHeroImage] original imageUrl:', imageUrl);
  console.log('[PlantHeroImage] processedUrl:', processedUrl);
  console.log('[PlantHeroImage] imageSource:', imageSource);

  return (
    <View className="w-full" style={{ height: imageHeight }}>
      <AnimatedImage
        source={imageSource}
        placeholder={require('../../assets/images/placeholder.png')}
        style={{
          width: '100%',
          height: '100%',
        }}
        contentFit="cover"
        transition={1000}
        sharedTransitionTag={`plantImage-${plantId}`}
        sharedTransitionStyle={customTransition}
        onLoad={(e) => {
          console.log('[PlantHeroImage] Image onLoad event:', e);
        }}
        onError={(e) => {
          console.error('[PlantHeroImage] Image onError event:', e.error);
          // If error occurs during load, fallback to placeholder
          setImageLoadError(true);
        }}
      />
    </View>
  );
}
