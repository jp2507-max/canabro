/**
 * FlashList Performance Utilities (2025 Standards)
 * 
 * Enhanced performance utilities for @shopify/flash-list with optimizations for:
 * - Large message histories (10k+ items)
 * - Memory management and virtualization
 * - Smooth scrolling with Reanimated v3.19.0+
 * - Intelligent prefetching and caching
 */

import * as React from 'react';
import { useCallback, useMemo, useRef, useEffect } from 'react';
import type { FlashListProps, FlashListRef, ListRenderItemInfo } from '@shopify/flash-list';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { log } from './logger';
import { useAnimationCleanup } from '../animations/useAnimationCleanup';

/**
 * FlashList v2 Migration Warning System
 */

export interface DeprecatedPropWarning {
  propName: string;
  reason: string;
  migration: string;
  severity: 'warning' | 'error' | 'info';
  docLink?: string;
}

// Track warned props to avoid spam
const warnedProps = new Set<string>();

/**
 * Detects deprecated FlashList v1 props and returns migration warnings
 */
export function detectDeprecatedFlashListProps(props: Record<string, unknown> | null | undefined): DeprecatedPropWarning[] {
  const warnings: DeprecatedPropWarning[] = [];
  if (!props || typeof props !== 'object') return warnings;

  // Size estimation props (no longer needed in v2)
  if ('estimatedItemSize' in props) {
    warnings.push({
      propName: 'estimatedItemSize',
      reason: 'FlashList v2 uses automatic sizing and no longer requires size estimates',
      migration: 'Remove this prop - v2 automatically calculates item sizes for optimal performance',
      severity: 'warning',
      docLink: 'https://shopify.github.io/flash-list/docs/v2-migration'
    });
  }

  if ('estimatedListSize' in props) {
    warnings.push({
      propName: 'estimatedListSize',
      reason: 'FlashList v2 uses automatic sizing and no longer requires list size estimates',
      migration: 'Remove this prop - v2 automatically measures the list container',
      severity: 'warning',
      docLink: 'https://shopify.github.io/flash-list/docs/v2-migration'
    });
  }

  if ('estimatedFirstItemOffset' in props) {
    warnings.push({
      propName: 'estimatedFirstItemOffset',
      reason: 'FlashList v2 uses automatic sizing and no longer requires offset estimates',
      migration: 'Remove this prop - v2 automatically handles first item positioning',
      severity: 'warning',
      docLink: 'https://shopify.github.io/flash-list/docs/v2-migration'
    });
  }

  // Inverted prop replacement
  if ('inverted' in props) {
    warnings.push({
      propName: 'inverted',
      reason: 'The inverted prop is deprecated in favor of maintainVisibleContentPosition',
      migration: 'Replace with: maintainVisibleContentPosition={{ startRenderingFromBottom: true }}',
      severity: 'warning',
      docLink: 'https://shopify.github.io/flash-list/docs/v2-migration'
    });
  }

  // Unsupported props
  if ('onBlankArea' in props) {
    warnings.push({
      propName: 'onBlankArea',
      reason: 'This prop is no longer supported and there are no plans to add it in v2',
      migration: 'Remove this prop - v2\'s improved rendering eliminates blank areas',
      severity: 'error',
      docLink: 'https://shopify.github.io/flash-list/docs/v2-migration'
    });
  }

  if ('disableHorizontalListHeightMeasurement' in props) {
    warnings.push({
      propName: 'disableHorizontalListHeightMeasurement',
      reason: 'This prop is no longer needed in v2\'s automatic sizing system',
      migration: 'Remove this prop - v2 handles horizontal list measurements automatically',
      severity: 'info',
      docLink: 'https://shopify.github.io/flash-list/docs/v2-migration'
    });
  }

  if ('disableAutoLayout' in props) {
    warnings.push({
      propName: 'disableAutoLayout',
      reason: 'There is no auto layout in FlashList v2',
      migration: 'Remove this prop - v2 uses a different layout system',
      severity: 'info',
      docLink: 'https://shopify.github.io/flash-list/docs/v2-migration'
    });
  }

  // MasonryFlashList component usage detection
  if ('MasonryFlashList' in props || props._componentName === 'MasonryFlashList') {
    warnings.push({
      propName: 'MasonryFlashList',
      reason: 'MasonryFlashList component is deprecated in favor of the masonry prop',
      migration: 'Use FlashList with masonry={true} prop instead of MasonryFlashList component',
      severity: 'warning',
      docLink: 'https://shopify.github.io/flash-list/docs/guides/masonry-layout'
    });
  }

  // getColumnFlex prop (from MasonryFlashList)
  if ('getColumnFlex' in props) {
    warnings.push({
      propName: 'getColumnFlex',
      reason: 'getColumnFlex is not supported in FlashList v2 masonry layout',
      migration: 'Remove this prop - v2 masonry uses automatic column balancing',
      severity: 'error',
      docLink: 'https://shopify.github.io/flash-list/docs/guides/masonry-layout'
    });
  }

  // overrideItemLayout with size estimates
  if ('overrideItemLayout' in props && typeof props.overrideItemLayout === 'function') {
    warnings.push({
      propName: 'overrideItemLayout',
      reason: 'overrideItemLayout in v2 only supports span changes, not size estimates',
      migration: 'Update your overrideItemLayout function to only set layout.span - remove layout.size assignments',
      severity: 'info',
      docLink: 'https://shopify.github.io/flash-list/docs/v2-migration'
    });
  }

  return warnings;
}

/**
 * Logs deprecation warnings to console with proper formatting
 */
export function logDeprecationWarnings(warnings: DeprecatedPropWarning[], componentName = 'FlashList'): void {
  if (warnings.length === 0) return;

  // Group warnings by severity
  const errorWarnings = warnings.filter(w => w.severity === 'error');
  const warningWarnings = warnings.filter(w => w.severity === 'warning');
  const infoWarnings = warnings.filter(w => w.severity === 'info');

  // Log header
  log.info(`🚨 FlashList v2 Migration Warnings for ${componentName}`, { warnings });

  // Log errors first
  if (errorWarnings.length > 0) {
    errorWarnings.forEach(warning => {
      const key = `${componentName}-${warning.propName}`;
      if (!warnedProps.has(key)) {
        log.error(`${warning.propName}: ${warning.reason}`, {
          migration: warning.migration,
          docLink: warning.docLink
        });
        warnedProps.add(key);
      }
    });
  }

  // Log warnings
  if (warningWarnings.length > 0) {
    warningWarnings.forEach(warning => {
      const key = `${componentName}-${warning.propName}`;
      if (!warnedProps.has(key)) {
        log.warn(`${warning.propName}: ${warning.reason}`, {
          migration: warning.migration,
          docLink: warning.docLink
        });
        warnedProps.add(key);
      }
    });
  }

  // Log info
  if (infoWarnings.length > 0) {
    infoWarnings.forEach(warning => {
      const key = `${componentName}-${warning.propName}`;
      if (!warnedProps.has(key)) {
        log.info(`${warning.propName}: ${warning.reason}`, {
          migration: warning.migration,
          docLink: warning.docLink
        });
        warnedProps.add(key);
      }
    });
  }
}

/**
 * Validates FlashList props and logs migration warnings
 */
export function validateFlashListProps(props: Record<string, unknown> | object, componentName = 'FlashList'): void {
  const warnings = detectDeprecatedFlashListProps(props as Record<string, unknown>);
  logDeprecationWarnings(warnings, componentName);
}

/**
 * Clears the warned props cache (useful for testing)
 */
export function clearDeprecationWarningCache(): void {
  warnedProps.clear();
}

export interface FlashListV2PerformanceConfig {
  // V2 Note: estimatedItemSize removed - automatic sizing in v2
  
  // Virtualization settings
  maxToRenderPerBatch?: number;
  windowSize?: number;
  initialNumToRender?: number;
  
  // Enhanced memory management
  removeClippedSubviews?: boolean;
  maxMemoryUsage?: number; // in MB
  enableMemoryOptimization?: boolean;
  memoryPressureThreshold?: number; // 0-100 scale, default 80
  enableMemoryPressureDetection?: boolean;
  memoryCleanupStrategy?: 'gentle' | 'moderate' | 'aggressive';
  enableProactiveCleanup?: boolean;
  
  // V2-specific automatic sizing optimizations
  enableAutoSizing?: boolean;
  autoSizingStrategy?: 'conservative' | 'balanced' | 'aggressive';
  enableDynamicSizing?: boolean;
  autoSizingDebug?: boolean;
  enableViewportOptimization?: boolean;
  maintainVisibleContentPosition?: {
    disabled?: boolean;
    autoscrollToTopThreshold?: number;
    autoscrollToBottomThreshold?: number;
    startRenderingFromBottom?: boolean;
    animateAutoScrollToBottom?: boolean;
  };
  
  // Enhanced intelligent caching for v2
  enableIntelligentCaching?: boolean;
  cacheStrategy?: 'memory' | 'hybrid' | 'minimal';
  cacheSize?: number;
  enableCacheHitRateMonitoring?: boolean;
  cacheTimeoutMultiplier?: number; // Multiplier for cache timeout based on strategy
  enableAdaptiveCaching?: boolean; // Adjust cache behavior based on usage patterns
  
  // Performance optimizations
  enablePrefetching?: boolean;
  prefetchDistance?: number;
  
  // Scroll performance
  enableScrollOptimization?: boolean;
  scrollEventThrottle?: number;
  disableIntervalMomentum?: boolean;
  
  // V2 performance monitoring
  enableV2Metrics?: boolean;
  trackRenderingPerformance?: boolean;
  enableAutoSizingMetrics?: boolean;
  enableMemoryMetrics?: boolean;
  
  // Debug settings
  enablePerformanceLogging?: boolean;
  logMemoryUsage?: boolean;
  logCachePerformance?: boolean;
  
  // Masonry layout support
  masonry?: boolean;
  optimizeItemArrangement?: boolean;
}

// Legacy interface for backward compatibility
export interface FlashListPerformanceConfig extends FlashListV2PerformanceConfig {
  /** @deprecated No longer needed in v2 - automatic sizing is enabled */
  estimatedItemSize?: number;
  
  /** @deprecated Use enableIntelligentCaching instead */
  enableCaching?: boolean;
}

export interface MessageListItem {
  id: string;
  timestamp: number;
  type: 'message' | 'system' | 'notification';
  size?: number; // estimated size in bytes
  content?: string;
  attachments?: unknown[];
  reactions?: unknown[];
  
  // V2: Enhanced metadata for automatic sizing and optimization
  _v2Metadata?: {
    complexity: 'low' | 'medium' | 'high';
    hasMedia: boolean;
    hasInteractions: boolean;
    autoSizingHints: {
      contentType: 'text' | 'media' | 'mixed' | 'system' | 'notification';
      dynamicContent: boolean;
      masonrySpan?: number;
      recyclingType: string;
      itemTypeHint: string;
    };
    v2Optimizations: {
      enableAutoSizing: boolean;
      preferredRecyclingPool: string;
      layoutComplexity: 'simple' | 'moderate' | 'complex';
      requiresDynamicSizing: boolean;
    };
  };
  
  // V2: Content preprocessing hints
  _v2ContentHints?: {
    wordCount: number;
    hasLineBreaks: boolean;
    estimatedLines: number;
  };
  
  // V2: Optimized key for better recycling
  _v2OptimizedKey?: string;
  
  // V2: Masonry layout span
  _masonrySpan?: number;
  
  [key: string]: unknown;
}

