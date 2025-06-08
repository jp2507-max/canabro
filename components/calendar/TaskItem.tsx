import { Database } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import * as Haptics from 'expo-haptics';
import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

import { Plant } from '../../lib/models/Plant';
import { PlantTask } from '../../lib/models/PlantTask';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';

// Reanimated AnimatedPressable
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface TaskItemProps {
  task: PlantTask;
  database?: Database;
  isDarkMode?: boolean;
  onComplete?: (task: PlantTask) => void;
  onNavigate?: (plantId: string) => void;
  onPress?: () => void;
}

function TaskItemBase({
  task,
  plant,
  onComplete,
  onNavigate,
  onPress,
}: TaskItemProps & { plant: Plant | null }) {
  // Animation values
  const scale = useSharedValue(1);
  const shadowOpacity = useSharedValue(0.08);
  const elevation = useSharedValue(2);
  const translateY = useSharedValue(0);
  const completionScale = useSharedValue(1);

  // Handle both onPress and onNavigate
  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
    } else if (onNavigate) {
      onNavigate(task.plantId);
    }
  }, [onPress, onNavigate, task.plantId]);

  const handleComplete = useCallback(() => {
    if (onComplete) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete(task);
    }
  }, [onComplete, task]);

  // Main card tap gesture
  const cardTapGesture = Gesture.Tap()
    .onStart(() => {
      'worklet';
      scale.value = withSpring(0.98, { damping: 20, stiffness: 400 });
      shadowOpacity.value = withTiming(0.12, { duration: 150 });
      elevation.value = withTiming(4, { duration: 150 });
      translateY.value = withTiming(-1, { duration: 150 });

      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onEnd(() => {
      'worklet';
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      shadowOpacity.value = withTiming(0.08, { duration: 200 });
      elevation.value = withTiming(2, { duration: 200 });
      translateY.value = withTiming(0, { duration: 200 });
    })
    .onFinalize(() => {
      'worklet';
      runOnJS(handlePress)();
    });

  // Complete button tap gesture
  const completeTapGesture = Gesture.Tap()
    .onStart(() => {
      'worklet';
      completionScale.value = withSpring(0.9, { damping: 20, stiffness: 400 });
    })
    .onEnd(() => {
      'worklet';
      completionScale.value = withSpring(1, { damping: 15, stiffness: 300 });
    })
    .onFinalize(() => {
      'worklet';
      runOnJS(handleComplete)();
    });

  const cardAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: scale.value }, { translateY: translateY.value }],
      shadowOpacity: shadowOpacity.value,
      elevation: elevation.value,
    };
  });

  const completeButtonAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: completionScale.value }],
    };
  });

  // Get task type icon and color
  const getTaskTypeDetails = useCallback(() => {
    const taskType = task.title?.toLowerCase() || '';

    if (taskType.includes('water')) {
      return { icon: 'water-outline' as const, color: '#3b82f6' }; // blue-500
    } else if (taskType.includes('feed') || taskType.includes('fertiliz')) {
      return { icon: 'nutrition-outline' as const, color: '#f59e0b' }; // amber-500
    } else if (taskType.includes('prune') || taskType.includes('trim')) {
      return { icon: 'cut-outline' as const, color: '#8b5cf6' }; // purple-500
    } else if (taskType.includes('harvest')) {
      return { icon: 'flower' as const, color: '#10b981' }; // green-500
    } else {
      return { icon: 'leaf' as const, color: '#10b981' }; // primary-500
    }
  }, [task.title]);

  const { icon, color } = getTaskTypeDetails();

  return (
    <GestureDetector gesture={cardTapGesture}>
      <AnimatedPressable
        className="mx-4 mb-3 overflow-hidden rounded-2xl bg-white dark:bg-neutral-800"
        style={[
          cardAnimatedStyle,
          {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 8,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Task: ${task.title} for ${plant?.name || 'plant'}`}
        accessibilityHint="Tap to view task details">
        <ThemedView className="flex-row items-center p-4">
          {/* Task Type Icon */}
          <ThemedView className="mr-4 h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-700">
            <OptimizedIcon name={icon} size={24} color={color} />
          </ThemedView>

          {/* Task Content */}
          <ThemedView className="flex-1">
            <ThemedText className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              {task.title}
            </ThemedText>
            <ThemedText className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              {plant?.name || 'Unknown Plant'}
            </ThemedText>
            {task.description && (
              <ThemedText className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
                {task.description}
              </ThemedText>
            )}
          </ThemedView>

          {/* Complete Button */}
          {onComplete && (
            <GestureDetector gesture={completeTapGesture}>
              <AnimatedPressable
                className="ml-3 h-10 w-10 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20"
                style={completeButtonAnimatedStyle}
                accessibilityRole="button"
                accessibilityLabel="Mark task as completed"
                accessibilityHint="Tap to complete this task">
                <OptimizedIcon name="checkmark-circle" size={24} color="#10b981" />
              </AnimatedPressable>
            </GestureDetector>
          )}
        </ThemedView>

        {/* Subtle gradient overlay for depth */}
        <ThemedView className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent dark:via-neutral-600" />
      </AnimatedPressable>
    </GestureDetector>
  );
}

// Export a properly typed version of the component
const TaskItem = withObservables(
  ['task'],
  ({ task, database, isDarkMode, onComplete, onNavigate, onPress }: TaskItemProps) => ({
    plant: task.plant,
    task,
    database,
    isDarkMode,
    onComplete,
    onNavigate,
    onPress,
  })
)(TaskItemBase);

export default React.memo(TaskItem);
