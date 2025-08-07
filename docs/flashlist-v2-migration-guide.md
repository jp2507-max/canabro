# FlashList v2 Migration Guide

## Overview

This guide helps you migrate from FlashList v1 to v2 in the Canabro application. FlashList v2 introduces significant performance improvements, automatic sizing, and new features while requiring some breaking changes.

## Key Benefits of v2

- **Automatic Sizing**: No more manual `estimatedItemSize` calculations
- **Better Performance**: Improved rendering and scroll performance
- **Enhanced Features**: `maintainVisibleContentPosition`, masonry layouts, new hooks
- **Memory Optimization**: Better memory management for large datasets

## Breaking Changes

### 1. Removed Props

#### `estimatedItemSize` (REMOVED)
**v1 Code:**
```typescript
<FlashListWrapper
  data={plants}
  estimatedItemSize={120}
  renderItem={({ item }) => <PlantCard plant={item} />}
/>
```

**v2 Code:**
```typescript
<FlashListWrapper
  data={plants}
  // estimatedItemSize removed - automatic sizing enabled
  renderItem={({ item }) => <PlantCard plant={item} />}
/>
```

#### `estimatedListSize` (REMOVED)
**v1 Code:**
```typescript
<FlashListWrapper
  data={messages}
  estimatedItemSize={80}
  estimatedListSize={{ height: 600, width: 350 }}
  renderItem={({ item }) => <MessageItem message={item} />}
/>
```

**v2 Code:**
```typescript
<FlashListWrapper
  data={messages}
  // estimatedListSize removed - calculated automatically
  renderItem={({ item }) => <MessageItem message={item} />}
/>
```

### 2. Updated Props

#### `inverted` → `maintainVisibleContentPosition`
**v1 Code:**
```typescript
<FlashListWrapper
  data={chatMessages}
  inverted={true}
  renderItem={({ item }) => <ChatMessage message={item} />}
/>
```

**v2 Code:**
```typescript
<FlashListWrapper
  data={chatMessages}
  maintainVisibleContentPosition={{
    startRenderingFromBottom: true,
    autoscrollToBottomThreshold: 0.2
  }}
  renderItem={({ item }) => <ChatMessage message={item} />}
/>
```

#### `overrideItemLayout` (Updated)
**v1 Code:**
```typescript
<FlashListWrapper
  data={items}
  overrideItemLayout={(layout, item) => {
    layout.size = item.isExpanded ? 200 : 100; // Size estimation
    layout.span = item.isWide ? 2 : 1;
  }}
/>
```

**v2 Code:**
```typescript
<FlashListWrapper
  data={items}
  overrideItemLayout={(layout, item) => {
    // Size estimation removed - only span supported
    layout.span = item.isWide ? 2 : 1;
  }}
/>
```

### 3. Type Changes

#### FlashList Ref Types
**v1 Code:**
```typescript
import { FlashList } from '@shopify/flash-list';

const listRef = useRef<FlashList<PlantType>>(null);
```

**v2 Code:**
```typescript
import { FlashList, FlashListRef } from '@shopify/flash-list';

const listRef = useRef<FlashListRef<PlantType>>(null);
```

## Migration Steps

### Step 1: Update FlashListWrapper Usage

1. **Remove size estimation props:**
   ```typescript
   // Remove these props from all FlashListWrapper instances
   - estimatedItemSize
   - estimatedListSize
   - estimatedFirstItemOffset
   ```

2. **Update inverted lists:**
   ```typescript
   // Replace inverted prop
   - inverted={true}
   + maintainVisibleContentPosition={{
   +   startRenderingFromBottom: true
   + }}
   ```

3. **Update ref types:**
   ```typescript
   // Update import
   - import { FlashList } from '@shopify/flash-list';
   + import { FlashList, FlashListRef } from '@shopify/flash-list';
   
   // Update ref type
   - const ref = useRef<FlashList<T>>(null);
   + const ref = useRef<FlashListRef<T>>(null);
   ```

### Step 2: Update Performance Configurations

**v1 Performance Config:**
```typescript
import { optimizeFlashListPerformance } from '@/lib/utils/flashlist-performance';

const config = optimizeFlashListPerformance({
  estimatedItemSize: 120,
  enableMemoryOptimization: true,
  preset: 'LARGE_MESSAGE_HISTORY'
});
```

