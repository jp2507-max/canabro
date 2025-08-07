# FlashList v2 Code Examples

## Migration Examples

### Basic List Migration

**Before (v1):**
```typescript
import { FlashList } from '@shopify/flash-list';

interface PlantListProps {
  plants: Plant[];
}

export function PlantList({ plants }: PlantListProps) {
  const listRef = useRef<FlashList<Plant>>(null);

  return (
    <FlashList
      ref={listRef}
      data={plants}
      estimatedItemSize={120}
      renderItem={({ item }) => <PlantCard plant={item} />}
      keyExtractor={(item) => item.id}
    />
  );
}
```

**After (v2):**
```typescript
import { FlashList, FlashListRef } from '@shopify/flash-list';

interface PlantListProps {
  plants: Plant[];
}

export function PlantList({ plants }: PlantListProps) {
  const listRef = useRef<FlashListRef<Plant>>(null);

  return (
    <FlashListWrapper
      ref={listRef}
      data={plants}
      // estimatedItemSize removed - automatic sizing
      renderItem={({ item }) => <PlantCard plant={item} />}
      keyExtractor={(item) => item.id}
    />
  );
}
```

### Chat Interface Migration

**Before (v1):**
```typescript
import { FlashList } from '@shopify/flash-list';

export function ChatMessageList({ messages }: { messages: Message[] }) {
  const listRef = useRef<FlashList<Message>>(null);

  return (
    <FlashList
      ref={listRef}
      data={messages}
      estimatedItemSize={80}
      inverted={true}
      renderItem={({ item }) => <MessageBubble message={item} />}
      keyExtractor={(item) => item.id}
      onEndReached={loadMoreMessages}
    />
  );
}
```

**After (v2):**
```typescript
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { optimizeFlashListV2Performance } from '@/lib/utils/flashlist-performance';

export function ChatMessageList({ messages }: { messages: Message[] }) {
  const listRef = useRef<FlashListRef<Message>>(null);
  
  const config = optimizeFlashListV2Performance({
    preset: 'LARGE_MESSAGE_HISTORY',
    maintainVisibleContentPosition: {
      startRenderingFromBottom: true,
      autoscrollToBottomThreshold: 0.2,
      animateAutoScrollToBottom: true
    }
  });

  return (
    <FlashListWrapper
      ref={listRef}
      data={messages}
      {...config}
      renderItem={({ item }) => <MessageBubble message={item} />}
      keyExtractor={(item) => item.id}
      onEndReached={loadMoreMessages}
    />
  );
}
```

### Masonry Gallery Migration

**Before (v1):**
```typescript
import { MasonryFlashList } from '@shopify/flash-list';

export function PhotoGallery({ photos }: { photos: Photo[] }) {
  return (
    <MasonryFlashList
      data={photos}
      numColumns={2}
      estimatedItemSize={200}
      renderItem={({ item }) => (
        <PhotoCard 
          photo={item} 
          style={{ height: item.height || 200 }}
        />
      )}
      keyExtractor={(item) => item.id}
    />
  );
}
```

**After (v2):**
```typescript
import { FlashList } from '@shopify/flash-list';
import { optimizeFlashListV2Performance } from '@/lib/utils/flashlist-performance';

export function PhotoGallery({ photos }: { photos: Photo[] }) {
  const config = optimizeFlashListV2Performance({
    preset: 'MASONRY_GRID',
    masonry: true
  });

  return (
    <FlashListWrapper
      data={photos}
      numColumns={2}
      {...config}
      renderItem={({ item }) => (
        <PhotoCard 
          photo={item} 
          // Height calculated automatically by v2
        />
      )}
      keyExtractor={(item) => item.id}
    />
  );
}
```

## Advanced Usage Examples

### Dynamic Height Items with Hooks

```typescript
import { useFlashListLayout } from '@/lib/utils/flashlist-v2-hooks';

interface ExpandableCardProps {
  item: PlantNote;
}

function ExpandableCard({ item }: ExpandableCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [cardHeight, setCardHeight] = useFlashListLayout(120);

  return (
    <Animated.View 
      style={{ minHeight: cardHeight }}
      onLayout={(event) => {
        const { height } = event.nativeEvent.layout;
        setCardHeight(height);
      }}
    >
      <Pressable onPress={() => setIsExpanded(!isExpanded)}>
        <Text>{item.title}</Text>
        {isExpanded && (
          <Text>{item.fullContent}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function PlantNotesList({ notes }: { notes: PlantNote[] }) {
  const config = optimizeFlashListV2Performance({
    enableAutoSizing: true,
    itemTypeExtractor: (item) => item.isLong ? 'long-note' : 'short-note'
  });

  return (
    <FlashListWrapper
      data={notes}
      {...config}
      renderItem={({ item }) => <ExpandableCard item={item} />}
      keyExtractor={(item) => item.id}
    />
  );
}
```

