/**
 * Integration tests for FlashList v2 hook wrappers
 * Tests the integration between useFlashListV2State, useFlashListLayout, 
 * and their interaction with FlashListWrapper component
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Text, Pressable, View } from 'react-native';
import {
  useFlashListV2State,
  useFlashListLayout,
  useFlashListCombinedState,
  useFlashListItemState,
} from '../flashlist-v2-hooks';
import { FlashListWrapper } from '../../../components/ui/FlashListWrapper';

// Mock FlashList hooks
jest.mock('@shopify/flash-list', () => ({
  FlashList: jest.fn(({ children, ...props }) => {
    const MockFlashList = require('react-native').View;
    return <MockFlashList testID="flash-list" {...props}>{children}</MockFlashList>;
  }),
  useRecyclingState: jest.fn(),
  useLayoutState: jest.fn(),
}));

import { useRecyclingState, useLayoutState } from '@shopify/flash-list';

const mockUseRecyclingState = useRecyclingState as jest.MockedFunction<typeof useRecyclingState>;
const mockUseLayoutState = useLayoutState as jest.MockedFunction<typeof useLayoutState>;

// Test components using the hooks
const TestItemWithV2State: React.FC<{ item: { id: string; title: string } }> = ({ item }) => {
  const [isExpanded, setIsExpanded] = useFlashListV2State({
    initialState: false,
    dependencies: [item.id],
    debug: true,
  });

  return (
    <Pressable
      testID={`item-${item.id}`}
      onPress={() => setIsExpanded(!isExpanded)}
    >
      <View style={{ height: isExpanded ? 100 : 50 }}>
        <Text testID={`title-${item.id}`}>{item.title}</Text>
        <Text testID={`status-${item.id}`}>{isExpanded ? 'Expanded' : 'Collapsed'}</Text>
      </View>
    </Pressable>
  );
};

const TestItemWithLayoutState: React.FC<{ item: { id: string; title: string } }> = ({ item }) => {
  const [height, setHeight] = useFlashListLayout({
    initialState: 50,
    debug: true,
  });

  return (
    <Pressable
      testID={`layout-item-${item.id}`}
      onPress={() => setHeight(height === 50 ? 100 : 50)}
    >
      <View style={{ height }}>
        <Text testID={`layout-title-${item.id}`}>{item.title}</Text>
        <Text testID={`layout-height-${item.id}`}>Height: {height}</Text>
      </View>
    </Pressable>
  );
};

const TestItemWithCombinedState: React.FC<{ item: { id: string; title: string } }> = ({ item }) => {
  const { recycling, layout } = useFlashListCombinedState(
    {
      initialState: { selected: false },
      dependencies: [item.id],
    },
    {
      initialState: 60,
    }
  );

  const [state, setState] = recycling;
  const [height, setHeight] = layout;

  return (
    <Pressable
      testID={`combined-item-${item.id}`}
      onPress={() => {
        setState({ selected: !state.selected });
        setHeight(state.selected ? 60 : 80);
      }}
    >
      <View style={{ height }}>
        <Text testID={`combined-title-${item.id}`}>{item.title}</Text>
        <Text testID={`combined-status-${item.id}`}>
          {state.selected ? 'Selected' : 'Not Selected'}
        </Text>
      </View>
    </Pressable>
  );
};

const TestItemWithItemState: React.FC<{ item: { id: string; title: string; version?: number } }> = ({ item }) => {
  const [state, setState, resetState] = useFlashListItemState(
    item,
    (item) => ({ expanded: false, lastInteraction: Date.now() }),
    {
      customDependencies: ['external-dep'],
      debug: true,
    }
  );

  return (
    <View testID={`item-state-${item.id}`}>
      <Pressable
        testID={`toggle-${item.id}`}
        onPress={() => setState(prev => ({ ...prev, expanded: !prev.expanded }))}
      >
        <Text testID={`item-title-${item.id}`}>{item.title}</Text>
        <Text testID={`item-expanded-${item.id}`}>
          {state.expanded ? 'Expanded' : 'Collapsed'}
        </Text>
      </Pressable>
      <Pressable
        testID={`reset-${item.id}`}
        onPress={resetState}
      >
        <Text>Reset</Text>
      </Pressable>
    </View>
  );
};

describe('FlashList v2 Hook Integration Tests', () => {
  const mockData = [
    { id: '1', title: 'Item 1' },
    { id: '2', title: 'Item 2' },
    { id: '3', title: 'Item 3' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('useFlashListV2State Integration', () => {
    it('should integrate with FlashListWrapper and handle state changes', () => {
      const mockSetState = jest.fn();
      mockUseRecyclingState.mockReturnValue([false, mockSetState]);

      const renderItem = ({ item }: { item: typeof mockData[0] }) => (
        <TestItemWithV2State item={item} />
      );

      const { getByTestId } = render(
        <FlashListWrapper
          data={mockData}
          renderItem={renderItem}
          testID="test-list"
        />
      );

      // Verify the list renders
      expect(getByTestId('flash-list')).toBeTruthy();

      // Verify useRecyclingState was called with correct parameters
      expect(mockUseRecyclingState).toHaveBeenCalledWith(
        false,
        ['1'], // First item's dependencies
        expect.any(Function)
      );
    });

    it('should handle state updates and debug logging', () => {
      let capturedSetState: any;
      const mockSetState = jest.fn((newState) => {
        if (typeof newState === 'function') {
          capturedSetState = newState;
        }
      });
      
      mockUseRecyclingState.mockReturnValue([false, mockSetState]);

      const renderItem = ({ item }: { item: typeof mockData[0] }) => (
        <TestItemWithV2State item={item} />
      );

      const { getByTestId } = render(
        <FlashListWrapper
          data={[mockData[0]]}
          renderItem={renderItem}
          testID="test-list"
        />
      );

      const itemButton = getByTestId('item-1');
      
      act(() => {
        fireEvent.press(itemButton);
      });

      expect(mockSetState).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        '[FlashListV2State] State update',
        expect.objectContaining({
          newValue: expect.any(Boolean),
          dependencies: ['1'],
        })
      );
    });

    it('should handle dependency changes and reset callbacks', () => {
      const resetCallback = jest.fn();
      let capturedResetCallback: (() => void) | undefined;

      mockUseRecyclingState.mockImplementation((initialState, deps, callback) => {
        capturedResetCallback = callback;
        return [initialState, jest.fn()];
      });

      const TestComponent = () => {
        const [state] = useFlashListV2State({
          initialState: false,
          dependencies: ['test-dep'],
          resetCallback,
          debug: true,
        });

        return <Text testID="test-text">{state ? 'True' : 'False'}</Text>;
      };

      render(<TestComponent />);

      // Simulate dependency change triggering reset
      act(() => {
        capturedResetCallback?.();
      });

      expect(resetCallback).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        '[FlashListV2State] State reset triggered',
        expect.objectContaining({
          dependencies: ['test-dep'],
        })
      );
    });
  });

  describe('useFlashListLayout Integration', () => {
    it('should integrate with FlashListWrapper for layout state management', () => {
      const mockSetState = jest.fn();
      mockUseLayoutState.mockReturnValue([50, mockSetState]);

      const renderItem = ({ item }: { item: typeof mockData[0] }) => (
        <TestItemWithLayoutState item={item} />
      );

      const { getByTestId } = render(
        <FlashListWrapper
          data={[mockData[0]]}
          renderItem={renderItem}
          testID="test-list"
        />
      );

      expect(getByTestId('flash-list')).toBeTruthy();
      expect(mockUseLayoutState).toHaveBeenCalledWith(50);

      const layoutItem = getByTestId('layout-item-1');
      
      act(() => {
        fireEvent.press(layoutItem);
      });

      expect(mockSetState).toHaveBeenCalled();
    });

    it('should handle layout state updates with debug logging', () => {
      const mockSetState = jest.fn();
      mockUseLayoutState.mockReturnValue([50, mockSetState]);

      const renderItem = ({ item }: { item: typeof mockData[0] }) => (
        <TestItemWithLayoutState item={item} />
      );

      const { getByTestId } = render(
        <FlashListWrapper
          data={[mockData[0]]}
          renderItem={renderItem}
          testID="test-list"
        />
      );

      const layoutItem = getByTestId('layout-item-1');
      
      act(() => {
        fireEvent.press(layoutItem);
      });

      expect(console.log).toHaveBeenCalledWith(
        '[FlashListLayout] Layout state update',
        expect.objectContaining({
          newValue: expect.any(Number),
        })
      );
    });
  });

  describe('useFlashListCombinedState Integration', () => {
    it('should manage both recycling and layout state simultaneously', () => {
      const mockRecyclingSetState = jest.fn();
      const mockLayoutSetState = jest.fn();
      
      mockUseRecyclingState.mockReturnValue([{ selected: false }, mockRecyclingSetState]);
      mockUseLayoutState.mockReturnValue([60, mockLayoutSetState]);

      const renderItem = ({ item }: { item: typeof mockData[0] }) => (
        <TestItemWithCombinedState item={item} />
      );

      const { getByTestId } = render(
        <FlashListWrapper
          data={[mockData[0]]}
          renderItem={renderItem}
          testID="test-list"
        />
      );

      expect(mockUseRecyclingState).toHaveBeenCalledWith(
        { selected: false },
        ['1'],
        expect.any(Function)
      );
      expect(mockUseLayoutState).toHaveBeenCalledWith(60);

      const combinedItem = getByTestId('combined-item-1');
      
      act(() => {
        fireEvent.press(combinedItem);
      });

      expect(mockRecyclingSetState).toHaveBeenCalled();
      expect(mockLayoutSetState).toHaveBeenCalled();
    });
  });

  describe('useFlashListItemState Integration', () => {
    it('should handle item-specific state with automatic dependency tracking', () => {
      const mockSetState = jest.fn();
      mockUseRecyclingState.mockReturnValue([
        { expanded: false, lastInteraction: Date.now() },
        mockSetState
      ]);

      const itemWithVersion = { id: '1', title: 'Item 1', version: 2 };

      const renderItem = ({ item }: { item: typeof itemWithVersion }) => (
        <TestItemWithItemState item={item} />
      );

      const { getByTestId } = render(
        <FlashListWrapper
          data={[itemWithVersion]}
          renderItem={renderItem}
          testID="test-list"
        />
      );

      expect(mockUseRecyclingState).toHaveBeenCalledWith(
        expect.objectContaining({ expanded: false }),
        ['1', 2, 'external-dep'], // id, version, custom dependency
        expect.any(Function)
      );

      const toggleButton = getByTestId('toggle-1');
      
      act(() => {
        fireEvent.press(toggleButton);
      });

      expect(mockSetState).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should provide manual reset functionality', () => {
      const mockSetState = jest.fn();
      const initialState = { expanded: false, lastInteraction: Date.now() };
      
      mockUseRecyclingState.mockReturnValue([initialState, mockSetState]);

      const renderItem = ({ item }: { item: typeof mockData[0] }) => (
        <TestItemWithItemState item={item} />
      );

      const { getByTestId } = render(
        <FlashListWrapper
          data={[mockData[0]]}
          renderItem={renderItem}
          testID="test-list"
        />
      );

      const resetButton = getByTestId('reset-1');
      
      act(() => {
        fireEvent.press(resetButton);
      });

      expect(mockSetState).toHaveBeenCalledWith(
        expect.objectContaining({ expanded: false })
      );
    });

    it('should handle items with missing optional properties', () => {
      const mockSetState = jest.fn();
      mockUseRecyclingState.mockReturnValue([
        { expanded: false, lastInteraction: Date.now() },
        mockSetState
      ]);

      const itemWithoutVersion = { id: '1', title: 'Item 1' };

      const renderItem = ({ item }: { item: typeof itemWithoutVersion }) => (
        <TestItemWithItemState item={item} />
      );

      render(
        <FlashListWrapper
          data={[itemWithoutVersion]}
          renderItem={renderItem}
          testID="test-list"
        />
      );

      expect(mockUseRecyclingState).toHaveBeenCalledWith(
        expect.any(Object),
        ['1', 'external-dep'], // Only id and custom dependency
        expect.any(Function)
      );
    });
  });

  describe('Hook Performance and Memory Management', () => {
    it('should handle rapid state changes without memory leaks', () => {
      const mockSetState = jest.fn();
      mockUseRecyclingState.mockReturnValue([false, mockSetState]);

      const renderItem = ({ item }: { item: typeof mockData[0] }) => (
        <TestItemWithV2State item={item} />
      );

      const { getByTestId } = render(
        <FlashListWrapper
          data={[mockData[0]]}
          renderItem={renderItem}
          testID="test-list"
        />
      );

      const itemButton = getByTestId('item-1');

      // Simulate rapid state changes
      act(() => {
        for (let i = 0; i < 10; i++) {
          fireEvent.press(itemButton);
        }
      });

      expect(mockSetState).toHaveBeenCalledTimes(10);
    });

    it('should properly clean up state on component unmount', () => {
      const mockSetState = jest.fn();
      mockUseRecyclingState.mockReturnValue([false, mockSetState]);

      const renderItem = ({ item }: { item: typeof mockData[0] }) => (
        <TestItemWithV2State item={item} />
      );

      const { unmount } = render(
        <FlashListWrapper
          data={[mockData[0]]}
          renderItem={renderItem}
          testID="test-list"
        />
      );

      // Unmount should not cause any errors
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle undefined item data gracefully', () => {
      const mockSetState = jest.fn();
      mockUseRecyclingState.mockReturnValue([
        { expanded: false, lastInteraction: Date.now() },
        mockSetState
      ]);

      const TestComponentWithUndefinedItem = () => {
        const [state] = useFlashListItemState(
          undefined as any,
          () => ({ expanded: false, lastInteraction: Date.now() })
        );

        return <Text testID="undefined-item">{state.expanded ? 'Expanded' : 'Collapsed'}</Text>;
      };

      const { getByTestId } = render(<TestComponentWithUndefinedItem />);
      
      expect(getByTestId('undefined-item')).toBeTruthy();
      expect(mockUseRecyclingState).toHaveBeenCalledWith(
        expect.any(Object),
        [], // Empty dependencies for undefined item
        expect.any(Function)
      );
    });

    it('should handle hook errors gracefully', () => {
      // Mock useRecyclingState to throw an error
      mockUseRecyclingState.mockImplementation(() => {
        throw new Error('Hook error');
      });

      const TestComponentWithError = () => {
        try {
          const [state] = useFlashListV2State({
            initialState: false,
          });
          return <Text testID="error-component">{state ? 'True' : 'False'}</Text>;
        } catch (error) {
          return <Text testID="error-fallback">Error occurred</Text>;
        }
      };

      const { getByTestId } = render(<TestComponentWithError />);
      
      expect(getByTestId('error-fallback')).toBeTruthy();
    });
  });

  describe('TypeScript Type Safety', () => {
    it('should maintain proper type safety across hook integrations', () => {
      interface CustomItem {
        id: string;
        name: string;
        metadata: {
          priority: number;
          tags: string[];
        };
      }

      const customData: CustomItem[] = [
        {
          id: '1',
          name: 'Custom Item',
          metadata: { priority: 1, tags: ['important'] }
        }
      ];

      const mockSetState = jest.fn();
      mockUseRecyclingState.mockReturnValue([
        { expanded: false, selectedTags: [] },
        mockSetState
      ]);

      const CustomItemComponent: React.FC<{ item: CustomItem }> = ({ item }) => {
        const [state, setState] = useFlashListV2State({
          initialState: { expanded: false, selectedTags: [] as string[] },
          dependencies: [item.id, item.metadata.priority],
        });

        return (
          <View testID={`custom-item-${item.id}`}>
            <Text>{item.name}</Text>
            <Text>{state.selectedTags.join(', ')}</Text>
          </View>
        );
      };

      const renderItem = ({ item }: { item: CustomItem }) => (
        <CustomItemComponent item={item} />
      );

      const { getByTestId } = render(
        <FlashListWrapper<CustomItem>
          data={customData}
          renderItem={renderItem}
          testID="custom-list"
        />
      );

      expect(getByTestId('custom-item-1')).toBeTruthy();
      expect(mockUseRecyclingState).toHaveBeenCalledWith(
        expect.objectContaining({
          expanded: false,
          selectedTags: []
        }),
        ['1', 1], // item.id and item.metadata.priority
        expect.any(Function)
      );
    });
  });
});