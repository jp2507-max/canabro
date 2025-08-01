import React from 'react';
import { FlashList, FlashListProps, FlashListRef } from '@shopify/flash-list';
import Animated from 'react-native-reanimated';
import { Dimensions } from 'react-native';

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
export function FlashListWrapper<ItemT>(props: FlashListProps<ItemT>) {
  return (
    <FlashList
      // ‑- Recommended defaults for smooth 60 FPS scrolling
      drawDistance={WINDOW_HEIGHT}
      removeClippedSubviews
      scrollEventThrottle={16}
      // v2 default: better scroll position handling (can be overridden)
      maintainVisibleContentPosition={{
        autoscrollToTopThreshold: 0,
      }}
      {...props}
    />
  );
} 