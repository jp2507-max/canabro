# FlashList v2 Performance Utilities Documentation

## Overview

The FlashList v2 performance utilities provide optimized configurations and monitoring tools for FlashList v2's new architecture. These utilities leverage automatic sizing, enhanced memory management, and intelligent caching strategies.

## Core Functions

### `optimizeFlashListV2Performance(config)`

Optimizes FlashList v2 performance with intelligent defaults and v2-specific features.

**Parameters:**
```typescript
interface FlashListV2PerformanceConfig {
  // V2-specific optimizations
  enableAutoSizing?: boolean;
  maintainVisibleContentPosition?: {
    autoscrollToTopThreshold?: number;
    autoscrollToBottomThreshold?: number;
    startRenderingFromBottom?: boolean;
    animateAutoScrollToBottom?: boolean;
  };
  
  // Enhanced memory management
  maxMemoryUsage?: number; // MB
  enableMemoryOptimization?: boolean;
  enableIntelligentCaching?: boolean;
  cacheStrategy?: 'memory' | 'hybrid' | 'minimal';
  enableAutoCleanup?: boolean;
  
  // Performance monitoring
  enableV2Metrics?: boolean;
  trackRenderingPerformance?: boolean;
  trackMemoryUsage?: boolean;
  trackScrollPerformance?: boolean;
  logPerformanceMetrics?: boolean;
  
  // Masonry support
  masonry?: boolean;
  
  // Preset configurations
  preset?: 'LARGE_MESSAGE_HISTORY' | 'ACTIVITY_FEED' | 'MASONRY_GRID' | 'LARGE_DATASET';
}
```

**Example Usage:**
```typescript
import { optimizeFlashListV2Performance } from '@/lib/utils/flashlist-performance';

// Basic optimization
const config = optimizeFlashListV2Performance({
  enableAutoSizing: true,
  enableMemoryOptimization: true
});

// Chat interface optimization
const chatConfig = optimizeFlashListV2Performance({
  preset: 'LARGE_MESSAGE_HISTORY',
  maintainVisibleContentPosition: {
    startRenderingFromBottom: true,
    autoscrollToBottomThreshold: 0.2
  }
});

// Masonry gallery optimization
const galleryConfig = optimizeFlashListV2Performance({
  preset: 'MASONRY_GRID',
  masonry: true,
  cacheStrategy: 'minimal'
});
```

### `optimizeDatasetV2(data, options)`

Optimizes datasets for FlashList v2's automatic sizing and recycling system.

**Parameters:**
```typescript
interface DatasetV2OptimizationOptions {
  // Item type detection for better recycling
  enableItemTypeDetection?: boolean;
  itemTypeExtractor?: (item: any) => string;
  
  // V2-compatible data transformations
  enableDataTransformation?: boolean;
  transformationStrategy?: 'minimal' | 'aggressive';
  
  // Masonry-specific optimizations
  enableMasonryOptimization?: boolean;
  masonryColumns?: number;
  
  // Memory optimization
  enableMemoryOptimization?: boolean;
  maxCacheSize?: number;
}
```

**Example Usage:**
```typescript
import { optimizeDatasetV2 } from '@/lib/utils/flashlist-performance';

// Basic dataset optimization
const optimizedData = optimizeDatasetV2(plants, {
  enableItemTypeDetection: true,
  itemTypeExtractor: (plant) => plant.growthStage
});

// Masonry dataset optimization
const optimizedPhotos = optimizeDatasetV2(photos, {
  enableMasonryOptimization: true,
  masonryColumns: 2,
  enableMemoryOptimization: true
});
```

## Performance Presets

### LARGE_MESSAGE_HISTORY

Optimized for chat interfaces with thousands of messages.

```typescript
const preset = {
  enableAutoSizing: true,
  maintainVisibleContentPosition: {
    autoscrollToBottomThreshold: 0.2,
    startRenderingFromBottom: true,
    animateAutoScrollToBottom: true
  },
  enableIntelligentCaching: true,
  cacheStrategy: 'hybrid',
  maxMemoryUsage: 30,
  enableV2Metrics: true,
  trackRenderingPerformance: true
};
```

