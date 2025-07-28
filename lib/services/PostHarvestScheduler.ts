import { Plant } from '../models/Plant';
import { PlantTask } from '../models/PlantTask';
import { log } from '../utils/logger';
import { addDays } from '../utils/date';
import { generateUuid } from '../utils/uuid';
import { getDatabase } from '../database/database';
import { Q } from '@nozbe/watermelondb';

export interface PostHarvestTask {
  taskType: 'drying' | 'curing' | 'trimming' | 'weighing' | 'storage' | 'cleanup' | 'data_recording';
  title: string;
  description: string;
  daysAfterHarvest: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration: number; // minutes
  supplies?: string[];
  isRecurring?: boolean;
  recurringInterval?: number; // days
}

export interface PostHarvestPlan {
  plantId: string;
  harvestDate: Date;
  postHarvestTasks: PostHarvestTask[];
  totalProcessingDays: number;
  estimatedDryWeight?: number;
}

export class PostHarvestScheduler {
  private static readonly POST_HARVEST_TASKS: PostHarvestTask[] = [
    {
      taskType: 'weighing',
      title: 'Record Wet Weight',
      description: 'Weigh and record the fresh harvest weight',
      daysAfterHarvest: 0,
      priority: 'high',
      estimatedDuration: 15,
      supplies: ['Digital scale', 'Notebook'],
    },
    {
      taskType: 'trimming',
      title: 'Initial Wet Trimming',
      description: 'Remove large fan leaves and excess material',
      daysAfterHarvest: 0,
      priority: 'high',
      estimatedDuration: 120,
      supplies: ['Trimming scissors', 'Gloves', 'Collection tray'],
    },
    {
      taskType: 'drying',
      title: 'Hang for Drying',
      description: 'Hang branches in drying room with proper airflow',
      daysAfterHarvest: 0,
      priority: 'critical',
      estimatedDuration: 30,
      supplies: ['Drying racks', 'String', 'Clips'],
    },
    {
      taskType: 'drying',
      title: 'Check Drying Progress',
      description: 'Monitor temperature, humidity, and drying progress',
      daysAfterHarvest: 1,
      priority: 'high',
      estimatedDuration: 10,
      supplies: ['Hygrometer'],
      isRecurring: true,
      recurringInterval: 1,
    },
    {
      taskType: 'drying',
      title: 'Test Stem Snap',
      description: 'Check if smaller stems snap cleanly (drying complete indicator)',
      daysAfterHarvest: 5,
      priority: 'medium',
      estimatedDuration: 5,
    },
    {
      taskType: 'trimming',
      title: 'Final Dry Trimming',
      description: 'Final trim of dried buds, remove remaining leaves',
      daysAfterHarvest: 7,
      priority: 'high',
      estimatedDuration: 180,
      supplies: ['Trimming scissors', 'Gloves', 'Collection containers'],
    },
    {
      taskType: 'weighing',
      title: 'Record Dry Weight',
      description: 'Weigh and record the final dry weight',
      daysAfterHarvest: 7,
      priority: 'high',
      estimatedDuration: 15,
      supplies: ['Digital scale', 'Notebook'],
    },
    {
      taskType: 'curing',
      title: 'Begin Curing Process',
      description: 'Place dried buds in airtight containers for curing',
      daysAfterHarvest: 7,
      priority: 'critical',
      estimatedDuration: 45,
      supplies: ['Glass jars', 'Humidity packs', 'Labels'],
    },
    {
      taskType: 'curing',
      title: 'Daily Jar Burping',
      description: 'Open jars for 15 minutes to release moisture and check for mold',
      daysAfterHarvest: 8,
      priority: 'high',
      estimatedDuration: 15,
      isRecurring: true,
      recurringInterval: 1,
    },
    {
      taskType: 'curing',
      title: 'Reduce Burping Frequency',
      description: 'Reduce burping to every 2-3 days as moisture stabilizes',
      daysAfterHarvest: 14,
      priority: 'medium',
      estimatedDuration: 10,
      isRecurring: true,
      recurringInterval: 2,
    },
    {
      taskType: 'storage',
      title: 'Long-term Storage Setup',
      description: 'Prepare buds for long-term storage after initial cure',
      daysAfterHarvest: 30,
      priority: 'medium',
      estimatedDuration: 30,
      supplies: ['Vacuum bags', 'Storage containers', 'Labels'],
    },
    {
      taskType: 'data_recording',
      title: 'Record Final Harvest Data',
      description: 'Document final weights, quality notes, and lessons learned',
      daysAfterHarvest: 30,
      priority: 'medium',
      estimatedDuration: 20,
      supplies: ['Notebook', 'Camera'],
    },
    {
      taskType: 'cleanup',
      title: 'Clean Growing Equipment',
      description: 'Clean and sanitize all growing equipment for next cycle',
      daysAfterHarvest: 1,
      priority: 'low',
      estimatedDuration: 60,
      supplies: ['Cleaning supplies', 'Sanitizer'],
    },
  ];

