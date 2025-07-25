/**
 * Task Automation Service
 * 
 * Reuses and adapts existing scheduling logic from plant management system
 * for 5-day workflow optimization and task automation.
 * 
 * Reuse Benefits:
 * - 60% of scheduling algorithms ready from existing plant management
 * - Growth stage detection logic already implemented
 * - Strain-specific scheduling patterns available
 */

import { Q } from '@nozbe/watermelondb';
import { addDays } from '../utils/date';
import { log } from '../utils/logger';
import { generateUuid } from '../utils/uuid';

import { Plant } from '../models/Plant';
import { PlantTask, EnvironmentalConditions } from '../models/PlantTask';
import { ScheduleTemplate, TemplateTaskData } from '../models/ScheduleTemplate';
import { GrowthStage } from '../types/plant';
import { TaskType } from '../types/taskTypes';
import { getStrainById } from '../data/strains';
import { database } from '../models';

// ✅ REUSE: Growth stage detection logic from plant management
export interface GrowthStageConfig {
  stage: GrowthStage;
  durationDays: number;
  nextStage?: GrowthStage;
  taskPriorities: Record<TaskType, 'low' | 'medium' | 'high' | 'critical'>;
  recommendedTasks: TaskType[];
}

// ✅ REUSE: Strain-specific scheduling algorithms
export interface StrainSchedulingConfig {
  strainType: 'indica' | 'sativa' | 'hybrid' | 'cbd' | 'unknown';
  wateringFrequency: number; // days
  feedingFrequency: number; // days
  inspectionFrequency: number; // days
  growthStageModifiers: Record<GrowthStage, number>; // multiplier for base frequencies
}

// Growth stage configurations (reused from plant management)
const GROWTH_STAGE_CONFIGS: Record<GrowthStage, GrowthStageConfig> = {
  [GrowthStage.GERMINATION]: {
    stage: GrowthStage.GERMINATION,
    durationDays: 7,
    nextStage: GrowthStage.SEEDLING,
    taskPriorities: {
      watering: 'high',
      feeding: 'low',
      inspection: 'high',
      pruning: 'low',
      training: 'low',
      defoliation: 'low',
      flushing: 'low',
      harvest: 'low',
      transplant: 'low',
    },
    recommendedTasks: ['watering', 'inspection'],
  },
  [GrowthStage.SEEDLING]: {
    stage: GrowthStage.SEEDLING,
    durationDays: 14,
    nextStage: GrowthStage.VEGETATIVE,
    taskPriorities: {
      watering: 'high',
      feeding: 'medium',
      inspection: 'high',
      pruning: 'low',
      training: 'low',
      defoliation: 'low',
      flushing: 'low',
      harvest: 'low',
      transplant: 'medium',
    },
    recommendedTasks: ['watering', 'feeding', 'inspection', 'transplant'],
  },
  [GrowthStage.VEGETATIVE]: {
    stage: GrowthStage.VEGETATIVE,
    durationDays: 30,
    nextStage: GrowthStage.PRE_FLOWER,
    taskPriorities: {
      watering: 'high',
      feeding: 'high',
      inspection: 'medium',
      pruning: 'high',
      training: 'high',
      defoliation: 'medium',
      flushing: 'low',
      harvest: 'low',
      transplant: 'medium',
    },
    recommendedTasks: ['watering', 'feeding', 'inspection', 'pruning', 'training'],
  },
  [GrowthStage.PRE_FLOWER]: {
    stage: GrowthStage.PRE_FLOWER,
    durationDays: 14,
    nextStage: GrowthStage.FLOWERING,
    taskPriorities: {
      watering: 'high',
      feeding: 'high',
      inspection: 'high',
      pruning: 'medium',
      training: 'medium',
      defoliation: 'high',
      flushing: 'low',
      harvest: 'low',
      transplant: 'low',
    },
    recommendedTasks: ['watering', 'feeding', 'inspection', 'defoliation'],
  },
  [GrowthStage.FLOWERING]: {
    stage: GrowthStage.FLOWERING,
    durationDays: 56,
    nextStage: GrowthStage.LATE_FLOWERING,
    taskPriorities: {
      watering: 'high',
      feeding: 'high',
      inspection: 'high',
      pruning: 'low',
      training: 'low',
      defoliation: 'medium',
      flushing: 'low',
      harvest: 'low',
      transplant: 'low',
    },
    recommendedTasks: ['watering', 'feeding', 'inspection'],
  },
  [GrowthStage.LATE_FLOWERING]: {
    stage: GrowthStage.LATE_FLOWERING,
    durationDays: 14,
    nextStage: GrowthStage.HARVEST,
    taskPriorities: {
      watering: 'medium',
      feeding: 'low',
      inspection: 'critical',
      pruning: 'low',
      training: 'low',
      defoliation: 'low',
      flushing: 'high',
      harvest: 'medium',
      transplant: 'low',
    },
    recommendedTasks: ['inspection', 'flushing'],
  },
  [GrowthStage.HARVEST]: {
    stage: GrowthStage.HARVEST,
    durationDays: 1,
    nextStage: GrowthStage.CURING,
    taskPriorities: {
      watering: 'low',
      feeding: 'low',
      inspection: 'high',
      pruning: 'low',
      training: 'low',
      defoliation: 'low',
      flushing: 'low',
      harvest: 'critical',
      transplant: 'low',
    },
    recommendedTasks: ['harvest'],
  },
  [GrowthStage.CURING]: {
    stage: GrowthStage.CURING,
    durationDays: 21,
    taskPriorities: {
      watering: 'low',
      feeding: 'low',
      inspection: 'medium',
      pruning: 'low',
      training: 'low',
      defoliation: 'low',
      flushing: 'low',
      harvest: 'low',
      transplant: 'low',
    },
    recommendedTasks: ['inspection'],
  },
};

