# FlashList v2 Troubleshooting Guide

## Common Issues and Solutions

### 1. Migration Issues

#### Issue: "estimatedItemSize is no longer needed" Warning

**Symptoms:**
- Console warning about deprecated `estimatedItemSize` prop
- List still works but shows migration warnings

**Cause:**
Still passing v1 props to FlashList v2 components.

**Solution:**
```typescript
// ❌ Remove deprecated props
<FlashListWrapper
  data={items}
  estimatedItemSize={120} // Remove this
  estimatedListSize={{ height: 600, width: 350 }} // Remove this
  renderItem={renderItem}
/>

// ✅ Use v2 automatic sizing
<FlashListWrapper
  data={items}
  // No size estimation needed
  renderItem={renderItem}
/>
```

**Prevention:**
- Use the migration detection utility to find all deprecated props
- Run the migration warnings test suite

#### Issue: TypeScript Errors with FlashList Refs

**Symptoms:**
```
Property 'scrollToIndex' does not exist on type 'FlashList<T>'
Type 'FlashList<T>' is not assignable to type 'FlashListRef<T>'
```

**Cause:**
Using old v1 ref types instead of v2 `FlashListRef`.

**Solution:**
```typescript
// ❌ Old v1 import and type
import { FlashList } from '@shopify/flash-list';
const listRef = useRef<FlashList<ItemType>>(null);

// ✅ New v2 import and type
import { FlashList, FlashListRef } from '@shopify/flash-list';
const listRef = useRef<FlashListRef<ItemType>>(null);
```

**Prevention:**
- Update all FlashList imports to include `FlashListRef`
- Use TypeScript strict mode to catch these errors early

#### Issue: Masonry Layout Not Working

**Symptoms:**
- Items not arranging in masonry/staggered layout
- All items have same height despite varying content

**Cause:**
Still using `MasonryFlashList` component instead of `masonry` prop.

**Solution:**
```typescript
// ❌ Old v1 MasonryFlashList component
import { MasonryFlashList } from '@shopify/flash-list';

<MasonryFlashList
  data={photos}
  numColumns={2}
  renderItem={renderItem}
/>

// ✅ New v2 masonry prop
import { FlashList } from '@shopify/flash-list';

<FlashListWrapper
  data={photos}
  masonry={true}
  numColumns={2}
  renderItem={renderItem}
/>
```

**Prevention:**
- Search codebase for `MasonryFlashList` usage
- Update all masonry implementations to use the `masonry` prop

### 2. Performance Issues

#### Issue: Poor Scroll Performance

**Symptoms:**
- Choppy scrolling
- Frame drops during scroll
- High `scrollJankPercentage` in metrics

**Diagnosis:**
```typescript
import { getV2PerformanceMetrics } from '@/lib/utils/flashlist-performance';

const metrics = getV2PerformanceMetrics();
console.log('Scroll performance:', metrics.scrollPerformance);

if (metrics.scrollPerformance.scrollJankPercentage > 0.1) {
  console.warn('High scroll jank detected');
}
```

**Solutions:**

1. **Reduce Memory Usage:**
```typescript
const config = optimizeFlashListV2Performance({
  maxMemoryUsage: 20, // Reduce from default
  cacheStrategy: 'minimal',
  enableAutoCleanup: true
});
```

2. **Optimize Item Rendering:**
```typescript
// Use React.memo for expensive items
const OptimizedItem = React.memo(({ item }) => (
  <ExpensiveItemComponent item={item} />
));

// Provide item type hints
const config = optimizeFlashListV2Performance({
  itemTypeExtractor: (item) => item.type || 'default'
});
```

3. **Enable Performance Monitoring:**
```typescript
enableV2PerformanceMonitoring({
  trackScrollPerformance: true,
  onPerformanceIssue: (issue) => {
    console.warn('Performance issue:', issue);
  }
});
```

#### Issue: High Memory Usage

**Symptoms:**
- App crashes on low-memory devices
- High `currentMemoryUsage` in metrics
- Memory warnings in development

**Diagnosis:**
```typescript
const metrics = getV2PerformanceMetrics();
console.log('Memory usage:', metrics.currentMemoryUsage, 'MB');

if (metrics.currentMemoryUsage > 50) {
  console.warn('High memory usage detected');
}
```

**Solutions:**

1. **Aggressive Memory Optimization:**
```typescript
const config = optimizeFlashListV2Performance({
  maxMemoryUsage: 15, // Very conservative
  cacheStrategy: 'minimal',
  enableIntelligentCaching: false,
  enableAutoCleanup: true,
  cleanupInterval: 10000 // Clean every 10 seconds
});
```

