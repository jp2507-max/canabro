---
applyTo: 'Styling, Theming'
---
# 🎬 React Native Reanimated Production Guide

## 📅 Last Updated: June 2025

Essential patterns for React Native Reanimated v3 - Production-ready with single source of truth.

---

## 🎯 **Single Source of Truth: `.value` Syntax**

**Use `.value` for all shared value operations** - this is the standard, production-proven approach that works across all Reanimated versions and setups.

```tsx
// ✅ STANDARD PATTERN (USE THIS EVERYWHERE)
import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const scale = useSharedValue(1);

// Reading values in useAnimatedStyle
const animatedStyle = useAnimatedStyle(() => {
  return { transform: [{ scale: scale.value }] };
});

// Setting values in event handlers
const handlePress = () => {
  scale.value = withSpring(1.2);
};

// Batch updates for performance
const handleComplexUpdate = () => {
  runOnUI(() => {
    'worklet';
    scale.value = 1.2;
    opacity.value = 0.8;
  })();
};
```

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

### **useAnimatedStyle**
```tsx
// ✅ CORRECT: Read shared values, return styles
const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ translateX: offset.value }],
  opacity: isVisible.value ? 1 : 0,
}));

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

## 👆 **Modern Gesture Patterns**

```tsx
// ✅ Modern Gesture API
const context = useSharedValue({ startX: 0, startY: 0 });

const panGesture = Gesture.Pan()
  .onStart(() => {
    context.value = { startX: x.value, startY: y.value };
  })
  .onUpdate((event) => {
    x.value = context.value.startX + event.translationX;
    y.value = context.value.startY + event.translationY;
  })
  .onEnd(() => {
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
  return { width: sv.get() * 100 };
});

const handlePress = () => {
  sv.set((value) => value + 1);
};
```

**Current status (June 2025)**: React Compiler is still in RC phase. Recommendation:
- **Most teams**: Use `.value` syntax (universal compatibility, production-proven)
- **Early adopters**: RC is stable but no stable release announced yet
- **Meta-scale teams**: RC is production-ready if you follow Rules of React strictly

## 🎯 **Production Checklist**

- ✅ Use `.value` syntax for all shared value operations
- ✅ Migrate from `useAnimatedGestureHandler` to `Gesture` API
- ✅ Combine NativeWind (static) + Reanimated (dynamic)
- ✅ Add proper cleanup with `cancelAnimation`
- ✅ Import `interpolateColor` with alias to avoid recursion
- ✅ Use `GestureDetector` instead of handler components
- ✅ Avoid mixing `.value` and `.get()/.set()` patterns

---

**Status**: Production-ready single source of truth (`.value` syntax) 🎉