### State Management with Recycling

```typescript
import { useFlashListV2State } from '@/lib/utils/flashlist-v2-hooks';

interface InteractiveItemProps {
  plant: Plant;
}

function InteractivePlantCard({ plant }: InteractiveItemProps) {
  // State that resets when item is recycled
  const [isLiked, setIsLiked] = useFlashListV2State(
    plant.isLiked || false,
    [plant.id], // Reset when plant changes
    () => setIsLiked(plant.isLiked || false)
  );

  const [showDetails, setShowDetails] = useFlashListV2State(
    false,
    [plant.id],
    () => setShowDetails(false)
  );

  const handleLike = async () => {
    setIsLiked(!isLiked);
    await updatePlantLike(plant.id, !isLiked);
  };

  return (
    <View>
      <PlantImage plant={plant} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Pressable onPress={() => setShowDetails(!showDetails)}>
          <Text>Details</Text>
        </Pressable>
        <Pressable onPress={handleLike}>
          <Text>{isLiked ? '❤️' : '🤍'}</Text>
        </Pressable>
      </View>
      {showDetails && (
        <PlantDetails plant={plant} />
      )}
    </View>
  );
}
```

### Performance-Optimized Feed

```typescript
import { optimizeFlashListV2Performance, optimizeDatasetV2 } from '@/lib/utils/flashlist-performance';

export function ActivityFeed({ activities }: { activities: Activity[] }) {
  // Optimize dataset for v2
  const optimizedData = useMemo(() => 
    optimizeDatasetV2(activities, {
      enableItemTypeDetection: true,
      itemTypeExtractor: (activity) => {
        if (activity.type === 'plant_update') return 'plant-update';
        if (activity.type === 'harvest') return 'harvest';
        if (activity.type === 'comment') return 'comment';
        return 'default';
      },
      enableMemoryOptimization: true
    }), [activities]
  );

  // Performance configuration
  const config = optimizeFlashListV2Performance({
    preset: 'ACTIVITY_FEED',
    maintainVisibleContentPosition: {
      autoscrollToTopThreshold: 0.1
    },
    enableV2Metrics: __DEV__
  });

  const renderActivity = useCallback(({ item }: { item: Activity }) => {
    switch (item.type) {
      case 'plant_update':
        return <PlantUpdateCard activity={item} />;
      case 'harvest':
        return <HarvestCard activity={item} />;
      case 'comment':
        return <CommentCard activity={item} />;
      default:
        return <DefaultActivityCard activity={item} />;
    }
  }, []);

  return (
    <FlashListWrapper
      data={optimizedData}
      {...config}
      renderItem={renderActivity}
      keyExtractor={(item) => item.id}
      onEndReached={loadMoreActivities}
      onEndReachedThreshold={0.5}
    />
  );
}
```

### Memory-Optimized Large Dataset

```typescript
import { 
  optimizeFlashListV2Performance, 
  enableMemoryPressureDetection 
} from '@/lib/utils/flashlist-performance';

export function LargePlantCatalog({ plants }: { plants: Plant[] }) {
  const [memoryOptimized, setMemoryOptimized] = useState(false);

  // Enable memory pressure detection
  useEffect(() => {
    const cleanup = enableMemoryPressureDetection({
      threshold: 0.8,
      onPressureDetected: () => {
        setMemoryOptimized(true);
      }
    });

    return cleanup;
  }, []);

  // Adjust config based on memory pressure
  const config = optimizeFlashListV2Performance({
    preset: 'LARGE_DATASET',
    maxMemoryUsage: memoryOptimized ? 15 : 25,
    cacheStrategy: memoryOptimized ? 'minimal' : 'hybrid',
    enableAutoCleanup: memoryOptimized,
    enableV2Metrics: true
  });

  return (
    <FlashListWrapper
      data={plants}
      {...config}
      renderItem={({ item }) => (
        <PlantCatalogCard 
          plant={item} 
          simplified={memoryOptimized}
        />
      )}
      keyExtractor={(item) => item.id}
      onEndReached={loadMorePlants}
    />
  );
}
```

### Custom Performance Monitoring

