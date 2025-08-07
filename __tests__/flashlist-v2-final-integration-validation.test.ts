/**
 * FlashList v2 Final Integration and Validation Tests
 * 
 * Comprehensive final validation tests for the complete FlashList v2 migration including:
 * - Complete migration with real-world data scenarios
 * - Performance improvements validation in production-like conditions
 * - Regression testing for existing functionality
 * - Final compatibility checks across all components
 * 
 * Requirements: 1.4, 2.4, 5.4, 7.4
 */

import { renderHook, act } from '@testing-library/react-native';
import { FlashListWrapper, FlashListRef } from '../components/ui/FlashListWrapper';
import { 
  useFlashListV2Performance, 
  validateFlashListProps,
  detectDeprecatedFlashListProps,
  clearDeprecationWarningCache,
  FLASHLIST_V2_PRESETS
} from '../lib/utils/flashlist-performance';
import { useFlashListV2State, useFlashListLayout } from '../lib/utils/flashlist-v2-hooks';

// Mock performance.now for consistent testing
const mockPerformanceNow = jest.fn();
global.performance = { now: mockPerformanceNow } as any;

// Mock FlashList for testing
jest.mock('@shopify/flash-list', () => ({
  FlashList: 'FlashList',
  FlashListRef: 'FlashListRef',
}));

