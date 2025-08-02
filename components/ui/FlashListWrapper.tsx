import React, { useMemo, useRef, useState, useCallback } from 'react';
import { FlashList, FlashListProps, FlashListRef } from '@shopify/flash-list';
import Animated from 'react-native-reanimated';
import { Dimensions, Platform, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');

// Reanimated-compatible FlashList component
export const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);

// Export FlashListRef type for proper ref typing
export type { FlashListRef };

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
 */
type WrapperExtraProps<ItemT> = {
  /**
   * Enables Android bottom-pinning behavior to mimic iOS maintainVisibleContentPosition.
   * When true and user is near bottom, new content keeps list pinned to bottom.
   */
  stickyToBottomOnAndroid?: boolean;
  /**
   * Pass through maintainVisibleContentPosition; will be applied only on iOS.
   */
  maintainVisibleContentPosition?: NonNullable<FlashListProps<ItemT>['maintainVisibleContentPosition']>;
};

export function FlashListWrapper<ItemT>(
  props: FlashListProps<ItemT> & WrapperExtraProps<ItemT>
) {
  const {
    stickyToBottomOnAndroid = true,
    maintainVisibleContentPosition,
    onScroll,
    onContentSizeChange,
    ...rest
  } = props;

  const listRef = useRef<FlashListRef<ItemT>>(null);
  const [nearBottom, setNearBottom] = useState(true);

  // Only enable maintainVisibleContentPosition on iOS to avoid Android no-op/inconsistencies
  const mvp = useMemo(
    () =>
      Platform.OS === 'ios'
        ? maintainVisibleContentPosition ?? { autoscrollToTopThreshold: 0 }
        : undefined,
    [maintainVisibleContentPosition]
  );

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const {
        contentOffset: { y },
        contentSize: { height: contentHeight },
        layoutMeasurement: { height: layoutHeight },
      } = e.nativeEvent;
      const threshold = 40; // px tolerance
      const atBottom = y + layoutHeight >= contentHeight - threshold;
      setNearBottom(atBottom);
      onScroll?.(e);
    },
    [onScroll]
  );

  const handleContentSizeChange = useCallback(
    (w: number, h: number) => {
      if (Platform.OS === 'android' && stickyToBottomOnAndroid && nearBottom) {
        // Keep pinned to bottom on Android when the user is near bottom
        listRef.current?.scrollToEnd({ animated: false });
      }
      onContentSizeChange?.(w, h);
    },
    [nearBottom, onContentSizeChange, stickyToBottomOnAndroid]
  );

  return (
    <FlashList
      ref={listRef}
      // ‑- Recommended defaults for smooth 60 FPS scrolling
      drawDistance={WINDOW_HEIGHT}
      removeClippedSubviews
      scrollEventThrottle={16}
      // iOS-only; Android gets functional fallback
      maintainVisibleContentPosition={mvp}
      onScroll={handleScroll}
      onContentSizeChange={handleContentSizeChange}
      {...rest}
    />
  );
}
