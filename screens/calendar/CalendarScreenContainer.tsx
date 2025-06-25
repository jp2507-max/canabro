import { useRouter } from 'expo-router';
import React, { useCallback, useState, useMemo } from 'react';

import CalendarScreenView from './CalendarScreenView';
import usePullToRefresh from '../../lib/hooks/usePullToRefresh';
import { PlantTask } from '../../lib/models/PlantTask';
import { navigateToTaskRoute } from '../../lib/utils/taskNavigation';

interface CalendarScreenContainerProps {
  selectedDate: Date;
  userId: string | undefined;
  setIsTaskActionsVisible: (visible: boolean) => void;
  onDateSelect: (date: Date) => void;
}

function CalendarScreenContainer({
  selectedDate,
  userId,
  setIsTaskActionsVisible,
  onDateSelect,
}: CalendarScreenContainerProps) {
  const [tasks, setTasks] = useState<PlantTask[]>([]);
  const [loading, setLoading] = useState(true);
  const { refreshing, handleRefresh } = usePullToRefresh();
  const [isTaskActionsVisible, setTaskActionsVisible] = useState(false);
  const router = useRouter();

  // Normalize selectedDate with defensive fallback
  const normalizedDate = useMemo(() => {
    if (!selectedDate || !(selectedDate instanceof Date) || isNaN(selectedDate.getTime())) {
      console.error('[CalendarScreenContainer] Invalid selectedDate received:', selectedDate, 'Type:', typeof selectedDate, '- falling back to current date');
      return new Date();
    }
    console.log('[CalendarScreenContainer] Valid selectedDate:', selectedDate);
    return selectedDate;
  }, [selectedDate]);

  // Fetch tasks for the selected date and user
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    // TODO: Replace with actual DB query for tasks by userId and date
    setTimeout(() => {
      setTasks([]); // Placeholder
      setLoading(false);
    }, 500);
  }, [normalizedDate, userId]);

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
    navigateToTaskRoute.addPlantTask(router, normalizedDate);
  }
  function handleAddTaskAll() {
    setTaskActionsVisible(false);
    navigateToTaskRoute.addTask(router, normalizedDate);
  }

  return (
    <CalendarScreenView
      tasks={tasks}
      loading={loading}
      refreshing={refreshing}
      onRefresh={handleRefresh}
      setIsTaskActionsVisible={setIsTaskActionsVisible}
      selectedDate={normalizedDate}
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
