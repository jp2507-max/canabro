import React, { useMemo } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';

import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import TaskReminderCard from './TaskReminderCard';
import { PlantTask } from '@/lib/models/PlantTask';
import { Plant } from '@/lib/models/Plant';

interface TaskVerticalLayoutProps {
  tasks: PlantTask[];
  plants: Plant[];
  selectedTasks: Set<string>;
  showBatchActions: boolean;
  showCompleted: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onMarkDone: (task: PlantTask) => void;
  onSnooze: (task: PlantTask, minutes: number) => void;
  onReschedule: (task: PlantTask) => void;
  onSelectTask: (task: PlantTask) => void;
}

const TaskVerticalLayout: React.FC<TaskVerticalLayoutProps> = ({
  tasks,
  plants,
  selectedTasks,
  showBatchActions,
  showCompleted,
  refreshing,
  onRefresh,
  onMarkDone,
  onSnooze,
  onReschedule,
  onSelectTask,
}) => {
  const { t } = useTranslation();

  // Create plant lookup map
  const plantMap = useMemo(() => {
    const map = new Map<string, Plant>();
    plants.forEach((plant) => map.set(plant.id, plant));
    return map;
  }, [plants]);

  if (tasks.length === 0) {
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
    <ScrollView
      className="flex-1 px-4"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {tasks.map((task) => {
        const plant = plantMap.get(task.plantId);
        if (!plant) return null;
        
        return (
          <TaskReminderCard
            key={task.id}
            task={task}
            plant={plant}
            onMarkDone={onMarkDone}
            onSnooze={onSnooze}
            onReschedule={onReschedule}
            isSelected={selectedTasks.has(task.id)}
            onSelect={onSelectTask}
            showSelection={showBatchActions}
            isHorizontalLayout={false}
          />
        );
      })}

      {/* Bottom padding for safe area */}
      <ThemedView className="h-20" />
    </ScrollView>
  );
};

export default TaskVerticalLayout;
