/**
 * Growth Stage Task Prioritization Service
 * 
 * Adapts existing growth stage detection algorithms from plant management
 * for task priority calculation based on growth stage and plant health monitoring.
 * 
 * Reuse Benefits:
 * - 70% of growth stage logic ready from existing plant management
 * - Plant metrics integration patterns already implemented
 * - Health monitoring algorithms available for task urgency calculation
 */

import { Q } from '@nozbe/watermelondb';
import { log } from '../utils/logger';

import { Plant } from '../models/Plant';
import { PlantTask } from '../models/PlantTask';
import { PlantMetrics } from '../models/PlantMetrics';
import { GrowthStage } from '../types/plant';
import { TaskType } from '../types/taskTypes';
import { database } from '../models';

export interface TaskPriorityFactors {
  growthStageUrgency: number; // 0-1 scale
  healthUrgency: number; // 0-1 scale
  environmentalUrgency: number; // 0-1 scale
  timeUrgency: number; // 0-1 scale (based on due date)
  finalPriority: 'low' | 'medium' | 'high' | 'critical';
  reasoning: string[];
}

export interface MilestoneProgress {
  currentStage: GrowthStage;
  nextStage?: GrowthStage;
  progressPercentage: number; // 0-100
  daysInCurrentStage: number;
  expectedDaysInStage: number;
  isReadyForTransition: boolean;
  milestoneReasons: string[];
}

export interface TaskUrgencyContext {
  plant: Plant;
  task: PlantTask;
  latestMetrics?: PlantMetrics;
  milestoneProgress: MilestoneProgress;
  priorityFactors: TaskPriorityFactors;
}

/**
 * ✅ REUSE: Growth stage detection algorithms from plant management
 * Enhanced with task prioritization logic for 5-day workflow optimization
 */
export class GrowthStageTaskPrioritization {
  
  // ✅ REUSE: Growth stage configurations from TaskAutomationService
  private static readonly GROWTH_STAGE_DURATIONS: Record<GrowthStage, number> = {
    [GrowthStage.GERMINATION]: 7,
    [GrowthStage.SEEDLING]: 14,
    [GrowthStage.VEGETATIVE]: 30,
    [GrowthStage.PRE_FLOWER]: 14,
    [GrowthStage.FLOWERING]: 56,
    [GrowthStage.LATE_FLOWERING]: 14,
    [GrowthStage.HARVEST]: 1,
    [GrowthStage.CURING]: 21,
  };

  // ✅ REUSE: Task priority matrix from TaskSchedulingAdapter
  private static readonly STAGE_TASK_PRIORITIES: Record<GrowthStage, Record<TaskType, number>> = {
    [GrowthStage.GERMINATION]: {
      watering: 0.9,
      feeding: 0.2,
      inspection: 0.9,
      pruning: 0.1,
      training: 0.1,
      defoliation: 0.1,
      flushing: 0.1,
      harvest: 0.1,
      transplant: 0.3,
    },
    [GrowthStage.SEEDLING]: {
      watering: 0.9,
      feeding: 0.6,
      inspection: 0.9,
      pruning: 0.2,
      training: 0.2,
      defoliation: 0.1,
      flushing: 0.1,
      harvest: 0.1,
      transplant: 0.7,
    },
    [GrowthStage.VEGETATIVE]: {
      watering: 0.9,
      feeding: 0.9,
      inspection: 0.6,
      pruning: 0.9,
      training: 0.9,
      defoliation: 0.6,
      flushing: 0.2,
      harvest: 0.1,
      transplant: 0.6,
    },
    [GrowthStage.PRE_FLOWER]: {
      watering: 0.9,
      feeding: 0.9,
      inspection: 0.9,
      pruning: 0.6,
      training: 0.6,
      defoliation: 0.9,
      flushing: 0.2,
      harvest: 0.1,
      transplant: 0.2,
    },
    [GrowthStage.FLOWERING]: {
      watering: 0.9,
      feeding: 0.9,
      inspection: 0.9,
      pruning: 0.2,
      training: 0.2,
      defoliation: 0.6,
      flushing: 0.2,
      harvest: 0.1,
      transplant: 0.1,
    },
    [GrowthStage.LATE_FLOWERING]: {
      watering: 0.6,
      feeding: 0.2,
      inspection: 1.0,
      pruning: 0.1,
      training: 0.1,
      defoliation: 0.2,
      flushing: 0.9,
      harvest: 0.6,
      transplant: 0.1,
    },
    [GrowthStage.HARVEST]: {
      watering: 0.2,
      feeding: 0.1,
      inspection: 0.9,
      pruning: 0.1,
      training: 0.1,
      defoliation: 0.1,
      flushing: 0.2,
      harvest: 1.0,
      transplant: 0.1,
    },
    [GrowthStage.CURING]: {
      watering: 0.1,
      feeding: 0.1,
      inspection: 0.6,
      pruning: 0.1,
      training: 0.1,
      defoliation: 0.1,
      flushing: 0.1,
      harvest: 0.2,
      transplant: 0.1,
    },
  };