**v2 Performance Config:**
```typescript
import { optimizeFlashListV2Performance } from '@/lib/utils/flashlist-performance';

const config = optimizeFlashListV2Performance({
  // estimatedItemSize removed
  enableAutoSizing: true,
  maintainVisibleContentPosition: {
    autoscrollToBottomThreshold: 0.2
  },
  preset: 'LARGE_MESSAGE_HISTORY'
});
```

### Step 3: Update Masonry Layouts

**v1 Masonry:**
```typescript
import { MasonryFlashList } from '@shopify/flash-list';

<MasonryFlashList
  data={photos}
  numColumns={2}
  renderItem={({ item }) => <PhotoCard photo={item} />}
/>
```

**v2 Masonry:**
```typescript
import { FlashList } from '@shopify/flash-list';

<FlashListWrapper
  data={photos}
  masonry={true}
  numColumns={2}
  renderItem={({ item }) => <PhotoCard photo={item} />}
/>
```

## Common Migration Scenarios

### 1. Chat/Message Lists

**Before (v1):**
```typescript
<FlashListWrapper
  data={messages}
  estimatedItemSize={80}
  inverted={true}
  renderItem={({ item }) => <MessageBubble message={item} />}
  keyExtractor={(item) => item.id}
/>
```

**After (v2):**
```typescript
<FlashListWrapper
  data={messages}
  maintainVisibleContentPosition={{
    startRenderingFromBottom: true,
    autoscrollToBottomThreshold: 0.2,
    animateAutoScrollToBottom: true
  }}
  renderItem={({ item }) => <MessageBubble message={item} />}
  keyExtractor={(item) => item.id}
/>
```

### 2. Plant Gallery with Variable Heights

**Before (v1):**
```typescript
<FlashListWrapper
  data={plants}
  estimatedItemSize={200}
  numColumns={2}
  renderItem={({ item }) => (
    <PlantCard 
      plant={item} 
      style={{ height: item.imageHeight || 200 }}
    />
  )}
/>
```

**After (v2):**
```typescript
<FlashListWrapper
  data={plants}
  masonry={true}
  numColumns={2}
  renderItem={({ item }) => (
    <PlantCard 
      plant={item} 
      // Height calculated automatically
    />
  )}
/>
```

### 3. Activity Feed with Mixed Content

**Before (v1):**
```typescript
const config = optimizeFlashListPerformance({
  estimatedItemSize: 150,
  preset: 'ACTIVITY_FEED'
});

<FlashListWrapper
  data={activities}
  {...config}
  renderItem={({ item }) => <ActivityItem activity={item} />}
/>
```

**After (v2):**
```typescript
const config = optimizeFlashListV2Performance({
  preset: 'ACTIVITY_FEED',
  enableAutoSizing: true,
  maintainVisibleContentPosition: {
    autoscrollToTopThreshold: 0.1
  }
});

<FlashListWrapper
  data={activities}
  {...config}
  renderItem={({ item }) => <ActivityItem activity={item} />}
/>
```

## New Features in v2

### 1. maintainVisibleContentPosition

Automatically maintains scroll position when content changes:

```typescript
<FlashListWrapper
  data={chatMessages}
  maintainVisibleContentPosition={{
    // Scroll to bottom when new content is within 20% of bottom
    autoscrollToBottomThreshold: 0.2,
    
    // Scroll to top when new content is within 10% of top
    autoscrollToTopThreshold: 0.1,
    
    // Start rendering from bottom (for chat interfaces)
    startRenderingFromBottom: true,
    
    // Animate auto-scroll to bottom
    animateAutoScrollToBottom: true
  }}
  renderItem={({ item }) => <ChatMessage message={item} />}
/>
```

### 2. Enhanced Hooks

#### useFlashListV2State
```typescript
import { useFlashListV2State } from '@/lib/utils/flashlist-v2-hooks';

function MessageItem({ message }: { message: Message }) {
  // State that resets when item is recycled
  const [isExpanded, setIsExpanded] = useFlashListV2State(
    false, // initial state
    [message.id], // dependencies - resets when message.id changes
    () => setIsExpanded(false) // reset callback
  );

  return (
    <Pressable onPress={() => setIsExpanded(!isExpanded)}>
      <Text>{isExpanded ? message.fullText : message.preview}</Text>
    </Pressable>
  );
}
```

