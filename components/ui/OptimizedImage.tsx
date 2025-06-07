import { Image as ExpoImage } from 'expo-image';
import React, { useState, useEffect, useRef } from 'react';
import { View, Image, ImageStyle, LayoutChangeEvent, Dimensions } from 'react-native';

import { assetOptimizations } from '../../lib/utils/production-utils';

interface OptimizedImageProps {
  source: { uri: string } | number;
  style?: ImageStyle;
  placeholder?: boolean;
  width?: number;
  height?: number;
  priority?: 'low' | 'normal' | 'high';
  cachePolicy?: 'memory' | 'disk' | 'none';
  lazyLoad?: boolean;
  threshold?: number; // Distance from viewport to start loading (in pixels)
}

/**
 * Optimized image component with true lazy loading and enhanced format support
 * Features:
 * - True lazy loading with viewport detection
 * - WebP format preference in production (PNG, JPG, JPEG → WebP)
 * - Progressive loading with placeholders
 * - Memory-efficient caching
 * - iOS-optimized rendering
 * - Automatic fallback to original format if optimized version fails
 * - Smart optimization detection (only for local assets and known CDNs)
 */
export function OptimizedImage({
  source,
  style,
  placeholder = true,
  width = 300,
  height = 200,
  priority = 'normal',
  cachePolicy = 'memory',
  lazyLoad = true,
  threshold = 100,
}: OptimizedImageProps) {
  const [hasError, setHasError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(priority === 'high' || !lazyLoad);
  const [currentSource, setCurrentSource] = useState<
    { uri: string; cacheKey?: string } | number | null
  >(null);
  const [componentLayout, setComponentLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const containerRef = useRef<View>(null);

  // Process and optimize source URI with fallback handling
  useEffect(() => {
    if (typeof source === 'object' && source.uri) {
      const originalUri = source.uri;

      // Check if we should attempt optimization
      if (assetOptimizations.shouldUseOptimizedFormat(originalUri)) {
        const optimizedUri = assetOptimizations.getOptimizedImageFormat(originalUri);
        setCurrentSource({
          uri: optimizedUri,
          cacheKey: originalUri, // Use original URI as cache key for consistency
        });
      } else {
        // Use original URI without optimization
        setCurrentSource({
          uri: originalUri,
          cacheKey: originalUri,
        });
      }
    } else {
      setCurrentSource(source);
    }
  }, [source]);

  // Generate placeholder with enhanced error handling
  const placeholderUri = placeholder
    ? assetOptimizations.createPlaceholderUri(
        width,
        height,
        hasError ? 'Failed to load' : 'Loading...'
      )
    : undefined;

  // Handle image load errors with fallback attempt
  const handleImageError = () => {
    if (
      typeof currentSource === 'object' &&
      currentSource?.uri &&
      typeof source === 'object' &&
      source.uri
    ) {
      const fallbackUri = assetOptimizations.getFallbackUri(currentSource.uri, source.uri);

      // If we haven't tried the fallback yet, try it
      if (fallbackUri !== currentSource.uri) {
        setCurrentSource({
          uri: fallbackUri,
          cacheKey: source.uri,
        });
        setHasError(false); // Reset error state for fallback attempt
        return;
      }
    }

    // If fallback also failed or no fallback available, set error state
    setHasError(true);
  };

  // Check if component is in viewport
  const checkVisibility = (layout: { x: number; y: number; width: number; height: number }) => {
    const screenData = Dimensions.get('window');
    const screenHeight = screenData.height;

    // Simple viewport detection - component is visible if it's within screen bounds + threshold
    const isVisible = layout.y < screenHeight + threshold && layout.y + layout.height > -threshold;

    if (isVisible && !shouldLoad) {
      setShouldLoad(true);
    }
  };

  // Handle layout changes for viewport detection
  const handleLayout = (event: LayoutChangeEvent) => {
    if (!lazyLoad || shouldLoad) return;

    const { width: layoutWidth, height: layoutHeight } = event.nativeEvent.layout;

    // Measure absolute position on screen
    containerRef.current?.measureInWindow((windowX, windowY) => {
      const layout = {
        x: windowX,
        y: windowY,
        width: layoutWidth,
        height: layoutHeight,
      };

      setComponentLayout(layout);
      checkVisibility(layout);
    });
  };

  // Re-check visibility when component layout changes
  useEffect(() => {
    if (componentLayout && lazyLoad && !shouldLoad) {
      checkVisibility(componentLayout);
    }
  }, [componentLayout, lazyLoad, shouldLoad]);

  const baseStyle: ImageStyle = { width, height };

  // Show placeholder while not loaded or loading
  if (!shouldLoad && placeholder) {
    return (
      <View ref={containerRef} style={[baseStyle, style]} onLayout={handleLayout}>
        {placeholderUri && <Image source={{ uri: placeholderUri }} style={[baseStyle, style]} />}
      </View>
    );
  }

  // Show error state
  if (hasError && placeholder) {
    return (
      <View
        ref={containerRef}
        style={[
          baseStyle,
          {
            backgroundColor: '#f3f4f6',
            justifyContent: 'center',
            alignItems: 'center',
          },
          style,
        ]}
        onLayout={handleLayout}>
        {placeholderUri && <Image source={{ uri: placeholderUri }} style={[baseStyle, style]} />}
      </View>
    );
  }

  // Render the actual image
  return (
    <View ref={containerRef} onLayout={handleLayout}>
      <ExpoImage
        source={currentSource || source}
        style={[baseStyle, style]}
        contentFit="cover"
        priority={priority}
        cachePolicy={cachePolicy}
        placeholderContentFit="cover"
        placeholder={placeholderUri}
        onLoad={() => {
          setHasError(false);
        }}
        onError={handleImageError}
        transition={200}
      />
    </View>
  );
}

// Hook for scroll-based lazy loading (for use in ScrollView/FlatList)
export const useScrollBasedLazyLoading = (
  scrollY: number,
  componentY: number,
  componentHeight: number,
  threshold: number = 100
) => {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const screenHeight = Dimensions.get('window').height;
    const isVisible =
      componentY < scrollY + screenHeight + threshold &&
      componentY + componentHeight > scrollY - threshold;

    if (isVisible && !shouldLoad) {
      setShouldLoad(true);
    }
  }, [scrollY, componentY, componentHeight, threshold, shouldLoad]);

  return shouldLoad;
};

// Preload critical images for better performance with fallback handling
export const preloadImages = async (imageUris: string[]) => {
  if (__DEV__) return;

  const preloadPromises = imageUris.map(async (uri) => {
    try {
      // Check if we should optimize this URI
      if (assetOptimizations.shouldUseOptimizedFormat(uri)) {
        const optimizedUri = assetOptimizations.getOptimizedImageFormat(uri);

        try {
          // Try to prefetch the optimized version first
          await ExpoImage.prefetch(optimizedUri);
        } catch (optimizedError) {
          // If optimized version fails, fallback to original
          console.warn(
            `Failed to preload optimized image ${optimizedUri}, falling back to original:`,
            optimizedError
          );
          await ExpoImage.prefetch(uri);
        }
      } else {
        // Use original URI without optimization
        await ExpoImage.prefetch(uri);
      }
    } catch (error) {
      console.warn(`Failed to preload image ${uri}:`, error);
      // Continue with other images even if one fails
    }
  });

  // Wait for all preloading attempts to complete
  await Promise.allSettled(preloadPromises);
};
