import { Image } from 'expo-image';
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';

import { OptimizedIcon, IconName } from './OptimizedIcon';
import { useTheme } from '../../lib/contexts/ThemeContext';

interface StorageImageProps {
  url: string | null;
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  fallbackIconName?: IconName;
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
  // Keep only the corrected useState declarations
  const [isLoading, setIsLoading] = useState(!!url); // Initialize loading based on initial url presence
  const [hasError, setHasError] = useState(false);
  // Keep track of the url prop internally if needed, but base rendering logic on the prop directly
  const [internalUrl, setInternalUrl] = useState<string | null>(url);

  // Handle URL changes - reset state
  useEffect(() => {
    setInternalUrl(url);
    setHasError(false);
    setIsLoading(!!url); // Reset loading state based on new url prop
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
          <OptimizedIcon
            name={fallbackIconName}
            size={fallbackIconSize}
            color={isDarkMode ? theme.colors.neutral[600] : theme.colors.neutral[400]}
          />
        </View>
      );
    }

    return null;
  };

  // *** Check the 'url' prop directly ***
  // If the url prop is falsy (null or undefined), render the fallback immediately.
  if (!url) {
    return (
      <View
        style={{
          width: width as any,
          height: height as any,
          borderRadius,
          backgroundColor: isDarkMode ? theme.colors.neutral[800] : theme.colors.neutral[200],
          overflow: 'hidden',
          justifyContent: 'center', // Center fallback icon
          alignItems: 'center', // Center fallback icon
        }}>          <OptimizedIcon
            name={fallbackIconName}
            size={fallbackIconSize}
            color={isDarkMode ? theme.colors.neutral[600] : theme.colors.neutral[400]}
          />
      </View>
    );
  }

  // If url prop is truthy, proceed to render the Image component
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
        // Use the 'url' prop directly for the source URI after processing
        source={{ uri: getProcessedUrl(url) || undefined }}
        style={{ width: '100%', height: '100%' }}
        contentFit={contentFit}
        accessibilityLabel={accessibilityLabel}
        transition={300}
        cachePolicy="memory-disk"
        // Reset loading state only if the URL prop is truthy initially
        onLoadStart={() => setIsLoading(true)}
        onLoad={() => {
          setIsLoading(false);
          setHasError(false);
        }}
        onError={(error: any) => {
          // Log the actual URL prop that failed
          console.error(`Error loading image: ${url}`, error);
          setIsLoading(false);
          setHasError(true);
        }}
      />
      {/* Show placeholder overlay only if loading or error occurred */}
      {(isLoading || hasError) && renderPlaceholder()}
    </View>
  );
}
