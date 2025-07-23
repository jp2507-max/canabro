# 🎬 React Native Reanimated Production Guide

## 📅 Last Updated: July 2025

Essential patterns for React Native Reanimated v3.19.0+ - Production-ready with automatic workletization.

---

## 🚀 **Automatic Workletization (3.19.0+)**

**React Native Reanimated 3.19.0+ automatically workletizes functions** passed to Reanimated hooks, eliminating the need for manual `'worklet'` directives in most cases.

```tsx
// ✅ AUTOMATIC WORKLETIZATION (3.19.0+)
import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const scale = useSharedValue(1);

// ✅ No 'worklet' directive needed - automatically workletized
const animatedStyle = useAnimatedStyle(() => {
  return { transform: [{ scale: scale.value }] };
});

// ✅ Referenced functions are also automatically workletized
function getTransform() {
  return { transform: [{ scale: scale.value }] };
}
const animatedStyle2 = useAnimatedStyle(getTransform);

// ✅ Setting values in event handlers
const handlePress = () => {
  scale.value = withSpring(1.2);
};

// ✅ Manual worklets still need 'worklet' directive
const handleComplexUpdate = () => {
  runOnUI(() => {
    'worklet';
    scale.value = 1.2;
    opacity.value = 0.8;
  })();
};
```

## 🎯 **Single Source of Truth: `.value` Syntax**

**Continue using `.value` for all shared value operations** - this remains the standard, production-proven approach that works across all Reanimated versions.

## 📦 **Modern Imports (2025)**

```tsx
// ✅ Essential Reanimated v3 imports
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  runOnUI,
  interpolateColor as rInterpolateColor,
} from 'react-native-reanimated';

// ✅ Modern Gesture Handler v2 (replaces useAnimatedGestureHandler)
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

// ❌ DEPRECATED: Don't use these
// import { useAnimatedGestureHandler } from 'react-native-reanimated';
// import { PanGestureHandler } from 'react-native-gesture-handler';
```

## ⚡ **Core Patterns**

### **Shared Values**
```tsx
// ✅ CORRECT
const width = useSharedValue(100);
width.value = withSpring(200);

// ❌ AVOID: Operations in inline styles
<Animated.View style={{ width: width * 5 }} /> // Won't work!
```

### **useAnimatedStyle (Automatic Workletization)**
```tsx
// ✅ AUTOMATIC (3.19.0+): No 'worklet' directive needed
const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ translateX: offset.value }],
  opacity: isVisible.value ? 1 : 0,
}));

// ✅ REFERENCED FUNCTIONS: Also automatically workletized
function getStyles() {
  return {
    transform: [{ translateX: offset.value }],
    opacity: isVisible.value ? 1 : 0,
  };
}
const animatedStyle2 = useAnimatedStyle(getStyles);

// ❌ AVOID: Mutating shared values inside
const animatedStyle = useAnimatedStyle(() => {
  offset.value = withTiming(1); // DON'T DO THIS!
  return { opacity: offset.value };
});
```

### **Color Interpolation (Fixed Naming)**
```tsx
// ✅ CORRECT: Import with alias to avoid recursion
import { interpolateColor as rInterpolateColor } from 'react-native-reanimated';

const animatedStyle = useAnimatedStyle(() => {
  const backgroundColor = rInterpolateColor(
    progress.value,
    [0, 1],
    ['#FF0000', '#00FF00']
  );
  return { backgroundColor };
});
```

## 🎨 **NativeWind Integration**

```tsx
// ✅ Static styles with NativeWind, dynamic with Reanimated
const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }],
}));

return (
  <Animated.View 
    className="bg-blue-500 p-4 rounded-lg" // NativeWind
    style={animatedStyle} // Reanimated
  />
);

// 🎯 Performance: Use NativeWind for static, Reanimated for dynamic
// 🎯 Avoid complex className conditions when animating
```

## 👆 **Modern Gesture Patterns (Automatic Workletization)**

```tsx
// ✅ Modern Gesture API with automatic workletization (3.19.0+)
const context = useSharedValue({ startX: 0, startY: 0 });

const panGesture = Gesture.Pan()
  .onStart(() => {
    // ✅ No 'worklet' directive needed - automatically workletized
    context.value = { startX: x.value, startY: y.value };
  })
  .onUpdate((event) => {
    // ✅ No 'worklet' directive needed - automatically workletized
    x.value = context.value.startX + event.translationX;
    y.value = context.value.startY + event.translationY;
  })
  .onEnd(() => {
    // ✅ No 'worklet' directive needed - automatically workletized
    x.value = withSpring(0);
    y.value = withSpring(0);
  });

// Usage
<GestureDetector gesture={panGesture}>
  <Animated.View style={animatedStyle} />
</GestureDetector>
```

## ♻️ **Performance & Cleanup**

```tsx
// Memory management
useEffect(() => {
  return () => {
    cancelAnimation(offset);
  };
}, []);

// Animation chaining with callbacks
offset.value = withSpring(100, {}, (finished) => {
  'worklet';
  if (finished) {
    scale.value = withSpring(1.2);
  }
});
```

