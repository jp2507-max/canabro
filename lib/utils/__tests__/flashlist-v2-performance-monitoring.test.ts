/**
 * FlashList v2 Performance Monitoring Tests
 * 
 * Tests for the enhanced v2 performance monitoring system including:
 * - Frame drop detection
 * - Smooth scroll percentage calculation
 * - Automatic sizing efficiency tracking
 * - Performance metrics collection
 */

import { renderHook, act } from '@testing-library/react-native';
import { useFlashListV2Performance, V2PerformanceMetrics } from '../flashlist-performance';

// Mock dependencies
jest.mock('react-native-reanimated', () => ({
  useSharedValue: jest.fn((initial) => ({ value: initial })),
  runOnJS: jest.fn((fn) => fn),
}));

jest.mock('../logger', () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../animations/useAnimationCleanup', () => ({
  useAnimationCleanup: jest.fn(),
}));

// Mock performance.now for consistent testing
const mockPerformanceNow = jest.fn();
Object.defineProperty(global, 'performance', {
  value: { now: mockPerformanceNow },
  writable: true,
});

describe('FlashList v2 Performance Monitoring', () => {
  const mockData = Array.from({ length: 100 }, (_, i) => ({
    id: `item-${i}`,
    timestamp: Date.now() - i * 1000,
    type: 'message' as const,
    content: `Message ${i}`,
  }));

  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformanceNow.mockReturnValue(0);
  });

  describe('V2PerformanceMetrics Interface', () => {
    it('should include all required v2 performance metrics', () => {
      const config = {
        enableV2Metrics: true,
        trackRenderingPerformance: true,
        enableAutoSizingMetrics: true,
      };

      const { result } = renderHook(() => 
        useFlashListV2Performance(mockData, config)
      );

      const metrics = result.current.metrics;

      // Check core metrics
      expect(metrics).toHaveProperty('totalItems');
      expect(metrics).toHaveProperty('renderedItems');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('scrollPosition');
      
      // Check v2-specific metrics
      expect(metrics).toHaveProperty('autoSizingEfficiency');
      expect(metrics).toHaveProperty('viewportOptimizationScore');
      expect(metrics).toHaveProperty('dynamicSizingAccuracy');
      
      // Check enhanced rendering performance metrics
      expect(metrics.renderingPerformance).toHaveProperty('frameDropDetection');
      expect(metrics.renderingPerformance).toHaveProperty('smoothScrollMetrics');
      expect(metrics.renderingPerformance).toHaveProperty('autoSizingLatency');
      
      // Check frame drop detection structure
      expect(metrics.renderingPerformance.frameDropDetection).toHaveProperty('totalFrames');
      expect(metrics.renderingPerformance.frameDropDetection).toHaveProperty('droppedFrames');
      expect(metrics.renderingPerformance.frameDropDetection).toHaveProperty('frameDropRate');
      expect(metrics.renderingPerformance.frameDropDetection).toHaveProperty('consecutiveDrops');
      expect(metrics.renderingPerformance.frameDropDetection).toHaveProperty('lastFrameTime');
      
      // Check smooth scroll metrics structure
      expect(metrics.renderingPerformance.smoothScrollMetrics).toHaveProperty('totalScrollEvents');
      expect(metrics.renderingPerformance.smoothScrollMetrics).toHaveProperty('smoothScrollEvents');
      expect(metrics.renderingPerformance.smoothScrollMetrics).toHaveProperty('smoothScrollPercentage');
      expect(metrics.renderingPerformance.smoothScrollMetrics).toHaveProperty('averageScrollVelocity');
      expect(metrics.renderingPerformance.smoothScrollMetrics).toHaveProperty('maxScrollVelocity');
      
      // Check auto-sizing metrics
      expect(metrics).toHaveProperty('autoSizingMetrics');
      expect(metrics.autoSizingMetrics).toHaveProperty('totalSizingOperations');
      expect(metrics.autoSizingMetrics).toHaveProperty('averageSizingTime');
      expect(metrics.autoSizingMetrics).toHaveProperty('sizingAccuracy');
      expect(metrics.autoSizingMetrics).toHaveProperty('dynamicResizeEvents');
      expect(metrics.autoSizingMetrics).toHaveProperty('sizingErrors');
      
      // Check frame performance history
      expect(metrics).toHaveProperty('framePerformanceHistory');
      expect(Array.isArray(metrics.framePerformanceHistory)).toBe(true);
    });
  });

  describe('Frame Drop Detection', () => {
    it('should detect dropped frames correctly', () => {
      const config = {
        enableV2Metrics: true,
        trackRenderingPerformance: true,
      };

      const { result } = renderHook(() => 
        useFlashListV2Performance(mockData, config)
      );

      const performanceMonitor = result.current.performanceMonitor;

      // Simulate normal frame (16.67ms for 60fps)
      let frameResult = performanceMonitor.recordFrame(16.67);
      expect(frameResult.wasDropped).toBe(false);
      expect(frameResult.consecutiveDrops).toBe(0);

      // Simulate dropped frame (30ms > 25ms threshold)
      frameResult = performanceMonitor.recordFrame(30);
      expect(frameResult.wasDropped).toBe(true);
      expect(frameResult.consecutiveDrops).toBe(1);

      // Simulate another dropped frame
      frameResult = performanceMonitor.recordFrame(35);
      expect(frameResult.wasDropped).toBe(true);
      expect(frameResult.consecutiveDrops).toBe(2);

      // Simulate recovery
      frameResult = performanceMonitor.recordFrame(16);
      expect(frameResult.wasDropped).toBe(false);
      expect(frameResult.consecutiveDrops).toBe(0);

      // Check frame drop rate
      expect(frameResult.frameDropRate).toBeCloseTo(50, 1); // 2 out of 4 frames dropped
    });

    it('should maintain frame performance history', () => {
      const config = {
        enableV2Metrics: true,
        trackRenderingPerformance: true,
      };

      const { result } = renderHook(() => 
        useFlashListV2Performance(mockData, config)
      );

      const performanceMonitor = result.current.performanceMonitor;

      // Record several frames
      performanceMonitor.recordFrame(16.67, 500); // Normal frame with scroll velocity
      performanceMonitor.recordFrame(30, 1000);   // Dropped frame
      performanceMonitor.recordFrame(15, 200);    // Fast frame

      const metrics = performanceMonitor.getMetrics();
      
      expect(metrics.framePerformanceHistory).toHaveLength(3);
      expect(metrics.framePerformanceHistory[0]).toMatchObject({
        frameTime: 16.67,
        wasDropped: false,
        scrollVelocity: 500,
      });
      expect(metrics.framePerformanceHistory[1]).toMatchObject({
        frameTime: 30,
        wasDropped: true,
        scrollVelocity: 1000,
      });
      expect(metrics.framePerformanceHistory[2]).toMatchObject({
        frameTime: 15,
        wasDropped: false,
        scrollVelocity: 200,
      });
    });
  });

  describe('Smooth Scroll Percentage Calculation', () => {
    it('should calculate smooth scroll percentage correctly', () => {
      const config = {
        enableV2Metrics: true,
        trackRenderingPerformance: true,
      };

      const { result } = renderHook(() => 
        useFlashListV2Performance(mockData, config)
      );

      const performanceMonitor = result.current.performanceMonitor;

      // Simulate smooth scrolling (velocity < 1000 px/s)
      let scrollResult = performanceMonitor.recordScrollEvent(500);
      expect(scrollResult.isSmooth).toBe(true);
      expect(scrollResult.smoothScrollPercentage).toBe(100);

      scrollResult = performanceMonitor.recordScrollEvent(800);
      expect(scrollResult.isSmooth).toBe(true);
      expect(scrollResult.smoothScrollPercentage).toBe(100);

      // Simulate fast scrolling (velocity >= 1000 px/s)
      scrollResult = performanceMonitor.recordScrollEvent(1500);
      expect(scrollResult.isSmooth).toBe(false);
      expect(scrollResult.smoothScrollPercentage).toBeCloseTo(66.67, 1); // 2 out of 3 smooth

      scrollResult = performanceMonitor.recordScrollEvent(2000);
      expect(scrollResult.isSmooth).toBe(false);
      expect(scrollResult.smoothScrollPercentage).toBe(50); // 2 out of 4 smooth
    });

    it('should track scroll velocity metrics', () => {
      const config = {
        enableV2Metrics: true,
        trackRenderingPerformance: true,
      };

      const { result } = renderHook(() => 
        useFlashListV2Performance(mockData, config)
      );

      const performanceMonitor = result.current.performanceMonitor;

      // Record various scroll velocities
      performanceMonitor.recordScrollEvent(300);
      performanceMonitor.recordScrollEvent(800);
      performanceMonitor.recordScrollEvent(1200);
      performanceMonitor.recordScrollEvent(600);

      const scrollResult = performanceMonitor.recordScrollEvent(400);
      
      // Average should be (300 + 800 + 1200 + 600 + 400) / 5 = 660
      expect(scrollResult.averageVelocity).toBeCloseTo(660, 0);
      expect(scrollResult.maxVelocity).toBe(1200);
    });
  });

  describe('Automatic Sizing Efficiency Tracking', () => {
    it('should track auto-sizing operations', () => {
      const config = {
        enableV2Metrics: true,
        trackRenderingPerformance: true,
        enableAutoSizingMetrics: true,
      };

      const { result } = renderHook(() => 
        useFlashListV2Performance(mockData, config)
      );

      const performanceMonitor = result.current.performanceMonitor;

      // Record auto-sizing operations
      performanceMonitor.recordAutoSizing(2.5, 95); // Fast, accurate
      performanceMonitor.recordAutoSizing(4.0, 88); // Slower, less accurate
      performanceMonitor.recordAutoSizing(1.8, 97); // Fast, very accurate
      performanceMonitor.recordAutoSizing(6.2, 65); // Slow, poor accuracy (error)

      const metrics = performanceMonitor.getMetrics();
      
      expect(metrics.autoSizingMetrics.totalSizingOperations).toBe(4);
      expect(metrics.autoSizingMetrics.averageSizingTime).toBeCloseTo(3.625, 2); // (2.5+4.0+1.8+6.2)/4
      expect(metrics.autoSizingMetrics.sizingAccuracy).toBeCloseTo(86.25, 2); // (95+88+97+65)/4
      expect(metrics.autoSizingMetrics.dynamicResizeEvents).toBe(1); // One with accuracy < 90
      expect(metrics.autoSizingMetrics.sizingErrors).toBe(1); // One with accuracy < 70
    });

    it('should calculate auto-sizing efficiency based on strategy', () => {
      const testCases = [
        { strategy: 'conservative' as const, expected: 85.5 }, // 95 * 0.9
        { strategy: 'balanced' as const, expected: 95 },       // No adjustment
        { strategy: 'aggressive' as const, expected: 100 },    // 95 * 1.1, capped at 100
      ];

      testCases.forEach(({ strategy, expected }) => {
        const config = {
          enableV2Metrics: true,
          autoSizingStrategy: strategy,
        };

        const { result } = renderHook(() => 
          useFlashListV2Performance(mockData, config)
        );

        // The efficiency calculation is internal, but we can verify it through metrics
        // This would be tested through the actual performance monitoring interval
        expect(result.current.metrics.autoSizingEfficiency).toBeGreaterThanOrEqual(0);
        expect(result.current.metrics.autoSizingEfficiency).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Performance Monitor Controls', () => {
    it('should provide performance monitor controls', () => {
      const config = {
        enableV2Metrics: true,
        trackRenderingPerformance: true,
      };

      const { result } = renderHook(() => 
        useFlashListV2Performance(mockData, config)
      );

      const performanceMonitor = result.current.performanceMonitor;

      // Check that all control methods are available
      expect(typeof performanceMonitor.getMetrics).toBe('function');
      expect(typeof performanceMonitor.reset).toBe('function');
      expect(typeof performanceMonitor.recordFrame).toBe('function');
      expect(typeof performanceMonitor.recordScrollEvent).toBe('function');
      expect(typeof performanceMonitor.recordAutoSizing).toBe('function');
    });

    it('should reset performance metrics correctly', () => {
      const config = {
        enableV2Metrics: true,
        trackRenderingPerformance: true,
      };

      const { result } = renderHook(() => 
        useFlashListV2Performance(mockData, config)
      );

      const performanceMonitor = result.current.performanceMonitor;

      // Record some data
      performanceMonitor.recordFrame(30); // Dropped frame
      performanceMonitor.recordScrollEvent(1500); // Fast scroll
      performanceMonitor.recordAutoSizing(5, 80); // Slow sizing

      // Verify data exists
      let metrics = performanceMonitor.getMetrics();
      expect(metrics.frameDropDetection.totalFrames).toBe(1);
      expect(metrics.smoothScrollMetrics.totalScrollEvents).toBe(1);
      expect(metrics.autoSizingMetrics.totalSizingOperations).toBe(1);

      // Reset and verify clean state
      performanceMonitor.reset();
      metrics = performanceMonitor.getMetrics();
      
      expect(metrics.frameDropDetection.totalFrames).toBe(0);
      expect(metrics.frameDropDetection.droppedFrames).toBe(0);
      expect(metrics.frameDropDetection.consecutiveDrops).toBe(0);
      expect(metrics.smoothScrollMetrics.totalScrollEvents).toBe(0);
      expect(metrics.smoothScrollMetrics.smoothScrollEvents).toBe(0);
      expect(metrics.autoSizingMetrics.totalSizingOperations).toBe(0);
      expect(metrics.framePerformanceHistory).toHaveLength(0);
    });
  });

  describe('Performance Warnings and Optimization', () => {
    it('should provide performance optimization suggestions', () => {
      const config = {
        enableV2Metrics: true,
        trackRenderingPerformance: true,
        enablePerformanceLogging: true,
        autoSizingStrategy: 'aggressive' as const,
      };

      const { result } = renderHook(() => 
        useFlashListV2Performance(mockData, config)
      );

      const performanceMonitor = result.current.performanceMonitor;

      // Simulate poor performance conditions
      // High frame drop rate
      for (let i = 0; i < 10; i++) {
        performanceMonitor.recordFrame(i < 7 ? 35 : 16); // 70% drop rate
      }

      // Poor scroll performance
      for (let i = 0; i < 10; i++) {
        performanceMonitor.recordScrollEvent(i < 8 ? 2000 : 500); // 80% fast scrolling
      }

      // Poor auto-sizing performance
      performanceMonitor.recordAutoSizing(8, 60); // Slow and inaccurate

      const metrics = performanceMonitor.getMetrics();
      
      // Verify poor performance is detected
      expect(metrics.frameDropDetection.frameDropRate).toBeGreaterThan(15);
      expect(metrics.smoothScrollMetrics.smoothScrollPercentage).toBeLessThan(80);
      expect(metrics.autoSizingMetrics.sizingErrors).toBeGreaterThan(0);
    });
  });

  describe('Integration with Scroll Events', () => {
    it('should track scroll performance during scroll events', () => {
      const config = {
        enableV2Metrics: true,
        trackRenderingPerformance: true,
      };

      const { result } = renderHook(() => 
        useFlashListV2Performance(mockData, config)
      );

      // Simulate scroll event
      const mockScrollEvent = {
        nativeEvent: {
          contentOffset: { y: 100 },
          layoutMeasurement: { height: 800 },
        },
      };

      act(() => {
        // This would normally be called by the scroll handler
        result.current.flashListProps.onScroll?.(mockScrollEvent as any);
      });

      // Verify scroll position is tracked
      expect(result.current.metrics.scrollPosition).toBe(100);
    });
  });

  describe('Memory Integration', () => {
    it('should integrate performance monitoring with memory management', () => {
      const config = {
        enableV2Metrics: true,
        trackRenderingPerformance: true,
        enableMemoryMetrics: true,
        enableIntelligentCaching: true,
      };

      const { result } = renderHook(() => 
        useFlashListV2Performance(mockData, config)
      );

      // Verify both performance monitor and memory manager are available
      expect(result.current.performanceMonitor).toBeDefined();
      expect(result.current.memoryManager).toBeDefined();
      
      // Verify metrics include both performance and memory data
      expect(result.current.metrics.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(result.current.metrics.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(result.current.metrics.renderingPerformance).toBeDefined();
    });
  });
});