**Use Cases:**
- Chat applications
- Message history
- Comment threads
- Real-time feeds

### ACTIVITY_FEED

Optimized for social feeds and activity streams.

```typescript
const preset = {
  enableAutoSizing: true,
  maintainVisibleContentPosition: {
    autoscrollToTopThreshold: 0.1
  },
  enableIntelligentCaching: true,
  cacheStrategy: 'memory',
  maxMemoryUsage: 40,
  enableV2Metrics: true,
  trackScrollPerformance: true
};
```

**Use Cases:**
- Social media feeds
- Activity streams
- News feeds
- Notification lists

### MASONRY_GRID

Optimized for image galleries and masonry layouts.

```typescript
const preset = {
  masonry: true,
  enableAutoSizing: true,
  enableIntelligentCaching: false, // Better for varying heights
  cacheStrategy: 'minimal',
  maxMemoryUsage: 25,
  enableV2Metrics: true,
  trackMemoryUsage: true
};
```

**Use Cases:**
- Photo galleries
- Pinterest-style layouts
- Product grids
- Card layouts with varying heights

### LARGE_DATASET

Optimized for datasets with 10k+ items.

```typescript
const preset = {
  enableAutoSizing: true,
  enableIntelligentCaching: true,
  cacheStrategy: 'minimal',
  maxMemoryUsage: 20,
  enableAutoCleanup: true,
  enableV2Metrics: true,
  trackMemoryUsage: true,
  trackRenderingPerformance: true
};
```

**Use Cases:**
- Large contact lists
- Extensive product catalogs
- Search results
- Data tables

## Memory Management

### Intelligent Caching

FlashList v2 includes intelligent caching strategies:

```typescript
// Memory-optimized caching
{
  enableIntelligentCaching: true,
  cacheStrategy: 'memory', // Prioritizes memory efficiency
  maxMemoryUsage: 25
}

// Performance-optimized caching
{
  enableIntelligentCaching: true,
  cacheStrategy: 'hybrid', // Balances memory and performance
  maxMemoryUsage: 35
}

// Minimal caching (for varying content)
{
  enableIntelligentCaching: false,
  cacheStrategy: 'minimal', // Minimal caching overhead
  maxMemoryUsage: 20
}
```

### Memory Pressure Detection

```typescript
import { 
  enableMemoryPressureDetection,
  getMemoryPressureStatus 
} from '@/lib/utils/flashlist-performance';

// Enable automatic memory pressure detection
enableMemoryPressureDetection({
  threshold: 0.8, // 80% memory usage threshold
  onPressureDetected: () => {
    // Automatically reduce cache size
    console.log('Memory pressure detected, optimizing...');
  }
});

// Check current memory status
const memoryStatus = getMemoryPressureStatus();
if (memoryStatus.pressure > 0.8) {
  // Take action to reduce memory usage
}
```

### Auto-cleanup

```typescript
// Enable automatic cleanup
{
  enableAutoCleanup: true,
  cleanupInterval: 30000, // 30 seconds
  cleanupThreshold: 0.7 // Clean when 70% memory used
}
```

## Performance Monitoring

### V2 Performance Metrics

```typescript
import { 
  enableV2PerformanceMonitoring,
  getV2PerformanceMetrics 
} from '@/lib/utils/flashlist-performance';

// Enable comprehensive monitoring
enableV2PerformanceMonitoring({
  trackRenderingPerformance: true,
  trackMemoryUsage: true,
  trackScrollPerformance: true,
  trackAutoSizingEfficiency: true,
  logPerformanceMetrics: __DEV__
});

// Get current metrics
const metrics = getV2PerformanceMetrics();
```