  /**
   * Creates a comprehensive post-harvest processing plan
   */
  static async createPostHarvestPlan(plant: Plant, harvestDate: Date): Promise<PostHarvestPlan> {
    try {
      log.info(`[PostHarvestScheduler] Creating post-harvest plan for plant ${plant.id}`);

      // Customize tasks based on plant characteristics
      const postHarvestTasks = this.customizePostHarvestTasks(plant);
      
      // Estimate dry weight (typically 20-25% of wet weight)
      const estimatedDryWeight = plant.wetWeight ? plant.wetWeight * 0.22 : undefined;
      
      const plan: PostHarvestPlan = {
        plantId: plant.id,
        harvestDate,
        postHarvestTasks,
        totalProcessingDays: 60, // Standard 2-month process
        estimatedDryWeight,
      };
      
      log.info(`[PostHarvestScheduler] Created post-harvest plan with ${postHarvestTasks.length} task types`);
      
      return plan;
    } catch (error) {
      log.error(`[PostHarvestScheduler] Error creating post-harvest plan:`, error);
      throw error;
    }
  }

  /**
   * Schedules all post-harvest tasks when a plant is harvested
   */
  static async schedulePostHarvestTasks(plant: Plant, harvestDate: Date): Promise<PlantTask[]> {
    try {
      log.info(`[PostHarvestScheduler] Scheduling post-harvest tasks for plant ${plant.id}`);

      const plan = await this.createPostHarvestPlan(plant, harvestDate);
      const database = getDatabase();
      const createdTasks: PlantTask[] = [];

      await database.write(async () => {
        for (const postTask of plan.postHarvestTasks) {
          // Calculate initial task due date
          const dueDate = addDays(harvestDate, postTask.daysAfterHarvest);
          
          // Create the initial task
          const task = await this.createPostHarvestTask(
            database,
            plant,
            postTask,
            dueDate,
            1 // sequence number
          );
          
          createdTasks.push(task);
          
          // Create recurring tasks if specified
          if (postTask.isRecurring && postTask.recurringInterval) {
            await this.createRecurringPostHarvestTasks(
              database,
              plant,
              postTask,
              harvestDate,
              createdTasks
            );
          }
        }
      });

      log.info(`[PostHarvestScheduler] Successfully created ${createdTasks.length} post-harvest tasks`);
      return createdTasks;
    } catch (error) {
      log.error(`[PostHarvestScheduler] Error scheduling post-harvest tasks:`, error);
      throw error;
    }
  }

  /**
   * Marks a plant as harvested and triggers post-harvest scheduling
   */
  static async markPlantAsHarvested(
    plant: Plant,
    harvestData: {
      harvestDate: Date;
      wetWeight?: number;
      notes?: string;
    }
  ): Promise<void> {
    try {
      log.info(`[PostHarvestScheduler] Marking plant ${plant.id} as harvested`);

      const database = getDatabase();
      
      await database.write(async () => {
        // Update plant with harvest data
        await plant.update((p) => {
          p.harvestDate = harvestData.harvestDate;
          p.growthStage = 'harvested';
          if (harvestData.wetWeight) p.wetWeight = harvestData.wetWeight;
          if (harvestData.notes) p.notes = harvestData.notes;
        });

        // Archive existing active tasks
        const activeTasks = await database
          .get('plant_tasks')
          .query(
            Q.where('plant_id', plant.id),
            Q.where('status', Q.notEq('completed'))
          )
          .fetch();

        for (const task of activeTasks) {
          await task.update((t: any) => {
            t.status = 'archived';
          });
        }
      });

      // Schedule post-harvest tasks
      await this.schedulePostHarvestTasks(plant, harvestData.harvestDate);
      
      log.info(`[PostHarvestScheduler] Successfully marked plant ${plant.id} as harvested and scheduled post-harvest tasks`);
    } catch (error) {
      log.error(`[PostHarvestScheduler] Error marking plant as harvested:`, error);
      throw error;
    }
  }

