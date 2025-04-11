import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';

import { useTheme } from '../../lib/contexts/ThemeContext';

interface StorageImageProps {
  url: string | null;
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  fallbackIconName?: string;
  fallbackIconSize?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
}

/**
 * A component for loading images from Supabase Storage with proper error handling
 * and fallback display.
 */
export default function StorageImage({
  url,
  width = '100%',
  height = '100%',
  borderRadius = 0,
  contentFit = 'cover',
  fallbackIconName = 'image-outline',
  fallbackIconSize = 30,
  onPress,
  accessibilityLabel = 'Image',
}: StorageImageProps) {
  const { theme, isDarkMode } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(url);

  // Handle URL changes
  useEffect(() => {
    setImageUrl(url);
    setHasError(false);
    setIsLoading(true);
  }, [url]);

  // Generate a cache-busting URL if needed
  const getProcessedUrl = (originalUrl: string | null) => {
    if (!originalUrl) return null;

    // Add a cache-busting parameter if not already present
    if (!originalUrl.includes('?')) {
      return `${originalUrl}?t=${Date.now()}`;
    }
    return originalUrl;
  };

  // Placeholder content (loading or error)
  const renderPlaceholder = () => {
    if (isLoading && !hasError) {
      return (
        <View
          style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator
            size="small"
            color={isDarkMode ? theme.colors.neutral[400] : theme.colors.neutral[600]}
          />
        </View>
      );
    }

    if (hasError) {
      return (
        <View
          style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons
            name={fallbackIconName as any} // Type assertion to fix TypeScript error
            size={fallbackIconSize}
            color={isDarkMode ? theme.colors.neutral[600] : theme.colors.neutral[400]}
          />
        </View>
      );
    }

    return null;
  };

  // If no URL, show placeholder
  if (!imageUrl) {
    return (
      <View
        style={{
          width: width as any, // Type assertion to fix TypeScript error
          height: height as any, // Type assertion to fix TypeScript error
          borderRadius,
          backgroundColor: isDarkMode ? theme.colors.neutral[800] : theme.colors.neutral[200],
          overflow: 'hidden',
        }}>
        {renderPlaceholder()}
      </View>
    );
  }

  return (
    <View
      style={{
        width: width as any, // Type assertion to fix TypeScript error
        height: height as any, // Type assertion to fix TypeScript error
        borderRadius,
        backgroundColor: isDarkMode ? theme.colors.neutral[800] : theme.colors.neutral[200],
        overflow: 'hidden',
      }}>
      <Image
        source={{ uri: getProcessedUrl(imageUrl) }}
        style={{ width: '100%', height: '100%' }}
        contentFit={contentFit}
        accessibilityLabel={accessibilityLabel}
        transition={300}
        cachePolicy="memory-disk"
        onLoadStart={() => setIsLoading(true)}
        onLoad={() => {
          setIsLoading(false);
          setHasError(false);
        }}
        onError={(error: any) => {
          // Type annotation for error parameter
          console.error(`Error loading image: ${imageUrl}`, error);
          setIsLoading(false);
          setHasError(true);
        }}
      />
      {(isLoading || hasError) && renderPlaceholder()}
    </View>
  );
}
