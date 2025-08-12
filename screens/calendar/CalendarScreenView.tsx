import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import DateSelector from '../../components/calendar/DateSelector';
import TaskActions from '../../components/calendar/TaskActions';
import TaskItem from '../../components/calendar/TaskItem';
import StrainMilestoneBanner from '../../components/calendar/StrainMilestoneBanner';
import CalendarAnalyticsModal from '../../components/calendar/CalendarAnalyticsModal';
import { StrainScheduleComparison } from '../../components/calendar/StrainScheduleComparison';
import FloatingActionButton from '../../components/ui/FloatingActionButton';
import ThemedText from '../../components/ui/ThemedText';
import ThemedView from '../../components/ui/ThemedView';
import { useTranslation } from 'react-i18next';
import useWatermelon from '../../lib/hooks/useWatermelon';
import { PlantTask } from '../../lib/models/PlantTask';
import { logger } from '@/lib/config/production';

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
  const { t } = useTranslation();
  const { database } = useWatermelon();

  const [groupByStrain, setGroupByStrain] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  // FAB direct add-task logic (skip modal)
  const handleFabPress = useCallback(() => {
    onAddTaskPlant();
  }, [onAddTaskPlant]);

  // Handle task completion
  const handleCompleteTask = useCallback((task: PlantTask) => {
    // Implement task completion logic here
    logger.log('Task completed:', task.id);
  }, []);

  // Handle navigation to plant details
  const handleNavigateToPlant = useCallback(
    (plantId: string) => {
      onNavigateToPlant?.(plantId);
    },
    [onNavigateToPlant]
  );

  // 🎯 Performance optimized render functions
  const keyExtractor = useCallback((item: PlantTask) => item.id, []);

  const sortedTasks = useMemo(() => {
    if (!groupByStrain) return tasks;

    // Group by strainId from strainMetadata, fallback to plantId to keep stable grouping
    const groupKey = (t: PlantTask) => t.strainMetadata?.strainId || `plant:${t.plantId}`;
    const groups: Record<string, PlantTask[]> = {};
    for (const task of tasks) {
      const key = groupKey(task);
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    }

    // Flatten groups, preserving group order by first due date
    const orderedGroupKeys = Object.keys(groups).sort((a, b) => {
      const aArr = groups[a] ?? [];
      const bArr = groups[b] ?? [];
      const aTimes = aArr.length > 0 ? aArr.map(t => new Date(t.dueDate).getTime()) : [Number.MAX_SAFE_INTEGER];
      const bTimes = bArr.length > 0 ? bArr.map(t => new Date(t.dueDate).getTime()) : [Number.MAX_SAFE_INTEGER];
      const aMin = Math.min(...aTimes);
      const bMin = Math.min(...bTimes);
      return aMin - bMin;
    });

    const flattened: PlantTask[] = [];
    for (const key of orderedGroupKeys) {
      // Simple insertion of group items (could add section headers later)
      const items = groups[key] ?? [];
      flattened.push(...items);
    }
    return flattened;
  }, [groupByStrain, tasks]);

  const uniqueStrainIds = useMemo<string[]>(() => {
    const ids = new Set<string>();
    for (const t of sortedTasks) {
      const sid = t.strainMetadata?.strainId;
      if (sid && typeof sid === 'string') ids.add(sid);
    }
    return Array.from(ids);
  }, [sortedTasks]);

  const renderTaskItem = useCallback(
    ({ item }: { item: PlantTask }) => {
      return (
        <TaskItem
          task={item}
          database={database}
          onComplete={handleCompleteTask}
          onNavigate={handleNavigateToPlant}
          onPress={() => setIsTaskActionsVisible(true)}
        />
      );
    },
    [database, handleCompleteTask, handleNavigateToPlant, setIsTaskActionsVisible]
  );

  const renderEmptyState = useCallback(
    () => (
      <ThemedView className="flex-1 items-center justify-center px-8 py-16">
        <ThemedText className="text-center text-lg font-medium text-neutral-600 dark:text-neutral-400">
          {t('calendar.screen.no_tasks_scheduled', 'No tasks scheduled')}
        </ThemedText>
        <ThemedText className="mt-2 text-center text-sm text-neutral-500 dark:text-neutral-500">
          {t('calendar.screen.tap_to_add_task', 'Tap the + button to add your first task for this day')}
        </ThemedText>
      </ThemedView>
    ),
    []
  );

  const renderLoadingState = useCallback(
    () => (
      <ThemedView className="flex-1 items-center justify-center">
        <ActivityIndicator
          size="large"
          color="#10b981" // primary-500
          className="mb-4"
        />
        <ThemedText className="text-neutral-600 dark:text-neutral-400">
            {t('calendar.screen.loading_tasks', 'Loading tasks...')}
          </ThemedText>
      </ThemedView>
    ),
    []
  );

  return (
    <SafeAreaView
      className="flex-1 bg-neutral-50 dark:bg-neutral-900"
      edges={['top', 'left', 'right']}>
      <ThemedView className="flex-1">
        {/* Date Selector Header */}
        <ThemedView className="bg-white shadow-sm dark:bg-neutral-800">
          <DateSelector selectedDate={selectedDate} onDateSelect={onDateSelect} />
        </ThemedView>

        {/* Tasks Content */}
        {loading ? (
          renderLoadingState()
        ) : (
          <FlatList
            data={sortedTasks}
            keyExtractor={keyExtractor}
            renderItem={renderTaskItem}
            ListHeaderComponent={
              <>
                {/* Strain milestone banner for selected date */}
                <StrainMilestoneBanner date={selectedDate} tasks={sortedTasks} />

                {/* Toolbar */}
                <View className="px-4 pb-2 flex-row items-center justify-between">
                  <Pressable
                    onPress={() => setGroupByStrain(v => !v)}
                    accessibilityRole="button"
                    accessibilityLabel={t('calendar.screen.group_by_strain', 'Group by strain')}
                    className="px-3 py-2 rounded-md bg-neutral-100 dark:bg-neutral-800"
                  >
                    <ThemedText className="text-sm text-neutral-800 dark:text-neutral-200">
                      {groupByStrain ? t('calendar.screen.group_off', 'Grouping: strain (on)') : t('calendar.screen.group_on', 'Grouping: strain (off)')}
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    onPress={() => setShowAnalytics(true)}
                    accessibilityRole="button"
                    accessibilityLabel={t('calendar.screen.open_analytics', 'Open analytics')}
                    className="px-3 py-2 rounded-md bg-primary/10 dark:bg-primary-dark/10"
                  >
                    <ThemedText className="text-sm text-primary dark:text-primary-dark">
                      {t('calendar.screen.analytics', 'Analytics')}
                    </ThemedText>
                  </Pressable>
                  {uniqueStrainIds.length >= 2 && (
                    <Pressable
                      onPress={() => setShowCompare(true)}
                      accessibilityRole="button"
                      accessibilityLabel={t('calendar.screen.compare_strains', 'Compare strains')}
                      className="ml-2 px-3 py-2 rounded-md bg-neutral-100 dark:bg-neutral-800"
                    >
                      <ThemedText className="text-sm text-neutral-800 dark:text-neutral-200">
                        {t('calendar.screen.compare_strains', 'Compare strains')}
                      </ThemedText>
                    </Pressable>
                  )}
                </View>
              </>
            }
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
              flexGrow: 1,
            }}
            showsVerticalScrollIndicator={false}
            bounces
            // ⚡ Performance optimizations for calendar tasks
            initialNumToRender={10}
            windowSize={8}
            maxToRenderPerBatch={6}
            updateCellsBatchingPeriod={50}
            removeClippedSubviews={true}
          />
        )}

        {/* Floating Action Button */}
        <FloatingActionButton
          onPress={handleFabPress}
          onLongPress={onOpenTaskActions}
          accessibilityLabel={t('calendar.screen.add_task_button', 'Add Task')}
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

        {/* Analytics Modal */}
        <CalendarAnalyticsModal visible={showAnalytics} onClose={() => setShowAnalytics(false)} />

        {/* Strain Comparison Modal (simple two-strain case for now) */}
        {showCompare && uniqueStrainIds.length >= 2 && (
          <Modal visible={showCompare} animationType="slide" onRequestClose={() => setShowCompare(false)}>
            <StrainScheduleComparison
              strainIdA={uniqueStrainIds[0] as string}
              strainIdB={uniqueStrainIds[1] as string}
              onClose={() => setShowCompare(false)}
            />
          </Modal>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

export default React.memo(CalendarScreenView);