export interface V2PerformanceMetrics {
  totalItems: number;
  renderedItems: number;
  memoryUsage: number;
  scrollPosition: number;
  autoSizingEfficiency: number; // v2 specific
  viewportOptimizationScore: number; // v2 specific
  dynamicSizingAccuracy: number; // v2 specific
  renderingPerformance: {
    averageFrameTime: number;
    droppedFrames: number;
    smoothScrollPercentage: number;
    autoSizingLatency: number; // v2 specific
    frameDropDetection: {
      totalFrames: number;
      droppedFrames: number;
      frameDropRate: number; // percentage
      consecutiveDrops: number;
      lastFrameTime: number;
    };
    smoothScrollMetrics: {
      totalScrollEvents: number;
      smoothScrollEvents: number;
      smoothScrollPercentage: number;
      averageScrollVelocity: number;
      maxScrollVelocity: number;
    };
  };
  cacheHitRate: number;
  lastUpdate: number;
  // Enhanced memory management metrics
  memoryPressureLevel?: number; // 0-100 scale
  cacheSize?: number;
  cacheMemoryUsage?: number;
  cleanupHistory?: { timestamp: number; freedMemory: number; reason: string }[];
  // V2 specific performance tracking
  autoSizingMetrics?: {
    totalSizingOperations: number;
    averageSizingTime: number;
    sizingAccuracy: number;
    dynamicResizeEvents: number;
    sizingErrors: number;
  };
  framePerformanceHistory?: {
    timestamp: number;
    frameTime: number;
    wasDropped: boolean;
    scrollVelocity?: number;
  }[];
}

// Legacy interface for backward compatibility
export interface PerformanceMetrics extends V2PerformanceMetrics {
  /** @deprecated Not applicable in v2 - items are automatically sized */
  averageItemSize?: number;
}

/**
 * Modular hooks to split responsibilities of useFlashListV2Performance
 *
 * These smaller hooks allow consumers to import just the parts they need
 * (memory management, performance monitoring, caching, scroll handlers)
 * without pulling in the entire monolithic hook. The main hook below now
 * composes these focused hooks.
 */

export type MemoryManagerAPI = {
  memoryManagerRef: React.MutableRefObject<{
    totalAllocated: number;
    cacheAllocated: number;
    pressureLevel: number;
    lastPressureCheck: number;
    cleanupHistory: { timestamp: number; freedMemory: number; reason: string }[];
    cacheHitStats: { hits: number; misses: number; totalRequests: number; hitRate: number };
    memoryPressureCallbacks: (() => void)[];
  }>;
  estimateMemoryUsage: () => number;
  detectMemoryPressure: () => {
    pressureLevel: number;
    shouldCleanup: boolean;
    cleanupReason: string;
    currentMemory: number;
    maxMemory: number;
  };
  performIntelligentCleanup: (reason: string, aggressiveness?: 'gentle' | 'moderate' | 'aggressive') => {
    freedMemory: number;
    cleanupTime: number;
  };
  updateCacheHitRate: (isHit: boolean) => number;
};

/**
 * useFlashListMemoryManager
 * - Encapsulates memory usage estimation, pressure detection, cleanup and cache hit stats
 */
export function useFlashListMemoryManager<T extends MessageListItem>(
  data: T[],
  config: FlashListV2PerformanceConfig,
  refs: {
    itemCacheRef?: React.MutableRefObject<Map<string, { item: T; renderedAt: number }>>;
    prefetchCacheRef?: React.MutableRefObject<Set<string>>;
  } = {}
): MemoryManagerAPI {
  const itemCache = refs.itemCacheRef ?? useRef<Map<string, { item: T; renderedAt: number }>>(new Map());
  const prefetchCache = refs.prefetchCacheRef ?? useRef<Set<string>>(new Set());

  const memoryManager = useRef({
    totalAllocated: 0,
    cacheAllocated: 0,
    pressureLevel: 0,
    lastPressureCheck: Date.now(),
    cleanupHistory: [] as { timestamp: number; freedMemory: number; reason: string }[],
    cacheHitStats: {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      hitRate: 0,
    },
    memoryPressureCallbacks: [] as (() => void)[],
  });

  const updateCacheHitRate = useCallback((isHit: boolean) => {
    const stats = memoryManager.current.cacheHitStats;
    stats.totalRequests++;
    if (isHit) {
      stats.hits++;
    } else {
      stats.misses++;
    }
    const recentWeight = 0.1;
    const currentHitRate = stats.hits / Math.max(stats.totalRequests, 1);
    stats.hitRate = stats.hitRate * (1 - recentWeight) + currentHitRate * recentWeight;

    if (stats.totalRequests > 100 && stats.totalRequests % 50 === 0) {
      if (stats.hitRate < 0.3 && config.cacheStrategy === 'memory') {
        log.warn('[FlashListV2Performance] Low cache hit rate detected. Consider switching to hybrid cache strategy.');
      } else if (stats.hitRate > 0.8 && config.cacheStrategy === 'minimal') {
        log.info('[FlashListV2Performance] High cache hit rate detected. Consider switching to memory cache strategy for better performance.');
      }
    }

    return stats.hitRate;
  }, [config.cacheStrategy]);

  const estimateMemoryUsage = useCallback(() => {
    let totalMemory = 0;
    let cacheMemory = 0;

    const renderedItems = Math.min(
      data.length,
      (config.windowSize || 10) * (config.maxToRenderPerBatch || 10)
    );

    const baseItemMemory = 0.08; // 80KB per item (base estimate)

    let complexityMultiplier = 1.0;
    if (data.length > 0) {
      const sampleSize = Math.min(10, data.length);
      let totalComplexity = 0;
      for (let i = 0; i < sampleSize; i++) {
        const item = data[i];
        if (!item) continue;
        let itemComplexity = 1.0;
        if (typeof item.content === 'string' && item.content.length > 500) {
          itemComplexity += 0.3;
        }
        if (Array.isArray(item.attachments) && item.attachments.length > 0) {
          itemComplexity += item.attachments.length * 0.5;
        }
        if (Array.isArray(item.reactions) && item.reactions.length > 5) {
          itemComplexity += 0.2;
        }
        totalComplexity += itemComplexity;
      }
      complexityMultiplier = totalComplexity / sampleSize;
    }

    const adjustedItemMemory = baseItemMemory * complexityMultiplier;
    totalMemory += renderedItems * adjustedItemMemory;

    if (config.enableIntelligentCaching) {
      const cacheMemoryMultiplier = config.cacheStrategy === 'memory' ? 1.4 :
        config.cacheStrategy === 'hybrid' ? 0.9 : 0.5;

      let cacheItemMemory = 0;
      itemCache.current.forEach(() => {
        let itemMemory = adjustedItemMemory;
        itemMemory += 0.01; // overhead per cached item
        cacheItemMemory += itemMemory;
      });

      cacheMemory = cacheItemMemory * cacheMemoryMultiplier;
      totalMemory += cacheMemory;
    }

    memoryManager.current.totalAllocated = totalMemory;
    memoryManager.current.cacheAllocated = cacheMemory;

    return totalMemory;
  }, [data, config, itemCache]);

  const detectMemoryPressure = useCallback(() => {
    const currentMemory = memoryManager.current.totalAllocated;
    const maxMemory = config.maxMemoryUsage || 50; // MB
    const pressureThreshold = maxMemory * 0.8;
    const criticalThreshold = maxMemory * 0.95;

    let pressureLevel = 0;
    let shouldCleanup = false;
    let cleanupReason = '';

    if (currentMemory > criticalThreshold) {
      pressureLevel = 100;
      shouldCleanup = true;
      cleanupReason = 'Critical memory pressure detected';
    } else if (currentMemory > pressureThreshold) {
      pressureLevel = Math.min(((currentMemory - pressureThreshold) / (maxMemory - pressureThreshold)) * 100, 99);
      shouldCleanup = pressureLevel > 70;
      cleanupReason = 'High memory pressure detected';
    } else {
      pressureLevel = Math.max((currentMemory / pressureThreshold) * 50, 0);
    }

    memoryManager.current.pressureLevel = pressureLevel;
    memoryManager.current.lastPressureCheck = Date.now();

    return { pressureLevel, shouldCleanup, cleanupReason, currentMemory, maxMemory };
  }, [config.maxMemoryUsage]);

  const performIntelligentCleanup = useCallback((reason: string, aggressiveness: 'gentle' | 'moderate' | 'aggressive' = 'moderate') => {
    const startTime = Date.now();
    let freedMemory = 0;
    if (!config.enableIntelligentCaching) {
      return { freedMemory, cleanupTime: 0 };
    }

    const cacheEntries = Array.from(itemCache.current.entries());
    const currentTime = Date.now();
    // Ensure sortedEntries contains only valid [key, item] tuples
    const sortedEntries = cacheEntries
      .sort(([, a], [, b]) => (currentTime - a.renderedAt) - (currentTime - b.renderedAt))
      .reverse()
      .filter((entry): entry is [string, { item: T; renderedAt: number }] => {
        return (
          Array.isArray(entry) &&
          typeof entry[0] === 'string' &&
          entry[1] && typeof entry[1] === 'object' && typeof entry[1].renderedAt === 'number' && 'item' in entry[1]
        );
      });
    if (sortedEntries.length !== cacheEntries.length) {
      if (typeof console !== 'undefined') {
        console.warn('[FlashListV2Performance] Invalid cache entry detected and filtered during cleanup.');
      }
    }

    let entriesToRemove = 0;
    switch (aggressiveness) {
      case 'gentle': entriesToRemove = Math.floor(sortedEntries.length * 0.1); break;
      case 'moderate': entriesToRemove = Math.floor(sortedEntries.length * 0.3); break;
      case 'aggressive': entriesToRemove = Math.floor(sortedEntries.length * 0.6); break;
    }

    if (config.cacheStrategy === 'memory') {
      const maxAge = aggressiveness === 'gentle' ? 120000 : aggressiveness === 'moderate' ? 60000 : 30000;
      const expiredEntries = sortedEntries.filter(([, item]) => (currentTime - item.renderedAt) > maxAge);
      entriesToRemove = Math.max(entriesToRemove, expiredEntries.length);
    } else if (config.cacheStrategy === 'hybrid') {
      entriesToRemove = Math.min(entriesToRemove, Math.floor(sortedEntries.length * 0.4));
    } else if (config.cacheStrategy === 'minimal') {
      entriesToRemove = Math.max(entriesToRemove, Math.floor(sortedEntries.length * 0.7));
    }

    for (let i = 0; i < Math.min(entriesToRemove, sortedEntries.length); i++) {
      const entry = sortedEntries[i];
      if (!entry) continue;
      const [key] = entry;
      if (key) {
        freedMemory += 0.08;
        itemCache.current.delete(key);
      }
    }

    if (aggressiveness === 'aggressive') {
      const prefetchSize = prefetchCache.current.size;
      prefetchCache.current.clear();
      freedMemory += prefetchSize * 0.01;
    }

    const cleanupTime = Date.now() - startTime;
    memoryManager.current.cleanupHistory.push({ timestamp: currentTime, freedMemory, reason: `${reason} (${aggressiveness})` });
    if (memoryManager.current.cleanupHistory.length > 10) {
      memoryManager.current.cleanupHistory = memoryManager.current.cleanupHistory.slice(-10);
    }

    if (config.logMemoryUsage) {
      log.info(`[FlashListV2Performance] Memory cleanup completed`, {
        reason,
        aggressiveness,
        freedMemory: `${freedMemory.toFixed(2)}MB`,
        cleanupTime: `${cleanupTime}ms`,
        remainingCacheSize: itemCache.current.size,
      });
    }

    return { freedMemory, cleanupTime };
  }, [config, itemCache, prefetchCache]);

  return {
    memoryManagerRef: memoryManager,
    estimateMemoryUsage,
    detectMemoryPressure,
    performIntelligentCleanup,
    updateCacheHitRate,
  };
}

export type CacheAPI<T extends MessageListItem> = {
  createRenderItem: (originalRenderItem: FlashListProps<T>['renderItem']) => (info: ListRenderItemInfo<T>) => React.ReactElement | null;
  clearCache: () => void;
  itemCacheRef: React.MutableRefObject<Map<string, { item: T; renderedAt: number }>>;
  prefetchCacheRef: React.MutableRefObject<Set<string>>;
};

/**
 * useFlashListCache
 * - Encapsulates caching logic and provides a renderItem wrapper and clearCache
 */
