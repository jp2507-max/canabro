/**
 * FlashList Performance Utilities (2025 Standards)
 * 
 * Enhanced performance utilities for @shopify/flash-list with optimizations for:
 * - Large message histories (10k+ items)
 * - Memory management and virtualization
 * - Smooth scrolling with Reanimated v3.19.0+
 * - Intelligent prefetching and caching
 */

import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import type { FlashList, FlashListProps, FlashListRef, ListRenderItemInfo } from '@shopify/flash-list';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { log } from './logger';
import { useAnimationCleanup } from '../animations/useAnimationCleanup';

export interface FlashListPerformanceConfig {
  // Virtualization settings
  estimatedItemSize: number;
  maxToRenderPerBatch?: number;
  windowSize?: number;
  initialNumToRender?: number;
  
  // Memory management
  removeClippedSubviews?: boolean;
  maxMemoryUsage?: number; // in MB
  enableMemoryOptimization?: boolean;
  
  // Performance optimizations
  enablePrefetching?: boolean;
  prefetchDistance?: number;
  enableCaching?: boolean;
  cacheSize?: number;
  
  // Scroll performance
  enableScrollOptimization?: boolean;
  scrollEventThrottle?: number;
  disableIntervalMomentum?: boolean;
  
  // Debug settings
  enablePerformanceLogging?: boolean;
  logMemoryUsage?: boolean;
}

export interface MessageListItem {
  id: string;
  timestamp: number;
  type: 'message' | 'system' | 'notification';
  size?: number; // estimated size in bytes
  content?: string;
  attachments?: unknown[];
  reactions?: unknown[];
  [key: string]: unknown;
}

export interface PerformanceMetrics {
  totalItems: number;
  renderedItems: number;
  memoryUsage: number;
  scrollPosition: number;
  averageItemSize: number;
  lastUpdate: number;
}

/**
 * Enhanced FlashList configuration for large message histories
 */
