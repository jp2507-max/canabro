/**
 * Optimized Weekly Task View - Complete Performance Implementation
 * 
 * High-performance 5-day task management interface with:
 * - FlashList virtualization for both day selector and task lists
 * - Optimized data loading for 5-day focus (current week ±2 days)
 * - Efficient task caching with automatic cleanup
 * - Stable component references with useCallback/useMemo
 * - Reanimated v3 automatic workletization for smooth animations
 * - Background task filtering and sorting without blocking UI
 * - Intelligent prefetching for adjacent days
 * 
 * Performance targets:
 * - Handle 100+ plants with 1000+ tasks
 * - Sub-100ms data loading for 5-day window
 * - Memory usage under 50MB for cached data
 * - Smooth 60fps scrolling performance
 * 
 * Requirements: R1-AC5, R5-AC3
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Alert, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated from 'react-native-reanimated';

import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import OptimizedDaySelector from './OptimizedDaySelector';
import OptimizedTaskList from './OptimizedTaskList';
import { useOptimizedTaskData } from '@/lib/hooks/useOptimizedTaskData';
import { PlantTask } from '@/lib/models/PlantTask';
import { Plant } from '@/lib/models/Plant';
import { Logger } from '@/lib/utils/production-utils';
import { format } from '@/lib/utils/date';

interface OptimizedWeeklyTaskViewProps {
  plantId?: string;
  showCompleted?: boolean;
  enableBatchActions?: boolean;
  onTaskComplete?: (task: PlantTask) => void;
  onTaskSnooze?: (task: PlantTask, minutes: number) => void;
  onTaskReschedule?: (task: PlantTask) => void;
  onTaskPress?: (task: PlantTask) => void;
}

interface PerformanceMetrics {
  renderTime: number;
  taskCount: number;
  cacheHitRate: number;
  memoryUsage: number;
}

export default function OptimizedWeeklyTaskView({
  plantId,
  showCompleted = false,
  enableBatchActions = false,
  onTaskComplete,
  onTaskSnooze,
  onTaskReschedule,
  onTaskPress,
}: OptimizedWeeklyTaskViewProps) {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);

  // Use optimized task data hook with performance monitoring
  const {
    tasks,
    plants,
    plantMap,
    tasksByDate,
    focusStartDate,
    focusEndDate,
    focusDateRange,
    cacheStats,
    loading,
    prefetching,
    triggerRefresh,
    clearCache,
    prefetchAdjacentDays,
  } = useOptimizedTaskData({
    selectedDate,
    plantId,
    showCompleted,
    enablePrefetching: true,
    enableCaching: true,
    focusWindowSize: 5,
  });

  // Performance monitoring
  React.useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      setPerformanceMetrics({
        renderTime,
        taskCount: tasks.length,
        cacheHitRate: cacheStats.hitRate,
        memoryUsage: cacheStats.memoryUsage,
      });
      
      // Log performance metrics in development
      if (__DEV__) {
        Logger.info('[OptimizedWeeklyTaskView] Performance metrics', {
          renderTime: `${renderTime.toFixed(2)}ms`,
          taskCount: tasks.length,
          cacheHitRate: `${(cacheStats.hitRate * 100).toFixed(1)}%`,
          memoryUsage: `${(cacheStats.memoryUsage / 1024).toFixed(1)}KB`,
        });
      }
    };
  }, [tasks.length, cacheStats]);

  // Get tasks for selected date with stable reference
  const selectedDateTasks = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return tasksByDate.get(dateKey) || [];
  }, [tasksByDate, selectedDate]);

  // Stable event handlers
  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    setSelectedTasks(new Set()); // Clear selection when changing dates
    
    // Trigger prefetching for adjacent days
    prefetchAdjacentDays('both');
  }, [prefetchAdjacentDays]);

  const handleTaskComplete = useCallback(async (task: PlantTask) => {
    try {
      await task.markAsCompleted({
        completedAt: new Date(),
        notes: 'Completed via weekly task view',
      });
      
      onTaskComplete?.(task);
      
      // Remove from selection if it was selected
      setSelectedTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(task.id);
        return newSet;
      });
      
    } catch (error) {
      Logger.error('[OptimizedWeeklyTaskView] Error completing task', { 
        taskId: task.id, 
        error 
      });
      Alert.alert(
        t('taskReminders.error'),
        t('taskReminders.errorCompletingTask')
      );
    }
  }, [onTaskComplete, t]);

  const handleTaskSnooze = useCallback(async (task: PlantTask, minutes: number) => {
    try {
      const hours = minutes / 60;
      await task.snooze(hours);
      
      onTaskSnooze?.(task, minutes);
      
    } catch (error) {
      Logger.error('[OptimizedWeeklyTaskView] Error snoozing task', { 
        taskId: task.id, 
        error 
      });
      Alert.alert(
        t('taskReminders.error'),
        t('taskReminders.errorSnoozingTask')
      );
    }
  }, [onTaskSnooze, t]);

  const handleTaskReschedule = useCallback((task: PlantTask) => {
    onTaskReschedule?.(task);
  }, [onTaskReschedule]);

  const handleTaskSelect = useCallback((task: PlantTask) => {
    if (!enableBatchActions) return;
    
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(task.id)) {
        newSet.delete(task.id);
      } else {
        newSet.add(task.id);
      }
      return newSet;
    });
  }, [enableBatchActions]);

  const handleRefresh = useCallback(async () => {
    try {
      clearCache();
      triggerRefresh();
      await prefetchAdjacentDays('both');
    } catch (error) {
      Logger.error('[OptimizedWeeklyTaskView] Error refreshing tasks', { error });
      Alert.alert(
        t('taskReminders.error'),
        t('taskReminders.errorRefreshingTasks')
      );
    }
  }, [clearCache, triggerRefresh, prefetchAdjacentDays, t]);

  // Bulk actions for selected tasks
  const handleBulkComplete = useCallback(async () => {
    if (selectedTasks.size === 0) return;
    
    try {
      const tasksToComplete = selectedDateTasks.filter(task => 
        selectedTasks.has(task.id)
      );
      
      await Promise.all(
        tasksToComplete.map(task => 
          task.markAsCompleted({
            completedAt: new Date(),
            notes: 'Bulk completed via weekly task view',
          })
        )
      );
      
      setSelectedTasks(new Set());
      
    } catch (error) {
      Logger.error('[OptimizedWeeklyTaskView] Error bulk completing tasks', { error });
      Alert.alert(
        t('taskReminders.error'),
        t('taskReminders.errorBulkCompletingTasks')
      );
    }
  }, [selectedTasks, selectedDateTasks, t]);

  const handleBulkSnooze = useCallback(async (minutes: number) => {
    if (selectedTasks.size === 0) return;
    
    try {
      const tasksToSnooze = selectedDateTasks.filter(task => 
        selectedTasks.has(task.id)
      );
      
      const hours = minutes / 60;
      await Promise.all(
        tasksToSnooze.map(task => task.snooze(hours))
      );
      
      setSelectedTasks(new Set());
      
    } catch (error) {
      Logger.error('[OptimizedWeeklyTaskView] Error bulk snoozing tasks', { error });
      Alert.alert(
        t('taskReminders.error'),
        t('taskReminders.errorBulkSnoozingTasks')
      );
    }
  }, [selectedTasks, selectedDateTasks, t]);

  // Performance warning for large datasets
  const showPerformanceWarning = useMemo(() => {
    return tasks.length > 500 && cacheStats.hitRate < 0.8;
  }, [tasks.length, cacheStats.hitRate]);

  return (
    <ThemedView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
      {/* Performance warning */}
      {showPerformanceWarning && (
        <ThemedView className="mx-4 mt-2 rounded-lg bg-orange-100 p-3 dark:bg-orange-900/20">
          <ThemedView className="flex-row items-center">
            <OptimizedIcon
              name="warning"
              size={16}
              className="mr-2 text-orange-600 dark:text-orange-400"
            />
            <ThemedText className="flex-1 text-sm text-orange-800 dark:text-orange-200">
              {t('taskReminders.performanceWarning')}
            </ThemedText>
          </ThemedView>
        </ThemedView>
      )}

      {/* Optimized day selector */}
      <OptimizedDaySelector
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        tasksByDate={tasksByDate}
        focusWindowSize={5}
        showTaskCounts={true}
        enableVirtualization={true}
      />

      {/* Task count and selection info */}
      <ThemedView className="flex-row items-center justify-between px-4 py-2">
        <ThemedText variant="muted" className="text-sm">
          {selectedDateTasks.length > 0
            ? t('taskReminders.tasksCount', { count: selectedDateTasks.length })
            : t('taskReminders.noTasksForDate')
          }
        </ThemedText>
        
        {enableBatchActions && selectedTasks.size > 0 && (
          <ThemedText className="text-sm font-medium text-primary-600 dark:text-primary-400">
            {t('taskReminders.selectedCount', { count: selectedTasks.size })}
          </ThemedText>
        )}
        
        {prefetching && (
          <ThemedView className="flex-row items-center">
            <OptimizedIcon
              name="refresh"
              size={14}
              className="mr-1 animate-spin text-neutral-400"
            />
            <ThemedText variant="muted" className="text-xs">
              {t('taskReminders.prefetching')}
            </ThemedText>
          </ThemedView>
        )}
      </ThemedView>

      {/* Optimized task list */}
      <OptimizedTaskList
        tasks={selectedDateTasks}
        plantMap={plantMap}
        selectedTasks={selectedTasks}
        showBatchActions={enableBatchActions}
        showCompleted={showCompleted}
        refreshing={loading}
        loading={loading}
        onRefresh={handleRefresh}
        onTaskPress={onTaskPress}
        onMarkDone={handleTaskComplete}
        onSnooze={handleTaskSnooze}
        onReschedule={handleTaskReschedule}
        onSelectTask={handleTaskSelect}
        isHorizontalLayout={false}
        enableVirtualization={true}
        estimatedItemSize={120}
      />

      {/* Bulk action buttons */}
      {enableBatchActions && selectedTasks.size > 0 && (
        <ThemedView className="absolute bottom-0 left-0 right-0 border-t border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
          <ThemedView className="flex-row space-x-3">
            <Animated.View className="flex-1">
              <ThemedView
                className="flex-row items-center justify-center rounded-lg bg-primary-500 px-4 py-3"
                onTouchEnd={handleBulkComplete}
              >
                <OptimizedIcon name="checkmark" size={16} className="mr-2 text-white" />
                <ThemedText className="font-medium text-white">
                  {t('taskReminders.completeSelected')}
                </ThemedText>
              </ThemedView>
            </Animated.View>
            
            <ThemedView
              className="flex-row items-center justify-center rounded-lg bg-neutral-200 px-4 py-3 dark:bg-neutral-700"
              onTouchEnd={() => handleBulkSnooze(60)}
            >
              <OptimizedIcon
                name="refresh"
                size={16}
                className="mr-2 text-neutral-700 dark:text-neutral-300"
              />
              <ThemedText className="font-medium text-neutral-700 dark:text-neutral-300">
                {t('taskReminders.snoozeSelected')}
              </ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      )}

      {/* Performance metrics in development */}
      {__DEV__ && performanceMetrics && (
        <ThemedView className="absolute bottom-20 right-4 rounded-lg bg-black/80 p-2">
          <ThemedText className="text-xs text-white">
            Render: {performanceMetrics.renderTime.toFixed(1)}ms
          </ThemedText>
          <ThemedText className="text-xs text-white">
            Tasks: {performanceMetrics.taskCount}
          </ThemedText>
          <ThemedText className="text-xs text-white">
            Cache: {(performanceMetrics.cacheHitRate * 100).toFixed(1)}%
          </ThemedText>
          <ThemedText className="text-xs text-white">
            Memory: {(performanceMetrics.memoryUsage / 1024).toFixed(1)}KB
          </ThemedText>
        </ThemedView>
      )}
    </ThemedView>
  );
}

