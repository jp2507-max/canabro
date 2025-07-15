import React from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  FadeIn,
  runOnJS,
} from 'react-native-reanimated';

import { OptimizedIcon, IconName } from '../ui/OptimizedIcon';
import ThemedText from '../ui/ThemedText';
import { triggerLightHapticSync } from '@/lib/utils/haptics';

/**
 * Displays a profile statistic with an icon, value, and label.
 * Enhanced with sophisticated animations, gesture handling, and haptic feedback.
 */
export interface StatItemProps {
  value: number | string;
  label: string;
  icon: IconName;
  onPress?: () => void;
  index?: number;
}

const StatItem: React.FC<StatItemProps> = React.memo(function StatItem({
  value,
  label,
  icon,
  onPress,
  index = 0,
}) {
  const scale = useSharedValue(1);
  const shadowOpacity = useSharedValue(0.1);
  const elevation = useSharedValue(2);

  // Press gesture with sophisticated feedback
  const pressGesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(0.96, {
        damping: 15,
        stiffness: 400,
      });
      shadowOpacity.value = withSpring(0.15);
      elevation.value = withSpring(4);
    })
    .onFinalize(() => {
      'worklet';
      scale.value = withSequence(
        withSpring(1.02, { damping: 10, stiffness: 300 }),
        withSpring(1, { damping: 15, stiffness: 400 })
      );
      shadowOpacity.value = withSpring(0.1);
      elevation.value = withSpring(2);
    })
    .onEnd(() => {
      'worklet';
      if (onPress) {
        runOnJS(triggerLightHapticSync)();
        runOnJS(onPress)();
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: scale.value }],
      shadowOpacity: shadowOpacity.value,
      elevation: elevation.value,
    };
  });

  const StatContent = (
    <Animated.View
      entering={FadeIn.delay(index * 100).duration(600)}
      style={animatedStyle}
      className="flex-1 items-center rounded-2xl bg-white p-6 shadow-lg shadow-neutral-200 dark:bg-neutral-800 dark:shadow-neutral-950">
      <OptimizedIcon
        name={icon}
        size={24}
        className="text-primary-500 dark:text-primary-400"
        style={{ marginBottom: 8 }}
      />
      <ThemedText
        variant="heading"
        className="text-xl font-extrabold text-primary-600 dark:text-primary-300"
        accessibilityRole="text"
        accessibilityLabel={`${value} ${label}`}>
        {value}
      </ThemedText>
      <ThemedText
        variant="caption"
        className="mt-1 text-xs font-medium text-neutral-500 dark:text-neutral-400"
        accessibilityRole="text">
        {label}
      </ThemedText>
    </Animated.View>
  );

  // Wrap with gesture detector only if onPress is provided
  if (onPress) {
    return <GestureDetector gesture={pressGesture}>{StatContent}</GestureDetector>;
  }

  return StatContent;
});

export default StatItem;