2. **Enable Memory Pressure Detection:**
```typescript
import { enableMemoryPressureDetection } from '@/lib/utils/flashlist-performance';

enableMemoryPressureDetection({
  threshold: 0.7, // 70% memory usage
  onPressureDetected: () => {
    // Force cleanup
    console.log('Memory pressure detected, cleaning up...');
  }
});
```

3. **Optimize Dataset:**
```typescript
const optimizedData = optimizeDatasetV2(largeDataset, {
  enableMemoryOptimization: true,
  maxCacheSize: 100, // Limit cached items
  enableDataTransformation: true
});
```

#### Issue: Slow Initial Render

**Symptoms:**
- Long delay before list appears
- High `initialRenderTime` in metrics
- Poor user experience on app launch

**Diagnosis:**
```typescript
const metrics = getV2PerformanceMetrics();
console.log('Initial render time:', metrics.renderingPerformance.initialRenderTime, 'ms');

if (metrics.renderingPerformance.initialRenderTime > 500) {
  console.warn('Slow initial render detected');
}
```

**Solutions:**

1. **Optimize Auto-sizing:**
```typescript
// Check auto-sizing efficiency
const metrics = getV2PerformanceMetrics();
if (metrics.autoSizingEfficiency < 0.8) {
  // Provide size hints for complex items
  const config = optimizeFlashListV2Performance({
    itemTypeExtractor: (item) => {
      // More specific item types help auto-sizing
      if (item.hasImage) return 'image-item';
      if (item.hasVideo) return 'video-item';
      if (item.isExpanded) return 'expanded-item';
      return 'text-item';
    }
  });
}
```

2. **Use Appropriate Preset:**
```typescript
// For large datasets
const config = optimizeFlashListV2Performance({
  preset: 'LARGE_DATASET', // Optimized for initial render
  enableAutoSizing: true
});
```

3. **Implement Progressive Loading:**
```typescript
// Load initial batch quickly, then load more
const [data, setData] = useState(initialBatch);

useEffect(() => {
  // Load remaining data after initial render
  setTimeout(() => {
    setData(fullDataset);
  }, 100);
}, []);
```

### 3. Scroll Position Issues

#### Issue: Scroll Position Not Maintained

**Symptoms:**
- List jumps when new content is added
- Chat messages don't stay at bottom
- Feed position resets unexpectedly

**Cause:**
Not using `maintainVisibleContentPosition` properly.

**Solution:**

1. **For Chat Interfaces (Bottom-anchored):**
```typescript
<FlashListWrapper
  data={messages}
  maintainVisibleContentPosition={{
    startRenderingFromBottom: true,
    autoscrollToBottomThreshold: 0.2,
    animateAutoScrollToBottom: true
  }}
  renderItem={renderMessage}
/>
```

2. **For Feeds (Top-anchored):**
```typescript
<FlashListWrapper
  data={feedItems}
  maintainVisibleContentPosition={{
    autoscrollToTopThreshold: 0.1
  }}
  renderItem={renderFeedItem}
/>
```

3. **Custom Scroll Behavior:**
```typescript
<FlashListWrapper
  data={items}
  maintainVisibleContentPosition={{
    disabled: false,
    autoscrollToTopThreshold: 0.05,
    autoscrollToBottomThreshold: 0.15,
    // Custom thresholds for specific use case
  }}
  renderItem={renderItem}
/>
```

#### Issue: Inverted List Not Working

**Symptoms:**
- List doesn't render from bottom
- Chat interface shows oldest messages first

**Cause:**
Using deprecated `inverted` prop instead of `maintainVisibleContentPosition`.

**Solution:**
```typescript
// ❌ Deprecated inverted prop
<FlashListWrapper
  data={messages}
  inverted={true}
  renderItem={renderMessage}
/>

// ✅ Use maintainVisibleContentPosition
<FlashListWrapper
  data={messages}
  maintainVisibleContentPosition={{
    startRenderingFromBottom: true
  }}
  renderItem={renderMessage}
/>
```

### 4. Hook-Related Issues

#### Issue: useFlashListV2State Not Resetting

**Symptoms:**
- Item state persists when it should reset
- Expanded items stay expanded when recycled
- Stale state in recycled items

**Cause:**
Incorrect dependencies or missing reset callback.

