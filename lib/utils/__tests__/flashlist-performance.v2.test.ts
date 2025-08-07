/**
 * Comprehensive unit tests for FlashList v2 performance utility configurations
 * Tests performance presets, optimization strategies, and v2-specific configurations
 */

import {
  FlashListV2PerformanceConfig,
  optimizeV2Dataset,
  generateV2ItemType,
  applyV2DataTransformations,
  optimizeMasonryDataset,
  createV2MasonryLayoutOverride,
  getV2DatasetStats,
  MessageListItem,
} from '../flashlist-performance';

describe('FlashList v2 Performance Utility Tests', () => {
  const mockMessageData: MessageListItem[] = [
    {
      id: '1',
      timestamp: Date.now(),
      type: 'message',
      content: 'Test message 1',
      _v2Metadata: {
        complexity: 'low',
        hasMedia: false,
        hasInteractions: false,
        autoSizingHints: {
          contentType: 'text',
          dynamicContent: false,
          recyclingType: 'message',
          itemTypeHint: 'text-message',
        },
        v2Optimizations: {
          enableAutoSizing: true,
          preferredRecyclingPool: 'text',
          layoutComplexity: 'simple',
          requiresDynamicSizing: false,
        },
      },
    },
    {
      id: '2',
      timestamp: Date.now() + 1000,
      type: 'message',
      content: 'Test message 2 with media',
      attachments: [{ type: 'image', url: 'test.jpg' }],
      _v2Metadata: {
        complexity: 'medium',
        hasMedia: true,
        hasInteractions: true,
        autoSizingHints: {
          contentType: 'mixed',
          dynamicContent: true,
          recyclingType: 'media-message',
          itemTypeHint: 'media-message',
        },
        v2Optimizations: {
          enableAutoSizing: true,
          preferredRecyclingPool: 'media',
          layoutComplexity: 'moderate',
          requiresDynamicSizing: true,
        },
      },
    },
  ];

  describe('V2 Dataset Optimization', () => {
    it('should optimize dataset for v2 without size estimation', () => {
      const result = optimizeV2Dataset(mockMessageData, {
        enableAutoSizing: true,
        cacheStrategy: 'hybrid',
        enableIntelligentCaching: true,
      });

      expect(result.optimizedData).toHaveLength(mockMessageData.length);
      expect(result.optimizedData[0]).toHaveProperty('_v2OptimizedKey');
      expect(result.stats.totalItems).toBe(mockMessageData.length);
      expect(result.stats.optimizationScore).toBeGreaterThan(0);
    });

    it('should handle empty dataset gracefully', () => {
      const result = optimizeV2Dataset([], {
        enableAutoSizing: true,
      });

      expect(result.optimizedData).toHaveLength(0);
      expect(result.stats.totalItems).toBe(0);
      expect(result.stats.optimizationScore).toBe(100); // Perfect score for empty dataset
    });

    it('should apply different optimization strategies', () => {
      const conservativeResult = optimizeV2Dataset(mockMessageData, {
        enableAutoSizing: true,
        autoSizingStrategy: 'conservative',
      });

      const aggressiveResult = optimizeV2Dataset(mockMessageData, {
        enableAutoSizing: true,
        autoSizingStrategy: 'aggressive',
      });

      expect(conservativeResult.stats.optimizationScore).toBeDefined();
      expect(aggressiveResult.stats.optimizationScore).toBeDefined();
      // Aggressive strategy should have different optimization characteristics
      expect(conservativeResult.stats).not.toEqual(aggressiveResult.stats);
    });
  });

  describe('V2 Item Type Generation', () => {
    it('should generate optimized item types for v2 recycling', () => {
      const getItemType = generateV2ItemType<MessageListItem>();
      
      const textMessageType = getItemType(mockMessageData[0], 0);
      const mediaMessageType = getItemType(mockMessageData[1], 1);
      
      expect(textMessageType).toBe('text-message');
      expect(mediaMessageType).toBe('media-message');
      expect(textMessageType).not.toBe(mediaMessageType);
    });

    it('should handle items without v2 metadata', () => {
      const getItemType = generateV2ItemType<MessageListItem>();
      const itemWithoutMetadata: MessageListItem = {
        id: '3',
        timestamp: Date.now(),
        type: 'message',
        content: 'Simple message',
      };
      
      const itemType = getItemType(itemWithoutMetadata, 0);
      expect(itemType).toBe('message'); // Falls back to basic type
    });

    it('should generate consistent types for similar items', () => {
      const getItemType = generateV2ItemType<MessageListItem>();
      
      const item1Type = getItemType(mockMessageData[0], 0);
      const item1TypeAgain = getItemType(mockMessageData[0], 5);
      
      expect(item1Type).toBe(item1TypeAgain);
    });
  });

  describe('V2 Data Transformations', () => {
    it('should apply v2-specific transformations for better performance', () => {
      const result = applyV2DataTransformations(mockMessageData, {
        enableAutoSizing: true,
        optimizeForMasonry: false,
        enhanceRecycling: true,
        addV2Metadata: true,
      });

      expect(result.transformedData).toHaveLength(mockMessageData.length);
      expect(result.transformedData[0]).toHaveProperty('_v2OptimizedKey');
      expect(result.stats.transformationsApplied).toBeGreaterThan(0);
    });

    it('should handle masonry-specific transformations', () => {
      const result = applyV2DataTransformations(mockMessageData, {
        enableAutoSizing: true,
        optimizeForMasonry: true,
        masonryColumns: 2,
        enhanceRecycling: true,
      });

      expect(result.transformedData[0]).toHaveProperty('_masonrySpan');
      expect(result.stats.masonryOptimizations).toBeGreaterThan(0);
    });

    it('should preserve original data structure while adding optimizations', () => {
      const result = applyV2DataTransformations(mockMessageData, {
        enableAutoSizing: true,
        preserveOriginal: true,
      });

      result.transformedData.forEach((item, index) => {
        expect(item.id).toBe(mockMessageData[index].id);
        expect(item.content).toBe(mockMessageData[index].content);
        expect(item.type).toBe(mockMessageData[index].type);
      });
    });
  });

  describe('Masonry Dataset Optimization', () => {
    it('should optimize dataset specifically for masonry layouts', () => {
      const result = optimizeMasonryDataset(mockMessageData, {
        numColumns: 2,
        enableAutoSizing: true,
        optimizeSpanDistribution: true,
      });

      expect(result.optimizedData).toHaveLength(mockMessageData.length);
      expect(result.optimizedData[0]).toHaveProperty('_masonrySpan');
      expect(result.stats.spanDistribution).toBeDefined();
      expect(result.stats.columnBalance).toBeGreaterThan(0);
    });

    it('should handle different column configurations', () => {
      const twoColumnResult = optimizeMasonryDataset(mockMessageData, {
        numColumns: 2,
        enableAutoSizing: true,
      });

      const threeColumnResult = optimizeMasonryDataset(mockMessageData, {
        numColumns: 3,
        enableAutoSizing: true,
      });

      expect(twoColumnResult.stats.numColumns).toBe(2);
      expect(threeColumnResult.stats.numColumns).toBe(3);
      expect(twoColumnResult.stats.spanDistribution).not.toEqual(
        threeColumnResult.stats.spanDistribution
      );
    });

    it('should create v2 masonry layout override function', () => {
      const overrideLayout = createV2MasonryLayoutOverride<MessageListItem>();
      
      const mockLayout = { span: 1 };
      const mockItem = mockMessageData[0];
      
      overrideLayout(mockLayout, mockItem);
      
      // Should modify layout based on item metadata
      expect(mockLayout.span).toBeDefined();
      expect(typeof mockLayout.span).toBe('number');
    });
  });

  describe('V2 Dataset Statistics', () => {
    it('should generate comprehensive dataset statistics', () => {
      const stats = getV2DatasetStats(mockMessageData);
      
      expect(stats.totalItems).toBe(mockMessageData.length);
      expect(stats.itemTypeDistribution).toBeDefined();
      expect(stats.complexityDistribution).toBeDefined();
      expect(stats.v2OptimizationScore).toBeGreaterThan(0);
    });

    it('should handle empty dataset statistics', () => {
      const stats = getV2DatasetStats([]);
      
      expect(stats.totalItems).toBe(0);
      expect(stats.itemTypeDistribution).toEqual({});
      expect(stats.v2OptimizationScore).toBe(100); // Perfect score for empty dataset
    });

    it('should calculate optimization scores based on v2 metadata', () => {
      const dataWithGoodMetadata = mockMessageData.map(item => ({
        ...item,
        _v2Metadata: {
          ...item._v2Metadata!,
          v2Optimizations: {
            enableAutoSizing: true,
            preferredRecyclingPool: 'optimized',
            layoutComplexity: 'simple',
            requiresDynamicSizing: false,
          },
        },
      }));

      const stats = getV2DatasetStats(dataWithGoodMetadata);
      expect(stats.v2OptimizationScore).toBeGreaterThan(80);
    });
  });

  describe('Type Safety and Configuration', () => {
    it('should maintain type safety for configuration objects', () => {
      const config: FlashListV2PerformanceConfig = {
        enableAutoSizing: true,
        maintainVisibleContentPosition: {
          autoscrollToBottomThreshold: 0.2,
          startRenderingFromBottom: true,
        },
        cacheStrategy: 'hybrid',
        maxMemoryUsage: 35,
      };

      // This should compile without TypeScript errors
      expect(typeof config.enableAutoSizing).toBe('boolean');
      expect(typeof config.maxMemoryUsage).toBe('number');
      expect(config.cacheStrategy).toMatch(/^(memory|hybrid|minimal)$/);
    });

    it('should handle MessageListItem interface correctly', () => {
      const item: MessageListItem = {
        id: 'test-id',
        timestamp: Date.now(),
        type: 'message',
        content: 'Test content',
      };

      expect(item.id).toBe('test-id');
      expect(item.type).toBe('message');
      expect(typeof item.timestamp).toBe('number');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty datasets gracefully', () => {
      const result = optimizeV2Dataset([], {
        enableAutoSizing: true,
      });

      expect(result.optimizedData).toHaveLength(0);
      expect(result.stats.totalItems).toBe(0);
    });

    it('should handle items without v2 metadata', () => {
      const itemsWithoutMetadata: MessageListItem[] = [
        {
          id: '1',
          timestamp: Date.now(),
          type: 'message',
          content: 'Simple message',
        },
      ];

      const result = optimizeV2Dataset(itemsWithoutMetadata, {
        enableAutoSizing: true,
      });

      expect(result.optimizedData).toHaveLength(1);
      expect(result.stats.totalItems).toBe(1);
    });

    it('should handle malformed data gracefully', () => {
      const malformedData = [
        {
          id: '1',
          timestamp: Date.now(),
          type: 'message',
          // Missing required content field
        } as MessageListItem,
      ];

      expect(() => {
        optimizeV2Dataset(malformedData, {
          enableAutoSizing: true,
        });
      }).not.toThrow();
    });
  });
});