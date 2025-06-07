/**
 * 👆 useAdvancedGesture Hook
 *
 * Enhanced gesture patterns for complex interactions.
 * Builds on react-native-gesture-handler with animation integration.
 */

import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';

import { SPRING_CONFIGS } from './presets';
import { useAnimationCleanup } from './useAnimationCleanup';

// Dynamic import to avoid hard dependency on expo-haptics
let Haptics: typeof import('expo-haptics') | null = null;
try {
  Haptics = require('expo-haptics');
} catch {
  // expo-haptics not available - haptic feedback will be disabled
}

interface UseAdvancedGestureConfig {
  // Pan gesture settings
  enablePan?: boolean;
  panThreshold?: number;
  panBounds?: { x?: { min: number; max: number }; y?: { min: number; max: number } };

  // Pinch gesture settings
  enablePinch?: boolean;
  scaleRange?: { min: number; max: number };

  // Rotation gesture settings
  enableRotation?: boolean;
  rotationSnap?: number; // Snap to angles (in degrees)

  // Multi-touch settings
  enableMultitouch?: boolean;
  maxPointers?: number;

  // Animation configs
  springConfig?: typeof SPRING_CONFIGS.smooth;

  // Haptic feedback
  enableHaptics?: boolean;

  // Callbacks
  onGestureStart?: () => void;
  onGestureUpdate?: (data: GestureUpdateData) => void;
  onGestureEnd?: (data: GestureEndData) => void;
}

interface GestureUpdateData {
  translation: { x: number; y: number };
  scale: number;
  rotation: number;
  velocity: { x: number; y: number };
}

interface GestureEndData extends GestureUpdateData {
  final: boolean;
}