```typescript
import { 
  enableV2PerformanceMonitoring,
  getV2PerformanceMetrics,
  setupPerformanceAlerts
} from '@/lib/utils/flashlist-performance';

export function MonitoredPlantList({ plants }: { plants: Plant[] }) {
  const [performanceIssues, setPerformanceIssues] = useState<string[]>([]);

  useEffect(() => {
    // Enable monitoring
    enableV2PerformanceMonitoring({
      trackRenderingPerformance: true,
      trackMemoryUsage: true,
      trackScrollPerformance: true,
      trackAutoSizingEfficiency: true
    });

    // Setup alerts
    const cleanup = setupPerformanceAlerts({
      maxDroppedFrames: 5,
      maxMemoryUsage: 40,
      minAutoSizingEfficiency: 0.8,
      onAlert: (alert) => {
        setPerformanceIssues(prev => [...prev, alert.message]);
      }
    });

    return cleanup;
  }, []);

  // Log metrics periodically in development
  useEffect(() => {
    if (!__DEV__) return;

    const interval = setInterval(() => {
      const metrics = getV2PerformanceMetrics();
      console.log('FlashList Performance:', {
        autoSizingEfficiency: metrics.autoSizingEfficiency,
        memoryUsage: metrics.currentMemoryUsage,
        scrollPerformance: metrics.scrollPerformance.scrollJankPercentage
      });
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const config = optimizeFlashListV2Performance({
    preset: 'ACTIVITY_FEED',
    enableV2Metrics: true
  });

  return (
    <View style={{ flex: 1 }}>
      {__DEV__ && performanceIssues.length > 0 && (
        <View style={{ backgroundColor: 'orange', padding: 8 }}>
          <Text>Performance Issues:</Text>
          {performanceIssues.map((issue, index) => (
            <Text key={index} style={{ fontSize: 12 }}>• {issue}</Text>
          ))}
        </View>
      )}
      
      <FlashListWrapper
        data={plants}
        {...config}
        renderItem={({ item }) => <PlantCard plant={item} />}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
}
```

## Platform-Specific Examples

### Android Keyboard Handling

```typescript
import { Platform } from 'react-native';

export function AndroidChatList({ messages }: { messages: Message[] }) {
  const config = optimizeFlashListV2Performance({
    preset: 'LARGE_MESSAGE_HISTORY',
    maintainVisibleContentPosition: {
      startRenderingFromBottom: true,
      autoscrollToBottomThreshold: 0.2,
      // Android-specific optimization
      animateAutoScrollToBottom: Platform.OS === 'android'
    }
  });

  return (
    <FlashListWrapper
      data={messages}
      {...config}
      // Android-specific prop
      stickyToBottomOnAndroid={true}
      renderItem={({ item }) => <MessageBubble message={item} />}
      keyExtractor={(item) => item.id}
    />
  );
}
```

### iOS Smooth Scrolling

```typescript
import { Platform } from 'react-native';

export function iOSOptimizedList({ items }: { items: any[] }) {
  const config = optimizeFlashListV2Performance({
    preset: 'ACTIVITY_FEED',
    // iOS-specific optimizations
    maxMemoryUsage: Platform.OS === 'ios' ? 35 : 25,
    cacheStrategy: Platform.OS === 'ios' ? 'memory' : 'hybrid',
    enableIntelligentCaching: Platform.OS === 'ios'
  });

  return (
    <FlashListWrapper
      data={items}
      {...config}
      renderItem={({ item }) => <OptimizedItem item={item} />}
      keyExtractor={(item) => item.id}
      // iOS-specific scroll properties
      showsVerticalScrollIndicator={Platform.OS === 'ios'}
      bounces={Platform.OS === 'ios'}
    />
  );
}
```

## Testing Examples

### Performance Testing

```typescript
import { 
  profileV2Performance,
  measureScrollPerformance,
  measureMemoryUsage
} from '@/lib/utils/flashlist-performance';

describe('FlashList v2 Performance', () => {
  it('should render large datasets efficiently', async () => {
    const largeDataset = generateTestData(10000);
    
    const profile = await profileV2Performance(async () => {
      render(<PlantList plants={largeDataset} />);
      await waitFor(() => {
        expect(screen.getByTestId('plant-list')).toBeVisible();
      });
    });

    expect(profile.renderingMetrics.initialRenderTime).toBeLessThan(500);
    expect(profile.memoryUsage.peak).toBeLessThan(50);
  });

  it('should maintain good scroll performance', async () => {
    const { getByTestId } = render(<PlantList plants={testPlants} />);
    const list = getByTestId('plant-list');

    const scrollMetrics = await measureScrollPerformance(() => {
      fireEvent.scroll(list, {
        nativeEvent: {
          contentOffset: { y: 1000, x: 0 },
          contentSize: { height: 10000, width: 350 },
          layoutMeasurement: { height: 600, width: 350 }
        }
      });
    });

    expect(scrollMetrics.scrollJankPercentage).toBeLessThan(0.1);
    expect(scrollMetrics.averageScrollFPS).toBeGreaterThan(55);
  });

  it('should not exceed memory limits', async () => {
    const { rerender } = render(<PlantList plants={testPlants} />);
    
    // Simulate multiple re-renders with different data
    for (let i = 0; i < 10; i++) {
      const newData = generateTestData(1000);
      rerender(<PlantList plants={newData} />);
      await waitFor(() => {
        expect(screen.getByTestId('plant-list')).toBeVisible();
      });
    }

    const memoryMetrics = await measureMemoryUsage();
    expect(memoryMetrics.currentUsage).toBeLessThan(30);
  });
});
```