// Mock logger
jest.mock('../lib/utils/logger', () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('FlashList v2 Final Integration and Validation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearDeprecationWarningCache();
    mockPerformanceNow.mockReturnValue(1000);
  });

  describe('Complete Migration with Real-World Data Scenarios', () => {
    interface RealWorldMessageItem {
      id: string;
      userId: string;
      content: string;
      timestamp: number;
      type: 'text' | 'image' | 'video' | 'system' | 'notification';
      attachments?: Array<{
        id: string;
        type: 'image' | 'video' | 'file';
        url: string;
        size: number;
      }>;
      reactions?: Array<{
        emoji: string;
        userId: string;
        timestamp: number;
      }>;
      replies?: Array<{
        id: string;
        userId: string;
        content: string;
        timestamp: number;
      }>;
      _v2Metadata: {
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
    }

    const generateRealWorldDataset = (count: number): RealWorldMessageItem[] => {
      return Array.from({ length: count }, (_, i) => {
        const hasAttachments = i % 5 === 0;
        const hasReactions = i % 3 === 0;
        const hasReplies = i % 7 === 0;
        const messageType = ['text', 'image', 'video', 'system', 'notification'][i % 5] as any;
        
        return {
          id: `msg-${i}`,
          userId: `user-${i % 10}`,
          content: `Message content ${i} - ${messageType === 'text' ? 'This is a longer text message with more content to test automatic sizing capabilities' : 'Short content'}`,
          timestamp: Date.now() - (i * 60000), // 1 minute apart
          type: messageType,
          attachments: hasAttachments ? [{
            id: `att-${i}`,
            type: 'image',
            url: `https://example.com/image-${i}.jpg`,
            size: 1024 * (i % 10 + 1),
          }] : undefined,
          reactions: hasReactions ? [{
            emoji: '👍',
            userId: `user-${(i + 1) % 10}`,
            timestamp: Date.now() - (i * 30000),
          }] : undefined,
          replies: hasReplies ? [{
            id: `reply-${i}`,
            userId: `user-${(i + 2) % 10}`,
            content: `Reply to message ${i}`,
            timestamp: Date.now() - (i * 15000),
          }] : undefined,
          _v2Metadata: {
            complexity: hasAttachments || hasReplies ? 'high' : hasReactions ? 'medium' : 'low',
            hasMedia: hasAttachments,
            hasInteractions: hasReactions || hasReplies,
            autoSizingHints: {
              contentType: hasAttachments ? 'media' : hasReactions || hasReplies ? 'mixed' : 'text',
              dynamicContent: hasReactions || hasReplies,
              masonrySpan: hasAttachments ? 2 : 1,
              recyclingType: `${messageType}-${hasAttachments ? 'media' : 'text'}`,
              itemTypeHint: `message-${messageType}`,
            },
            v2Optimizations: {
              enableAutoSizing: true,
              preferredRecyclingPool: hasAttachments ? 'media-pool' : 'text-pool',
              layoutComplexity: hasAttachments || hasReplies ? 'complex' : hasReactions ? 'moderate' : 'simple',
              requiresDynamicSizing: hasReactions || hasReplies,
            },
          },
        };
      });
    };

    it('should handle large chat history migration (10k+ messages)', () => {
      const largeDataset = generateRealWorldDataset(10000);
      
      const { result } = renderHook(() => 
        useFlashListV2Performance(largeDataset, {
          ...FLASHLIST_V2_PRESETS.LARGE_MESSAGE_HISTORY,
          enableV2Metrics: true,
          enableAutoSizingMetrics: true,
          enableMemoryMetrics: true,
        })
      );

      expect(result.current.metrics.totalItems).toBe(10000);
      expect(result.current.metrics.autoSizingEfficiency).toBeGreaterThan(80);
      expect(result.current.metrics.memoryUsage).toBeLessThan(50); // MB
      
      // Test automatic sizing configuration
      expect(result.current.flashListProps.maintainVisibleContentPosition).toBeDefined();
      expect(result.current.flashListProps.maintainVisibleContentPosition?.startRenderingFromBottom).toBe(true);
      
      // Test performance metrics
      expect(result.current.metrics.autoSizingMetrics).toBeDefined();
      expect(result.current.metrics.autoSizingMetrics?.sizingAccuracy).toBeGreaterThan(90);
      
      // Test memory management
      const memoryPressure = result.current.memoryManager.getMemoryPressure();
      expect(memoryPressure.pressureLevel).toBeLessThan(80);
      expect(memoryPressure.shouldCleanup).toBe(false);
    });

    it('should handle mixed content types with varying complexities', () => {
      const mixedDataset = generateRealWorldDataset(1000);
      
      // Analyze dataset complexity distribution
      const complexityStats = {
        low: mixedDataset.filter(item => item._v2Metadata.complexity === 'low').length,
        medium: mixedDataset.filter(item => item._v2Metadata.complexity === 'medium').length,
        high: mixedDataset.filter(item => item._v2Metadata.complexity === 'high').length,
      };

      const { result } = renderHook(() => 
        useFlashListV2Performance(mixedDataset, {
          enableAutoSizing: true,
          autoSizingStrategy: 'balanced',
          enableDynamicSizing: true,
          enableIntelligentCaching: true,
          cacheStrategy: 'hybrid',
          enableV2Metrics: true,
        })
      );

      // Validate complexity handling
      expect(complexityStats.low).toBeGreaterThan(0);
      expect(complexityStats.medium).toBeGreaterThan(0);
      expect(complexityStats.high).toBeGreaterThan(0);
      
      // Test automatic sizing adapts to complexity
      expect(result.current.metrics.autoSizingEfficiency).toBeGreaterThan(75);
      expect(result.current.metrics.dynamicSizingAccuracy).toBeGreaterThan(85);
      
      // Test caching effectiveness with mixed content
      const cacheStats = result.current.memoryManager.getCacheStats();
      expect(cacheStats.hitRate).toBeGreaterThan(70);
    });

    it('should handle real-time updates in chat scenarios', () => {
      const initialDataset = generateRealWorldDataset(500);
      
      const { result, rerender } = renderHook(
        ({ data }) => useFlashListV2Performance(data, {
          ...FLASHLIST_V2_PRESETS.LARGE_MESSAGE_HISTORY,
          enableV2Metrics: true,
        }),
        { initialProps: { data: initialDataset } }
      );

      const initialMetrics = result.current.metrics;
      
      // Simulate real-time message additions
      const updatedDataset = [
        ...generateRealWorldDataset(10).map(item => ({ ...item, id: `new-${item.id}` })),
        ...initialDataset,
      ];

      act(() => {
        rerender({ data: updatedDataset });
      });

      const updatedMetrics = result.current.metrics;
      
      // Validate real-time update handling
      expect(updatedMetrics.totalItems).toBe(510);
      expect(updatedMetrics.totalItems).toBeGreaterThan(initialMetrics.totalItems);
      
      // Test maintainVisibleContentPosition behavior
      expect(result.current.flashListProps.maintainVisibleContentPosition?.startRenderingFromBottom).toBe(true);
      expect(result.current.flashListProps.maintainVisibleContentPosition?.autoscrollToBottomThreshold).toBe(0.2);
    });

    it('should handle masonry layout with real-world image data', () => {
      const imageDataset = generateRealWorldDataset(200).map((item, i) => ({
        ...item,
        type: 'image' as const,
        attachments: [{
          id: `img-${i}`,
          type: 'image' as const,
          url: `https://example.com/image-${i}.jpg`,
          size: 1024 * (i % 10 + 1),
        }],
        _v2Metadata: {
          ...item._v2Metadata,
          hasMedia: true,
          autoSizingHints: {
            ...item._v2Metadata.autoSizingHints,
            contentType: 'media' as const,
            masonrySpan: (i % 3) + 1, // Varying spans 1-3
          },
        },
      }));

      const { result } = renderHook(() => 
        useFlashListV2Performance(imageDataset, {
          ...FLASHLIST_V2_PRESETS.MASONRY_GRID,
          masonry: true,
          enableAutoSizing: true,
          numColumns: 2,
        })
      );

      // Test masonry configuration
      expect(result.current.flashListProps.masonry).toBe(true);
      expect(result.current.flashListProps.numColumns).toBe(2);
      
      // Test performance with media content
      expect(result.current.metrics.autoSizingEfficiency).toBeGreaterThan(70);
      expect(result.current.metrics.memoryUsage).toBeLessThan(40); // MB
    });
  });

  describe('Performance Improvements Validation', () => {
    it('should demonstrate v2 performance improvements over v1', () => {
      const testDataset = generateRealWorldDataset(1000);
      
      // Simulate v1 performance characteristics
      const v1SimulatedMetrics = {
        initialRenderTime: 150, // ms
        averageFrameTime: 20, // ms (below 60fps)
        memoryUsage: 45, // MB
        scrollPerformance: 75, // percentage
        sizingAccuracy: 80, // percentage (with manual estimates)
      };

      const { result } = renderHook(() => 
        useFlashListV2Performance(testDataset, {
          enableAutoSizing: true,
          autoSizingStrategy: 'balanced',
          enableV2Metrics: true,
          enableMemoryOptimization: true,
        })
      );

      // Simulate v2 performance improvements
      const v2Metrics = result.current.metrics;
      
      // Test automatic sizing improvements
      expect(v2Metrics.autoSizingEfficiency).toBeGreaterThan(v1SimulatedMetrics.sizingAccuracy);
      expect(v2Metrics.dynamicSizingAccuracy).toBeGreaterThan(90);
      
      // Test memory usage improvements
      expect(v2Metrics.memoryUsage).toBeLessThan(v1SimulatedMetrics.memoryUsage);
      
      // Test rendering performance improvements
      expect(v2Metrics.renderingPerformance.averageFrameTime).toBeLessThan(v1SimulatedMetrics.averageFrameTime);
      expect(v2Metrics.renderingPerformance.smoothScrollPercentage).toBeGreaterThan(v1SimulatedMetrics.scrollPerformance);
      
      // Test frame drop improvements
      expect(v2Metrics.renderingPerformance.frameDropDetection.frameDropRate).toBeLessThan(5);
    });

    it('should validate memory optimization under stress conditions', () => {
      const stressDataset = generateRealWorldDataset(5000);
      
      const { result } = renderHook(() => 
        useFlashListV2Performance(stressDataset, {
          enableMemoryOptimization: true,
          memoryPressureThreshold: 70,
          enableProactiveCleanup: true,
          memoryCleanupStrategy: 'moderate',
          enableV2Metrics: true,
        })
      );

      // Test memory pressure handling
      const memoryPressure = result.current.memoryManager.getMemoryPressure();
      expect(memoryPressure.pressureLevel).toBeLessThan(80);
      
      // Test proactive cleanup
      if (memoryPressure.shouldCleanup) {
        const cleanupResult = result.current.memoryManager.performCleanup('moderate');
        expect(cleanupResult.freedMemory).toBeGreaterThan(0);
        expect(cleanupResult.cleanupTime).toBeLessThan(100); // ms
      }
      
      // Test cache efficiency under stress
      const cacheStats = result.current.memoryManager.getCacheStats();
      expect(cacheStats.hitRate).toBeGreaterThan(60); // Should maintain reasonable hit rate
    });

    it('should validate scroll performance with rapid scrolling', () => {
      const scrollDataset = generateRealWorldDataset(2000);
      
      const { result } = renderHook(() => 
        useFlashListV2Performance(scrollDataset, {
          enableScrollOptimization: true,
          scrollEventThrottle: 16,
          enableV2Metrics: true,
        })
      );

      // Simulate rapid scrolling events
      const scrollVelocities = [500, 1000, 1500, 2000, 2500, 3000];
      
      scrollVelocities.forEach(velocity => {
        const scrollMetrics = result.current.performanceMonitor.recordScrollEvent(velocity);
        
        // Test smooth scroll detection
        if (velocity < 1000) {
          expect(scrollMetrics.isSmooth).toBe(true);
        }
        
        // Test scroll performance tracking
        expect(scrollMetrics.averageVelocity).toBeGreaterThan(0);
        expect(scrollMetrics.maxVelocity).toBeGreaterThanOrEqual(velocity);
      });

      // Test overall scroll performance
      const finalMetrics = result.current.performanceMonitor.getMetrics();
      expect(finalMetrics.smoothScrollMetrics.totalScrollEvents).toBe(scrollVelocities.length);
      expect(finalMetrics.smoothScrollMetrics.smoothScrollPercentage).toBeGreaterThan(0);
    });
  });

  describe('Regression Testing for Existing Functionality', () => {
    it('should maintain backward compatibility with existing FlashListWrapper usage', () => {
      // Test that existing props still work
      const legacyProps = {
        data: generateRealWorldDataset(100),
        renderItem: ({ item }: any) => item,
        keyExtractor: (item: any) => item.id,
        // Legacy Android-specific prop (deprecated but should still work)
        stickyToBottomOnAndroid: true,
      };

      // Should not throw errors with legacy props
      expect(() => {
        validateFlashListProps(legacyProps, 'FlashListWrapper');
      }).not.toThrow();

      // Should detect deprecated props but not break functionality
      const warnings = detectDeprecatedFlashListProps(legacyProps);
      const stickyBottomWarning = warnings.find(w => w.propName === 'stickyToBottomOnAndroid');
      expect(stickyBottomWarning).toBeDefined();
      expect(stickyBottomWarning?.severity).toBe('warning');
    });

    it('should handle v1 props gracefully with migration warnings', () => {
      const v1Props = {
        data: generateRealWorldDataset(50),
        renderItem: ({ item }: any) => item,
        estimatedItemSize: 100, // v1 prop
        estimatedListSize: { height: 600, width: 400 }, // v1 prop
        inverted: true, // v1 prop
        onBlankArea: () => {}, // v1 prop (unsupported)
      };

      const warnings = detectDeprecatedFlashListProps(v1Props);
      
      // Should detect all deprecated props
      expect(warnings).toHaveLength(4);
      
      const propNames = warnings.map(w => w.propName);
      expect(propNames).toContain('estimatedItemSize');
      expect(propNames).toContain('estimatedListSize');
      expect(propNames).toContain('inverted');
      expect(propNames).toContain('onBlankArea');
      
      // Should provide migration guidance
      warnings.forEach(warning => {
        expect(warning.migration).toBeDefined();
        expect(warning.migration.length).toBeGreaterThan(0);
      });
    });

    it('should maintain performance utility API compatibility', () => {
      const testData = generateRealWorldDataset(200);
      
      // Test that existing performance utility usage still works
      const { result } = renderHook(() => 
        useFlashListV2Performance(testData, {
          // Legacy props (should work with warnings)
          enableCaching: true, // deprecated, maps to enableIntelligentCaching
          // New v2 props
          enableAutoSizing: true,
          autoSizingStrategy: 'balanced',
        })
      );

      // Should return expected interface
      expect(result.current.flashListProps).toBeDefined();
      expect(result.current.metrics).toBeDefined();
      expect(result.current.scrollToIndex).toBeInstanceOf(Function);
      expect(result.current.scrollToTop).toBeInstanceOf(Function);
      expect(result.current.scrollToBottom).toBeInstanceOf(Function);
      expect(result.current.clearCache).toBeInstanceOf(Function);
      expect(result.current.memoryManager).toBeDefined();
      expect(result.current.performanceMonitor).toBeDefined();
    });

    it('should maintain hook compatibility', () => {
      // Test v2 hooks work as expected
      const { result: stateResult } = renderHook(() => 
        useFlashListV2State({ count: 0 }, ['dependency'], () => ({ count: 0 }))
      );

      const { result: layoutResult } = renderHook(() => 
        useFlashListLayout({ visible: true })
      );

      // Should return expected state management
      expect(stateResult.current).toBeDefined();
      expect(layoutResult.current).toBeDefined();
    });
  });

  describe('Final Compatibility Checks', () => {
    it('should validate all preset configurations work correctly', () => {
      const testData = generateRealWorldDataset(300);
      
      // Test all available presets
      const presetNames = Object.keys(FLASHLIST_V2_PRESETS) as Array<keyof typeof FLASHLIST_V2_PRESETS>;
      
      presetNames.forEach(presetName => {
        const preset = FLASHLIST_V2_PRESETS[presetName];
        
        const { result } = renderHook(() => 
          useFlashListV2Performance(testData, preset)
        );

        // Each preset should work without errors
        expect(result.current.flashListProps).toBeDefined();
        expect(result.current.metrics).toBeDefined();
        
        // Preset-specific validations
        if (presetName === 'LARGE_MESSAGE_HISTORY') {
          expect(result.current.flashListProps.maintainVisibleContentPosition?.startRenderingFromBottom).toBe(true);
        }
        
        if (presetName === 'MASONRY_GRID') {
          expect(result.current.flashListProps.masonry).toBe(true);
        }
      });
    });

    it('should validate TypeScript type exports', () => {
      // Test that all expected types are available
      // This is more of a compilation test, but we can verify the interfaces exist
      
      const mockFlashListRef: FlashListRef<any> = {
        scrollToIndex: jest.fn(),
        scrollToEnd: jest.fn(),
        scrollToOffset: jest.fn(),
        getCurrentScrollOffset: jest.fn(),
        getNativeScrollRef: jest.fn(),
        getScrollableNode: jest.fn(),
        flashScrollTo: jest.fn(),
        recordInteraction: jest.fn(),
        prepareForLayoutAnimationRender: jest.fn(),
      };

      // Should be able to use FlashListRef type
      expect(mockFlashListRef.scrollToIndex).toBeInstanceOf(Function);
      expect(mockFlashListRef.scrollToEnd).toBeInstanceOf(Function);
    });

    it('should validate complete integration with all components', () => {
      const integrationData = generateRealWorldDataset(1000);
      
      // Test complete integration scenario
      const { result } = renderHook(() => 
        useFlashListV2Performance(integrationData, {
          // Automatic sizing
          enableAutoSizing: true,
          autoSizingStrategy: 'balanced',
          enableDynamicSizing: true,
          
          // Memory management
          enableMemoryOptimization: true,
          enableIntelligentCaching: true,
          cacheStrategy: 'hybrid',
          
          // Performance monitoring
          enableV2Metrics: true,
          enableAutoSizingMetrics: true,
          trackRenderingPerformance: true,
          
          // maintainVisibleContentPosition
          maintainVisibleContentPosition: {
            autoscrollToBottomThreshold: 0.2,
            startRenderingFromBottom: true,
            animateAutoScrollToBottom: true,
          },
        })
      );

      // Validate all systems work together
      expect(result.current.metrics.autoSizingEfficiency).toBeGreaterThan(80);
      expect(result.current.metrics.memoryUsage).toBeLessThan(50);
      expect(result.current.metrics.cacheHitRate).toBeGreaterThan(70);
      expect(result.current.metrics.renderingPerformance.smoothScrollPercentage).toBeGreaterThan(85);
      
      // Test all manager functions work
      expect(result.current.memoryManager.getMemoryUsage()).toBeGreaterThan(0);
      expect(result.current.memoryManager.getCacheStats().totalRequests).toBeGreaterThan(0);
      expect(result.current.performanceMonitor.getMetrics()).toBeDefined();
      
      // Test all scroll functions work
      expect(() => result.current.scrollToIndex(0)).not.toThrow();
      expect(() => result.current.scrollToTop()).not.toThrow();
      expect(() => result.current.scrollToBottom()).not.toThrow();
      expect(() => result.current.clearCache()).not.toThrow();
    });

    it('should validate production-ready configuration', () => {
      const productionData = generateRealWorldDataset(5000);
      
      // Test production-optimized configuration
      const { result } = renderHook(() => 
        useFlashListV2Performance(productionData, {
          // Production optimizations
          enableAutoSizing: true,
          autoSizingStrategy: 'balanced',
          enableMemoryOptimization: true,
          memoryPressureThreshold: 75,
          enableProactiveCleanup: true,
          memoryCleanupStrategy: 'moderate',
          
          // Caching optimizations
          enableIntelligentCaching: true,
          cacheStrategy: 'hybrid',
          enableAdaptiveCaching: true,
          
          // Performance monitoring (disabled in production)
          enableV2Metrics: false,
          enablePerformanceLogging: false,
          
          // Scroll optimizations
          enableScrollOptimization: true,
          scrollEventThrottle: 16,
        })
      );

      // Should handle large datasets efficiently
      expect(result.current.metrics.totalItems).toBe(5000);
      expect(result.current.metrics.memoryUsage).toBeLessThan(60); // MB
      
      // Memory management should be active
      const memoryPressure = result.current.memoryManager.getMemoryPressure();
      expect(memoryPressure.pressureLevel).toBeLessThan(85);
      
      // Cache should be effective
      const cacheStats = result.current.memoryManager.getCacheStats();
      expect(cacheStats.hitRate).toBeGreaterThan(65);
    });
  });

  // Helper function to generate realistic test data
  function generateRealWorldDataset(count: number): RealWorldMessageItem[] {
    return Array.from({ length: count }, (_, i) => {
      const hasAttachments = i % 5 === 0;
      const hasReactions = i % 3 === 0;
      const hasReplies = i % 7 === 0;
      const messageType = ['text', 'image', 'video', 'system', 'notification'][i % 5] as any;
      
      return {
        id: `msg-${i}`,
        userId: `user-${i % 10}`,
        content: `Message content ${i} - ${messageType === 'text' ? 'This is a longer text message with more content to test automatic sizing capabilities' : 'Short content'}`,
        timestamp: Date.now() - (i * 60000),
        type: messageType,
        attachments: hasAttachments ? [{
          id: `att-${i}`,
          type: 'image',
          url: `https://example.com/image-${i}.jpg`,
          size: 1024 * (i % 10 + 1),
        }] : undefined,
        reactions: hasReactions ? [{
          emoji: '👍',
          userId: `user-${(i + 1) % 10}`,
          timestamp: Date.now() - (i * 30000),
        }] : undefined,
        replies: hasReplies ? [{
          id: `reply-${i}`,
          userId: `user-${(i + 2) % 10}`,
          content: `Reply to message ${i}`,
          timestamp: Date.now() - (i * 15000),
        }] : undefined,
        _v2Metadata: {
          complexity: hasAttachments || hasReplies ? 'high' : hasReactions ? 'medium' : 'low',
          hasMedia: hasAttachments,
          hasInteractions: hasReactions || hasReplies,
          autoSizingHints: {
            contentType: hasAttachments ? 'media' : hasReactions || hasReplies ? 'mixed' : 'text',
            dynamicContent: hasReactions || hasReplies,
            masonrySpan: hasAttachments ? 2 : 1,
            recyclingType: `${messageType}-${hasAttachments ? 'media' : 'text'}`,
            itemTypeHint: `message-${messageType}`,
          },
          v2Optimizations: {
            enableAutoSizing: true,
            preferredRecyclingPool: hasAttachments ? 'media-pool' : 'text-pool',
            layoutComplexity: hasAttachments || hasReplies ? 'complex' : hasReactions ? 'moderate' : 'simple',
            requiresDynamicSizing: hasReactions || hasReplies,
          },
        },
      };
    });
  }
});