export function useFlashListPerformance<T extends MessageListItem>(
  data: T[],
  config: FlashListPerformanceConfig
): {
  flashListProps: Partial<FlashListProps<T>> & { ref: React.RefObject<FlashListRef<T> | null> };
  metrics: PerformanceMetrics;
  scrollToIndex: (index: number, animated?: boolean) => void;
  scrollToTop: (animated?: boolean) => void;
  scrollToBottom: (animated?: boolean) => void;
  clearCache: () => void;
  createRenderItem: (originalRenderItem: FlashListProps<T>['renderItem']) => (info: ListRenderItemInfo<T>) => React.ReactElement | null;
} {
  const flashListRef = useRef<FlashListRef<T>>(null);
  const metricsRef = useRef<PerformanceMetrics>({
    totalItems: 0,
    renderedItems: 0,
    memoryUsage: 0,
    scrollPosition: 0,
    averageItemSize: config.estimatedItemSize,
    lastUpdate: Date.now()
  });
  
  // Shared values for scroll tracking
  const scrollY = useSharedValue(0);
  const isScrolling = useSharedValue(false);
  
  // Cache for rendered items
  const itemCache = useRef<Map<string, { item: T; renderedAt: number }>>(new Map());
  const prefetchCache = useRef<Set<string>>(new Set());
  
  // Performance monitoring
  const performanceInterval = useRef<NodeJS.Timeout | null>(null);
  
  // Setup animation cleanup
  useAnimationCleanup({
    sharedValues: [scrollY, isScrolling],
    onCleanup: () => {
      if (performanceInterval.current) {
        clearInterval(performanceInterval.current);
      }
    }
  });
  
  /**
   * Optimized getItemType for better virtualization
   */
  const getItemType = useCallback((item: T, _index: number) => {
    // Group similar items together for better recycling
    if (item.type === 'system') return 'system';
    if (item.type === 'notification') return 'notification';
    
    // Group messages by size for better memory management
    const estimatedSize = item.size || config.estimatedItemSize;
    if (estimatedSize > config.estimatedItemSize * 2) return 'large_message';
    if (estimatedSize < config.estimatedItemSize * 0.5) return 'small_message';
    
    return 'message';
  }, [config.estimatedItemSize]);
  
  /**
   * Optimized keyExtractor with caching
   */
  const keyExtractor = useCallback((item: T, index: number) => {
    return `${item.id}_${index}`;
  }, []);
  
  /**
   * Memory-optimized renderItem wrapper
   */
  const createRenderItem = useCallback((originalRenderItem: FlashListProps<T>['renderItem']) => {
    return (info: ListRenderItemInfo<T>) => {
      const { item, index } = info;
      
      // Cache management
      if (config.enableCaching) {
        const cacheKey = keyExtractor(item, index);
        const cached = itemCache.current.get(cacheKey);
        
        if (cached && (Date.now() - cached.renderedAt) < 30000) { // 30 second cache
          return originalRenderItem?.({ ...info, item: cached.item });
        }
        
        // Add to cache
        itemCache.current.set(cacheKey, { item, renderedAt: Date.now() });
        
        // Prune cache if too large
        if (itemCache.current.size > (config.cacheSize || 100)) {
          const entries = Array.from(itemCache.current.entries());
          const sortedEntries = entries.sort(([, a], [, b]) => a.renderedAt - b.renderedAt);
          const oldestEntry = sortedEntries[0];
          if (oldestEntry) {
            itemCache.current.delete(oldestEntry[0]);
          }
        }
      }
      
      return originalRenderItem?.(info);
    };
  }, [config.enableCaching, config.cacheSize, keyExtractor]);
  
  /**
   * Scroll event handler with performance optimization
   */
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset } = event.nativeEvent;
    
    // Update shared values for animations
    scrollY.value = contentOffset.y;
    isScrolling.value = true;
    
    // Update metrics
    runOnJS(() => {
      metricsRef.current.scrollPosition = contentOffset.y;
      metricsRef.current.lastUpdate = Date.now();
    })();
    
    // Prefetching logic
    if (config.enablePrefetching) {
      const currentIndex = Math.floor(contentOffset.y / config.estimatedItemSize);
      const prefetchStart = Math.max(0, currentIndex - (config.prefetchDistance || 10));
      const prefetchEnd = Math.min(data.length - 1, currentIndex + (config.prefetchDistance || 10));
      
      runOnJS(() => {
        for (let i = prefetchStart; i <= prefetchEnd; i++) {
          const item = data[i];
          if (item && !prefetchCache.current.has(item.id)) {
            prefetchCache.current.add(item.id);
            // Trigger prefetch logic here if needed
          }
        }
      })();
    }
  }, [config.enablePrefetching, config.prefetchDistance, config.estimatedItemSize, data, scrollY, isScrolling]);
  
  /**
   * Scroll end handler
   */
  const onScrollEnd = useCallback(() => {
    isScrolling.value = false;
  }, [isScrolling]);
  
  /**
   * Memory usage estimation
   */
  const estimateMemoryUsage = useCallback(() => {
    let totalMemory = 0;
    
    // Estimate based on rendered items
    const renderedItems = Math.min(
      data.length,
      (config.windowSize || 10) * (config.maxToRenderPerBatch || 10)
    );
    
    totalMemory += renderedItems * config.estimatedItemSize * 0.001; // Convert to MB
    
    // Add cache memory
    if (config.enableCaching) {
      totalMemory += itemCache.current.size * config.estimatedItemSize * 0.001;
    }
    
    return totalMemory;
  }, [data.length, config]);
  
  /**
   * Performance monitoring
   */
  useEffect(() => {
    if (config.enablePerformanceLogging) {
      performanceInterval.current = setInterval(() => {
        const memoryUsage = estimateMemoryUsage();
        
        metricsRef.current = {
          ...metricsRef.current,
          totalItems: data.length,
          memoryUsage,
          lastUpdate: Date.now()
        };
        
        if (config.logMemoryUsage) {
          log.debug('[FlashListPerformance] Metrics:', metricsRef.current);
        }
        
        // Memory warning
        if (memoryUsage > (config.maxMemoryUsage || 50)) {
          log.warn(`[FlashListPerformance] High memory usage: ${memoryUsage.toFixed(2)}MB`);
          
          if (config.enableMemoryOptimization) {
            // Clear cache to free memory
            itemCache.current.clear();
            prefetchCache.current.clear();
          }
        }
      }, 5000); // Check every 5 seconds
    }
    
    return () => {
      if (performanceInterval.current) {
        clearInterval(performanceInterval.current);
      }
    };
  }, [config, data.length, estimateMemoryUsage]);
  
  /**
   * Scroll control functions
   */
  const scrollToIndex = useCallback((index: number, animated = true) => {
    flashListRef.current?.scrollToIndex({ index, animated });
  }, []);
  
  const scrollToTop = useCallback((animated = true) => {
    flashListRef.current?.scrollToOffset({ offset: 0, animated });
  }, []);
  
  const scrollToBottom = useCallback((animated = true) => {
    const offset = data.length * config.estimatedItemSize;
    flashListRef.current?.scrollToOffset({ offset, animated });
  }, [data.length, config.estimatedItemSize]);
  
  /**
   * Cache management
   */
  const clearCache = useCallback(() => {
    itemCache.current.clear();
    prefetchCache.current.clear();
    log.info('[FlashListPerformance] Cache cleared');
  }, []);
  
  /**
   * Optimized FlashList props
   */
  const flashListProps = useMemo(() => ({
    ref: flashListRef,
    estimatedItemSize: config.estimatedItemSize,
    keyExtractor,
    getItemType,
    onScroll,
    onScrollEndDrag: onScrollEnd,
    onMomentumScrollEnd: onScrollEnd,
    
    // Performance optimizations
    maxToRenderPerBatch: config.maxToRenderPerBatch || 10,
    windowSize: config.windowSize || 10,
    initialNumToRender: config.initialNumToRender || 10,
    removeClippedSubviews: config.removeClippedSubviews ?? true,
    
    // Scroll optimizations
    scrollEventThrottle: config.scrollEventThrottle || 16,
    disableIntervalMomentum: config.disableIntervalMomentum ?? true,
    
    // Memory optimizations
    ...(config.enableMemoryOptimization && {
      removeClippedSubviews: true,
      maxToRenderPerBatch: Math.min(config.maxToRenderPerBatch || 10, 5),
      windowSize: Math.min(config.windowSize || 10, 5),
    })
  }), [
    config,
    keyExtractor,
    getItemType,
    onScroll,
    onScrollEnd
  ]);
  
  return {
    flashListProps,
    metrics: metricsRef.current,
    scrollToIndex,
    scrollToTop,
    scrollToBottom,
    clearCache,
    createRenderItem: createRenderItem as (originalRenderItem: FlashListProps<T>['renderItem']) => (info: ListRenderItemInfo<T>) => React.ReactElement | null
  };
}

