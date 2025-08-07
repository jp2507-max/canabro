/**
 * FlashList v2 Dataset Optimization Tests
 * Tests for updated dataset optimization utilities without size estimation
 */

import {
  optimizeV2Dataset,
  optimizeDataset,
  optimizeMasonryDataset,
  generateV2ItemType,
  applyV2DataTransformations,
  createV2MasonryLayoutOverride,
  getV2DatasetStats,
  type MessageListItem,
} from '../flashlist-performance';

// Mock logger to avoid console output during tests
jest.mock('../logger', () => ({
  log: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('FlashList v2 Dataset Optimization', () => {
  const mockData: MessageListItem[] = [
    {
      id: '1',
      timestamp: Date.now(),
      type: 'message',
      content: 'Short message',
    },
    {
      id: '2',
      timestamp: Date.now(),
      type: 'message',
      content: 'This is a much longer message that should be classified as high complexity due to its length and potential for dynamic content wrapping across multiple lines in the UI.',
      attachments: [{ type: 'image', url: 'test.jpg' }],
      reactions: ['👍', '❤️', '😂'],
    },
    {
      id: '3',
      timestamp: Date.now(),
      type: 'system',
      content: 'System notification',
    },
    {
      id: '4',
      timestamp: Date.now(),
      type: 'message',
      attachments: [
        { type: 'image', url: 'test1.jpg' },
        { type: 'image', url: 'test2.jpg' },
        { type: 'video', url: 'test.mp4' },
      ],
    },
    {
      id: '5',
      timestamp: Date.now(),
      type: 'notification',
      content: 'Push notification',
    },
  ];

  describe('optimizeV2Dataset', () => {
    it('should optimize dataset without size estimation', () => {
      const result = optimizeV2Dataset(mockData, {
        enableContentAnalysis: true,
        enableItemTypeOptimization: true,
        enableRecyclingOptimization: true,
      });

      expect(result).toHaveLength(mockData.length);
      
      // Check that v2 metadata is added
      result.forEach(item => {
        expect(item._v2Metadata).toBeDefined();
        expect(item._v2Metadata?.autoSizingHints).toBeDefined();
        expect(item._v2Metadata?.v2Optimizations).toBeDefined();
      });
    });

    it('should filter duplicates correctly', () => {
      const dataWithDuplicates = [
        ...mockData,
        { ...mockData[0] }, // Duplicate
      ];

      const result = optimizeV2Dataset(dataWithDuplicates, {
        filterDuplicates: true,
      });

      expect(result).toHaveLength(mockData.length);
    });

    it('should sort data correctly', () => {
      const result = optimizeV2Dataset(mockData, {
        sortBy: 'timestamp',
        sortOrder: 'desc',
      });

      expect(result).toHaveLength(mockData.length);
      // Verify sorting (timestamps should be in descending order)
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].timestamp).toBeGreaterThanOrEqual(result[i].timestamp);
      }
    });

    it('should limit dataset size', () => {
      const result = optimizeV2Dataset(mockData, {
        maxItems: 3,
      });

      expect(result).toHaveLength(3);
    });

    it('should optimize for masonry layout', () => {
      const result = optimizeV2Dataset(mockData, {
        enableContentAnalysis: true,
        masonryOptimization: true,
        optimizeItemArrangement: true,
      });

      expect(result).toHaveLength(mockData.length);
      
      // Check that items with media have masonry spans
      const mediaItems = result.filter(item => 
        item._v2Metadata?.hasMedia
      );
      
      mediaItems.forEach(item => {
        expect(item._v2Metadata?.autoSizingHints?.masonrySpan).toBeDefined();
      });
    });
  });

  describe('optimizeDataset (legacy)', () => {
    it('should show deprecation warnings for size estimation options', () => {
      const { log } = require('../logger');
      
      optimizeDataset(mockData, {
        estimateItemSizes: true,
        enableItemSizeEstimation: true,
      });

      expect(log.warn).toHaveBeenCalledWith(
        expect.stringContaining('estimateItemSizes option is deprecated'),
        expect.any(Object)
      );
      
      expect(log.warn).toHaveBeenCalledWith(
        expect.stringContaining('enableItemSizeEstimation option is deprecated'),
        expect.any(Object)
      );
    });

    it('should delegate to optimizeV2Dataset', () => {
      const result = optimizeDataset(mockData, {
        maxItems: 3,
        filterDuplicates: true,
      });

      expect(result).toHaveLength(3);
      expect(result[0]._v2Metadata).toBeDefined();
    });
  });

  describe('optimizeMasonryDataset', () => {
    it('should optimize dataset for masonry layout', () => {
      const result = optimizeMasonryDataset(mockData, {
        numColumns: 3,
        enableItemArrangement: true,
        balanceColumns: true,
        maxSpan: 2,
      });

      expect(result).toHaveLength(mockData.length);
      
      // Check masonry-specific optimizations
      result.forEach(item => {
        expect(item._v2Metadata).toBeDefined();
        expect(item._masonrySpan).toBeDefined();
        expect(item._v2OptimizedKey).toBeDefined();
        
        // Verify span constraints
        if (item._v2Metadata?.autoSizingHints?.masonrySpan) {
          expect(item._v2Metadata.autoSizingHints.masonrySpan).toBeLessThanOrEqual(2);
        }
      });
    });
  });

  describe('generateV2ItemType', () => {
    it('should generate correct item types', () => {
      const getItemType = generateV2ItemType<MessageListItem>();

      // Test system message
      expect(getItemType(mockData[2], 0)).toBe('system');
      
      // Test notification
      expect(getItemType(mockData[4], 0)).toBe('notification');
      
      // Test message with attachments and reactions
      expect(getItemType(mockData[1], 0)).toBe('media_with_reactions');
      
      // Test media-only message
      expect(getItemType(mockData[3], 0)).toBe('media_message');
    });

    it('should use v2 metadata when available', () => {
      const getItemType = generateV2ItemType<MessageListItem>();
      const itemWithMetadata = {
        ...mockData[0],
        _v2Metadata: {
          complexity: 'low' as const,
          hasMedia: false,
          hasInteractions: false,
          autoSizingHints: {
            contentType: 'text' as const,
            dynamicContent: false,
            recyclingType: 'standard',
            itemTypeHint: 'custom_type',
          },
          v2Optimizations: {
            enableAutoSizing: true,
            preferredRecyclingPool: 'text',
            layoutComplexity: 'simple' as const,
            requiresDynamicSizing: false,
          },
        },
      };

      expect(getItemType(itemWithMetadata, 0)).toBe('custom_type');
    });
  });

  describe('applyV2DataTransformations', () => {
    it('should apply content preprocessing', () => {
      const result = applyV2DataTransformations(mockData, {
        enableContentPreprocessing: true,
      });

      result.forEach(item => {
        if (item.content) {
          expect(item._v2ContentHints).toBeDefined();
          expect(item._v2ContentHints?.wordCount).toBeGreaterThan(0);
          expect(typeof item._v2ContentHints?.hasLineBreaks).toBe('boolean');
          expect(item._v2ContentHints?.estimatedLines).toBeGreaterThan(0);
        }
      });
    });

    it('should apply key optimization', () => {
      const result = applyV2DataTransformations(mockData, {
        enableKeyOptimization: true,
      });

      result.forEach((item, index) => {
        expect(item._v2OptimizedKey).toBe(`${item.id}_${item.type}_${index}`);
      });
    });

    it('should apply masonry transformations', () => {
      const result = applyV2DataTransformations(mockData, {
        masonryColumns: 3,
      });

      result.forEach(item => {
        expect(item._masonrySpan).toBeDefined();
        expect(item._masonrySpan).toBeGreaterThanOrEqual(1);
        expect(item._masonrySpan).toBeLessThanOrEqual(3);
      });
    });
  });

  describe('createV2MasonryLayoutOverride', () => {
    it('should create layout override function', () => {
      const overrideLayout = createV2MasonryLayoutOverride<MessageListItem>();
      const layout = { span: undefined };
      
      const itemWithSpan = {
        ...mockData[0],
        _masonrySpan: 2,
      };

      overrideLayout(layout, itemWithSpan);
      expect(layout.span).toBe(2);
    });

    it('should use v2 metadata span when _masonrySpan is not available', () => {
      const overrideLayout = createV2MasonryLayoutOverride<MessageListItem>();
      const layout = { span: undefined };
      
      const itemWithMetadata = {
        ...mockData[0],
        _v2Metadata: {
          complexity: 'low' as const,
          hasMedia: false,
          hasInteractions: false,
          autoSizingHints: {
            contentType: 'text' as const,
            dynamicContent: false,
            masonrySpan: 3,
            recyclingType: 'standard',
            itemTypeHint: 'message',
          },
          v2Optimizations: {
            enableAutoSizing: true,
            preferredRecyclingPool: 'text',
            layoutComplexity: 'simple' as const,
            requiresDynamicSizing: false,
          },
        },
      };

      overrideLayout(layout, itemWithMetadata);
      expect(layout.span).toBe(3);
    });

    it('should default to span 1', () => {
      const overrideLayout = createV2MasonryLayoutOverride<MessageListItem>();
      const layout = { span: undefined };

      overrideLayout(layout, mockData[0]);
      expect(layout.span).toBe(1);
    });
  });

  describe('getV2DatasetStats', () => {
    it('should generate comprehensive dataset statistics', () => {
      const optimizedData = optimizeV2Dataset(mockData, {
        enableContentAnalysis: true,
        enableItemTypeOptimization: true,
        enableRecyclingOptimization: true,
        masonryOptimization: true,
      });

      const stats = getV2DatasetStats(optimizedData);

      expect(stats.totalItems).toBe(mockData.length);
      expect(stats.itemTypeDistribution).toBeDefined();
      expect(stats.recyclingPoolDistribution).toBeDefined();
      expect(stats.complexityDistribution).toBeDefined();
      expect(stats.masonrySpanDistribution).toBeDefined();
      expect(stats.optimizationCoverage).toBeDefined();

      // Verify optimization coverage
      expect(stats.optimizationCoverage.withV2Metadata).toBe(mockData.length);
      expect(stats.optimizationCoverage.withV2Metadata).toBeGreaterThan(0);
    });

    it('should track item type distribution correctly', () => {
      const optimizedData = optimizeV2Dataset(mockData, {
        enableContentAnalysis: true,
      });

      const stats = getV2DatasetStats(optimizedData);

      expect(stats.itemTypeDistribution.system).toBe(1);
      expect(stats.itemTypeDistribution.notification).toBe(1);
      expect(Object.keys(stats.itemTypeDistribution)).toContain('system');
      expect(Object.keys(stats.itemTypeDistribution)).toContain('notification');
    });
  });

  describe('Content Analysis', () => {
    it('should correctly analyze item complexity', () => {
      const result = optimizeV2Dataset(mockData, {
        enableContentAnalysis: true,
      });

      // Short message should be low complexity
      expect(result[0]._v2Metadata?.complexity).toBe('low');
      
      // Long message with attachments should be high complexity
      expect(result[1]._v2Metadata?.complexity).toBe('high');
      
      // System message should be low complexity
      expect(result[2]._v2Metadata?.complexity).toBe('low');
    });

    it('should detect media and interactions correctly', () => {
      const result = optimizeV2Dataset(mockData, {
        enableContentAnalysis: true,
      });

      // Item with attachments should have hasMedia = true
      const mediaItem = result.find(item => item.attachments && item.attachments.length > 0);
      expect(mediaItem?._v2Metadata?.hasMedia).toBe(true);

      // Item with reactions should have hasInteractions = true
      const interactiveItem = result.find(item => item.reactions && item.reactions.length > 0);
      expect(interactiveItem?._v2Metadata?.hasInteractions).toBe(true);
    });

    it('should assign correct recycling pools', () => {
      const result = optimizeV2Dataset(mockData, {
        enableContentAnalysis: true,
        enableRecyclingOptimization: true,
      });

      // System items should use system pool
      const systemItem = result.find(item => item.type === 'system');
      expect(systemItem?._v2Metadata?.v2Optimizations?.preferredRecyclingPool).toBe('system');

      // Media items should use appropriate pools
      const mediaItem = result.find(item => item._v2Metadata?.hasMedia);
      expect(mediaItem?._v2Metadata?.v2Optimizations?.preferredRecyclingPool).toMatch(/media|complex_interactive/);
    });
  });
});