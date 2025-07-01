import * as Haptics from '@/lib/utils/haptics';
import { Image } from 'expo-image';
import * as Network from 'expo-network';
import NetInfo, { NetInfoCellularGeneration } from '@react-native-community/netinfo';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, ActivityIndicator, Pressable, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  runOnUI,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';

import { OptimizedIcon, IconName } from './OptimizedIcon';
import ThemedText from './ThemedText';

interface NetworkResilientImageProps {
  url: string | null;
  width?: number | `${number}%`;
  height?: number | `${number}%`;
  borderRadius?: number;
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  fallbackIconName?: IconName;
  fallbackIconSize?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  enableRetry?: boolean;
  showProgress?: boolean;
  enableHaptics?: boolean;
  maxRetries?: number;
  retryDelayMs?: number;
  // Network-aware timeout (will auto-detect if not provided)
  timeoutMs?: number;
  // Image optimization for feeds
  optimize?: boolean;
  quality?: number;
  // Progressive loading
  thumbnailUrl?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Get network-aware timeout values based on current connection
 */
const getNetworkTimeout = async (baseTimeout: number = 6000): Promise<number> => {
  try {
    const networkState = await Network.getNetworkStateAsync();
    const netInfoState = await NetInfo.fetch();
    
    if (networkState.type === Network.NetworkStateType.WIFI) {
      return Math.max(baseTimeout * 0.75, 3000); // 25% faster for WiFi
    }
    
    if (networkState.type === Network.NetworkStateType.CELLULAR) {
      const cellularGeneration = netInfoState.type === 'cellular' 
        ? netInfoState.details?.cellularGeneration 
        : null;
      
      switch (cellularGeneration) {
        case NetInfoCellularGeneration['5g']:
          return Math.max(baseTimeout * 0.5, 2500);
        case NetInfoCellularGeneration['4g']:
          return baseTimeout;
        case NetInfoCellularGeneration['3g']:
          return baseTimeout * 2;
        case NetInfoCellularGeneration['2g']:
          return baseTimeout * 3;
        default:
          return baseTimeout * 1.5;
      }
    }
    
    if (networkState.type === Network.NetworkStateType.NONE) {
      return 1000; // Quick fail for no connection
    }
    
    return baseTimeout;
  } catch (error) {
    console.warn('Failed to detect network conditions:', error);
    return baseTimeout;
  }
};

/**
 * Classify errors for better retry strategies
 */
const shouldRetryError = (error: string): boolean => {
  const retryableErrors = [
    'network', 'timeout', 'connection', 'unreachable', 
    'failed', 'Load timeout', '503', '502', '500'
  ];
  return retryableErrors.some(keyword => 
    error.toLowerCase().includes(keyword.toLowerCase())
  );
};

/**
 * Generate optimized image URL for feeds and mobile
 */
const getOptimizedImageUrl = (
  url: string, 
  retryCount: number, 
  optimize: boolean = true,
  quality: number = 80,
  screenWidth?: number
): string => {
  if (!optimize) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}retry=${retryCount}&t=${Math.floor(Date.now() / 30000)}`;
  }

  const separator = url.includes('?') ? '&' : '?';
  const devicePixelRatio = Platform.OS !== 'web' ? 2 : 1;
  const optimalWidth = screenWidth ? Math.round(screenWidth * devicePixelRatio) : 800;
  
  const params = [
    `retry=${retryCount}`,
    `t=${Math.floor(Date.now() / 30000)}`, // 30-second cache
    `width=${optimalWidth}`,
    `quality=${quality}`,
    'auto=format',
    Platform.OS !== 'web' ? 'format=webp' : '',
  ].filter(Boolean).join('&');
  
  return `${url}${separator}${params}`;
};

/**
 * NetworkResilientImage - A comprehensive image loading solution for React Native
 * 
 * 🚀 **Features**:
 * - **Network-aware timeouts**: Automatically adjusts timeout based on connection (3G/4G/5G/WiFi)
 * - **Smart retry strategy**: Exponential backoff with intelligent error classification
 * - **Progressive loading**: Optional thumbnail → full image progression
 * - **Feed optimization**: Automatic image optimization for mobile feeds (WebP, sizing, quality)
 * - **Enhanced caching**: Memory + disk caching with proper cache headers
 * - **Graceful degradation**: User-friendly error states and retry mechanisms
 * - **Accessibility**: Full a11y support with proper labels and feedback
 * - **Performance**: Optimized for FlatList/feed usage with minimal re-renders
 * 
 * 📱 **Perfect for**:
 * - Social media feeds with user-generated content
 * - Image galleries and catalogs
 * - Profile pictures and avatars
 * - Any scenario requiring reliable image loading on mobile
 * 
 * 🔧 **Usage Example**:
 * ```tsx
 * // Basic usage
 * <NetworkResilientImage url={imageUrl} width={300} height={200} />
 * 
 * // Feed optimization with progressive loading
 * <NetworkResilientImage 
 *   url={fullImageUrl}
 *   thumbnailUrl={thumbnailUrl}
 *   width="100%" 
 *   height={250}
 *   optimize={true}
 *   quality={85}
 *   enableRetry={true}
 * />
 * 
 * // Custom retry behavior
 * <NetworkResilientImage 
 *   url={imageUrl}
 *   maxRetries={5}
 *   timeoutMs={8000} // Override network-aware timeout
 *   onPress={() => openFullScreen()}
 * />
 * ```
 */
export default function NetworkResilientImage({
  url,
  width = '100%' as const,
  height = '100%' as const,
  borderRadius = 0,
  contentFit = 'cover',
  fallbackIconName = 'image-outline',
  fallbackIconSize = 30,
  onPress,
  accessibilityLabel = 'Image',
  enableRetry = true,
  showProgress = true,
  enableHaptics = true,
  maxRetries = 3,
  retryDelayMs = 1000,
  timeoutMs, // Will be auto-detected if not provided
  optimize = true,
  quality = 80,
  thumbnailUrl,
}: NetworkResilientImageProps) {
  // State management
  const [isLoading, setIsLoading] = useState(!!url);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [_loadStartTime, setLoadStartTime] = useState<number>(0);
  const [dynamicTimeout, setDynamicTimeout] = useState(timeoutMs || 6000);
  const [currentImageSrc, setCurrentImageSrc] = useState<string | null>(
    thumbnailUrl || null
  );

  // Refs for cleanup
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Animation values
  const imageOpacity = useSharedValue(0);
  const placeholderOpacity = useSharedValue(1);
  const errorShake = useSharedValue(0);
  const loadingRotation = useSharedValue(0);
  const retryScale = useSharedValue(1);
  const progressOpacity = useSharedValue(0);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, []);

  // Dynamic timeout detection based on network conditions
  useEffect(() => {
    if (timeoutMs) return; // Use provided timeout if specified
    
    const detectNetworkTimeout = async () => {
      try {
        const networkTimeout = await getNetworkTimeout(6000);
        if (isMountedRef.current) {
          setDynamicTimeout(networkTimeout);
        }
      } catch (error) {
        console.warn('Network timeout detection failed:', error);
      }
    };

    detectNetworkTimeout();
  }, [timeoutMs]);

  // Progressive image loading effect
  useEffect(() => {
    if (!url) {
      setCurrentImageSrc(null);
      return;
    }

    // Start with thumbnail if available
    if (thumbnailUrl && currentImageSrc !== url) {
      setCurrentImageSrc(thumbnailUrl);
      
      // Pre-load full image using expo-image
      const fullImageUrl = getOptimizedImageUrl(url, retryCount, optimize, quality);
      Image.prefetch(fullImageUrl)
        .then(() => {
          if (isMountedRef.current) {
            setCurrentImageSrc(url);
          }
        })
        .catch((error) => {
          console.warn('Failed to prefetch full image:', error);
          if (isMountedRef.current) {
            setCurrentImageSrc(url); // Fallback to original URL
          }
        });
    } else {
      setCurrentImageSrc(url);
    }
  }, [url, thumbnailUrl, retryCount, optimize, quality, currentImageSrc]);

  // Handle URL changes - reset state and animations
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    setHasError(false);
    setIsLoading(!!url);
    setRetryCount(0);
    setIsRetrying(false);
    setErrorMessage('');
    setLoadStartTime(0);

    // Clear any pending timeouts
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }

    // Reset animations using worklet to avoid render warnings
    runOnUI(() => {
      'worklet';
      imageOpacity.value = 0;
      placeholderOpacity.value = 1;
      errorShake.value = 0;
      progressOpacity.value = 0;
    })();
  }, [url, imageOpacity, placeholderOpacity, errorShake, progressOpacity]);

  // Loading rotation animation
  useEffect(() => {
    if (isLoading && !hasError) {
      loadingRotation.value = withRepeat(
        withTiming(360, { duration: 1500, easing: Easing.linear }),
        -1,
        false
      );
      progressOpacity.value = withTiming(1, { duration: 300 });
    } else {
      progressOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isLoading, hasError, loadingRotation, progressOpacity]);

  // Generate optimized URL with smart caching and optimization
  const getOptimizedUrl = useCallback((originalUrl: string | null) => {
    if (!originalUrl) return null;
    
    return getOptimizedImageUrl(originalUrl, retryCount, optimize, quality);
  }, [retryCount, optimize, quality]);

  // Calculate retry delay with exponential backoff + jitter (Supabase docs recommend)
  const calculateRetryDelay = useCallback(
    (attempt: number) => {
      const exponential = retryDelayMs * Math.pow(2, attempt);
      const jitter = Math.random() * 1000; // up to +1 s random jitter to reduce thundering herd
      return Math.min(exponential + jitter, 15000); // cap at 15 s
    },
    [retryDelayMs],
  );

  // Handle successful image load
  const handleImageLoad = useCallback(() => {
    if (!isMountedRef.current) return;
    
    setIsLoading(false);
    setHasError(false);
    setIsRetrying(false);
    setErrorMessage('');

    // Clear load timeout
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }

    // Fade in image, fade out placeholder
    imageOpacity.value = withTiming(1, { duration: 400 });
    placeholderOpacity.value = withTiming(0, { duration: 400 });
  }, [imageOpacity, placeholderOpacity]);

  // Enhanced error handling with improved retry logic
  const handleImageError = useCallback((error: { error?: string; message?: string } | string) => {
    if (!isMountedRef.current) return;

    // expo-image onError returns { "error": { code, domain, description }} in nativeEvent
    // Normalise to string & include specific code if available for smarter retry logic
    const errorObj = typeof error === 'string' ? { message: error } : (error as any);
    const errorDetails =
      errorObj?.error?.description ||
      errorObj?.error?.code ||
      errorObj?.message ||
      'Network connection lost';
    console.error(`Error loading image: ${url}`, { error: errorDetails, attempt: retryCount + 1 });
    
    setIsLoading(false);
    setErrorMessage(errorDetails);

    // Clear load timeout
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }

    // Stop infinite rotation
    runOnUI(() => {
      'worklet';
      cancelAnimation(loadingRotation);
    })();

    // Fade in image, fade out placeholder
    imageOpacity.value = withTiming(1, { duration: 400 });
    placeholderOpacity.value = withTiming(0, { duration: 400 });

    // Improved retry decision logic
    const shouldAutoRetry =
      enableRetry && retryCount < maxRetries && shouldRetryError(errorDetails);

    if (shouldAutoRetry) {
      // Auto-retry with exponential backoff
      setIsRetrying(true);
      const delay = calculateRetryDelay(retryCount);
      
      retryTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setRetryCount(prev => prev + 1);
          setIsRetrying(false);
          setIsLoading(true);
          setHasError(false);
          
          // Reset image opacity for retry
          runOnUI(() => {
            'worklet';
            imageOpacity.value = 0;
            placeholderOpacity.value = 1;
          })();
        }
      }, delay);
    } else {
      // Show error state
      setHasError(true);
      
      // Error shake animation
      errorShake.value = withSequence(
        withTiming(-8, { duration: 80 }),
        withTiming(8, { duration: 80 }),
        withTiming(-5, { duration: 60 }),
        withTiming(5, { duration: 60 }),
        withTiming(0, { duration: 80 }),
      );

      // Keep placeholder visible
      placeholderOpacity.value = withTiming(1, { duration: 300 });
    }
  }, [url, retryCount, maxRetries, enableRetry, calculateRetryDelay, imageOpacity, placeholderOpacity, errorShake]);

  // Handle image loading start with network-aware timeout
  const handleLoadStart = useCallback(() => {
    if (!isMountedRef.current) return;
    
    const startTime = Date.now();
    setLoadStartTime(startTime);
    setIsLoading(true);
    setHasError(false);

    // Clear any existing timeout
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    
    // Use dynamic timeout or provided timeout
    const timeout = timeoutMs || dynamicTimeout;
    
    // Set a timeout for this specific load attempt
    loadTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        // Only timeout if this is still the current load attempt
        setLoadStartTime(currentStartTime => {
          if (currentStartTime === startTime) {
            handleImageError({ error: 'Load timeout' });
          }
          return currentStartTime;
        });
      }
    }, timeout);
  }, [timeoutMs, dynamicTimeout, handleImageError]);

  // Manual retry function
  const handleManualRetry = useCallback(() => {
    if (!enableRetry || retryCount >= maxRetries) return;

    if (enableHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Retry animation
    retryScale.value = withTiming(0.85, { duration: 150 }, (finished) => {
      'worklet';
      if (finished) {
        retryScale.value = withTiming(1, { duration: 200 });
      }
    });

    // Reset state for retry
    setRetryCount(prev => prev + 1);
    setHasError(false);
    setIsLoading(true);
    setIsRetrying(false);
    setErrorMessage('');
    setLoadStartTime(0);

    // Reset animations
    runOnUI(() => {
      'worklet';
      imageOpacity.value = 0;
      placeholderOpacity.value = 1;
    })();
  }, [enableRetry, retryCount, maxRetries, enableHaptics, retryScale, imageOpacity, placeholderOpacity]);

  // Animated styles
  const imageAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: imageOpacity.value,
    };
  });

  const placeholderAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: placeholderOpacity.value,
      transform: [{ translateX: errorShake.value }, { scale: retryScale.value }],
    };
  });

  const loadingAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: progressOpacity.value,
      transform: [{ rotate: `${loadingRotation.value}deg` }],
    };
  });

  // Render loading indicator with retry info
  const renderLoadingIndicator = () => (
    <View className="h-full w-full items-center justify-center p-3">
      <Animated.View style={loadingAnimatedStyle}>
        <ActivityIndicator size="small" className="text-primary-500" />
      </Animated.View>
      {showProgress && (
        <>
          {retryCount > 0 && (
            <ThemedText
              variant="caption"
              className="mt-2 text-center text-neutral-500 dark:text-neutral-400">
              Retry {retryCount}/{maxRetries}
            </ThemedText>
          )}
          {isRetrying && (
            <ThemedText
              variant="caption"
              className="mt-1 text-center text-primary-600 dark:text-primary-400">
              Retrying...
            </ThemedText>
          )}
        </>
      )}
    </View>
  );

  // Render error state with retry option
  const renderErrorState = () => (
    <View className="h-full w-full items-center justify-center p-3">
      <OptimizedIcon
        name="warning-outline"
        size={fallbackIconSize}
        className="text-status-danger mb-2"
      />
      {enableRetry && retryCount < maxRetries ? (
        <Pressable
          onPress={handleManualRetry}
          className="rounded-lg bg-primary-500 px-3 py-2 min-w-[80px]"
          accessibilityRole="button"
          accessibilityLabel="Retry loading image"
          disabled={retryCount >= maxRetries}>
          <ThemedText className="text-sm font-medium text-white text-center">
            {retryCount >= maxRetries ? 'Failed' : `Retry (${retryCount}/${maxRetries})`}
          </ThemedText>
        </Pressable>
      ) : (
        <View className="items-center">
          <ThemedText
            variant="caption"
            className="text-center text-neutral-500 dark:text-neutral-400 mb-1">
            Image unavailable
          </ThemedText>
          {errorMessage && (
            <ThemedText
              variant="caption"
              className="text-center text-neutral-400 dark:text-neutral-500 text-xs">
              {errorMessage.length > 50 ? `${errorMessage.substring(0, 50)}...` : errorMessage}
            </ThemedText>
          )}
        </View>
      )}
    </View>
  );

  // Render fallback for no URL
  const renderFallback = () => (
    <View className="h-full w-full items-center justify-center">
      <OptimizedIcon
        name={fallbackIconName}
        size={fallbackIconSize}
        className="text-neutral-600 dark:text-neutral-400"
      />
    </View>
  );

  // Main component render
  const containerContent = (
    <View
      className="relative overflow-hidden bg-neutral-200 dark:bg-neutral-800"
      style={{
        width,
        height,
        borderRadius,
      }}>
      
      {/* Image layer with enhanced caching and progressive loading */}
      {currentImageSrc && (
        <Animated.View
          style={[{ position: 'absolute', width: '100%', height: '100%' }, imageAnimatedStyle]}>
          <Image
            source={{ 
              uri: getOptimizedUrl(currentImageSrc) || undefined,
              headers: {
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Accept': Platform.OS !== 'web' ? 'image/webp,image/avif,image/jpeg,image/png,image/*,*/*;q=0.8' : '*/*',
                'Accept-Encoding': 'gzip, br',
              },
            }}
            style={{ width: '100%', height: '100%' }}
            contentFit={contentFit}
            accessibilityLabel={accessibilityLabel}
            transition={300}
            cachePolicy="memory-disk"
            recyclingKey={`${currentImageSrc}-${retryCount}`}
            onLoadStart={handleLoadStart}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </Animated.View>
      )}

      {/* Placeholder/Loading/Error overlay */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          },
          placeholderAnimatedStyle,
        ]}>
        {!currentImageSrc
          ? renderFallback()
          : isLoading || isRetrying
            ? renderLoadingIndicator()
            : hasError
              ? renderErrorState()
              : null}
      </Animated.View>
    </View>
  );

  // Wrap in pressable if onPress provided
  if (onPress) {
    return (
      <AnimatedPressable
        onPress={() => {
          if (enableHaptics) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel}, tap to open`}>
        {containerContent}
      </AnimatedPressable>
    );
  }

  return containerContent;
}
