/**
 * Plant Task Integration Service
 * 
 * Integrates task automation with existing plant management workflow.
 * Provides high-level API for task scheduling and management that works
 * seamlessly with the existing Plant and CareReminder systems.
 * 
 * This service acts as the main entry point for task automation features
 * in the advanced calendar system.
 */

import { Q } from '@nozbe/watermelondb';
import { addDays } from '../utils/date';
import { log } from '../utils/logger';

import { Plant } from '../models/Plant';
import { PlantTask } from '../models/PlantTask';
import { ScheduleTemplate } from '../models/ScheduleTemplate';
import { TaskAutomationService } from './TaskAutomationService';
import { TaskSchedulingAdapter } from './TaskSchedulingAdapter';
import { GrowthStage } from '../types/plant';
import { TaskType } from '../types/taskTypes';
import { database } from '../models';
import { StrainTaskGenerator } from './StrainTaskGenerator';
import { FEATURE_FLAGS } from '../config/featureFlags';
import * as Sentry from '@sentry/react-native';

export interface TaskSchedulingOptions {
  useTemplate?: boolean;
  templateId?: string;
  generateRecurring?: boolean;
  recurringInterval?: number;
  optimizeFor5DayView?: boolean;
  syncWithCareReminders?: boolean;
  scheduleNotifications?: boolean;
}

export interface TaskGenerationResult {
  tasks: PlantTask[];
  migratedReminders: number;
  scheduledNotifications: number;
  errors: string[];
}

export class PlantTaskIntegration {
  /**
   * Main entry point for scheduling tasks for a plant
   * Integrates all task automation features with existing plant management
   */
  static async scheduleTasksForPlant(
    plant: Plant,
    options: TaskSchedulingOptions = {}
  ): Promise<TaskGenerationResult> {
    const result: TaskGenerationResult = {
      tasks: [],
      migratedReminders: 0,
      scheduledNotifications: 0,
      errors: [],
    };

    try {
      log.info(`[PlantTaskIntegration] Scheduling tasks for plant ${plant.name} with options:`, options);

      // Step 1: Migrate existing CareReminders if requested
      if (options.syncWithCareReminders) {
        try {
          const migratedTasks = await TaskSchedulingAdapter.migrateCareRemindersToTasks(plant.id);
          result.tasks.push(...migratedTasks);
          result.migratedReminders = migratedTasks.length;
          log.info(`[PlantTaskIntegration] Migrated ${migratedTasks.length} care reminders`);
        } catch (error) {
          const errorMsg = `Failed to migrate care reminders: ${error}`;
          result.errors.push(errorMsg);
          log.error(`[PlantTaskIntegration] ${errorMsg}`);
        }
      }

      // Step 2: Generate tasks based on growth stage + strain anchors
      try {
        let template: ScheduleTemplate | undefined;
        
        if (options.useTemplate && options.templateId) {
          template = await database.get<ScheduleTemplate>('schedule_templates').find(options.templateId);
        }

        const growthStageTasks = await TaskAutomationService.scheduleForGrowthStage(
          plant,
          plant.growthStage as GrowthStage,
          template
        );
        
        result.tasks.push(...growthStageTasks);
        log.info(`[PlantTaskIntegration] Generated ${growthStageTasks.length} growth stage tasks`);

        // Strain-anchored tasks (Task 4.1)
        const anchorTasks = await StrainTaskGenerator.generateAnchoredTasks(plant, {
          templateVersion: FEATURE_FLAGS.templateVersion,
          enableFlush: FEATURE_FLAGS.flushTask,
          enableDarkPeriod: FEATURE_FLAGS.darkPeriodTask,
        });
        result.tasks.push(...anchorTasks);
        log.info(`[PlantTaskIntegration] Generated ${anchorTasks.length} strain-anchored tasks`);
      } catch (error) {
        const errorMsg = `Failed to generate growth stage tasks: ${error}`;
        result.errors.push(errorMsg);
        log.error(`[PlantTaskIntegration] ${errorMsg}`);
        try { Sentry.captureException(error); } catch (_) {}
      }

      // Step 3: Generate recurring tasks if requested
      if (options.generateRecurring) {
        try {
          const recurringTasks = await this.generateRecurringTasksForPlant(
            plant,
            options.recurringInterval || 7
          );
          result.tasks.push(...recurringTasks);
          log.info(`[PlantTaskIntegration] Generated ${recurringTasks.length} recurring tasks`);
        } catch (error) {
          const errorMsg = `Failed to generate recurring tasks: ${error}`;
          result.errors.push(errorMsg);
          log.error(`[PlantTaskIntegration] ${errorMsg}`);
        }
      }

      // Step 4: Sync back to CareReminders for compatibility
      if (options.syncWithCareReminders && result.tasks.length > 0) {
        try {
          await TaskSchedulingAdapter.syncTasksToCareReminders(plant.id);
          log.info(`[PlantTaskIntegration] Synced tasks back to care reminders`);
        } catch (error) {
          const errorMsg = `Failed to sync tasks to care reminders: ${error}`;
          result.errors.push(errorMsg);
          log.error(`[PlantTaskIntegration] ${errorMsg}`);
        }
      }

      // Step 5: Schedule notifications if requested
      if (options.scheduleNotifications && result.tasks.length > 0) {
        try {
          await TaskSchedulingAdapter.scheduleTaskNotifications(result.tasks);
          result.scheduledNotifications = result.tasks.length;
          log.info(`[PlantTaskIntegration] Scheduled notifications for ${result.tasks.length} tasks`);
        } catch (error) {
          const errorMsg = `Failed to schedule notifications: ${error}`;
          result.errors.push(errorMsg);
          log.error(`[PlantTaskIntegration] ${errorMsg}`);
        }
      }

      log.info(`[PlantTaskIntegration] Task scheduling completed for ${plant.name}:`, {
        totalTasks: result.tasks.length,
        migratedReminders: result.migratedReminders,
        scheduledNotifications: result.scheduledNotifications,
        errors: result.errors.length,
      });

      return result;
    } catch (error) {
      const errorMsg = `Critical error in task scheduling: ${error}`;
      result.errors.push(errorMsg);
      log.error(`[PlantTaskIntegration] ${errorMsg}`);
      return result;
    }
  }

