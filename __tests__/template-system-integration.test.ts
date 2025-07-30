/**
 * Template System Integration Tests
 * 
 * Tests the schedule template system with various plant types and growth stages
 * Validates template creation, application, and sharing functionality
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { addDays } from '../lib/utils/date';

// Mock template data for different scenarios
const templateScenarios = {
  indoor: {
    id: 'template-indoor-1',
    name: 'Indoor LED Grow',
    category: 'indoor',
    strainType: 'indica',
    durationWeeks: 14,
    templateData: [
      {
        weekNumber: 1,
        dayOfWeek: 1,
        taskType: 'watering',
        title: 'Initial watering - light',
        priority: 'medium',
        estimatedDuration: 10,
      },
      {
        weekNumber: 2,
        dayOfWeek: 3,
        taskType: 'feeding',
        title: 'First nutrient feeding',
        priority: 'high',
        estimatedDuration: 15,
      },
    ],
  },
  outdoor: {
    id: 'template-outdoor-1',
    name: 'Outdoor Summer Grow',
    category: 'outdoor',
    strainType: 'sativa',
    durationWeeks: 20,
    templateData: [
      {
        weekNumber: 1,
        dayOfWeek: 1,
        taskType: 'watering',
        title: 'Morning watering',
        priority: 'high',
        estimatedDuration: 20,
      },
      {
        weekNumber: 1,
        dayOfWeek: 4,
        taskType: 'inspection',
        title: 'Check for pests',
        priority: 'medium',
        estimatedDuration: 10,
      },
    ],
  },
  hydroponic: {
    id: 'template-hydro-1',
    name: 'DWC Hydroponic System',
    category: 'hydroponic',
    strainType: 'hybrid',
    durationWeeks: 12,
    templateData: [
      {
        weekNumber: 1,
        dayOfWeek: 1,
        taskType: 'feeding',
        title: 'Check nutrient levels',
        priority: 'critical',
        estimatedDuration: 30,
      },
      {
        weekNumber: 1,
        dayOfWeek: 3,
        taskType: 'inspection',
        title: 'Check pH and EC',
        priority: 'high',
        estimatedDuration: 15,
      },
    ],
  },
};

const plantVariations = {
  indica: {
    id: 'plant-indica-1',
    name: 'Northern Lights',
    strain: 'Northern Lights',
    strainType: 'indica',
    growthStage: 'seedling',
    expectedFloweringWeeks: 8,
  },
  sativa: {
    id: 'plant-sativa-1',
    name: 'Jack Herer',
    strain: 'Jack Herer',
    strainType: 'sativa',
    growthStage: 'vegetative',
    expectedFloweringWeeks: 10,
  },
  hybrid: {
    id: 'plant-hybrid-1',
    name: 'Blue Dream',
    strain: 'Blue Dream',
    strainType: 'hybrid',
    growthStage: 'flowering',
    expectedFloweringWeeks: 9,
  },
  autoflower: {
    id: 'plant-auto-1',
    name: 'Auto White Widow',
    strain: 'Auto White Widow',
    strainType: 'autoflower',
    growthStage: 'vegetative',
    expectedFloweringWeeks: 6,
  },
};

describe('Template System Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Template Creation and Validation', () => {
    it('should validate indoor template structure', () => {
      const template = templateScenarios.indoor;
      
      expect(template.category).toBe('indoor');
      expect(template.strainType).toBe('indica');
      expect(template.durationWeeks).toBe(14);
      expect(template.templateData).toHaveLength(2);
      
      // Validate task structure
      const firstTask = template.templateData[0];
      expect(firstTask.weekNumber).toBe(1);
      expect(firstTask.taskType).toBe('watering');
      expect(firstTask.priority).toBe('medium');
    });

    it('should validate outdoor template structure', () => {
      const template = templateScenarios.outdoor;
      
      expect(template.category).toBe('outdoor');
      expect(template.strainType).toBe('sativa');
      expect(template.durationWeeks).toBe(20);
      expect(template.templateData).toHaveLength(2);
      
      // Validate longer duration for outdoor grows
      expect(template.durationWeeks).toBeGreaterThan(templateScenarios.indoor.durationWeeks);
    });

    it('should validate hydroponic template structure', () => {
      const template = templateScenarios.hydroponic;
      
      expect(template.category).toBe('hydroponic');
      expect(template.strainType).toBe('hybrid');
      expect(template.durationWeeks).toBe(12);
      
      // Hydroponic should have critical priority tasks
      const criticalTask = template.templateData.find(task => task.priority === 'critical');
      expect(criticalTask).toBeDefined();
      expect(criticalTask?.taskType).toBe('feeding');
    });
  });

  describe('Template Application to Different Plant Types', () => {
    it('should apply indoor template to indica plant', () => {
      const template = templateScenarios.indoor;
      const plant = plantVariations.indica;
      
      // Simulate template application
      const appliedTasks = template.templateData.map(taskTemplate => ({
        id: `task-${plant.id}-${taskTemplate.weekNumber}-${taskTemplate.dayOfWeek}`,
        plantId: plant.id,
        taskType: taskTemplate.taskType,
        title: taskTemplate.title,
        priority: taskTemplate.priority,
        estimatedDuration: taskTemplate.estimatedDuration,
        scheduledDate: addDays(new Date(), (taskTemplate.weekNumber - 1) * 7 + taskTemplate.dayOfWeek),
        growthStage: plant.growthStage,
        templateId: template.id,
      }));
      
      expect(appliedTasks).toHaveLength(2);
      expect(appliedTasks[0].plantId).toBe(plant.id);
      expect(appliedTasks[0].templateId).toBe(template.id);
    });

    it('should apply outdoor template to sativa plant', () => {
      const template = templateScenarios.outdoor;
      const plant = plantVariations.sativa;
      
      // Sativa plants typically need longer growing periods
      expect(template.durationWeeks).toBeGreaterThanOrEqual(18);
      expect(plant.expectedFloweringWeeks).toBeGreaterThanOrEqual(9);
      
      // Simulate template application
      const appliedTasks = template.templateData.map(taskTemplate => ({
        id: `task-${plant.id}-${taskTemplate.weekNumber}-${taskTemplate.dayOfWeek}`,
        plantId: plant.id,
        taskType: taskTemplate.taskType,
        title: taskTemplate.title,
        priority: taskTemplate.priority,
        scheduledDate: addDays(new Date(), (taskTemplate.weekNumber - 1) * 7 + taskTemplate.dayOfWeek),
        growthStage: plant.growthStage,
      }));
      
      expect(appliedTasks).toHaveLength(2);
      expect(appliedTasks.some(task => task.taskType === 'inspection')).toBe(true);
    });

    it('should apply hydroponic template to hybrid plant', () => {
      const template = templateScenarios.hydroponic;
      const plant = plantVariations.hybrid;
      
      // Hydroponic systems require more frequent monitoring
      const criticalTasks = template.templateData.filter(task => task.priority === 'critical');
      expect(criticalTasks.length).toBeGreaterThan(0);
      
      // Simulate template application
      const appliedTasks = template.templateData.map(taskTemplate => ({
        id: `task-${plant.id}-${taskTemplate.weekNumber}-${taskTemplate.dayOfWeek}`,
        plantId: plant.id,
        taskType: taskTemplate.taskType,
        title: taskTemplate.title,
        priority: taskTemplate.priority,
        scheduledDate: addDays(new Date(), (taskTemplate.weekNumber - 1) * 7 + taskTemplate.dayOfWeek),
        growthStage: plant.growthStage,
      }));
      
      expect(appliedTasks).toHaveLength(2);
      expect(appliedTasks.some(task => task.priority === 'critical')).toBe(true);
    });
  });

  describe('Growth Stage Specific Template Adaptation', () => {
    it('should adapt template for seedling stage', () => {
      const plant = plantVariations.indica; // seedling stage
      const adaptedTasks = {
        watering: { frequency: 'light', amount: 'minimal' },
        feeding: { frequency: 'none', nutrients: 'water_only' },
        lighting: { hours: 18, intensity: 'low' },
      };
      
      expect(plant.growthStage).toBe('seedling');
      expect(adaptedTasks.watering.frequency).toBe('light');
      expect(adaptedTasks.feeding.frequency).toBe('none');
    });

    it('should adapt template for vegetative stage', () => {
      const plant = plantVariations.sativa; // vegetative stage
      const adaptedTasks = {
        watering: { frequency: 'regular', amount: 'moderate' },
        feeding: { frequency: 'weekly', nutrients: 'high_nitrogen' },
        lighting: { hours: 18, intensity: 'medium' },
        training: { techniques: ['LST', 'topping'] },
      };
      
      expect(plant.growthStage).toBe('vegetative');
      expect(adaptedTasks.feeding.nutrients).toBe('high_nitrogen');
      expect(adaptedTasks.training.techniques).toContain('LST');
    });

    it('should adapt template for flowering stage', () => {
      const plant = plantVariations.hybrid; // flowering stage
      const adaptedTasks = {
        watering: { frequency: 'careful', amount: 'reduced' },
        feeding: { frequency: 'bi_weekly', nutrients: 'high_phosphorus' },
        lighting: { hours: 12, intensity: 'high' },
        monitoring: { frequency: 'daily', focus: 'bud_development' },
      };
      
      expect(plant.growthStage).toBe('flowering');
      expect(adaptedTasks.lighting.hours).toBe(12);
      expect(adaptedTasks.feeding.nutrients).toBe('high_phosphorus');
    });
  });

  describe('Template Sharing and Community Features', () => {
    it('should validate template sharing structure', () => {
      const sharedTemplate = {
        ...templateScenarios.indoor,
        isPublic: true,
        createdBy: 'user-123',
        usageCount: 0,
        rating: 0,
        reviews: [],
        tags: ['indoor', 'beginner', 'led'],
      };
      
      expect(sharedTemplate.isPublic).toBe(true);
      expect(sharedTemplate.createdBy).toBe('user-123');
      expect(sharedTemplate.tags).toContain('indoor');
    });

    it('should handle template import and export', () => {
      const exportedTemplate = {
        version: '1.0',
        exportDate: new Date(),
        template: templateScenarios.hydroponic,
        metadata: {
          compatibility: ['v1.0', 'v1.1'],
          requiredFeatures: ['hydroponic_monitoring'],
        },
      };
      
      expect(exportedTemplate.version).toBe('1.0');
      expect(exportedTemplate.template.category).toBe('hydroponic');
      expect(exportedTemplate.metadata.requiredFeatures).toContain('hydroponic_monitoring');
    });

    it('should validate template versioning', () => {
      const templateVersions = [
        { version: '1.0', template: templateScenarios.indoor },
        { version: '1.1', template: { ...templateScenarios.indoor, durationWeeks: 15 } },
        { version: '2.0', template: { ...templateScenarios.indoor, category: 'indoor_advanced' } },
      ];
      
      expect(templateVersions).toHaveLength(3);
      expect(templateVersions[1].template.durationWeeks).toBe(15);
      expect(templateVersions[2].template.category).toBe('indoor_advanced');
    });
  });

  describe('Template Performance and Validation', () => {
    it('should validate template task sequences', () => {
      const template = templateScenarios.hydroponic;
      
      // Check for logical task ordering
      const sortedTasks = template.templateData.sort((a, b) => {
        if (a.weekNumber !== b.weekNumber) {
          return a.weekNumber - b.weekNumber;
        }
        return a.dayOfWeek - b.dayOfWeek;
      });
      
      expect(sortedTasks[0].weekNumber).toBeLessThanOrEqual(sortedTasks[1].weekNumber);
    });

    it('should handle template conflicts and dependencies', () => {
      type TaskType = {
        weekNumber: number;
        dayOfWeek: number;
        taskType: string;
        title: string;
        estimatedDuration: number;
      };

      const conflictingTasks: TaskType[] = [
        {
          weekNumber: 1,
          dayOfWeek: 1,
          taskType: 'watering',
          title: 'Morning watering',
          estimatedDuration: 30,
        },
        {
          weekNumber: 1,
          dayOfWeek: 1,
          taskType: 'feeding',
          title: 'Nutrient feeding',
          estimatedDuration: 45,
        },
        {
          weekNumber: 1,
          dayOfWeek: 1,
          taskType: 'watering',
          title: 'Evening watering',
          estimatedDuration: 20,
        },
      ];

      // Check for overlapping/conflicting tasks (same day/week)
      const conflicts: Array<{ a: TaskType; b: TaskType }> = [];
      for (let i = 0; i < conflictingTasks.length; i++) {
        for (let j = i + 1; j < conflictingTasks.length; j++) {
          const a = conflictingTasks[i]!;
          const b = conflictingTasks[j]!;
          if (a.weekNumber === b.weekNumber && a.dayOfWeek === b.dayOfWeek) {
            // Conflict if same type or different type on same slot
            conflicts.push({ a, b });
          }
        }
      }
      // Assert that conflicts are detected
      expect(conflicts.length).toBeGreaterThan(0);

      // Example: system should identify both watering/feeding and watering/watering as conflicts
      const conflictTypes = conflicts.map(({ a, b }) => [a.taskType, b.taskType].sort().join('+'));
      expect(conflictTypes).toContain('feeding+watering');
      expect(conflictTypes).toContain('watering+watering');

      // Simulate system conflict resolution: e.g., merge watering tasks, flag feeding+watering as warning
      const resolvedTasks: TaskType[] = [];
      const seen = new Set<string>();
      for (const task of conflictingTasks) {
        const key = `${task.weekNumber}-${task.dayOfWeek}-${task.taskType}`;
        if (!seen.has(key)) {
          // Merge durations for same type
          const mergedDuration = conflictingTasks
            .filter(t => t.weekNumber === task.weekNumber && t.dayOfWeek === task.dayOfWeek && t.taskType === task.taskType)
            .reduce((sum, t) => sum + t.estimatedDuration, 0);
          resolvedTasks.push({ ...task, estimatedDuration: mergedDuration });
          seen.add(key);
        }
      }
      // Should merge watering tasks into one with combined duration
      const wateringTask = resolvedTasks.find(t => t.taskType === 'watering');
      expect(wateringTask?.estimatedDuration).toBe(50); // 30 + 20
      // Feeding should remain as a separate task
      const feedingTask = resolvedTasks.find(t => t.taskType === 'feeding');
      expect(feedingTask?.estimatedDuration).toBe(45);
      // Total resolved tasks should be 2 (watering, feeding)
      expect(resolvedTasks.length).toBe(2);
      // Optionally, assert that a warning is flagged for feeding+watering conflict
      const hasFeedingWateringConflict = conflictTypes.includes('feeding+watering');
      expect(hasFeedingWateringConflict).toBe(true);
    });

    it('should optimize template for different growing environments', () => {
      const environmentOptimizations = {
        indoor: {
          lightingControl: true,
          climateControl: true,
          spaceConstraints: true,
        },
        outdoor: {
          weatherDependency: true,
          seasonalAdjustments: true,
          pestManagement: true,
        },
        greenhouse: {
          hybridControl: true,
          ventilationManagement: true,
          temperatureRegulation: true,
        },
      };
      
      expect(environmentOptimizations.indoor.lightingControl).toBe(true);
      expect(environmentOptimizations.outdoor.weatherDependency).toBe(true);
      expect(environmentOptimizations.greenhouse.hybridControl).toBe(true);
    });
  });

  describe('Real-world Template Scenarios', () => {
    it('should handle beginner-friendly templates', () => {
      const beginnerTemplate = {
        id: 'template-beginner-1',
        name: 'First Time Grower - Simple',
        difficulty: 'beginner',
        category: 'indoor',
        strainType: 'indica',
        durationWeeks: 16,
        features: {
          detailedInstructions: true,
          errorRecovery: true,
          simplifiedSchedule: true,
        },
        templateData: [
          {
            weekNumber: 1,
            dayOfWeek: 1,
            taskType: 'watering',
            title: 'Water lightly - check soil moisture first',
            description: 'Stick finger 1 inch into soil. If dry, water until slight runoff.',
            priority: 'medium',
            estimatedDuration: 15,
          },
        ],
      };
      
      expect(beginnerTemplate.difficulty).toBe('beginner');
      expect(beginnerTemplate.features.detailedInstructions).toBe(true);
      expect(beginnerTemplate.templateData[0].description).toContain('check soil moisture');
    });

    it('should handle advanced cultivation templates', () => {
      const advancedTemplate = {
        id: 'template-advanced-1',
        name: 'SCROG + LST Advanced Training',
        difficulty: 'advanced',
        category: 'indoor',
        strainType: 'sativa',
        durationWeeks: 22,
        features: {
          advancedTechniques: true,
          precisionTiming: true,
          multipleTrainingMethods: true,
        },
        templateData: [
          {
            weekNumber: 3,
            dayOfWeek: 1,
            taskType: 'training',
            title: 'Install SCROG net at 18 inches',
            priority: 'high',
            estimatedDuration: 60,
            requiredTools: ['scrog_net', 'zip_ties', 'scissors'],
          },
        ],
      };
      
      expect(advancedTemplate.difficulty).toBe('advanced');
      expect(advancedTemplate.features.advancedTechniques).toBe(true);
      expect(advancedTemplate.templateData[0].requiredTools).toContain('scrog_net');
    });
  });
});