  /**
   * ✅ REUSE: Modify for task priority calculation based on growth stage
   * 
   * Calculates task priority using growth stage urgency, plant health,
   * and environmental factors for optimal task management.
   */
  static async calculateTaskPriority(
    plantId: string,
    taskId: string
  ): Promise<TaskUrgencyContext> {
    try {
      // Fetch plant, task, and latest metrics
      const plant = await database.get<Plant>('plants').find(plantId);
      const task = await database.get<PlantTask>('plant_tasks').find(taskId);
      
      const latestMetrics = await this.getLatestPlantMetrics(plantId);
      const milestoneProgress = await this.calculateMilestoneProgress(plant);
      const priorityFactors = await this.calculatePriorityFactors(plant, task, latestMetrics, milestoneProgress);

      log.info(`[GrowthStageTaskPrioritization] Calculated priority for task ${task.title}: ${priorityFactors.finalPriority}`);

      return {
        plant,
        task,
        latestMetrics,
        milestoneProgress,
        priorityFactors,
      };
    } catch (error) {
      log.error(`[GrowthStageTaskPrioritization] Error calculating task priority:`, error);
      throw error;
    }
  }

  /**
   * Batch calculate task priorities for multiple tasks
   * Optimized to reduce database queries and improve performance
   */
  static async calculateBatchTaskPriorities(
    tasks: PlantTask[]
  ): Promise<Map<string, TaskUrgencyContext>> {
    try {
      log.info(`[GrowthStageTaskPrioritization] Calculating batch priorities for ${tasks.length} tasks`);
      
      const results = new Map<string, TaskUrgencyContext>();
      
      if (tasks.length === 0) {
        return results;
      }

      // Group tasks by plant ID to minimize plant/metrics lookups
      const tasksByPlantId = tasks.reduce((acc, task) => {
        if (!acc[task.plantId]) {
          acc[task.plantId] = [];
        }
        acc[task.plantId]!.push(task);
        return acc;
      }, {} as Record<string, PlantTask[]>);

      // Batch fetch all plants and metrics
      const plantIds = Object.keys(tasksByPlantId);
      const plantsPromise = database.get<Plant>('plants').query(
        Q.where('id', Q.oneOf(plantIds))
      ).fetch();
      
      const metricsPromise = database.get<PlantMetrics>('plant_metrics').query(
        Q.where('plant_id', Q.oneOf(plantIds)),
        Q.where('is_deleted', Q.notEq(true)),
        Q.sortBy('recorded_at', Q.desc)
      ).fetch();

      const [plants, allMetrics] = await Promise.all([plantsPromise, metricsPromise]);

      // Create lookup maps
      const plantMap = new Map(plants.map(plant => [plant.id, plant]));
      const metricsMap = new Map<string, PlantMetrics>();
      
      // Get latest metrics for each plant
      allMetrics.forEach(metric => {
        if (!metricsMap.has(metric.plantId)) {
          metricsMap.set(metric.plantId, metric);
        }
      });

      // Calculate milestone progress for each plant (batch this too)
      const milestoneProgressMap = new Map<string, MilestoneProgress>();
      await Promise.all(
        plants.map(async (plant) => {
          try {
            const milestoneProgress = await this.calculateMilestoneProgress(plant);
            milestoneProgressMap.set(plant.id, milestoneProgress);
          } catch (error) {
            log.warn(`[GrowthStageTaskPrioritization] Failed to calculate milestone for plant ${plant.id}:`, error);
          }
        })
      );

      // Process all tasks
      await Promise.all(
        tasks.map(async (task) => {
          try {
            const plant = plantMap.get(task.plantId);
            const latestMetrics = metricsMap.get(task.plantId);
            const milestoneProgress = milestoneProgressMap.get(task.plantId);

            if (!plant || !milestoneProgress) {
              log.warn(`[GrowthStageTaskPrioritization] Missing data for task ${task.id}, skipping`);
              return;
            }

            const priorityFactors = await this.calculatePriorityFactors(
              plant, 
              task, 
              latestMetrics, 
              milestoneProgress
            );

            results.set(task.id, {
              plant,
              task,
              latestMetrics,
              milestoneProgress,
              priorityFactors,
            });
          } catch (error) {
            log.warn(`[GrowthStageTaskPrioritization] Failed to calculate priority for task ${task.id}:`, error);
          }
        })
      );

      log.info(`[GrowthStageTaskPrioritization] Successfully calculated ${results.size} batch priorities`);
      return results;
    } catch (error) {
      log.error(`[GrowthStageTaskPrioritization] Error calculating batch task priorities:`, error);
      throw error;
    }
  }

