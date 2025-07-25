import React, { useState, useCallback, useMemo } from 'react';
import { FlashList } from '@shopify/flash-list';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';

import { format } from '@/lib/utils/date';
import { Pressable } from 'react-native';
import { triggerLightHapticSync, triggerMediumHapticSync } from '@/lib/utils/haptics';
import { PlantTask } from '@/lib/models/PlantTask';
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import DaySelector from './DaySelector';
import TaskNavigation from './TaskNavigation';

export interface WeeklyTaskViewProps {
  tasks: PlantTask[];
  onTaskPress?: (task: PlantTask) => void;
  onTaskComplete?: (task: PlantTask) => void;
  onDateSelect?: (date: Date) => void;
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
}



interface TaskCardProps {
  task: PlantTask;
  onPress?: (task: PlantTask) => void;
  onComplete?: (task: PlantTask) => void;
}

// Task card component inspired by the reference image
const TaskCard = React.memo(({ task, onPress, onComplete }: TaskCardProps) => {
  const scale = useSharedValue(1);
  const completionScale = useSharedValue(1);

  const handlePress = useCallback(() => {
    if (onPress) {
      triggerLightHapticSync();
      onPress(task);
    }
  }, [task, onPress]);

  const handleComplete = useCallback(() => {
    if (onComplete) {
      triggerMediumHapticSync();
      onComplete(task);
    }
  }, [task, onComplete]);

  const cardTapGesture = Gesture.Tap()
    .onStart(() => {
      // ✅ Automatic workletization in v3.19.0+ - no 'worklet' needed
      scale.value = withSpring(0.98, { damping: 20, stiffness: 400 });
    })
    .onEnd(() => {
      // ✅ Automatic workletization in v3.19.0+ - no 'worklet' needed
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    })
    .onFinalize(() => {
      // ✅ Automatic workletization in v3.19.0+ - no 'worklet' needed
      runOnJS(handlePress)();
    });

  const completeTapGesture = Gesture.Tap()
    .onStart(() => {
      // ✅ Automatic workletization in v3.19.0+ - no 'worklet' needed
      completionScale.value = withSpring(0.9, { damping: 20, stiffness: 400 });
    })
    .onEnd(() => {
      // ✅ Automatic workletization in v3.19.0+ - no 'worklet' needed
      completionScale.value = withSpring(1, { damping: 15, stiffness: 300 });
    })
    .onFinalize(() => {
      // ✅ Automatic workletization in v3.19.0+ - no 'worklet' needed
      runOnJS(handleComplete)();
    });

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const completeButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: completionScale.value }],
  }));

  // Get task priority color for left border using NativeWind semantic token classes
  const getPriorityClass = useCallback(() => {
    switch (task.priorityLevel) {
      case 'critical':
        return 'bg-error dark:bg-error-dark';
      case 'high':
        return 'bg-warning dark:bg-warning-dark';
      case 'medium':
        return 'bg-secondary dark:bg-secondary-dark';
      default:
        return 'bg-primary dark:bg-primary-dark';
    }
  }, [task.priorityLevel]);

  return (
    <GestureDetector gesture={cardTapGesture}>
      <ThemedView className="mx-4 mb-3 rounded-2xl overflow-hidden">
        <Animated.View
          style={cardAnimatedStyle}
          accessibilityRole="button"
          accessibilityLabel={`Task: ${task.title}`}
        >
          {/* Colored left border using ThemedView and semantic tokens, all via NativeWind classes */}
          <ThemedView
            className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-tl-2xl rounded-bl-2xl ${getPriorityClass()}`}
          />
          <ThemedView className="flex-row items-center p-4 pl-6 bg-white dark:bg-neutral-900 shadow-sm">
            {/* Task Content */}
            <ThemedView className="flex-1">
              <ThemedText className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {task.title}
              </ThemedText>
              {task.description && (
                <ThemedText className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                  {task.description}
                </ThemedText>
              )}
              {/* Time estimate like in reference */}
              {task.estimatedDuration && (
                <ThemedView className="mt-2 flex-row items-center">
                  <ThemedView className="rounded-full bg-neutral-100 dark:bg-neutral-700 px-3 py-1">
                    <ThemedText className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                      {task.estimatedDurationFormatted}
                    </ThemedText>
                  </ThemedView>
                </ThemedView>
              )}
            </ThemedView>
            {/* Completion checkbox */}
            {onComplete && (
              <GestureDetector gesture={completeTapGesture}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: task.isCompleted }}
                  accessibilityLabel="Mark task as completed"
                  className={`ml-3 h-6 w-6 items-center justify-center rounded-full border-2 transition-colors duration-200
                    ${task.isCompleted
                        ? 'border-primary bg-primary dark:border-primary-dark dark:bg-primary-dark'
                        : 'border-neutral-300 bg-transparent dark:border-neutral-700'}
                  `}
                  style={completeButtonAnimatedStyle}
                  onPress={onComplete ? () => onComplete(task) : undefined}
                >
                  {task.isCompleted && (
                    <OptimizedIcon
                      name="checkmark"
                      size={14}
                      // Use semantic text color tokens for the checkmark
                      className="text-white dark:text-foreground"
                    />
                  )}
                </Pressable>
              </GestureDetector>
            )}
          </ThemedView>
        </Animated.View>
      </ThemedView>
    </GestureDetector>
  );
});

TaskCard.displayName = 'TaskCard';

export default function WeeklyTaskView({
  tasks,
  onTaskPress,
  onTaskComplete,
  onDateSelect,
  onRefresh,
  refreshing = false
}: WeeklyTaskViewProps) {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(new Date());



  // Filter tasks for selected date
  const tasksForSelectedDate = useMemo(() => {
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    return tasks.filter(task => {
      const taskDateStr = format(new Date(task.dueDate), 'yyyy-MM-dd');
      return taskDateStr === selectedDateStr;
    });
  }, [tasks, selectedDate]);

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    onDateSelect?.(date);
  }, [onDateSelect]);

  const renderTaskItem = useCallback(({ item }: { item: PlantTask }) => (
    <TaskCard
      task={item}
      onPress={onTaskPress}
      onComplete={onTaskComplete}
    />
  ), [onTaskPress, onTaskComplete]);

  return (
    <ThemedView className="flex-1">
      {/* Header with current date */}
      <ThemedView className="px-4 py-2">
        <ThemedText className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          {format(selectedDate, 'EEEE')}
        </ThemedText>
        <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
          {format(selectedDate, 'MMMM d, yyyy')}
        </ThemedText>
      </ThemedView>

      {/* Simple navigation controls (today button, date picker) */}
      <TaskNavigation
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        onTodayPress={() => {
          const today = new Date();
          setSelectedDate(today);
        }}
      />

      {/* Horizontal day selector with FlashList scrolling */}
      <DaySelector
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        tasks={tasks}
        onRefresh={onRefresh}
        refreshing={refreshing}
        dateRange={14} // Show 14 days for better navigation
      />

      {/* Tasks list */}
      <ThemedView className="flex-1">
        {tasksForSelectedDate.length > 0 ? (
          <FlashList
            data={tasksForSelectedDate}
            renderItem={renderTaskItem}
            estimatedItemSize={80}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        ) : (
          <ThemedView className="flex-1 items-center justify-center px-4">
            <OptimizedIcon name="calendar-outline" size={48} className="text-neutral-400 dark:text-neutral-500" />
            <ThemedText className="mt-4 text-center text-lg font-medium text-neutral-500 dark:text-neutral-400">
              {t('calendar.weekly_view.no_tasks', 'No tasks for this day')}
            </ThemedText>
            <ThemedText className="mt-2 text-center text-sm text-neutral-400 dark:text-neutral-500">
              {t('calendar.weekly_view.no_tasks_subtitle', 'Tap the + button to add a new task')}
            </ThemedText>
          </ThemedView>
        )}
      </ThemedView>
    </ThemedView>
  );
}