### Hook Testing

```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useFlashListV2State, useFlashListLayout } from '@/lib/utils/flashlist-v2-hooks';

describe('FlashList v2 Hooks', () => {
  it('should reset state when dependencies change', () => {
    const { result, rerender } = renderHook(
      ({ itemId }) => useFlashListV2State(false, [itemId], () => false),
      { initialProps: { itemId: '1' } }
    );

    // Change state
    act(() => {
      result.current[1](true);
    });
    expect(result.current[0]).toBe(true);

    // Change dependency - should reset
    rerender({ itemId: '2' });
    expect(result.current[0]).toBe(false);
  });

  it('should communicate layout changes', () => {
    const { result } = renderHook(() => useFlashListLayout(100));

    expect(result.current[0]).toBe(100);

    act(() => {
      result.current[1](200);
    });

    expect(result.current[0]).toBe(200);
  });
});
```

### Migration Testing

```typescript
import { validateV2Migration } from '@/lib/utils/flashlist-migration-warnings';

describe('FlashList v2 Migration', () => {
  it('should detect deprecated props', () => {
    const testProps = {
      data: [],
      estimatedItemSize: 120,
      estimatedListSize: { height: 600, width: 350 },
      renderItem: () => null
    };

    const validation = validateV2Migration({
      props: testProps,
      checkDeprecatedProps: true
    });

    expect(validation.hasIssues).toBe(true);
    expect(validation.issues).toContain('estimatedItemSize is deprecated');
    expect(validation.issues).toContain('estimatedListSize is deprecated');
  });

  it('should validate performance configuration', () => {
    const invalidConfig = {
      estimatedItemSize: 120, // Deprecated
      enableMemoryOptimization: true
    };

    const validation = validateV2Migration({
      performanceConfig: invalidConfig,
      checkPerformanceConfig: true
    });

    expect(validation.hasIssues).toBe(true);
    expect(validation.issues).toContain('Performance config contains deprecated properties');
  });
});
```

## Best Practices Examples

### Memoized Render Items

```typescript
import React, { memo, useCallback } from 'react';

// Memoize expensive render items
const PlantCard = memo(({ plant }: { plant: Plant }) => {
  return (
    <View>
      <PlantImage plant={plant} />
      <PlantDetails plant={plant} />
    </View>
  );
});

export function OptimizedPlantList({ plants }: { plants: Plant[] }) {
  // Memoize render function
  const renderPlant = useCallback(({ item }: { item: Plant }) => (
    <PlantCard plant={item} />
  ), []);

  const config = optimizeFlashListV2Performance({
    preset: 'ACTIVITY_FEED',
    enableAutoSizing: true
  });

  return (
    <FlashListWrapper
      data={plants}
      {...config}
      renderItem={renderPlant}
      keyExtractor={useCallback((item: Plant) => item.id, [])}
    />
  );
}
```

### Error Boundary Integration

```typescript
import { ErrorBoundary } from 'react-error-boundary';

function FlashListErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Something went wrong with the list:</Text>
      <Text style={{ color: 'red' }}>{error.message}</Text>
      <Pressable onPress={resetErrorBoundary}>
        <Text>Try again</Text>
      </Pressable>
    </View>
  );
}

export function SafePlantList({ plants }: { plants: Plant[] }) {
  const config = optimizeFlashListV2Performance({
    preset: 'ACTIVITY_FEED'
  });

  return (
    <ErrorBoundary
      FallbackComponent={FlashListErrorFallback}
      onError={(error, errorInfo) => {
        console.error('FlashList error:', error, errorInfo);
        // Report to crash analytics
      }}
    >
      <FlashListWrapper
        data={plants}
        {...config}
        renderItem={({ item }) => <PlantCard plant={item} />}
        keyExtractor={(item) => item.id}
      />
    </ErrorBoundary>
  );
}
```

### Accessibility Integration

```typescript
export function AccessiblePlantList({ plants }: { plants: Plant[] }) {
  const config = optimizeFlashListV2Performance({
    preset: 'ACTIVITY_FEED'
  });

  return (
    <FlashListWrapper
      data={plants}
      {...config}
      renderItem={({ item, index }) => (
        <PlantCard 
          plant={item} 
          accessibilityLabel={`Plant ${item.name}, ${index + 1} of ${plants.length}`}
          accessibilityRole="button"
          accessibilityHint="Double tap to view plant details"
        />
      )}
      keyExtractor={(item) => item.id}
      // Accessibility props
      accessible={true}
      accessibilityRole="list"
      accessibilityLabel={`Plant list with ${plants.length} plants`}
    />
  );
}
```

These examples demonstrate the key patterns and best practices for migrating to and using FlashList v2 effectively in the Canabro application.