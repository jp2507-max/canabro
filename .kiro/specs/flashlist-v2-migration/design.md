# Design Document

## Overview

This design outlines the migration of FlashList components from v1 to v2, leveraging the new architecture improvements and automatic sizing capabilities. The migration will update two main components: `FlashListWrapper.tsx` and `flashlist-performance.ts`, ensuring they work optimally with FlashList v2's new features while maintaining backward compatibility.

## Architecture

### Component Structure

```
components/ui/
├── FlashListWrapper.tsx (updated for v2)
└── AnimatedFlashList (exported from wrapper)

lib/utils/
├── flashlist-performance.ts (updated for v2)
└── performance presets (updated configurations)
```

### Key Changes from v1 to v2

1. **Automatic Sizing**: Remove all manual size estimation props
2. **New Ref Types**: Update from `FlashList<T>` to `FlashListRef<T>`
3. **maintainVisibleContentPosition**: Enabled by default with configuration options
4. **Masonry Support**: Use `masonry` prop instead of separate component
5. **Enhanced Hooks**: Support for `useLayoutState` and `useRecyclingState`
6. **Performance Optimizations**: Updated for v2's new rendering engine

## Components and Interfaces

### FlashListWrapper Component

**Updated Props Interface:**
```typescript
type WrapperExtraProps<ItemT> = {
  // Enhanced maintainVisibleContentPosition support
  maintainVisibleContentPosition?: {
    disabled?: boolean;
    autoscrollToTopThreshold?: number;
    autoscrollToBottomThreshold?: number;
    startRenderingFromBottom?: boolean;
    animateAutoScrollToBottom?: boolean;
  };
  
  // Android-specific optimizations
  stickyToBottomOnAndroid?: boolean;
  
  // Masonry layout support
  masonry?: boolean;
  
  // Performance optimization flags
  enableV2Optimizations?: boolean;
}
```

**Key Design Decisions:**
- Remove `estimatedItemSize` from default props (v2 handles automatically)
- Enable `maintainVisibleContentPosition` by default for better UX
- Maintain Android-specific bottom-pinning behavior
- Add masonry layout support through props
- Keep the same external API for backward compatibility

### Performance Utilities Update

**Updated Configuration Interface:**
```typescript
export interface FlashListV2PerformanceConfig {
  // Removed: estimatedItemSize (automatic in v2)
  
  // Enhanced memory management
  maxMemoryUsage?: number;
  enableMemoryOptimization?: boolean;
  
  // V2-specific optimizations
  enableAutoSizing?: boolean;
  maintainVisibleContentPosition?: {
    autoscrollToTopThreshold?: number;
    autoscrollToBottomThreshold?: number;
    startRenderingFromBottom?: boolean;
  };
  
  // Enhanced caching
  enableIntelligentCaching?: boolean;
  cacheStrategy?: 'memory' | 'hybrid' | 'minimal';
  
  // Performance monitoring
  enableV2Metrics?: boolean;
  trackRenderingPerformance?: boolean;
}
```

**New Hook Integrations:**
```typescript
// Support for v2 hooks
export function useFlashListV2State<T>(
  initialState: T,
  dependencies: any[],
  resetCallback?: () => void
) {
  // Wrapper around useRecyclingState
}

export function useFlashListLayout<T>(initialState: T) {
  // Wrapper around useLayoutState
}
```

## Data Models

### Updated Preset Configurations

**V2 Performance Presets:**
```typescript
export const FLASHLIST_V2_PRESETS = {
  LARGE_MESSAGE_HISTORY: {
    // Removed: estimatedItemSize
    maintainVisibleContentPosition: {
      autoscrollToBottomThreshold: 0.2,
      startRenderingFromBottom: true,
    },
    enableAutoSizing: true,
    enableIntelligentCaching: true,
    cacheStrategy: 'hybrid' as const,
    maxMemoryUsage: 30,
    enableV2Metrics: true,
  },
  
  ACTIVITY_FEED: {
    maintainVisibleContentPosition: {
      autoscrollToTopThreshold: 0.1,
    },
    enableAutoSizing: true,
    enableIntelligentCaching: true,
    cacheStrategy: 'memory' as const,
    maxMemoryUsage: 40,
  },
  
  MASONRY_GRID: {
    masonry: true,
    enableAutoSizing: true,
    enableIntelligentCaching: false, // Better for varying heights
    cacheStrategy: 'minimal' as const,
    maxMemoryUsage: 25,
  }
};
```

