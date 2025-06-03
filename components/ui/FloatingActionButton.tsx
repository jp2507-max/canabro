import React, { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

import { OptimizedIcon, type IconName } from './OptimizedIcon';

interface FloatingActionButtonProps {
  onPress: () => void;
  onLongPress?: () => void;
  iconName?: IconName;
  accessibilityLabel?: string;
  testID?: string;
  size?: number;
  className?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function FloatingActionButton({
  onPress,
  onLongPress,
  iconName = 'add',
  accessibilityLabel = 'Add',
  testID,
  size = 56,
  className = 'absolute bottom-6 right-6',
}: FloatingActionButtonProps) {
  // Reanimated v3 shared values for sophisticated animations
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const shadowOpacity = useSharedValue(0.25);
  const elevation = useSharedValue(8);
  const iconScale = useSharedValue(1);

  // Trigger haptic feedback
  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // Enhanced tap gesture with sophisticated spring animations
  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      // Quick press down effect with subtle rotation
      scale.value = withSpring(0.92, { damping: 20, stiffness: 600 });
      iconScale.value = withSpring(0.88, { damping: 20, stiffness: 600 });
      rotation.value = withSpring(Math.random() > 0.5 ? 3 : -3, { damping: 15, stiffness: 400 });
      shadowOpacity.value = withSpring(0.4, { damping: 15, stiffness: 400 });
      elevation.value = withSpring(12, { damping: 15, stiffness: 400 });
    })
    .onEnd(() => {
      'worklet';
      // Sophisticated bounce back with haptic feedback
      scale.value = withSequence(
        withSpring(1.08, { damping: 10, stiffness: 400 }),
        withSpring(1, { damping: 15, stiffness: 400 })
      );
      iconScale.value = withSequence(
        withSpring(1.12, { damping: 10, stiffness: 400 }),
        withSpring(1, { damping: 15, stiffness: 400 })
      );
      rotation.value = withSpring(0, { damping: 20, stiffness: 400 });
      shadowOpacity.value = withSpring(0.25, { damping: 15, stiffness: 400 });
      elevation.value = withSpring(8, { damping: 15, stiffness: 400 });
      
      // Trigger haptic and execute onPress
      runOnJS(triggerHaptic)();
      runOnJS(onPress)();
    })
    .onFinalize(() => {
      'worklet';
      // Ensure animations complete properly
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      iconScale.value = withSpring(1, { damping: 15, stiffness: 400 });
      rotation.value = withSpring(0, { damping: 20, stiffness: 400 });
      shadowOpacity.value = withSpring(0.25, { damping: 15, stiffness: 400 });
      elevation.value = withSpring(8, { damping: 15, stiffness: 400 });
    });

  // Enhanced long press gesture with visual feedback
  const longPressGesture = Gesture.LongPress()
    .minDuration(350)
    .onBegin(() => {
      'worklet';
      // Strong haptic and enhanced visual feedback
      runOnJS(triggerHaptic)();
      scale.value = withSpring(1.15, { damping: 8, stiffness: 300 });
      iconScale.value = withSpring(1.25, { damping: 8, stiffness: 300 });
      shadowOpacity.value = withSpring(0.6, { damping: 8, stiffness: 300 });
      elevation.value = withSpring(20, { damping: 8, stiffness: 300 });
      rotation.value = withSpring(360, { damping: 10, stiffness: 200 });
    })
    .onEnd(() => {
      'worklet';
      // Execute long press and restore state
      if (onLongPress) {
        runOnJS(onLongPress)();
      }
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      iconScale.value = withSpring(1, { damping: 15, stiffness: 400 });
      shadowOpacity.value = withSpring(0.25, { damping: 15, stiffness: 400 });
      elevation.value = withSpring(8, { damping: 15, stiffness: 400 });
      rotation.value = withSpring(0, { damping: 15, stiffness: 400 });
    })
    .onFinalize(() => {
      'worklet';
      // Cleanup
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      iconScale.value = withSpring(1, { damping: 15, stiffness: 400 });
      shadowOpacity.value = withSpring(0.25, { damping: 15, stiffness: 400 });
      elevation.value = withSpring(8, { damping: 15, stiffness: 400 });
      rotation.value = withSpring(0, { damping: 15, stiffness: 400 });
    });

  // Combine gestures for optimal user experience
  const composedGesture = Gesture.Exclusive(longPressGesture, tapGesture);

  // Animated style with sophisticated shadow and transform effects
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { rotateZ: `${rotation.value}deg` }
      ],
      shadowOpacity: shadowOpacity.value,
      elevation: elevation.value,
    };
  });

  // Animated icon style for enhanced visual feedback
  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: iconScale.value }]
    };
  });

  // Initialize animations on mount for smooth entrance
  useEffect(() => {
    scale.value = withSpring(1, { damping: 20, stiffness: 400 });
    shadowOpacity.value = withSpring(0.25, { damping: 20, stiffness: 400 });
  }, []);

  return (
    <GestureDetector gesture={composedGesture}>
      <AnimatedPressable
        className={`items-center justify-center rounded-full bg-primary-500 dark:bg-primary-600 ${className}`}
        style={[
          animatedStyle,
          {
            width: size,
            height: size,
            // Enhanced shadow system matching PlantCard and strains quality
            shadowColor: '#10b981', // primary green
            shadowOffset: { width: 0, height: 6 },
            shadowRadius: 12,
            // Android elevation for shadow
            elevation: 8,
          }
        ]}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        testID={testID}
      >
        <Animated.View style={animatedIconStyle}>
          <OptimizedIcon 
            name={iconName} 
            size={size * 0.54} 
            color="white" 
          />
        </Animated.View>
      </AnimatedPressable>
    </GestureDetector>
  );
}

export default FloatingActionButton;