#### useFlashListLayout
```typescript
import { useFlashListLayout } from '@/lib/utils/flashlist-v2-hooks';

function PlantCard({ plant }: { plant: Plant }) {
  // Layout state that communicates with FlashList
  const [cardHeight, setCardHeight] = useFlashListLayout(200);

  return (
    <View 
      onLayout={(event) => {
        const { height } = event.nativeEvent.layout;
        setCardHeight(height);
      }}
      style={{ height: cardHeight }}
    >
      <PlantImage plant={plant} />
      <PlantDetails plant={plant} />
    </View>
  );
}
```

### 3. Performance Monitoring

```typescript
import { 
  enableV2PerformanceMonitoring,
  getV2PerformanceMetrics 
} from '@/lib/utils/flashlist-performance';

// Enable monitoring
enableV2PerformanceMonitoring({
  trackRenderingPerformance: true,
  trackMemoryUsage: true,
  trackScrollPerformance: true
});

// Get metrics
const metrics = getV2PerformanceMetrics();
console.log('Auto-sizing efficiency:', metrics.autoSizingEfficiency);
console.log('Memory optimization:', metrics.memoryUsageOptimization);
console.log('Scroll performance:', metrics.renderingPerformance);
```

## Performance Optimization

### 1. Memory Management

```typescript
const config = optimizeFlashListV2Performance({
  // Intelligent caching strategies
  enableIntelligentCaching: true,
  cacheStrategy: 'hybrid', // 'memory' | 'hybrid' | 'minimal'
  
  // Memory limits
  maxMemoryUsage: 30, // MB
  enableMemoryOptimization: true,
  
  // Auto-cleanup
  enableAutoCleanup: true
});
```

### 2. Large Dataset Optimization

```typescript
// For datasets with 10k+ items
const config = optimizeFlashListV2Performance({
  preset: 'LARGE_DATASET',
  enableAutoSizing: true,
  cacheStrategy: 'minimal',
  maxMemoryUsage: 25,
  enableV2Metrics: true
});
```

### 3. Masonry Performance

```typescript
// Optimized for image galleries
const config = optimizeFlashListV2Performance({
  preset: 'MASONRY_GRID',
  masonry: true,
  enableIntelligentCaching: false, // Better for varying heights
  cacheStrategy: 'minimal',
  maxMemoryUsage: 25
});
```

## Troubleshooting

### Common Issues and Solutions

#### 1. "estimatedItemSize is no longer needed" Warning

**Issue:** You're still passing `estimatedItemSize` prop.

**Solution:**
```typescript
// Remove this prop
- estimatedItemSize={120}

// v2 handles sizing automatically
```

#### 2. Scroll Position Not Maintained

**Issue:** Content jumps when new items are added.

**Solution:**
```typescript
// Add maintainVisibleContentPosition
<FlashListWrapper
  data={items}
  maintainVisibleContentPosition={{
    autoscrollToBottomThreshold: 0.2
  }}
  renderItem={renderItem}
/>
```

#### 3. TypeScript Errors with Refs

**Issue:** `Property 'scrollToIndex' does not exist on type 'FlashList<T>'`

**Solution:**
```typescript
// Update import and ref type
import { FlashList, FlashListRef } from '@shopify/flash-list';

const listRef = useRef<FlashListRef<ItemType>>(null);
```

#### 4. Masonry Layout Not Working

**Issue:** Items not arranging in masonry layout.

**Solution:**
```typescript
// Use masonry prop instead of MasonryFlashList
<FlashListWrapper
  data={items}
  masonry={true}
  numColumns={2}
  renderItem={renderItem}
/>
```

#### 5. Performance Degradation

**Issue:** List performance is worse than v1.

**Solution:**
```typescript
// Enable v2 optimizations
const config = optimizeFlashListV2Performance({
  enableAutoSizing: true,
  enableIntelligentCaching: true,
  cacheStrategy: 'hybrid',
  enableV2Metrics: true
});
```

#### 6. Memory Issues with Large Lists

**Issue:** App crashes or high memory usage.