## 🔄 **Migration Guide: Deprecated → Modern**

### **❌ DEPRECATED: useAnimatedGestureHandler**
```tsx
// 🚫 OLD PATTERN - Don't use
const gestureHandler = useAnimatedGestureHandler({
  onStart: (event, ctx) => {
    ctx.startX = translateX.value;
  },
  onActive: (event, ctx) => {
    translateX.value = ctx.startX + event.translationX;
  }
});

<PanGestureHandler onGestureEvent={gestureHandler}>
  <Animated.View style={animatedStyle} />
</PanGestureHandler>
```

### **✅ MODERN: Gesture.Pan() + GestureDetector**
```tsx
// ✅ NEW PATTERN - Use this
const context = useSharedValue({ startX: 0 });

const gesture = Gesture.Pan()
  .onStart(() => {
    context.value = { startX: translateX.value };
  })
  .onUpdate((event) => {
    translateX.value = context.value.startX + event.translationX;
  });

<GestureDetector gesture={gesture}>
  <Animated.View style={animatedStyle} />
</GestureDetector>
```

### **🔧 Key Migration Changes**
1. **Replace**: `useAnimatedGestureHandler` → `Gesture.Pan()`
2. **Replace**: `PanGestureHandler` → `GestureDetector`
3. **Replace**: `onActive` → `onUpdate`
4. **Context**: Use external `useSharedValue` instead of `ctx` parameter

## 🎯 **Direct Imports vs Custom Animation Hooks (2025 Best Practice)**

### **✅ Use Direct Imports For:**
- Component-specific animations (FloatingActionButton example)
- Performance-critical code (no abstraction overhead)
- Fine-tuned, one-off animations
- Simple animations that won't be reused

```tsx
// ✅ Direct imports - Perfect for specific components
import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const scale = useSharedValue(1);
const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }]
}));
```

### **✅ Use Custom Animation Hooks For:**
- Reusable patterns (cards, buttons, modals)
- Complex gesture combinations
- Standardized configurations
- Business logic abstraction

```tsx
// ✅ Custom hooks - Perfect for reusable patterns
import { useCardAnimation } from '@/lib/animations';

const { animatedStyle, handlers } = useCardAnimation({
  enableHaptics: true,
  onPress: handlePress
});
```

### **📁 Available Custom Animation System (`@/lib/animations/`)**
```tsx
// Core animation hooks
import { 
  useCardAnimation,        // Card press/shadow animations
  useButtonAnimation,      // Button press animations  
  useGestureAnimation,     // Tap + long press with rotation
  useAdvancedGesture,      // Pan, pinch, rotation gestures
  useScrollAnimation,      // Parallax, fade, scale on scroll
  useAnimationSequence,    // Chained/staggered animations
} from '@/lib/animations';

// Animation presets and configs
import { 
  SPRING_CONFIGS,          // quick, smooth, bouncy, gentle
  ANIMATION_PRESETS,       // strainCard, plantCard, button
  SCALE_VALUES,            // cardPress, buttonPress, etc.
} from '@/lib/animations/presets';

// Utility components
import { AnimatedCard } from '@/lib/animations/AnimatedCard';
```

### **🎭 Hybrid Approach Recommendations:**
- **FloatingActionButton** → Direct imports (component-specific)
- **PlantCard/StrainCard** → `useCardAnimation` (consistency)
- **Form buttons** → `useButtonAnimation` (standardization)
- **Gesture components** → `useAdvancedGesture` (complex patterns)
- **Modal animations** → `useAnimationSequence` (entrance/exit)

## 🚨 **Common Pitfalls**

1. **Don't** perform operations in inline styles with shared values
2. **Don't** mutate shared values inside `useAnimatedStyle`
3. **Don't** name worklet functions same as imported functions (interpolateColor issue)
4. **Don't** forget to cancel animations on unmount
5. **Don't** mix percentage and pixel units with NativeWind animations
6. **Don't** over-abstract simple animations into custom hooks

## 🔮 **React Compiler Support (Still RC - No Stable Release Yet)**

**React Compiler remains in Release Candidate (RC)** phase as of June 2025, with working support for Reanimated. While the RC has been tested extensively in production at Meta and is described as "stable and near-final," the React team continues to recommend:

> **"You don't have to rush into using the compiler now. It's okay to wait until it reaches a stable release before adopting it."**

```tsx
// ✅ REACT COMPILER COMPATIBLE (RC Available since April 2025)
const animatedStyle = useAnimatedStyle(() => {
  'worklet';
  return { width: sv.value * 100 };
});

const handlePress = () => {
  sv.value = sv.value + 1;
};
```

**Current status (June 2025)**: React Compiler is still in RC phase. Recommendation:
- **Most teams**: Use `.value` syntax (universal compatibility, production-proven)
- **Early adopters**: RC is stable but no stable release announced yet
- **Meta-scale teams**: RC is production-ready if you follow Rules of React strictly

## 🚀 **Reanimated 3.19.0+ Automatic Workletization**

