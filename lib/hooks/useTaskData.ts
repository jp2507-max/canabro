import { useState, useEffect, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Q } from '@nozbe/watermelondb';

import { PlantTask } from '@/lib/models/PlantTask';
import { Plant } from '@/lib/models/Plant';
import { database } from '@/lib/models';
import { Logger } from '@/lib/utils/production-utils';
import { addDays, startOfDay, format } from '@/lib/utils/date';

interface UseTaskDataOptions {
  plantId?: string;
  selectedDate?: Date;
  showCompleted?: boolean;
  dateRange?: Date[];
}

export const useTaskData = ({ 
  plantId, 
  selectedDate = new Date(), 
  showCompleted = false,
  dateRange 
}: UseTaskDataOptions) => {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<PlantTask[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);

  // Generate default 5-day date range if not provided
  const defaultDateRange = useMemo(() => {
    const startDate = startOfDay(selectedDate);
    return Array.from({ length: 5 }, (_, i) => addDays(startDate, i));
  }, [selectedDate]);

  const effectiveDateRange = dateRange || defaultDateRange;

  // Load tasks and plants
  useEffect(() => {
    let taskSubscription: any;
    let plantsSubscription: any;

    const loadData = async () => {
      try {
        setLoading(true);
        
        // Query tasks for date range with error handling
        const startDate = effectiveDateRange[0];
        const endDate = effectiveDateRange[effectiveDateRange.length - 1];
        
        if (!startDate || !endDate) {
          Logger.warn('[useTaskData] Invalid date range', { dateRange: effectiveDateRange });
          return;
        }
        
        const taskQuery = database.collections
          .get<PlantTask>('plant_tasks')
          .query(
            Q.where('is_deleted', false),
            showCompleted ? Q.where('is_completed', true) : Q.where('is_completed', false),
            Q.where('due_date', Q.between(startDate.getTime(), endDate.getTime())),
            ...(plantId ? [Q.where('plant_id', plantId)] : []),
            Q.sortBy('due_date', Q.asc),
            Q.sortBy('priority', Q.desc) // High priority first
          );

        // Query plants with error handling
        const plantsQuery = database.collections
          .get<Plant>('plants')
          .query(Q.where('is_deleted', false));

        // Set up observables with error handling
        try {
          taskSubscription = taskQuery.observe().subscribe({
            next: setTasks,
            error: (error) => {
              console.error('Error in task subscription:', error);
              Alert.alert(
                t('taskReminders.error'),
                t('taskReminders.errorLoadingTasks')
              );
            }
          });

          plantsSubscription = plantsQuery.observe().subscribe({
            next: setPlants,
            error: (error) => {
              console.error('Error in plants subscription:', error);
              Alert.alert(
                t('taskReminders.error'),
                t('taskReminders.errorLoadingPlants')
              );
            }
          });
        } catch (subscriptionError) {
          console.error('Error setting up database subscriptions:', subscriptionError);
          Alert.alert(
            t('taskReminders.error'),
            t('taskReminders.errorDatabaseConnection')
          );
        }
      } catch (error) {
        console.error('Error loading task reminders:', error);
        Alert.alert(
          t('taskReminders.error'),
          t('taskReminders.errorLoadingData')
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => {
      try {
        taskSubscription?.unsubscribe();
        plantsSubscription?.unsubscribe();
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }
    };
  }, [plantId, showCompleted, effectiveDateRange, t, retryKey]);

  // Create plant lookup map
  const plantMap = useMemo(() => {
    const map = new Map<string, Plant>();
    plants.forEach((plant) => map.set(plant.id, plant));
    return map;
  }, [plants]);

  // Group tasks by date for 5-day view
  const tasksByDate = useMemo(() => {
    const groups = new Map<string, PlantTask[]>();
    
    effectiveDateRange.forEach(date => {
      const dateKey = format(date, 'yyyy-MM-dd');
      groups.set(dateKey, []);
    });

    tasks.forEach((task) => {
      const taskDate = format(new Date(task.dueDate), 'yyyy-MM-dd');
      if (groups.has(taskDate)) {
        groups.get(taskDate)!.push(task);
      }
    });

    return groups;
  }, [tasks, effectiveDateRange]);

  const handleRetry = useCallback(() => {
    setRetryKey((prev) => prev + 1);
    setTasks([]);
    setPlants([]);
  }, []);

  const triggerRefresh = useCallback(() => {
    // Force re-query by incrementing retry key
    handleRetry();
  }, [handleRetry]);

  return {
    tasks,
    plants,
    plantMap,
    tasksByDate,
    loading,
    dateRange: effectiveDateRange,
    handleRetry,
    triggerRefresh,
  };
};
