/**
 * Growth Stage Integration Service
 * 
 * Comprehensive service that integrates growth stage detection, task prioritization,
 * milestone tracking, and plant health monitoring for the advanced calendar system.
 * 
 * This service acts as the main orchestrator for task 4.3 requirements:
 * - ✅ REUSE: Growth stage detection algorithms from plant management
 * - ✅ REUSE: Plant metrics integration patterns
 * - Modify for task priority calculation based on growth stage
 * - Adapt milestone tracking for task completion celebration
 * - Connect with existing plant health monitoring for task urgency
 */

import { Q } from '@nozbe/watermelondb';
import { log } from '../utils/logger';
import { addDays } from '../utils/date';

import { Plant } from '../models/Plant';
import { PlantTask } from '../models/PlantTask';
import { PlantMetrics } from '../models/PlantMetrics';
import { GrowthStage } from '../types/plant';
import { TaskType } from '../types/taskTypes';
import { database } from '../models';

import { TaskAutomationService } from './TaskAutomationService';
import { GrowthStageTaskPrioritization, TaskUrgencyContext, MilestoneProgress } from './GrowthStageTaskPrioritization';
import { TaskSchedulingAdapter } from './TaskSchedulingAdapter';

export interface GrowthStageTransition {
  plantId: string;
  plantName: string;
  oldStage: GrowthStage;
  newStage: GrowthStage;
  transitionDate: Date;
  triggeredTasks: PlantTask[];
  celebrationMessage: string;
}

export interface PlantHealthAlert {
  plantId: string;
  plantName: string;
  alertType: 'critical' | 'warning' | 'info';
  message: string;
  urgentTasks: PlantTask[];
  recommendedActions: string[];
}

export interface TaskPriorityUpdate {
  taskId: string;
  oldPriority: 'low' | 'medium' | 'high' | 'critical';
  newPriority: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  urgencyFactors: string[];
}

/**
 * Main integration service for growth stage-based task management
 */
export class GrowthStageIntegrationService {
  
  /**
   * ✅ REUSE: Growth stage detection algorithms from plant management
   * 
   * Monitors all plants for growth stage transitions and automatically
   * updates task priorities and schedules when transitions occur.
   */
  static async monitorGrowthStageTransitions(): Promise<GrowthStageTransition[]> {
    try {
      log.info('[GrowthStageIntegration] Starting growth stage transition monitoring');

      const transitions: GrowthStageTransition[] = [];
      
      // Get all active plants
      const activePlants = await database
        .get<Plant>('plants')
        .query(
          Q.where('is_deleted', Q.notEq(true))
        )
        .fetch();

      for (const plant of activePlants) {
        try {
          const currentStage = plant.growthStage as GrowthStage;
          
          // Check if plant is ready for stage transition
          const nextStage = await TaskAutomationService.detectGrowthStageTransition(plant);
          
          if (nextStage && nextStage !== currentStage) {
            log.info(`[GrowthStageIntegration] Plant ${plant.name} ready for transition: ${currentStage} → ${nextStage}`);
            
            // Update plant growth stage within a database transaction
            await plant.database.write(async () => {
              await plant.updateGrowthStage(nextStage);
            });
            
            // Update existing task priorities for the new stage
            await TaskSchedulingAdapter.updateTasksForGrowthStageChange(plant, currentStage, nextStage);
            
            // Generate new stage-appropriate tasks
            const newTasks = await TaskAutomationService.scheduleForGrowthStage(plant, nextStage);
            
            // Get celebration message
            const celebrations = await GrowthStageTaskPrioritization.getCelebrationMilestones(plant.id);
            const celebrationMessage = celebrations.length > 0 && celebrations[0]
              ? celebrations[0] 
              : `🌱 ${plant.name} has progressed to ${nextStage} stage!`;
            
            transitions.push({
              plantId: plant.id,
              plantName: plant.name,
              oldStage: currentStage,
              newStage: nextStage,
              transitionDate: new Date(),
              triggeredTasks: newTasks,
              celebrationMessage,
            });
          }
        } catch (error) {
          log.error(`[GrowthStageIntegration] Error processing plant ${plant.name} (${plant.id}):`, error);
          // Continue processing other plants - don't stop the loop
        }
      }

      log.info(`[GrowthStageIntegration] Processed ${transitions.length} growth stage transitions`);
      return transitions;
    } catch (error) {
      log.error('[GrowthStageIntegration] Error monitoring growth stage transitions:', error);
      return [];
    }
  }

