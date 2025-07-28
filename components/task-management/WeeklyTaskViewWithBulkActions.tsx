import { useState, useCallback, useMemo } from 'react';
import { FlashList } from '@shopify/flash-list';
import { Alert, Pressable, RefreshControl, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { format } from '@/lib/utils/date';
import { triggerLightHapticSync } from '@/lib/utils/haptics';
import { PlantTask } from '@/lib/models/PlantTask';
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import { useButtonAnimation } from '@/lib/animations/useButtonAnimation';
import DaySelector from '../calendar/DaySelector';
import TaskNavigation from '../calendar/TaskNavigation';
import TaskCardWithSelection from './TaskCardWithSelection';
import BulkTaskActions from './BulkTaskActions';

export interface WeeklyTaskViewWithBulkActionsProps {
    tasks: PlantTask[];
    onTaskPress?: (task: PlantTask) => void;
    onTaskComplete?: (task: PlantTask) => void;
    onDateSelect?: (date: Date) => void;
    onRefresh?: () => Promise<void>;
    refreshing?: boolean;
    // Bulk operation handlers
    onBulkComplete?: (taskIds: string[]) => Promise<void>;
    onBulkReschedule?: (taskIds: string[], newDate: Date) => Promise<void>;
    onBulkSnooze?: (taskIds: string[], minutes: number) => Promise<void>;
    onBulkDelete?: (taskIds: string[]) => Promise<void>;
    // Plant data for task cards
    getPlantName?: (plantId: string) => string;
    getPlantImage?: (plantId: string) => string | undefined;
}

export default function WeeklyTaskViewWithBulkActions({
    tasks,
    onTaskPress,
    onTaskComplete,
    onDateSelect,
    onRefresh,
    refreshing = false,
    onBulkComplete,
    onBulkReschedule,
    onBulkSnooze,
    onBulkDelete,
    getPlantName = () => 'Unknown Plant',
    getPlantImage,
}: WeeklyTaskViewWithBulkActionsProps) {
    const { t } = useTranslation();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
    const [showBulkActions, setShowBulkActions] = useState(false);

    // Filter tasks for selected date
    const tasksForSelectedDate = useMemo(() => {
        const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
        return tasks.filter(task => {
            const taskDateStr = format(new Date(task.dueDate), 'yyyy-MM-dd');
            return taskDateStr === selectedDateStr;
        });
    }, [tasks, selectedDate]);

    // Handle date selection
    const handleDateSelect = useCallback((date: Date) => {
        setSelectedDate(date);
        onDateSelect?.(date);
        // Clear selection when changing dates
        setSelectedTasks(new Set());
    }, [onDateSelect]);

    // Handle task selection
    const handleTaskSelect = useCallback((task: PlantTask) => {
        setSelectedTasks(prev => {
            const newSet = new Set(prev);
            if (newSet.has(task.id)) {
                newSet.delete(task.id);
            } else {
                newSet.add(task.id);
            }
            return newSet;
        });
    }, []);

    // Toggle bulk actions mode
    const toggleBulkMode = useCallback(() => {
        setShowBulkActions(!showBulkActions);
        setSelectedTasks(new Set());
        triggerLightHapticSync();
    }, [showBulkActions]);

    // Clear selection
    const clearSelection = useCallback(() => {
        setSelectedTasks(new Set());
        setShowBulkActions(false);
    }, []);

    // Bulk operation handlers
    const handleBulkComplete = useCallback(async (taskIds: string[]) => {
        if (onBulkComplete) {
            await onBulkComplete(taskIds);
        } else {
            // Fallback to individual completion
            if (onTaskComplete) {
                const tasksToComplete = tasks.filter(task => taskIds.includes(task.id));
                for (const task of tasksToComplete) {
                    onTaskComplete(task);
                }
            }
        }
    }, [onBulkComplete, onTaskComplete, tasks]);

    const handleBulkReschedule = useCallback(async (taskIds: string[], newDate: Date) => {
        if (onBulkReschedule) {
            await onBulkReschedule(taskIds, newDate);
        } else {
            // Show message that bulk reschedule is not implemented
            Alert.alert(
                t('taskManagement.bulkActions.error.title', 'Error'),
                t('taskManagement.bulkActions.error.notImplemented', 'Bulk reschedule is not yet implemented.')
            );
        }
    }, [onBulkReschedule, t]);

    const handleBulkSnooze = useCallback(async (taskIds: string[], minutes: number) => {
        if (onBulkSnooze) {
            await onBulkSnooze(taskIds, minutes);
        } else {
            // Show message that bulk snooze is not implemented
            Alert.alert(
                t('taskManagement.bulkActions.error.title', 'Error'),
                t('taskManagement.bulkActions.error.notImplemented', 'Bulk snooze is not yet implemented.')
            );
        }
    }, [onBulkSnooze, t]);

    const handleBulkDelete = useCallback(async (taskIds: string[]) => {
        if (onBulkDelete) {
            await onBulkDelete(taskIds);
        } else {
            // Show message that bulk delete is not implemented
            Alert.alert(
                t('taskManagement.bulkActions.error.title', 'Error'),
                t('taskManagement.bulkActions.error.notImplemented', 'Bulk delete is not yet implemented.')
            );
        }
    }, [onBulkDelete, t]);

    // Bulk actions button animation
    const bulkActionsAnimation = useButtonAnimation({
        enableHaptics: true,
        hapticStyle: 'medium',
        onPress: toggleBulkMode,
    });

    // Render task item with selection support
    const renderTaskItem = useCallback(({ item }: { item: PlantTask }) => (
        <TaskCardWithSelection
            task={item}
            plantName={getPlantName(item.plantId)}
            plantImage={getPlantImage?.(item.plantId)}
            onPress={onTaskPress || (() => { })}
            onComplete={(taskId) => {
                const task = tasks.find(t => t.id === taskId);
                if (task && onTaskComplete) {
                    onTaskComplete(task);
                }
            }}
            isSelected={selectedTasks.has(item.id)}
            onSelect={handleTaskSelect}
            showSelection={showBulkActions}
        />
    ), [
        tasks,
        onTaskPress,
        onTaskComplete,
        getPlantName,
        getPlantImage,
        selectedTasks,
        handleTaskSelect,
        showBulkActions,
    ]);

    return (
        <ThemedView className="flex-1">
            {/* Header with current date and bulk actions toggle */}
            <ThemedView className="flex-row items-center justify-between px-4 py-2">
                <ThemedView className="flex-1">
                    <ThemedText className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                        {format(selectedDate, 'EEEE')}
                    </ThemedText>
                    <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
                        {format(selectedDate, 'MMMM d, yyyy')}
                    </ThemedText>
                </ThemedView>

                {/* Bulk actions toggle button */}
                {tasksForSelectedDate.length > 0 && (
                    <Animated.View style={bulkActionsAnimation.animatedStyle}>
                        <Pressable
                            {...bulkActionsAnimation.handlers}
                            className={`rounded-lg px-3 py-2 ${showBulkActions
                                ? 'bg-primary-500'
                                : 'bg-neutral-200 dark:bg-neutral-700'
                                }`}
                            accessibilityRole="button"
                            accessibilityLabel={showBulkActions ? 'Exit selection mode' : 'Enter selection mode'}
                        >
                            <OptimizedIcon
                                name={showBulkActions ? 'close' : 'checkmark-circle'}
                                size={20}
                                className={
                                    showBulkActions
                                        ? 'text-white'
                                        : 'text-neutral-700 dark:text-neutral-300'
                                }
                            />
                        </Pressable>
                    </Animated.View>
                )}
            </ThemedView>

            {/* Simple navigation controls (today button, date picker) */}
            <TaskNavigation
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                onTodayPress={() => {
                    const today = new Date();
                    setSelectedDate(today);
                    setSelectedTasks(new Set()); // Clear selection when going to today
                }}
            />

            {/* Horizontal day selector with FlashList scrolling */}
            <DaySelector
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                tasks={tasks}
                onRefresh={onRefresh}
                refreshing={refreshing}
                dateRange={14} // Show 14 days for better navigation
            />

            {/* Tasks list */}
            <ThemedView className="flex-1">
                {tasksForSelectedDate.length > 0 ? (
                    <FlashList
                        data={tasksForSelectedDate}
                        renderItem={renderTaskItem}
                        estimatedItemSize={120}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: showBulkActions ? 80 : 20 }}
                        refreshControl={
                            onRefresh ? (
                                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                            ) : undefined
                        }
                    />
                ) : (
                    <ScrollView
                        contentContainerStyle={{ flex: 1 }}
                        refreshControl={
                            onRefresh ? (
                                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                            ) : undefined
                        }
                    >
                        <ThemedView className="flex-1 items-center justify-center px-4">
                            <OptimizedIcon name="calendar-outline" size={48} className="text-neutral-400 dark:text-neutral-500" />
                            <ThemedText className="mt-4 text-center text-lg font-medium text-neutral-500 dark:text-neutral-400">
                                {t('calendar.weekly_view.no_tasks', 'No tasks for this day')}
                            </ThemedText>
                            <ThemedText className="mt-2 text-center text-sm text-neutral-400 dark:text-neutral-500">
                                {t('calendar.weekly_view.no_tasks_subtitle', 'Tap the + button to add a new task')}
                            </ThemedText>
                        </ThemedView>
                    </ScrollView>
                )}
            </ThemedView>

            {/* Bulk actions bar */}
            <BulkTaskActions
                selectedTasks={selectedTasks}
                tasks={tasksForSelectedDate}
                onBulkComplete={handleBulkComplete}
                onBulkReschedule={handleBulkReschedule}
                onBulkSnooze={handleBulkSnooze}
                onBulkDelete={onBulkDelete ? handleBulkDelete : undefined}
                onClearSelection={clearSelection}
                isVisible={showBulkActions && selectedTasks.size > 0}
            />
        </ThemedView>
    );
}