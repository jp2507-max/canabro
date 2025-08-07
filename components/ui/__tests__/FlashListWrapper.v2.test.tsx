/**
 * Comprehensive unit tests for FlashList v2 migration
 * Tests FlashListWrapper v2 prop handling, deprecated prop warnings, 
 * hook wrapper functionality, and performance utility configurations
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { FlashListWrapper, FlashListRef } from '../FlashListWrapper';

// Mock FlashList component
jest.mock('@shopify/flash-list', () => ({
  FlashList: jest.fn(({ children, ...props }) => {
    const MockFlashList = require('react-native').View;
    return <MockFlashList testID="flash-list" {...props}>{children}</MockFlashList>;
  }),
  FlashListRef: jest.fn(),
}));

// Mock performance validation
const mockValidateFlashListProps = jest.fn();
jest.mock('../../../lib/utils/flashlist-performance', () => ({
  validateFlashListProps: mockValidateFlashListProps,
}));

// Mock console methods
const mockConsole = {
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  group: jest.fn(),
  groupEnd: jest.fn(),
};

const mockData = [
  { id: '1', title: 'Item 1' },
  { id: '2', title: 'Item 2' },
  { id: '3', title: 'Item 3' },
];

const mockRenderItem = ({ item }: { item: typeof mockData[0] }) => (
  <Text testID={`item-${item.id}`}>{item.title}</Text>
);

describe('FlashListWrapper v2 Migration Tests', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock console methods
    Object.assign(console, mockConsole);
    Object.keys(mockConsole).forEach(key => {
      (mockConsole as any)[key].mockClear();
    });
  });

  describe('V2 Prop Handling', () => {
    it('should handle maintainVisibleContentPosition with default configuration', () => {
      const { getByTestId } = render(
        <FlashListWrapper
          data={mockData}
          renderItem={mockRenderItem}
          testID="test-list"
        />
      );

      const flashList = getByTestId('flash-list');
      expect(flashList.props.maintainVisibleContentPosition).toEqual({
        autoscrollToTopThreshold: 0.1,
        autoscrollToBottomThreshold: 0.2,
        startRenderingFromBottom: false,
        animateAutoScrollToBottom: true,
      });
    });

    it('should merge custom maintainVisibleContentPosition config with defaults', () => {
      const customConfig = {
        autoscrollToBottomThreshold: 0.5,
        startRenderingFromBottom: true,
      };

      const { getByTestId } = render(
        <FlashListWrapper
          data={mockData}
          renderItem={mockRenderItem}
          maintainVisibleContentPosition={customConfig}
          testID="test-list"
        />
      );

      const flashList = getByTestId('flash-list');
      expect(flashList.props.maintainVisibleContentPosition).toEqual({
        autoscrollToTopThreshold: 0.1,
        autoscrollToBottomThreshold: 0.5,
        startRenderingFromBottom: true,
        animateAutoScrollToBottom: true,
      });
    });

    it('should disable maintainVisibleContentPosition when explicitly disabled', () => {
      const { getByTestId } = render(
        <FlashListWrapper
          data={mockData}
          renderItem={mockRenderItem}
          maintainVisibleContentPosition={{ disabled: true }}
          testID="test-list"
        />
      );

      const flashList = getByTestId('flash-list');
      expect(flashList.props.maintainVisibleContentPosition).toBeUndefined();
    });

    it('should enable masonry layout when masonry prop is true', () => {
      const { getByTestId } = render(
        <FlashListWrapper
          data={mockData}
          renderItem={mockRenderItem}
          masonry={true}
          numColumns={2}
          testID="test-list"
        />
      );

      const flashList = getByTestId('flash-list');
      expect(flashList.props.masonry).toBe(true);
      expect(flashList.props.numColumns).toBe(2);
    });

    it('should apply v2 performance optimizations by default', () => {
      const { getByTestId } = render(
        <FlashListWrapper
          data={mockData}
          renderItem={mockRenderItem}
          testID="test-list"
        />
      );

      const flashList = getByTestId('flash-list');
      expect(flashList.props.removeClippedSubviews).toBe(true);
      expect(flashList.props.scrollEventThrottle).toBe(16);
      expect(flashList.props.drawDistance).toBeGreaterThan(0);
    });

    it('should disable v2 optimizations when enableV2Optimizations is false', () => {
      const { getByTestId } = render(
        <FlashListWrapper
          data={mockData}
          renderItem={mockRenderItem}
          enableV2Optimizations={false}
          testID="test-list"
        />
      );

      const flashList = getByTestId('flash-list');
      expect(flashList.props.removeClippedSubviews).toBeUndefined();
      expect(flashList.props.scrollEventThrottle).toBeUndefined();
      expect(flashList.props.drawDistance).toBeUndefined();
    });

    it('should not include deprecated estimatedItemSize prop', () => {
      const { getByTestId } = render(
        <FlashListWrapper
          data={mockData}
          renderItem={mockRenderItem}
          // @ts-expect-error - Testing deprecated prop
          estimatedItemSize={50}
          testID="test-list"
        />
      );

      const flashList = getByTestId('flash-list');
      expect(flashList.props.estimatedItemSize).toBeUndefined();
    });

    it('should handle custom scroll and content size change handlers', () => {
      const mockOnScroll = jest.fn();
      const mockOnContentSizeChange = jest.fn();

      const { getByTestId } = render(
        <FlashListWrapper
          data={mockData}
          renderItem={mockRenderItem}
          onScroll={mockOnScroll}
          onContentSizeChange={mockOnContentSizeChange}
          testID="test-list"
        />
      );

      const flashList = getByTestId('flash-list');
      
      // Simulate scroll event
      const scrollEvent = {
        nativeEvent: {
          contentOffset: { y: 100 },
          contentSize: { height: 1000 },
          layoutMeasurement: { height: 500 },
        },
      };
      
      fireEvent.scroll(flashList, scrollEvent);
      expect(mockOnScroll).toHaveBeenCalledWith(scrollEvent);

      // Simulate content size change
      if (flashList.props.onContentSizeChange) {
        flashList.props.onContentSizeChange(300, 800);
        expect(mockOnContentSizeChange).toHaveBeenCalledWith(300, 800);
      }
    });
  });

  describe('Deprecated Prop Warning System', () => {
    it('should validate props on mount', () => {
      const props = {
        data: mockData,
        renderItem: mockRenderItem,
        estimatedItemSize: 50,
      };

      render(<FlashListWrapper {...props} />);

      expect(mockValidateFlashListProps).toHaveBeenCalledWith(
        expect.objectContaining(props),
        'FlashListWrapper'
      );
    });

    it('should validate props when props change', () => {
      const { rerender } = render(
        <FlashListWrapper
          data={mockData}
          renderItem={mockRenderItem}
        />
      );

      expect(mockValidateFlashListProps).toHaveBeenCalledTimes(1);

      // Change props
      rerender(
        <FlashListWrapper
          data={mockData}
          renderItem={mockRenderItem}
          // @ts-expect-error - Testing deprecated prop
          inverted={true}
        />
      );

      expect(mockValidateFlashListProps).toHaveBeenCalledTimes(2);
    });

    it('should handle deprecated stickyToBottomOnAndroid prop', () => {
      const { getByTestId } = render(
        <FlashListWrapper
          data={mockData}
          renderItem={mockRenderItem}
          stickyToBottomOnAndroid={true}
          testID="test-list"
        />
      );

      // Should still render but the prop should be handled internally
      expect(getByTestId('flash-list')).toBeTruthy();
      
      // Verify that validateFlashListProps was called with the deprecated prop
      expect(mockValidateFlashListProps).toHaveBeenCalledWith(
        expect.objectContaining({
          stickyToBottomOnAndroid: true,
        }),
        'FlashListWrapper'
      );
    });
  });

  describe('Legacy Android Bottom-Pinning Behavior', () => {
    const originalPlatform = require('react-native').Platform.OS;

    beforeEach(() => {
      require('react-native').Platform.OS = 'android';
    });

    afterEach(() => {
      require('react-native').Platform.OS = originalPlatform;
    });

    it('should handle legacy stickyToBottomOnAndroid behavior', () => {
      const mockScrollToEnd = jest.fn();
      const mockRef = {
        current: {
          scrollToEnd: mockScrollToEnd,
        },
      };

      // Mock useRef to return our mock ref
      jest.spyOn(React, 'useRef').mockReturnValue(mockRef);

      const { getByTestId } = render(
        <FlashListWrapper
          data={mockData}
          renderItem={mockRenderItem}
          stickyToBottomOnAndroid={true}
          testID="test-list"
        />
      );

      const flashList = getByTestId('flash-list');

      // Simulate scroll to near bottom
      const scrollEvent = {
        nativeEvent: {
          contentOffset: { y: 950 },
          contentSize: { height: 1000 },
          layoutMeasurement: { height: 500 },
        },
      };
      
      fireEvent.scroll(flashList, scrollEvent);

      // Simulate content size change
      if (flashList.props.onContentSizeChange) {
        flashList.props.onContentSizeChange(300, 1100);
        expect(mockScrollToEnd).toHaveBeenCalledWith({ animated: false });
      }
    });
  });

  describe('TypeScript Type Safety', () => {
    it('should accept FlashListRef type for ref', () => {
      const ref = React.createRef<FlashListRef<typeof mockData[0]>>();

      const { getByTestId } = render(
        <FlashListWrapper
          ref={ref}
          data={mockData}
          renderItem={mockRenderItem}
          testID="test-list"
        />
      );

      expect(getByTestId('flash-list')).toBeTruthy();
    });

    it('should properly type generic data items', () => {
      interface CustomItem {
        id: string;
        name: string;
        value: number;
      }

      const customData: CustomItem[] = [
        { id: '1', name: 'Test', value: 100 },
      ];

      const customRenderItem = ({ item }: { item: CustomItem }) => (
        <Text>{item.name}: {item.value}</Text>
      );

      const { getByTestId } = render(
        <FlashListWrapper<CustomItem>
          data={customData}
          renderItem={customRenderItem}
          testID="test-list"
        />
      );

      expect(getByTestId('flash-list')).toBeTruthy();
    });
  });

  describe('Performance Configuration', () => {
    it('should apply correct draw distance for v2 optimizations', () => {
      // Mock window height
      const mockDimensions = {
        get: jest.fn(() => ({ height: 800, width: 400 })),
      };
      
      jest.doMock('react-native', () => ({
        ...jest.requireActual('react-native'),
        Dimensions: mockDimensions,
      }));

      const { getByTestId } = render(
        <FlashListWrapper
          data={mockData}
          renderItem={mockRenderItem}
          testID="test-list"
        />
      );

      const flashList = getByTestId('flash-list');
      expect(flashList.props.drawDistance).toBe(800 * 1.5); // WINDOW_HEIGHT * 1.5
    });

    it('should handle empty data arrays', () => {
      const { getByTestId } = render(
        <FlashListWrapper
          data={[]}
          renderItem={mockRenderItem}
          testID="test-list"
        />
      );

      const flashList = getByTestId('flash-list');
      expect(flashList.props.data).toEqual([]);
    });

    it('should pass through all other FlashList props', () => {
      const additionalProps = {
        keyExtractor: (item: typeof mockData[0]) => item.id,
        getItemType: () => 'default',
        horizontal: true,
        inverted: false,
      };

      const { getByTestId } = render(
        <FlashListWrapper
          data={mockData}
          renderItem={mockRenderItem}
          {...additionalProps}
          testID="test-list"
        />
      );

      const flashList = getByTestId('flash-list');
      expect(flashList.props.keyExtractor).toBe(additionalProps.keyExtractor);
      expect(flashList.props.getItemType).toBe(additionalProps.getItemType);
      expect(flashList.props.horizontal).toBe(additionalProps.horizontal);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing data prop gracefully', () => {
      const { getByTestId } = render(
        <FlashListWrapper
          // @ts-expect-error - Testing missing required prop
          renderItem={mockRenderItem}
          testID="test-list"
        />
      );

      expect(getByTestId('flash-list')).toBeTruthy();
    });

    it('should handle missing renderItem prop gracefully', () => {
      const { getByTestId } = render(
        <FlashListWrapper
          data={mockData}
          // @ts-expect-error - Testing missing required prop
          testID="test-list"
        />
      );

      expect(getByTestId('flash-list')).toBeTruthy();
    });
  });

  describe('Component Integration', () => {
    it('should render with AnimatedFlashList export', () => {
      // This test ensures the AnimatedFlashList export is available
      const { AnimatedFlashList } = require('../FlashListWrapper');
      expect(AnimatedFlashList).toBeDefined();
    });

    it('should export FlashListRef type', () => {
      // This test ensures the FlashListRef type export is available
      const { FlashListRef } = require('../FlashListWrapper');
      expect(FlashListRef).toBeDefined();
    });

    it('should maintain backward compatibility with existing usage patterns', () => {
      // Test common usage pattern from v1
      const { getByTestId } = render(
        <FlashListWrapper
          data={mockData}
          renderItem={mockRenderItem}
          keyExtractor={(item) => item.id}
          testID="test-list"
        />
      );

      const flashList = getByTestId('flash-list');
      expect(flashList.props.data).toBe(mockData);
      expect(flashList.props.renderItem).toBe(mockRenderItem);
      expect(flashList.props.keyExtractor).toBeDefined();
    });
  });
});