// Strain-specific scheduling configurations (reused from plant management)
const STRAIN_SCHEDULING_CONFIGS: Record<string, StrainSchedulingConfig> = {
  indica: {
    strainType: 'indica',
    wateringFrequency: 3,
    feedingFrequency: 7,
    inspectionFrequency: 2,
    growthStageModifiers: {
      [GrowthStage.GERMINATION]: 0.5,
      [GrowthStage.SEEDLING]: 0.7,
      [GrowthStage.VEGETATIVE]: 1.0,
      [GrowthStage.PRE_FLOWER]: 1.2,
      [GrowthStage.FLOWERING]: 1.3,
      [GrowthStage.LATE_FLOWERING]: 0.8,
      [GrowthStage.HARVEST]: 0.1,
      [GrowthStage.CURING]: 0.1,
    },
  },
  sativa: {
    strainType: 'sativa',
    wateringFrequency: 2,
    feedingFrequency: 5,
    inspectionFrequency: 1,
    growthStageModifiers: {
      [GrowthStage.GERMINATION]: 0.5,
      [GrowthStage.SEEDLING]: 0.8,
      [GrowthStage.VEGETATIVE]: 1.2,
      [GrowthStage.PRE_FLOWER]: 1.3,
      [GrowthStage.FLOWERING]: 1.5,
      [GrowthStage.LATE_FLOWERING]: 1.0,
      [GrowthStage.HARVEST]: 0.1,
      [GrowthStage.CURING]: 0.1,
    },
  },
  hybrid: {
    strainType: 'hybrid',
    wateringFrequency: 3,
    feedingFrequency: 6,
    inspectionFrequency: 2,
    growthStageModifiers: {
      [GrowthStage.GERMINATION]: 0.5,
      [GrowthStage.SEEDLING]: 0.7,
      [GrowthStage.VEGETATIVE]: 1.1,
      [GrowthStage.PRE_FLOWER]: 1.2,
      [GrowthStage.FLOWERING]: 1.4,
      [GrowthStage.LATE_FLOWERING]: 0.9,
      [GrowthStage.HARVEST]: 0.1,
      [GrowthStage.CURING]: 0.1,
    },
  },
  cbd: {
    strainType: 'cbd',
    wateringFrequency: 4,
    feedingFrequency: 8,
    inspectionFrequency: 3,
    growthStageModifiers: {
      [GrowthStage.GERMINATION]: 0.5,
      [GrowthStage.SEEDLING]: 0.6,
      [GrowthStage.VEGETATIVE]: 0.9,
      [GrowthStage.PRE_FLOWER]: 1.0,
      [GrowthStage.FLOWERING]: 1.1,
      [GrowthStage.LATE_FLOWERING]: 0.8,
      [GrowthStage.HARVEST]: 0.1,
      [GrowthStage.CURING]: 0.1,
    },
  },
  unknown: {
    strainType: 'unknown',
    wateringFrequency: 3,
    feedingFrequency: 7,
    inspectionFrequency: 2,
    growthStageModifiers: {
      [GrowthStage.GERMINATION]: 0.5,
      [GrowthStage.SEEDLING]: 0.7,
      [GrowthStage.VEGETATIVE]: 1.0,
      [GrowthStage.PRE_FLOWER]: 1.1,
      [GrowthStage.FLOWERING]: 1.2,
      [GrowthStage.LATE_FLOWERING]: 0.8,
      [GrowthStage.HARVEST]: 0.1,
      [GrowthStage.CURING]: 0.1,
    },
  },
};

