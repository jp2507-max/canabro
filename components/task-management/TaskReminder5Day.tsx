import React from 'react';
import TaskReminderContainer from './TaskReminderContainer';
import { PlantTask } from '@/lib/models/PlantTask';

interface TaskReminder5DayProps {
  plantId?: string; // Optional filter for specific plant
  selectedDate?: Date; // For 5-day view focus
  showCompleted?: boolean;
  onTaskPress?: (task: PlantTask) => void;
  layoutMode?: 'horizontal' | 'vertical'; // New prop for layout adaptation
}

const TaskReminder5Day: React.FC<TaskReminder5DayProps> = ({
  plantId,
  selectedDate = new Date(),
  showCompleted = false,
  onTaskPress,
  layoutMode = 'vertical',
}) => {
  return (
    <TaskReminderContainer
      plantId={plantId}
      selectedDate={selectedDate}
      showCompleted={showCompleted}
      onTaskPress={onTaskPress}
      layoutMode={layoutMode}
    />
  );
};

export default TaskReminder5Day;