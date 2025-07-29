import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import TaskNotificationScheduler from './TaskNotificationScheduler';
import { useTaskNotifications } from '@/lib/hooks/useTaskNotifications';
import { Plant } from '@/lib/models/Plant';
import { PlantTask } from '@/lib/models/PlantTask';

interface TaskNotificationExampleProps {
  plant: Plant;
  onTaskCreated?: (task: PlantTask) => void;
}

/**
 * Example component demonstrating task notification integration
 * Shows how to reuse notification infrastructure for task management
 */
const TaskNotificationExample: React.FC<TaskNotificationExampleProps> = ({
  plant,
  onTaskCreated,
}) => {
  const { t } = useTranslation();
  const [showScheduler, setShowScheduler] = useState(false);
  const { permissionStatus, requestPermissions } = useTaskNotifications();

  const handleCreateTask = async () => {
    // Check permissions first
    if (permissionStatus !== 'granted') {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert(
          t('taskNotifications.permissionRequired'),
          t('taskNotifications.permissionRequiredDescription')
        );
        return;
      }
    }

    setShowScheduler(true);
  };

  const handleTaskCreated = (task: PlantTask) => {
    setShowScheduler(false);
    onTaskCreated?.(task);
    
    Alert.alert(
      t('common.success'),
      t('taskNotifications.taskCreatedSuccessfully', { taskTitle: task.title })
    );
  };

  if (showScheduler) {
    return (
      <TaskNotificationScheduler
        plant={plant}
        onTaskCreated={handleTaskCreated}
        onClose={() => setShowScheduler(false)}
      />
    );
  }

  return (
    <ThemedView className="p-4">
      <ThemedView className="mb-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800">
        <ThemedView className="mb-3 flex-row items-center">
          <OptimizedIcon
            name="notification"
            size={24}
            className="mr-3 text-primary-500"
          />
          <ThemedText variant="heading" className="text-lg">
            Task Notifications
          </ThemedText>
        </ThemedView>
        
        <ThemedText variant="muted" className="mb-4">
          Create task reminders with notifications for your plants. 
          Reuses the existing notification infrastructure with task-focused features.
        </ThemedText>

        <ThemedView className="space-y-2">
          <ThemedView className="flex-row items-center">
            <OptimizedIcon
              name="checkmark-circle"
              size={16}
              className="mr-2 text-green-500"
            />
            <ThemedText className="text-sm">
              ✅ Notification infrastructure reused (90% ready)
            </ThemedText>
          </ThemedView>
          
          <ThemedView className="flex-row items-center">
            <OptimizedIcon
              name="checkmark-circle"
              size={16}
              className="mr-2 text-green-500"
            />
            <ThemedText className="text-sm">
              ✅ Task-focused messaging and deep linking
            </ThemedText>
          </ThemedView>
          
          <ThemedView className="flex-row items-center">
            <OptimizedIcon
              name="checkmark-circle"
              size={16}
              className="mr-2 text-green-500"
            />
            <ThemedText className="text-sm">
              ✅ 5-day task view navigation integration
            </ThemedText>
          </ThemedView>
        </ThemedView>

        <ThemedView className="mt-4 flex-row items-center justify-between rounded-lg bg-primary-50 p-3 dark:bg-primary-900/20">
          <ThemedView className="flex-1">
            <ThemedText className="font-medium text-primary-700 dark:text-primary-300">
              Permission Status
            </ThemedText>
            <ThemedText className="text-sm text-primary-600 dark:text-primary-400">
              {permissionStatus === 'granted' ? '✅ Granted' : 
               permissionStatus === 'denied' ? '❌ Denied' : 
               '⏳ Unknown'}
            </ThemedText>
          </ThemedView>
          
          <OptimizedIcon
            name={permissionStatus === 'granted' ? 'checkmark-circle' : 'warning'}
            size={20}
            className={permissionStatus === 'granted' ? 'text-green-500' : 'text-orange-500'}
          />
        </ThemedView>
      </ThemedView>

      <ThemedView className="rounded-lg bg-primary-500 p-4">
        <ThemedView className="mb-3 flex-row items-center justify-between">
          <ThemedText className="text-lg font-semibold text-white">
            Create Task Reminder
          </ThemedText>
          <OptimizedIcon
            name="add"
            size={24}
            className="text-white"
          />
        </ThemedView>
        
        <ThemedText className="mb-4 text-white/90">
          Schedule a task reminder for {plant.name} with notification support.
        </ThemedText>

        <ThemedView 
          className="rounded-lg bg-white/20 p-3"
          onTouchEnd={handleCreateTask}
        >
          <ThemedView className="flex-row items-center justify-center">
            <OptimizedIcon
              name="calendar"
              size={20}
              className="mr-2 text-white"
            />
            <ThemedText className="font-medium text-white">
              Schedule Task
            </ThemedText>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
};

export default TaskNotificationExample;