### **🎉 Major Improvement: No More Manual 'worklet' Directives**
React Native Reanimated 3.19.0+ introduces automatic workletization, eliminating the need for manual `'worklet'` directives in most common cases.

### **✅ Automatically Workletized (No 'worklet' Needed)**

#### **1. Functions Passed to Reanimated Hooks**
```tsx
// ✅ AUTOMATIC - No 'worklet' directive needed
const animatedStyle = useAnimatedStyle(() => {
  return { transform: [{ scale: scale.value }] };
});

const scrollHandler = useAnimatedScrollHandler((event) => {
  translationY.value = event.contentOffset.y;
});

const scrollHandler2 = useAnimatedScrollHandler({
  onScroll: (event) => {
    // ✅ AUTOMATIC - No 'worklet' directive needed
    position.value = event.contentOffset.x;
  },
  onEndDrag: (event) => {
    // ✅ AUTOMATIC - No 'worklet' directive needed
    scrollToNearestItem(event.contentOffset.x);
  },
});
```

#### **2. Referenced Functions**
```tsx
// ✅ AUTOMATIC - Referenced functions are automatically workletized
function getAnimatedStyles() {
  return { transform: [{ scale: scale.value }] };
}

const animatedStyle = useAnimatedStyle(getAnimatedStyles);
```

#### **3. Gesture Handler Callbacks**
```tsx
// ✅ AUTOMATIC - Gesture callbacks are automatically workletized
const gesture = Gesture.Tap()
  .onBegin(() => {
    scale.value = withSpring(0.95);
  })
  .onEnd(() => {
    scale.value = withSpring(1);
  });
```

#### **4. Object Methods in Handler Objects**
```tsx
// ✅ AUTOMATIC - Object methods are automatically workletized
const handlerObject = {
  onBeginDrag() {
    console.log('Dragging...');
  },
  onScroll() {
    console.log('Scrolling...');
  }
};

const handler = useAnimatedScrollHandler(handlerObject);
```

### **⚠️ Still Requires Manual 'worklet' Directive**

#### **1. Functions from Conditional Expressions**
```tsx
// ❌ MANUAL 'worklet' REQUIRED
const foo = someCondition
  ? () => {
      'worklet'; // ← Still needed
      return { width: 100 };
    }
  : () => {
      'worklet'; // ← Still needed
      return { width: 200 };
    };

const style = useAnimatedStyle(foo);
```

#### **2. Imported Functions**
```tsx
// bar.ts
export function bar() {
  'worklet'; // ← Still needed for imported functions
  return { width: 100 };
}

// foo.ts
import { bar } from './bar';
const style = useAnimatedStyle(bar);
```

#### **3. Custom Worklets with runOnUI**
```tsx
// ❌ MANUAL 'worklet' REQUIRED
function myWorklet() {
  'worklet'; // ← Still needed for custom worklets
  console.log('Hello from UI thread');
}

function onPress() {
  runOnUI(myWorklet)();
}
```

#### **4. Animation Callbacks**
```tsx
// ❌ MANUAL 'worklet' REQUIRED in animation callbacks
offset.value = withSpring(100, {}, (finished) => {
  'worklet'; // ← Still needed in animation callbacks
  if (finished) {
    scale.value = withSpring(1.2);
  }
});
```

### **🔍 Code Review Checklist for 3.19.0+**
Before adding new animations, ensure:

- [ ] Functions passed to Reanimated hooks don't need `'worklet'` (automatic)
- [ ] Gesture handler callbacks don't need `'worklet'` (automatic)
- [ ] Conditional expressions still need manual `'worklet'`
- [ ] Imported functions still need manual `'worklet'`
- [ ] Custom worklets with `runOnUI` still need manual `'worklet'`
- [ ] Animation callbacks still need manual `'worklet'`
- [ ] No `.value` access during component render
- [ ] Proper cleanup with `cancelAnimation` on unmount

### **📁 Migration from Pre-3.19.0**
If upgrading from older versions:

1. **Remove unnecessary 'worklet' directives** from `useAnimatedStyle` callbacks
2. **Remove unnecessary 'worklet' directives** from gesture handler callbacks
3. **Keep 'worklet' directives** for conditional expressions and imported functions
4. **Test thoroughly** to ensure automatic workletization is working correctly

## 🔄 **Backward Compatibility (Pre-3.19.0)**

If you're still using React Native Reanimated versions before 3.19.0, you'll need to manually add `'worklet'` directives:

```tsx
// Pre-3.19.0 - Manual 'worklet' directives required
const animatedStyle = useAnimatedStyle(() => {
  'worklet'; // ← Required in older versions
  return { transform: [{ scale: scale.value }] };
});

const gesture = Gesture.Tap()
  .onBegin(() => {
    'worklet'; // ← Required in older versions
    scale.value = withSpring(0.95);
  });
```

**Upgrade Recommendation**: Update to React Native Reanimated 3.19.0+ to benefit from automatic workletization and improved developer experience.

---

**Status**: Production-ready with automatic workletization (3.19.0+) 🚀