/**
 * Performance testing utilities
 */
export const WeeklyTaskViewPerformanceUtils = {
  /**
   * Measure component render performance
   */
  measureRenderPerformance: (taskCount: number) => {
    const startTime = performance.now();
    
    return {
      start: startTime,
      end: () => {
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        console.log(`[WeeklyTaskView Performance] Rendered ${taskCount} tasks in ${renderTime.toFixed(2)}ms`);
        
        return {
          taskCount,
          renderTime,
          averageTimePerTask: renderTime / taskCount,
          performanceGrade: renderTime < 100 ? 'A' : renderTime < 200 ? 'B' : renderTime < 500 ? 'C' : 'D',
        };
      },
    };
  },

  /**
   * Test memory usage with large datasets
   */
  testMemoryUsage: (taskCounts: number[]) => {
    const results: Array<{
      taskCount: number;
      memoryBefore: number;
      memoryAfter: number;
      memoryDelta: number;
    }> = [];

    taskCounts.forEach(count => {
      const memoryBefore = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Simulate task creation
      const tasks = Array.from({ length: count }, (_, i) => ({
        id: `test-${i}`,
        title: `Task ${i}`,
        dueDate: new Date().toISOString(),
      }));
      
      const memoryAfter = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryDelta = memoryAfter - memoryBefore;
      
      results.push({
        taskCount: count,
        memoryBefore,
        memoryAfter,
        memoryDelta,
      });
      
      // Cleanup
      tasks.length = 0;
    });

    return results;
  },

  /**
   * Benchmark scrolling performance
   */
  benchmarkScrolling: (scrollDistance: number, duration: number) => {
    const startTime = performance.now();
    let frameCount = 0;
    
    const measureFrame = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - startTime < duration) {
        requestAnimationFrame(measureFrame);
      } else {
        const fps = (frameCount / duration) * 1000;
        console.log(`[WeeklyTaskView Scrolling] Average FPS: ${fps.toFixed(1)}`);
        
        return {
          fps,
          frameCount,
          duration,
          performanceGrade: fps >= 55 ? 'A' : fps >= 45 ? 'B' : fps >= 30 ? 'C' : 'D',
        };
      }
    };
    
    requestAnimationFrame(measureFrame);
  },
};