import React, { memo, useCallback, useState } from 'react';
import { View, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import ThemedText from '@/components/ui/ThemedText';
import ThemedView from '@/components/ui/ThemedView';
import { useCardAnimation } from '@/lib/animations';
import { triggerLightHapticSync, triggerMediumHapticSync } from '@/lib/utils/haptics';
import { PlantTask } from '@/lib/models/PlantTask';
import type { TaskType } from '@/lib/types/taskTypes';

// Helper to map priority to NativeWind class
function getPriorityColorClass(priority: keyof typeof PRIORITY_COLORS): string {
  switch (priority) {
    case 'low':
      return 'bg-priority-low';
    case 'medium':
      return 'bg-priority-medium';
    case 'high':
      return 'bg-priority-high';
    case 'critical':
      return 'bg-priority-critical';
    default:
      return 'bg-priority-low';
  }
}

// Helper to map task type to NativeWind class, with optional opacity
function getTaskColorClass(type: keyof typeof TASK_COLORS, opacity20 = false): string {
  const base = `bg-task-${type}`;
  return opacity20 ? `${base}/20` : base;
}

// Helper to map task type to text color class
function getTaskTextColorClass(type: keyof typeof TASK_COLORS): string {
  return `text-task-${type}`;
}


// Direct color values for Reanimated animations
const TASK_COLORS_DIRECT = {
  watering: '#3b82f6',    // blue-500
  feeding: '#8b5cf6',     // violet-500
  inspection: '#10b981',  // emerald-500
  pruning: '#ec4899',     // pink-500
  harvest: '#f59e0b',     // amber-500
  transplant: '#14b8a6',  // teal-500
  training: '#f97316',    // orange-500
  defoliation: '#ef4444', // red-500
  flushing: '#06b6d4',    // cyan-500
} as const;

// Task type color definitions using semantic tokens (CSS variables) for static styling
const TASK_COLORS = {
  watering: 'var(--color-task-watering)',
  feeding: 'var(--color-task-feeding)',
  inspection: 'var(--color-task-inspection)',
  pruning: 'var(--color-task-pruning)',
  harvest: 'var(--color-task-harvest)',
  transplant: 'var(--color-task-transplant)',
  training: 'var(--color-task-training)',
  defoliation: 'var(--color-task-defoliation)',
  flushing: 'var(--color-task-flushing)',
} as const;

// Priority color definitions using semantic tokens (CSS variables)
const PRIORITY_COLORS = {
  low: 'var(--color-priority-low)',
  medium: 'var(--color-priority-medium)',
  high: 'var(--color-priority-high)',
  critical: 'var(--color-priority-critical)',
} as const;


// Task type icons
const TASK_ICONS: Record<TaskType, TaskIconName> = {
  watering: 'water-outline',
  feeding: 'leaf-outline',
  inspection: 'eye-outline',
  pruning: 'cut-outline',
  harvest: 'basket-outline',
  transplant: 'move-outline',
  training: 'fitness-outline',
  defoliation: 'remove-outline',
  flushing: 'refresh-outline',
};

// Type for valid Ionicons names
type TaskIconName = keyof typeof Ionicons.glyphMap;

function getTaskIconName(type: TaskType): TaskIconName {
  return TASK_ICONS[type] ?? TASK_ICONS.inspection;
}

interface TaskCardProps {
  task: PlantTask;
  plantName: string;
  plantImage?: string;
  onPress: (task: PlantTask) => void;
  onComplete: (taskId: string) => void;
  onSnooze?: (taskId: string, minutes: number) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TaskCard = memo<TaskCardProps>(({ 
  task, 
  plantName, 
  plantImage, 
  onPress, 
  onComplete, 
  onSnooze 
}) => {
  const [isCompleted, setIsCompleted] = useState(task.isCompleted);

  // Swipe gesture values
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Cancel animations on unmount
  React.useEffect(() => {
    return () => {
      cancelAnimation(translateX);
      cancelAnimation(opacity);
    };
  }, []);

  // Card animation hook
  const { animatedStyle: cardAnimatedStyle, handlers } = useCardAnimation({
    enableHaptics: true,
    hapticStyle: 'light',
    onPress: () => onPress(task),
  });

  // Get task type color and icon
  const taskTypeKey = (task.taskType as keyof typeof TASK_COLORS) || 'inspection';
  const taskColor = TASK_COLORS[taskTypeKey];
  const taskColorClass = getTaskColorClass(taskTypeKey, true); // for bg with opacity
  const taskIcon = getTaskIconName(task.taskType as TaskType);
  const priorityClass = getPriorityColorClass((task.priority ?? 'low') as keyof typeof PRIORITY_COLORS);
  const taskTextColorClass = getTaskTextColorClass(taskTypeKey);

  // Completion checkbox animation
  const checkboxAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = isCompleted 
      ? TASK_COLORS_DIRECT[taskTypeKey] 
      : '#F3F4F6'; // direct color value for uncompleted state (neutral-100)
    return {
      transform: [{ scale: withSpring(isCompleted ? 1.1 : 1) }],
      backgroundColor: withSpring(backgroundColor),
    };
  });

  // Task completion animation
  const completionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: withSpring(isCompleted ? 0.6 : 1),
    transform: [{ scale: withSpring(isCompleted ? 0.98 : 1) }],
  }));

  // Swipe gesture animation
  const swipeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  // Handle task completion
  const handleComplete = useCallback(() => {
    const newCompletedState = !isCompleted;
    setIsCompleted(newCompletedState);
    
    if (newCompletedState) {
      runOnJS(triggerMediumHapticSync)();
    } else {
      runOnJS(triggerLightHapticSync)();
    }
    
    onComplete(task.id);
  }, [isCompleted, task.id, onComplete]);

  // Handle snooze action
  const handleSnooze = useCallback((minutes: number) => {
    if (onSnooze) {
      runOnJS(triggerLightHapticSync)();
      onSnooze(task.id, minutes);
    }
  }, [task.id, onSnooze]);

  // Swipe gesture handler using modern Gesture API
  const panGesture = Gesture.Pan()
    .onStart(() => {
      runOnJS(triggerLightHapticSync)();
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      
      // Fade out when swiping right (complete)
      if (event.translationX > 0) {
        opacity.value = Math.max(0.3, 1 - Math.abs(event.translationX) / 200);
      }
      // Show snooze action when swiping left
      else if (event.translationX < -50) {
        opacity.value = 0.8;
      }
    })
    .onEnd((event) => {
      const threshold = 100;
      
      if (event.translationX > threshold) {
        // Complete task
        translateX.value = withSpring(300);
        opacity.value = withSpring(0, undefined, () => {
          'worklet';
          runOnJS(handleComplete)();
        });
      } else if (event.translationX < -threshold && onSnooze) {
        // Snooze task
        translateX.value = withSpring(-300);
        opacity.value = withSpring(0, undefined, () => {
          'worklet';
          runOnJS(() => handleSnooze(60))(); // Snooze for 1 hour
        });
      } else {
        // Return to original position
        translateX.value = withSpring(0);
        opacity.value = withSpring(1);
      }
    });

  // Format due date
  const formatDueDate = (date: string) => {
    const dueDate = new Date(date);
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    return `In ${diffDays} days`;
  };

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[swipeAnimatedStyle]} className="mb-3">
        <Animated.View style={[completionAnimatedStyle]}>
          <AnimatedPressable
            style={[cardAnimatedStyle]}
            {...handlers}
            className={`
              bg-white dark:bg-neutral-800 
              rounded-xl 
              border border-neutral-200 dark:border-neutral-700
              ${task.isOverdue && !isCompleted ? 'border-l-4 border-l-red-500' : ''}
            `}
          >
            <ThemedView variant="card" className="p-4 bg-transparent border-0">
              <View className="flex-row items-center space-x-3">
                {/* Plant Image */}
                <View className="relative">
                  {plantImage ? (
                    <Image
                      source={{ uri: plantImage }}
                      className="w-12 h-12 rounded-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-700 items-center justify-center">
                      <Ionicons
                        name="leaf-outline"
                        size={24}
                        className="text-neutral-500 dark:text-neutral-400"
                      />
                    </View>
                  )}
                  
                  {/* Priority indicator */}
                  <View
                    className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-neutral-800 ${priorityClass}`}
                  />
                </View>

                {/* Task Info */}
                <View className="flex-1">
                  <View className="flex-row items-center space-x-2 mb-1">
                    <View
                      className={`w-6 h-6 rounded-full items-center justify-center ${taskColorClass}`}
                    >
                        {/*
                          TypeScript cannot guarantee the type of taskIcon due to dynamic key access.
                          This is safe because getTaskIconName always returns a valid icon name.
                        */}
                        <Ionicons
                          name={taskIcon}
                          size={14}
                          className={taskTextColorClass}
                        />
                    </View>
                    <ThemedText variant="default" className="font-semibold flex-1">
                      {task.title}
                    </ThemedText>
                  </View>
                  
                  <ThemedText variant="muted" className="text-sm mb-1">
                    {plantName}
                  </ThemedText>
                  
                  <View className="flex-row items-center justify-between">
                    <ThemedText 
                      variant="caption" 
                      className={`text-xs ${task.isOverdue && !isCompleted ? 'text-red-500' : ''}`}
                    >
                      {formatDueDate(task.dueDate)}
                    </ThemedText>
                    
                    {task.estimatedDuration && (
                      <ThemedText variant="caption" className="text-xs">
                        {task.estimatedDurationFormatted}
                      </ThemedText>
                    )}
                  </View>
                </View>

                {/* Completion Checkbox */}
                <Animated.View style={[checkboxAnimatedStyle]}>
                  <Pressable
                    onPress={handleComplete}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isCompleted }}
                    accessibilityLabel="Mark task as completed"
                    className={`
                      w-8 h-8 rounded-full border-2 items-center justify-center
                      ${isCompleted 
                        ? `${getTaskColorClass(taskTypeKey)} border-transparent` 
                        : 'border-neutral-300 dark:border-neutral-600 bg-transparent'
                      }
                    `}
                  >
                      {isCompleted && (
                        <Ionicons
                          name="checkmark"
                          size={16}
                          className="text-task-checkmark"
                        />
                      )}
                  </Pressable>
                </Animated.View>
              </View>

              {/* Task Notes Preview */}
              {task.description && (
                <ThemedText variant="caption" className="mt-2 text-xs" numberOfLines={1}>
                  {task.description}
                </ThemedText>
              )}
            </ThemedView>
          </AnimatedPressable>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
});

TaskCard.displayName = 'TaskCard';

export default TaskCard;