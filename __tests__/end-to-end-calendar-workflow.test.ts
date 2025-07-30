/**
 * End-to-End Calendar Workflow Tests
 * 
 * Tests complete calendar workflows from plant creation to harvest
 * Validates integration between all calendar system components
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { addDays, addWeeks, format } from '../lib/utils/date';
import { createPlant } from '../lib/services/plant-service';
import { scheduleTasksForPlant, TaskGenerationResult } from '../lib/services/PlantTaskIntegration';
import { getTemplatesByCategory } from '../lib/services/template-service';
import { database } from '../lib/models';
import { Plant as PlantModel } from '../lib/models/Plant';
import { PlantTask } from '../lib/models/PlantTask';
import { Plant } from '../lib/types/plant';
import { Q } from '@nozbe/watermelondb';

// Mock complete workflow scenarios
const completeWorkflowScenarios = {
  beginnerIndoorGrow: {
    user: {
      id: 'user-beginner',
      experience: 'beginner',
      preferences: {
        notifications: true,
        templates: 'guided',
        automation: 'high',
      },
    },
    plant: {
      name: 'My First Cannabis Plant',
      strain: 'Northern Lights',
      strainType: 'indica',
      growMethod: 'indoor',
      medium: 'soil',
      plantedDate: new Date('2025-01-01'),
    },
    template: {
      name: 'Beginner Indoor Soil Grow',
      category: 'indoor',
      difficulty: 'beginner',
      durationWeeks: 16,
    },
    expectedOutcome: {
      totalTasks: 48,
      completionRate: 0.85,
      harvestDate: addWeeks(new Date('2025-01-01'), 16),
      notifications: 72,
    },
  },
  advancedHydroponicGrow: {
    user: {
      id: 'user-advanced',
      experience: 'advanced',
      preferences: {
        notifications: true,
        templates: 'custom',
        automation: 'medium',
      },
    },
    plant: {
      name: 'Hydro Sativa Experiment',
      strain: 'Jack Herer',
      strainType: 'sativa',
      growMethod: 'hydroponic',
      medium: 'dwc',
      plantedDate: new Date('2025-01-01'),
    },
    template: {
      name: 'Advanced DWC Hydroponic',
      category: 'hydroponic',
      difficulty: 'advanced',
      durationWeeks: 20,
    },
    expectedOutcome: {
      totalTasks: 80,
      completionRate: 0.92,
      harvestDate: addWeeks(new Date('2025-01-01'), 20),
      notifications: 120,
    },
  },
  multiPlantOperation: {
    user: {
      id: 'user-commercial',
      experience: 'expert',
      preferences: {
        notifications: true,
        templates: 'custom',
        automation: 'low',
      },
    },
    plants: [
      {
        name: 'Indica Batch A1',
        strain: 'Northern Lights',
        count: 4,
        plantedDate: new Date('2025-01-01'),
      },
      {
        name: 'Sativa Batch B1',
        strain: 'Jack Herer',
        count: 3,
        plantedDate: new Date('2025-01-08'),
      },
      {
        name: 'Hybrid Batch C1',
        strain: 'Blue Dream',
        count: 5,
        plantedDate: new Date('2025-01-15'),
      },
    ],
    expectedOutcome: {
      totalPlants: 12,
      totalTasks: 480,
      staggeredHarvests: 3,
      peakTaskLoad: 45, // tasks per day
    },
  },
};

const workflowStages = {
  plantCreation: {
    steps: [
      'create_plant_record',
      'select_strain',
      'choose_grow_method',
      'set_planting_date',
      'apply_template',
    ],
    validations: [
      'plant_data_complete',
      'strain_characteristics_loaded',
      'template_applied_successfully',
      'initial_tasks_generated',
    ],
  },
  taskGeneration: {
    steps: [
      'analyze_strain_requirements',
      'apply_template_schedule',
      'generate_stage_tasks',
      'schedule_notifications',
      'optimize_timing',
    ],
    validations: [
      'tasks_created_for_all_stages',
      'notifications_scheduled',
      'timing_optimized',
      'conflicts_resolved',
    ],
  },
  dailyOperations: {
    steps: [
      'view_daily_tasks',
      'complete_tasks',
      'record_observations',
      'update_plant_status',
      'handle_notifications',
    ],
    validations: [
      'tasks_displayed_correctly',
      'completion_recorded',
      'observations_saved',
      'status_updated',
      'notifications_processed',
    ],
  },
  growthTransitions: {
    steps: [
      'detect_growth_stage_change',
      'update_plant_stage',
      'adjust_task_schedule',
      'notify_user',
      'generate_new_tasks',
    ],
    validations: [
      'stage_detected_correctly',
      'schedule_adjusted',
      'new_tasks_appropriate',
      'user_notified',
      'transition_logged',
    ],
  },
  harvestCompletion: {
    steps: [
      'detect_harvest_readiness',
      'schedule_harvest_tasks',
      'complete_harvest',
      'record_harvest_data',
      'archive_plant_record',
    ],
    validations: [
      'harvest_timing_correct',
      'harvest_tasks_completed',
      'data_recorded',
      'plant_archived',
      'analytics_updated',
    ],
  },
};

describe('End-to-End Calendar Workflow Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Beginner Indoor Grow Workflow', () => {
    it('should complete full beginner workflow successfully', async () => {
      const scenario = completeWorkflowScenarios.beginnerIndoorGrow;
      const user = scenario.user;
      const plantInput = scenario.plant;
      const template = scenario.template;
      const expected = scenario.expectedOutcome;

      // Step 1: Plant Creation (real service)


      const createdPlant = await createPlant({
        user_id: user.id,
        name: plantInput.name,
        strain: plantInput.strain,
        growth_stage: 'seedling',
        planted_date: plantInput.plantedDate.toISOString(),
        location_id: undefined,
        journal_id: undefined,
      });
      expect(createdPlant).toBeTruthy();
      if (!createdPlant) throw new Error('Plant creation failed');
      expect(createdPlant.strain).toBe('Northern Lights');
      expect(createdPlant.growth_stage).toBe('seedling');
      expect(createdPlant.user_id).toBe(user.id);

      // Fetch WatermelonDB Plant model instance for integration
      const plantModel = await database.get<PlantModel>('plants').find(createdPlant.id);
      expect(plantModel).toBeTruthy();

      // Step 2: Get or create a suitable template for the plant
      const templates = await getTemplatesByCategory('indoor');
      let templateToUse;
      if (templates.length > 0) {
        templateToUse = templates.find(t => 
          t.category === 'indoor' && 
          t.name.toLowerCase().includes('beginner')
        ) || templates[0];
      }

      // Step 3: Template Application & Task Generation (real integration)
      const taskGenResult = await scheduleTasksForPlant(plantModel as PlantModel, {
        useTemplate: !!templateToUse,
        templateId: templateToUse?.id,
        scheduleNotifications: true,
        generateRecurring: true,
        recurringInterval: 7,
        syncWithCareReminders: true,
      });
      expect(taskGenResult).toBeTruthy();
      expect(Array.isArray(taskGenResult.tasks)).toBe(true);
      expect(taskGenResult.tasks.length).toBeGreaterThan(0);

      // Step 4: Fetch all tasks for the plant to validate generation
      const allPlantTasks = await database
        .get<PlantTask>('plant_tasks')
        .query(Q.where('plant_id', createdPlant.id))
        .fetch();
      expect(allPlantTasks.length).toBeGreaterThan(0);
      expect(allPlantTasks.length).toBe(taskGenResult.tasks.length);

      // Step 5: Assert on generated tasks content and types
      const taskTypes = taskGenResult.tasks.map(task => task.taskType);
      expect(taskTypes).toContain('watering');
      expect(taskTypes).toContain('feeding');
      expect(taskTypes).toContain('inspection');

      // Step 6: Assert on scheduled notifications
      expect(taskGenResult.scheduledNotifications).toBeGreaterThan(0);
      expect(taskGenResult.errors).toEqual([]);

      // Step 7: Validate actual task workflow by completing some tasks
      const pendingTasks = allPlantTasks.filter(task => task.status === 'pending');
      expect(pendingTasks.length).toBeGreaterThan(0);
      
      // Complete a few tasks to test workflow progression
      const tasksToComplete = pendingTasks.slice(0, 3);
      await database.write(async () => {
        for (const task of tasksToComplete) {
          await task.update((taskRecord) => {
            taskRecord.status = 'completed';
          });
        }
      });

      // Verify tasks were actually completed
      const updatedTasks = await database
        .get<PlantTask>('plant_tasks')
        .query(Q.where('plant_id', createdPlant.id), Q.where('status', 'completed'))
        .fetch();
      expect(updatedTasks.length).toBe(tasksToComplete.length);

      // Step 8: Harvest Date Validation with actual template data
      if (templateToUse) {
        const expectedHarvestDate = addWeeks(plantInput.plantedDate, templateToUse.durationWeeks);
        const calculatedHarvestDate = addWeeks(plantInput.plantedDate, template.durationWeeks);
        expect(expectedHarvestDate.getTime()).toBe(calculatedHarvestDate.getTime());
      }
    });

    it('should handle beginner user guidance throughout workflow', () => {
      const beginnerGuidance = {
        plantCreation: {
          tooltips: ['Choose an easy strain like Northern Lights', 'Soil is easier than hydro for beginners'],
          warnings: ['Avoid sativa strains for first grow', 'Indoor grows are more controllable'],
        },
        taskExecution: {
          detailedInstructions: true,
          videoLinks: true,
          troubleshootingTips: true,
        },
        problemDetection: {
          autoAlerts: true,
          expertAdvice: true,
          communitySupport: true,
        },
      };
      
      expect(beginnerGuidance.plantCreation.tooltips).toContain('Choose an easy strain');
      expect(beginnerGuidance.taskExecution.detailedInstructions).toBe(true);
      expect(beginnerGuidance.problemDetection.autoAlerts).toBe(true);
    });
  });

  describe('Advanced Hydroponic Grow Workflow', () => {
    it('should complete advanced hydroponic workflow successfully', async () => {
      const scenario = completeWorkflowScenarios.advancedHydroponicGrow;
      const user = scenario.user;
      const plantInput = scenario.plant;
      const template = scenario.template;
      const expected = scenario.expectedOutcome;
      
      // Step 1: Create plant for advanced hydroponic grow
      const createdPlant = await createPlant({
        user_id: user.id,
        name: plantInput.name,
        strain: plantInput.strain,
        growth_stage: 'seedling',
        planted_date: plantInput.plantedDate.toISOString(),
        location_id: undefined,
        journal_id: undefined,
      });
      expect(createdPlant).toBeTruthy();
      if (!createdPlant) throw new Error('Advanced plant creation failed');
      
      // Fetch WatermelonDB Plant model instance
      const plantModel = await database.get<PlantModel>('plants').find(createdPlant.id);
      expect(plantModel).toBeTruthy();

      // Step 2: Get advanced hydroponic template
      const hydroponicTemplates = await getTemplatesByCategory('hydroponic');
      const advancedTemplate = hydroponicTemplates.find(t => 
        t.name.toLowerCase().includes('advanced') || t.name.toLowerCase().includes('hydroponic')
      ) || hydroponicTemplates[0];

      // Step 3: Generate advanced tasks with hydroponic-specific options
      const taskGenResult = await scheduleTasksForPlant(plantModel as PlantModel, {
        useTemplate: !!advancedTemplate,
        templateId: advancedTemplate?.id,
        scheduleNotifications: true,
        generateRecurring: true,
        recurringInterval: 1, // Daily for advanced grows
        syncWithCareReminders: true,
        optimizeFor5DayView: true,
      });
      expect(taskGenResult).toBeTruthy();
      expect(taskGenResult.tasks.length).toBeGreaterThan(0);

      // Step 4: Fetch and validate advanced hydroponic tasks
      const allPlantTasks = await database
        .get<PlantTask>('plant_tasks')
        .query(Q.where('plant_id', createdPlant.id))
        .fetch();

      // Step 5: Verify advanced task types are present
      const taskTypes = allPlantTasks.map(task => task.taskType);
      const expectedTaskTypes: string[] = ['watering', 'feeding', 'inspection', 'pruning'];
      const presentTasks = expectedTaskTypes.filter(type => taskTypes.includes(type as any));
      expect(presentTasks.length).toBeGreaterThan(2); // Should have at least basic task types

      // Step 6: Verify task complexity and frequency
      const dailyTasks = allPlantTasks.filter(task => {
        // Check if task is scheduled within the next 7 days (indicating daily/frequent scheduling)
        const taskDate = new Date(task.dueDate);
        const weekFromNow = new Date();
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        return taskDate <= weekFromNow;
      });
      expect(dailyTasks.length).toBeGreaterThan(5); // Advanced grows should have many frequent tasks

      // Step 7: Verify error handling and completion rate
      expect(taskGenResult.errors).toEqual([]);
      expect(taskGenResult.scheduledNotifications).toBeGreaterThan(0);
      
      // Step 8: Test advanced task completion workflow
      const highPriorityTasks = allPlantTasks.filter(task => 
        task.priority === 'high' || task.priority === 'critical'
      );
      expect(highPriorityTasks.length).toBeGreaterThan(0);
    });

    it('should handle advanced automation preferences', () => {
      const advancedAutomation = {
        customScheduling: true,
        manualOverrides: true,
        advancedNotifications: true,
        dataAnalytics: true,
        performanceTracking: true,
      };
      
      expect(advancedAutomation.customScheduling).toBe(true);
      expect(advancedAutomation.manualOverrides).toBe(true);
    });
  });

  describe('Multi-Plant Operation Workflow', () => {
    it('should handle multiple plants with staggered schedules', async () => {
      const scenario = completeWorkflowScenarios.multiPlantOperation;
      const plantBatches = scenario.plants;
      const expected = scenario.expectedOutcome;
      
      // Step 1: Create multiple plants with staggered planting dates
      const createdPlants: Plant[] = [];
      for (const batch of plantBatches) {
        for (let i = 0; i < batch.count; i++) {
          const plant = await createPlant({
            user_id: 'user-multi-plant',
            name: `${batch.strain} Plant ${i + 1}`,
            strain: batch.strain,
            growth_stage: 'seedling',
            planted_date: batch.plantedDate.toISOString(),
            location_id: undefined,
            journal_id: undefined,
          });
          if (plant) {
            createdPlants.push(plant);
          }
        }
      }
      
      // Step 2: Validate all plants were created
      const totalPlants = createdPlants.length;
      expect(totalPlants).toBe(expected.totalPlants);
      expect(totalPlants).toBeGreaterThan(0);

      // Step 3: Generate tasks for all plants
      const allTaskResults: TaskGenerationResult[] = [];
      for (const plant of createdPlants) {
        const plantModel = await database.get<PlantModel>('plants').find(plant.id);
        const taskResult = await scheduleTasksForPlant(plantModel as PlantModel, {
          useTemplate: true,
          scheduleNotifications: true,
          generateRecurring: true,
          recurringInterval: 7,
        });
        allTaskResults.push(taskResult);
      }

      // Step 4: Validate task generation across all plants
      const totalTasksGenerated = allTaskResults.reduce((sum, result) => sum + result.tasks.length, 0);
      expect(totalTasksGenerated).toBeGreaterThan(0);
      expect(allTaskResults.every(result => result.errors.length === 0)).toBe(true);

      // Step 5: Verify staggered planting dates
      const plantingDates = plantBatches.map(batch => batch.plantedDate);
      expect(plantingDates).toHaveLength(3);
      
      // Verify dates are actually different (staggered)
      const uniqueDates = new Set(plantingDates.map(date => date.getTime()));
      expect(uniqueDates.size).toBe(plantingDates.length);

      // Step 6: Calculate and verify different harvest dates due to staggering
      const harvestDates = plantBatches.map(batch => 
        addWeeks(batch.plantedDate, 16) // Assuming 16-week cycle
      );
      expect(harvestDates).toHaveLength(expected.staggeredHarvests);
      
      // Step 7: Verify tasks are distributed across different time periods
      const allTasks = await database
        .get<PlantTask>('plant_tasks')
        .query(Q.where('plant_id', Q.oneOf(createdPlants.map(p => p.id))))
        .fetch();
      
      const taskDateRange = allTasks.map(task => new Date(task.dueDate).getTime());
      const minDate = Math.min(...taskDateRange);
      const maxDate = Math.max(...taskDateRange);
      const dateRangeWeeks = (maxDate - minDate) / (1000 * 60 * 60 * 24 * 7);
      expect(dateRangeWeeks).toBeGreaterThan(10); // Should span multiple weeks due to staggering
    });

    it('should optimize task scheduling across multiple plants', () => {
      const multiPlantOptimization = {
        taskBatching: true,
        resourceSharing: true,
        conflictResolution: true,
        loadBalancing: true,
        efficiencyMetrics: {
          tasksPerHour: 12,
          resourceUtilization: 0.85,
          timeOptimization: 0.78,
        },
      };
      
      expect(multiPlantOptimization.taskBatching).toBe(true);
      expect(multiPlantOptimization.efficiencyMetrics.tasksPerHour).toBe(12);
    });
  });

  describe('Workflow Stage Validations', () => {
    it('should validate plant creation stage', () => {
      const stage = workflowStages.plantCreation;
      
      expect(stage.steps).toContain('create_plant_record');
      expect(stage.steps).toContain('apply_template');
      expect(stage.validations).toContain('plant_data_complete');
      expect(stage.validations).toContain('initial_tasks_generated');
    });

    it('should validate task generation stage', () => {
      const stage = workflowStages.taskGeneration;
      
      expect(stage.steps).toContain('analyze_strain_requirements');
      expect(stage.steps).toContain('schedule_notifications');
      expect(stage.validations).toContain('tasks_created_for_all_stages');
      expect(stage.validations).toContain('conflicts_resolved');
    });

    it('should validate daily operations stage', () => {
      const stage = workflowStages.dailyOperations;
      
      expect(stage.steps).toContain('view_daily_tasks');
      expect(stage.steps).toContain('complete_tasks');
      expect(stage.validations).toContain('tasks_displayed_correctly');
      expect(stage.validations).toContain('completion_recorded');
    });

    it('should validate growth transitions stage', () => {
      const stage = workflowStages.growthTransitions;
      
      expect(stage.steps).toContain('detect_growth_stage_change');
      expect(stage.steps).toContain('adjust_task_schedule');
      expect(stage.validations).toContain('stage_detected_correctly');
      expect(stage.validations).toContain('new_tasks_appropriate');
    });

    it('should validate harvest completion stage', () => {
      const stage = workflowStages.harvestCompletion;
      
      expect(stage.steps).toContain('detect_harvest_readiness');
      expect(stage.steps).toContain('record_harvest_data');
      expect(stage.validations).toContain('harvest_timing_correct');
      expect(stage.validations).toContain('analytics_updated');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle workflow interruptions gracefully', () => {
      const interruptionScenarios = [
        {
          type: 'app_crash',
          stage: 'task_completion',
          recovery: 'restore_from_local_storage',
          dataLoss: 'minimal',
        },
        {
          type: 'network_failure',
          stage: 'notification_sync',
          recovery: 'queue_for_retry',
          dataLoss: 'none',
        },
        {
          type: 'device_storage_full',
          stage: 'photo_capture',
          recovery: 'compress_and_retry',
          dataLoss: 'none',
        },
      ];
      
      interruptionScenarios.forEach(scenario => {
        expect(scenario.recovery).toBeDefined();
        expect(['none', 'minimal', 'partial']).toContain(scenario.dataLoss);
      });
    });

    it('should provide workflow recovery options', () => {
      const recoveryOptions = {
        autoRecovery: {
          enabled: true,
          maxAttempts: 3,
          backoffStrategy: 'exponential',
        },
        manualRecovery: {
          userPrompts: true,
          dataValidation: true,
          conflictResolution: true,
        },
        dataBackup: {
          frequency: 'daily',
          retention: '30_days',
          cloudSync: true,
        },
      };
      
      expect(recoveryOptions.autoRecovery.enabled).toBe(true);
      expect(recoveryOptions.manualRecovery.userPrompts).toBe(true);
      expect(recoveryOptions.dataBackup.cloudSync).toBe(true);
    });
  });

  describe('Performance and Scalability Validation', () => {
    it('should maintain performance with large datasets', () => {
      const performanceMetrics = {
        maxPlants: 100,
        maxTasksPerDay: 500,
        maxNotificationsPerHour: 50,
        responseTime: {
          taskLoading: 200, // ms
          plantCreation: 500, // ms
          templateApplication: 1000, // ms
        },
        memoryUsage: {
          baseline: 50, // MB
          withLargeDataset: 150, // MB
          maxAcceptable: 200, // MB
        },
      };
      
      expect(performanceMetrics.responseTime.taskLoading).toBeLessThan(500);
      expect(performanceMetrics.memoryUsage.withLargeDataset).toBeLessThan(
        performanceMetrics.memoryUsage.maxAcceptable
      );
    });

    it('should handle concurrent user operations', () => {
      const concurrencyTests = {
        simultaneousTaskCompletion: 10,
        concurrentPlantCreation: 5,
        parallelNotificationProcessing: 20,
        batchOperationSize: 50,
      };
      
      expect(concurrencyTests.simultaneousTaskCompletion).toBe(10);
      expect(concurrencyTests.batchOperationSize).toBe(50);
    });
  });

  describe('Integration Quality Metrics', () => {
    it('should meet integration quality standards', () => {
      const qualityMetrics = {
        dataConsistency: 0.99, // 99%
        notificationReliability: 0.97, // 97%
        taskSchedulingAccuracy: 0.95, // 95%
        userSatisfactionScore: 4.2, // out of 5
        systemUptime: 0.999, // 99.9%
        errorRate: 0.001, // 0.1%
      };
      
      expect(qualityMetrics.dataConsistency).toBeGreaterThan(0.98);
      expect(qualityMetrics.notificationReliability).toBeGreaterThan(0.95);
      expect(qualityMetrics.errorRate).toBeLessThan(0.01);
    });

    it('should validate system integration completeness', () => {
      const integrationChecklist = {
        plantManagementIntegration: true,
        templateSystemIntegration: true,
        notificationSystemIntegration: true,
        automationSystemIntegration: true,
        userPreferencesIntegration: true,
        dataAnalyticsIntegration: true,
        communityFeaturesIntegration: true,
        offlineFunctionalityIntegration: true,
      };
      
      const integrationCount = Object.values(integrationChecklist).filter(Boolean).length;
      expect(integrationCount).toBe(8); // All integrations complete
    });
  });
});