  /**
   * Handle growth stage transitions with task updates
   */
  static async handleGrowthStageTransition(
    plant: Plant,
    oldStage: GrowthStage,
    newStage: GrowthStage
  ): Promise<void> {
    try {
      log.info(`[PlantTaskIntegration] Handling growth stage transition for ${plant.name}: ${oldStage} → ${newStage}`);

      // Update existing tasks for new growth stage
      await TaskSchedulingAdapter.updateTasksForGrowthStageChange(plant, oldStage, newStage);

      // Generate new tasks for the new growth stage
      const newTasks = await TaskAutomationService.scheduleForGrowthStage(plant, newStage);
      
      // Schedule notifications for new tasks
      if (newTasks.length > 0) {
        await TaskSchedulingAdapter.scheduleTaskNotifications(newTasks);
      }

      log.info(`[PlantTaskIntegration] Growth stage transition completed: generated ${newTasks.length} new tasks`);
    } catch (error) {
      log.error(`[PlantTaskIntegration] Error handling growth stage transition:`, error);
      throw error;
    }
  }

  /**
   * Get tasks optimized for 5-day view
   */
  static async getTasksFor5DayView(
    plantIds: string[],
    startDate: Date = new Date()
  ): Promise<PlantTask[]> {
    try {
      const endDate = addDays(startDate, 5);

      log.info(`[PlantTaskIntegration] Getting tasks for 5-day view: ${startDate.toISOString()} to ${endDate.toISOString()}`);

      const tasks = await database
        .get<PlantTask>('plant_tasks')
        .query(
          Q.where('plant_id', Q.oneOf(plantIds)),
          Q.where('due_date', Q.between(startDate.getTime(), endDate.getTime())),
          Q.sortBy('due_date', Q.asc),
          Q.sortBy('priority', Q.desc)
        )
        .fetch();

      log.info(`[PlantTaskIntegration] Retrieved ${tasks.length} tasks for 5-day view`);
      return tasks;
    } catch (error) {
      log.error(`[PlantTaskIntegration] Error getting tasks for 5-day view:`, error);
      return [];
    }
  }