### Migration Mapping

**Deprecated Props Handling:**
```typescript
interface V1ToV2Migration {
  // Removed props (handled automatically)
  estimatedItemSize: 'REMOVED - automatic sizing';
  estimatedListSize: 'REMOVED - automatic sizing';
  estimatedFirstItemOffset: 'REMOVED - automatic sizing';
  
  // Replaced props
  inverted: 'REPLACED - use maintainVisibleContentPosition.startRenderingFromBottom';
  
  // Updated props
  overrideItemLayout: 'UPDATED - only supports span, not size';
  
  // New props
  maintainVisibleContentPosition: 'NEW - enabled by default';
  masonry: 'NEW - replaces MasonryFlashList';
}
```

## Error Handling

### Migration Warnings

**Deprecated Prop Detection:**
```typescript
function detectDeprecatedProps(props: any): string[] {
  const warnings: string[] = [];
  
  if ('estimatedItemSize' in props) {
    warnings.push('estimatedItemSize is no longer needed in FlashList v2 - automatic sizing is enabled');
  }
  
  if ('inverted' in props) {
    warnings.push('inverted prop is deprecated - use maintainVisibleContentPosition.startRenderingFromBottom instead');
  }
  
  return warnings;
}
```

**Performance Monitoring:**
```typescript
interface V2PerformanceMetrics {
  autoSizingEfficiency: number;
  memoryUsageOptimization: number;
  renderingPerformance: {
    averageFrameTime: number;
    droppedFrames: number;
    smoothScrollPercentage: number;
  };
  cacheHitRate: number;
}
```

## Testing Strategy

### Unit Tests

1. **Component Migration Tests:**
   - Verify v2 props are correctly applied
   - Test deprecated prop warnings
   - Validate ref type updates
   - Test masonry layout integration

2. **Performance Utility Tests:**
   - Test automatic sizing behavior
   - Verify memory optimization strategies
   - Test new hook integrations
   - Validate preset configurations

3. **Integration Tests:**
   - Test with large datasets (10k+ items)
   - Verify scroll position maintenance
   - Test masonry layout with varying heights
   - Performance regression testing

### Performance Benchmarks

**Before/After Metrics:**
- Initial render time comparison
- Scroll performance (FPS during scrolling)
- Memory usage patterns
- Cache efficiency metrics

**Test Scenarios:**
- Large message history (chat interface)
- Activity feed with mixed content types
- Masonry grid with images
- User lists with profile pictures

### Migration Testing

**Backward Compatibility:**
- Existing FlashListWrapper usage continues to work
- Performance utilities maintain same external API
- No breaking changes in component interfaces
- Graceful handling of deprecated props

**V2 Feature Testing:**
- Automatic sizing accuracy
- maintainVisibleContentPosition behavior
- New hook functionality
- Enhanced performance monitoring

## Implementation Phases

### Phase 1: Core Component Updates
- Update FlashListWrapper to v2 API
- Remove deprecated props
- Add maintainVisibleContentPosition support
- Update TypeScript types

### Phase 2: Performance Utilities Migration
- Update performance configuration interfaces
- Implement v2-specific optimizations
- Add new hook wrappers
- Update preset configurations

### Phase 3: Testing and Validation
- Comprehensive testing suite
- Performance benchmarking
- Migration validation
- Documentation updates

### Phase 4: Optimization and Polish
- Fine-tune performance configurations
- Add advanced v2 features
- Performance monitoring enhancements
- Final compatibility checks