import React from 'react';
import { render } from '@testing-library/react-native';
import TaskCard from './TaskCard';
import { PlantTask } from '@/lib/models/PlantTask';

// Mock the required modules
jest.mock('@/lib/animations', () => ({
  useCardAnimation: () => ({
    animatedStyle: {},
    handlers: {
      onPressIn: jest.fn(),
      onPressOut: jest.fn(),
      onPress: jest.fn(),
    },
  }),
}));

jest.mock('@/lib/utils/haptics', () => ({
  triggerLightHapticSync: jest.fn(),
  triggerMediumHapticSync: jest.fn(),
}));

// Mock task data
const mockTask = {
  id: 'test-task-1',
  taskId: 'test-task-1',
  plantId: 'test-plant-1',
  title: 'Water Plant',
  description: 'Water the plant thoroughly',
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

describe('TaskCard', () => {
  const defaultProps = {
    task: mockTask,
    plantName: 'Test Plant',
    plantImage: 'https://example.com/plant.jpg',
    onPress: jest.fn(),
    onComplete: jest.fn(),
    onSnooze: jest.fn(),
  };

  it('renders task information correctly', () => {
    const { getByText } = render(<TaskCard {...defaultProps} />);
    
    expect(getByText('Water Plant')).toBeTruthy();
    expect(getByText('Test Plant')).toBeTruthy();
    expect(getByText('15m')).toBeTruthy();
  });

  it('shows overdue styling for overdue tasks', () => {
    const overdueTask = {
      ...mockTask,
      isOverdue: true,
      dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
    };

    const { getByText } = render(
      <TaskCard {...defaultProps} task={overdueTask} />
    );
    
    expect(getByText('1 days overdue')).toBeTruthy();
  });

  it('shows completed state correctly', () => {
    const completedTask = {
      ...mockTask,
      isCompleted: true,
      status: 'completed',
    };

    render(<TaskCard {...defaultProps} task={completedTask} />);
    
    // Component should render without errors for completed tasks
  });
});