**Metrics Interface:**
```typescript
interface V2PerformanceMetrics {
  // Auto-sizing efficiency
  autoSizingEfficiency: number; // 0-1 (1 = perfect)
  averageSizingAccuracy: number; // 0-1
  sizingCalculationTime: number; // ms
  
  // Memory optimization
  memoryUsageOptimization: number; // 0-1 (1 = optimal)
  currentMemoryUsage: number; // MB
  peakMemoryUsage: number; // MB
  cacheHitRate: number; // 0-1
  
  // Rendering performance
  renderingPerformance: {
    averageFrameTime: number; // ms
    droppedFrames: number;
    smoothScrollPercentage: number; // 0-1
    initialRenderTime: number; // ms
  };
  
  // Scroll performance
  scrollPerformance: {
    averageScrollFPS: number;
    scrollJankPercentage: number; // 0-1
    scrollResponseTime: number; // ms
  };
}
```

### Performance Alerts

```typescript
import { setupPerformanceAlerts } from '@/lib/utils/flashlist-performance';

setupPerformanceAlerts({
  // Alert when frame drops exceed threshold
  maxDroppedFrames: 5,
  onFrameDropAlert: (count) => {
    console.warn(`High frame drops: ${count}`);
  },
  
  // Alert when memory usage is high
  maxMemoryUsage: 50, // MB
  onMemoryAlert: (usage) => {
    console.warn(`High memory usage: ${usage}MB`);
  },
  
  // Alert when auto-sizing efficiency is low
  minAutoSizingEfficiency: 0.8,
  onAutoSizingAlert: (efficiency) => {
    console.warn(`Low auto-sizing efficiency: ${efficiency}`);
  }
});
```

## Hook Utilities

### `useFlashListV2State`

Manages item state that resets when items are recycled.

```typescript
import { useFlashListV2State } from '@/lib/utils/flashlist-v2-hooks';

function MessageItem({ message }: { message: Message }) {
  const [isExpanded, setIsExpanded] = useFlashListV2State(
    false, // initial state
    [message.id], // dependencies - resets when changed
    () => setIsExpanded(false) // reset callback
  );

  return (
    <Pressable onPress={() => setIsExpanded(!isExpanded)}>
      <Text numberOfLines={isExpanded ? undefined : 2}>
        {message.content}
      </Text>
    </Pressable>
  );
}
```

### `useFlashListLayout`

Communicates layout changes directly to FlashList for optimal performance.

```typescript
import { useFlashListLayout } from '@/lib/utils/flashlist-v2-hooks';

function DynamicHeightCard({ item }: { item: any }) {
  const [cardHeight, setCardHeight] = useFlashListLayout(200);

  return (
    <View 
      onLayout={(event) => {
        const { height } = event.nativeEvent.layout;
        setCardHeight(height);
      }}
      style={{ minHeight: cardHeight }}
    >
      <DynamicContent item={item} />
    </View>
  );
}
```

## Advanced Optimizations

### Custom Item Type Detection

```typescript
// Improve recycling efficiency with custom item types
const config = optimizeFlashListV2Performance({
  enableAutoSizing: true,
  itemTypeExtractor: (item) => {
    if (item.type === 'image') return 'image-item';
    if (item.type === 'text') return 'text-item';
    if (item.hasMedia) return 'media-item';
    return 'default-item';
  }
});
```

### Dynamic Performance Adjustment

```typescript
import { 
  adjustPerformanceConfig,
  getDeviceCapabilities 
} from '@/lib/utils/flashlist-performance';

// Adjust performance based on device capabilities
const deviceCaps = getDeviceCapabilities();
const config = adjustPerformanceConfig({
  baseConfig: optimizeFlashListV2Performance({ preset: 'ACTIVITY_FEED' }),
  deviceMemory: deviceCaps.memory,
  deviceCPU: deviceCaps.cpu,
  networkSpeed: deviceCaps.network
});
```

### Batch Operations

```typescript
import { batchV2Operations } from '@/lib/utils/flashlist-performance';

// Batch multiple list operations for better performance
batchV2Operations(() => {
  // Multiple data updates
  setData1(newData1);
  setData2(newData2);
  setData3(newData3);
}, {
  debounceMs: 16, // One frame
  maxBatchSize: 10
});
```

## Debugging and Profiling

### Debug Mode

```typescript
// Enable debug mode in development
if (__DEV__) {
  enableV2DebugMode({
    logAutoSizing: true,
    logMemoryUsage: true,
    logRenderingMetrics: true,
    visualizeRecycling: true
  });
}
```

