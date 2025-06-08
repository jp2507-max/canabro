import * as Haptics from 'expo-haptics';
import React, { useCallback } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';

import { OptimizedIcon } from '../ui/OptimizedIcon';
import ThemedText from '../ui/ThemedText';

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 300,
  mass: 0.5,
};

// Hoist animated component creation to module scope to prevent recreation on every render
const BaseTouchable = React.forwardRef<any, any>(({ children, ...props }, ref) => (
  <Animated.View ref={ref} {...props}>
    {children}
  </Animated.View>
));
const AnimatedTouchable = Animated.createAnimatedComponent(BaseTouchable);

/**
 * TopicTag component for displaying topic/hashtag badges with modern animations
 */
const TopicTag = React.memo(
  ({
    name,
    count,
    isActive = false,
    onPress,
  }: {
    name: string;
    count?: number;
    isActive?: boolean;
    onPress?: () => void;
  }) => {
    const scale = useSharedValue(1);
    const pressed = useSharedValue(0);

    const handlePress = useCallback(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress?.();
    }, [onPress]);

    const gesture = Gesture.Tap()
      .onBegin(() => {
        'worklet';
        scale.value = withSpring(0.95, SPRING_CONFIG);
        pressed.value = withSpring(1, SPRING_CONFIG);
      })
      .onFinalize(() => {
        'worklet';
        scale.value = withSpring(1, SPRING_CONFIG);
        pressed.value = withSpring(0, SPRING_CONFIG);
      })
      .onEnd(() => {
        'worklet';
        // This is handled by the handlePress callback in onTouchEnd
      });

    const animatedStyle = useAnimatedStyle(() => {
      'worklet';
      const backgroundColor = isActive
        ? interpolateColor(
            pressed.value,
            [0, 1],
            ['#10b981', '#059669'] // primary-500 to primary-600
          )
        : interpolateColor(
            pressed.value,
            [0, 1],
            ['rgba(220, 252, 231, 0.7)', 'rgba(220, 252, 231, 0.9)'] // Light mint green with press effect
          );

      return {
        transform: [{ scale: scale.value }],
        backgroundColor,
      };
    });

    return (
      <GestureDetector gesture={gesture}>
        <AnimatedTouchable
          style={animatedStyle}
          className={`mr-2 flex-row items-center rounded-full px-3 py-2 ${
            isActive ? 'bg-primary-500 dark:bg-primary-400' : 'bg-primary-50 dark:bg-neutral-800'
          }`}
          onTouchEnd={handlePress}>
          <OptimizedIcon
            name="pricetag-outline"
            size={14}
            className={isActive ? 'mr-1 text-white' : 'mr-1 text-primary-600 dark:text-primary-300'}
          />
          <ThemedText
            className={`text-sm font-medium ${
              isActive ? 'text-white' : 'text-primary-700 dark:text-primary-300'
            }`}>
            {name}
          </ThemedText>
          {count && (
            <ThemedText
              className={`ml-1 text-xs ${
                isActive ? 'text-white' : 'text-primary-500 dark:text-primary-400'
              }`}>
              {count}
            </ThemedText>
          )}
        </AnimatedTouchable>
      </GestureDetector>
    );
  }
);

TopicTag.displayName = 'TopicTag';

export default TopicTag;