  /**
   * Bulk task operations for 5-day view management
   */
  static async bulkCompleteTasksForDay(
    plantId: string,
    date: Date,
    taskTypes?: TaskType[]
  ): Promise<number> {
    try {
      const startOfTargetDay = new Date(date);
      startOfTargetDay.setHours(0, 0, 0, 0);
      const endOfTargetDay = addDays(startOfTargetDay, 1);

      const startTimestamp = startOfTargetDay.getTime();
      const endTimestamp = endOfTargetDay.getTime();

      let query = database
        .get<PlantTask>('plant_tasks')
        .query(
          Q.where('plant_id', plantId),
          Q.where('due_date', Q.between(startTimestamp, endTimestamp)),
          Q.where('status', 'pending')
        );

      if (taskTypes && taskTypes.length > 0) {
        query = query.extend(Q.where('task_type', Q.oneOf(taskTypes)));
      }

      const tasks = await query.fetch();

      log.info(`[PlantTaskIntegration] Bulk completing ${tasks.length} tasks for ${date.toDateString()}`);

      await database.write(async () => {
        for (const task of tasks) {
          await task.markAsCompleted();
        }
      });

      return tasks.length;
    } catch (error) {
      log.error(`[PlantTaskIntegration] Error bulk completing tasks:`, error);
      return 0;
    }
  }

  /**
   * Reschedule overdue tasks for better 5-day view management
   */
  static async rescheduleOverdueTasks(plantId: string): Promise<number> {
    try {
      const now = new Date();

      const overdueTasks = await database
        .get<PlantTask>('plant_tasks')
        .query(
          Q.where('plant_id', plantId),
          Q.where('status', 'pending'),
          Q.where('due_date', Q.lt(now.toISOString()))
        )
        .fetch();

      log.info(`[PlantTaskIntegration] Rescheduling ${overdueTasks.length} overdue tasks for plant ${plantId}`);

      await database.write(async () => {
        for (const task of overdueTasks) {
          // Reschedule to today or tomorrow based on priority
          const newDueDate = task.priority === 'critical' || task.priority === 'high' 
            ? now 
            : addDays(now, 1);

          await task.update(plantTask => {
            plantTask.dueDate = newDueDate.toISOString();
          });
        }
      });

      return overdueTasks.length;
    } catch (error) {
      log.error(`[PlantTaskIntegration] Error rescheduling overdue tasks:`, error);
      return 0;
    }
  }

  /**
   * Auto-detect and handle growth stage transitions
   */
  static async autoDetectGrowthStageTransitions(): Promise<void> {
    try {
      // Get all active plants
      const plants = await database
        .get<Plant>('plants')
        .query(Q.where('is_deleted', false))
        .fetch();

      log.info(`[PlantTaskIntegration] Checking ${plants.length} plants for growth stage transitions`);

      for (const plant of plants) {
        try {
          const newStage = await TaskAutomationService.detectGrowthStageTransition(plant);
          
          if (newStage && newStage !== plant.growthStage) {
            log.info(`[PlantTaskIntegration] Auto-detected growth stage transition for ${plant.name}: ${plant.growthStage} → ${newStage}`);
            
            // Update plant growth stage
            await plant.updateGrowthStage(newStage);
            
            // Handle task updates for the transition
            await this.handleGrowthStageTransition(
              plant,
              plant.growthStage as GrowthStage,
              newStage
            );
          }
        } catch (error) {
          log.error(`[PlantTaskIntegration] Error checking growth stage for plant ${plant.name}:`, error);
        }
      }
    } catch (error) {
      log.error(`[PlantTaskIntegration] Error in auto-detect growth stage transitions:`, error);
    }
  }

  /**
   * Private helper methods
   */

  private static async generateRecurringTasksForPlant(
    plant: Plant,
    baseInterval: number
  ): Promise<PlantTask[]> {
    const allTasks: PlantTask[] = [];
    const currentDate = new Date();
    const endDate = addDays(currentDate, 30); // Generate for next 30 days

    // Generate recurring tasks for essential task types
    const recurringTaskTypes: TaskType[] = ['watering', 'feeding', 'inspection'];

    for (const taskType of recurringTaskTypes) {
      try {
        const tasks = await TaskAutomationService.generateRecurringTasks(
          plant,
          taskType,
          baseInterval,
          endDate
        );
        allTasks.push(...tasks);
      } catch (error) {
        log.error(`[PlantTaskIntegration] Error generating recurring ${taskType} tasks:`, error);
      }
    }

    return allTasks;
  }
}

// Export convenience functions for common operations
export const scheduleTasksForPlant = PlantTaskIntegration.scheduleTasksForPlant;
export const handleGrowthStageTransition = PlantTaskIntegration.handleGrowthStageTransition;
export const getTasksFor5DayView = PlantTaskIntegration.getTasksFor5DayView;
export const bulkCompleteTasksForDay = PlantTaskIntegration.bulkCompleteTasksForDay;
export const rescheduleOverdueTasks = PlantTaskIntegration.rescheduleOverdueTasks;
export const autoDetectGrowthStageTransitions = PlantTaskIntegration.autoDetectGrowthStageTransitions;