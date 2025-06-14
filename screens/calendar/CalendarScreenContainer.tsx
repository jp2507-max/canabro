import { useRouter } from 'expo-router';
import React, { useCallback, useState, useEffect } from 'react';

import CalendarScreenView from './CalendarScreenView';
import usePullToRefresh from '../../lib/hooks/usePullToRefresh';
import { PlantTask } from '../../lib/models/PlantTask';

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

  // Add validation for selectedDate prop
  useEffect(() => {
    if (!selectedDate || !(selectedDate instanceof Date) || isNaN(selectedDate.getTime())) {
      console.error('[CalendarScreenContainer] Invalid selectedDate received:', selectedDate, 'Type:', typeof selectedDate);
    } else {
      console.log('[CalendarScreenContainer] Valid selectedDate:', selectedDate);
    }
  }, [selectedDate]);

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
    router.push('/task/add' as any); // Added type assertion to handle path format
  }
  function handleAddTaskAll() {
    setTaskActionsVisible(false);
    router.push({
      pathname: '/task/add-all' as any, // Added type assertion to handle path format
      params: { all: '1' },
    });
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
