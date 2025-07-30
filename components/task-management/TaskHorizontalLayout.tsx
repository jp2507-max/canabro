import React, { useMemo } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated from 'react-native-reanimated';

import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import TaskReminderCard from './TaskReminderCard';
import { PlantTask } from '@/lib/models/PlantTask';
import { Plant } from '@/lib/models/Plant';
import { format } from '@/lib/utils/date';

interface TaskHorizontalLayoutProps {
  tasks: PlantTask[];
  plants: Plant[];
  dateRange: Date[];
  selectedTasks: Set<string>;
  showBatchActions: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onMarkDone: (task: PlantTask) => void;
  onSnooze: (task: PlantTask, minutes: number) => void;
  onReschedule: (task: PlantTask) => void;
  onSelectTask: (task: PlantTask) => void;
}

const TaskHorizontalLayout: React.FC<TaskHorizontalLayoutProps> = ({
  tasks,
  plants,
  dateRange,
  selectedTasks,
  showBatchActions,
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

  // Group tasks by date for 5-day view
  const tasksByDate = useMemo(() => {
    const groups = new Map<string, PlantTask[]>();
    
    dateRange.forEach(date => {
      const dateKey = format(date, 'yyyy-MM-dd');
      groups.set(dateKey, []);
    });

    tasks.forEach((task) => {
      const taskDate = format(new Date(task.dueDate), 'yyyy-MM-dd');
      if (groups.has(taskDate)) {
        groups.get(taskDate)!.push(task);
      }
    });

    return groups;
  }, [tasks, dateRange]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {dateRange.map((date) => {
        const dateKey = format(date, 'yyyy-MM-dd');
        const dayTasks = tasksByDate.get(dateKey) || [];
        
        return (
          <ThemedView key={dateKey} className="mr-4">
            {/* Day header */}
            <ThemedView className="mb-3 rounded-lg bg-neutral-100 p-3 dark:bg-neutral-800">
              <ThemedText className="text-center text-sm font-semibold">
                {format(date, 'EEE')}
              </ThemedText>
              <ThemedText className="text-center text-xs text-neutral-600 dark:text-neutral-400">
                {format(date, 'MMM d')}
              </ThemedText>
              {dayTasks.length > 0 && (
                <ThemedView className="mt-1 rounded-full bg-primary-500 px-2 py-1">
                  <ThemedText className="text-center text-xs text-white">
                    {dayTasks.length}
                  </ThemedText>
                </ThemedView>
              )}
            </ThemedView>

            {/* Tasks for this day */}
            <ThemedView className="w-64">
              {dayTasks.map((task) => {
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
                    isHorizontalLayout={true}
                  />
                );
              })}
              
              {dayTasks.length === 0 && (
                <ThemedView className="w-64 items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 p-6 dark:border-neutral-600">
                  <OptimizedIcon
                    name="checkmark-circle"
                    size={24}
                    className="mb-2 text-neutral-400"
                  />
                  <ThemedText variant="muted" className="text-center text-xs">
                    {t('taskReminders.noTasksForDay')}
                  </ThemedText>
                </ThemedView>
              )}
            </ThemedView>
          </ThemedView>
        );
      })}
    </ScrollView>
  );
};

export default TaskHorizontalLayout;
