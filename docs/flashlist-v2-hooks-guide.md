# FlashList v2 Hook Wrappers Guide

This guide covers the new FlashList v2 hook wrappers that provide enhanced state management for recycled components in FlashList v2.

## Overview

FlashList v2 introduces new hooks (`useRecyclingState` and `useLayoutState`) for better state management in recycled components. Our wrapper hooks provide additional functionality, consistent APIs, and enhanced TypeScript support.

## Available Hooks

### 1. `useFlashListV2State`

A wrapper around `useRecyclingState` with enhanced functionality.

```tsx
import { useFlashListV2State } from '@/lib/utils/flashlist-v2-hooks';

const MyItem = ({ item }) => {
  const [isExpanded, setIsExpanded] = useFlashListV2State({
    initialState: false,
    dependencies: [item.id],
    resetCallback: () => console.log('State reset'),
    debug: __DEV__
  });

  return (
    <Pressable onPress={() => setIsExpanded(!isExpanded)}>
      <Text>{item.title}</Text>
      {isExpanded && <Text>{item.content}</Text>}
    </Pressable>
  );
};
```

**Features:**
- Automatic state reset when dependencies change
- Optional debug logging
- Enhanced TypeScript types
- Consistent API with configuration object

### 2. `useFlashListLayout`

A wrapper around `useLayoutState` for layout-aware state management.

```tsx
import { useFlashListLayout } from '@/lib/utils/flashlist-v2-hooks';

const MyItem = ({ item }) => {
  const [height, setHeight] = useFlashListLayout({
    initialState: 80,
    debug: __DEV__
  });

  const toggleHeight = () => {
    setHeight(height === 80 ? 120 : 80);
  };

  return (
    <Pressable onPress={toggleHeight} style={{ height }}>
      <Text>{item.title}</Text>
    </Pressable>
  );
};
```

**Features:**
- Direct communication with FlashList for layout updates
- Smooth visual updates without relying on onLayout
- Optional debug logging

### 3. `useFlashListCombinedState`

Combines both recycling and layout state management.

```tsx
import { useFlashListCombinedState } from '@/lib/utils/flashlist-v2-hooks';

const MyItem = ({ item }) => {
  const { recycling, layout } = useFlashListCombinedState(
    {
      initialState: { expanded: false, selected: false },
      dependencies: [item.id],
      resetCallback: () => console.log('Item recycled')
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

  return (
    <Pressable onPress={toggleExpanded} style={{ height }}>
      <Text>{item.title}</Text>
      {itemState.expanded && <Text>{item.content}</Text>}
    </Pressable>
  );
};
```

**Features:**
- Combines recycling and layout state in one hook
- Separate configuration for each state type
- Coordinated state management

### 4. `useFlashListItemState`

Advanced hook with automatic dependency tracking for item-based state.

```tsx
import { useFlashListItemState } from '@/lib/utils/flashlist-v2-hooks';

const MyItem = ({ item }) => {
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
      resetCallback: () => console.log('Item state reset'),
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

  return (
    <Pressable onPress={handlePress}>
      <Text>{item.title}</Text>
      <Text>Views: {itemState.viewCount}</Text>
      {itemState.expanded && <Text>{item.content}</Text>}
    </Pressable>
  );
};
```

**Features:**
- Automatic dependency tracking (id, version, updatedAt, etc.)
- Factory function for initial state
- Manual reset function
- Custom dependencies support

## Configuration Options

### FlashListV2StateConfig

```tsx
interface FlashListV2StateConfig<T> {
  initialState: T;
  dependencies?: any[];
  resetCallback?: () => void;
  debug?: boolean;
}
```

### FlashListLayoutConfig

```tsx
interface FlashListLayoutConfig<T> {
  initialState: T;
  debug?: boolean;
}
```

## Best Practices

### 1. Use Appropriate Dependencies

```tsx
// Good: Use stable identifiers
const [state, setState] = useFlashListV2State({
  initialState: false,
  dependencies: [item.id, item.version]
});

// Avoid: Using unstable references
const [state, setState] = useFlashListV2State({
  initialState: false,
  dependencies: [item, new Date()] // These change on every render
});
```

### 2. Enable Debug Mode in Development

```tsx
const [state, setState] = useFlashListV2State({
  initialState: false,
  dependencies: [item.id],
  debug: __DEV__ // Only enable in development
});
```

### 3. Use Reset Callbacks for Cleanup

