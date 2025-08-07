/**
 * FlashList v2 Hook Usage Example
 * 
 * This component demonstrates how to use the new v2 hook wrappers
 * for state management in FlashList components.
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import {
  useFlashListV2State,
  useFlashListLayout,
  useFlashListCombinedState,
  useFlashListItemState
} from '@/lib/utils/flashlist-v2-hooks';

// Example data type
interface ExampleItem {
  id: string;
  title: string;
  content: string;
  version: number;
  updatedAt: string;
  defaultExpanded?: boolean;
}

/**
 * Example item component using useFlashListV2State
 */
const SimpleItemComponent: React.FC<{ item: ExampleItem }> = ({ item }) => {
  const [isExpanded, setIsExpanded] = useFlashListV2State({
    initialState: false,
    dependencies: [item.id],
    resetCallback: () => console.log(`Item ${item.id} state reset`),
    debug: __DEV__
  });

  return (
    <Pressable
      onPress={() => setIsExpanded(!isExpanded)}
      className="p-4 border-b border-gray-200 dark:border-gray-700"
    >
      <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {item.title}
      </Text>
      {isExpanded && (
        <Text className="mt-2 text-gray-600 dark:text-gray-400">
          {item.content}
        </Text>
      )}
    </Pressable>
  );
};

/**
 * Example item component using useFlashListLayout
 */
const LayoutAwareItemComponent: React.FC<{ item: ExampleItem }> = ({ item }) => {
  const [height, setHeight] = useFlashListLayout({
    initialState: 80,
    debug: __DEV__
  });

  const toggleHeight = () => {
    setHeight(height === 80 ? 120 : 80);
  };

  return (
    <Pressable
      onPress={toggleHeight}
      style={{ height }}
      className="p-4 border-b border-gray-200 dark:border-gray-700 justify-center"
    >
      <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {item.title}
      </Text>
      <Text className="text-sm text-gray-500 dark:text-gray-400">
        Height: {height}px (tap to toggle)
      </Text>
    </Pressable>
  );
};

/**
 * Example item component using useFlashListCombinedState
 */
const CombinedStateItemComponent: React.FC<{ item: ExampleItem }> = ({ item }) => {
  const { recycling, layout } = useFlashListCombinedState(
    {
      initialState: { expanded: false, selected: false },
      dependencies: [item.id],
      resetCallback: () => console.log(`Combined state reset for ${item.id}`)
    },
    {
      initialState: 100,
      debug: __DEV__
    }
  );

  const [itemState, setItemState] = recycling;
  const [height, setHeight] = layout;

  const toggleExpanded = () => {
    setItemState(prev => ({ ...prev, expanded: !prev.expanded }));
    setHeight(itemState.expanded ? 100 : 150);
  };

  const toggleSelected = () => {
    setItemState(prev => ({ ...prev, selected: !prev.selected }));
  };

  return (
    <View
      style={{ height }}
      className={`p-4 border-b border-gray-200 dark:border-gray-700 ${
        itemState.selected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
      }`}
    >
      <Pressable onPress={toggleExpanded}>
        <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {item.title} {itemState.expanded ? '▼' : '▶'}
        </Text>
      </Pressable>
      
      {itemState.expanded && (
        <View className="mt-2">
          <Text className="text-gray-600 dark:text-gray-400">
            {item.content}
          </Text>
          <Pressable
            onPress={toggleSelected}
            className="mt-2 p-2 bg-blue-500 rounded"
          >
            <Text className="text-white text-center">
              {itemState.selected ? 'Deselect' : 'Select'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

/**
 * Example item component using useFlashListItemState
 */
const SmartItemComponent: React.FC<{ item: ExampleItem }> = ({ item }) => {
  const [itemState, setItemState, resetState] = useFlashListItemState(
    item,
    (item) => ({
      expanded: item.defaultExpanded || false,
      selected: false,
      loading: false,
      viewCount: 0
    }),
    {
      debug: __DEV__,
      resetCallback: () => console.log(`Smart state reset for ${item.id}`),
      customDependencies: [item.version]
    }
  );

  const handlePress = () => {
    setItemState(prev => ({
      ...prev,
      expanded: !prev.expanded,
      viewCount: prev.viewCount + 1
    }));
  };

  const handleLongPress = () => {
    setItemState(prev => ({ ...prev, selected: !prev.selected }));
  };

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      className={`p-4 border-b border-gray-200 dark:border-gray-700 ${
        itemState.selected ? 'bg-green-50 dark:bg-green-900/20' : ''
      }`}
    >
      <View className="flex-row justify-between items-center">
        <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {item.title} {itemState.expanded ? '▼' : '▶'}
        </Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          Views: {itemState.viewCount}
        </Text>
      </View>
      
      {itemState.expanded && (
        <View className="mt-2">
          <Text className="text-gray-600 dark:text-gray-400">
            {item.content}
          </Text>
          <View className="flex-row justify-between mt-2">
            <Text className="text-xs text-gray-500">
              Version: {item.version}
            </Text>
            <Pressable
              onPress={resetState}
              className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded"
            >
              <Text className="text-xs text-gray-700 dark:text-gray-300">
                Reset
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </Pressable>
  );
};

/**
 * Main example component showcasing all hook types
 */
export const FlashListV2Example: React.FC = () => {
  const exampleData: ExampleItem[] = [
    {
      id: '1',
      title: 'Simple State Example',
      content: 'This item uses useFlashListV2State for basic state management.',
      version: 1,
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: '2',
      title: 'Layout Aware Example',
      content: 'This item uses useFlashListLayout for dynamic height changes.',
      version: 1,
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: '3',
      title: 'Combined State Example',
      content: 'This item uses useFlashListCombinedState for both recycling and layout state.',
      version: 1,
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: '4',
      title: 'Smart Item Example',
      content: 'This item uses useFlashListItemState with automatic dependency tracking.',
      version: 2,
      updatedAt: '2024-01-02T00:00:00Z',
      defaultExpanded: true
    }
  ];

  const renderItem = ({ item, index }: { item: ExampleItem; index: number }) => {
    switch (index % 4) {
      case 0:
        return <SimpleItemComponent item={item} />;
      case 1:
        return <LayoutAwareItemComponent item={item} />;
      case 2:
        return <CombinedStateItemComponent item={item} />;
      case 3:
        return <SmartItemComponent item={item} />;
      default:
        return <SimpleItemComponent item={item} />;
    }
  };

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      <View className="p-4 border-b border-gray-200 dark:border-gray-700">
        <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
          FlashList v2 Hook Examples
        </Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Demonstrating useFlashListV2State, useFlashListLayout, useFlashListCombinedState, and useFlashListItemState
        </Text>
      </View>
      
      <FlashList
        data={exampleData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        maintainVisibleContentPosition={{
          autoscrollToTopThreshold: 0.1,
          startRenderingFromBottom: false
        }}
      />
    </View>
  );
};

export default FlashListV2Example;