**Solution:**
```typescript
// ❌ Incorrect dependencies
const [isExpanded, setIsExpanded] = useFlashListV2State(
  false,
  [], // Empty dependencies - won't reset
  () => setIsExpanded(false)
);

// ✅ Correct dependencies
const [isExpanded, setIsExpanded] = useFlashListV2State(
  false,
  [item.id], // Reset when item changes
  () => setIsExpanded(false)
);

// ✅ Multiple dependencies
const [state, setState] = useFlashListV2State(
  initialState,
  [item.id, item.version], // Reset on ID or version change
  () => setState(initialState)
);
```

#### Issue: useFlashListLayout Not Updating

**Symptoms:**
- Layout changes not reflected in list
- Items have incorrect heights
- Visual glitches during layout changes

**Cause:**
Not properly communicating layout changes to FlashList.

**Solution:**
```typescript
// ❌ Not updating layout state
const [height, setHeight] = useFlashListLayout(200);

return (
  <View onLayout={(event) => {
    const { height: newHeight } = event.nativeEvent.layout;
    // Not calling setHeight - layout not communicated
  }}>
    <Content />
  </View>
);

// ✅ Properly updating layout state
const [height, setHeight] = useFlashListLayout(200);

return (
  <View onLayout={(event) => {
    const { height: newHeight } = event.nativeEvent.layout;
    setHeight(newHeight); // Communicate layout change
  }}>
    <Content />
  </View>
);
```

### 5. Android-Specific Issues

#### Issue: Keyboard Behavior on Android

**Symptoms:**
- List doesn't adjust when keyboard appears
- Content hidden behind keyboard
- Poor chat experience on Android

**Solution:**
```typescript
<FlashListWrapper
  data={messages}
  maintainVisibleContentPosition={{
    startRenderingFromBottom: true,
    autoscrollToBottomThreshold: 0.2
  }}
  // Android-specific optimization
  stickyToBottomOnAndroid={true}
  renderItem={renderMessage}
/>
```

#### Issue: Performance Issues on Lower-End Android Devices

**Symptoms:**
- Choppy scrolling on older Android devices
- High memory usage warnings
- App crashes on low-memory devices

**Solution:**
```typescript
import { Platform } from 'react-native';

// Adjust config for Android
const config = optimizeFlashListV2Performance({
  preset: 'LARGE_DATASET',
  maxMemoryUsage: Platform.OS === 'android' ? 15 : 25,
  cacheStrategy: Platform.OS === 'android' ? 'minimal' : 'hybrid',
  enableAutoCleanup: Platform.OS === 'android'
});
```

### 6. Development and Debugging Issues

#### Issue: Performance Metrics Not Available

**Symptoms:**
- `getV2PerformanceMetrics()` returns empty object
- No performance data in development

**Cause:**
Performance monitoring not enabled.

**Solution:**
```typescript
// Enable monitoring in development
if (__DEV__) {
  enableV2PerformanceMonitoring({
    trackRenderingPerformance: true,
    trackMemoryUsage: true,
    trackScrollPerformance: true,
    logPerformanceMetrics: true
  });
}
```

#### Issue: Migration Warnings Not Showing

**Symptoms:**
- Using deprecated props but no warnings appear
- Migration issues not detected

**Cause:**
Migration detection not enabled.

**Solution:**
```typescript
// Enable migration warnings in development
if (__DEV__) {
  import('@/lib/utils/flashlist-migration-warnings').then(({ enableMigrationWarnings }) => {
    enableMigrationWarnings({
      logWarnings: true,
      throwOnDeprecated: false // Set to true for strict mode
    });
  });
}
```

### 7. Production Issues

#### Issue: Performance Degradation in Production

**Symptoms:**
- Good performance in development, poor in production
- Users reporting slow scrolling
- High crash rates on production

**Diagnosis:**
```typescript
// Enable lightweight production monitoring
enableV2PerformanceMonitoring({
  trackRenderingPerformance: true,
  trackMemoryUsage: true,
  logPerformanceMetrics: false, // Don't log in production
  reportToAnalytics: true // Send to your analytics service
});
```

**Solutions:**

1. **Device-Specific Optimization:**
```typescript
import { getDeviceCapabilities } from '@/lib/utils/flashlist-performance';

const deviceCaps = getDeviceCapabilities();
const config = optimizeFlashListV2Performance({
  maxMemoryUsage: deviceCaps.memory < 2000 ? 15 : 30, // Adjust for device memory
  cacheStrategy: deviceCaps.cpu < 4 ? 'minimal' : 'hybrid' // Adjust for CPU cores
});
```

