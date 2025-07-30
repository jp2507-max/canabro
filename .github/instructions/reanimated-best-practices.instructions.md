---
applyTo: '**'
---
# 🎬 React Native Reanimated Production Cheatsheet (v3.19+)
_Last updated July 2025 • ≈250 lines_

--------------------------------------------------------------------
## 🚀 Automatic Workletization
* Callbacks passed to Reanimated hooks & Gesture API run on the UI
  thread automatically.  
* **Still add `'worklet'`** for  
  1. Imported / external functions  
  2. Conditional expressions  
  3. `runOnUI` bodies  
  4. Animation callbacks  
* ✔ Checklist  
  - [ ] No `.value` access during render  
  - [ ] `cancelAnimation` on unmount  

// auto‑worklet
const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }],
}));

// manual ‑ imported func
export function importedWorklet() {
  'worklet';
  return { width: 100 };
}

--------------------------------------------------------------------
## 📦 Minimum Imports

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnUI,
  interpolateColor as rInterpolateColor,
} from 'react-native-reanimated';

import { Gesture, GestureDetector } from
  'react-native-gesture-handler';   // Gesture Handler v2

// Deprecated: useAnimatedGestureHandler, PanGestureHandler

--------------------------------------------------------------------
## 🎯 Core Patterns

### Shared Values
const width = useSharedValue(100);
width.value = withSpring(200);

### useAnimatedStyle
const st = useAnimatedStyle(() => ({
  translateX: offset.value,
  opacity: isVisible.value ? 1 : 0,
}));
// Never mutate shared values inside the callback.

### Color Interpolation
const bg = useAnimatedStyle(() => ({
  backgroundColor: rInterpolateColor(
    progress.value,
    [0, 1],
    ['#F00', '#0F0'],
  ),
}));

### NativeWind
• Static styling: `className="bg-blue-500 p-4 rounded-lg"`  
• Dynamic: `style={animatedStyle}`

--------------------------------------------------------------------
## 👆 Modern Gesture API

const ctx = useSharedValue({ x: 0, y: 0 });

const pan = Gesture.Pan()
  .onStart(() => {
    ctx.value = { x: x.value, y: y.value };
  })
  .onUpdate(e => {
    x.value = ctx.value.x + e.translationX;
    y.value = ctx.value.y + e.translationY;
  })
  .onEnd(() => {
    x.value = withSpring(0);
    y.value = withSpring(0);
  });

<GestureDetector gesture={pan}>
  <Animated.View style={animatedStyle} />
</GestureDetector>

--------------------------------------------------------------------
### Migration Numbers
Replace ➜ With  
• `useAnimatedGestureHandler` ➜ `Gesture.*()`  
• `PanGestureHandler`        ➜ `GestureDetector`  
• `onActive`                 ➜ `onUpdate`  
• `ctx` parameter            ➜ external `useSharedValue`

--------------------------------------------------------------------
## ♻️ Cleanup & Chaining

useEffect(() => () => cancelAnimation(offset), []);

offset.value = withSpring(100, {}, finished => {
  'worklet';
  if (finished) scale.value = withSpring(1.2);
});

--------------------------------------------------------------------
## 🔧 Hooks vs Direct Imports

• **Direct imports** – tiny, component‑specific, perf‑critical.  
• **Custom hooks** (`@/lib/animations`) – cards, buttons, modals, etc.  
• Don’t over‑abstract simple one‑offs.

--------------------------------------------------------------------
## 🚨 Pitfalls

1. No inline math with shared values.  
2. Don’t mutate inside `useAnimatedStyle`.  
3. Alias `interpolateColor`.  
4. Cancel long‑running animations.  
5. Keep NativeWind units consistent.  
6. Favor simplicity over over‑abstraction.

--------------------------------------------------------------------
## 🔮 React Compiler RC

React Compiler (RC since Apr 2025) works with Reanimated, but remains
pre‑stable. Production teams should keep using classic `.value`
unless they adopt the RC knowingly.

--------------------------------------------------------------------
## 🔄 Backward (<3.19)

Older versions need manual `'worklet'` everywhere:

const oldStyle = useAnimatedStyle(() => {
  'worklet';
  return { scale: sv.value };
});

--------------------------------------------------------------------
**Status:** Reanimated 3.19 + is production‑ready — automatic
workletization, modern Gesture API, clear migration guidance.