export function useFlashListCache<T extends MessageListItem>(
  config: FlashListV2PerformanceConfig,
  keyExtractor: (item: T, index: number) => string,
  memory: MemoryManagerAPI,
  refs: {
    itemCacheRef?: React.MutableRefObject<Map<string, { item: T; renderedAt: number }>>;
    prefetchCacheRef?: React.MutableRefObject<Set<string>>;
  } = {}
): CacheAPI<T> {
  const itemCache = refs.itemCacheRef ?? useRef<Map<string, { item: T; renderedAt: number }>>(new Map());
  const prefetchCache = refs.prefetchCacheRef ?? useRef<Set<string>>(new Set());

  const createRenderItem = useCallback((originalRenderItem: FlashListProps<T>['renderItem']) => {
    return (info: ListRenderItemInfo<T>) => {
      if (!originalRenderItem) return null;
      const { item, index } = info;
      if (config.enableIntelligentCaching) {
        const cacheKey = keyExtractor(item, index);
        const cached = itemCache.current.get(cacheKey);
        let cacheTimeout = config.cacheStrategy === 'memory' ? 90000 : config.cacheStrategy === 'hybrid' ? 45000 : 15000;
        const pressureInfo = memory.detectMemoryPressure();
        if (pressureInfo.pressureLevel > 70) {
          cacheTimeout *= 0.5;
        } else if (pressureInfo.pressureLevel < 30) {
          cacheTimeout *= 1.5;
        }
        if (cached && Date.now() - cached.renderedAt < cacheTimeout) {
          memory.updateCacheHitRate(true);
          return originalRenderItem({ ...info, item: cached.item });
        }
        memory.updateCacheHitRate(false);
        itemCache.current.set(cacheKey, { item, renderedAt: Date.now() });

        const baseCacheSize = config.cacheStrategy === 'memory' ? (config.cacheSize || 200) : config.cacheStrategy === 'hybrid' ? (config.cacheSize || 100) : 50;
        let dynamicCacheSize = baseCacheSize;
        if (pressureInfo.pressureLevel > 80) dynamicCacheSize = Math.floor(baseCacheSize * 0.5);
        else if (pressureInfo.pressureLevel > 50) dynamicCacheSize = Math.floor(baseCacheSize * 0.75);

        if (itemCache.current.size > dynamicCacheSize) {
          const cleanupAggressiveness = pressureInfo.pressureLevel > 80 ? 'aggressive' : pressureInfo.pressureLevel > 50 ? 'moderate' : 'gentle';
          memory.performIntelligentCleanup('Cache size exceeded', cleanupAggressiveness);
        }

        if (pressureInfo.shouldCleanup) {
          const cleanupAggressiveness = pressureInfo.pressureLevel > 90 ? 'aggressive' : 'moderate';
          memory.performIntelligentCleanup(pressureInfo.cleanupReason, cleanupAggressiveness);
        }
      }
      return originalRenderItem(info);
    };
  }, [config.enableIntelligentCaching, config.cacheStrategy, config.cacheSize, keyExtractor, memory]);

  const clearCache = useCallback(() => {
    itemCache.current.clear();
    prefetchCache.current.clear();
    log.info('[FlashListPerformance] Cache cleared');
  }, []);

  return { createRenderItem, clearCache, itemCacheRef: itemCache, prefetchCacheRef: prefetchCache };
}

export type ScrollHandlersAPI = {
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onScrollEnd: () => void;
  scrollY: SharedValue<number>;
  isScrolling: SharedValue<boolean>;
};

/**
 * useFlashListScrollHandlers
 * - Encapsulates scroll and scroll-end handlers with reanimated shared values
 */
export function useFlashListScrollHandlers<T extends MessageListItem>(
  config: FlashListV2PerformanceConfig,
  data: T[],
  metricsRef: React.MutableRefObject<V2PerformanceMetrics>,
  performanceMonitorRef: React.MutableRefObject<V2PerformanceMonitor>
): ScrollHandlersAPI {
  const scrollY = useSharedValue(0);
  const isScrolling = useSharedValue(false);
  const previousScrollPosition = useRef(0);
  const previousScrollTime = useRef(Date.now());

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset } = event.nativeEvent;
    const currentTime = Date.now();
    const deltaY = contentOffset.y - previousScrollPosition.current;
    const deltaTime = currentTime - previousScrollTime.current;
    const scrollVelocity = deltaTime > 0 ? Math.abs(deltaY / deltaTime) * 1000 : 0;

    scrollY.value = contentOffset.y;
    isScrolling.value = true;

    runOnJS(() => {
      metricsRef.current.scrollPosition = contentOffset.y;
      metricsRef.current.lastUpdate = currentTime;
      if (config.trackRenderingPerformance) {
        const scrollMetrics = performanceMonitorRef.current.recordScrollEvent(scrollVelocity);
        const currentSmoothMetrics = metricsRef.current.renderingPerformance.smoothScrollMetrics;
        metricsRef.current.renderingPerformance.smoothScrollMetrics = {
          totalScrollEvents: currentSmoothMetrics.totalScrollEvents + 1,
          smoothScrollEvents: scrollMetrics.isSmooth ? currentSmoothMetrics.smoothScrollEvents + 1 : currentSmoothMetrics.smoothScrollEvents,
          smoothScrollPercentage: scrollMetrics.smoothScrollPercentage,
          averageScrollVelocity: scrollMetrics.averageVelocity,
          maxScrollVelocity: scrollMetrics.maxVelocity,
        };
      }
    })();

    previousScrollPosition.current = contentOffset.y;
    previousScrollTime.current = currentTime;

    if (config.enablePrefetching) {
      const { layoutMeasurement } = event.nativeEvent;
      const viewportHeight = layoutMeasurement.height;
      const estimatedItemsInView = Math.ceil(viewportHeight / 80);
      const currentIndex = Math.floor(contentOffset.y / 80);
      const prefetchStart = Math.max(0, currentIndex - (config.prefetchDistance || 10));
      const prefetchEnd = Math.min(data.length - 1, currentIndex + estimatedItemsInView + (config.prefetchDistance || 10));
      runOnJS(() => {
        for (let i = prefetchStart; i <= prefetchEnd; i++) {
          const item = data[i];
          if (item) {
            // no-op placeholder for real prefetcher
          }
        }
      })();
    }
  }, [config.enablePrefetching, config.prefetchDistance, config.trackRenderingPerformance, data, isScrolling, metricsRef, performanceMonitorRef, scrollY]);

  const onScrollEnd = useCallback(() => {
    isScrolling.value = false;
  }, [isScrolling]);

  return { onScroll, onScrollEnd, scrollY, isScrolling };
}

export type PerformanceMonitorAPI = {
  performanceMonitorRef: React.MutableRefObject<V2PerformanceMonitor>;
};

/**
 * useFlashListPerformanceMonitor
 * - Provides a shared V2PerformanceMonitor instance as a ref
 */
export function useFlashListPerformanceMonitor(): PerformanceMonitorAPI {
  const performanceMonitorRef = useRef<V2PerformanceMonitor>(new V2PerformanceMonitor());
  return { performanceMonitorRef };
}

/**
 * V2-specific utility functions for automatic sizing optimization
 */

/**
 * Calculates automatic sizing efficiency based on v2 performance metrics
 */
function calculateAutoSizingEfficiency(
  renderedItems: number,
  totalItems: number,
  strategy: 'conservative' | 'balanced' | 'aggressive' = 'balanced'
): number {
  if (totalItems === 0) return 100;
  
  const renderRatio = renderedItems / totalItems;
  
  // V2 automatic sizing efficiency calculation
  let baseEfficiency = Math.min(renderRatio * 100, 100);
  
  // Adjust based on strategy
  switch (strategy) {
    case 'conservative':
      // Conservative strategy prioritizes stability
      baseEfficiency = Math.min(baseEfficiency * 0.9, 95);
      break;
    case 'aggressive':
      // Aggressive strategy optimizes for performance
      baseEfficiency = Math.min(baseEfficiency * 1.1, 100);
      break;
    case 'balanced':
    default:
      // Balanced strategy (no adjustment)
      break;
  }
  
  return Math.round(baseEfficiency);
}

/**
 * Optimizes viewport rendering based on v2 automatic sizing
 */
function optimizeV2Viewport(
  viewportHeight: number,
  scrollPosition: number,
  totalItems: number,
  config: FlashListV2PerformanceConfig
): {
  optimalWindowSize: number;
  optimalBatchSize: number;
  viewportScore: number;
} {
  // V2 viewport optimization without size estimates
  const baseWindowSize = config.windowSize || 10;
  const baseBatchSize = config.maxToRenderPerBatch || 10;
  
  // Calculate viewport-based optimizations
  const viewportRatio = Math.min(viewportHeight / 800, 2); // Normalize to standard screen
  const itemDensity = totalItems > 0 ? Math.min(totalItems / 100, 5) : 1;
  
  let optimalWindowSize = baseWindowSize;
  let optimalBatchSize = baseBatchSize;
  let viewportScore = 50; // Base score
  
  // Adjust based on automatic sizing strategy
  switch (config.autoSizingStrategy) {
    case 'conservative':
      optimalWindowSize = Math.max(baseWindowSize * 0.8, 5);
      optimalBatchSize = Math.max(baseBatchSize * 0.8, 3);
      viewportScore = 70;
      break;
    case 'aggressive':
      optimalWindowSize = Math.min(baseWindowSize * 1.5, 20);
      optimalBatchSize = Math.min(baseBatchSize * 1.3, 15);
      viewportScore = 85;
      break;
    case 'balanced':
    default:
      optimalWindowSize = Math.round(baseWindowSize * viewportRatio);
      optimalBatchSize = Math.round(baseBatchSize * Math.sqrt(itemDensity));
      viewportScore = 75;
      break;
  }
  
  // Apply viewport optimization if enabled
  if (config.enableViewportOptimization) {
    viewportScore += 10;
    
    // Dynamic adjustments based on scroll position
    const scrollRatio = scrollPosition / Math.max(viewportHeight * totalItems * 0.1, 1);
    if (scrollRatio > 0.8) {
      // Near end of list, reduce batch size
      optimalBatchSize = Math.max(optimalBatchSize * 0.7, 3);
    }
  }
  
  return {
    optimalWindowSize: Math.round(optimalWindowSize),
    optimalBatchSize: Math.round(optimalBatchSize),
    viewportScore: Math.min(viewportScore, 100),
  };
}

/**
 * Frame drop detection and smooth scroll monitoring for v2
 */
class V2PerformanceMonitor {
  private frameHistory: { timestamp: number; frameTime: number; wasDropped: boolean; scrollVelocity?: number }[] = [];
  private scrollHistory: { timestamp: number; velocity: number; isSmooth: boolean }[] = [];
  private autoSizingHistory: { timestamp: number; sizingTime: number; accuracy: number }[] = [];
  private lastFrameTime = 0;
  private consecutiveDrops = 0;
  private totalFrames = 0;
  private droppedFrames = 0;
  private totalScrollEvents = 0;
  private smoothScrollEvents = 0;
  private maxHistorySize = 100;
  private targetFrameRate = 60; // frames per second
  private frameDropThresholdMultiplier = 1.5; // multiplier applied to target frame time
  private smoothVelocityThreshold = 1000; // pixels per second

  constructor(options?: {
    targetFrameRate?: number;
    maxHistorySize?: number;
    smoothVelocityThreshold?: number;
    frameDropThresholdMultiplier?: number;
  }) {
    if (options?.targetFrameRate && options.targetFrameRate > 0) {
      this.targetFrameRate = options.targetFrameRate;
    }
    if (options?.maxHistorySize && options.maxHistorySize > 0) {
      this.maxHistorySize = options.maxHistorySize;
    }
    if (options?.smoothVelocityThreshold && options.smoothVelocityThreshold > 0) {
      this.smoothVelocityThreshold = options.smoothVelocityThreshold;
    }
    if (options?.frameDropThresholdMultiplier && options.frameDropThresholdMultiplier > 0) {
      this.frameDropThresholdMultiplier = options.frameDropThresholdMultiplier;
    }
  }

  setTargetFrameRate(rate: number): void {
    if (rate > 0) {
      this.targetFrameRate = rate;
    }
  }