  /**
   * Updates post-harvest tasks based on actual progress
   */
  static async updatePostHarvestProgress(
    plant: Plant,
    taskType: PostHarvestTask['taskType'],
    progressData: {
      actualDuration?: number;
      notes?: string;
      nextCheckDate?: Date;
    }
  ): Promise<void> {
    try {
      log.info(`[PostHarvestScheduler] Updating post-harvest progress for ${taskType}`);

      const database = getDatabase();
      
      // Find related tasks
      const tasks = await database
        .get('plant_tasks')
        .query(
          Q.where('plant_id', plant.id),
          Q.where('task_type', taskType),
          Q.where('template_id', 'post_harvest')
        )
        .fetch();

      await database.write(async () => {
        for (const task of tasks) {
          await task.update((t: any) => {
            if (progressData.actualDuration) {
              t.estimatedDuration = progressData.actualDuration;
            }
            if (progressData.notes) {
              t.description = `${t.description}\n\nProgress Notes: ${progressData.notes}`;
            }
          });
        }
      });

      // Schedule next check if specified
      if (progressData.nextCheckDate) {
        const nextTask = this.POST_HARVEST_TASKS.find(t => t.taskType === taskType);
        if (nextTask) {
          await database.write(async () => {
            await this.createPostHarvestTask(
              database,
              plant,
              nextTask,
              progressData.nextCheckDate!,
              Date.now() // Use timestamp as sequence
            );
          });
        }
      }

      log.info(`[PostHarvestScheduler] Updated post-harvest progress for ${taskType}`);
    } catch (error) {
      log.error(`[PostHarvestScheduler] Error updating post-harvest progress:`, error);
    }
  }

  private static async createPostHarvestTask(
    database: any,
    plant: Plant,
    postTask: PostHarvestTask,
    dueDate: Date,
    sequenceNumber: number
  ): Promise<PlantTask> {
    return await database.get('plant_tasks').create((newTask: any) => {
      newTask.taskId = generateUuid();
      newTask.plantId = plant.id;
      newTask.title = postTask.title;
      newTask.description = postTask.description;
      newTask.taskType = postTask.taskType;
      newTask.dueDate = dueDate.toISOString();
      newTask.status = 'pending';
      newTask.userId = plant.userId;
      newTask.priority = postTask.priority;
      newTask.estimatedDuration = postTask.estimatedDuration;
      newTask.autoGenerated = true;
      newTask.templateId = 'post_harvest';
      newTask.sequenceNumber = sequenceNumber;
    });
  }

  private static async createRecurringPostHarvestTasks(
    database: any,
    plant: Plant,
    postTask: PostHarvestTask,
    harvestDate: Date,
    createdTasks: PlantTask[]
  ): Promise<void> {
    if (!postTask.isRecurring || !postTask.recurringInterval) return;

    // Determine how many recurring tasks to create based on task type
    let maxRecurrences = 0;
    let startDay = postTask.daysAfterHarvest;

    switch (postTask.taskType) {
      case 'drying':
        maxRecurrences = 7; // Daily checks for 7 days
        break;
      case 'curing':
        if (postTask.title.includes('Daily')) {
          maxRecurrences = 7; // Daily burping for first week
        } else {
          maxRecurrences = 8; // Every 2-3 days for 2 weeks
          startDay = 14;
        }
        break;
      default:
        maxRecurrences = 5; // Default 5 occurrences
    }

    // Create recurring tasks
    for (let i = 1; i <= maxRecurrences; i++) {
      const recurringDueDate = addDays(
        harvestDate,
        startDay + (i * postTask.recurringInterval)
      );

      const recurringTask = await this.createPostHarvestTask(
        database,
        plant,
        {
          ...postTask,
          title: `${postTask.title} (Day ${startDay + (i * postTask.recurringInterval)})`,
        },
        recurringDueDate,
        i + 1
      );

      createdTasks.push(recurringTask);
    }
  }

  private static customizePostHarvestTasks(plant: Plant): PostHarvestTask[] {
    let tasks = [...this.POST_HARVEST_TASKS];
    
    // Customize based on plant size/yield
    if (plant.wetWeight && plant.wetWeight > 500) { // Large harvest
      // Increase trimming time for large harvests
      const trimmingTasks = tasks.filter(t => t.taskType === 'trimming');
      trimmingTasks.forEach(task => {
        task.estimatedDuration = Math.floor(task.estimatedDuration * 1.5);
      });
    }
    
    // Customize based on grow medium
    if (plant.growMedium === 'hydroponic') {
      // Add specific hydroponic cleanup tasks
      tasks.push({
        taskType: 'cleanup',
        title: 'Clean Hydroponic System',
        description: 'Clean and sanitize hydroponic reservoir and lines',
        daysAfterHarvest: 1,
        priority: 'medium',
        estimatedDuration: 90,
        supplies: ['System cleaner', 'Fresh water', 'pH test kit'],
      });
    }
    
    // Customize based on location (indoor vs outdoor)
    if (plant.lightCondition === 'outdoor') {
      // Outdoor plants may need different drying considerations
      const dryingTasks = tasks.filter(t => t.taskType === 'drying');
      dryingTasks.forEach(task => {
        if (task.title.includes('Check Drying')) {
          task.description = `${task.description} (Monitor for weather changes affecting drying)`;
        }
      });
    }
    
    return tasks.sort((a, b) => a.daysAfterHarvest - b.daysAfterHarvest);
  }
}