### Performance Profiling

```typescript
import { profileV2Performance } from '@/lib/utils/flashlist-performance';

// Profile specific operations
const profile = await profileV2Performance(async () => {
  // Your list operations here
  await loadLargeDataset();
  await renderComplexItems();
});

console.log('Performance profile:', profile);
```

### Memory Leak Detection

```typescript
import { detectMemoryLeaks } from '@/lib/utils/flashlist-performance';

// Detect potential memory leaks
const leakDetection = detectMemoryLeaks({
  monitorInterval: 5000, // 5 seconds
  memoryThreshold: 1.5, // 50% increase threshold
  onLeakDetected: (leak) => {
    console.warn('Potential memory leak detected:', leak);
  }
});

// Stop monitoring when component unmounts
useEffect(() => {
  return () => leakDetection.stop();
}, []);
```

## Best Practices

### 1. Choose the Right Preset

```typescript
// For chat interfaces
preset: 'LARGE_MESSAGE_HISTORY'

// For social feeds
preset: 'ACTIVITY_FEED'

// For image galleries
preset: 'MASONRY_GRID'

// For large datasets
preset: 'LARGE_DATASET'
```

### 2. Configure Memory Appropriately

```typescript
// Low-end devices
{ maxMemoryUsage: 15, cacheStrategy: 'minimal' }

// Mid-range devices
{ maxMemoryUsage: 25, cacheStrategy: 'hybrid' }

// High-end devices
{ maxMemoryUsage: 40, cacheStrategy: 'memory' }
```

### 3. Monitor Performance in Production

```typescript
// Enable lightweight monitoring in production
enableV2PerformanceMonitoring({
  trackRenderingPerformance: true,
  trackMemoryUsage: true,
  logPerformanceMetrics: false, // Don't log in production
  reportToAnalytics: true // Send to your analytics service
});
```

### 4. Use Hooks Appropriately

```typescript
// For state that should reset on recycling
const [state, setState] = useFlashListV2State(initial, deps, reset);

// For layout communication
const [height, setHeight] = useFlashListLayout(initialHeight);
```

## Migration from v1 Performance Utilities

### Function Mapping

| v1 Function | v2 Function | Changes |
|-------------|-------------|---------|
| `optimizeFlashListPerformance` | `optimizeFlashListV2Performance` | Removed `estimatedItemSize`, added auto-sizing |
| `optimizeDataset` | `optimizeDatasetV2` | Removed size estimation, added item type detection |
| `getPerformanceMetrics` | `getV2PerformanceMetrics` | Enhanced metrics with auto-sizing data |
| `enablePerformanceMonitoring` | `enableV2PerformanceMonitoring` | Added v2-specific tracking |

### Configuration Migration

```typescript
// v1 Configuration
const v1Config = {
  estimatedItemSize: 120,
  enableMemoryOptimization: true,
  preset: 'LARGE_MESSAGE_HISTORY'
};

// v2 Configuration
const v2Config = {
  // estimatedItemSize removed - automatic sizing
  enableAutoSizing: true,
  enableMemoryOptimization: true,
  maintainVisibleContentPosition: {
    autoscrollToBottomThreshold: 0.2
  },
  preset: 'LARGE_MESSAGE_HISTORY'
};
```

## Troubleshooting

### Common Performance Issues

1. **High Memory Usage**
   - Reduce `maxMemoryUsage`
   - Use `cacheStrategy: 'minimal'`
   - Enable `enableAutoCleanup`

2. **Poor Scroll Performance**
   - Enable `trackScrollPerformance`
   - Check `scrollJankPercentage` metrics
   - Consider reducing `maxMemoryUsage`

3. **Slow Initial Render**
   - Check `autoSizingEfficiency` metrics
   - Consider providing item type hints
   - Use appropriate preset

4. **Memory Leaks**
   - Enable memory leak detection
   - Check hook usage patterns
   - Verify cleanup in useEffect

For more detailed troubleshooting, see the main migration guide.