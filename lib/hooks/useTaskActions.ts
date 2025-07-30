import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';

import { PlantTask } from '@/lib/models/PlantTask';
import { Plant } from '@/lib/models/Plant';
import { taskNotificationService } from '@/lib/services/taskNotificationService';
import { 
  validateNotificationSchedule, 
  formatScheduleError, 
  debugScheduleResult 
} from '@/lib/utils/notification-scheduling';
import { 
  triggerLightHapticSync, 
  triggerMediumHapticSync 
} from '@/lib/utils/haptics';

interface UseTaskActionsOptions {
  plantMap: Map<string, Plant>;
  onTaskUpdate?: () => void;
}

export const useTaskActions = ({ plantMap, onTaskUpdate }: UseTaskActionsOptions) => {
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);

  // Helper function to schedule task notifications
  const scheduleTaskNotification = useCallback(async (task: PlantTask, minutesFromNow: number = 0) => {
    try {
      const plant = plantMap.get(task.plantId);
      if (!plant) {
        console.warn(`Plant not found for task ${task.id}`);
        return;
      }

      const scheduleDate = new Date(new Date(task.dueDate).getTime() + minutesFromNow * 60 * 1000);
      
      // Validate the scheduled date
      const scheduleResult = validateNotificationSchedule(
        scheduleDate,
        0,
        1 // Minimum 1 minute in the future
      );

      debugScheduleResult(scheduleResult, `Schedule task notification for ${task.id}`);

      if (!scheduleResult.success) {
        const errorMessage = formatScheduleError(
          scheduleResult.error,
          t('taskReminders.scheduleErrorFallback', 'Unable to schedule notification')
        );
        
        Alert.alert(
          t('taskReminders.invalidDateTitle', 'Invalid Task Date'),
          errorMessage,
          [{ text: t('common.ok', 'OK') }]
        );
        return;
      }

      // Schedule the notification with task-focused content
      await Notifications.scheduleNotificationAsync({
        identifier: task.id,
        content: {
          title: `🌱 ${plant.name} - ${task.title}`,
          body: `${task.description || t('taskReminders.defaultTaskBody')} • Priority: ${task.priority}${task.estimatedDuration ? ` • ~${task.estimatedDurationFormatted}` : ''}`,
          data: {
            taskId: task.id,
            plantId: plant.id,
            taskType: task.taskType,
            priority: task.priority,
            navigateTo: 'calendar',
            selectedDate: scheduleDate.toISOString(),
          },
        },
        trigger: {
          type: SchedulableTriggerInputTypes.DATE,
          date: scheduleResult.scheduledDate!,
        },
      });
    } catch (error) {
      console.error('Error scheduling task notification:', error);
    }
  }, [plantMap, t]);

  const handleMarkDone = useCallback(async (task: PlantTask) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      await taskNotificationService.markTaskCompleted(task.id);
      triggerMediumHapticSync();
      
      // Cancel any scheduled notification
      try {
        await Notifications.cancelScheduledNotificationAsync(task.id);
      } catch (notificationError) {
        console.error('Error cancelling notification:', notificationError);
      }

      onTaskUpdate?.();
    } catch (error) {
      console.error('Error marking task as done:', error);
      Alert.alert(
        t('taskReminders.error'),
        t('taskReminders.errorMarkingDone')
      );
    } finally {
      setIsProcessing(false);
    }
  }, [t, isProcessing, onTaskUpdate]);

  const handleSnooze = useCallback(async (task: PlantTask, minutes: number) => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);
      await taskNotificationService.snoozeTask(task.id, minutes);
      triggerLightHapticSync();
      
      // Reschedule notification
      try {
        await scheduleTaskNotification(task, minutes);
      } catch (notificationError) {
        console.error('Error rescheduling notification:', notificationError);
      }

      onTaskUpdate?.();
    } catch (error) {
      console.error('Error snoozing task:', error);
      Alert.alert(
        t('taskReminders.error'),
        t('taskReminders.errorSnoozing')
      );
    } finally {
      setIsProcessing(false);
    }
  }, [t, isProcessing, scheduleTaskNotification, onTaskUpdate]);

  const handleReschedule = useCallback((task: PlantTask) => {
    // This would open a date picker modal
    // For now, just snooze by 1 day
    handleSnooze(task, 24 * 60);
  }, [handleSnooze]);

  const handleBulkComplete = useCallback(async (taskIds: string[]) => {
    if (isProcessing || taskIds.length === 0) return;

    try {
      setIsProcessing(true);
      await taskNotificationService.batchMarkCompleted(taskIds);
      
      // Cancel notifications for all selected tasks
      try {
        await Promise.all(
          taskIds.map((id) => Notifications.cancelScheduledNotificationAsync(id))
        );
      } catch (notificationError) {
        console.error('Error cancelling batch notifications:', notificationError);
      }
      
      triggerMediumHapticSync();
      onTaskUpdate?.();
    } catch (error) {
      console.error('Error batch marking tasks as done:', error);
      Alert.alert(
        t('taskReminders.error'),
        t('taskReminders.errorBatchMarkingDone')
      );
    } finally {
      setIsProcessing(false);
    }
  }, [t, isProcessing, onTaskUpdate]);

  const handleBulkSnooze = useCallback(async (taskIds: string[], tasks: PlantTask[], minutes: number) => {
    if (isProcessing || taskIds.length === 0) return;

    try {
      setIsProcessing(true);
      await taskNotificationService.batchSnooze(taskIds, minutes);
      
      // Reschedule notifications for all selected tasks
      try {
        const selectedTaskObjects = tasks.filter((t) => taskIds.includes(t.id));
        await Promise.all(
          selectedTaskObjects.map((task) => scheduleTaskNotification(task, minutes))
        );
      } catch (notificationError) {
        console.error('Error rescheduling batch notifications:', notificationError);
      }
      
      triggerLightHapticSync();
      onTaskUpdate?.();
    } catch (error) {
      console.error('Error batch snoozing tasks:', error);
      Alert.alert(
        t('taskReminders.error'),
        t('taskReminders.errorBatchSnoozing')
      );
    } finally {
      setIsProcessing(false);
    }
  }, [t, isProcessing, scheduleTaskNotification, onTaskUpdate]);

  const handleBulkReschedule = useCallback(async (taskIds: string[], newDate: Date) => {
    if (isProcessing || taskIds.length === 0) return;

    try {
      setIsProcessing(true);
      await taskNotificationService.batchReschedule(taskIds, newDate);
      
      triggerLightHapticSync();
      onTaskUpdate?.();
    } catch (error) {
      console.error('Error batch rescheduling tasks:', error);
      Alert.alert(
        t('taskReminders.error'),
        t('taskReminders.errorBatchRescheduling')
      );
    } finally {
      setIsProcessing(false);
    }
  }, [t, isProcessing, onTaskUpdate]);

  return {
    isProcessing,
    handleMarkDone,
    handleSnooze,
    handleReschedule,
    handleBulkComplete,
    handleBulkSnooze,
    handleBulkReschedule,
    scheduleTaskNotification,
  };
};
