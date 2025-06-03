---
applyTo: '**'
---
# 🎬 React Native Reanimated Production Guide

## 📅 Last Updated: June 3, 2025

Essential patterns for React Native Reanimated v3 + React Compiler (2025) - Streamlined for production use.

---

## 🔥 **React Compiler Compatibility (2025)**

```tsx
// ✅ React Compiler optimized patterns
import { useSharedValue, useAnimatedStyle, withSpring, runOnUI } from 'react-native-reanimated';

const scale = useSharedValue(1);

// Reading values in worklets
const animatedStyle = useAnimatedStyle(() => {
  const currentScale = scale.get(); // React Compiler friendly
  return { transform: [{ scale: currentScale }] };
});

// Setting values in event handlers
const handlePress = () => {
  scale.set(withSpring(1.2)); // React Compiler friendly
};

// Batch updates for performance
const handleComplexUpdate = () => {
  runOnUI(() => {
    'worklet';
    scale.set(1.2);
    opacity.set(0.8);
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

## 🚨 **Common Pitfalls**

1. **Don't** perform operations in inline styles with shared values
2. **Don't** mutate shared values inside `useAnimatedStyle`
3. **Don't** name worklet functions same as imported functions (interpolateColor issue)
4. **Don't** forget to cancel animations on unmount
5. **Don't** mix percentage and pixel units with NativeWind animations

## 🎯 **Production Checklist**

- ✅ Use React Compiler patterns (`.get()`, `.set()`, `runOnUI`)
- ✅ Migrate from `useAnimatedGestureHandler` to `Gesture` API
- ✅ Combine NativeWind (static) + Reanimated (dynamic)
- ✅ Add proper cleanup with `cancelAnimation`
- ✅ Import `interpolateColor` with alias to avoid recursion
- ✅ Use `GestureDetector` instead of handler components

---

**Status**: Production-ready patterns for 2025 🎉
````
