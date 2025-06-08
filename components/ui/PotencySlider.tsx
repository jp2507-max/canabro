/**
 * PotencySlider component for THC/CBD range selection
 * Uses NativeWind v4 with React Native Reanimated v3
 */

import React, { useCallback } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withSpring,
} from 'react-native-reanimated';

import ThemedText from './ThemedText';
import { triggerSelectionHaptic } from '../../lib/utils/haptics';

interface PotencySliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  minValue: number | null;
  maxValue: number | null;
  onValueChange: (minValue: number | null, maxValue: number | null) => void;
  unit?: string;
  trackColor?: string;
  activeTrackColor?: string;
  thumbColor?: string;
  enableHaptics?: boolean;
}

const SLIDER_WIDTH = 280;
const THUMB_SIZE = 24;
const TRACK_HEIGHT = 4;

export default function PotencySlider({
  label,
  min,
  max,
  step,
  minValue,
  maxValue,
  onValueChange,
  unit = '%',
  trackColor = 'bg-neutral-300 dark:bg-neutral-600',
  activeTrackColor = 'bg-primary-500',
  thumbColor = 'bg-primary-600',
  enableHaptics = true,
}: PotencySliderProps) {
  // Convert values to positions
  const valueToPosition = useCallback(
    (value: number) => {
      return ((value - min) / (max - min)) * SLIDER_WIDTH;
    },
    [min, max]
  );

  const positionToValue = useCallback(
    (position: number) => {
      const value = (position / SLIDER_WIDTH) * (max - min) + min;
      return Math.round(value / step) * step;
    },
    [min, max, step]
  );

  // Shared values for thumb positions
  const minThumbX = useSharedValue(minValue ? valueToPosition(minValue) : 0);
  const maxThumbX = useSharedValue(maxValue ? valueToPosition(maxValue) : SLIDER_WIDTH);

  // Haptic feedback wrapper
  const triggerHaptic = useCallback(() => {
    if (enableHaptics) {
      triggerSelectionHaptic();
    }
  }, [enableHaptics]);
  // Context for gesture handling
  const minThumbContext = useSharedValue({ startX: 0 });
  const maxThumbContext = useSharedValue({ startX: 0 });

  // Min thumb gesture
  const minThumbGesture = Gesture.Pan()
    .onStart(() => {
      minThumbContext.value.startX = minThumbX.value;
      runOnJS(triggerHaptic)();
    })
    .onUpdate((event) => {
      const newX = Math.max(
        0,
        Math.min(minThumbContext.value.startX + event.translationX, maxThumbX.value - THUMB_SIZE)
      );
      minThumbX.value = newX;
    })
    .onEnd(() => {
      const newValue = positionToValue(minThumbX.value);
      minThumbX.value = withSpring(valueToPosition(newValue));
      runOnJS(onValueChange)(newValue, maxValue);
      runOnJS(triggerHaptic)();
    });

  // Max thumb gesture
  const maxThumbGesture = Gesture.Pan()
    .onStart(() => {
      maxThumbContext.value.startX = maxThumbX.value;
      runOnJS(triggerHaptic)();
    })
    .onUpdate((event) => {
      const newX = Math.max(
        minThumbX.value + THUMB_SIZE,
        Math.min(maxThumbContext.value.startX + event.translationX, SLIDER_WIDTH)
      );
      maxThumbX.value = newX;
    })
    .onEnd(() => {
      const newValue = positionToValue(maxThumbX.value);
      maxThumbX.value = withSpring(valueToPosition(newValue));
      runOnJS(onValueChange)(minValue, newValue);
      runOnJS(triggerHaptic)();
    });

  // Animated styles
  const minThumbStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateX: minThumbX.value }],
    };
  });

  const maxThumbStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateX: maxThumbX.value }],
    };
  });

  const activeTrackStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      left: minThumbX.value,
      width: maxThumbX.value - minThumbX.value,
    };
  });

  const currentMinValue = minValue ?? min;
  const currentMaxValue = maxValue ?? max;

  return (
    <View className="mb-4">
      {/* Label and Values */}
      <View className="mb-3 flex-row items-center justify-between">
        <ThemedText className="text-base font-medium">{label}</ThemedText>
        <ThemedText variant="muted" className="text-sm">
          {currentMinValue}
          {unit} - {currentMaxValue}
          {unit}
        </ThemedText>
      </View>

      {/* Slider Container */}
      <View className="h-12 justify-center">
        <View className={`h-1 rounded-full ${trackColor}`} style={{ width: SLIDER_WIDTH }}>
          {/* Active Track */}
          <Animated.View
            className={`absolute h-1 rounded-full ${activeTrackColor}`}
            style={[{ height: TRACK_HEIGHT }, activeTrackStyle]}
          />
        </View>

        {/* Min Thumb */}
        <GestureDetector gesture={minThumbGesture}>
          <Animated.View
            className={`absolute rounded-full ${thumbColor} shadow-md`}
            style={[
              {
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                top: -THUMB_SIZE / 2 + TRACK_HEIGHT / 2,
              },
              minThumbStyle,
            ]}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={`Minimum ${label.toLowerCase()} value`}
            accessibilityValue={{
              min,
              max,
              now: currentMinValue,
              text: `${currentMinValue}${unit}`,
            }}
          />
        </GestureDetector>

        {/* Max Thumb */}
        <GestureDetector gesture={maxThumbGesture}>
          <Animated.View
            className={`absolute rounded-full ${thumbColor} shadow-md`}
            style={[
              {
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                top: -THUMB_SIZE / 2 + TRACK_HEIGHT / 2,
              },
              maxThumbStyle,
            ]}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={`Maximum ${label.toLowerCase()} value`}
            accessibilityValue={{
              min,
              max,
              now: currentMaxValue,
              text: `${currentMaxValue}${unit}`,
            }}
          />{' '}
        </GestureDetector>
      </View>

      {/* Range Labels */}
      <View className="mt-2 flex-row justify-between">
        <ThemedText variant="caption">
          {min}
          {unit}
        </ThemedText>
        <ThemedText variant="caption">
          {max}
          {unit}
        </ThemedText>
      </View>
    </View>
  );
}
