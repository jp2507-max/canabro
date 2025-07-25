/**
 * TaskReminderEngine Tests
 * 
 * Tests for the TaskReminderEngine service to ensure proper functionality
 * of notification batching, timing optimization, and overdue task handling.
 */

import { TaskReminderEngine, TaskNotificationConfig } from '../TaskReminderEngine';
import { TaskType } from '@/lib/types/taskTypes';

// Mock dependencies
jest.mock('../NotificationService', () => ({
  scheduleNotification: jest.fn().mockResolvedValue('mock-notification-id'),
  cancelTaskReminder: jest.fn().mockResolvedValue(undefined),
  NotificationType: {
    TASK_REMINDER: 'task_reminder',
  },
}));

jest.mock('@/lib/models', () => ({
  database: {
    collections: {
      get: jest.fn().mockReturnValue({
        query: jest.fn().mockReturnValue({
          fetch: jest.fn().mockResolvedValue([]),
        }),
      }),
    },
  },
}));

jest.mock('@/lib/utils/production-utils', () => ({
  Logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('TaskReminderEngine', () => {
  let taskReminderEngine: TaskReminderEngine;

  beforeEach(() => {
    taskReminderEngine = TaskReminderEngine.getInstance();
    taskReminderEngine.clearCache();
    jest.clearAllMocks();
  });

  describe('scheduleTaskNotifications', () => {
    it('should schedule notifications for single task', async () => {
      const mockTask: TaskNotificationConfig = {
        taskId: 'task-1',
        plantId: 'plant-1',
        plantName: 'Test Plant',
        taskType: 'watering' as TaskType,
        taskTitle: 'Water Test Plant',
        dueDate: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        priority: 'medium',
      };

      await taskReminderEngine.scheduleTaskNotifications([mockTask]);

      // Verify notification was scheduled
      const { scheduleNotification } = require('../NotificationService');
      expect(scheduleNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '💧 Water Test Plant',
          body: 'Time to watering your Test Plant!',
          data: expect.objectContaining({
            type: 'task_reminder',
            taskIds: ['task-1'],
            plantIds: ['plant-1'],
          }),
        })
      );
    });

    it('should batch multiple tasks for same plant', async () => {
      const mockTasks: TaskNotificationConfig[] = [
        {
          taskId: 'task-1',
          plantId: 'plant-1',
          plantName: 'Test Plant',
          taskType: 'watering' as TaskType,
          taskTitle: 'Water Test Plant',
          dueDate: new Date(Date.now() + 60 * 60 * 1000),
          priority: 'medium',
        },
        {
          taskId: 'task-2',
          plantId: 'plant-1',
          plantName: 'Test Plant',
          taskType: 'feeding' as TaskType,
          taskTitle: 'Feed Test Plant',
          dueDate: new Date(Date.now() + 90 * 60 * 1000), // 1.5 hours from now
          priority: 'medium',
        },
      ];

      await taskReminderEngine.scheduleTaskNotifications(mockTasks);

      const { scheduleNotification } = require('../NotificationService');
      expect(scheduleNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '🌱 2 tasks for Test Plant',
          body: 'Time for: watering, feeding',
        })
      );
    });

    it('should handle high priority tasks with earlier notification', async () => {
      const mockTask: TaskNotificationConfig = {
        taskId: 'task-1',
        plantId: 'plant-1',
        plantName: 'Test Plant',
        taskType: 'inspection' as TaskType,
        taskTitle: 'Inspect Test Plant',
        dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        priority: 'critical',
      };

      await taskReminderEngine.scheduleTaskNotifications([mockTask]);

      const { scheduleNotification } = require('../NotificationService');
      const callArgs = scheduleNotification.mock.calls[0][0];
      
      // High priority tasks should be scheduled 1 hour before due time
      expect(callArgs.trigger).toBeLessThan(2 * 60 * 60); // Less than 2 hours
      expect(callArgs.trigger).toBeGreaterThan(30 * 60); // More than 30 minutes
    });
  });

  describe('cancelTaskNotifications', () => {
    it('should cancel notifications for a task', async () => {
      const taskId = 'task-1';

      await taskReminderEngine.cancelTaskNotifications(taskId);

      const { cancelTaskReminder } = require('../NotificationService');
      expect(cancelTaskReminder).toHaveBeenCalledWith(taskId);
    });

    it('should remove task from internal tracking', async () => {
      const taskId = 'task-1';
      
      // First schedule a task to add it to tracking
      const mockTask: TaskNotificationConfig = {
        taskId,
        plantId: 'plant-1',
        plantName: 'Test Plant',
        taskType: 'watering' as TaskType,
        taskTitle: 'Water Test Plant',
        dueDate: new Date(Date.now() + 60 * 60 * 1000),
        priority: 'medium',
      };

      await taskReminderEngine.scheduleTaskNotifications([mockTask]);
      
      // Then cancel it
      await taskReminderEngine.cancelTaskNotifications(taskId);

      // Verify it's removed from tracking
      const stats = taskReminderEngine.getNotificationStats();
      expect(stats.activeBatches).toBe(0);
    });
  });

  describe('rescheduleTaskNotification', () => {
    it('should reschedule a task notification', async () => {
      const taskId = 'task-1';
      const newDueDate = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours from now

      // Mock the database find method
      const mockTask = {
        id: taskId,
        plantId: 'plant-1',
        taskType: 'watering',
        title: 'Water Test Plant',
        priority: 'medium',
        plant: {
          fetch: jest.fn().mockResolvedValue({ name: 'Test Plant' }),
        },
      };

      const { database } = require('@/lib/models');
      database.collections.get.mockReturnValue({
        find: jest.fn().mockResolvedValue(mockTask),
      });

      await taskReminderEngine.rescheduleTaskNotification(taskId, newDueDate);

      // Should cancel old notification and schedule new one
      const { cancelTaskReminder, scheduleNotification } = require('../NotificationService');
      expect(cancelTaskReminder).toHaveBeenCalledWith(taskId);
      expect(scheduleNotification).toHaveBeenCalled();
    });
  });

  describe('processOverdueTasks', () => {
    it('should process overdue tasks and send escalated notifications', async () => {
      // Mock overdue tasks
      const mockOverdueTask = {
        id: 'overdue-task-1',
        plantId: 'plant-1',
        taskType: 'watering',
        title: 'Water Test Plant',
        dueDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        status: 'pending',
        plant: {
          fetch: jest.fn().mockResolvedValue({ name: 'Test Plant' }),
        },
      };

      const { database } = require('@/lib/models');
      database.collections.get.mockReturnValue({
        query: jest.fn().mockReturnValue({
          fetch: jest.fn().mockResolvedValue([mockOverdueTask]),
        }),
      });

      await taskReminderEngine.processOverdueTasks();

      // Should schedule escalated notification
      const { scheduleNotification } = require('../NotificationService');
      expect(scheduleNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Overdue'),
          body: expect.stringContaining('overdue'),
        })
      );
    });
  });

  describe('optimizeNotificationTiming', () => {
    it('should return optimized notification times', async () => {
      const userId = 'user-1';
      const mockTasks: TaskNotificationConfig[] = [
        {
          taskId: 'task-1',
          plantId: 'plant-1',
          plantName: 'Test Plant',
          taskType: 'watering' as TaskType,
          taskTitle: 'Water Test Plant',
          dueDate: new Date(Date.now() + 60 * 60 * 1000),
          priority: 'medium',
        },
      ];

      const optimizedTimes = await taskReminderEngine.optimizeNotificationTiming(userId, mockTasks);

      expect(optimizedTimes).toHaveLength(1);
      expect(optimizedTimes[0]).toBeInstanceOf(Date);
    });

    it('should group related tasks to minimize interruptions', async () => {
      const userId = 'user-1';
      const mockTasks: TaskNotificationConfig[] = [
        {
          taskId: 'task-1',
          plantId: 'plant-1',
          plantName: 'Test Plant',
          taskType: 'watering' as TaskType,
          taskTitle: 'Water Test Plant',
          dueDate: new Date(Date.now() + 60 * 60 * 1000),
          priority: 'medium',
        },
        {
          taskId: 'task-2',
          plantId: 'plant-1',
          plantName: 'Test Plant',
          taskType: 'feeding' as TaskType,
          taskTitle: 'Feed Test Plant',
          dueDate: new Date(Date.now() + 90 * 60 * 1000), // 30 minutes later
          priority: 'medium',
        },
      ];

      const optimizedTimes = await taskReminderEngine.optimizeNotificationTiming(userId, mockTasks);

      // Should group related tasks, resulting in fewer notification times
      expect(optimizedTimes.length).toBeLessThan(mockTasks.length);
    });
  });

  describe('getNotificationStats', () => {
    it('should return current notification statistics', () => {
      const stats = taskReminderEngine.getNotificationStats();

      expect(stats).toHaveProperty('activeBatches');
      expect(stats).toHaveProperty('overdueEscalations');
      expect(stats).toHaveProperty('cachedUserPatterns');
      expect(typeof stats.activeBatches).toBe('number');
      expect(typeof stats.overdueEscalations).toBe('number');
      expect(typeof stats.cachedUserPatterns).toBe('number');
    });
  });

  describe('clearCache', () => {
    it('should clear all cached data', () => {
      // Add some data to cache first
      const mockTask: TaskNotificationConfig = {
        taskId: 'task-1',
        plantId: 'plant-1',
        plantName: 'Test Plant',
        taskType: 'watering' as TaskType,
        taskTitle: 'Water Test Plant',
        dueDate: new Date(Date.now() + 60 * 60 * 1000),
        priority: 'medium',
      };

      taskReminderEngine.scheduleTaskNotifications([mockTask]);

      // Clear cache
      taskReminderEngine.clearCache();

      // Verify cache is cleared
      const stats = taskReminderEngine.getNotificationStats();
      expect(stats.activeBatches).toBe(0);
      expect(stats.overdueEscalations).toBe(0);
      expect(stats.cachedUserPatterns).toBe(0);
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = TaskReminderEngine.getInstance();
      const instance2 = TaskReminderEngine.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});