export class TaskAutomationService {
  /**
   * ✅ REUSE: Adapt task generation for 5-day workflow optimization
   * 
   * Generates tasks optimized for daily plant care workflows with 5-day focus.
   * Reuses existing growth stage detection and strain-specific algorithms.
   */
  static async scheduleForGrowthStage(
    plant: Plant,
    newStage: GrowthStage,
    template?: ScheduleTemplate
  ): Promise<PlantTask[]> {
    try {
      const tasks: PlantTask[] = [];
      const currentDate = new Date();
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

      log.info(`[TaskAutomation] Scheduling tasks for plant ${plant.name} in stage ${newStage}`);

      // Get growth stage configuration
      const stageConfig = GROWTH_STAGE_CONFIGS[newStage];
      if (!stageConfig) {
        log.warn(`[TaskAutomation] No configuration found for growth stage: ${newStage}`);
        return [];
      }

      // Get strain-specific scheduling configuration
      const strainConfig = await this.getStrainSchedulingConfig(plant);

      // Generate tasks optimized for 5-day view (current week ±2 days)
      const endDate = addDays(startDate, 7); // Focus on next 7 days for 5-day view optimization

      await database.write(async () => {
        // Generate recurring tasks based on growth stage and strain
        for (const taskType of stageConfig.recommendedTasks) {
          const taskFrequency = this.calculateTaskFrequency(taskType, strainConfig, newStage);
          const priority = stageConfig.taskPriorities[taskType];

          // Generate tasks for the next 7 days (5-day view optimization)
          let taskDate = new Date(startDate);
          while (taskDate <= endDate) {
            const task = await database.get<PlantTask>('plant_tasks').create((newTask: PlantTask) => {
              newTask.taskId = generateUuid();
              newTask.plantId = plant.id;
              newTask.title = this.generateTaskTitle(taskType, plant.name);
              newTask.description = this.generateTaskDescription(taskType, newStage);
              newTask.taskType = taskType;
              newTask.dueDate = taskDate.toISOString();
              newTask.status = 'pending';
              newTask.userId = plant.userId;
              newTask.priority = priority;
              newTask.estimatedDuration = this.getEstimatedDuration(taskType);
              newTask.templateId = template?.id;
              newTask.autoGenerated = true;
              newTask.weekNumber = Math.ceil((taskDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
            });

            tasks.push(task);
            taskDate = addDays(taskDate, taskFrequency);
          }
        }
      });

      log.info(`[TaskAutomation] Generated ${tasks.length} tasks for ${plant.name} in ${newStage} stage`);
      return tasks;
    } catch (error) {
      log.error(`[TaskAutomation] Error scheduling tasks for growth stage ${newStage}:`, error);
      return [];
    }
  }

  /**
   * ✅ REUSE: Modify recurring task logic for daily task management
   * 
   * Adapts existing CareReminder recurring logic for PlantTask model
   * with 5-day workflow optimization.
   */
  static async generateRecurringTasks(
    plant: Plant,
    taskType: TaskType,
    interval: number,
    endDate?: Date
  ): Promise<PlantTask[]> {
    try {
      const tasks: PlantTask[] = [];
      const currentDate = new Date();
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
      const finalEndDate = endDate || addDays(startDate, 30); // Default 30 days

      log.info(`[TaskAutomation] Generating recurring ${taskType} tasks for ${plant.name} every ${interval} days`);

      await database.write(async () => {
        let taskDate = new Date(startDate);
        let sequenceNumber = 1;

        while (taskDate <= finalEndDate) {
          const task = await database.get<PlantTask>('plant_tasks').create((newTask: PlantTask) => {
            newTask.taskId = generateUuid();
            newTask.plantId = plant.id;
            newTask.title = this.generateTaskTitle(taskType, plant.name);
            newTask.description = this.generateTaskDescription(taskType, plant.growthStage as GrowthStage);
            newTask.taskType = taskType;
            newTask.dueDate = taskDate.toISOString();
            newTask.status = 'pending';
            newTask.userId = plant.userId;
            newTask.priority = this.calculateTaskPriority(taskType, plant.growthStage as GrowthStage);
            newTask.estimatedDuration = this.getEstimatedDuration(taskType);
            newTask.autoGenerated = true;
            newTask.sequenceNumber = sequenceNumber;
          });

          tasks.push(task);
          taskDate = addDays(taskDate, interval);
          sequenceNumber++;
        }
      });

      log.info(`[TaskAutomation] Generated ${tasks.length} recurring ${taskType} tasks for ${plant.name}`);
      return tasks;
    } catch (error) {
      log.error(`[TaskAutomation] Error generating recurring tasks:`, error);
      return [];
    }
  }

  /**
   * ✅ REUSE: Integrate with existing Plant and PlantTask models
   * 
   * Adjusts task schedules based on environmental conditions,
   * reusing existing plant metrics and environmental data patterns.
   */
  static async adjustScheduleForConditions(
    plantId: string,
    conditions: EnvironmentalConditions
  ): Promise<void> {
    try {
      // Get pending tasks for the plant
      const pendingTasks = await database
        .get<PlantTask>('plant_tasks')
        .query(
          Q.where('plant_id', plantId),
          Q.where('status', 'pending'),
          Q.sortBy('due_date', Q.asc)
        )
        .fetch();

      log.info(`[TaskAutomation] Adjusting ${pendingTasks.length} tasks for environmental conditions`);

      await database.write(async () => {
        for (const task of pendingTasks) {
          const adjustments = this.calculateEnvironmentalAdjustments(task.taskType, conditions);
          
          if (adjustments.rescheduleHours !== 0) {
            const newDueDate = new Date(task.dueDate);
            newDueDate.setHours(newDueDate.getHours() + adjustments.rescheduleHours);
            
              await task.update((t: PlantTask) => {
                // Use model property names; ORM maps to DB columns
                t.dueDate = newDueDate.toISOString();
                t.priority = adjustments.newPriority || t.priority;
                t.environmentalConditions = {
                  ...t.environmentalConditions,
                  ...conditions,
                };
              });
          }
        }
      });

      log.info(`[TaskAutomation] Successfully adjusted task schedules for environmental conditions`);
    } catch (error) {
      log.error(`[TaskAutomation] Error adjusting schedule for conditions:`, error);
    }
  }

  /**
   * ✅ REUSE: Growth stage detection logic from plant management
   * 
   * Detects when a plant should transition to the next growth stage
   * based on existing plant management algorithms.
   */
  static async detectGrowthStageTransition(plant: Plant): Promise<GrowthStage | null> {
    try {
      const currentStage = plant.growthStage as GrowthStage;
      const stageConfig = GROWTH_STAGE_CONFIGS[currentStage];
      
      if (!stageConfig?.nextStage) {
        return null; // No next stage available
      }

      // Calculate days since last stage transition (simplified)
      const plantedDate = new Date(plant.plantedDate);
      const currentDate = new Date();
      const daysSincePlanted = Math.floor((currentDate.getTime() - plantedDate.getTime()) / (1000 * 60 * 60 * 24));

      // Get expected stage duration based on strain
      const strainConfig = await this.getStrainSchedulingConfig(plant);
      const expectedDuration = Math.floor(stageConfig.durationDays * (strainConfig.growthStageModifiers[currentStage] || 1));

      if (daysSincePlanted >= expectedDuration) {
        log.info(`[TaskAutomation] Plant ${plant.name} ready for transition from ${currentStage} to ${stageConfig.nextStage}`);
        return stageConfig.nextStage;
      }

      return null;
    } catch (error) {
      log.error(`[TaskAutomation] Error detecting growth stage transition:`, error);
      return null;
    }
  }

  /**
   * Private helper methods
   */

  private static async getStrainSchedulingConfig(plant: Plant): Promise<StrainSchedulingConfig> {
    try {
      // Try to get strain-specific configuration
      if (plant.strainId) {
        const strain = getStrainById(plant.strainId);
        if (strain && STRAIN_SCHEDULING_CONFIGS[strain.type]) {
          return STRAIN_SCHEDULING_CONFIGS[strain.type]!;
        }
      }

      // Fallback to cannabis type or unknown
      const cannabisType = plant.cannabisType?.toLowerCase() || 'unknown';
      return STRAIN_SCHEDULING_CONFIGS[cannabisType] || STRAIN_SCHEDULING_CONFIGS.unknown!;
    } catch (error) {
      log.error(`[TaskAutomation] Error getting strain config, using default:`, error);
      return STRAIN_SCHEDULING_CONFIGS.unknown!;
    }
  }

  private static calculateTaskFrequency(
    taskType: TaskType,
    strainConfig: StrainSchedulingConfig,
    growthStage: GrowthStage
  ): number {
    const baseFrequency = this.getBaseTaskFrequency(taskType, strainConfig);
    const stageModifier = strainConfig.growthStageModifiers[growthStage] || 1;
    
    return Math.max(1, Math.round(baseFrequency / stageModifier));
  }

  private static getBaseTaskFrequency(taskType: TaskType, strainConfig: StrainSchedulingConfig): number {
    switch (taskType) {
      case 'watering':
        return strainConfig.wateringFrequency;
      case 'feeding':
        return strainConfig.feedingFrequency;
      case 'inspection':
        return strainConfig.inspectionFrequency;
      case 'pruning':
        return 14; // Every 2 weeks
      case 'training':
        return 7; // Weekly
      case 'defoliation':
        return 21; // Every 3 weeks
      case 'flushing':
        return 14; // Every 2 weeks
      case 'harvest':
        return 70; // Once per cycle
      case 'transplant':
        return 30; // Monthly
      default:
        return 7; // Weekly default
    }
  }

  private static calculateTaskPriority(taskType: TaskType, growthStage: GrowthStage): 'low' | 'medium' | 'high' | 'critical' {
    const stageConfig = GROWTH_STAGE_CONFIGS[growthStage];
    return stageConfig?.taskPriorities[taskType] || 'medium';
  }

  private static getEstimatedDuration(taskType: TaskType): number {
    const durations: Record<TaskType, number> = {
      watering: 15,
      feeding: 30,
      inspection: 10,
      pruning: 45,
      training: 30,
      defoliation: 60,
      flushing: 20,
      harvest: 240,
      transplant: 90,
    };
    
    return durations[taskType] || 30;
  }

  private static generateTaskTitle(taskType: TaskType, plantName: string): string {
    const titles: Record<TaskType, string> = {
      watering: `Water ${plantName}`,
      feeding: `Feed ${plantName}`,
      inspection: `Inspect ${plantName}`,
      pruning: `Prune ${plantName}`,
      training: `Train ${plantName}`,
      defoliation: `Defoliate ${plantName}`,
      flushing: `Flush ${plantName}`,
      harvest: `Harvest ${plantName}`,
      transplant: `Transplant ${plantName}`,
    };
    
    return titles[taskType] || `Care for ${plantName}`;
  }

  private static generateTaskDescription(taskType: TaskType, growthStage: GrowthStage): string {
    const descriptions: Record<TaskType, Record<GrowthStage, string>> = {
      watering: {
        [GrowthStage.GERMINATION]: 'Keep soil moist but not waterlogged. Use spray bottle for gentle watering.',
        [GrowthStage.SEEDLING]: 'Water when top inch of soil is dry. Avoid overwatering young roots.',
        [GrowthStage.VEGETATIVE]: 'Water thoroughly when soil surface is dry. Check drainage.',
        [GrowthStage.PRE_FLOWER]: 'Maintain consistent watering schedule. Monitor for increased water needs.',
        [GrowthStage.FLOWERING]: 'Water when needed but avoid getting buds wet. Check soil moisture daily.',
        [GrowthStage.LATE_FLOWERING]: 'Reduce watering frequency. Allow slight drying between waterings.',
        [GrowthStage.HARVEST]: 'Stop watering before harvest to concentrate flavors.',
        [GrowthStage.CURING]: 'No watering needed during curing process.',
      },
      feeding: {
        [GrowthStage.GERMINATION]: 'No nutrients needed. Seeds contain enough energy for initial growth.',
        [GrowthStage.SEEDLING]: 'Light feeding with diluted nutrients. Start with 1/4 strength.',
        [GrowthStage.VEGETATIVE]: 'Regular feeding with nitrogen-rich nutrients. Follow feeding schedule.',
        [GrowthStage.PRE_FLOWER]: 'Transition to bloom nutrients. Reduce nitrogen, increase phosphorus.',
        [GrowthStage.FLOWERING]: 'Continue bloom nutrients. Monitor for deficiencies.',
        [GrowthStage.LATE_FLOWERING]: 'Reduce feeding frequency. Prepare for flush.',
        [GrowthStage.HARVEST]: 'Stop feeding. Focus on flushing remaining nutrients.',
        [GrowthStage.CURING]: 'No feeding needed during curing process.',
      },
      inspection: {
        [GrowthStage.GERMINATION]: 'Check for germination progress and proper moisture levels.',
        [GrowthStage.SEEDLING]: 'Monitor for healthy growth and check for pests or diseases.',
        [GrowthStage.VEGETATIVE]: 'Inspect leaves, stems, and overall plant health. Look for training opportunities.',
        [GrowthStage.PRE_FLOWER]: 'Check for pre-flowers and sex determination. Monitor for stretch.',
        [GrowthStage.FLOWERING]: 'Inspect buds for development and check for mold or pests.',
        [GrowthStage.LATE_FLOWERING]: 'Check trichomes for harvest readiness. Monitor bud density.',
        [GrowthStage.HARVEST]: 'Final inspection before harvest. Check trichome color.',
        [GrowthStage.CURING]: 'Monitor curing progress and check for proper moisture levels.',
      },
      pruning: {
        [GrowthStage.GERMINATION]: 'No pruning needed at this stage.',
        [GrowthStage.SEEDLING]: 'No pruning needed. Focus on healthy growth.',
        [GrowthStage.VEGETATIVE]: 'Prune lower branches and fan leaves to improve airflow and light penetration.',
        [GrowthStage.PRE_FLOWER]: 'Light pruning to shape plant. Remove lower growth that won\'t receive light.',
        [GrowthStage.FLOWERING]: 'Minimal pruning. Only remove dead or diseased material.',
        [GrowthStage.LATE_FLOWERING]: 'No pruning. Focus on harvest preparation.',
        [GrowthStage.HARVEST]: 'Harvest pruning - remove fan leaves and trim buds.',
        [GrowthStage.CURING]: 'Final trim if needed during curing process.',
      },
      training: {
        [GrowthStage.GERMINATION]: 'No training needed at this stage.',
        [GrowthStage.SEEDLING]: 'No training needed. Let plant establish.',
        [GrowthStage.VEGETATIVE]: 'LST, topping, or SCROG training to maximize yield.',
        [GrowthStage.PRE_FLOWER]: 'Final training adjustments before flowering stretch.',
        [GrowthStage.FLOWERING]: 'Support branches with stakes or ties as buds develop.',
        [GrowthStage.LATE_FLOWERING]: 'Support heavy branches to prevent breakage.',
        [GrowthStage.HARVEST]: 'Remove training equipment before harvest.',
        [GrowthStage.CURING]: 'No training needed during curing.',
      },
      defoliation: {
        [GrowthStage.GERMINATION]: 'No defoliation needed at this stage.',
        [GrowthStage.SEEDLING]: 'No defoliation needed. Preserve all leaves.',
        [GrowthStage.VEGETATIVE]: 'Strategic defoliation to improve light penetration.',
        [GrowthStage.PRE_FLOWER]: 'Major defoliation before flowering to expose bud sites.',
        [GrowthStage.FLOWERING]: 'Light defoliation of blocking fan leaves.',
        [GrowthStage.LATE_FLOWERING]: 'Remove yellowing leaves naturally dying off.',
        [GrowthStage.HARVEST]: 'Remove all fan leaves during harvest.',
        [GrowthStage.CURING]: 'No defoliation needed during curing.',
      },
      flushing: {
        [GrowthStage.GERMINATION]: 'No flushing needed at this stage.',
        [GrowthStage.SEEDLING]: 'No flushing needed. Light feeding only.',
        [GrowthStage.VEGETATIVE]: 'Occasional flush if nutrient buildup occurs.',
        [GrowthStage.PRE_FLOWER]: 'Flush before switching to bloom nutrients.',
        [GrowthStage.FLOWERING]: 'Mid-flower flush if needed to prevent lockout.',
        [GrowthStage.LATE_FLOWERING]: 'Final flush 1-2 weeks before harvest.',
        [GrowthStage.HARVEST]: 'Complete flush to improve flavor and quality.',
        [GrowthStage.CURING]: 'No flushing needed during curing.',
      },
      harvest: {
        [GrowthStage.GERMINATION]: 'No harvest at this stage.',
        [GrowthStage.SEEDLING]: 'No harvest at this stage.',
        [GrowthStage.VEGETATIVE]: 'No harvest at this stage.',
        [GrowthStage.PRE_FLOWER]: 'No harvest at this stage.',
        [GrowthStage.FLOWERING]: 'Monitor trichomes for harvest timing.',
        [GrowthStage.LATE_FLOWERING]: 'Check trichomes daily for optimal harvest window.',
        [GrowthStage.HARVEST]: 'Harvest when trichomes are cloudy with some amber.',
        [GrowthStage.CURING]: 'Harvest complete. Focus on proper curing.',
      },
      transplant: {
        [GrowthStage.GERMINATION]: 'Transplant seedlings to small pots when roots develop.',
        [GrowthStage.SEEDLING]: 'Transplant to larger containers when rootbound.',
        [GrowthStage.VEGETATIVE]: 'Final transplant to flowering containers.',
        [GrowthStage.PRE_FLOWER]: 'Avoid transplanting during transition.',
        [GrowthStage.FLOWERING]: 'Avoid transplanting during flowering.',
        [GrowthStage.LATE_FLOWERING]: 'No transplanting needed.',
        [GrowthStage.HARVEST]: 'No transplanting needed.',
        [GrowthStage.CURING]: 'No transplanting needed.',
      },
    };
    
    return descriptions[taskType]?.[growthStage] || `Perform ${taskType} task for plant in ${growthStage} stage.`;
  }

  private static calculateEnvironmentalAdjustments(
    taskType: TaskType,
    conditions: EnvironmentalConditions
  ): { rescheduleHours: number; newPriority?: 'low' | 'medium' | 'high' | 'critical' } {
    let rescheduleHours = 0;
    let newPriority: 'low' | 'medium' | 'high' | 'critical' | undefined;

    // Adjust watering based on humidity
    if (taskType === 'watering' && conditions.humidity !== undefined) {
      if (conditions.humidity > 70) {
        rescheduleHours = 12; // Delay watering in high humidity
      } else if (conditions.humidity < 40) {
        rescheduleHours = -6; // Water sooner in low humidity
        newPriority = 'high';
      }
    }

    // Adjust feeding based on pH
    if (taskType === 'feeding' && conditions.pH !== undefined) {
      if (conditions.pH < 5.5 || conditions.pH > 7.0) {
        newPriority = 'critical'; // pH adjustment needed before feeding
      }
    }

    // Adjust inspection based on temperature
    if (taskType === 'inspection' && conditions.temperature !== undefined) {
      if (conditions.temperature > 30 || conditions.temperature < 15) {
        rescheduleHours = -2; // Inspect sooner in extreme temperatures
        newPriority = 'high';
      }
    }

    return { rescheduleHours, newPriority };
  }

  /**
   * Get growth stage configurations for validation and testing
   */
  static getGrowthStageConfigs(): Record<GrowthStage, GrowthStageConfig> {
    return GROWTH_STAGE_CONFIGS;
  }

  /**
   * Get strain scheduling configurations for validation and testing
   */
  static getStrainSchedulingConfigs(): Record<string, StrainSchedulingConfig> {
    return STRAIN_SCHEDULING_CONFIGS;
  }

  // Task descriptions for validation and testing
  private static readonly TASK_DESCRIPTIONS: Record<TaskType, Record<GrowthStage, string>> = {
    watering: {
      [GrowthStage.GERMINATION]: 'Maintain consistent moisture for germination. Water lightly when top soil feels dry.',
      [GrowthStage.SEEDLING]: 'Water when top inch of soil is dry. Avoid overwatering young seedlings.',
      [GrowthStage.VEGETATIVE]: 'Water thoroughly when top 2-3 inches of soil are dry. Increase frequency as plant grows.',
      [GrowthStage.PRE_FLOWER]: 'Continue regular watering schedule. Monitor for signs of over/under watering.',
      [GrowthStage.FLOWERING]: 'Water when soil is dry 2-3 inches down. Reduce frequency slightly during flowering.',
      [GrowthStage.LATE_FLOWERING]: 'Reduce watering frequency. Allow soil to dry more between waterings.',
      [GrowthStage.HARVEST]: 'Stop watering 2-3 days before harvest to stress plant and improve resin production.',
      [GrowthStage.CURING]: 'No watering needed during curing process.',
    },
    feeding: {
      [GrowthStage.GERMINATION]: 'No feeding required during germination. Seed contains all necessary nutrients.',
      [GrowthStage.SEEDLING]: 'Begin light feeding with quarter-strength nutrients after first true leaves appear.',
      [GrowthStage.VEGETATIVE]: 'Increase to full-strength vegetative nutrients. Feed every 2-3 waterings.',
      [GrowthStage.PRE_FLOWER]: 'Transition to bloom nutrients. Reduce nitrogen, increase phosphorus and potassium.',
      [GrowthStage.FLOWERING]: 'Use full bloom nutrient schedule. Monitor for nutrient burn or deficiency.',
      [GrowthStage.LATE_FLOWERING]: 'Begin flushing with plain water 1-2 weeks before harvest.',
      [GrowthStage.HARVEST]: 'No feeding during harvest.',
      [GrowthStage.CURING]: 'No feeding needed during curing.',
    },
    inspection: {
      [GrowthStage.GERMINATION]: 'Daily visual inspection for sprouting and moisture levels.',
      [GrowthStage.SEEDLING]: 'Daily inspection for healthy growth, proper lighting, and pest signs.',
      [GrowthStage.VEGETATIVE]: 'Inspect every 2-3 days for pests, nutrient issues, and training opportunities.',
      [GrowthStage.PRE_FLOWER]: 'Daily inspection for sex determination and early flowering signs.',
      [GrowthStage.FLOWERING]: 'Daily inspection for bud development, pest issues, and environmental problems.',
      [GrowthStage.LATE_FLOWERING]: 'Inspect daily for harvest readiness - trichome color, pistil changes.',
      [GrowthStage.HARVEST]: 'Inspect plants for optimal harvest timing based on trichome development.',
      [GrowthStage.CURING]: 'Weekly inspection of curing jars for proper humidity and mold prevention.',
    },
    pruning: {
      [GrowthStage.GERMINATION]: 'No pruning during germination.',
      [GrowthStage.SEEDLING]: 'Remove any yellow or damaged leaves. Minimal pruning only.',
      [GrowthStage.VEGETATIVE]: 'Begin topping and training. Remove lower growth that will not receive light.',
      [GrowthStage.PRE_FLOWER]: 'Final pruning before flowering. Remove any remaining lower growth.',
      [GrowthStage.FLOWERING]: 'Minimal pruning - only remove dead or yellowing leaves.',
      [GrowthStage.LATE_FLOWERING]: 'No pruning during late flowering.',
      [GrowthStage.HARVEST]: 'No pruning during harvest.',
      [GrowthStage.CURING]: 'No pruning during curing.',
    },
    harvest: {
      [GrowthStage.GERMINATION]: 'Not applicable during germination.',
      [GrowthStage.SEEDLING]: 'Not applicable during seedling stage.',
      [GrowthStage.VEGETATIVE]: 'Not applicable during vegetative stage.',
      [GrowthStage.PRE_FLOWER]: 'Not applicable during pre-flower stage.',
      [GrowthStage.FLOWERING]: 'Monitor for harvest readiness - check trichomes weekly.',
      [GrowthStage.LATE_FLOWERING]: 'Prepare for harvest. Final checks on trichome development.',
      [GrowthStage.HARVEST]: 'Execute harvest when trichomes are mostly cloudy with some amber.',
      [GrowthStage.CURING]: 'Not applicable during curing.',
    },
    transplant: {
      [GrowthStage.GERMINATION]: 'Transplant seedlings to larger containers when true leaves appear.',
      [GrowthStage.SEEDLING]: 'Transplant to final container size when roots fill current container.',
      [GrowthStage.VEGETATIVE]: 'Final transplant to largest container before flowering begins.',
      [GrowthStage.PRE_FLOWER]: 'No transplanting during pre-flower - stress can affect flowering.',
      [GrowthStage.FLOWERING]: 'No transplanting during flowering - causes stress and yield loss.',
      [GrowthStage.LATE_FLOWERING]: 'No transplanting during late flowering.',
      [GrowthStage.HARVEST]: 'No transplanting during harvest.',
      [GrowthStage.CURING]: 'No transplanting during curing.',
    },
    training: {
      [GrowthStage.GERMINATION]: 'No training during germination.',
      [GrowthStage.SEEDLING]: 'Begin gentle LST (Low Stress Training) when plant has 3-4 nodes.',
      [GrowthStage.VEGETATIVE]: 'Intensive training period - topping, LST, SCROG setup.',
      [GrowthStage.PRE_FLOWER]: 'Final training adjustments before flowering stretch begins.',
      [GrowthStage.FLOWERING]: 'Minimal training - only gentle adjustments during early flowering.',
      [GrowthStage.LATE_FLOWERING]: 'No training during late flowering.',
      [GrowthStage.HARVEST]: 'No training during harvest.',
      [GrowthStage.CURING]: 'No training during curing.',
    },
    defoliation: {
      [GrowthStage.GERMINATION]: 'No defoliation during germination.',
      [GrowthStage.SEEDLING]: 'No defoliation during seedling stage.',
      [GrowthStage.VEGETATIVE]: 'Light defoliation to improve airflow and light penetration.',
      [GrowthStage.PRE_FLOWER]: 'Major defoliation session before flowering to open up canopy.',
      [GrowthStage.FLOWERING]: 'Selective defoliation during early flowering (day 21 and 42).',
      [GrowthStage.LATE_FLOWERING]: 'Minimal defoliation - only remove dead or yellowing leaves.',
      [GrowthStage.HARVEST]: 'No defoliation during harvest.',
      [GrowthStage.CURING]: 'No defoliation during curing.',
    },
    flushing: {
      [GrowthStage.GERMINATION]: 'No flushing during germination.',
      [GrowthStage.SEEDLING]: 'No flushing during seedling stage.',
      [GrowthStage.VEGETATIVE]: 'Flush only if showing nutrient toxicity signs.',
      [GrowthStage.PRE_FLOWER]: 'No flushing during pre-flower unless transitioning from synthetic nutrients.',
      [GrowthStage.FLOWERING]: 'Begin final flush 1-2 weeks before harvest with plain pH-balanced water.',
      [GrowthStage.LATE_FLOWERING]: 'Continue flushing process. Monitor runoff PPM levels.',
      [GrowthStage.HARVEST]: 'Complete final flush. Plants ready when runoff PPM is <50.',
      [GrowthStage.CURING]: 'No flushing during curing.',
    },
  };

  /**
   * Get task descriptions for validation and testing
   */
  static getTaskDescriptions(): Record<TaskType, Record<GrowthStage, string>> {
    return this.TASK_DESCRIPTIONS;
  }
}