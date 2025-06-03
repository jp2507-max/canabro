import React, { useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import DateSelector from '../../components/calendar/DateSelector';
import TaskActions from '../../components/calendar/TaskActions';
import TaskItem from '../../components/calendar/TaskItem';
import FloatingActionButton from '../../components/ui/FloatingActionButton';
import ThemedText from '../../components/ui/ThemedText';
import ThemedView from '../../components/ui/ThemedView';
import useWatermelon from '../../lib/hooks/useWatermelon';
import { PlantTask } from '../../lib/models/PlantTask';

interface CalendarScreenViewProps {
  tasks: PlantTask[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  setIsTaskActionsVisible: (visible: boolean) => void;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  isTaskActionsVisible: boolean;
  onOpenTaskActions: () => void;
  onCloseTaskActions: () => void;
  onAddTaskPlant: () => void;
  onAddTaskAll: () => void;
  onNavigateToPlant?: (plantId: string) => void;
}

function CalendarScreenView({
  tasks,
  loading,
  refreshing,
  onRefresh,
  setIsTaskActionsVisible,
  selectedDate,
  onDateSelect,
  isTaskActionsVisible,
  onOpenTaskActions,
  onCloseTaskActions,
  onAddTaskPlant,
  onAddTaskAll,
  onNavigateToPlant,
}: CalendarScreenViewProps) {
  const { database } = useWatermelon();

  // FAB direct add-task logic (skip modal)
  const handleFabPress = useCallback(() => {
    onAddTaskPlant();
  }, [onAddTaskPlant]);

  // Handle task completion
  const handleCompleteTask = useCallback((task: PlantTask) => {
    // Implement task completion logic here
    console.log('Task completed:', task.id);
  }, []);

  // Handle navigation to plant details
  const handleNavigateToPlant = useCallback((plantId: string) => {
    onNavigateToPlant?.(plantId);
  }, [onNavigateToPlant]);

  const renderTaskItem = useCallback(({ item }: { item: PlantTask }) => {
    return (
      <TaskItem
        task={item}
        database={database}
        onComplete={handleCompleteTask}
        onNavigate={handleNavigateToPlant}
        onPress={() => setIsTaskActionsVisible(true)}
      />
    );
  }, [database, handleCompleteTask, handleNavigateToPlant, setIsTaskActionsVisible]);

  const renderEmptyState = useCallback(() => (
    <ThemedView className="flex-1 items-center justify-center px-8 py-16">
      <ThemedText className="text-center text-lg font-medium text-neutral-600 dark:text-neutral-400">
        No tasks scheduled
      </ThemedText>
      <ThemedText className="mt-2 text-center text-sm text-neutral-500 dark:text-neutral-500">
        Tap the + button to add your first task for this day
      </ThemedText>
    </ThemedView>
  ), []);

  const renderLoadingState = useCallback(() => (
    <ThemedView className="flex-1 items-center justify-center">
      <ActivityIndicator 
        size="large" 
        color="#10b981" // primary-500
        className="mb-4"
      />
      <ThemedText className="text-neutral-600 dark:text-neutral-400">
        Loading tasks...
      </ThemedText>
    </ThemedView>
  ), []);

  return (
    <SafeAreaView
      className="flex-1 bg-neutral-50 dark:bg-neutral-900"
      edges={['top', 'left', 'right']}
    >
      <ThemedView className="flex-1">
        {/* Date Selector Header */}
        <ThemedView className="bg-white dark:bg-neutral-800 shadow-sm">
          <DateSelector 
            selectedDate={selectedDate} 
            onDateSelect={onDateSelect} 
          />
        </ThemedView>

        {/* Tasks Content */}
        {loading ? (
          renderLoadingState()
        ) : (
          <FlatList
            data={tasks}
            keyExtractor={(item) => item.id}
            renderItem={renderTaskItem}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#10b981']} // primary-500
                tintColor="#10b981" // primary-500
                progressBackgroundColor="#ffffff"
              />
            }
            contentContainerStyle={{ 
              paddingTop: 16, 
              paddingBottom: 100, // Space for FAB
              flexGrow: 1 
            }}
            showsVerticalScrollIndicator={false}
            bounces={true}
          />
        )}

        {/* Floating Action Button */}
        <FloatingActionButton
          onPress={handleFabPress}
          onLongPress={onOpenTaskActions}
          accessibilityLabel="Add Task"
          testID="calendar-fab"
          size={56}
        />

        {/* Task Actions Modal */}
        <TaskActions
          visible={isTaskActionsVisible}
          onClose={onCloseTaskActions}
          navigateToAddTaskPlant={onAddTaskPlant}
          navigateToAddTaskAll={onAddTaskAll}
        />
      </ThemedView>
    </SafeAreaView>
  );
}

export default React.memo(CalendarScreenView);
