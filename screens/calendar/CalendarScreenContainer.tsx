import React, { useCallback, useState } from 'react';
import { PlantTask } from '../../lib/models/PlantTask';
import usePullToRefresh from '../../lib/hooks/usePullToRefresh';
import CalendarScreenView from './CalendarScreenView';
import { useRouter } from 'expo-router';

interface CalendarScreenContainerProps {
  selectedDate: Date;
  userId: string | undefined;
  setIsTaskActionsVisible: (visible: boolean) => void;
  onDateSelect: (date: Date) => void;
}

function CalendarScreenContainer({ selectedDate, userId, setIsTaskActionsVisible, onDateSelect }: CalendarScreenContainerProps) {
  const [tasks, setTasks] = useState<PlantTask[]>([]);
  const [loading, setLoading] = useState(true);
  const { refreshing, handleRefresh } = usePullToRefresh();
  const [isTaskActionsVisible, setTaskActionsVisible] = useState(false);
  const router = useRouter();

  // Fetch tasks for the selected date and user
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    // TODO: Replace with actual DB query for tasks by userId and date
    setTimeout(() => {
      setTasks([]); // Placeholder
      setLoading(false);
    }, 500);
  }, [selectedDate, userId]);

  React.useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  function handleOpenTaskActions() {
    setTaskActionsVisible(true);
  }
  function handleCloseTaskActions() {
    setTaskActionsVisible(false);
  }
  function handleAddTaskPlant() {
    setTaskActionsVisible(false);
    router.push('(tabs)/task/add'); // Expo Router expects relative route from /app
  }
  function handleAddTaskAll() {
    setTaskActionsVisible(false);
    router.push({ pathname: '(tabs)/task/add', params: { all: '1' } });
  }

  return (
    <CalendarScreenView
      tasks={tasks}
      loading={loading}
      refreshing={refreshing}
      onRefresh={handleRefresh}
      setIsTaskActionsVisible={setIsTaskActionsVisible}
      selectedDate={selectedDate}
      onDateSelect={onDateSelect}
      isTaskActionsVisible={isTaskActionsVisible}
      onOpenTaskActions={handleOpenTaskActions}
      onCloseTaskActions={handleCloseTaskActions}
      onAddTaskPlant={handleAddTaskPlant}
      onAddTaskAll={handleAddTaskAll}
    />
  );
}

export default CalendarScreenContainer;
