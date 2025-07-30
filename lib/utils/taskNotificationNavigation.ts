import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { 
  TaskNotificationData, 
  parseTaskNotificationData,
  TASK_NOTIFICATION_ACTIONS,
} from '@/lib/config/taskNotificationConfig';
import { taskNotificationService } from '@/lib/services/taskNotificationService';
import { Logger } from '@/lib/utils/production-utils';

/**
 * Task notification navigation handler
 * Integrates with 5-day task view navigation
 */
export class TaskNotificationNavigationHandler {
  private static instance: TaskNotificationNavigationHandler;
  
  public static getInstance(): TaskNotificationNavigationHandler {
    if (!TaskNotificationNavigationHandler.instance) {
      TaskNotificationNavigationHandler.instance = new TaskNotificationNavigationHandler();
    }
    return TaskNotificationNavigationHandler.instance;
  }

  /**
   * Initialize notification response listeners
   */
  public initialize(): void {
    // Handle notification responses when app is running
    Notifications.addNotificationResponseReceivedListener(this.handleNotificationResponse);

    // Handle notification that opened the app
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) {
        this.handleNotificationResponse(response);
      }
    });
  }

  /**
   * Handle notification response and navigate appropriately
   */
  private handleNotificationResponse = async (response: Notifications.NotificationResponse): Promise<void> => {
    try {
      const notificationData = parseTaskNotificationData(response.notification.request.content.data);
      
      if (!notificationData) {
        Logger.warn('Invalid task notification data received');
        return;
      }

      const actionIdentifier = response.actionIdentifier;

      // Handle notification actions
      if (actionIdentifier && actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
        await this.handleNotificationAction(actionIdentifier, notificationData);
        return;
      }

      // Handle default tap action (navigate to appropriate screen)
      await this.navigateToTask(notificationData);
    } catch (error) {
      Logger.error('Error handling task notification response', { error });
    }
  };

  /**
   * Handle specific notification actions (complete, snooze, etc.)
   */
  private async handleNotificationAction(
    actionIdentifier: string,
    data: TaskNotificationData
  ): Promise<void> {
    try {
      switch (actionIdentifier) {
        case TASK_NOTIFICATION_ACTIONS.COMPLETE_TASK:
          await this.handleCompleteTaskAction(data);
          break;
        
        case TASK_NOTIFICATION_ACTIONS.SNOOZE_TASK:
          await this.handleSnoozeTaskAction(data);
          break;
        
        case TASK_NOTIFICATION_ACTIONS.VIEW_TASK:
          await this.navigateToTask(data);
          break;
        
        case TASK_NOTIFICATION_ACTIONS.MARK_ALL_DONE:
          await this.handleMarkAllDoneAction(data);
          break;
        
        default:
          Logger.warn('Unknown notification action', { actionIdentifier });
          await this.navigateToTask(data);
      }
    } catch (error) {
      Logger.error('Error handling notification action', { actionIdentifier, error });
    }
  }

  /**
   * Handle complete task action from notification
   */
  private async handleCompleteTaskAction(data: TaskNotificationData): Promise<void> {
    try {
      await taskNotificationService.markTaskCompleted(data.taskId, {
        completedAt: new Date(),
        notes: 'Completed via notification',
      });

      // Show success notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ Task Completed',
          body: 'Task marked as completed successfully',
          sound: 'success_notification',
        },
        trigger: null, // Show immediately
      });

      Logger.info('Task completed via notification action', { taskId: data.taskId });
    } catch (error) {
      Logger.error('Failed to complete task via notification', { taskId: data.taskId, error });
      
      // Show error notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '❌ Error',
          body: 'Failed to complete task. Please try again.',
          sound: 'error_notification',
        },
        trigger: null,
      });
    }
  }

  /**
   * Handle snooze task action from notification
   */
  private async handleSnoozeTaskAction(data: TaskNotificationData): Promise<void> {
    try {
      await taskNotificationService.snoozeTask(data.taskId, 1); // Snooze for 1 hour

      // Show success notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Task Snoozed',
          body: 'Task snoozed for 1 hour',
          sound: 'gentle_notification',
        },
        trigger: null,
      });

      Logger.info('Task snoozed via notification action', { taskId: data.taskId });
    } catch (error) {
      Logger.error('Failed to snooze task via notification', { taskId: data.taskId, error });
    }
  }

  /**
   * Handle mark all done action for batch notifications
   */
  private async handleMarkAllDoneAction(data: TaskNotificationData): Promise<void> {
    try {
      if (data.batchTaskIds && data.batchTaskIds.length > 0) {
        await taskNotificationService.batchMarkCompleted(data.batchTaskIds);

        // Show success notification
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '✅ All Tasks Completed',
            body: `${data.batchTaskIds.length} tasks marked as completed`,
            sound: 'success_notification',
          },
          trigger: null,
        });

        Logger.info('Batch tasks completed via notification action', { 
          taskIds: data.batchTaskIds 
        });
      }
    } catch (error) {
      Logger.error('Failed to complete batch tasks via notification', { error });
    }
  }

  /**
   * Navigate to appropriate screen based on task notification data
   */
  private async navigateToTask(data: TaskNotificationData): Promise<void> {
    try {
      switch (data.navigateTo) {
        case 'calendar':
          // Navigate to calendar with specific date and task selected
          router.push({
            pathname: '/(app)/(tabs)/calendar',
            params: {
              selectedDate: data.selectedDate || new Date().toISOString(),
              taskId: data.taskId,
            },
          });
          break;

        case 'plant-detail':
          // Navigate to plant detail with task highlighted
          router.push({
            pathname: `/(app)/plants/${data.plantId}`,
            params: {
              taskId: data.taskId,
            },
          });
          break;

        case 'task-list':
          // Navigate to task list filtered by plant or priority
          router.push({
            pathname: '/(app)/(tabs)/calendar',
            params: {
              plantId: data.plantId,
              priority: data.priority,
              taskId: data.taskId,
            },
          });
          break;

        default:
          // Default to calendar view
          router.push('/(app)/(tabs)/calendar');
      }

      Logger.info('Navigated to task from notification', { 
        navigateTo: data.navigateTo,
        taskId: data.taskId 
      });
    } catch (error) {
      Logger.error('Failed to navigate from task notification', { error, data });
      
      // Fallback to calendar
      try {
        router.push('/(app)/(tabs)/calendar');
      } catch (fallbackError) {
        Logger.error('Failed to navigate to fallback screen', { fallbackError });
      }
    }
  }

  /**
   * Handle deep link URLs for task notifications
   */
  public handleDeepLink(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      
      if (parsedUrl.protocol !== 'canabro:') {
        return false;
      }

      const pathname = parsedUrl.pathname;
      const searchParams = parsedUrl.searchParams;

      switch (pathname) {
        case '/calendar':
          router.push({
            pathname: '/(app)/(tabs)/calendar',
            params: {
              selectedDate: searchParams.get('date') || new Date().toISOString(),
              taskId: searchParams.get('taskId') || undefined,
            },
          });
          return true;

        case '/tasks':
          router.push({
            pathname: '/(app)/(tabs)/calendar',
            params: {
              plantId: searchParams.get('plantId') || undefined,
              priority: searchParams.get('priority') || undefined,
            },
          });
          return true;

        default:
          if (pathname.startsWith('/plants/')) {
            const plantId = pathname.split('/')[2];
            router.push({
              pathname: `/(app)/plants/${plantId}`,
              params: {
                taskId: searchParams.get('taskId') || undefined,
              },
            });
            return true;
          }
      }

      return false;
    } catch (error) {
      Logger.error('Failed to handle task notification deep link', { url, error });
      return false;
    }
  }
}

// Export singleton instance
export const taskNotificationNavigationHandler = TaskNotificationNavigationHandler.getInstance();