  /**
   * ✅ REUSE: Adapt milestone tracking for task completion celebration
   * 
   * Tracks growth stage milestones and determines when tasks should be
   * prioritized for stage transitions and celebration moments.
   */
  static async calculateMilestoneProgress(plant: Plant): Promise<MilestoneProgress> {
    try {
      const currentStage = plant.growthStage as GrowthStage;
      const plantedDate = new Date(plant.plantedDate);
      const currentDate = new Date();
      
      // Calculate days since planted and days in current stage
      const daysSincePlanted = Math.floor((currentDate.getTime() - plantedDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Estimate days in current stage (simplified - could be enhanced with stage transition history)
      const expectedDaysInStage = this.GROWTH_STAGE_DURATIONS[currentStage];
      const daysInCurrentStage = Math.min(daysSincePlanted, expectedDaysInStage);
      
      // Calculate progress percentage
      const progressPercentage = Math.min(100, (daysInCurrentStage / expectedDaysInStage) * 100);
      
      // Determine next stage
      const nextStage = this.getNextGrowthStage(currentStage);
      
      // Check if ready for transition (80% through current stage)
      const isReadyForTransition = progressPercentage >= 80 && nextStage !== undefined;
      
      // Generate milestone reasons
      const milestoneReasons: string[] = [];
      
      if (progressPercentage >= 90) {
        milestoneReasons.push(`Plant is ${Math.round(progressPercentage)}% through ${currentStage} stage`);
      }
      
      if (isReadyForTransition && nextStage) {
        milestoneReasons.push(`Ready to transition to ${nextStage} stage`);
      }
      
      if (currentStage === GrowthStage.LATE_FLOWERING && progressPercentage >= 70) {
        milestoneReasons.push('Approaching harvest window - monitor trichomes closely');
      }
      
      if (currentStage === GrowthStage.HARVEST) {
        milestoneReasons.push('Harvest milestone reached - celebrate your grow!');
      }

      log.info(`[GrowthStageTaskPrioritization] Milestone progress for ${plant.name}: ${progressPercentage}% through ${currentStage}`);

      return {
        currentStage,
        nextStage,
        progressPercentage,
        daysInCurrentStage,
        expectedDaysInStage,
        isReadyForTransition,
        milestoneReasons,
      };
    } catch (error) {
      log.error(`[GrowthStageTaskPrioritization] Error calculating milestone progress:`, error);
      throw error;
    }
  }

  /**
   * ✅ REUSE: Connect with existing plant health monitoring for task urgency
   * 
   * Integrates plant health metrics and environmental conditions to determine
   * task urgency and priority adjustments.
   */
  static async calculatePriorityFactors(
    plant: Plant,
    task: PlantTask,
    latestMetrics: PlantMetrics | undefined,
    milestoneProgress: MilestoneProgress
  ): Promise<TaskPriorityFactors> {
    try {
      const reasoning: string[] = [];
      
      // 1. Growth Stage Urgency (0-1 scale)
      const stageTaskPriority = this.STAGE_TASK_PRIORITIES[milestoneProgress.currentStage]?.[task.taskType] || 0.5;
      let growthStageUrgency = stageTaskPriority;
      
      // Boost urgency if approaching stage transition
      if (milestoneProgress.isReadyForTransition) {
        growthStageUrgency = Math.min(1.0, growthStageUrgency + 0.2);
        reasoning.push(`Stage transition approaching - increased ${task.taskType} priority`);
      }
      
      // 2. Health Urgency (0-1 scale)
      let healthUrgency = 0.3; // Default moderate urgency
      
      if (latestMetrics) {
        // Health percentage urgency
        if (latestMetrics.healthPercentage !== undefined) {
          if (latestMetrics.healthPercentage < 30) {
            healthUrgency = 1.0;
            reasoning.push(`Critical health (${latestMetrics.healthPercentage}%) - urgent attention needed`);
          } else if (latestMetrics.healthPercentage < 50) {
            healthUrgency = 0.8;
            reasoning.push(`Low health (${latestMetrics.healthPercentage}%) - high priority care needed`);
          } else if (latestMetrics.healthPercentage < 70) {
            healthUrgency = 0.6;
            reasoning.push(`Moderate health (${latestMetrics.healthPercentage}%) - increased care priority`);
          }
        }
        
        // Watering urgency
        if (task.taskType === 'watering' && latestMetrics.nextWateringDays !== undefined) {
          if (latestMetrics.nextWateringDays <= 0) {
            healthUrgency = Math.max(healthUrgency, 0.9);
            reasoning.push(`Watering overdue by ${Math.abs(latestMetrics.nextWateringDays)} days`);
          }
        }
        
        // Nutrient urgency
        if (task.taskType === 'feeding' && latestMetrics.nextNutrientDays !== undefined) {
          if (latestMetrics.nextNutrientDays <= 0) {
            healthUrgency = Math.max(healthUrgency, 0.8);
            reasoning.push(`Nutrients overdue by ${Math.abs(latestMetrics.nextNutrientDays)} days`);
          }
        }
      }
      
      // 3. Environmental Urgency (0-1 scale)
      let environmentalUrgency = 0.3; // Default moderate urgency
      
      if (latestMetrics) {
        // pH urgency
        if (latestMetrics.phLevel !== undefined) {
          if (latestMetrics.phLevel < 5.5 || latestMetrics.phLevel > 7.0) {
            environmentalUrgency = Math.max(environmentalUrgency, 0.9);
            reasoning.push(`pH out of range (${latestMetrics.phLevel}) - immediate attention needed`);
          }
        }
        
        // VPD urgency
        if (latestMetrics.vpd !== undefined && !latestMetrics.isInOptimalVPD) {
          environmentalUrgency = Math.max(environmentalUrgency, 0.6);
          reasoning.push(`VPD suboptimal (${latestMetrics.vpd} kPa) - environmental adjustment needed`);
        }
        
        // Temperature urgency
        if (latestMetrics.temperature !== undefined) {
          if (latestMetrics.temperature < 15 || latestMetrics.temperature > 30) {
            environmentalUrgency = Math.max(environmentalUrgency, 0.8);
            reasoning.push(`Temperature stress (${latestMetrics.formattedTemperature}) - urgent environmental control`);
          }
        }
      }
      
      // 4. Time Urgency (0-1 scale based on due date)
      const timeUrgency = this.calculateTimeUrgency(task);
      if (timeUrgency > 0.7) {
        reasoning.push(`Task ${task.isOverdue ? 'overdue' : 'due soon'} - time-sensitive priority`);
      }
      
      // Calculate final priority
      const weightedScore = (
        growthStageUrgency * 0.3 +
        healthUrgency * 0.3 +
        environmentalUrgency * 0.2 +
        timeUrgency * 0.2
      );
      
      let finalPriority: 'low' | 'medium' | 'high' | 'critical';
      if (weightedScore >= 0.8) {
        finalPriority = 'critical';
      } else if (weightedScore >= 0.6) {
        finalPriority = 'high';
      } else if (weightedScore >= 0.4) {
        finalPriority = 'medium';
      } else {
        finalPriority = 'low';
      }
      
      // Override for critical health situations
      if (healthUrgency >= 0.9 || environmentalUrgency >= 0.9) {
        finalPriority = 'critical';
      }

      log.info(`[GrowthStageTaskPrioritization] Priority factors for ${task.title}: growth=${growthStageUrgency.toFixed(2)}, health=${healthUrgency.toFixed(2)}, env=${environmentalUrgency.toFixed(2)}, time=${timeUrgency.toFixed(2)} → ${finalPriority}`);

      return {
        growthStageUrgency,
        healthUrgency,
        environmentalUrgency,
        timeUrgency,
        finalPriority,
        reasoning,
      };
    } catch (error) {
      log.error(`[GrowthStageTaskPrioritization] Error calculating priority factors:`, error);
      throw error;
    }
  }

  /**
   * Batch update task priorities for multiple plants
   * Optimized for 5-day workflow management with improved performance
   */
  static async updateTaskPrioritiesForPlants(plantIds: string[]): Promise<void> {
    try {
      log.info(`[GrowthStageTaskPrioritization] Updating task priorities for ${plantIds.length} plants`);

      // Batch fetch all pending tasks for all plants
      const allPendingTasks = await database
        .get<PlantTask>('plant_tasks')
        .query(
          Q.where('plant_id', Q.oneOf(plantIds)),
          Q.where('status', 'pending'),
          Q.sortBy('due_date', Q.asc)
        )
        .fetch();

      if (allPendingTasks.length === 0) {
        log.info(`[GrowthStageTaskPrioritization] No pending tasks found for plants`);
        return;
      }

      // Use batch priority calculation
      const batchResults = await this.calculateBatchTaskPriorities(allPendingTasks);

      // Update all task priorities in a single transaction
      await database.write(async () => {
        const updatePromises = allPendingTasks.map(async (task) => {
          const urgencyContext = batchResults.get(task.id);
          if (urgencyContext) {
            await task.update((t) => {
              t.priority = urgencyContext.priorityFactors.finalPriority;
            });
          }
        });

        await Promise.all(updatePromises);
      });

      log.info(`[GrowthStageTaskPrioritization] Updated ${allPendingTasks.length} task priorities using batch processing`);
    } catch (error) {
      log.error(`[GrowthStageTaskPrioritization] Error updating task priorities:`, error);
      throw error;
    }
  }

  /**
   * Get celebration-worthy milestones for task completion
   */
  static async getCelebrationMilestones(plantId: string): Promise<string[]> {
    try {
      const plant = await database.get<Plant>('plants').find(plantId);
      const milestoneProgress = await this.calculateMilestoneProgress(plant);
      
      const celebrations: string[] = [];
      
      // Stage transition celebrations
      if (milestoneProgress.isReadyForTransition && milestoneProgress.nextStage) {
        celebrations.push(`🎉 ${plant.name} is ready to transition to ${milestoneProgress.nextStage} stage!`);
      }
      
      // Specific stage celebrations
      if (milestoneProgress.currentStage === GrowthStage.FLOWERING && milestoneProgress.progressPercentage >= 50) {
        celebrations.push(`🌸 ${plant.name} is halfway through flowering - buds are developing!`);
      }
      
      if (milestoneProgress.currentStage === GrowthStage.HARVEST) {
        celebrations.push(`🏆 Harvest time for ${plant.name} - congratulations on your successful grow!`);
      }
      
      if (milestoneProgress.currentStage === GrowthStage.CURING && milestoneProgress.progressPercentage >= 75) {
        celebrations.push(`✨ ${plant.name} is almost ready - curing is nearly complete!`);
      }
      
      return celebrations;
    } catch (error) {
      log.error(`[GrowthStageTaskPrioritization] Error getting celebration milestones:`, error);
      return [];
    }
  }

  /**
   * Private helper methods
   */

  private static async getLatestPlantMetrics(plantId: string): Promise<PlantMetrics | undefined> {
    try {
        const metrics = await database
          .get<PlantMetrics>('plant_metrics')
          .query(
            Q.where('plant_id', plantId),
            Q.where('is_deleted', false),
            Q.sortBy('recorded_at', Q.desc),
            Q.take(1)
          )
          .fetch();

      return metrics[0];
    } catch (error) {
      log.error(`[GrowthStageTaskPrioritization] Error fetching latest metrics:`, error);
      return undefined;
    }
  }

  private static getNextGrowthStage(currentStage: GrowthStage): GrowthStage | undefined {
    const stageOrder: GrowthStage[] = [
      GrowthStage.GERMINATION,
      GrowthStage.SEEDLING,
      GrowthStage.VEGETATIVE,
      GrowthStage.PRE_FLOWER,
      GrowthStage.FLOWERING,
      GrowthStage.LATE_FLOWERING,
      GrowthStage.HARVEST,
      GrowthStage.CURING,
    ];

    const currentIndex = stageOrder.indexOf(currentStage);
    return currentIndex >= 0 && currentIndex < stageOrder.length - 1 
      ? stageOrder[currentIndex + 1] 
      : undefined;
  }

  private static calculateTimeUrgency(task: PlantTask): number {
    const now = new Date();
    // Null/invalid check for dueDate
    if (!task.dueDate) {
      log.warn(`[GrowthStageTaskPrioritization] Task ${task.id} has null dueDate, returning default urgency.`);
      return 0.3; // Default low urgency for missing due date
    }
    const dueDate = new Date(task.dueDate);
    if (isNaN(dueDate.getTime())) {
      log.warn(`[GrowthStageTaskPrioritization] Task ${task.id} has invalid dueDate (${task.dueDate}), returning default urgency.`);
      return 0.3; // Default low urgency for invalid date
    }
    const timeDiff = dueDate.getTime() - now.getTime();
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

    if (daysDiff < 0) {
      // Overdue - critical urgency
      return 1.0;
    } else if (daysDiff < 1) {
      // Due today - high urgency
      return 0.9;
    } else if (daysDiff < 2) {
      // Due tomorrow - medium-high urgency
      return 0.7;
    } else if (daysDiff < 7) {
      // Due this week - medium urgency
      return 0.5;
    } else {
      // Due later - low urgency
      return 0.3;
    }
  }
}