import React from 'react';
import { FlashList, FlashListProps } from '@shopify/flash-list';
import Animated from 'react-native-reanimated';
import { Dimensions } from 'react-native';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');

// Reanimated-compatible FlashList component
export const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);

/**
 * FlashListWrapper
 *
 * A thin wrapper around Shopify's FlashList that injects sensible defaults so
 * individual screens don't have to repeat them. It also keeps the animated
 * variant colocated so we have a single import path.
 *
 * Defaults chosen to roughly match our existing FlatList tuning on Strains
 * screen; they can still be overridden per-usage.
 */
export function FlashListWrapper<ItemT>(props: FlashListProps<ItemT>) {
  return (
    <FlashList
      // ‑- Recommended defaults for smooth 60 FPS scrolling
      estimatedItemSize={300}
      drawDistance={WINDOW_HEIGHT}
      removeClippedSubviews
      scrollEventThrottle={16}
      {...props}
    />
  );
} 