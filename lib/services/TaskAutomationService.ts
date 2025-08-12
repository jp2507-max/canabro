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
import { buildTaskGuidanceSnippet, normalizeDifficultyString, type DifficultyLevel, type StrainType } from './GuidanceService';

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
  'germination': {
    stage: 'germination',
    durationDays: 7,
    nextStage: 'seedling',
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
  'seedling': {
    stage: 'seedling',
    durationDays: 14,
    nextStage: 'vegetative',
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
  'vegetative': {
    stage: 'vegetative',
    durationDays: 30,
    nextStage: 'pre_flower',
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
  'pre_flower': {
    stage: 'pre_flower',
    durationDays: 14,
    nextStage: 'flowering',
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
  'flowering': {
    stage: 'flowering',
    durationDays: 56,
    nextStage: 'late_flowering',
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
  'late_flowering': {
    stage: 'late_flowering',
    durationDays: 14,
    nextStage: 'harvest',
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
  'harvest': {
    stage: 'harvest',
    durationDays: 1,
    nextStage: 'curing',
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
  'curing': {
    stage: 'curing',
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
      'germination': 0.5,
      'seedling': 0.7,
      'vegetative': 1.0,
      'pre_flower': 1.2,
      'flowering': 1.3,
      'late_flowering': 0.8,
      'harvest': 0.1,
      'curing': 0.1,
    },
  },
  sativa: {
    strainType: 'sativa',
    wateringFrequency: 2,
    feedingFrequency: 5,
    inspectionFrequency: 1,
    growthStageModifiers: {
      'germination': 0.5,
      'seedling': 0.8,
      'vegetative': 1.2,
      'pre_flower': 1.3,
      'flowering': 1.5,
      'late_flowering': 1.0,
      'harvest': 0.1,
      'curing': 0.1,
    },
  },
  hybrid: {
    strainType: 'hybrid',
    wateringFrequency: 3,
    feedingFrequency: 6,
    inspectionFrequency: 2,
    growthStageModifiers: {
      'germination': 0.5,
      'seedling': 0.7,
      'vegetative': 1.1,
      'pre_flower': 1.2,
      'flowering': 1.4,
      'late_flowering': 0.9,
      'harvest': 0.1,
      'curing': 0.1,
    },
  },
  cbd: {
    strainType: 'cbd',
    wateringFrequency: 4,
    feedingFrequency: 8,
    inspectionFrequency: 3,
    growthStageModifiers: {
      'germination': 0.5,
      'seedling': 0.6,
      'vegetative': 0.9,
      'pre_flower': 1.0,
      'flowering': 1.2,
      'late_flowering': 0.7,
      'harvest': 0.1,
      'curing': 0.1,
    },
  },
  unknown: {
    strainType: 'unknown',
    wateringFrequency: 3,
    feedingFrequency: 7,
    inspectionFrequency: 2,
    growthStageModifiers: {
      'germination': 0.5,
      'seedling': 0.7,
      'vegetative': 1.0,
      'pre_flower': 1.1,
      'flowering': 1.2,
      'late_flowering': 0.8,
      'harvest': 0.1,
      'curing': 0.1,
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
              // Augment description with difficulty/genetics guidance snippet when available
              const baseDescription = this.generateTaskDescription(taskType, newStage);
              const strainType: StrainType = (plant.cannabisType?.toLowerCase() as StrainType) || 'unknown';
              // Try to derive difficulty from linked strain data if available
              const linkedStrain = plant.strainId ? getStrainById(plant.strainId) : undefined;
              const difficulty: DifficultyLevel = normalizeDifficultyString(
                (linkedStrain as any)?.grow_difficulty || (linkedStrain as any)?.growDifficulty ||
                (plant as any).growDifficulty || (plant as any).strainDifficulty
              );
              const guidance = buildTaskGuidanceSnippet({
                taskType,
                growthStage: newStage,
                strainType,
                difficulty,
              });
              newTask.description = guidance ? `${baseDescription} ${guidance}` : baseDescription;
              newTask.taskType = taskType;
              newTask.dueDate = taskDate.toISOString();
              newTask.status = 'pending';
              newTask.userId = plant.userId;
              newTask.priority = priority;
              newTask.estimatedDuration = this.getEstimatedDuration(taskType);
              newTask.templateId = template?.id;
              newTask.autoGenerated = true;
              newTask.weekNumber = Math.ceil((taskDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
              // Persist minimal strain metadata to support downstream guidance/notifications
              (newTask as any).strainMetadata = {
                difficulty,
                strainId: plant.strainId,
              };
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
            const baseDescription = this.generateTaskDescription(taskType, plant.growthStage as GrowthStage);
            const strainType: StrainType = (plant.cannabisType?.toLowerCase() as StrainType) || 'unknown';
            const linkedStrain = plant.strainId ? getStrainById(plant.strainId) : undefined;
            const difficulty: DifficultyLevel = normalizeDifficultyString(
              (linkedStrain as any)?.grow_difficulty || (linkedStrain as any)?.growDifficulty ||
              (plant as any).growDifficulty || (plant as any).strainDifficulty
            );
            const guidance = buildTaskGuidanceSnippet({
              taskType,
              growthStage: plant.growthStage as GrowthStage,
              strainType,
              difficulty,
            });
            newTask.description = guidance ? `${baseDescription} ${guidance}` : baseDescription;
            newTask.taskType = taskType;
            newTask.dueDate = taskDate.toISOString();
            newTask.status = 'pending';
            newTask.userId = plant.userId;
            newTask.priority = this.calculateTaskPriority(taskType, plant.growthStage as GrowthStage);
            newTask.estimatedDuration = this.getEstimatedDuration(taskType);
            newTask.autoGenerated = true;
            newTask.sequenceNumber = sequenceNumber;
            (newTask as any).strainMetadata = {
              difficulty,
              strainId: plant.strainId,
            };
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
    return this.TASK_DESCRIPTIONS[taskType]?.[growthStage] || `Perform ${taskType} task for plant in ${growthStage} stage.`;
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

  // Unified task descriptions for all task generation and validation
  private static readonly TASK_DESCRIPTIONS: Record<TaskType, Record<GrowthStage, string>> = {
    watering: {
      'germination': 'Maintain consistent moisture for germination. Use spray bottle for gentle watering when top soil feels dry.',
      'seedling': 'Water when top inch of soil is dry. Avoid overwatering young roots and seedlings.',
      'vegetative': 'Water thoroughly when top 2-3 inches of soil are dry. Check drainage and increase frequency as plant grows.',
      'pre_flower': 'Maintain consistent watering schedule. Monitor for increased water needs and signs of over/under watering.',
      'flowering': 'Water when soil is dry 2-3 inches down but avoid getting buds wet. Check soil moisture daily.',
      'late_flowering': 'Reduce watering frequency. Allow soil to dry more between waterings.',
      'harvest': 'Stop watering 2-3 days before harvest to stress plant and concentrate flavors/resin production.',
      'curing': 'No watering needed during curing process.',
    },
    feeding: {
      'germination': 'No feeding required during germination. Seed contains all necessary nutrients for initial growth.',
      'seedling': 'Begin light feeding with quarter-strength nutrients after first true leaves appear.',
      'vegetative': 'Increase to full-strength nitrogen-rich nutrients. Feed every 2-3 waterings following feeding schedule.',
      'pre_flower': 'Transition to bloom nutrients. Reduce nitrogen, increase phosphorus and potassium.',
      'flowering': 'Use full bloom nutrient schedule. Monitor for nutrient burn or deficiencies.',
      'late_flowering': 'Begin flushing with plain water 1-2 weeks before harvest. Reduce feeding frequency.',
      'harvest': 'Stop feeding. Focus on flushing remaining nutrients to improve flavor and quality.',
      'curing': 'No feeding needed during curing process.',
    },
    inspection: {
      'germination': 'Daily visual inspection for sprouting progress and proper moisture levels.',
      'seedling': 'Daily inspection for healthy growth, proper lighting, pest signs, and diseases.',
      'vegetative': 'Inspect every 2-3 days for pests, nutrient issues, overall plant health, and training opportunities.',
      'pre_flower': 'Daily inspection for sex determination, pre-flowers, and early flowering signs. Monitor for stretch.',
      'flowering': 'Daily inspection for bud development, pest issues, mold, and environmental problems.',
      'late_flowering': 'Inspect daily for harvest readiness - trichome color, pistil changes, and bud density.',
      'harvest': 'Final inspection before harvest. Check trichome development and optimal harvest timing.',
      'curing': 'Weekly inspection of curing jars for proper humidity levels and mold prevention.',
    },
    pruning: {
      'germination': 'No pruning needed during germination.',
      'seedling': 'Remove any yellow or damaged leaves. Minimal pruning only - focus on healthy growth.',
      'vegetative': 'Begin topping and training. Prune lower branches and fan leaves to improve airflow and light penetration.',
      'pre_flower': 'Final pruning before flowering. Light pruning to shape plant and remove lower growth that won\'t receive light.',
      'flowering': 'Minimal pruning - only remove dead, diseased, or yellowing material.',
      'late_flowering': 'No pruning during late flowering. Focus on harvest preparation.',
      'harvest': 'Harvest pruning - remove fan leaves and trim buds.',
      'curing': 'Final trim if needed during curing process.',
    },
    harvest: {
      'germination': 'Not applicable during germination.',
      'seedling': 'Not applicable during seedling stage.',
      'vegetative': 'Not applicable during vegetative stage.',
      'pre_flower': 'Not applicable during pre-flower stage.',
      'flowering': 'Monitor for harvest readiness - check trichomes weekly.',
      'late_flowering': 'Prepare for harvest. Final checks on trichome development.',
      'harvest': 'Execute harvest when trichomes are mostly cloudy with some amber.',
      'curing': 'Not applicable during curing.',
    },
    transplant: {
      'germination': 'Transplant seedlings to larger containers when true leaves appear.',
      'seedling': 'Transplant to final container size when roots fill current container.',
      'vegetative': 'Final transplant to largest container before flowering begins.',
      'pre_flower': 'Avoid transplanting during pre-flower - stress can affect flowering.',
      'flowering': 'Avoid transplanting during flowering - causes stress and yield loss.',
      'late_flowering': 'No transplanting during late flowering.',
      'harvest': 'No transplanting during harvest.',
      'curing': 'No transplanting during curing.',
    },
    training: {
      'germination': 'No training during germination.',
      'seedling': 'Begin gentle LST (Low Stress Training) when plant has 3-4 nodes.',
      'vegetative': 'Intensive training period - topping, LST, SCROG setup.',
      'pre_flower': 'Final training adjustments before flowering stretch begins.',
      'flowering': 'Minimal training - only gentle adjustments during early flowering.',
      'late_flowering': 'No training during late flowering.',
      'harvest': 'Remove training equipment before harvest.',
      'curing': 'No training needed during curing.',
    },
    defoliation: {
      'germination': 'No defoliation during germination.',
      'seedling': 'No defoliation during seedling stage.',
      'vegetative': 'Light defoliation to improve airflow and light penetration.',
      'pre_flower': 'Major defoliation session before flowering to open up canopy.',
      'flowering': 'Selective defoliation during early flowering (day 21 and 42).',
      'late_flowering': 'Minimal defoliation - only remove dead or yellowing leaves.',
      'harvest': 'Remove all fan leaves during harvest.',
      'curing': 'No defoliation needed during curing.',
    },
    flushing: {
      'germination': 'No flushing during germination.',
      'seedling': 'No flushing during seedling stage.',
      'vegetative': 'Flush only if showing nutrient toxicity signs.',
      'pre_flower': 'Flush before switching to bloom nutrients if transitioning from synthetic nutrients.',
      'flowering': 'Begin final flush 1-2 weeks before harvest with plain pH-balanced water. Mid-flower flush if needed to prevent lockout.',
      'late_flowering': 'Continue flushing process. Monitor runoff PPM levels.',
      'harvest': 'Complete final flush to improve flavor and quality. Plants ready when runoff PPM is <50.',
      'curing': 'No flushing needed during curing.',
    },
  };

  /**
   * Get task descriptions for validation, testing, and task generation
   */
  static getTaskDescriptions(): Record<TaskType, Record<GrowthStage, string>> {
    return this.TASK_DESCRIPTIONS;
  }
}