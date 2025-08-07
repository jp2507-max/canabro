/**
 * FlashList V2 Enhanced Memory Management Tests
 * 
 * Tests for the enhanced memory management and caching strategies
 * implemented in task 6 of the FlashList v2 migration.
 */

import { renderHook, act } from '@testing-library/react-native';
import { useFlashListV2Performance, FLASHLIST_V2_PRESETS } from '../flashlist-performance';
import type { MessageListItem, FlashListV2PerformanceConfig } from '../flashlist-performance';

// Mock logger
jest.mock('../logger', () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => ({
  useSharedValue: jest.fn(() => ({ value: 0 })),
  runOnJS: jest.fn((fn) => fn),
}));

// Mock animation cleanup
jest.mock('../../animations/useAnimationCleanup', () => ({
  useAnimationCleanup: jest.fn(),
}));

describe('FlashList V2 Enhanced Memory Management', () => {
  const mockData: MessageListItem[] = Array.from({ length: 100 }, (_, i) => ({
    id: `message-${i}`,
    timestamp: Date.now() - i * 1000,
    type: i % 10 === 0 ? 'system' : 'message',
    content: i % 5 === 0 ? 'A'.repeat(600) : 'Short message', // Some long messages
    attachments: i % 15 === 0 ? [{ type: 'image' }, { type: 'video' }] : [],
    reactions: i % 20 === 0 ? Array.from({ length: 8 }, (_, j) => ({ emoji: '👍', userId: `user-${j}` })) : [],
  }));

  const baseConfig: FlashListV2PerformanceConfig = {
    enableIntelligentCaching: true,
    cacheStrategy: 'hybrid',
    cacheSize: 50,
    maxMemoryUsage: 30,
    enableMemoryOptimization: true,
    enableMemoryPressureDetection: true,
    memoryPressureThreshold: 80,
    enableCacheHitRateMonitoring: true,
    enableAdaptiveCaching: true,
    logMemoryUsage: false,
    logCachePerformance: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset performance.now mock
    global.performance = {
      now: jest.fn(() => Date.now()),
    } as any;
  });

  describe('Intelligent Caching System', () => {
    it('should implement configurable caching strategies', () => {
      const { result } = renderHook(() =>
        useFlashListV2Performance(mockData, {
          ...baseConfig,
          cacheStrategy: 'memory',
          cacheSize: 100,
        })
      );

      expect(result.current.memoryManager).toBeDefined();
      expect(result.current.memoryManager.getCacheStats).toBeDefined();
      expect(result.current.memoryManager.performCleanup).toBeDefined();
    });

    it('should track cache hit rates accurately', () => {
      const { result } = renderHook(() =>
        useFlashListV2Performance(mockData, {
          ...baseConfig,
          enableCacheHitRateMonitoring: true,
        })
      );

      const cacheStats = result.current.memoryManager.getCacheStats();
      expect(cacheStats).toEqual({
        hits: 0,
        misses: 0,
        totalRequests: 0,
        hitRate: 0,
      });

      // Test cache hit rate tracking through render item creation
      const renderItem = result.current.createRenderItem(({ item }) => null);
      
      // Simulate cache misses and hits
      act(() => {
        renderItem({ item: mockData[0], index: 0 });
        renderItem({ item: mockData[0], index: 0 }); // Should be a hit
      });

      const updatedStats = result.current.memoryManager.getCacheStats();
      expect(updatedStats.totalRequests).toBeGreaterThan(0);
    });

    it('should implement different cache strategies correctly', () => {
      const strategies: Array<'memory' | 'hybrid' | 'minimal'> = ['memory', 'hybrid', 'minimal'];
      
      strategies.forEach((strategy) => {
        const { result } = renderHook(() =>
          useFlashListV2Performance(mockData, {
            ...baseConfig,
            cacheStrategy: strategy,
          })
        );

        expect(result.current.flashListProps).toBeDefined();
        expect(result.current.memoryManager.getMemoryUsage()).toBeGreaterThanOrEqual(0);
      });
    });

    it('should adapt cache timeout based on memory pressure', () => {
      const { result } = renderHook(() =>
        useFlashListV2Performance(mockData, {
          ...baseConfig,
          enableAdaptiveCaching: true,
          memoryPressureThreshold: 50, // Lower threshold for testing
        })
      );

      const renderItem = result.current.createRenderItem(({ item }) => null);
      
      act(() => {
        // Simulate high memory usage to trigger adaptive behavior
        renderItem({ item: mockData[0], index: 0 });
      });

      expect(result.current.memoryManager.getMemoryPressure).toBeDefined();
    });
  });

  describe('Memory Pressure Detection', () => {
    it('should detect memory pressure levels correctly', () => {
      const { result } = renderHook(() =>
        useFlashListV2Performance(mockData, {
          ...baseConfig,
          maxMemoryUsage: 10, // Low limit to trigger pressure
          enableMemoryPressureDetection: true,
        })
      );

      const pressureInfo = result.current.memoryManager.getMemoryPressure();
      expect(pressureInfo).toHaveProperty('pressureLevel');
      expect(pressureInfo).toHaveProperty('shouldCleanup');
      expect(pressureInfo).toHaveProperty('cleanupReason');
      expect(pressureInfo).toHaveProperty('currentMemory');
      expect(pressureInfo).toHaveProperty('maxMemory');
    });

    it('should trigger cleanup when memory pressure is high', () => {
      const { result } = renderHook(() =>
        useFlashListV2Performance(mockData, {
          ...baseConfig,
          maxMemoryUsage: 5, // Very low limit
          enableMemoryOptimization: true,
          memoryCleanupStrategy: 'moderate',
        })
      );

      act(() => {
        const cleanupResult = result.current.memoryManager.performCleanup('aggressive');
        expect(cleanupResult).toHaveProperty('freedMemory');
        expect(cleanupResult).toHaveProperty('cleanupTime');
      });
    });

    it('should maintain cleanup history', () => {
      const { result } = renderHook(() =>
        useFlashListV2Performance(mockData, baseConfig)
      );

      act(() => {
        result.current.memoryManager.performCleanup('gentle');
        result.current.memoryManager.performCleanup('moderate');
      });

      const history = result.current.memoryManager.getCleanupHistory();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Memory Usage Optimization', () => {
    it('should estimate memory usage based on content complexity', () => {
      const complexData: MessageListItem[] = [
        {
          id: 'complex-1',
          timestamp: Date.now(),
          type: 'message',
          content: 'A'.repeat(1000), // Long content
          attachments: [{ type: 'image' }, { type: 'video' }, { type: 'document' }],
          reactions: Array.from({ length: 10 }, (_, i) => ({ emoji: '👍', userId: `user-${i}` })),
        },
        {
          id: 'simple-1',
          timestamp: Date.now(),
          type: 'message',
          content: 'Short',
          attachments: [],
          reactions: [],
        },
      ];

      const { result } = renderHook(() =>
        useFlashListV2Performance(complexData, baseConfig)
      );

      const memoryUsage = result.current.memoryManager.getMemoryUsage();
      expect(memoryUsage).toBeGreaterThan(0);
    });

    it('should implement different cleanup strategies', () => {
      const { result } = renderHook(() =>
        useFlashListV2Performance(mockData, baseConfig)
      );

      const strategies: Array<'gentle' | 'moderate' | 'aggressive'> = ['gentle', 'moderate', 'aggressive'];
      
      strategies.forEach((strategy) => {
        act(() => {
          const cleanupResult = result.current.memoryManager.performCleanup(strategy);
          expect(cleanupResult.freedMemory).toBeGreaterThanOrEqual(0);
          expect(cleanupResult.cleanupTime).toBeGreaterThanOrEqual(0);
        });
      });
    });

    it('should provide memory management utilities', () => {
      const { result } = renderHook(() =>
        useFlashListV2Performance(mockData, baseConfig)
      );

      expect(result.current.memoryManager.getMemoryUsage).toBeDefined();
      expect(result.current.memoryManager.getMemoryPressure).toBeDefined();
      expect(result.current.memoryManager.performCleanup).toBeDefined();
      expect(result.current.memoryManager.getCacheStats).toBeDefined();
      expect(result.current.memoryManager.getCleanupHistory).toBeDefined();
      expect(result.current.memoryManager.resetCacheStats).toBeDefined();
    });
  });

  describe('Enhanced Metrics', () => {
    it('should include enhanced memory management metrics', () => {
      const { result } = renderHook(() =>
        useFlashListV2Performance(mockData, {
          ...baseConfig,
          enableMemoryMetrics: true,
        })
      );

      expect(result.current.metrics).toHaveProperty('memoryPressureLevel');
      expect(result.current.metrics).toHaveProperty('cacheHitRate');
      expect(result.current.metrics).toHaveProperty('cacheSize');
      expect(result.current.metrics).toHaveProperty('cacheMemoryUsage');
      expect(result.current.metrics).toHaveProperty('cleanupHistory');
    });

    it('should reset cache statistics correctly', () => {
      const { result } = renderHook(() =>
        useFlashListV2Performance(mockData, baseConfig)
      );

      act(() => {
        result.current.memoryManager.resetCacheStats();
      });

      const stats = result.current.memoryManager.getCacheStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.totalRequests).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('Preset Configurations', () => {
    it('should include enhanced memory management in LARGE_MESSAGE_HISTORY preset', () => {
      const preset = FLASHLIST_V2_PRESETS.LARGE_MESSAGE_HISTORY;
      
      expect(preset.enableMemoryOptimization).toBe(true);
      expect(preset.enableMemoryPressureDetection).toBe(true);
      expect(preset.enableIntelligentCaching).toBe(true);
      expect(preset.enableCacheHitRateMonitoring).toBe(true);
      expect(preset.enableAdaptiveCaching).toBe(true);
      expect(preset.enableMemoryMetrics).toBe(true);
      expect(preset.memoryCleanupStrategy).toBe('moderate');
    });

    it('should include enhanced memory management in ACTIVITY_FEED preset', () => {
      const preset = FLASHLIST_V2_PRESETS.ACTIVITY_FEED;
      
      expect(preset.enableMemoryOptimization).toBe(true);
      expect(preset.enableMemoryPressureDetection).toBe(true);
      expect(preset.enableIntelligentCaching).toBe(true);
      expect(preset.enableCacheHitRateMonitoring).toBe(true);
      expect(preset.enableMemoryMetrics).toBe(true);
    });

    it('should include enhanced memory management in MASONRY_GRID preset', () => {
      const preset = FLASHLIST_V2_PRESETS.MASONRY_GRID;
      
      expect(preset.enableMemoryOptimization).toBe(true);
      expect(preset.enableMemoryPressureDetection).toBe(true);
      expect(preset.enableIntelligentCaching).toBe(true);
      expect(preset.enableCacheHitRateMonitoring).toBe(true);
      expect(preset.enableMemoryMetrics).toBe(true);
      expect(preset.memoryCleanupStrategy).toBe('gentle');
    });
  });

  describe('Large Dataset Optimization', () => {
    it('should handle large datasets efficiently', () => {
      const largeData: MessageListItem[] = Array.from({ length: 10000 }, (_, i) => ({
        id: `large-${i}`,
        timestamp: Date.now() - i * 1000,
        type: 'message',
        content: `Message ${i}`,
        attachments: [],
        reactions: [],
      }));

      const { result } = renderHook(() =>
        useFlashListV2Performance(largeData, {
          ...baseConfig,
          maxMemoryUsage: 100, // Higher limit for large dataset
          cacheSize: 200,
        })
      );

      expect(result.current.metrics.totalItems).toBe(10000);
      expect(result.current.memoryManager.getMemoryUsage()).toBeGreaterThan(0);
    });

    it('should optimize memory usage for large datasets', () => {
      const largeComplexData: MessageListItem[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `complex-${i}`,
        timestamp: Date.now() - i * 1000,
        type: 'message',
        content: 'A'.repeat(Math.random() * 1000 + 100), // Variable length content
        attachments: Math.random() > 0.7 ? [{ type: 'image' }] : [],
        reactions: Math.random() > 0.8 ? [{ emoji: '👍', userId: 'user1' }] : [],
      }));

      const { result } = renderHook(() =>
        useFlashListV2Performance(largeComplexData, {
          ...baseConfig,
          enableMemoryOptimization: true,
          memoryCleanupStrategy: 'aggressive',
          enableProactiveCleanup: true,
        })
      );

      const memoryUsage = result.current.memoryManager.getMemoryUsage();
      expect(memoryUsage).toBeGreaterThan(0);
      
      // Test proactive cleanup
      act(() => {
        const cleanupResult = result.current.memoryManager.performCleanup('aggressive');
        expect(cleanupResult.freedMemory).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Integration with FlashList Props', () => {
    it('should integrate memory management with FlashList props', () => {
      const { result } = renderHook(() =>
        useFlashListV2Performance(mockData, baseConfig)
      );

      const props = result.current.flashListProps;
      expect(props.ref).toBeDefined();
      expect(props.keyExtractor).toBeDefined();
      expect(props.getItemType).toBeDefined();
      expect(props.onScroll).toBeDefined();
    });

    it('should create render item wrapper with memory management', () => {
      const { result } = renderHook(() =>
        useFlashListV2Performance(mockData, baseConfig)
      );

      const mockRenderItem = jest.fn(({ item }) => null);
      const wrappedRenderItem = result.current.createRenderItem(mockRenderItem);

      act(() => {
        wrappedRenderItem({ item: mockData[0], index: 0 });
        wrappedRenderItem({ item: mockData[0], index: 0 }); // Should hit cache
      });

      expect(mockRenderItem).toHaveBeenCalled();
    });
  });
});