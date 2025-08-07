import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { FlashList, FlashListProps, FlashListRef } from '@shopify/flash-list';
import Animated from 'react-native-reanimated';
import { Dimensions, Platform, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { validateFlashListProps } from '../../lib/utils/flashlist-performance';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');

// Reanimated-compatible FlashList component with v2 types
export const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);

// Export FlashListRef type for proper ref typing in v2
export type { FlashListRef };

// Re-export FlashList and FlashListProps for convenience
export { FlashList };
export type { FlashListProps };

/**
 * FlashListWrapper
 *
 * A thin wrapper around Shopify's FlashList v2 that injects sensible defaults so
 * individual screens don't have to repeat them. It also keeps the animated
 * variant colocated so we have a single import path.
 *
 * v2 Changes:
 * - Removed estimatedItemSize (automatic sizing in v2)
 * - maintainVisibleContentPosition enabled by default for better scroll handling
 * - Added masonry layout support through props
 * - Enhanced maintainVisibleContentPosition configuration options
 */
type WrapperExtraProps<ItemT> = {
  /**
   * Enables Android bottom-pinning behavior to mimic iOS maintainVisibleContentPosition.
   * When true and user is near bottom, new content keeps list pinned to bottom.
   * @deprecated Use maintainVisibleContentPosition instead for cross-platform consistency
   */
  stickyToBottomOnAndroid?: boolean;
  
  /**
   * Enhanced maintainVisibleContentPosition support with v2 configuration options.
   * Enabled by default with sensible defaults for better UX.
   */
  maintainVisibleContentPosition?: {
    disabled?: boolean;
    autoscrollToTopThreshold?: number;
    autoscrollToBottomThreshold?: number;
    startRenderingFromBottom?: boolean;
    animateAutoScrollToBottom?: boolean;
  };
  
  /**
   * Enable masonry layout for grid-like interfaces with varying item heights.
   * Requires numColumns > 1 to be effective.
   */
  masonry?: boolean;
  
  /**
   * Enable v2-specific performance optimizations.
   * @default true
   */
  enableV2Optimizations?: boolean;
};

export function FlashListWrapper<ItemT>(
  props: FlashListProps<ItemT> & WrapperExtraProps<ItemT>
) {
  const {
    stickyToBottomOnAndroid = false, // Deprecated in favor of maintainVisibleContentPosition
    maintainVisibleContentPosition,
    masonry = false,
    enableV2Optimizations = true,
    onScroll,
    onContentSizeChange,
    ...rest
  } = props;

  // Validate props and show migration warnings on mount and prop changes
  useEffect(() => {
    validateFlashListProps(props, 'FlashListWrapper');
  }, [props]);

  const listRef = useRef<FlashListRef<ItemT>>(null);
  const [nearBottom, setNearBottom] = useState(true);

  // Enhanced maintainVisibleContentPosition with v2 defaults
  const mvp = useMemo(() => {
    // If explicitly disabled, return undefined
    if (maintainVisibleContentPosition?.disabled) {
      return undefined;
    }
    
    // Default configuration for better UX
    const defaultConfig = {
      autoscrollToTopThreshold: 0.1,
      autoscrollToBottomThreshold: 0.2,
      startRenderingFromBottom: false,
      animateAutoScrollToBottom: true,
    };
    
    // Merge with user-provided config
    return {
      ...defaultConfig,
      ...maintainVisibleContentPosition,
    };
  }, [maintainVisibleContentPosition]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      // Only track scroll position if using deprecated stickyToBottomOnAndroid
      if (stickyToBottomOnAndroid) {
        const {
          contentOffset: { y },
          contentSize: { height: contentHeight },
          layoutMeasurement: { height: layoutHeight },
        } = e.nativeEvent;
        const threshold = 40; // px tolerance
        const atBottom = y + layoutHeight >= contentHeight - threshold;
        setNearBottom(atBottom);
      }
      onScroll?.(e);
    },
    [onScroll, stickyToBottomOnAndroid]
  );

  const handleContentSizeChange = useCallback(
    (w: number, h: number) => {
      // Legacy Android bottom-pinning behavior (deprecated)
      if (Platform.OS === 'android' && stickyToBottomOnAndroid && nearBottom) {
        // Keep pinned to bottom on Android when the user is near bottom
        listRef.current?.scrollToEnd({ animated: false });
      }
      onContentSizeChange?.(w, h);
    },
    [nearBottom, onContentSizeChange, stickyToBottomOnAndroid]
  );

  // V2 performance optimizations
  const v2Props = useMemo(() => {
    if (!enableV2Optimizations) return {};
    
    return {
      // Enhanced draw distance for better performance
      drawDistance: WINDOW_HEIGHT * 1.5,
      // Optimize for v2 architecture
      removeClippedSubviews: true,
      // Smooth scrolling
      scrollEventThrottle: 16,
    };
  }, [enableV2Optimizations]);

  return (
    <FlashList
      ref={listRef}
      // V2 performance optimizations
      {...v2Props}
      // Enhanced maintainVisibleContentPosition (enabled by default in v2)
      maintainVisibleContentPosition={mvp}
      // Masonry layout support
      masonry={masonry}
      // Event handlers
      onScroll={handleScroll}
      onContentSizeChange={handleContentSizeChange}
      // Pass through all other props
      {...rest}
    />
  );
}