```tsx
const [state, setState] = useFlashListV2State({
  initialState: { scrollPosition: 0, isPlaying: false },
  dependencies: [item.id],
  resetCallback: () => {
    // Clean up any ongoing operations
    stopVideo();
    resetScrollPosition();
  }
});
```

### 4. Choose the Right Hook

- **`useFlashListV2State`**: Basic state that needs to reset on recycling
- **`useFlashListLayout`**: State that affects item layout/height
- **`useFlashListCombinedState`**: When you need both recycling and layout state
- **`useFlashListItemState`**: Complex item state with automatic dependency tracking

## Migration from v1

### Before (v1 pattern)

```tsx
const MyItem = ({ item }) => {
  const lastItemId = useRef(item.id);
  const [expanded, setExpanded] = useState(false);
  
  if (item.id !== lastItemId.current) {
    lastItemId.current = item.id;
    setExpanded(false);
  }

  // Component logic...
};
```

### After (v2 with hooks)

```tsx
const MyItem = ({ item }) => {
  const [expanded, setExpanded] = useFlashListV2State({
    initialState: false,
    dependencies: [item.id]
  });

  // Component logic...
};
```

## Performance Considerations

1. **Minimal Dependencies**: Only include necessary dependencies to avoid unnecessary resets
2. **Stable References**: Use stable identifiers in dependencies array
3. **Debug Mode**: Only enable debug logging in development
4. **Reset Callbacks**: Use for cleanup operations, not heavy computations

## TypeScript Support

All hooks provide full TypeScript support with proper type inference:

```tsx
// Type is inferred as [boolean, (value: boolean | ((prev: boolean) => boolean)) => void]
const [expanded, setExpanded] = useFlashListV2State({
  initialState: false,
  dependencies: [item.id]
});

// Complex state types are fully supported
interface ItemState {
  expanded: boolean;
  selected: boolean;
  metadata: { viewCount: number };
}

const [state, setState] = useFlashListV2State<ItemState>({
  initialState: {
    expanded: false,
    selected: false,
    metadata: { viewCount: 0 }
  },
  dependencies: [item.id]
});
```

## Integration with FlashList v2

These hooks are designed to work seamlessly with FlashList v2 features:

- **Automatic Sizing**: No size estimates needed
- **maintainVisibleContentPosition**: State persists during content changes
- **Masonry Layout**: Works with varying item heights
- **Enhanced Performance**: Optimized for v2's rendering engine

## Example: Complete Item Component

```tsx
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useFlashListItemState } from '@/lib/utils/flashlist-v2-hooks';

interface MessageItem {
  id: string;
  content: string;
  senderId: string;
  timestamp: number;
  version: number;
  reactions?: string[];
}

const MessageItemComponent: React.FC<{ item: MessageItem }> = ({ item }) => {
  const [messageState, setMessageState, resetState] = useFlashListItemState(
    item,
    (item) => ({
      expanded: false,
      showReactions: false,
      isRead: false,
      interactionCount: 0
    }),
    {
      debug: __DEV__,
      resetCallback: () => console.log(`Message ${item.id} state reset`),
      customDependencies: [item.version]
    }
  );

  const handlePress = () => {
    setMessageState(prev => ({
      ...prev,
      expanded: !prev.expanded,
      isRead: true,
      interactionCount: prev.interactionCount + 1
    }));
  };

  const toggleReactions = () => {
    setMessageState(prev => ({
      ...prev,
      showReactions: !prev.showReactions
    }));
  };

  return (
    <Pressable onPress={handlePress} className="p-4 border-b border-gray-200">
      <Text className="font-semibold">{item.senderId}</Text>
      <Text className={messageState.isRead ? 'text-gray-600' : 'text-black'}>
        {messageState.expanded ? item.content : `${item.content.slice(0, 100)}...`}
      </Text>
      
      {item.reactions && item.reactions.length > 0 && (
        <Pressable onPress={toggleReactions} className="mt-2">
          <Text className="text-blue-500">
            {messageState.showReactions ? 'Hide' : 'Show'} Reactions ({item.reactions.length})
          </Text>
        </Pressable>
      )}
      
      {messageState.showReactions && (
        <View className="mt-2 flex-row">
          {item.reactions?.map((reaction, index) => (
            <Text key={index} className="mr-2">{reaction}</Text>
          ))}
        </View>
      )}
      
      <Text className="text-xs text-gray-400 mt-2">
        Interactions: {messageState.interactionCount}
      </Text>
    </Pressable>
  );
};

export default MessageItemComponent;
```

This example demonstrates a complete message item component using `useFlashListItemState` with automatic dependency tracking, state management, and proper TypeScript support.