/**
 * Preset configurations for different use cases
 */
export const FLASHLIST_PRESETS = {
  // For large message histories (10k+ items)
  LARGE_MESSAGE_HISTORY: {
    estimatedItemSize: 80,
    maxToRenderPerBatch: 5,
    windowSize: 5,
    initialNumToRender: 10,
    removeClippedSubviews: true,
    maxMemoryUsage: 30, // 30MB limit
    enableMemoryOptimization: true,
    enablePrefetching: true,
    prefetchDistance: 5,
    enableCaching: true,
    cacheSize: 50,
    enableScrollOptimization: true,
    scrollEventThrottle: 16,
    disableIntervalMomentum: true,
    enablePerformanceLogging: true,
    logMemoryUsage: false
  } as FlashListPerformanceConfig,
  
  // For activity feeds
  ACTIVITY_FEED: {
    estimatedItemSize: 120,
    maxToRenderPerBatch: 8,
    windowSize: 8,
    initialNumToRender: 15,
    removeClippedSubviews: true,
    maxMemoryUsage: 40,
    enableMemoryOptimization: true,
    enablePrefetching: true,
    prefetchDistance: 10,
    enableCaching: true,
    cacheSize: 100,
    enableScrollOptimization: true,
    scrollEventThrottle: 16,
    enablePerformanceLogging: false
  } as FlashListPerformanceConfig,
  
  // For user lists
  USER_LIST: {
    estimatedItemSize: 60,
    maxToRenderPerBatch: 10,
    windowSize: 10,
    initialNumToRender: 20,
    removeClippedSubviews: true,
    maxMemoryUsage: 20,
    enableMemoryOptimization: false,
    enablePrefetching: false,
    enableCaching: true,
    cacheSize: 200,
    enableScrollOptimization: true,
    scrollEventThrottle: 16,
    enablePerformanceLogging: false
  } as FlashListPerformanceConfig,
  
  // For notifications
  NOTIFICATION_LIST: {
    estimatedItemSize: 100,
    maxToRenderPerBatch: 6,
    windowSize: 6,
    initialNumToRender: 12,
    removeClippedSubviews: true,
    maxMemoryUsage: 25,
    enableMemoryOptimization: true,
    enablePrefetching: false,
    enableCaching: true,
    cacheSize: 75,
    enableScrollOptimization: true,
    scrollEventThrottle: 16,
    enablePerformanceLogging: false
  } as FlashListPerformanceConfig
};