  /**
   * ✅ REUSE: Plant metrics integration patterns
   * 
   * Analyzes plant health metrics to generate alerts and adjust task priorities
   * based on plant health conditions and environmental factors.
   */
  static async analyzePlantHealthForTaskUrgency(plantIds?: string[]): Promise<PlantHealthAlert[]> {
    try {
      log.info('[GrowthStageIntegration] Analyzing plant health for task urgency');

      const alerts: PlantHealthAlert[] = [];
      
      // Get plants to analyze
      let plantsQuery = database.get<Plant>('plants').query(Q.where('is_deleted', Q.notEq(true)));
      
      if (plantIds && plantIds.length > 0) {
        plantsQuery = plantsQuery.extend(Q.where('id', Q.oneOf(plantIds)));
      }
      
      const plants = await plantsQuery.fetch();

      for (const plant of plants) {
        // Get latest metrics for the plant
        const latestMetrics = await database
          .get<PlantMetrics>('plant_metrics')
          .query(
            Q.where('plant_id', plant.id),
            Q.where('is_deleted', Q.notEq(true)),
            Q.sortBy('recorded_at', Q.desc),
            Q.take(1)
          )
          .fetch();

        const metrics = latestMetrics[0];
        if (!metrics) continue;

        // Analyze health conditions
        const healthAlerts = this.analyzeHealthMetrics(plant, metrics);
        alerts.push(...healthAlerts);
      }

      log.info(`[GrowthStageIntegration] Generated ${alerts.length} plant health alerts`);
      return alerts;
    } catch (error) {
      log.error('[GrowthStageIntegration] Error analyzing plant health:', error);
      return [];
    }
  }

  /**
   * Modify for task priority calculation based on growth stage
   * 
   * Updates task priorities for all pending tasks based on current growth stage,
   * plant health, and environmental conditions.
   */
  static async updateAllTaskPriorities(): Promise<TaskPriorityUpdate[]> {
    try {
      log.info('[GrowthStageIntegration] Updating all task priorities based on growth stage');

      const updates: TaskPriorityUpdate[] = [];
      
      // Get all pending tasks
      const pendingTasks = await database
        .get<PlantTask>('plant_tasks')
        .query(
          Q.where('status', 'pending'),
          Q.sortBy('due_date', Q.asc)
        )
        .fetch();

      for (const task of pendingTasks) {
        const oldPriority = task.priorityLevel;
        
        try {
          // Calculate new priority using growth stage integration
          const urgencyContext = await GrowthStageTaskPrioritization.calculateTaskPriority(
            task.plantId,
            task.id
          );

          const newPriority = urgencyContext.priorityFactors.finalPriority;

          // Update task if priority changed
          if (newPriority !== oldPriority) {
            await database.write(async () => {
              await task.updatePriority(newPriority);
            });

            updates.push({
              taskId: task.id,
              oldPriority,
              newPriority,
              reason: `Growth stage-based priority update`,
              urgencyFactors: urgencyContext.priorityFactors.reasoning,
            });
          }
        } catch (error) {
          log.warn(`[GrowthStageIntegration] Failed to update priority for task ${task.id}:`, error);
        }
      }

      log.info(`[GrowthStageIntegration] Updated ${updates.length} task priorities`);
      return updates;
    } catch (error) {
      log.error('[GrowthStageIntegration] Error updating task priorities:', error);
      return [];
    }
  }

  /**
   * Adapt milestone tracking for task completion celebration
   * 
   * Tracks milestone achievements and generates celebration messages
   * when significant growth stages or task completions occur.
   */
  static async trackMilestoneAchievements(plantIds?: string[]): Promise<string[]> {
    try {
      log.info('[GrowthStageIntegration] Tracking milestone achievements');

      const celebrations: string[] = [];
      
      // Get plants to check
      let plantsQuery = database.get<Plant>('plants').query(Q.where('is_deleted', Q.notEq(true)));
      
      if (plantIds && plantIds.length > 0) {
        plantsQuery = plantsQuery.extend(Q.where('id', Q.oneOf(plantIds)));
      }
      
      const plants = await plantsQuery.fetch();

      for (const plant of plants) {
        // Get milestone progress
        const milestoneProgress = await GrowthStageTaskPrioritization.calculateMilestoneProgress(plant);
        
        // Check for celebration-worthy milestones
        const plantCelebrations = await this.generateMilestoneCelebrations(plant, milestoneProgress);
        celebrations.push(...plantCelebrations);
        
        // Check for task completion milestones
        const taskCelebrations = await this.generateTaskCompletionCelebrations(plant.id);
        celebrations.push(...taskCelebrations);
      }

      log.info(`[GrowthStageIntegration] Generated ${celebrations.length} milestone celebrations`);
      return celebrations;
    } catch (error) {
      log.error('[GrowthStageIntegration] Error tracking milestone achievements:', error);
      return [];
    }
  }