export function useAdvancedGesture(config: UseAdvancedGestureConfig = {}) {
  const {
    enablePan = true,
    panThreshold = 10,
    panBounds,
    enablePinch = false,
    scaleRange = { min: 0.5, max: 2 },
    enableRotation = false,
    rotationSnap,
    enableMultitouch = false,
    maxPointers = 2,
    springConfig = SPRING_CONFIGS.smooth,
    enableHaptics = true,
    onGestureStart,
    onGestureUpdate,
    onGestureEnd,
  } = config;

  // Shared values for transformations
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  // Context values for gesture continuity
  const contextTranslateX = useSharedValue(0);
  const contextTranslateY = useSharedValue(0);
  const contextScale = useSharedValue(1);
  const contextRotation = useSharedValue(0);

  // Velocity tracking
  const velocityX = useSharedValue(0);
  const velocityY = useSharedValue(0);
  // Haptic feedback helper
  const triggerHaptics = (style: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!enableHaptics || !Haptics) return;

    const hapticMap = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
    };

    Haptics.impactAsync(hapticMap[style]);
  };

  // Bounds checking helper
  const applyBounds = (value: number, bounds?: { min: number; max: number }) => {
    if (!bounds) return value;
    return Math.max(bounds.min, Math.min(bounds.max, value));
  };

  // Snap rotation helper
  const snapRotation = (angle: number, snapDegrees?: number) => {
    if (!snapDegrees) return angle;
    const snapRadians = (snapDegrees * Math.PI) / 180;
    return Math.round(angle / snapRadians) * snapRadians;
  };

  // Pan gesture
  const panGesture = Gesture.Pan()
    .enabled(enablePan)
    .minDistance(panThreshold)
    .maxPointers(enableMultitouch ? maxPointers : 1)
    .onStart(() => {
      runOnJS(triggerHaptics)('light');
      if (onGestureStart) {
        runOnJS(onGestureStart)();
      }

      contextTranslateX.value = translateX.value;
      contextTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      const newTranslateX = contextTranslateX.value + event.translationX;
      const newTranslateY = contextTranslateY.value + event.translationY;

      translateX.value = applyBounds(newTranslateX, panBounds?.x);
      translateY.value = applyBounds(newTranslateY, panBounds?.y);

      velocityX.value = event.velocityX;
      velocityY.value = event.velocityY;

      if (onGestureUpdate) {
        runOnJS(onGestureUpdate)({
          translation: { x: translateX.value, y: translateY.value },
          scale: scale.value,
          rotation: rotation.value,
          velocity: { x: velocityX.value, y: velocityY.value },
        });
      }
    })
    .onEnd((event) => {
      // Apply momentum if velocity is high
      const momentumThreshold = 500;
      if (
        Math.abs(event.velocityX) > momentumThreshold ||
        Math.abs(event.velocityY) > momentumThreshold
      ) {
        const momentumX = translateX.value + event.velocityX * 0.1;
        const momentumY = translateY.value + event.velocityY * 0.1;

        translateX.value = withSpring(applyBounds(momentumX, panBounds?.x), springConfig);
        translateY.value = withSpring(applyBounds(momentumY, panBounds?.y), springConfig);
      }

      if (onGestureEnd) {
        runOnJS(onGestureEnd)({
          translation: { x: translateX.value, y: translateY.value },
          scale: scale.value,
          rotation: rotation.value,
          velocity: { x: event.velocityX, y: event.velocityY },
          final: true,
        });
      }
    });
  // Pinch gesture - only create when enabled
  const pinchGesture = enablePinch
    ? Gesture.Pinch()
        .onStart(() => {
          runOnJS(triggerHaptics)('medium');
          contextScale.value = scale.value;
        })
        .onUpdate((event) => {
          const newScale = contextScale.value * event.scale;
          scale.value = applyBounds(newScale, scaleRange);

          if (onGestureUpdate) {
            runOnJS(onGestureUpdate)({
              translation: { x: translateX.value, y: translateY.value },
              scale: scale.value,
              rotation: rotation.value,
              velocity: { x: velocityX.value, y: velocityY.value },
            });
          }
        })
        .onEnd(() => {
          // Snap to 1.0 if close
          if (Math.abs(scale.value - 1) < 0.1) {
            scale.value = withSpring(1, springConfig);
          }

          if (onGestureEnd) {
            runOnJS(onGestureEnd)({
              translation: { x: translateX.value, y: translateY.value },
              scale: scale.value,
              rotation: rotation.value,
              velocity: { x: velocityX.value, y: velocityY.value },
              final: true,
            });
          }
        })
    : null;

  // Rotation gesture - only create when enabled
  const rotationGesture = enableRotation
    ? Gesture.Rotation()
        .onStart(() => {
          runOnJS(triggerHaptics)('heavy');
          contextRotation.value = rotation.value;
        })
        .onUpdate((event) => {
          const newRotation = contextRotation.value + event.rotation;
          rotation.value = snapRotation(newRotation, rotationSnap);

          if (onGestureUpdate) {
            runOnJS(onGestureUpdate)({
              translation: { x: translateX.value, y: translateY.value },
              scale: scale.value,
              rotation: rotation.value,
              velocity: { x: velocityX.value, y: velocityY.value },
            });
          }
        })
        .onEnd(() => {
          if (onGestureEnd) {
            runOnJS(onGestureEnd)({
              translation: { x: translateX.value, y: translateY.value },
              scale: scale.value,
              rotation: rotation.value,
              velocity: { x: velocityX.value, y: velocityY.value },
              final: true,
            });
          }
        })
    : null;
  // Combine gestures - only include enabled ones
  const gestureList = [
    panGesture,
    ...(pinchGesture ? [pinchGesture] : []),
    ...(rotationGesture ? [rotationGesture] : []),
  ];

  const combinedGesture =
    gestureList.length === 1 ? gestureList[0] : Gesture.Simultaneous(...gestureList);

  // Animated style
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}rad` },
    ],
  }));

  // Reset function
  const resetGesture = () => {
    translateX.value = withSpring(0, springConfig);
    translateY.value = withSpring(0, springConfig);
    scale.value = withSpring(1, springConfig);
    rotation.value = withSpring(0, springConfig);
  };

  // Cleanup
  useAnimationCleanup({
    sharedValues: [translateX, translateY, scale, rotation],
  });

  return {
    // Gesture detector
    gesture: combinedGesture,

    // Animated style
    animatedStyle,

    // Current values
    values: {
      translateX,
      translateY,
      scale,
      rotation,
      velocityX,
      velocityY,
    },

    // Control functions
    resetGesture,

    // Helper to animate to specific values
    animateTo: (target: Partial<{ x: number; y: number; scale: number; rotation: number }>) => {
      if (target.x !== undefined) {
        translateX.value = withSpring(target.x, springConfig);
      }
      if (target.y !== undefined) {
        translateY.value = withSpring(target.y, springConfig);
      }
      if (target.scale !== undefined) {
        scale.value = withSpring(target.scale, springConfig);
      }
      if (target.rotation !== undefined) {
        rotation.value = withSpring(target.rotation, springConfig);
      }
    },
  };
}