/**
 * Hook for monitoring FlashList performance
 */
export function useFlashListMetrics() {
  const metricsRef = useRef<{
    renderCount: number;
    averageRenderTime: number;
    memoryPressureEvents: number;
    scrollEvents: number;
    lastReset: number;
  }>({
    renderCount: 0,
    averageRenderTime: 0,
    memoryPressureEvents: 0,
    scrollEvents: 0,
    lastReset: Date.now()
  });
  
  const recordRender = useCallback((renderTime: number) => {
    const metrics = metricsRef.current;
    metrics.renderCount++;
    metrics.averageRenderTime = (metrics.averageRenderTime + renderTime) / 2;
  }, []);
  
  const recordMemoryPressure = useCallback(() => {
    metricsRef.current.memoryPressureEvents++;
  }, []);
  
  const recordScrollEvent = useCallback(() => {
    metricsRef.current.scrollEvents++;
  }, []);
  
  const resetMetrics = useCallback(() => {
    metricsRef.current = {
      renderCount: 0,
      averageRenderTime: 0,
      memoryPressureEvents: 0,
      scrollEvents: 0,
      lastReset: Date.now()
    };
  }, []);
  
  const getMetrics = useCallback(() => ({ ...metricsRef.current }), []);
  
  return {
    recordRender,
    recordMemoryPressure,
    recordScrollEvent,
    resetMetrics,
    getMetrics
  };
}

/**
 * Utility for optimizing large datasets before passing to FlashList
 */
export function optimizeDataset<T extends MessageListItem>(
  data: T[],
  options: {
    maxItems?: number;
    sortBy?: keyof T;
    sortOrder?: 'asc' | 'desc';
    filterDuplicates?: boolean;
    estimateItemSizes?: boolean;
  } = {}
): T[] {
  let optimizedData = [...data];
  
  // Filter duplicates
  if (options.filterDuplicates) {
    const seen = new Set<string>();
    optimizedData = optimizedData.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }
  
  // Sort data
  if (options.sortBy) {
    optimizedData.sort((a, b) => {
      const aVal = a[options.sortBy!];
      const bVal = b[options.sortBy!];
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return options.sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
      }
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return options.sortOrder === 'desc' 
          ? bVal.localeCompare(aVal)
          : aVal.localeCompare(bVal);
      }
      
      return 0;
    });
  }
  
  // Limit dataset size
  if (options.maxItems && optimizedData.length > options.maxItems) {
    optimizedData = optimizedData.slice(0, options.maxItems);
  }
  
  // Estimate item sizes for better virtualization
  if (options.estimateItemSizes) {
    optimizedData = optimizedData.map(item => ({
      ...item,
      size: estimateItemSize(item)
    }));
  }
  
  return optimizedData;
}

/**
 * Estimate item size based on content
 */
function estimateItemSize<T extends MessageListItem>(item: T): number {
  let size = 60; // Base size
  
  // Add size based on content
  if (typeof item.content === 'string') {
    size += Math.min(item.content.length * 0.5, 200); // Max 200px for text
  }
  
  // Add size for attachments
  if (Array.isArray(item.attachments)) {
    size += item.attachments.length * 40; // 40px per attachment
  }
  
  // Add size for reactions
  if (Array.isArray(item.reactions)) {
    size += Math.min(item.reactions.length * 20, 60); // Max 60px for reactions
  }
  
  return Math.ceil(size);
}