**Solution:**
```typescript
// Optimize memory settings
const config = optimizeFlashListV2Performance({
  maxMemoryUsage: 20, // Reduce memory limit
  cacheStrategy: 'minimal',
  enableAutoCleanup: true,
  enableMemoryOptimization: true
});
```

#### 7. Hooks Not Working Properly

**Issue:** `useFlashListV2State` not resetting properly.

**Solution:**
```typescript
// Ensure dependencies are correct
const [state, setState] = useFlashListV2State(
  initialValue,
  [item.id], // Include all relevant dependencies
  () => setState(initialValue) // Proper reset callback
);
```

### Performance Debugging

#### 1. Enable Debug Mode

```typescript
// Add to your development environment
if (__DEV__) {
  enableV2PerformanceMonitoring({
    trackRenderingPerformance: true,
    trackMemoryUsage: true,
    logPerformanceMetrics: true
  });
}
```

#### 2. Monitor Metrics

```typescript
// Check performance metrics
const metrics = getV2PerformanceMetrics();

if (metrics.renderingPerformance.droppedFrames > 5) {
  console.warn('High frame drops detected');
}

if (metrics.memoryUsageOptimization < 0.8) {
  console.warn('Memory optimization could be improved');
}
```

#### 3. Analyze Auto-sizing Efficiency

```typescript
// Check if auto-sizing is working well
const metrics = getV2PerformanceMetrics();

if (metrics.autoSizingEfficiency < 0.9) {
  // Consider providing size hints for complex items
  console.log('Auto-sizing efficiency could be improved');
}
```

## Migration Checklist

### Pre-Migration
- [ ] Backup current FlashList implementations
- [ ] Review all FlashListWrapper usage in codebase
- [ ] Identify performance-critical lists
- [ ] Test current performance benchmarks

### During Migration
- [ ] Remove all `estimatedItemSize` props
- [ ] Remove all `estimatedListSize` props
- [ ] Update `inverted` to `maintainVisibleContentPosition`
- [ ] Update ref types to `FlashListRef<T>`
- [ ] Replace `MasonryFlashList` with `masonry` prop
- [ ] Update performance configurations
- [ ] Update `overrideItemLayout` usage

### Post-Migration
- [ ] Test all list components
- [ ] Verify scroll behavior
- [ ] Check memory usage
- [ ] Validate performance improvements
- [ ] Test on both iOS and Android
- [ ] Update documentation
- [ ] Train team on new features

## Best Practices

### 1. Use Appropriate Presets

```typescript
// For chat interfaces
preset: 'LARGE_MESSAGE_HISTORY'

// For activity feeds
preset: 'ACTIVITY_FEED'

// For image galleries
preset: 'MASONRY_GRID'

// For large datasets
preset: 'LARGE_DATASET'
```

### 2. Configure maintainVisibleContentPosition

```typescript
// For chat (bottom-anchored)
maintainVisibleContentPosition: {
  startRenderingFromBottom: true,
  autoscrollToBottomThreshold: 0.2
}

// For feeds (top-anchored)
maintainVisibleContentPosition: {
  autoscrollToTopThreshold: 0.1
}
```

### 3. Optimize Memory Usage

```typescript
// For memory-constrained scenarios
{
  maxMemoryUsage: 20,
  cacheStrategy: 'minimal',
  enableAutoCleanup: true
}

// For performance-critical scenarios
{
  maxMemoryUsage: 40,
  cacheStrategy: 'hybrid',
  enableIntelligentCaching: true
}
```

### 4. Use Hooks Appropriately

```typescript
// For item state that should reset on recycling
const [state, setState] = useFlashListV2State(initial, deps, reset);

// For layout communication with FlashList
const [height, setHeight] = useFlashListLayout(initialHeight);
```

## Support and Resources

- **FlashList v2 Documentation**: [Official Docs](https://shopify.github.io/flash-list/)
- **Performance Guide**: `docs/flashlist-v2-performance-monitoring-implementation.md`
- **Hooks Guide**: `docs/flashlist-v2-hooks-guide.md`
- **Memory Management**: `docs/flashlist-v2-memory-management-implementation.md`
- **Test Examples**: `__tests__/flashlist-v2-integration.test.ts`

For additional support, check the troubleshooting section or create an issue in the project repository.