  setMaxHistorySize(size: number): void {
    if (size > 0) {
      this.maxHistorySize = size;
      // Trim histories to fit new size
      this.frameHistory = this.frameHistory.slice(-this.maxHistorySize);
      this.scrollHistory = this.scrollHistory.slice(-this.maxHistorySize);
      this.autoSizingHistory = this.autoSizingHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Records a frame and detects if it was dropped
   */
  recordFrame(frameTime: number, scrollVelocity?: number): {
    wasDropped: boolean;
    consecutiveDrops: number;
    frameDropRate: number;
  } {
    const currentTime = performance.now();
    const targetFrameTime = 1000 / this.targetFrameRate; // ms per frame at target rate
    const frameDropThreshold = targetFrameTime * this.frameDropThresholdMultiplier; // configurable threshold
    
    const wasDropped = frameTime > frameDropThreshold;
    
    this.totalFrames++;
    if (wasDropped) {
      this.droppedFrames++;
      this.consecutiveDrops++;
    } else {
      this.consecutiveDrops = 0;
    }
    
    // Record frame in history
    this.frameHistory.push({
      timestamp: currentTime,
      frameTime,
      wasDropped,
      scrollVelocity,
    });
    
    // Maintain history size
    if (this.frameHistory.length > this.maxHistorySize) {
      this.frameHistory = this.frameHistory.slice(-this.maxHistorySize);
    }
    
    this.lastFrameTime = frameTime;
    
    return {
      wasDropped,
      consecutiveDrops: this.consecutiveDrops,
      frameDropRate: (this.droppedFrames / this.totalFrames) * 100,
    };
  }

  /**
   * Records scroll event and determines if it was smooth
   */
  recordScrollEvent(velocity: number): {
    isSmooth: boolean;
    smoothScrollPercentage: number;
    averageVelocity: number;
    maxVelocity: number;
  } {
    const currentTime = performance.now();
    const smoothVelocityThreshold = this.smoothVelocityThreshold;
    const isSmooth = Math.abs(velocity) < smoothVelocityThreshold;
    
    this.totalScrollEvents++;
    if (isSmooth) {
      this.smoothScrollEvents++;
    }
    
    // Record scroll in history
    this.scrollHistory.push({
      timestamp: currentTime,
      velocity,
      isSmooth,
    });
    
    // Maintain history size
    if (this.scrollHistory.length > this.maxHistorySize) {
      this.scrollHistory = this.scrollHistory.slice(-this.maxHistorySize);
    }
    
    // Calculate metrics
    const velocities = this.scrollHistory.map(s => Math.abs(s.velocity));
    const averageVelocity = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
    const maxVelocity = Math.max(...velocities);
    
    return {
      isSmooth,
      smoothScrollPercentage: (this.smoothScrollEvents / this.totalScrollEvents) * 100,
      averageVelocity,
      maxVelocity,
    };
  }

  /**
   * Records auto-sizing operation performance
   */
  recordAutoSizing(sizingTime: number, accuracy: number): void {
    this.autoSizingHistory.push({
      timestamp: performance.now(),
      sizingTime,
      accuracy,
    });
    
    // Maintain history size
    if (this.autoSizingHistory.length > this.maxHistorySize) {
      this.autoSizingHistory = this.autoSizingHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Gets comprehensive performance metrics
   */
  getMetrics(): {
    frameDropDetection: {
      totalFrames: number;
      droppedFrames: number;
      frameDropRate: number;
      consecutiveDrops: number;
      lastFrameTime: number;
    };
    smoothScrollMetrics: {
      totalScrollEvents: number;
      smoothScrollEvents: number;
      smoothScrollPercentage: number;
      averageScrollVelocity: number;
      maxScrollVelocity: number;
    };
    autoSizingMetrics: {
      totalSizingOperations: number;
      averageSizingTime: number;
      sizingAccuracy: number;
      dynamicResizeEvents: number;
      sizingErrors: number;
    };
    framePerformanceHistory: { timestamp: number; frameTime: number; wasDropped: boolean; scrollVelocity?: number }[];
  } {
    // Calculate scroll metrics
    const velocities = this.scrollHistory.map(s => Math.abs(s.velocity));
    const averageScrollVelocity = velocities.length > 0 
      ? velocities.reduce((sum, v) => sum + v, 0) / velocities.length 
      : 0;
    const maxScrollVelocity = velocities.length > 0 ? Math.max(...velocities) : 0;

    // Calculate auto-sizing metrics
    const sizingTimes = this.autoSizingHistory.map(s => s.sizingTime);
    const sizingAccuracies = this.autoSizingHistory.map(s => s.accuracy);
    const averageSizingTime = sizingTimes.length > 0 
      ? sizingTimes.reduce((sum, t) => sum + t, 0) / sizingTimes.length 
      : 0;
    const averageSizingAccuracy = sizingAccuracies.length > 0 
      ? sizingAccuracies.reduce((sum, a) => sum + a, 0) / sizingAccuracies.length 
      : 95;

    return {
      frameDropDetection: {
        totalFrames: this.totalFrames,
        droppedFrames: this.droppedFrames,
        frameDropRate: this.totalFrames > 0 ? (this.droppedFrames / this.totalFrames) * 100 : 0,
        consecutiveDrops: this.consecutiveDrops,
        lastFrameTime: this.lastFrameTime,
      },
      smoothScrollMetrics: {
        totalScrollEvents: this.totalScrollEvents,
        smoothScrollEvents: this.smoothScrollEvents,
        smoothScrollPercentage: this.totalScrollEvents > 0 
          ? (this.smoothScrollEvents / this.totalScrollEvents) * 100 
          : 100,
        averageScrollVelocity,
        maxScrollVelocity,
      },
      autoSizingMetrics: {
        totalSizingOperations: this.autoSizingHistory.length,
        averageSizingTime,
        sizingAccuracy: averageSizingAccuracy,
        dynamicResizeEvents: this.autoSizingHistory.filter(s => s.accuracy < 90).length,
        sizingErrors: this.autoSizingHistory.filter(s => s.accuracy < 70).length,
      },
      framePerformanceHistory: [...this.frameHistory],
    };
  }

  /**
   * Resets all performance tracking
   */
  reset(): void {
    this.frameHistory = [];
    this.scrollHistory = [];
    this.autoSizingHistory = [];
    this.lastFrameTime = 0;
    this.consecutiveDrops = 0;
    this.totalFrames = 0;
    this.droppedFrames = 0;
    this.totalScrollEvents = 0;
    this.smoothScrollEvents = 0;
  }
}

/**
 * Tracks v2-specific rendering performance metrics with enhanced monitoring
 */
function trackV2RenderingPerformance(
  startTime: number,
  endTime: number,
  itemCount: number,
  config: FlashListV2PerformanceConfig,
  performanceMonitor: V2PerformanceMonitor,
  scrollVelocity?: number
): {
  frameTime: number;
  autoSizingLatency: number;
  dynamicSizingAccuracy: number;
  frameDropInfo: {
    wasDropped: boolean;
    consecutiveDrops: number;
    frameDropRate: number;
  };
} {
  const frameTime = endTime - startTime;
  
  // Record frame performance
  const frameDropInfo = performanceMonitor.recordFrame(frameTime, scrollVelocity);
  
  // V2 automatic sizing latency (simulated based on item count and strategy)
  let autoSizingLatency = 0;
  if (config.enableAutoSizing) {
    const baseLatency = itemCount * 0.1; // Base latency per item
    
    switch (config.autoSizingStrategy) {
      case 'conservative':
        autoSizingLatency = baseLatency * 0.8; // Faster, less accurate
        break;
      case 'aggressive':
        autoSizingLatency = baseLatency * 1.2; // Slower, more accurate
        break;
      case 'balanced':
      default:
        autoSizingLatency = baseLatency;
        break;
    }
  }
  
  // Dynamic sizing accuracy (higher is better)
  let dynamicSizingAccuracy = 95; // Base accuracy for v2
  if (config.enableDynamicSizing) {
    // Adjust based on configuration and frame performance
    let accuracyAdjustment = config.autoSizingStrategy === 'aggressive' ? 3 : 
                            config.autoSizingStrategy === 'conservative' ? -2 : 0;
    
    // Reduce accuracy if frames are being dropped
    if (frameDropInfo.frameDropRate > 10) {
      accuracyAdjustment -= 5;
    }
    
    dynamicSizingAccuracy += accuracyAdjustment;
  }
  
  // Record auto-sizing performance
  if (config.enableAutoSizingMetrics) {
    performanceMonitor.recordAutoSizing(autoSizingLatency, dynamicSizingAccuracy);
  }
  
  return {
    frameTime,
    autoSizingLatency: Math.max(autoSizingLatency, 0),
    dynamicSizingAccuracy: Math.min(Math.max(dynamicSizingAccuracy, 0), 100),
    frameDropInfo,
  };
}

/**
 * Enhanced FlashList v2 configuration for large message histories
 */
export function useFlashListV2Performance<T extends MessageListItem>(
  data: T[],
  config: FlashListV2PerformanceConfig
): {
  flashListProps: Partial<FlashListProps<T>> & { ref: React.RefObject<FlashListRef<T> | null> };
  metrics: V2PerformanceMetrics;
  scrollToIndex: (index: number, animated?: boolean) => void;
  scrollToTop: (animated?: boolean) => void;
  scrollToBottom: (animated?: boolean) => void;
  clearCache: () => void;
  createRenderItem: (originalRenderItem: FlashListProps<T>['renderItem']) => (info: ListRenderItemInfo<T>) => React.ReactElement | null;
  memoryManager: {
    getMemoryUsage: () => number;
    getMemoryPressure: () => {
      pressureLevel: number;
      shouldCleanup: boolean;
      cleanupReason: string;
      currentMemory: number;
      maxMemory: number;
    };
    performCleanup: (aggressiveness?: 'gentle' | 'moderate' | 'aggressive') => {
      freedMemory: number;
      cleanupTime: number;
    };
    getCacheStats: () => {
      hits: number;
      misses: number;
      totalRequests: number;
      hitRate: number;
    };
    getCleanupHistory: () => { timestamp: number; freedMemory: number; reason: string }[];
    resetCacheStats: () => void;
  };
  performanceMonitor: {
    getMetrics: () => {
      frameDropDetection: {
        totalFrames: number;
        droppedFrames: number;
        frameDropRate: number;
        consecutiveDrops: number;
        lastFrameTime: number;
      };
      smoothScrollMetrics: {
        totalScrollEvents: number;
        smoothScrollEvents: number;
        smoothScrollPercentage: number;
        averageScrollVelocity: number;
        maxScrollVelocity: number;
      };
      autoSizingMetrics: {
        totalSizingOperations: number;
        averageSizingTime: number;
        sizingAccuracy: number;
        dynamicResizeEvents: number;
        sizingErrors: number;
      };
      framePerformanceHistory: { timestamp: number; frameTime: number; wasDropped: boolean; scrollVelocity?: number }[];
    };
    reset: () => void;
    recordFrame: (frameTime: number, scrollVelocity?: number) => { wasDropped: boolean; consecutiveDrops: number; frameDropRate: number };
    recordScrollEvent: (velocity: number) => { isSmooth: boolean; smoothScrollPercentage: number; averageVelocity: number; maxVelocity: number };
    recordAutoSizing: (sizingTime: number, accuracy: number) => void;
  };
} {
  // Validate configuration for deprecated props
  useEffect(() => {
    validateFlashListProps(config as Record<string, unknown>, 'useFlashListV2Performance');
  }, [config]);
  const flashListRef = useRef<FlashListRef<T>>(null);
  const metricsRef = useRef<V2PerformanceMetrics>({
    totalItems: 0,
    renderedItems: 0,
    memoryUsage: 0,
    scrollPosition: 0,
    autoSizingEfficiency: 0,
    viewportOptimizationScore: 0,
    dynamicSizingAccuracy: 95,
    renderingPerformance: {
      averageFrameTime: 16.67,
      droppedFrames: 0,
      smoothScrollPercentage: 100,
      autoSizingLatency: 0,
      frameDropDetection: {
        totalFrames: 0,
        droppedFrames: 0,
        frameDropRate: 0,
        consecutiveDrops: 0,
        lastFrameTime: 0,
      },
      smoothScrollMetrics: {
        totalScrollEvents: 0,
        smoothScrollEvents: 0,
        smoothScrollPercentage: 100,
        averageScrollVelocity: 0,
        maxScrollVelocity: 0,
      },
    },
    cacheHitRate: 0,
    lastUpdate: Date.now(),
    autoSizingMetrics: {
      totalSizingOperations: 0,
      averageSizingTime: 0,
      sizingAccuracy: 95,
      dynamicResizeEvents: 0,
      sizingErrors: 0,
    },
    framePerformanceHistory: [],
  });
  
  const performanceInterval = useRef<NodeJS.Timeout | null>(null);
  const { performanceMonitorRef } = useFlashListPerformanceMonitor();
  
  /**
   * Optimized getItemType for better virtualization (v2 compatible)
   */
  const getItemType = useCallback((item: T, _index: number) => {
    // Group similar items together for better recycling
    if (item.type === 'system') return 'system';
    if (item.type === 'notification') return 'notification';
    
    // V2: Group messages by content complexity instead of size estimates
    if (item.attachments && item.attachments.length > 0) return 'message_with_attachments';
    if (item.reactions && item.reactions.length > 5) return 'message_with_reactions';
    if (item.content && item.content.length > 500) return 'long_message';
    
    return 'message';
  }, []);
  
  /**
   * Optimized keyExtractor with caching
   */
  const keyExtractor = useCallback((item: T, index: number) => {
    return `${item.id}_${index}`;
  }, []);
  
  /**
   * Enhanced V2 intelligent caching renderItem wrapper with memory management
   */
  // Cache + Memory hooks will be wired below after memory manager is created
  
  // Wire memory + cache properly
  // Initialize cache first to get refs, then create memory manager with those refs
  const tempCache = useRef<ReturnType<typeof useFlashListCache<T>> | null>(null);
  if (tempCache.current === null) {
    // bootstrap with internal refs, will be replaced after memory manager init
    type BootstrapMemoryRef = React.MutableRefObject<{
      totalAllocated: number;
      cacheAllocated: number;
      pressureLevel: number;
      lastPressureCheck: number;
      cleanupHistory: { timestamp: number; freedMemory: number; reason: string }[];
      cacheHitStats: { hits: number; misses: number; totalRequests: number; hitRate: number };
      memoryPressureCallbacks: (() => void)[];
    }>;
    const bootstrapRef: BootstrapMemoryRef = { current: {
      totalAllocated: 0,
      cacheAllocated: 0,
      pressureLevel: 0,
      lastPressureCheck: Date.now(),
      cleanupHistory: [],
      cacheHitStats: { hits: 0, misses: 0, totalRequests: 0, hitRate: 0 },
      memoryPressureCallbacks: []
    } };
    tempCache.current = useFlashListCache<T>(config, keyExtractor, {
      memoryManagerRef: bootstrapRef,
      estimateMemoryUsage: () => 0,
      detectMemoryPressure: () => ({ pressureLevel: 0, shouldCleanup: false, cleanupReason: '', currentMemory: 0, maxMemory: config.maxMemoryUsage || 50 }),
      performIntelligentCleanup: () => ({ freedMemory: 0, cleanupTime: 0 }),
      updateCacheHitRate: () => 0,
    } as unknown as MemoryManagerAPI);
  }
  const bootstrapCache = tempCache.current;
  const memory = useFlashListMemoryManager<T>(data, config, {
    itemCacheRef: bootstrapCache.itemCacheRef,
    prefetchCacheRef: bootstrapCache.prefetchCacheRef,
  });
  const cache = useFlashListCache<T>(config, keyExtractor, memory, {
    itemCacheRef: bootstrapCache.itemCacheRef,
    prefetchCacheRef: bootstrapCache.prefetchCacheRef,
  });

  // Scroll handlers
  const { onScroll, onScrollEnd, scrollY, isScrolling } = useFlashListScrollHandlers<T>(
    config,
    data,
    metricsRef,
    performanceMonitorRef
  );
  
  // Setup animation cleanup
  useAnimationCleanup({
    sharedValues: [scrollY, isScrolling],
    onCleanup: () => {
      if (performanceInterval.current) {
        clearInterval(performanceInterval.current);
      }
    }
  });

  // Memory helpers from hook
  const estimateMemoryUsage = memory.estimateMemoryUsage;
  const detectMemoryPressure = memory.detectMemoryPressure;
  const performIntelligentCleanup = memory.performIntelligentCleanup;
  
  /**
   * V2 Performance monitoring with automatic sizing optimizations
   */
  // Track if deprecation warning has been logged to avoid console spam
  const hasLoggedDeprecationWarning = useRef(false);
  useEffect(() => {
    if (!hasLoggedDeprecationWarning.current) {
      validateFlashListProps(config);
      hasLoggedDeprecationWarning.current = true;
    }
    if (config.enablePerformanceLogging || config.enableV2Metrics) {
      performanceInterval.current = setInterval(() => {
        const memoryUsage = estimateMemoryUsage();
        const renderStartTime = performance.now();
        
        // Calculate v2-specific metrics
        const autoSizingEfficiency = calculateAutoSizingEfficiency(
          metricsRef.current.renderedItems,
          data.length,
          config.autoSizingStrategy
        );
        
        // Viewport optimization if enabled
        let viewportOptimizationScore = 50;
        if (config.enableViewportOptimization && flashListRef.current) {
          try {
            // V2: Use viewport-based optimization without requiring specific layout
            const viewportOptimization = optimizeV2Viewport(
              800, // Default viewport height
              metricsRef.current.scrollPosition,
              data.length,
              config
            );
            viewportOptimizationScore = viewportOptimization.viewportScore;
          } catch (_error) {
            // Fallback if optimization fails
            viewportOptimizationScore = 60;
          }
        }
        
        // Track rendering performance with enhanced monitoring
        const renderEndTime = performance.now();
        const currentScrollVelocity = metricsRef.current.renderingPerformance.smoothScrollMetrics?.averageScrollVelocity || 0;
        
        const renderingMetrics = trackV2RenderingPerformance(
          renderStartTime,
          renderEndTime,
          data.length,
          config,
          performanceMonitorRef.current,
          currentScrollVelocity
        );
        
        // Get comprehensive performance metrics from monitor
        const performanceMetrics = performanceMonitorRef.current.getMetrics();
        
        metricsRef.current = {
          ...metricsRef.current,
          totalItems: data.length,
          memoryUsage,
          autoSizingEfficiency,
          viewportOptimizationScore,
          dynamicSizingAccuracy: renderingMetrics.dynamicSizingAccuracy,
          renderingPerformance: {
            averageFrameTime: (metricsRef.current.renderingPerformance.averageFrameTime + renderingMetrics.frameTime) / 2,
            droppedFrames: performanceMetrics.frameDropDetection.droppedFrames,
            smoothScrollPercentage: performanceMetrics.smoothScrollMetrics.smoothScrollPercentage,
            autoSizingLatency: renderingMetrics.autoSizingLatency,
            frameDropDetection: performanceMetrics.frameDropDetection,
            smoothScrollMetrics: performanceMetrics.smoothScrollMetrics,
          },
          autoSizingMetrics: performanceMetrics.autoSizingMetrics,
          framePerformanceHistory: performanceMetrics.framePerformanceHistory,
          lastUpdate: Date.now()
        };
        
        if (config.logMemoryUsage || config.enablePerformanceLogging) {
          log.debug('[FlashListV2Performance] Metrics:', {
            ...metricsRef.current,
            autoSizingStrategy: config.autoSizingStrategy,
            enableDynamicSizing: config.enableDynamicSizing,
          });
        }
        
        // Enhanced V2 memory management and optimization
        const pressureInfo = detectMemoryPressure();
        
        if (pressureInfo.pressureLevel > 70) {
          log.warn(`[FlashListV2Performance] Memory pressure detected: ${pressureInfo.pressureLevel}% (${memoryUsage.toFixed(2)}MB/${pressureInfo.maxMemory}MB)`);
          
          if (config.enableMemoryOptimization) {
            // Intelligent cleanup based on pressure level
            const cleanupAggressiveness = pressureInfo.pressureLevel > 90 ? 'aggressive' :
                                         pressureInfo.pressureLevel > 80 ? 'moderate' : 'gentle';
            
            const cleanupResult = performIntelligentCleanup('Scheduled memory optimization', cleanupAggressiveness);
            
            if (cleanupResult.freedMemory > 0) {
              log.info(`[FlashListV2Performance] Memory cleanup freed ${cleanupResult.freedMemory.toFixed(2)}MB in ${cleanupResult.cleanupTime}ms`);
            }
          }
        }
        
        // Cache performance monitoring
        const cacheStats = memory.memoryManagerRef.current.cacheHitStats;
        if (cacheStats.totalRequests > 0) {
          metricsRef.current.cacheHitRate = cacheStats.hitRate;
          
          // Log cache performance periodically
          if (config.enablePerformanceLogging && cacheStats.totalRequests % 100 === 0) {
            log.debug('[FlashListV2Performance] Cache performance:', {
              hitRate: `${(cacheStats.hitRate * 100).toFixed(1)}%`,
              totalRequests: cacheStats.totalRequests,
              cacheSize: cache.itemCacheRef.current.size,
              cacheMemory: `${memory.memoryManagerRef.current.cacheAllocated.toFixed(2)}MB`,
            });
          }
        }
        
        // Auto-sizing efficiency warning
        if (config.enableAutoSizingMetrics && autoSizingEfficiency < 70) {
          log.warn(`[FlashListV2Performance] Low auto-sizing efficiency: ${autoSizingEfficiency}%`);
          
          if (config.autoSizingDebug) {
            log.debug('[FlashListV2Performance] Auto-sizing debug info:', {
              strategy: config.autoSizingStrategy,
              renderedItems: metricsRef.current.renderedItems,
              totalItems: data.length,
              viewportScore: viewportOptimizationScore,
            });
          }
        }
        
        // Frame drop detection warnings
        if (config.trackRenderingPerformance) {
          const frameMetrics = performanceMetrics.frameDropDetection;
          
          if (frameMetrics.frameDropRate > 15) {
            log.warn(`[FlashListV2Performance] High frame drop rate detected: ${frameMetrics.frameDropRate.toFixed(1)}%`);
            
            // Provide optimization suggestions
            if (frameMetrics.consecutiveDrops > 5) {
              log.warn('[FlashListV2Performance] Consecutive frame drops detected. Consider reducing windowSize or maxToRenderPerBatch.');
            }
            
            if (config.autoSizingStrategy === 'aggressive' && frameMetrics.frameDropRate > 20) {
              log.warn('[FlashListV2Performance] Consider switching to "balanced" autoSizingStrategy for better frame performance.');
            }
          }
          
          // Smooth scroll warnings
          const scrollMetrics = performanceMetrics.smoothScrollMetrics;
          if (scrollMetrics.smoothScrollPercentage < 80 && scrollMetrics.totalScrollEvents > 10) {
            log.warn(`[FlashListV2Performance] Low smooth scroll percentage: ${scrollMetrics.smoothScrollPercentage.toFixed(1)}%`);
            
            if (scrollMetrics.averageScrollVelocity > 1500) {
              log.info('[FlashListV2Performance] High scroll velocity detected. Consider enabling scroll optimization.');
            }
          }
          
          // Auto-sizing performance warnings
          const autoSizingMetrics = performanceMetrics.autoSizingMetrics;
          if (autoSizingMetrics.sizingErrors > 0) {
            log.warn(`[FlashListV2Performance] Auto-sizing errors detected: ${autoSizingMetrics.sizingErrors} errors`);
          }
          
          if (autoSizingMetrics.averageSizingTime > 5) {
            log.warn(`[FlashListV2Performance] Slow auto-sizing performance: ${autoSizingMetrics.averageSizingTime.toFixed(2)}ms average`);
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
    // V2: Use scrollToEnd instead of offset calculation
    flashListRef.current?.scrollToEnd({ animated });
  }, []);
  
  /**
   * Cache management
   */
  const clearCache = useCallback(() => {
    cache.clearCache();
  }, []);
  
  /**
   * V2 optimized FlashList props with automatic sizing
   */
  const flashListProps = useMemo(() => {
    // Calculate optimal viewport settings if enabled
    let optimalSettings = {
      windowSize: config.windowSize || 10,
      maxToRenderPerBatch: config.maxToRenderPerBatch || 10,
    };
    
    if (config.enableViewportOptimization) {
      const viewportOptimization = optimizeV2Viewport(
        800, // Default viewport height
        metricsRef.current.scrollPosition,
        data.length,
        config
      );
      
      optimalSettings = {
        windowSize: viewportOptimization.optimalWindowSize,
        maxToRenderPerBatch: viewportOptimization.optimalBatchSize,
      };
    }
    
    return {
      ref: flashListRef,
      // V2: No estimatedItemSize needed - automatic sizing enabled
      keyExtractor,
      getItemType,
      onScroll,
      onScrollEndDrag: onScrollEnd,
      onMomentumScrollEnd: onScrollEnd,
      
      // V2 specific props with automatic sizing
      maintainVisibleContentPosition: config.maintainVisibleContentPosition,
      masonry: config.masonry,
      optimizeItemArrangement: config.optimizeItemArrangement,
      
      // V2 automatic sizing optimizations
      ...(config.enableAutoSizing !== false && {
        // V2 automatically handles sizing - no manual estimates needed
      }),
      
      // Performance optimizations with v2 enhancements
      maxToRenderPerBatch: optimalSettings.maxToRenderPerBatch,
      windowSize: optimalSettings.windowSize,
      initialNumToRender: config.initialNumToRender || 10,
      removeClippedSubviews: config.removeClippedSubviews ?? true,
      
      // Scroll optimizations
      scrollEventThrottle: config.scrollEventThrottle || 16,
      disableIntervalMomentum: config.disableIntervalMomentum ?? true,
      
      // V2 memory optimizations
      ...(config.enableMemoryOptimization && {
        removeClippedSubviews: true,
        maxToRenderPerBatch: Math.min(optimalSettings.maxToRenderPerBatch, 5),
        windowSize: Math.min(optimalSettings.windowSize, 5),
      }),
      
      // V2 dynamic sizing support
      ...(config.enableDynamicSizing && {
        // V2 handles dynamic sizing automatically
      }),
    };
  }, [
    config,
    data.length,
    keyExtractor,
    getItemType,
    onScroll,
    onScrollEnd
  ]);
  
  return {
    flashListProps,
    metrics: {
      ...metricsRef.current,
      // Enhanced memory management metrics
      memoryPressureLevel: memory.memoryManagerRef.current.pressureLevel,
      cacheHitRate: memory.memoryManagerRef.current.cacheHitStats.hitRate,
      cacheSize: cache.itemCacheRef.current.size,
      cacheMemoryUsage: memory.memoryManagerRef.current.cacheAllocated,
      cleanupHistory: memory.memoryManagerRef.current.cleanupHistory,
    },
    scrollToIndex,
    scrollToTop,
    scrollToBottom,
    clearCache,
    createRenderItem: cache.createRenderItem as (originalRenderItem: FlashListProps<T>['renderItem']) => (info: ListRenderItemInfo<T>) => React.ReactElement | null,
    // Enhanced memory management functions
    memoryManager: {
      getMemoryUsage: () => memory.memoryManagerRef.current.totalAllocated,
      getMemoryPressure: () => detectMemoryPressure(),
      performCleanup: (aggressiveness: 'gentle' | 'moderate' | 'aggressive' = 'moderate') => 
        performIntelligentCleanup('Manual cleanup', aggressiveness),
      getCacheStats: () => ({ ...memory.memoryManagerRef.current.cacheHitStats }),
      getCleanupHistory: () => [...memory.memoryManagerRef.current.cleanupHistory],
      resetCacheStats: () => {
        memory.memoryManagerRef.current.cacheHitStats = {
          hits: 0,
          misses: 0,
          totalRequests: 0,
          hitRate: 0,
        };
      },
    },
    // V2 Performance monitoring controls
    performanceMonitor: {
      getMetrics: () => performanceMonitorRef.current.getMetrics(),
      reset: () => performanceMonitorRef.current.reset(),
      recordFrame: (frameTime: number, scrollVelocity?: number) => 
        performanceMonitorRef.current.recordFrame(frameTime, scrollVelocity),
      recordScrollEvent: (velocity: number) => 
        performanceMonitorRef.current.recordScrollEvent(velocity),
      recordAutoSizing: (sizingTime: number, accuracy: number) => 
        performanceMonitorRef.current.recordAutoSizing(sizingTime, accuracy),
    },
  };
}

/**
 * Legacy hook for backward compatibility
 * @deprecated Use useFlashListV2Performance instead
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
  // Validate legacy configuration and show migration warnings
  useEffect(() => {
    validateFlashListProps(config as Record<string, unknown>, 'useFlashListPerformance (Legacy)');
    
    // Additional warning for using legacy hook
    log.warn(
      '⚠️ useFlashListPerformance is deprecated. Please migrate to useFlashListV2Performance for better v2 compatibility and performance.'
    );
  }, [config]);

  // Convert legacy config to v2 config
  const v2Config: FlashListV2PerformanceConfig = {
    ...config,
    // Remove deprecated estimatedItemSize
    enableAutoSizing: true,
    enableIntelligentCaching: config.enableIntelligentCaching ?? config.enableCaching ?? true,
    cacheStrategy: config.cacheStrategy ?? 'hybrid',
  };
  
  const result = useFlashListV2Performance(data, v2Config);
  
  // Convert v2 metrics to legacy format
  const legacyMetrics: PerformanceMetrics = {
    ...result.metrics,
    // V2: averageItemSize deprecated - automatic sizing handles this
    averageItemSize: undefined, // No longer applicable in v2
  };
  
  return {
    ...result,
    metrics: legacyMetrics,
  };
}

/**
 * V2 preset configurations for different use cases
 * Updated for FlashList v2 architecture with automatic sizing and enhanced memory management
 */
export const FLASHLIST_V2_PRESETS = {
  // For large message histories (10k+ items) - optimized for chat interfaces
  LARGE_MESSAGE_HISTORY: {
    // V2: No estimatedItemSize needed - automatic sizing enabled
    maxToRenderPerBatch: 5,
    windowSize: 5,
    initialNumToRender: 10,
    removeClippedSubviews: true,
    
    // Enhanced memory management for v2 architecture
    maxMemoryUsage: 40, // Increased for better v2 performance with enhanced caching
    enableMemoryOptimization: true,
    memoryPressureThreshold: 75, // Slightly more aggressive for chat
    enableMemoryPressureDetection: true,
    memoryCleanupStrategy: 'moderate' as const,
    enableProactiveCleanup: true,
    
    // V2 automatic sizing optimizations
    enableAutoSizing: true,
    autoSizingStrategy: 'balanced' as const,
    enableDynamicSizing: true,
    enableViewportOptimization: true,
    
    // V2 maintainVisibleContentPosition - essential for chat interfaces
    maintainVisibleContentPosition: {
      autoscrollToBottomThreshold: 0.2,
      startRenderingFromBottom: true,
      animateAutoScrollToBottom: true,
    },
    
    // Enhanced intelligent caching strategies for v2
    enableIntelligentCaching: true,
    cacheStrategy: 'hybrid' as const,
    cacheSize: 80, // Increased for better v2 performance
    enableCacheHitRateMonitoring: true,
    cacheTimeoutMultiplier: 1.2, // Longer cache timeout for chat messages
    enableAdaptiveCaching: true,
    
    // Optimized prefetching for v2
    enablePrefetching: true,
    prefetchDistance: 8, // Increased for smoother scrolling
    
    // Performance optimizations
    enableScrollOptimization: true,
    scrollEventThrottle: 16,
    disableIntervalMomentum: true,
    
    // V2 metrics and monitoring
    enableV2Metrics: true,
    trackRenderingPerformance: true,
    enableAutoSizingMetrics: true,
    enableMemoryMetrics: true,
    enablePerformanceLogging: true,
    logMemoryUsage: true,
    logCachePerformance: true,
  } as FlashListV2PerformanceConfig,
  
  // For activity feeds - optimized for mixed content types
  ACTIVITY_FEED: {
    maxToRenderPerBatch: 8,
    windowSize: 8,
    initialNumToRender: 15,
    removeClippedSubviews: true,
    
    // Enhanced memory management for mixed content
    maxMemoryUsage: 50, // Increased for media-rich content with enhanced caching
    enableMemoryOptimization: true,
    memoryPressureThreshold: 80,
    enableMemoryPressureDetection: true,
    memoryCleanupStrategy: 'moderate' as const,
    enableProactiveCleanup: false, // Less aggressive for feeds
    
    // V2 automatic sizing for varying content
    enableAutoSizing: true,
    autoSizingStrategy: 'aggressive' as const,
    enableDynamicSizing: true,
    enableViewportOptimization: true,
    
    // V2 maintainVisibleContentPosition for feed updates
    maintainVisibleContentPosition: {
      autoscrollToTopThreshold: 0.1,
      animateAutoScrollToBottom: false,
    },
    
    // Enhanced memory-optimized caching for feeds
    enableIntelligentCaching: true,
    cacheStrategy: 'memory' as const,
    cacheSize: 150, // Increased for better feed performance
    enableCacheHitRateMonitoring: true,
    cacheTimeoutMultiplier: 1.5, // Longer timeout for media content
    enableAdaptiveCaching: true,
    
    // Enhanced prefetching for smooth feed scrolling
    enablePrefetching: true,
    prefetchDistance: 12, // Increased for better feed experience
    
    enableScrollOptimization: true,
    scrollEventThrottle: 16,
    enableV2Metrics: false,
    enableAutoSizingMetrics: false,
    enableMemoryMetrics: true, // Enable for feed optimization
    enablePerformanceLogging: false,
    logCachePerformance: false,
  } as FlashListV2PerformanceConfig,
  
  // For user lists - optimized for consistent item sizes
  USER_LIST: {
    maxToRenderPerBatch: 12, // Increased for better user list performance
    windowSize: 10,
    initialNumToRender: 20,
    removeClippedSubviews: true,
    
    // Conservative memory management for user lists
    maxMemoryUsage: 25, // Increased slightly for better performance
    enableMemoryOptimization: false,
    
    // V2 conservative sizing for consistent items
    enableAutoSizing: true,
    autoSizingStrategy: 'conservative' as const,
    enableDynamicSizing: false,
    enableViewportOptimization: false,
    
    // V2 maintainVisibleContentPosition for user list updates
    maintainVisibleContentPosition: {
      autoscrollToTopThreshold: 0.05,
    },
    
    // High-capacity caching for user data
    enableIntelligentCaching: true,
    cacheStrategy: 'memory' as const,
    cacheSize: 250, // Increased for better user list caching
    
    enablePrefetching: false,
    enableScrollOptimization: true,
    scrollEventThrottle: 16,
    enableV2Metrics: false,
    enableAutoSizingMetrics: false,
    enablePerformanceLogging: false
  } as FlashListV2PerformanceConfig,
  
  // For notifications - optimized for system messages
  NOTIFICATION_LIST: {
    maxToRenderPerBatch: 6,
    windowSize: 6,
    initialNumToRender: 12,
    removeClippedSubviews: true,
    
    // Balanced memory management for notifications
    maxMemoryUsage: 30, // Increased for better notification handling
    enableMemoryOptimization: true,
    
    // V2 balanced sizing for notification content
    enableAutoSizing: true,
    autoSizingStrategy: 'balanced' as const,
    enableDynamicSizing: false,
    enableViewportOptimization: false,
    
    // V2 maintainVisibleContentPosition for new notifications
    maintainVisibleContentPosition: {
      autoscrollToTopThreshold: 0.1,
    },
    
    // Hybrid caching for notification persistence
    enableIntelligentCaching: true,
    cacheStrategy: 'hybrid' as const,
    cacheSize: 90, // Increased for better notification caching
    
    enablePrefetching: false,
    enableScrollOptimization: true,
    scrollEventThrottle: 16,
    enableV2Metrics: false,
    enableAutoSizingMetrics: false,
    enablePerformanceLogging: false
  } as FlashListV2PerformanceConfig,
  
  // New V2-specific preset for masonry grids - optimized for Pinterest-style layouts
  MASONRY_GRID: {
    maxToRenderPerBatch: 8, // Increased for better masonry performance
    windowSize: 10, // Increased for better viewport coverage
    initialNumToRender: 15, // Increased for better initial render
    removeClippedSubviews: true,
    
    // Enhanced memory management for varying heights
    maxMemoryUsage: 35, // Increased for better masonry performance with enhanced tracking
    enableMemoryOptimization: true, // Enable with intelligent cleanup
    memoryPressureThreshold: 85, // Higher threshold for masonry
    enableMemoryPressureDetection: true,
    memoryCleanupStrategy: 'gentle' as const, // Gentle cleanup for varying content
    enableProactiveCleanup: false, // Let masonry manage its own memory
    
    // V2 aggressive sizing for masonry layouts
    enableAutoSizing: true,
    autoSizingStrategy: 'aggressive' as const, // Best for masonry layouts
    enableDynamicSizing: true, // Essential for varying heights
    enableViewportOptimization: true,
    
    // V2 masonry-specific props
    masonry: true,
    optimizeItemArrangement: true,
    
    // V2 maintainVisibleContentPosition for masonry updates
    maintainVisibleContentPosition: {
      autoscrollToTopThreshold: 0.1,
    },
    
    // Enhanced minimal caching for masonry (better for varying content)
    enableIntelligentCaching: true, // Enable with minimal strategy
    cacheStrategy: 'minimal' as const,
    cacheSize: 50, // Increased for better performance
    enableCacheHitRateMonitoring: true, // Monitor for masonry optimization
    cacheTimeoutMultiplier: 0.8, // Shorter timeout for varying content
    enableAdaptiveCaching: false, // Keep simple for masonry
    
    enablePrefetching: false, // Not ideal for masonry layouts
    enableScrollOptimization: true,
    scrollEventThrottle: 16,
    enableV2Metrics: false,
    enableAutoSizingMetrics: true, // Important for masonry debugging
    enableMemoryMetrics: true, // Important for masonry memory tracking
    enablePerformanceLogging: false,
    logCachePerformance: false,
  } as FlashListV2PerformanceConfig
};

// Legacy presets for backward compatibility
// V2 Migration: estimatedItemSize removed from all presets - automatic sizing enabled
export const FLASHLIST_PRESETS = {
  LARGE_MESSAGE_HISTORY: {
    ...FLASHLIST_V2_PRESETS.LARGE_MESSAGE_HISTORY,
    // V2: estimatedItemSize removed - automatic sizing handles this
  } as FlashListPerformanceConfig,
  
  ACTIVITY_FEED: {
    ...FLASHLIST_V2_PRESETS.ACTIVITY_FEED,
    // V2: estimatedItemSize removed - automatic sizing handles this
  } as FlashListPerformanceConfig,
  
  USER_LIST: {
    ...FLASHLIST_V2_PRESETS.USER_LIST,
    // V2: estimatedItemSize removed - automatic sizing handles this
  } as FlashListPerformanceConfig,
  
  NOTIFICATION_LIST: {
    ...FLASHLIST_V2_PRESETS.NOTIFICATION_LIST,
    // V2: estimatedItemSize removed - automatic sizing handles this
  } as FlashListPerformanceConfig,
  
  // V2: Add MASONRY_GRID preset to legacy exports for compatibility
  MASONRY_GRID: {
    ...FLASHLIST_V2_PRESETS.MASONRY_GRID,
    // V2: estimatedItemSize removed - automatic sizing handles this
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
 * V2 utility for optimizing large datasets before passing to FlashList
 * Removes size estimation logic and focuses on v2-compatible optimizations
 */
export function optimizeV2Dataset<T extends MessageListItem>(
  data: T[],
  options: {
    maxItems?: number;
    sortBy?: keyof T;
    sortOrder?: 'asc' | 'desc';
    filterDuplicates?: boolean;
    enableContentAnalysis?: boolean;
    masonryOptimization?: boolean;
    enableItemTypeOptimization?: boolean;
    enableRecyclingOptimization?: boolean;
    optimizeItemArrangement?: boolean;
  } = {}
): T[] {
  let optimizedData = [...data];
  
  // Filter duplicates with improved performance
  if (options.filterDuplicates) {
    const seen = new Set<string>();
    optimizedData = optimizedData.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }
  
  // Sort data with v2-optimized sorting
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
  
  // V2: Enhanced content analysis for automatic sizing optimization
  if (options.enableContentAnalysis) {
    optimizedData = optimizedData.map(item => ({
      ...item,
      _v2Metadata: analyzeV2ItemContent(item, {
        masonryOptimization: options.masonryOptimization,
        enableItemTypeOptimization: options.enableItemTypeOptimization,
        enableRecyclingOptimization: options.enableRecyclingOptimization,
      })
    }));
  }
  
  // V2: Optimize item arrangement for masonry layouts
  if (options.masonryOptimization && options.optimizeItemArrangement) {
    optimizedData = optimizeMasonryItemArrangement(optimizedData);
  }
  
  // V2: Apply item type grouping for better recycling
  if (options.enableItemTypeOptimization) {
    optimizedData = optimizeItemTypeGrouping(optimizedData);
  }
  
  return optimizedData;
}

/**
 * Legacy utility for backward compatibility
 * @deprecated Use optimizeV2Dataset instead
 */
export function optimizeDataset<T extends MessageListItem>(
  data: T[],
  options: {
    maxItems?: number;
    sortBy?: keyof T;
    sortOrder?: 'asc' | 'desc';
    filterDuplicates?: boolean;
    /** @deprecated V2 uses automatic sizing - this option is ignored */
    estimateItemSizes?: boolean;
    /** @deprecated V2 uses automatic item type detection - this option is ignored */
    enableItemSizeEstimation?: boolean;
  } = {}
): T[] {
  // V2 Migration: Show deprecation warnings for size estimation options
  if (options.estimateItemSizes) {
    log.warn(
      '⚠️ estimateItemSizes option is deprecated in FlashList v2. Automatic sizing is enabled by default.',
      { migration: 'Remove estimateItemSizes option - v2 handles sizing automatically' }
    );
  }
  
  if (options.enableItemSizeEstimation) {
    log.warn(
      '⚠️ enableItemSizeEstimation option is deprecated in FlashList v2. Item type detection is automatic.',
      { migration: 'Remove enableItemSizeEstimation option - v2 uses automatic item type detection' }
    );
  }
  
  // Convert to v2 options (remove all size estimation logic)
  const v2Options = {
    maxItems: options.maxItems,
    sortBy: options.sortBy,
    sortOrder: options.sortOrder,
    filterDuplicates: options.filterDuplicates,
    enableContentAnalysis: true, // Always enable for v2 optimization
    enableItemTypeOptimization: true, // Enable v2 item type optimization
    enableRecyclingOptimization: true, // Enable v2 recycling optimization
    masonryOptimization: false,
  };
  
  // V2: Return optimized dataset with enhanced v2 features
  return optimizeV2Dataset(data, v2Options);
}

/**
 * V2 enhanced content analysis for automatic sizing optimization
 * Focuses on item type detection and recycling optimization instead of size estimates
 */
function analyzeV2ItemContent<T extends MessageListItem>(
  item: T, 
  options: {
    masonryOptimization?: boolean;
    enableItemTypeOptimization?: boolean;
    enableRecyclingOptimization?: boolean;
  } = {}
): {
  complexity: 'low' | 'medium' | 'high';
  hasMedia: boolean;
  hasInteractions: boolean;
  autoSizingHints: {
    contentType: 'text' | 'media' | 'mixed' | 'system' | 'notification';
    dynamicContent: boolean;
    masonrySpan?: number;
    recyclingType: string;
    itemTypeHint: string;
  };
  v2Optimizations: {
    enableAutoSizing: boolean;
    preferredRecyclingPool: string;
    layoutComplexity: 'simple' | 'moderate' | 'complex';
    requiresDynamicSizing: boolean;
  };
} {
  let complexity: 'low' | 'medium' | 'high' = 'low';
  let hasMedia = false;
  let hasInteractions = false;
  let contentType: 'text' | 'media' | 'mixed' | 'system' | 'notification' = 'text';
  let dynamicContent = false;
  let masonrySpan = 1;
  let recyclingType = 'standard';
  let itemTypeHint = 'message';
  let layoutComplexity: 'simple' | 'moderate' | 'complex' = 'simple';
  let requiresDynamicSizing = false;
  
  // V2: Enhanced item type detection for better recycling
  if (item.type === 'system') {
    contentType = 'system';
    itemTypeHint = 'system';
    recyclingType = 'system';
    complexity = 'low';
    layoutComplexity = 'simple';
  } else if (item.type === 'notification') {
    contentType = 'notification';
    itemTypeHint = 'notification';
    recyclingType = 'notification';
    complexity = 'low';
    layoutComplexity = 'simple';
  } else {
    // Regular message analysis
    if (typeof item.content === 'string') {
      if (item.content.length > 500) {
        complexity = 'high';
        dynamicContent = true;
        requiresDynamicSizing = true;
        layoutComplexity = 'complex';
        itemTypeHint = 'long_message';
      } else if (item.content.length > 100) {
        complexity = 'medium';
        layoutComplexity = 'moderate';
        itemTypeHint = 'medium_message';
      } else {
        itemTypeHint = 'short_message';
      }
    }
    
    // V2: Enhanced media detection for better item type classification
    if (Array.isArray(item.attachments) && item.attachments.length > 0) {
      hasMedia = true;
      complexity = 'high';
      contentType = item.content ? 'mixed' : 'media';
      dynamicContent = true;
      requiresDynamicSizing = true;
      layoutComplexity = 'complex';
      
      // More granular item type hints for better recycling
      if (item.attachments.length === 1) {
        itemTypeHint = 'single_media';
        recyclingType = 'single_media';
      } else if (item.attachments.length <= 3) {
        itemTypeHint = 'multi_media';
        recyclingType = 'multi_media';
      } else {
        itemTypeHint = 'media_gallery';
        recyclingType = 'media_gallery';
        layoutComplexity = 'complex';
      }
      
      // V2 masonry optimization with better span calculation
      if (options.masonryOptimization) {
        if (item.attachments.length > 3) {
          masonrySpan = 2; // Large media collections span 2 columns
        } else if (item.attachments.length === 1) {
          // Single media items can span based on aspect ratio hints
          masonrySpan = 1;
        }
      }
    }
    
    // V2: Enhanced interaction detection
    if (Array.isArray(item.reactions) && item.reactions.length > 0) {
      hasInteractions = true;
      dynamicContent = true;
      
      if (item.reactions.length > 5) {
        complexity = 'high';
        layoutComplexity = 'complex';
        itemTypeHint = hasMedia ? 'media_with_reactions' : 'message_with_reactions';
        requiresDynamicSizing = true;
      }
    }
  }
  
  // V2: Determine preferred recycling pool based on analysis
  let preferredRecyclingPool = 'default';
  if (options.enableRecyclingOptimization) {
    if (hasMedia && hasInteractions) {
      preferredRecyclingPool = 'complex_interactive';
    } else if (hasMedia) {
      preferredRecyclingPool = 'media';
    } else if (hasInteractions) {
      preferredRecyclingPool = 'interactive';
    } else if (contentType === 'system' || contentType === 'notification') {
      preferredRecyclingPool = 'system';
    } else {
      preferredRecyclingPool = 'text';
    }
  }
  
  return {
    complexity,
    hasMedia,
    hasInteractions,
    autoSizingHints: {
      contentType,
      dynamicContent,
      masonrySpan,
      recyclingType,
      itemTypeHint,
    },
    v2Optimizations: {
      enableAutoSizing: true, // Always enabled in v2
      preferredRecyclingPool,
      layoutComplexity,
      requiresDynamicSizing,
    },
  };
}

/**
 * V2: Optimize masonry item arrangement for better column balance
 * Uses intelligent reordering to minimize column height differences
 */
function optimizeMasonryItemArrangement<T extends MessageListItem>(data: T[]): T[] {
  if (data.length === 0) return data;
  
  // Group items by their masonry span requirements
  const singleSpanItems = data.filter(item => 
    !item._v2Metadata?.autoSizingHints?.masonrySpan || 
    item._v2Metadata.autoSizingHints.masonrySpan === 1
  );
  const multiSpanItems = data.filter(item => 
    item._v2Metadata?.autoSizingHints?.masonrySpan && 
    item._v2Metadata.autoSizingHints.masonrySpan > 1
  );
  
  // V2: Intelligent arrangement algorithm
  // Distribute multi-span items evenly, then fill with single-span items
  const optimizedData: T[] = [];
  let singleSpanIndex = 0;
  let multiSpanIndex = 0;
  
  // Interleave multi-span items with single-span items for better balance
  const multiSpanInterval = Math.max(Math.floor(singleSpanItems.length / Math.max(multiSpanItems.length, 1)), 3);
  
  for (let i = 0; i < data.length; i++) {
    if (multiSpanIndex < multiSpanItems.length && 
        (i % multiSpanInterval === 0 || singleSpanIndex >= singleSpanItems.length)) {
      const item = multiSpanItems[multiSpanIndex];
      if (item) {
        optimizedData.push(item);
        multiSpanIndex++;
      }
    } else if (singleSpanIndex < singleSpanItems.length) {
      const item = singleSpanItems[singleSpanIndex];
      if (item) {
        optimizedData.push(item);
        singleSpanIndex++;
      }
    }
  }
  
  return optimizedData;
}

/**
 * V2: Optimize item type grouping for better recycling performance
 * Groups similar item types together to improve recycling pool efficiency
 */
function optimizeItemTypeGrouping<T extends MessageListItem>(data: T[]): T[] {
  if (data.length === 0) return data;
  
  // V2: Group items by recycling type for better performance
  const itemGroups = new Map<string, T[]>();
  
  data.forEach(item => {
    const recyclingType = item._v2Metadata?.autoSizingHints?.recyclingType || 'standard';
    if (!itemGroups.has(recyclingType)) {
      itemGroups.set(recyclingType, []);
    }
    itemGroups.get(recyclingType)!.push(item);
  });
  
  // V2: Intelligent interleaving to maintain visual variety while optimizing recycling
  const optimizedData: T[] = [];
  const groupKeys = Array.from(itemGroups.keys());
  const groupIndices = new Map<string, number>();
  
  // Initialize group indices
  groupKeys.forEach(key => groupIndices.set(key, 0));
  
  // Interleave items from different groups
  let totalProcessed = 0;
  while (totalProcessed < data.length) {
    for (const groupKey of groupKeys) {
      const group = itemGroups.get(groupKey)!;
      const index = groupIndices.get(groupKey)!;
      
      if (index < group.length) {
        const item = group[index];
        if (item) {
          optimizedData.push(item);
          groupIndices.set(groupKey, index + 1);
          totalProcessed++;
        }
      }
    }
  }
  
  return optimizedData;
}

/**
 * V2: Generate optimized getItemType function for FlashList
 * Creates item type identifiers optimized for v2 recycling
 */
export function generateV2ItemType<T extends MessageListItem>(): (item: T, index: number) => string {
  return (item: T, _index: number): string => {
    // V2: Use enhanced metadata for item type detection
    if (item._v2Metadata?.autoSizingHints?.itemTypeHint) {
      return item._v2Metadata.autoSizingHints.itemTypeHint;
    }
    
    // Fallback to basic type detection
    if (item.type === 'system') return 'system';
    if (item.type === 'notification') return 'notification';
    
    // Enhanced message type detection
    const hasAttachments = Array.isArray(item.attachments) && item.attachments.length > 0;
    const hasReactions = Array.isArray(item.reactions) && item.reactions.length > 0;
    const isLongContent = typeof item.content === 'string' && item.content.length > 500;
    
    if (hasAttachments && hasReactions) return 'media_with_reactions';
    if (hasAttachments) return 'media_message';
    if (hasReactions) return 'message_with_reactions';
    if (isLongContent) return 'long_message';
    
    return 'message';
  };
}

/**
 * V2: Create optimized data transformation strategies
 * Applies v2-specific transformations for better performance
 */
export function applyV2DataTransformations<T extends MessageListItem>(
  data: T[],
  transformations: {
    enableMemoization?: boolean;
    enableKeyOptimization?: boolean;
    enableContentPreprocessing?: boolean;
    masonryColumns?: number;
  } = {}
): T[] {
  let transformedData = [...data];
  
  // V2: Content preprocessing for automatic sizing
  if (transformations.enableContentPreprocessing) {
    transformedData = transformedData.map(item => {
      const processedItem = { ...item };
      
      // Preprocess content for better automatic sizing
      if (typeof item.content === 'string') {
        // Add content hints for v2 automatic sizing
        processedItem._v2ContentHints = {
          wordCount: item.content.split(/\s+/).length,
          hasLineBreaks: item.content.includes('\n'),
          estimatedLines: Math.ceil(item.content.length / 50), // Rough estimate
        };
      }
      
      return processedItem;
    });
  }
  
  // V2: Key optimization for better recycling
  if (transformations.enableKeyOptimization) {
    transformedData = transformedData.map((item, index) => ({
      ...item,
      _v2OptimizedKey: `${item.id}_${item.type}_${index}`,
    }));
  }
  
  // V2: Masonry-specific transformations
  if (transformations.masonryColumns && transformations.masonryColumns > 1) {
    transformedData = transformedData.map(item => {
      const masonryItem = { ...item };
      
      // Calculate optimal span based on content
      if (item._v2Metadata?.autoSizingHints?.masonrySpan) {
        masonryItem._masonrySpan = Math.min(
          item._v2Metadata.autoSizingHints.masonrySpan,
          transformations.masonryColumns!
        );
      } else {
        masonryItem._masonrySpan = 1;
      }
      
      return masonryItem;
    });
  }
  
  return transformedData;
}

/**
 * Legacy item size estimation
 * @deprecated V2 uses automatic sizing - this function is no longer needed
 */
function _estimateItemSize<T extends MessageListItem>(item: T): number {
  // V2 Migration Warning
  log.warn(
    '⚠️ estimateItemSize is deprecated in FlashList v2. Automatic sizing eliminates the need for manual size estimates.',
    { 
      migration: 'Remove calls to estimateItemSize - v2 handles sizing automatically',
      docLink: 'https://shopify.github.io/flash-list/docs/v2-migration'
    }
  );
  
  // Legacy fallback calculation (not used in v2)
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
/**
 * V2: Masonry-specific data optimization utilities
 */

/**
 * Optimizes dataset specifically for masonry layouts in FlashList v2
 */
export function optimizeMasonryDataset<T extends MessageListItem>(
  data: T[],
  options: {
    numColumns: number;
    enableItemArrangement?: boolean;
    balanceColumns?: boolean;
    maxSpan?: number;
  }
): T[] {
  let optimizedData = [...data];
  
  // Apply v2 content analysis with masonry focus
  optimizedData = optimizedData.map(item => ({
    ...item,
    _v2Metadata: analyzeV2ItemContent(item, {
      masonryOptimization: true,
      enableItemTypeOptimization: true,
      enableRecyclingOptimization: true,
    })
  }));
  
  // Constrain spans to available columns
  if (options.maxSpan) {
    optimizedData = optimizedData.map(item => {
      if (item._v2Metadata?.autoSizingHints?.masonrySpan) {
        const constrainedSpan = Math.min(
          item._v2Metadata.autoSizingHints.masonrySpan,
          Math.min(options.maxSpan!, options.numColumns)
        );
        return {
          ...item,
          _v2Metadata: {
            ...item._v2Metadata,
            autoSizingHints: {
              ...item._v2Metadata.autoSizingHints,
              masonrySpan: constrainedSpan,
            },
          },
        };
      }
      return item;
    });
  }
  
  // Optimize item arrangement for better column balance
  if (options.enableItemArrangement) {
    optimizedData = optimizeMasonryItemArrangement(optimizedData);
  }
  
  // Apply masonry-specific transformations
  optimizedData = applyV2DataTransformations(optimizedData, {
    enableContentPreprocessing: true,
    enableKeyOptimization: true,
    masonryColumns: options.numColumns,
  });
  
  return optimizedData;
}

/**
 * V2: Create optimized overrideItemLayout function for masonry
 */
export function createV2MasonryLayoutOverride<T extends MessageListItem>(): (
  layout: { span?: number },
  item: T
) => void {
  return (layout: { span?: number }, item: T): void => {
    // V2: Use metadata-driven span assignment (no size estimates)
    if (item._masonrySpan) {
      layout.span = item._masonrySpan;
    } else if (item._v2Metadata?.autoSizingHints?.masonrySpan) {
      layout.span = item._v2Metadata.autoSizingHints.masonrySpan;
    } else {
      layout.span = 1; // Default span
    }
  };
}

/**
 * V2: Enhanced dataset statistics for monitoring optimization effectiveness
 */
export function getV2DatasetStats<T extends MessageListItem>(data: T[]): {
  totalItems: number;
  itemTypeDistribution: Record<string, number>;
  recyclingPoolDistribution: Record<string, number>;
  complexityDistribution: Record<string, number>;
  masonrySpanDistribution: Record<number, number>;
  optimizationCoverage: {
    withV2Metadata: number;
    withContentHints: number;
    withOptimizedKeys: number;
    withMasonrySpans: number;
  };
} {
  const stats = {
    totalItems: data.length,
    itemTypeDistribution: {} as Record<string, number>,
    recyclingPoolDistribution: {} as Record<string, number>,
    complexityDistribution: {} as Record<string, number>,
    masonrySpanDistribution: {} as Record<number, number>,
    optimizationCoverage: {
      withV2Metadata: 0,
      withContentHints: 0,
      withOptimizedKeys: 0,
      withMasonrySpans: 0,
    },
  };
  
  data.forEach(item => {
    // Item type distribution
    const itemType = item._v2Metadata?.autoSizingHints?.itemTypeHint || item.type || 'unknown';
    stats.itemTypeDistribution[itemType] = (stats.itemTypeDistribution[itemType] || 0) + 1;
    
    // Recycling pool distribution
    const recyclingPool = item._v2Metadata?.v2Optimizations?.preferredRecyclingPool || 'default';
    stats.recyclingPoolDistribution[recyclingPool] = (stats.recyclingPoolDistribution[recyclingPool] || 0) + 1;
    
    // Complexity distribution
    const complexity = item._v2Metadata?.complexity || 'unknown';
    stats.complexityDistribution[complexity] = (stats.complexityDistribution[complexity] || 0) + 1;
    
    // Masonry span distribution
    const masonrySpan = item._masonrySpan || item._v2Metadata?.autoSizingHints?.masonrySpan || 1;
    stats.masonrySpanDistribution[masonrySpan] = (stats.masonrySpanDistribution[masonrySpan] || 0) + 1;
    
    // Optimization coverage
    if (item._v2Metadata) stats.optimizationCoverage.withV2Metadata++;
    if (item._v2ContentHints) stats.optimizationCoverage.withContentHints++;
    if (item._v2OptimizedKey) stats.optimizationCoverage.withOptimizedKeys++;
    if (item._masonrySpan || item._v2Metadata?.autoSizingHints?.masonrySpan) {
      stats.optimizationCoverage.withMasonrySpans++;
    }
  });
  
  return stats;
}

// Export v2 hook wrappers and types
export {
  useFlashListV2State,
  useFlashListLayout,
  useFlashListCombinedState,
  useFlashListItemState
} from './flashlist-v2-hooks';

export type {
  FlashListV2StateConfig,
  FlashListLayoutConfig,
  FlashListV2StateReturn,
  FlashListLayoutReturn,
  FlashListCombinedStateReturn,
  FlashListItemStateReturn,
  FlashListV2Item,
  FlashListV2ItemConfig
} from '@/lib/types';

// Export core FlashList v2 types for convenience
export type { FlashListRef, FlashListProps } from '@shopify/flash-list';

// Note: Performance types are already exported above in the interface definitions
// No need to re-export them here to avoid conflicts
