import React, { useState, useCallback, useMemo } from 'react';
import { Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

import { format, addDays, isToday } from '@/lib/utils/date';
import { PlantTask } from '@/lib/models/PlantTask';
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import { triggerLightHapticSync, triggerMediumHaptic } from '@/lib/utils/haptics';
import { useTranslation } from 'react-i18next';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface WeeklyTaskViewProps {
  tasks: PlantTask[];
  onTaskPress?: (task: PlantTask) => void;
  onTaskComplete?: (task: PlantTask) => void;
  onDateSelect?: (date: Date) => void;
}

interface DayHeaderProps {
  date: Date;
  isSelected: boolean;
  onSelect: (date: Date) => void;
}

// Individual day header component inspired by the reference image
const DayHeader = React.memo(({ date, isSelected, onSelect }: DayHeaderProps) => {
  const scale = useSharedValue(1);
  const selection = useSharedValue(isSelected ? 1 : 0);
  
  const isCurrentToday = isToday(date);
  
  React.useEffect(() => {
    selection.value = withTiming(isSelected ? 1 : 0, { duration: 250 });
  }, [isSelected, selection]);

  const handlePress = useCallback(() => {
    triggerLightHapticSync();
    onSelect(date);
  }, [date, onSelect]);

  const tapGesture = Gesture.Tap()
    .onStart(() => {
      'worklet';
      scale.value = withSpring(0.9, { damping: 20, stiffness: 400 });
    })
    .onEnd(() => {
      'worklet';
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    })
    .onFinalize(() => {
      'worklet';
      runOnJS(handlePress)();
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: isSelected ? undefined : 'transparent',
  }));

  // Use className for theming instead of inline style for better theming support
  const dayButtonClassName = `mx-2 h-12 w-12 items-center justify-center rounded-full ${isSelected ? 'bg-foreground dark:bg-foreground-dark' : ''}`;

  return (
    <GestureDetector gesture={tapGesture}>
      <AnimatedPressable
        className={dayButtonClassName}
        style={animatedStyle}
        accessibilityRole="button"
        accessibilityLabel={`Select ${format(date, 'EEEE, MMMM d')}`}
        accessibilityState={{ selected: isSelected }}>
        <ThemedView className="items-center">
          <ThemedText 
            className={`text-xs font-medium ${
              isSelected 
                ? 'text-white' 
                : isCurrentToday 
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-neutral-500 dark:text-neutral-400'
            }`}>
            {format(date, 'E').charAt(0)} {/* Single letter like S M T W T */}
          </ThemedText>
          <ThemedText 
            className={`text-lg font-bold ${
              isSelected 
                ? 'text-white'
                : isCurrentToday
                  ? 'text-primary-700 dark:text-primary-300'
                  : 'text-neutral-800 dark:text-neutral-200'
            }`}>
            {format(date, 'd')}
          </ThemedText>
        </ThemedView>
      </AnimatedPressable>
    </GestureDetector>
  );
});

DayHeader.displayName = 'DayHeader';

interface TaskCardProps {
  task: PlantTask;
  onPress?: (task: PlantTask) => void;
  onComplete?: (task: PlantTask) => void;
}

// Task card component inspired by the reference image
const TaskCard = React.memo(({ task, onPress, onComplete }: TaskCardProps) => {
  const { t } = useTranslation();
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
      triggerMediumHaptic();
      onComplete(task);
    }
  }, [task, onComplete]);

  const cardTapGesture = Gesture.Tap()
    .onStart(() => {
      'worklet';
      scale.value = withSpring(0.98, { damping: 20, stiffness: 400 });
    })
    .onEnd(() => {
      'worklet';
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    })
    .onFinalize(() => {
      'worklet';
      runOnJS(handlePress)();
    });

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

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const completeButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: completionScale.value }],
  }));

  // Get task priority color class for left border (using semantic color classes)
  const getPriorityColor = useCallback(() => {
    switch (task.priorityLevel) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-amber-500';  
      case 'medium': return 'bg-purple-500';
      default: return 'bg-primary-500';
    }
  }, [task.priorityLevel]);

  return (
    <GestureDetector gesture={cardTapGesture}>
      <AnimatedPressable
        className="mx-4 mb-3 overflow-hidden rounded-2xl bg-white dark:bg-neutral-800"
        style={[
          cardAnimatedStyle,
          {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 2,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Task: ${task.title}`}>
        
        {/* Colored left border with semantic priority color */}
        <ThemedView 
          className={`absolute left-0 top-0 bottom-0 w-1 ${getPriorityColor()}`}
        />
        
        <ThemedView className="flex-row items-center p-4 pl-6">
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
              <AnimatedPressable
                className={`ml-3 h-6 w-6 items-center justify-center rounded-full border-2 ${
                  task.isCompleted 
                    ? 'border-primary-500 bg-primary-500' 
                    : 'border-neutral-300 dark:border-neutral-600'
                }`}
                style={completeButtonAnimatedStyle}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: task.isCompleted }}
                accessibilityLabel="Mark task as completed">
                {task.isCompleted && (
                  <OptimizedIcon name="checkmark" size={14} color="#ffffff" />
                )}
              </AnimatedPressable>
            </GestureDetector>
          )}
        </ThemedView>
      </AnimatedPressable>
    </GestureDetector>
  );
});

TaskCard.displayName = 'TaskCard';

export default function WeeklyTaskView({ 
  tasks, 
  onTaskPress, 
  onTaskComplete, 
  onDateSelect 
}: WeeklyTaskViewProps) {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Generate 5-day range (today + 4 future days)
  const dates = useMemo(() => {
    const result = [];
    const today = new Date();
    for (let i = 0; i < 5; i++) {
      result.push(addDays(today, i));
    }
    return result;
  }, []);

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

      {/* Horizontal 5-day calendar */}
      <ThemedView className="mb-4 py-2">
        <ThemedView className="flex-row justify-center">
          {dates.map((date, index) => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
            const isSelected = dateStr === selectedDateStr;
            
            return (
              <DayHeader
                key={`${dateStr}-${index}`}
                date={date}
                isSelected={isSelected}
                onSelect={handleDateSelect}
              />
            );
          })}
        </ThemedView>
      </ThemedView>

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
            <OptimizedIcon name="calendar-outline" size={48} color="#9ca3af" />
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