  /**
   * Connect with existing plant health monitoring for task urgency
   * 
   * Integrates plant health monitoring data to automatically adjust
   * task urgency and create emergency tasks when needed.
   */
  static async createEmergencyTasksFromHealthAlerts(alerts: PlantHealthAlert[]): Promise<PlantTask[]> {
    try {
      log.info('[GrowthStageIntegration] Creating emergency tasks from health alerts');

      const emergencyTasks: PlantTask[] = [];
      
      for (const alert of alerts) {
        if (alert.alertType === 'critical') {
          // Create emergency inspection task
          // Retrieve userId from plant's user relationship
          const plant = await database.get<Plant>('plants').find(alert.plantId);
          const userId = plant.userId;
          const emergencyTask = await database.write(async () => {
            return await database.get<PlantTask>('plant_tasks').create((task: PlantTask) => {
              task.plantId = alert.plantId;
              task.title = `🚨 Emergency: ${alert.message}`;
              task.description = `Critical health issue detected. Immediate attention required.\n\nRecommended actions:\n${alert.recommendedActions.join('\n')}`;
              task.taskType = 'inspection';
              task.dueDate = new Date().toISOString(); // Due immediately
              task.status = 'pending';
              task.priority = 'critical';
              task.estimatedDuration = 30; // 30 minutes
              task.autoGenerated = true;
              task.userId = userId;
            });
          });
          
          emergencyTasks.push(emergencyTask);
        }
      }

      log.info(`[GrowthStageIntegration] Created ${emergencyTasks.length} emergency tasks`);
      return emergencyTasks;
    } catch (error) {
      log.error('[GrowthStageIntegration] Error creating emergency tasks:', error);
      return [];
    }
  }

