/**
 * Enhanced Realtime Resource Cleanup Hook (2025 Standards)
 * 
 * Extends the base useResourceCleanup with realtime-specific optimizations:
 * - WebSocket connection management
 * - Message queue cleanup
 * - Memory pressure handling
 * - Performance monitoring cleanup
 * - Supabase Realtime channel cleanup
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SharedValue, cancelAnimation } from 'react-native-reanimated';
import { useResourceCleanup } from './useResourceCleanup';
import { log } from '../utils/logger';

export interface RealtimeResource {
  id: string;
  type: 'realtime_channel' | 'websocket' | 'message_queue' | 'performance_monitor' | 'memory_watcher';
  cleanup: () => void | Promise<void>;
  priority: 'low' | 'normal' | 'high' | 'critical';
  memoryImpact: number; // Estimated memory usage in bytes
  lastUsed: number;
}

export interface MemoryPressureConfig {
  enableMemoryPressureHandling: boolean;
  memoryThresholdMB: number;
  aggressiveCleanupThresholdMB: number;
  cleanupIntervalMs: number;
}

export interface PerformanceMetrics {
  totalResources: number;
  memoryUsage: number;
  activeConnections: number;
  cleanupEvents: number;
  lastCleanup: number;
}

export function useRealtimeResourceCleanup(config: MemoryPressureConfig = {
  enableMemoryPressureHandling: true,
  memoryThresholdMB: 50,
  aggressiveCleanupThresholdMB: 100,
  cleanupIntervalMs: 30000 // 30 seconds
}) {
  const baseCleanup = useResourceCleanup();
  const realtimeResourcesRef = useRef<RealtimeResource[]>([]);
  const metricsRef = useRef<PerformanceMetrics>({
    totalResources: 0,
    memoryUsage: 0,
    activeConnections: 0,
    cleanupEvents: 0,
    lastCleanup: Date.now()
  });

  // Memory pressure monitoring
  const memoryPressureInterval = useRef<NodeJS.Timeout | null>(null);
  const isMemoryPressureActive = useRef(false);
  const mountedRef = useRef(true);

  /**
   * Register a realtime-specific resource
   */
  const registerRealtimeResource = useCallback((resource: Omit<RealtimeResource, 'lastUsed'>) => {
    if (!mountedRef.current) return;

    const fullResource: RealtimeResource = {
      ...resource,
      lastUsed: Date.now()
    };

    realtimeResourcesRef.current.push(fullResource);
    updateMetrics();

    log.debug(`[RealtimeCleanup] Registered ${resource.type}: ${resource.id}`);
  }, []);

  /**
   * Register Supabase Realtime channel with enhanced cleanup
   */
  const registerRealtimeChannel = useCallback((
    channel: RealtimeChannel,
    channelName: string,
    priority: RealtimeResource['priority'] = 'normal'
  ) => {
    registerRealtimeResource({
      id: `channel_${channelName}`,
      type: 'realtime_channel',
      cleanup: async () => {
        try {
          await channel.unsubscribe();
          log.debug(`[RealtimeCleanup] Unsubscribed from channel: ${channelName}`);
        } catch (error) {
          log.error(`[RealtimeCleanup] Error unsubscribing from channel ${channelName}:`, error);
        }
      },
      priority,
      memoryImpact: 1024 * 10 // ~10KB per channel
    });
  }, [registerRealtimeResource]);

  /**
   * Register WebSocket connection with connection pooling cleanup
   */
  const registerWebSocket = useCallback((
    websocket: WebSocket,
    connectionId: string,
    priority: RealtimeResource['priority'] = 'high'
  ) => {
    registerRealtimeResource({
      id: `websocket_${connectionId}`,
      type: 'websocket',
      cleanup: () => {
        if (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING) {
          websocket.close(1000, 'Component cleanup');
          log.debug(`[RealtimeCleanup] Closed WebSocket: ${connectionId}`);
        }
      },
      priority,
      memoryImpact: 1024 * 5 // ~5KB per WebSocket
    });
  }, [registerRealtimeResource]);

  /**
   * Register message queue with memory-aware cleanup
   */
  const registerMessageQueue = useCallback((
    queue: { clear: () => void; size: () => number },
    queueId: string,
    priority: RealtimeResource['priority'] = 'normal'
  ) => {
    registerRealtimeResource({
      id: `queue_${queueId}`,
      type: 'message_queue',
      cleanup: () => {
        const size = queue.size();
        queue.clear();
        log.debug(`[RealtimeCleanup] Cleared message queue ${queueId}, freed ${size} messages`);
      },
      priority,
      memoryImpact: queue.size() * 512 // ~512 bytes per message
    });
  }, [registerRealtimeResource]);

  /**
   * Register performance monitor with cleanup
   */
  const registerPerformanceMonitor = useCallback((
    monitor: { stop: () => void; getMetrics?: () => Record<string, unknown> },
    monitorId: string
  ) => {
    registerRealtimeResource({
      id: `monitor_${monitorId}`,
      type: 'performance_monitor',
      cleanup: () => {
        monitor.stop();
        log.debug(`[RealtimeCleanup] Stopped performance monitor: ${monitorId}`);
      },
      priority: 'low',
      memoryImpact: 1024 * 2 // ~2KB per monitor
    });
  }, [registerRealtimeResource]);

  /**
   * Register memory watcher with cleanup
   */
  const registerMemoryWatcher = useCallback((
    watcher: { cleanup: () => void },
    watcherId: string
  ) => {
    registerRealtimeResource({
      id: `memory_${watcherId}`,
      type: 'memory_watcher',
      cleanup: watcher.cleanup,
      priority: 'critical',
      memoryImpact: 1024 // ~1KB per watcher
    });
  }, [registerRealtimeResource]);

  /**
   * Enhanced animation cleanup with Reanimated v3.19.0+ support
   */
  const registerAnimationCleanup = useCallback((
    sharedValues: SharedValue<unknown>[],
    animationId: string
  ) => {
    registerRealtimeResource({
      id: `animation_${animationId}`,
      type: 'performance_monitor', // Reuse type for animations
      cleanup: () => {
        sharedValues.forEach(sharedValue => {
          try {
            cancelAnimation(sharedValue);
          } catch (error) {
            log.debug(`[RealtimeCleanup] Error canceling animation for ${animationId}:`, error);
          }
        });
        log.debug(`[RealtimeCleanup] Canceled ${sharedValues.length} animations for: ${animationId}`);
      },
      priority: 'normal',
      memoryImpact: sharedValues.length * 256 // ~256 bytes per shared value
    });
  }, [registerRealtimeResource]);

  /**
   * Update performance metrics
   */
  const updateMetrics = useCallback(() => {
    const totalMemory = realtimeResourcesRef.current.reduce(
      (sum, resource) => sum + resource.memoryImpact,
      0
    );

    const activeConnections = realtimeResourcesRef.current.filter(
      resource => resource.type === 'realtime_channel' || resource.type === 'websocket'
    ).length;

    metricsRef.current = {
      totalResources: realtimeResourcesRef.current.length,
      memoryUsage: totalMemory,
      activeConnections,
      cleanupEvents: metricsRef.current.cleanupEvents,
      lastCleanup: metricsRef.current.lastCleanup
    };
  }, []);

  /**
   * Cleanup specific realtime resource
   */
  const cleanupRealtimeResource = useCallback(async (id: string) => {
    const index = realtimeResourcesRef.current.findIndex(r => r.id === id);
    if (index >= 0) {
      const resource = realtimeResourcesRef.current[index];
      if (resource) {
        try {
          await resource.cleanup();
          realtimeResourcesRef.current.splice(index, 1);
          metricsRef.current.cleanupEvents++;
          updateMetrics();

          log.debug(`[RealtimeCleanup] Cleaned up ${resource.type}: ${resource.id}`);
        } catch (error) {
          log.error(`[RealtimeCleanup] Error cleaning up ${resource.type} ${resource.id}:`, error);
        }
      }
    }
  }, [updateMetrics]);

  /**
   * Cleanup resources by type
   */
  const cleanupResourcesByType = useCallback(async (type: RealtimeResource['type']) => {
    const resources = realtimeResourcesRef.current.filter(r => r.type === type);

    for (const resource of resources) {
      await cleanupRealtimeResource(resource.id);
    }

    log.info(`[RealtimeCleanup] Cleaned up ${resources.length} resources of type: ${type}`);
  }, [cleanupRealtimeResource]);

  /**
   * Cleanup resources by priority
   */
  const cleanupResourcesByPriority = useCallback(async (
    maxPriority: RealtimeResource['priority']
  ) => {
    const priorityOrder = { low: 0, normal: 1, high: 2, critical: 3 };
    const maxPriorityValue = priorityOrder[maxPriority];

    const resources = realtimeResourcesRef.current.filter(
      r => priorityOrder[r.priority] <= maxPriorityValue
    );

    for (const resource of resources) {
      await cleanupRealtimeResource(resource.id);
    }

    log.info(`[RealtimeCleanup] Cleaned up ${resources.length} resources with priority <= ${maxPriority}`);
  }, [cleanupRealtimeResource]);

  /**
   * Memory pressure cleanup
   */
  const performMemoryPressureCleanup = useCallback(async (aggressive = false) => {
    if (isMemoryPressureActive.current) return;

    isMemoryPressureActive.current = true;
    log.warn(`[RealtimeCleanup] Performing ${aggressive ? 'aggressive' : 'normal'} memory pressure cleanup`);

    try {
      if (aggressive) {
        // Aggressive cleanup: remove all non-critical resources
        await cleanupResourcesByPriority('high');
      } else {
        // Normal cleanup: remove low priority resources first
        await cleanupResourcesByPriority('low');

        // Then cleanup old resources
        const now = Date.now();
        const oldResources = realtimeResourcesRef.current.filter(
          r => (now - r.lastUsed) > 300000 // 5 minutes old
        );

        for (const resource of oldResources) {
          await cleanupRealtimeResource(resource.id);
        }
      }

      metricsRef.current.lastCleanup = Date.now();
      updateMetrics();

    } finally {
      isMemoryPressureActive.current = false;
    }
  }, [cleanupResourcesByPriority, cleanupRealtimeResource, updateMetrics]);

  /**
   * Cleanup all realtime resources
   */
  const cleanupAllRealtimeResources = useCallback(async () => {
    log.info(`[RealtimeCleanup] Cleaning up all ${realtimeResourcesRef.current.length} realtime resources`);

    const resources = [...realtimeResourcesRef.current];
    realtimeResourcesRef.current = [];

    // Sort by priority (critical first)
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    resources.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    for (const resource of resources) {
      try {
        await resource.cleanup();
        metricsRef.current.cleanupEvents++;
      } catch (error) {
        log.error(`[RealtimeCleanup] Error cleaning up ${resource.type} ${resource.id}:`, error);
      }
    }

    updateMetrics();
    log.info('[RealtimeCleanup] All realtime resources cleaned up');
  }, [updateMetrics]);

  /**
   * Get current metrics
   */
  const getMetrics = useCallback((): PerformanceMetrics => {
    updateMetrics();
    return { ...metricsRef.current };
  }, [updateMetrics]);

  /**
   * Get resources by type for debugging
   */
  const getResourcesByType = useCallback((type: RealtimeResource['type']) => {
    return realtimeResourcesRef.current.filter(r => r.type === type);
  }, []);

  /**
   * Update resource last used time
   */
  const touchResource = useCallback((id: string) => {
    const resource = realtimeResourcesRef.current.find(r => r.id === id);
    if (resource) {
      resource.lastUsed = Date.now();
    }
  }, []);

  /**
   * Setup memory pressure monitoring
   */
  useEffect(() => {
    if (!config.enableMemoryPressureHandling) return;

    memoryPressureInterval.current = setInterval(() => {
      const metrics = getMetrics();
      const memoryUsageMB = metrics.memoryUsage / (1024 * 1024);

      if (memoryUsageMB > config.aggressiveCleanupThresholdMB) {
        performMemoryPressureCleanup(true);
      } else if (memoryUsageMB > config.memoryThresholdMB) {
        performMemoryPressureCleanup(false);
      }
    }, config.cleanupIntervalMs);

    return () => {
      if (memoryPressureInterval.current) {
        clearInterval(memoryPressureInterval.current);
      }
    };
  }, [config, getMetrics, performMemoryPressureCleanup]);

  /**
   * Handle app state changes
   */
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background') {
        // Cleanup non-essential resources when app goes to background
        await cleanupResourcesByType('performance_monitor');
        await cleanupResourcesByPriority('low');

        log.info('[RealtimeCleanup] Background cleanup completed');
      } else if (nextAppState === 'active') {
        // Update metrics when app becomes active
        updateMetrics();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [cleanupResourcesByType, cleanupResourcesByPriority, updateMetrics]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      cleanupAllRealtimeResources();
    };
  }, [cleanupAllRealtimeResources]);

  return {
    // Base cleanup functions
    ...baseCleanup,

    // Realtime-specific registration functions
    registerRealtimeResource,
    registerRealtimeChannel,
    registerWebSocket,
    registerMessageQueue,
    registerPerformanceMonitor,
    registerMemoryWatcher,
    registerAnimationCleanup,

    // Cleanup functions
    cleanupRealtimeResource,
    cleanupResourcesByType,
    cleanupResourcesByPriority,
    cleanupAllRealtimeResources,
    performMemoryPressureCleanup,

    // Utility functions
    touchResource,
    getMetrics,
    getResourcesByType,

    // State
    isMemoryPressureActive: () => isMemoryPressureActive.current
  };
}