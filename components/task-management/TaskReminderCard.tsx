import React from 'react';
import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated from 'react-native-reanimated';

import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import { useButtonAnimation } from '@/lib/animations/useButtonAnimation';
import { useCardAnimation } from '@/lib/animations/useCardAnimation';
import { PlantTask } from '@/lib/models/PlantTask';
import { Plant } from '@/lib/models/Plant';
import { format } from '@/lib/utils/date';

interface TaskReminderCardProps {
  task: PlantTask;
  plant: Plant;
  onMarkDone: (task: PlantTask) => void;
  onSnooze: (task: PlantTask, minutes: number) => void;
  onReschedule: (task: PlantTask) => void;
  isSelected: boolean;
  onSelect: (task: PlantTask) => void;
  showSelection: boolean;
  isHorizontalLayout?: boolean;
}

const TaskReminderCard: React.FC<TaskReminderCardProps> = ({
  task,
  plant,
  onMarkDone,
  onSnooze,
  onReschedule,
  isSelected,
  onSelect,
  showSelection,
  isHorizontalLayout = false,
}) => {
  const { t } = useTranslation();
  const { animatedStyle, handlers } = useCardAnimation({
    enableHaptics: true,
    hapticStyle: 'light',
    onPress: () => {
      if (showSelection) {
        onSelect(task);
      }
    },
  });

  const markDoneAnimation = useButtonAnimation({
    enableHaptics: true,
    hapticStyle: 'medium',
    onPress: () => onMarkDone(task),
  });

  const snoozeAnimation = useButtonAnimation({
    enableHaptics: true,
    hapticStyle: 'light',
    onPress: () => onSnooze(task, 60), // 1 hour snooze
  });

  const rescheduleAnimation = useButtonAnimation({
    enableHaptics: true,
    hapticStyle: 'light',
    onPress: () => onReschedule(task),
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/10';
      case 'high':
        return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/10';
      case 'medium':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10';
      default:
        return 'border-l-neutral-300 dark:border-l-neutral-600 bg-neutral-50 dark:bg-neutral-800';
    }
  };

  const getTaskTypeIcon = (taskType: string) => {
    switch (taskType) {
      case 'watering':
        return 'water-outline';
      case 'feeding':
        return 'leaf-outline';
      case 'inspection':
        return 'eye-outline';
      case 'pruning':
        return 'cut-outline';
      case 'harvest':
        return 'basket-outline';
      case 'training':
        return 'fitness-outline';
      default:
        return 'checkmark-circle';
    }
  };

  const formatDueTime = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffInMinutes = Math.floor((due.getTime() - now.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 0) {
      const overdue = Math.abs(diffInMinutes);
      if (overdue < 60) {
        return t('taskReminders.overdueMinutes', { minutes: overdue });
      } else {
        const hours = Math.floor(overdue / 60);
        return t('taskReminders.overdueHours', { hours });
      }
    } else if (diffInMinutes < 60) {
      return t('taskReminders.dueInMinutes', { minutes: diffInMinutes });
    } else {
      const hours = Math.floor(diffInMinutes / 60);
      return t('taskReminders.dueInHours', { hours });
    }
  };

  // Horizontal layout for 5-day view
  if (isHorizontalLayout) {
    return (
      <Animated.View style={animatedStyle} className="mr-3">
        <Pressable {...handlers}>
          <ThemedView
            variant="card"
            className={`w-64 border-l-4 p-3 ${getPriorityColor(task.priority || 'low')} ${
              isSelected ? 'ring-2 ring-primary-500' : ''
            }`}
          >
            {/* Compact header for horizontal layout */}
            <ThemedView className="mb-2 flex-row items-center justify-between">
              <ThemedView className="flex-1 flex-row items-center">
                {plant.imageUrl && (
                  <ThemedView className="mr-2 h-8 w-8 overflow-hidden rounded-lg">
                    <Animated.Image
                      source={{ uri: plant.imageUrl }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  </ThemedView>
                )}
                <ThemedView className="flex-1">
                  <ThemedText variant="heading" className="text-sm font-semibold">
                    {plant.name}
                  </ThemedText>
                  <ThemedText variant="muted" className="text-xs">
                    {plant.strain}
                  </ThemedText>
                </ThemedView>
              </ThemedView>
              
              {showSelection && (
                <Animated.View style={markDoneAnimation.animatedStyle}>
                  <Pressable {...markDoneAnimation.handlers}>
                    <ThemedView
                      className={`h-5 w-5 rounded-full border-2 ${
                        isSelected
                          ? 'border-primary-500 bg-primary-500'
                          : 'border-neutral-300 dark:border-neutral-600'
                      }`}
                    >
                      {isSelected && (
                        <OptimizedIcon
                          name="checkmark"
                          size={10}
                          className="text-white"
                        />
                      )}
                    </ThemedView>
                  </Pressable>
                </Animated.View>
              )}
            </ThemedView>

            {/* Task details - compact */}
            <ThemedView className="mb-2 flex-row items-center">
              <OptimizedIcon
                name={getTaskTypeIcon(task.taskType)}
                size={16}
                className="mr-2 text-primary-500"
              />
              <ThemedView className="flex-1">
                <ThemedText variant="heading" className="text-sm">
                  {task.title}
                </ThemedText>
                {task.estimatedDuration && (
                  <ThemedText variant="muted" className="text-xs">
                    ~{task.estimatedDurationFormatted}
                  </ThemedText>
                )}
              </ThemedView>
            </ThemedView>

            {/* Due time and priority - compact */}
            <ThemedView className="mb-3 flex-row items-center justify-between">
              <ThemedText
                className={`text-xs font-medium ${
                  task.isOverdue
                    ? 'text-red-500'
                    : task.priority === 'high' || task.priority === 'critical'
                    ? 'text-orange-500'
                    : 'text-neutral-600 dark:text-neutral-400'
                }`}
              >
                {formatDueTime(task.dueDate)}
              </ThemedText>
              <ThemedText variant="muted" className="text-xs">
                {format(new Date(task.dueDate), 'h:mm a')}
              </ThemedText>
            </ThemedView>

            {/* Compact action buttons */}
            {!showSelection && (
              <ThemedView className="flex-row space-x-1">
                <Animated.View style={markDoneAnimation.animatedStyle} className="flex-1">
                  <Pressable {...markDoneAnimation.handlers}>
                    <ThemedView className="flex-row items-center justify-center rounded-md bg-primary-500 px-2 py-1">
                      <OptimizedIcon name="checkmark" size={12} className="mr-1 text-white" />
                      <ThemedText className="text-xs font-medium text-white">
                        {t('taskReminders.done')}
                      </ThemedText>
                    </ThemedView>
                  </Pressable>
                </Animated.View>

                <Animated.View style={snoozeAnimation.animatedStyle}>
                  <Pressable {...snoozeAnimation.handlers}>
                    <ThemedView className="flex-row items-center justify-center rounded-md bg-neutral-200 px-2 py-1 dark:bg-neutral-700">
                      <OptimizedIcon
                        name="refresh"
                        size={12}
                        className="text-neutral-700 dark:text-neutral-300"
                      />
                    </ThemedView>
                  </Pressable>
                </Animated.View>
              </ThemedView>
            )}
          </ThemedView>
        </Pressable>
      </Animated.View>
    );
  }

  // Standard vertical layout (reused from CareReminders)
  return (
    <Animated.View style={animatedStyle}>
      <Pressable {...handlers}>
        <ThemedView
          variant="card"
          className={`mb-3 border-l-4 p-4 ${getPriorityColor(task.priority || 'low')} ${
            isSelected ? 'ring-2 ring-primary-500' : ''
          }`}
        >
          {/* Header with plant info and selection */}
          <ThemedView className="mb-3 flex-row items-center justify-between">
            <ThemedView className="flex-1 flex-row items-center">
              {plant.imageUrl && (
                <ThemedView className="mr-3 h-12 w-12 overflow-hidden rounded-lg">
                  <Animated.Image
                    source={{ uri: plant.imageUrl }}
                    className="h-full w-full"
                    resizeMode="cover"
                  />
                </ThemedView>
              )}
              <ThemedView className="flex-1">
                <ThemedText variant="heading" className="text-base">
                  {plant.name}
                </ThemedText>
                <ThemedText variant="muted" className="text-sm">
                  {plant.strain}
                </ThemedText>
              </ThemedView>
            </ThemedView>
            
            {showSelection && (
              <Animated.View style={markDoneAnimation.animatedStyle}>
                <Pressable {...markDoneAnimation.handlers}>
                  <ThemedView
                    className={`h-6 w-6 rounded-full border-2 ${
                      isSelected
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-neutral-300 dark:border-neutral-600'
                    }`}
                  >
                    {isSelected && (
                      <OptimizedIcon
                        name="checkmark"
                        size={12}
                        className="text-white"
                      />
                    )}
                  </ThemedView>
                </Pressable>
              </Animated.View>
            )}
          </ThemedView>

          {/* Task details */}
          <ThemedView className="mb-3 flex-row items-center">
            <OptimizedIcon
              name={getTaskTypeIcon(task.taskType)}
              size={20}
              className="mr-3 text-primary-500"
            />
            <ThemedView className="flex-1">
              <ThemedText variant="heading" className="text-base">
                {task.title}
              </ThemedText>
              {task.description && (
                <ThemedText variant="muted" className="text-sm">
                  {task.description}
                </ThemedText>
              )}
              {task.estimatedDuration && (
                <ThemedText variant="muted" className="text-sm">
                  Estimated: {task.estimatedDurationFormatted}
                </ThemedText>
              )}
            </ThemedView>
          </ThemedView>

          {/* Due date and priority */}
          <ThemedView className="mb-4 flex-row items-center justify-between">
            <ThemedText
              className={`text-sm font-medium ${
                task.isOverdue
                  ? 'text-red-500'
                  : task.priority === 'critical'
                  ? 'text-red-500'
                  : task.priority === 'high'
                  ? 'text-orange-500'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              {formatDueTime(task.dueDate)}
            </ThemedText>
            <ThemedText variant="muted" className="text-xs">
              {format(new Date(task.dueDate), 'MMM d, h:mm a')}
            </ThemedText>
          </ThemedView>

          {/* Action buttons */}
          {!showSelection && (
            <ThemedView className="flex-row space-x-2">
              <Animated.View style={markDoneAnimation.animatedStyle} className="flex-1">
                <Pressable {...markDoneAnimation.handlers}>
                  <ThemedView className="flex-row items-center justify-center rounded-lg bg-primary-500 px-4 py-2">
                    <OptimizedIcon name="checkmark" size={16} className="mr-2 text-white" />
                    <ThemedText className="font-medium text-white">
                      {t('taskReminders.markDone')}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              </Animated.View>

              <Animated.View style={snoozeAnimation.animatedStyle}>
                <Pressable {...snoozeAnimation.handlers}>
                  <ThemedView className="flex-row items-center justify-center rounded-lg bg-neutral-200 px-3 py-2 dark:bg-neutral-700">
                    <OptimizedIcon
                      name="refresh"
                      size={16}
                      className="mr-1 text-neutral-700 dark:text-neutral-300"
                    />
                    <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {t('taskReminders.snooze')}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              </Animated.View>

              <Animated.View style={rescheduleAnimation.animatedStyle}>
                <Pressable {...rescheduleAnimation.handlers}>
                  <ThemedView className="flex-row items-center justify-center rounded-lg bg-neutral-200 px-3 py-2 dark:bg-neutral-700">
                    <OptimizedIcon
                      name="calendar-outline"
                      size={16}
                      className="text-neutral-700 dark:text-neutral-300"
                    />
                  </ThemedView>
                </Pressable>
              </Animated.View>
            </ThemedView>
          )}
        </ThemedView>
      </Pressable>
    </Animated.View>
  );
};

export default TaskReminderCard;
