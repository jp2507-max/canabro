import React, { useState, useCallback } from 'react';
import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated from 'react-native-reanimated';

import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import TaskHorizontalLayout from './TaskHorizontalLayout';
import TaskVerticalLayout from './TaskVerticalLayout';
import BulkTaskActions from './BulkTaskActions';
import { useButtonAnimation } from '@/lib/animations/useButtonAnimation';
import { useTaskData } from '@/lib/hooks/useTaskData';
import { useTaskActions } from '@/lib/hooks/useTaskActions';
import { triggerLightHapticSync } from '@/lib/utils/haptics';
import { PlantTask } from '@/lib/models/PlantTask';

interface TaskReminderContainerProps {
  plantId?: string;
  selectedDate?: Date;
  showCompleted?: boolean;
  onTaskPress?: (task: PlantTask) => void;
  layoutMode?: 'horizontal' | 'vertical';
}

const TaskReminderContainer: React.FC<TaskReminderContainerProps> = ({
  plantId,
  selectedDate = new Date(),
  showCompleted = false,
  onTaskPress,
  layoutMode = 'vertical',
}) => {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showBatchActions, setShowBatchActions] = useState(false);

  // Load task data
  const {
    tasks,
    plants,
    plantMap,
    tasksByDate,
    loading,
    dateRange,
    triggerRefresh,
  } = useTaskData({
    plantId,
    selectedDate,
    showCompleted,
  });

  // Task actions with notification handling
  const {
    isProcessing,
    handleMarkDone,
    handleSnooze,
    handleReschedule,
    handleBulkComplete,
    handleBulkSnooze,
    handleBulkReschedule,
  } = useTaskActions({
    plantMap,
    onTaskUpdate: triggerRefresh,
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    triggerRefresh();
    // Add a small delay for visual feedback
    setTimeout(() => setRefreshing(false), 1000);
  }, [triggerRefresh]);

  const handleSelectTask = useCallback((task: PlantTask) => {
    setSelectedTasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(task.id)) {
        newSet.delete(task.id);
      } else {
        newSet.add(task.id);
      }
      return newSet;
    });
  }, []);

  const toggleBatchMode = useCallback(() => {
    setShowBatchActions(!showBatchActions);
    setSelectedTasks(new Set());
    triggerLightHapticSync();
  }, [showBatchActions]);

  const handleBulkCompleteWrapper = useCallback(async (taskIds: string[]) => {
    await handleBulkComplete(taskIds);
    setSelectedTasks(new Set());
    setShowBatchActions(false);
  }, [handleBulkComplete]);

  const handleBulkSnoozeWrapper = useCallback(async (taskIds: string[], minutes: number) => {
    await handleBulkSnooze(taskIds, tasks, minutes);
    setSelectedTasks(new Set());
    setShowBatchActions(false);
  }, [handleBulkSnooze, tasks]);

  const handleBulkRescheduleWrapper = useCallback(async (taskIds: string[], newDate: Date) => {
    await handleBulkReschedule(taskIds, newDate);
    setSelectedTasks(new Set());
    setShowBatchActions(false);
  }, [handleBulkReschedule]);

  const clearSelection = useCallback(() => {
    setSelectedTasks(new Set());
    setShowBatchActions(false);
  }, []);

  const batchActionsAnimation = useButtonAnimation({
    enableHaptics: true,
    hapticStyle: 'medium',
    onPress: toggleBatchMode,
  });

  // Empty state
  if (tasks.length === 0 && !loading) {
    return (
      <ThemedView className="flex-1 items-center justify-center p-6">
        <OptimizedIcon
          name="checkmark-circle"
          size={64}
          className="mb-4 text-primary-500"
        />
        <ThemedText variant="heading" className="mb-2 text-center text-xl">
          {showCompleted
            ? t('taskReminders.noCompletedTasks')
            : t('taskReminders.noActiveTasks')
          }
        </ThemedText>
        <ThemedText variant="muted" className="text-center">
          {showCompleted
            ? t('taskReminders.noCompletedTasksDescription')
            : t('taskReminders.noActiveTasksDescription')
          }
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView className="flex-1">
      {/* Header with batch actions */}
      <ThemedView className="flex-row items-center justify-between p-4">
        <ThemedText variant="heading" className="text-xl">
          {layoutMode === 'horizontal' 
            ? t('taskReminders.upcomingTasks')
            : showCompleted 
              ? t('taskReminders.completed') 
              : t('taskReminders.active')
          }
        </ThemedText>
        
        <Animated.View style={batchActionsAnimation.animatedStyle}>
          <Pressable {...batchActionsAnimation.handlers}>
            <ThemedView
              className={`rounded-lg px-3 py-2 ${
                showBatchActions
                  ? 'bg-primary-500'
                  : 'bg-neutral-200 dark:bg-neutral-700'
              }`}
            >
              <OptimizedIcon
                name="checkmark-circle"
                size={16}
                className={
                  showBatchActions
                    ? 'text-white'
                    : 'text-neutral-700 dark:text-neutral-300'
                }
              />
            </ThemedView>
          </Pressable>
        </Animated.View>
      </ThemedView>

      {/* Layout-specific content */}
      {layoutMode === 'horizontal' ? (
        <TaskHorizontalLayout
          tasks={tasks}
          plants={plants}
          dateRange={dateRange}
          selectedTasks={selectedTasks}
          showBatchActions={showBatchActions}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onMarkDone={handleMarkDone}
          onSnooze={handleSnooze}
          onReschedule={handleReschedule}
          onSelectTask={handleSelectTask}
        />
      ) : (
        <TaskVerticalLayout
          tasks={tasks}
          plants={plants}
          selectedTasks={selectedTasks}
          showBatchActions={showBatchActions}
          showCompleted={showCompleted}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onMarkDone={handleMarkDone}
          onSnooze={handleSnooze}
          onReschedule={handleReschedule}
          onSelectTask={handleSelectTask}
        />
      )}

      {/* Bulk actions */}
      <BulkTaskActions
        selectedTasks={selectedTasks}
        tasks={tasks}
        onBulkComplete={handleBulkCompleteWrapper}
        onBulkReschedule={handleBulkRescheduleWrapper}
        onBulkSnooze={handleBulkSnoozeWrapper}
        onClearSelection={clearSelection}
        isVisible={showBatchActions && selectedTasks.size > 0}
      />
    </ThemedView>
  );
};

export default TaskReminderContainer;
