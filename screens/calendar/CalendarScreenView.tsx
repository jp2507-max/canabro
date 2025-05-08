import React from 'react';
import { ActivityIndicator, FlatList, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ThemedView from '../../components/ui/ThemedView';
import ThemedText from '../../components/ui/ThemedText';
import TaskItem from '../../components/calendar/TaskItem';
import DateSelector from '../../components/calendar/DateSelector';
import FloatingActionButton from '../../components/ui/FloatingActionButton';
import TaskActions from '../../components/calendar/TaskActions';
import { PlantTask } from '../../lib/models/PlantTask';
import { useTheme } from '../../lib/contexts/ThemeContext';

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
}: CalendarScreenViewProps) {
  const { theme, isDarkMode } = useTheme();

  // FAB direct add-task logic (skip modal)
  function handleFabPress() {
    onAddTaskPlant();
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: isDarkMode ? theme.colors.neutral[900] : theme.colors.neutral[50] }}
      edges={['top', 'left', 'right']}
    >
      <ThemedView className="flex-1">
        <DateSelector selectedDate={selectedDate} onDateSelect={onDateSelect} />
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          </View>
        ) : (
          <FlatList
            data={tasks}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TaskItem task={item} onPress={() => setIsTaskActionsVisible(true)} />
            )}
            ListEmptyComponent={
              <ThemedText className="text-center mt-8 text-neutral-500 dark:text-neutral-400">
                No tasks for this day.
              </ThemedText>
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[theme.colors.primary[500]]}
                tintColor={theme.colors.primary[500]}
                progressBackgroundColor={
                  isDarkMode ? theme.colors.neutral[800] : theme.colors.neutral[100]
                }
              />
            }
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 16, flexGrow: 1 }}
          />
        )}
        {/* FAB: opens modal on long press, direct add-task on press */}
        <FloatingActionButton 
          onPress={handleFabPress} 
          onLongPress={onOpenTaskActions}
          accessibilityLabel="Add Task" 
          testID="calendar-fab"
          size={56}
        />
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

export default CalendarScreenView;