  /**
   * Comprehensive integration method that runs all growth stage integrations
   */
  static async runComprehensiveIntegration(): Promise<{
    transitions: GrowthStageTransition[];
    healthAlerts: PlantHealthAlert[];
    priorityUpdates: TaskPriorityUpdate[];
    celebrations: string[];
    emergencyTasks: PlantTask[];
  }> {
    try {
      log.info('[GrowthStageIntegration] Running comprehensive growth stage integration');

      // Run all integration processes
      const [transitions, healthAlerts, priorityUpdates, celebrations] = await Promise.all([
        this.monitorGrowthStageTransitions(),
        this.analyzePlantHealthForTaskUrgency(),
        this.updateAllTaskPriorities(),
        this.trackMilestoneAchievements(),
      ]);

      // Create emergency tasks from critical health alerts
      const emergencyTasks = await this.createEmergencyTasksFromHealthAlerts(healthAlerts);

      const result = {
        transitions,
        healthAlerts,
        priorityUpdates,
        celebrations,
        emergencyTasks,
      };

      log.info('[GrowthStageIntegration] Comprehensive integration completed:', {
        transitions: transitions.length,
        healthAlerts: healthAlerts.length,
        priorityUpdates: priorityUpdates.length,
        celebrations: celebrations.length,
        emergencyTasks: emergencyTasks.length,
      });

      return result;
    } catch (error) {
      log.error('[GrowthStageIntegration] Error in comprehensive integration:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private static analyzeHealthMetrics(plant: Plant, metrics: PlantMetrics): PlantHealthAlert[] {
    const alerts: PlantHealthAlert[] = [];

    // Critical health percentage
    if (metrics.healthPercentage !== undefined && metrics.healthPercentage < 30) {
      alerts.push({
        plantId: plant.id,
        plantName: plant.name,
        alertType: 'critical',
        message: `Critical health level: ${metrics.healthPercentage}%`,
        urgentTasks: [],
        recommendedActions: [
          'Inspect plant immediately for pests, diseases, or nutrient deficiencies',
          'Check environmental conditions (temperature, humidity, pH)',
          'Consider emergency treatment or intervention',
        ],
      });
    }

    // Overdue watering
    if (metrics.nextWateringDays !== undefined && metrics.nextWateringDays < -1) {
      alerts.push({
        plantId: plant.id,
        plantName: plant.name,
        alertType: 'critical',
        message: `Watering overdue by ${Math.abs(metrics.nextWateringDays)} days`,
        urgentTasks: [],
        recommendedActions: [
          'Water plant immediately',
          'Check soil moisture levels',
          'Adjust watering schedule',
        ],
      });
    }

    // pH out of range
    if (metrics.phLevel !== undefined && (metrics.phLevel < 5.5 || metrics.phLevel > 7.0)) {
      alerts.push({
        plantId: plant.id,
        plantName: plant.name,
        alertType: 'warning',
        message: `pH out of optimal range: ${metrics.phLevel}`,
        urgentTasks: [],
        recommendedActions: [
          'Adjust pH to 6.0-6.5 range',
          'Check nutrient solution pH',
          'Consider pH buffer solutions',
        ],
      });
    }

    // Temperature stress
    if (metrics.temperature !== undefined && (metrics.temperature < 15 || metrics.temperature > 30)) {
      alerts.push({
        plantId: plant.id,
        plantName: plant.name,
        alertType: 'warning',
        message: `Temperature stress: ${metrics.formattedTemperature}`,
        urgentTasks: [],
        recommendedActions: [
          'Adjust environmental temperature',
          'Check ventilation and air circulation',
          'Consider heating or cooling solutions',
        ],
      });
    }

    return alerts;
  }

  private static async generateMilestoneCelebrations(plant: Plant, milestoneProgress: MilestoneProgress): Promise<string[]> {
    const celebrations: string[] = [];

    // Stage transition celebrations
    if (milestoneProgress.isReadyForTransition && milestoneProgress.nextStage) {
      celebrations.push(`🎉 ${plant.name} is ready to transition to ${milestoneProgress.nextStage} stage!`);
    }

    // Progress milestones
    if (milestoneProgress.progressPercentage >= 75 && milestoneProgress.progressPercentage < 80) {
      celebrations.push(`🌟 ${plant.name} is 75% through ${milestoneProgress.currentStage} stage!`);
    }

    // Specific stage celebrations
    switch (milestoneProgress.currentStage) {
      case 'flowering':
        if (milestoneProgress.progressPercentage >= 50) {
          celebrations.push(`🌸 ${plant.name} is halfway through flowering - buds are developing nicely!`);
        }
        break;
      case 'harvest':
        celebrations.push(`🏆 Harvest time for ${plant.name} - congratulations on your successful grow!`);
        break;
      case 'curing':
        if (milestoneProgress.progressPercentage >= 75) {
          celebrations.push(`✨ ${plant.name} is almost ready - curing is nearly complete!`);
        }
        break;
    }

    return celebrations;
  }

  private static async generateTaskCompletionCelebrations(plantId: string): Promise<string[]> {
    const celebrations: string[] = [];

    try {
      // Get recently completed tasks (last 24 hours)
      const yesterday = addDays(new Date(), -1);
      
      const recentCompletions = await database
        .get<PlantTask>('plant_tasks')
        .query(
          Q.where('plant_id', plantId),
          Q.where('status', 'completed'),
          Q.where('updated_at', Q.gte(yesterday.getTime()))
        )
        .fetch();

      // Celebrate significant task completions
      for (const task of recentCompletions) {
        if (task.taskType === 'harvest') {
          celebrations.push(`🎊 Harvest completed for ${task.title}! Time to celebrate your hard work!`);
        } else if (task.taskType === 'transplant') {
          celebrations.push(`🌱 Successfully transplanted! Your plant has more room to grow!`);
        } else if (task.priority === 'critical' && task.taskType === 'inspection') {
          celebrations.push(`✅ Critical inspection completed - great job staying on top of plant health!`);
        }
      }

      // Celebrate completion streaks
      const completedTasksThisWeek = await database
        .get<PlantTask>('plant_tasks')
        .query(
          Q.where('plant_id', plantId),
          Q.where('status', 'completed'),
          Q.where('updated_at', Q.gte(addDays(new Date(), -7).getTime()))
        )
        .fetch();

      if (completedTasksThisWeek.length >= 5) {
        celebrations.push(`🔥 Amazing! You've completed ${completedTasksThisWeek.length} tasks this week - you're on fire!`);
      }
    } catch (error) {
      log.error('[GrowthStageIntegration] Error generating task completion celebrations:', error);
    }

    return celebrations;
  }
}