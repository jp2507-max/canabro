import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect } from 'react';
import { Modal, Pressable, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnUI,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';
import { OptimizedIcon } from '../ui/OptimizedIcon';

// Reanimated AnimatedPressable
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface TaskActionsProps {
  visible: boolean;
  onClose: () => void;
  navigateToAddTaskPlant: () => void;
  navigateToAddTaskAll: () => void;
}

// Individual action button component with animations
interface ActionButtonProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  color?: string;
  delay?: number;
}

const ActionButton = React.memo(({ icon, title, subtitle, onPress, color = '#10b981', delay = 0 }: ActionButtonProps) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    // Entrance animation with staggered delay
    const timer = setTimeout(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 300 });
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
    }, delay);

    return () => clearTimeout(timer);
  }, [scale, opacity, translateY, delay]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  }, [onPress]);

  const tapGesture = Gesture.Tap()
    .onStart(() => {
      'worklet';
      pressScale.value = withSpring(0.95, { damping: 20, stiffness: 400 });
    })
    .onEnd(() => {
      'worklet';
      pressScale.value = withSpring(1, { damping: 15, stiffness: 300 });
      runOnJS(handlePress)();
    })
    .onFinalize(() => {
      'worklet';
      pressScale.value = withSpring(1, { damping: 15, stiffness: 300 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value * pressScale.value },
      { translateY: translateY.value }
    ],
    opacity: opacity.value,
  }));

  return (
    <GestureDetector gesture={tapGesture}>
      <AnimatedPressable
        className="mb-4 flex-row items-center rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-800"
        style={[
          animatedStyle,
          {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={subtitle || `Tap to ${title.toLowerCase()}`}
      >
        {/* Icon Container */}
        <ThemedView className="mr-4 h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
          <OptimizedIcon
            name={icon as any}
            size={24}
            color={color}
          />
        </ThemedView>

        {/* Text Content */}
        <ThemedView className="flex-1">
          <ThemedText className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {title}
          </ThemedText>
          {subtitle && (
            <ThemedText className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              {subtitle}
            </ThemedText>
          )}
        </ThemedView>

        {/* Arrow Icon */}
        <OptimizedIcon
          name="chevron-forward-outline"
          size={20}
          color="#6b7280"
        />
      </AnimatedPressable>
    </GestureDetector>
  );
});

ActionButton.displayName = 'ActionButton';

function TaskActions({
  visible,
  onClose,
  navigateToAddTaskPlant,
  navigateToAddTaskAll,
}: TaskActionsProps) {
  const { height } = useWindowDimensions();
  
  // Animation values
  const backdropOpacity = useSharedValue(0);
  const modalTranslateY = useSharedValue(height);
  const modalScale = useSharedValue(0.9);



  const handleClosePress = useCallback(() => {
    Haptics.selectionAsync();
    // animate out, then close
    modalTranslateY.value = withTiming(height, { duration: 300 });
    backdropOpacity.value = withTiming(0, { duration: 300 });
    modalScale.value = withTiming(0.9, { duration: 300 }, (finished) => {
      if (finished) { runOnJS(onClose)(); }
    });
  }, [onClose, height, modalTranslateY, backdropOpacity, modalScale]);

  // Backdrop tap gesture
  const backdropTapGesture = Gesture.Tap()
    .onEnd(() => {
      'worklet';
      // Provide haptic feedback
      runOnJS(Haptics.selectionAsync)();
      // Animate modal close
      modalTranslateY.value = withTiming(height, { duration: 300 });
      backdropOpacity.value = withTiming(0, { duration: 300 });
      modalScale.value = withTiming(0.9, { duration: 300 });
      runOnJS(onClose)();
    });

  // Close button tap gesture
  const closeTapGesture = Gesture.Tap()
    .onEnd(() => {
      'worklet';
      runOnJS(handleClosePress)();
    });

  // Modal swipe down gesture
  const swipeGesture = Gesture.Pan()
    .onUpdate((event) => {
      'worklet';
      if (event.translationY > 0) {
        modalTranslateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      'worklet';
      if (event.translationY > 100 || event.velocityY > 500) {
        // Close modal
        modalTranslateY.value = withTiming(height, { duration: 300 });
        backdropOpacity.value = withTiming(0, { duration: 300 });
        modalScale.value = withTiming(0.9, { duration: 300 });
        runOnJS(onClose)();
      } else {
        // Snap back
        modalTranslateY.value = withSpring(0, { damping: 20, stiffness: 300 });
      }
    });

  // Modal entrance/exit animations
  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 300 });
      modalTranslateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      modalScale.value = withSpring(1, { damping: 15, stiffness: 200 });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 300 });
      modalTranslateY.value = withTiming(height, { duration: 300 });
      modalScale.value = withTiming(0.9, { duration: 300 });
    }
  }, [visible, backdropOpacity, modalTranslateY, modalScale, height]);

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: modalTranslateY.value },
      { scale: modalScale.value }
    ],
  }));

  const handlePlantTaskPress = useCallback(() => {
    onClose();
    navigateToAddTaskPlant();
  }, [onClose, navigateToAddTaskPlant]);

  const handleAllTasksPress = useCallback(() => {
    onClose();
    navigateToAddTaskAll();
  }, [onClose, navigateToAddTaskAll]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      {/* Animated Backdrop */}
      <GestureDetector gesture={backdropTapGesture}>
        <Animated.View
          className="flex-1 bg-black/50"
          style={backdropAnimatedStyle}
        />
      </GestureDetector>

      {/* Modal Content */}
      <GestureDetector gesture={swipeGesture}>
        <AnimatedPressable
          className="absolute bottom-0 left-0 right-0 min-h-[280px] rounded-t-3xl bg-white pt-2 dark:bg-neutral-900"
          style={modalAnimatedStyle}
        >
          {/* Swipe Indicator */}
          <ThemedView className="mb-6 items-center">
            <ThemedView className="h-1 w-12 rounded-full bg-neutral-300 dark:bg-neutral-600" />
          </ThemedView>

          {/* Header */}
          <ThemedView className="mb-6 flex-row items-center justify-between px-6">
            <ThemedText className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Add Task
            </ThemedText>
            <GestureDetector gesture={closeTapGesture}>
              <AnimatedPressable
                className="h-10 w-10 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800"
              >
                <OptimizedIcon
                  name="close"
                  size={20}
                  color="#6b7280"
                />
              </AnimatedPressable>
            </GestureDetector>
          </ThemedView>

          {/* Action Buttons */}
          <ThemedView className="px-6 pb-8">
            <ActionButton
              icon="leaf"
              title="Add Task to Plant"
              subtitle="Create a task for a specific plant"
              onPress={handlePlantTaskPress}
              color="#10b981"
              delay={100}
            />
            <ActionButton
              icon="layers-outline"
              title="Add Task to All Plants"
              subtitle="Create a task that applies to all your plants"
              onPress={handleAllTasksPress}
              color="#10b981"
              delay={200}
            />
          </ThemedView>
        </AnimatedPressable>
      </GestureDetector>
    </Modal>
  );
}

export default React.memo(TaskActions);