2. **Network-Aware Configuration:**
```typescript
import NetInfo from '@react-native-async-storage/async-storage';

const networkState = await NetInfo.fetch();
const config = optimizeFlashListV2Performance({
  // Reduce memory usage on slow networks
  maxMemoryUsage: networkState.isConnected && networkState.type === 'wifi' ? 35 : 20,
  enableIntelligentCaching: networkState.isConnected
});
```

## Diagnostic Tools

### Performance Profiler

```typescript
import { profileV2Performance } from '@/lib/utils/flashlist-performance';

// Profile specific operations
const profile = await profileV2Performance(async () => {
  // Your problematic code here
  await loadLargeDataset();
  setData(newData);
});

console.log('Performance profile:', {
  duration: profile.duration,
  memoryUsage: profile.memoryUsage,
  renderingMetrics: profile.renderingMetrics
});
```

### Memory Leak Detector

```typescript
import { detectMemoryLeaks } from '@/lib/utils/flashlist-performance';

const leakDetector = detectMemoryLeaks({
  monitorInterval: 5000,
  memoryThreshold: 1.5, // 50% increase
  onLeakDetected: (leak) => {
    console.warn('Memory leak detected:', leak);
    // Send to crash reporting service
  }
});

// Stop monitoring when component unmounts
useEffect(() => {
  return () => leakDetector.stop();
}, []);
```

### Auto-sizing Analyzer

```typescript
import { analyzeAutoSizing } from '@/lib/utils/flashlist-performance';

const analysis = analyzeAutoSizing({
  data: yourData,
  renderItem: yourRenderItem,
  sampleSize: 100 // Analyze first 100 items
});

console.log('Auto-sizing analysis:', {
  efficiency: analysis.efficiency,
  averageAccuracy: analysis.averageAccuracy,
  recommendations: analysis.recommendations
});
```

## Prevention Strategies

### 1. Automated Testing

```typescript
// Add performance regression tests
describe('FlashList v2 Performance', () => {
  it('should maintain good scroll performance', async () => {
    const metrics = await measureScrollPerformance();
    expect(metrics.scrollJankPercentage).toBeLessThan(0.1);
  });

  it('should not exceed memory limits', async () => {
    const metrics = await measureMemoryUsage();
    expect(metrics.currentMemoryUsage).toBeLessThan(30);
  });
});
```

### 2. Performance Monitoring

```typescript
// Set up continuous monitoring
setupPerformanceAlerts({
  maxDroppedFrames: 5,
  maxMemoryUsage: 40,
  minAutoSizingEfficiency: 0.8,
  onAlert: (alert) => {
    // Send to monitoring service
    reportPerformanceIssue(alert);
  }
});
```

### 3. Code Review Checklist

- [ ] No deprecated v1 props used
- [ ] Proper ref types (`FlashListRef<T>`)
- [ ] Appropriate performance preset selected
- [ ] Memory limits configured for target devices
- [ ] `maintainVisibleContentPosition` configured correctly
- [ ] Hooks used with proper dependencies
- [ ] Performance monitoring enabled in development

### 4. Migration Validation

```typescript
// Run migration validation tests
import { validateV2Migration } from '@/lib/utils/flashlist-migration-warnings';

const validationResults = validateV2Migration({
  checkDeprecatedProps: true,
  checkPerformanceConfig: true,
  checkHookUsage: true
});

if (validationResults.hasIssues) {
  console.error('Migration issues found:', validationResults.issues);
}
```

## Getting Help

### 1. Enable Debug Mode

```typescript
if (__DEV__) {
  enableV2DebugMode({
    logAutoSizing: true,
    logMemoryUsage: true,
    logRenderingMetrics: true,
    visualizeRecycling: true
  });
}
```

### 2. Collect Diagnostic Information

```typescript
import { collectDiagnosticInfo } from '@/lib/utils/flashlist-performance';

const diagnostics = collectDiagnosticInfo();
console.log('Diagnostic information:', diagnostics);
```

### 3. Report Issues

When reporting issues, include:
- Device information (OS, memory, CPU)
- FlashList configuration used
- Performance metrics
- Sample data structure
- Reproduction steps

### 4. Resources

- **Migration Guide**: `docs/flashlist-v2-migration-guide.md`
- **Performance Guide**: `docs/flashlist-v2-performance-utilities.md`
- **Hooks Guide**: `docs/flashlist-v2-hooks-guide.md`
- **Test Examples**: `__tests__/flashlist-v2-integration.test.ts`
- **Official Documentation**: [FlashList v2 Docs](https://shopify.github.io/flash-list/)

For complex issues, consider creating a minimal reproduction case and consulting the FlashList community or documentation.