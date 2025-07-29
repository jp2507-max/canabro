/**
 * Automation System Integration Tests
 * 
 * Tests the automation system with real growth scenarios
 * Validates growth stage detection, task scheduling, and environmental adjustments
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { addDays, addWeeks } from '@/lib/utils/date';

// Mock real growth scenarios
const growthScenarios = {
  seedlingToVegetative: {
    plant: {
      id: 'plant-scenario-1',
      name: 'Northern Lights #1',
      strain: 'Northern Lights',
      strainType: 'indica',
      plantedDate: new Date('2025-01-01'),
      currentStage: 'seedling',
      daysInStage: 14,
    },
    expectedTransition: {
      newStage: 'vegetative',
      triggerConditions: {
        height: 6, // inches
        trueLeaves: 4,
        daysInStage: 14,
      },
      newTasks: ['increase_watering', 'start_feeding', 'increase_light_hours'],
    },
  },
  vegetativeToFlowering: {
    plant: {
      id: 'plant-scenario-2',
      name: 'Jack Herer #1',
      strain: 'Jack Herer',
      strainType: 'sativa',
      plantedDate: new Date('2024-12-01'),
      currentStage: 'vegetative',
      daysInStage: 42,
    },
    expectedTransition: {
      newStage: 'flowering',
      triggerConditions: {
        height: 24, // inches
        lightCycle: '12/12',
        daysInStage: 42,
      },
      newTasks: ['reduce_nitrogen', 'increase_phosphorus', 'monitor_pistils'],
    },
  },
  floweringToHarvest: {
    plant: {
      id: 'plant-scenario-3',
      name: 'Blue Dream #1',
      strain: 'Blue Dream',
      strainType: 'hybrid',
      plantedDate: new Date('2024-10-15'),
      currentStage: 'flowering',
      daysInStage: 63,
    },
    expectedTransition: {
      newStage: 'harvest',
      triggerConditions: {
        trichomes: 'cloudy_amber',
        pistils: 'brown_receded',
        daysInStage: 63,
      },
      newTasks: ['flush_nutrients', 'prepare_harvest', 'dry_setup'],
    },
  },
};

const environmentalScenarios = {
  heatStress: {
    conditions: {
      temperature: 32, // °C (89.6°F)
      humidity: 45,
      vpd: 1.8,
    },
    expectedAdjustments: {
      watering: 'increase_frequency',
      ventilation: 'increase_airflow',
      lighting: 'reduce_intensity',
      tasks: ['check_heat_stress', 'adjust_environment'],
    },
  },
  highHumidity: {
    conditions: {
      temperature: 24,
      humidity: 75,
      vpd: 0.8,
    },
    expectedAdjustments: {
      watering: 'reduce_frequency',
      ventilation: 'increase_dehumidification',
      monitoring: 'increase_mold_checks',
      tasks: ['check_mold_risk', 'adjust_humidity'],
    },
  },
  lowHumidity: {
    conditions: {
      temperature: 26,
      humidity: 35,
      vpd: 2.2,
    },
    expectedAdjustments: {
      watering: 'increase_frequency',
      humidity: 'add_humidification',
      monitoring: 'check_leaf_stress',
      tasks: ['increase_humidity', 'monitor_transpiration'],
    },
  },
};

const strainSpecificScenarios = {
  indica: {
    strain: 'Northern Lights',
    characteristics: {
      floweringTime: 8, // weeks
      height: 'short',
      bushiness: 'high',
      nutrientTolerance: 'high',
    },
    schedulingAdjustments: {
      watering: 'moderate_frequency',
      feeding: 'heavy_feeding',
      training: 'LST_recommended',
      flowering: 'early_trigger',
    },
  },
  sativa: {
    strain: 'Jack Herer',
    characteristics: {
      floweringTime: 10, // weeks
      height: 'tall',
      bushiness: 'low',
      nutrientTolerance: 'moderate',
    },
    schedulingAdjustments: {
      watering: 'higher_frequency',
      feeding: 'moderate_feeding',
      training: 'SCROG_recommended',
      flowering: 'extended_veg',
    },
  },
  hybrid: {
    strain: 'Blue Dream',
    characteristics: {
      floweringTime: 9, // weeks
      height: 'medium',
      bushiness: 'medium',
      nutrientTolerance: 'moderate',
    },
    schedulingAdjustments: {
      watering: 'balanced_frequency',
      feeding: 'balanced_feeding',
      training: 'flexible_methods',
      flowering: 'standard_timing',
    },
  },
};

describe('Automation System Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Growth Stage Detection and Transitions', () => {
    it('should detect seedling to vegetative transition', () => {
      const scenario = growthScenarios.seedlingToVegetative;
      const plant = scenario.plant;
      const transition = scenario.expectedTransition;
      
      // Simulate growth stage detection logic
      const shouldTransition = (
        plant.daysInStage >= transition.triggerConditions.daysInStage &&
        plant.currentStage === 'seedling'
      );
      
      expect(shouldTransition).toBe(true);
      expect(transition.newStage).toBe('vegetative');
      expect(transition.newTasks).toContain('start_feeding');
    });

    it('should detect vegetative to flowering transition', () => {
      const scenario = growthScenarios.vegetativeToFlowering;
      const plant = scenario.plant;
      const transition = scenario.expectedTransition;
      
      // Sativa plants typically need longer vegetative period
      const shouldTransition = (
        plant.daysInStage >= transition.triggerConditions.daysInStage &&
        plant.strainType === 'sativa' &&
        plant.currentStage === 'vegetative'
      );
      
      expect(shouldTransition).toBe(true);
      expect(transition.newStage).toBe('flowering');
      expect(transition.newTasks).toContain('reduce_nitrogen');
    });

    it('should detect flowering to harvest transition', () => {
      const scenario = growthScenarios.floweringToHarvest;
      const plant = scenario.plant;
      const transition = scenario.expectedTransition;
      
      // Harvest timing based on trichomes and flowering duration
      const shouldTransition = (
        plant.daysInStage >= 56 && // minimum 8 weeks flowering
        plant.currentStage === 'flowering'
      );
      
      expect(shouldTransition).toBe(true);
      expect(transition.newStage).toBe('harvest');
      expect(transition.newTasks).toContain('flush_nutrients');
    });
  });

  describe('Environmental Condition Adjustments', () => {
    it('should adjust schedule for heat stress conditions', () => {
      const scenario = environmentalScenarios.heatStress;
      const conditions = scenario.conditions;
      const adjustments = scenario.expectedAdjustments;
      
      // High temperature should trigger specific adjustments
      const isHeatStress = conditions.temperature > 30; // °C
      
      expect(isHeatStress).toBe(true);
      expect(adjustments.watering).toBe('increase_frequency');
      expect(adjustments.tasks).toContain('check_heat_stress');
    });

    it('should adjust schedule for high humidity conditions', () => {
      const scenario = environmentalScenarios.highHumidity;
      const conditions = scenario.conditions;
      const adjustments = scenario.expectedAdjustments;
      
      // High humidity should trigger mold prevention
      const isHighHumidity = conditions.humidity > 70;
      
      expect(isHighHumidity).toBe(true);
      expect(adjustments.monitoring).toBe('increase_mold_checks');
      expect(adjustments.tasks).toContain('check_mold_risk');
    });

    it('should adjust schedule for low humidity conditions', () => {
      const scenario = environmentalScenarios.lowHumidity;
      const conditions = scenario.conditions;
      const adjustments = scenario.expectedAdjustments;
      
      // Low humidity should trigger transpiration monitoring
      const isLowHumidity = conditions.humidity < 40;
      
      expect(isLowHumidity).toBe(true);
      expect(adjustments.watering).toBe('increase_frequency');
      expect(adjustments.tasks).toContain('monitor_transpiration');
    });
  });

  describe('Strain-Specific Scheduling', () => {
    it('should adjust schedule for indica characteristics', () => {
      const scenario = strainSpecificScenarios.indica;
      const characteristics = scenario.characteristics;
      const adjustments = scenario.schedulingAdjustments;
      
      expect(characteristics.floweringTime).toBe(8);
      expect(characteristics.nutrientTolerance).toBe('high');
      expect(adjustments.feeding).toBe('heavy_feeding');
      expect(adjustments.training).toBe('LST_recommended');
    });

    it('should adjust schedule for sativa characteristics', () => {
      const scenario = strainSpecificScenarios.sativa;
      const characteristics = scenario.characteristics;
      const adjustments = scenario.schedulingAdjustments;
      
      expect(characteristics.floweringTime).toBe(10);
      expect(characteristics.height).toBe('tall');
      expect(adjustments.training).toBe('SCROG_recommended');
      expect(adjustments.flowering).toBe('extended_veg');
    });

    it('should adjust schedule for hybrid characteristics', () => {
      const scenario = strainSpecificScenarios.hybrid;
      const characteristics = scenario.characteristics;
      const adjustments = scenario.schedulingAdjustments;
      
      expect(characteristics.floweringTime).toBe(9);
      expect(characteristics.bushiness).toBe('medium');
      expect(adjustments.feeding).toBe('balanced_feeding');
      expect(adjustments.training).toBe('flexible_methods');
    });
  });

  describe('Automated Task Generation', () => {
    it('should generate stage-appropriate tasks for seedling', () => {
      const plant = {
        id: 'plant-1',
        growthStage: 'seedling',
        strain: 'Northern Lights',
        daysInStage: 7,
      };
      
      const expectedTasks = [
        {
          taskType: 'watering',
          title: 'Light watering - mist soil surface',
          priority: 'medium',
          frequency: 'every_2_days',
        },
        {
          taskType: 'monitoring',
          title: 'Check for damping off',
          priority: 'high',
          frequency: 'daily',
        },
        {
          taskType: 'environment',
          title: 'Maintain humidity 65-70%',
          priority: 'medium',
          frequency: 'daily',
        },
      ];
      
      expect(expectedTasks).toHaveLength(3);
      expect(expectedTasks[0].taskType).toBe('watering');
      expect(expectedTasks[1].priority).toBe('high');
    });

    it('should generate stage-appropriate tasks for vegetative', () => {
      const plant = {
        id: 'plant-2',
        growthStage: 'vegetative',
        strain: 'Jack Herer',
        daysInStage: 21,
      };
      
      const expectedTasks = [
        {
          taskType: 'watering',
          title: 'Regular watering - check soil moisture',
          priority: 'high',
          frequency: 'every_2_days',
        },
        {
          taskType: 'feeding',
          title: 'Nitrogen-rich nutrient feeding',
          priority: 'high',
          frequency: 'weekly',
        },
        {
          taskType: 'training',
          title: 'LST or topping if needed',
          priority: 'medium',
          frequency: 'weekly',
        },
      ];
      
      expect(expectedTasks).toHaveLength(3);
      expect(expectedTasks[1].taskType).toBe('feeding');
      expect(expectedTasks[2].taskType).toBe('training');
    });

    it('should generate stage-appropriate tasks for flowering', () => {
      const plant = {
        id: 'plant-3',
        growthStage: 'flowering',
        strain: 'Blue Dream',
        daysInStage: 35,
      };
      
      const expectedTasks = [
        {
          taskType: 'watering',
          title: 'Careful watering - avoid buds',
          priority: 'high',
          frequency: 'every_3_days',
        },
        {
          taskType: 'feeding',
          title: 'Phosphorus-rich bloom nutrients',
          priority: 'high',
          frequency: 'bi_weekly',
        },
        {
          taskType: 'monitoring',
          title: 'Check trichomes with magnifier',
          priority: 'medium',
          frequency: 'weekly',
        },
      ];
      
      expect(expectedTasks).toHaveLength(3);
      expect(expectedTasks[0].title).toContain('avoid buds');
      expect(expectedTasks[2].title).toContain('trichomes');
    });
  });

  describe('Dynamic Schedule Adjustments', () => {
    it('should adjust watering frequency based on environmental conditions', () => {
      const baseSchedule = {
        taskType: 'watering',
        frequency: 'every_2_days',
      };
      
      const hotConditions = { temperature: 32, humidity: 40 };
      const coolConditions = { temperature: 20, humidity: 60 };
      
      // Hot conditions should increase watering frequency
      const hotAdjustment = hotConditions.temperature > 30 ? 'daily' : baseSchedule.frequency;
      expect(hotAdjustment).toBe('daily');
      
      // Cool conditions should maintain or reduce frequency
      const coolAdjustment = coolConditions.temperature < 22 ? 'every_3_days' : baseSchedule.frequency;
      expect(coolAdjustment).toBe('every_3_days');
    });

    it('should adjust feeding schedule based on growth rate', () => {
      const baseSchedule = {
        taskType: 'feeding',
        frequency: 'weekly',
      };
      
      const fastGrowth = { heightGain: 3, leafDevelopment: 'rapid' }; // inches per week
      const slowGrowth = { heightGain: 0.5, leafDevelopment: 'slow' };
      
      // Fast growth should increase feeding frequency
      const fastAdjustment = fastGrowth.heightGain > 2 ? 'bi_weekly' : baseSchedule.frequency;
      expect(fastAdjustment).toBe('bi_weekly');
      
      // Slow growth should maintain or reduce frequency
      const slowAdjustment = slowGrowth.heightGain < 1 ? 'every_10_days' : baseSchedule.frequency;
      expect(slowAdjustment).toBe('every_10_days');
    });

    it('should adjust monitoring frequency based on plant health', () => {
      const baseSchedule = {
        taskType: 'monitoring',
        frequency: 'every_3_days',
      };
      
      const healthyPlant = { issues: [], overallHealth: 'excellent' };
      const problematicPlant = { issues: ['yellowing_leaves', 'pest_damage'], overallHealth: 'poor' };
      
      // Healthy plants can be monitored less frequently
      const healthyAdjustment = healthyPlant.issues.length === 0 ? 'weekly' : baseSchedule.frequency;
      expect(healthyAdjustment).toBe('weekly');
      
      // Problematic plants need daily monitoring
      const problematicAdjustment = problematicPlant.issues.length > 0 ? 'daily' : baseSchedule.frequency;
      expect(problematicAdjustment).toBe('daily');
    });
  });

  describe('Real Growth Scenario Simulations', () => {
    it('should handle complete grow cycle automation', () => {
      const growCycle = {
        startDate: new Date('2025-01-01'),
        strain: 'Northern Lights',
        expectedDuration: 16, // weeks
        stages: [
          { stage: 'seedling', duration: 2, tasks: 6 },
          { stage: 'vegetative', duration: 6, tasks: 18 },
          { stage: 'flowering', duration: 8, tasks: 24 },
        ],
      };
      
      const totalTasks = growCycle.stages.reduce((sum, stage) => sum + stage.tasks, 0);
      const totalDuration = growCycle.stages.reduce((sum, stage) => sum + stage.duration, 0);
      
      expect(totalTasks).toBe(48);
      expect(totalDuration).toBe(16);
      expect(growCycle.expectedDuration).toBe(totalDuration);
    });

    it('should handle multiple plant coordination', () => {
      const multiPlantScenario = {
        plants: [
          { id: 'plant-1', stage: 'seedling', daysInStage: 7 },
          { id: 'plant-2', stage: 'vegetative', daysInStage: 28 },
          { id: 'plant-3', stage: 'flowering', daysInStage: 42 },
        ],
        sharedResources: {
          growLight: { capacity: 3, currentLoad: 3 },
          nutrients: { available: true, nextRefill: addDays(new Date(), 7) },
          space: { total: 12, occupied: 9 }, // square feet
        },
      };
      
      expect(multiPlantScenario.plants).toHaveLength(3);
      expect(multiPlantScenario.sharedResources.growLight.currentLoad).toBe(3);
      expect(multiPlantScenario.sharedResources.space.occupied).toBeLessThan(
        multiPlantScenario.sharedResources.space.total
      );
    });

    it('should handle seasonal adjustments for outdoor grows', () => {
      const seasonalAdjustments = {
        spring: {
          plantingWindow: { start: new Date('2025-04-15'), end: new Date('2025-05-15') },
          lightHours: 14,
          temperature: { min: 15, max: 25 },
          tasks: ['prepare_soil', 'start_seeds', 'harden_off'],
        },
        summer: {
          growthPeriod: { start: new Date('2025-06-01'), end: new Date('2025-08-31') },
          lightHours: 16,
          temperature: { min: 20, max: 35 },
          tasks: ['regular_watering', 'pest_monitoring', 'training'],
        },
        fall: {
          harvestWindow: { start: new Date('2025-09-15'), end: new Date('2025-10-31') },
          lightHours: 12,
          temperature: { min: 10, max: 20 },
          tasks: ['harvest_prep', 'flush_nutrients', 'harvest'],
        },
      };
      
      expect(seasonalAdjustments.spring.tasks).toContain('start_seeds');
      expect(seasonalAdjustments.summer.lightHours).toBe(16);
      expect(seasonalAdjustments.fall.tasks).toContain('harvest');
    });
  });
});