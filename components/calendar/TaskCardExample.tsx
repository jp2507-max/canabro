import React from 'react';
import { View } from 'react-native';
import TaskCard from './TaskCard';
import { PlantTask } from '@/lib/models/PlantTask';

// Example usage of TaskCard component
const TaskCardExample = () => {
  // Mock task data for demonstration
  const mockTask = {
    id: 'task-1',
    taskId: 'task-1',
    plantId: 'plant-1',
    title: 'Water Cannabis Plant',
    description: 'Check soil moisture and water if needed',
    taskType: 'watering',
    dueDate: new Date().toISOString(),
    status: 'pending',
    priority: 'medium',
    estimatedDuration: 15,
    isCompleted: false,
    isOverdue: false,
    priorityLevel: 'medium' as const,
    estimatedDurationFormatted: '15m',
  } as PlantTask;

  const handleTaskPress = (task: PlantTask) => {
    console.log('Task pressed:', task.title);
  };

  const handleTaskComplete = (taskId: string) => {
    console.log('Task completed:', taskId);
  };

  const handleTaskSnooze = (taskId: string, minutes: number) => {
    console.log('Task snoozed:', taskId, 'for', minutes, 'minutes');
  };

  return (
    <View className="p-4">
      <TaskCard
        task={mockTask}
        plantName="Northern Lights"
        plantImage="https://example.com/plant.jpg"
        onPress={handleTaskPress}
        onComplete={handleTaskComplete}
        onSnooze={handleTaskSnooze}
      />
    </View>
  );
};

export default TaskCardExample;