/**
 * Tests for StrainCalendarIntegrationService
 * 
 * Tests strain-specific task scheduling, template recommendations,
 * flowering predictions, and strain comparisons.
 */

import { StrainCalendarIntegrationService } from '../StrainCalendarIntegrationService';
import { Plant } from '../../models/Plant';
import { GrowthStage } from '../../types/plant';

// Mock dependencies
jest.mock('../../data/strains', () => ({
  getStrainById: jest.fn(),
}));

jest.mock('../../models', () => ({
  database: {
    write: jest.fn((callback) => callback()),
    get: jest.fn(() => ({
      query: jest.fn(() => ({
        fetch: jest.fn(),
      })),
    })),
  },
}));

jest.mock('../TaskAutomationService', () => ({
  TaskAutomationService: {
    scheduleForGrowthStage: jest.fn(),
  },
}));

describe('StrainCalendarIntegrationService', () => {
  const mockPlant = {
    id: 'plant-1',
    name: 'Test Plant',
    strainId: 'strain-1',
    strain: 'OG Kush',
    plantedDate: '2024-01-01',
    growthStage: 'vegetative',
    userId: 'user-1',
  } as Plant;

  const mockStrain = {
    id: 'strain-1',
    name: 'OG Kush',
    type: 'hybrid',
    floweringTime: 8,
    thcPercentage: 20,
    growDifficulty: 'moderate',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock getStrainById
    const { getStrainById } = require('../../data/strains');
    getStrainById.mockReturnValue(mockStrain);
  });

  describe('scheduleStrainSpecificTasks', () => {
    it('should generate strain-specific tasks', async () => {
      const { TaskAutomationService } = require('../TaskAutomationService');
      const mockBaseTasks = [
        {
          id: 'task-1',
          taskType: 'watering',
          dueDate: '2024-01-02T10:00:00Z',
          priority: 'medium',
          update: jest.fn(),
        },
      ];
      TaskAutomationService.scheduleForGrowthStage.mockResolvedValue(mockBaseTasks);

      const tasks = await StrainCalendarIntegrationService.scheduleStrainSpecificTasks(
        mockPlant,
        'vegetative' as GrowthStage
      );

      expect(TaskAutomationService.scheduleForGrowthStage).toHaveBeenCalledWith(
        mockPlant,
        'vegetative'
      );
      expect(tasks).toHaveLength(1);
      expect(mockBaseTasks[0].update).toHaveBeenCalled();
    });

    it('should handle plants without strain data', async () => {
      const { getStrainById } = require('../../data/strains');
      getStrainById.mockReturnValue(null);

      const { TaskAutomationService } = require('../TaskAutomationService');
      const mockBaseTasks = [];
      TaskAutomationService.scheduleForGrowthStage.mockResolvedValue(mockBaseTasks);

      const plantWithoutStrain = { ...mockPlant, strainId: null };
      const tasks = await StrainCalendarIntegrationService.scheduleStrainSpecificTasks(
        plantWithoutStrain,
        'vegetative' as GrowthStage
      );

      expect(TaskAutomationService.scheduleForGrowthStage).toHaveBeenCalledWith(
        plantWithoutStrain,
        'vegetative'
      );
      expect(tasks).toEqual(mockBaseTasks);
    });
  });

  describe('getStrainBasedTemplateRecommendations', () => {
    it('should return template recommendations for a strain', async () => {
      const { database } = require('../../models');
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'Hybrid Indoor Schedule',
          strainType: 'hybrid',
          durationWeeks: 16,
          usageCount: 15,
        },
        {
          id: 'template-2',
          name: 'General Schedule',
          strainType: 'unknown',
          durationWeeks: 18,
          usageCount: 5,
        },
      ];

      database.get.mockReturnValue({
        query: jest.fn().mockReturnValue({
          fetch: jest.fn().mockResolvedValue(mockTemplates),
        }),
      });

      const recommendations = await StrainCalendarIntegrationService.getStrainBasedTemplateRecommendations(
        'strain-1',
        'indoor'
      );

      expect(recommendations).toHaveLength(1); // Only high-scoring recommendations
      expect(recommendations[0].templateId).toBe('template-1');
      expect(recommendations[0].matchScore).toBeGreaterThan(30);
      expect(recommendations[0].reasons).toContain('Perfect strain type match (hybrid)');
    });

    it('should handle strain not found', async () => {
      const { getStrainById } = require('../../data/strains');
      getStrainById.mockReturnValue(null);

      const recommendations = await StrainCalendarIntegrationService.getStrainBasedTemplateRecommendations(
        'invalid-strain',
        'indoor'
      );

      expect(recommendations).toEqual([]);
    });
  });

  describe('predictFloweringAndHarvest', () => {
    it('should predict flowering and harvest dates', async () => {
      const prediction = await StrainCalendarIntegrationService.predictFloweringAndHarvest(mockPlant);

      expect(prediction).toBeTruthy();
      expect(prediction!.plantId).toBe(mockPlant.id);
      expect(prediction!.strainName).toBe(mockStrain.name);
      expect(prediction!.expectedFloweringStart).toBeInstanceOf(Date);
      expect(prediction!.expectedHarvestDate).toBeInstanceOf(Date);
      expect(prediction!.confidenceLevel).toBe('high');
      expect(prediction!.factors).toContain('Strain flowering time: 8 weeks');
    });

    it('should handle plants without strain data', async () => {
      const { getStrainById } = require('../../data/strains');
      getStrainById.mockReturnValue(null);

      const plantWithoutStrain = { ...mockPlant, strainId: null };
      const prediction = await StrainCalendarIntegrationService.predictFloweringAndHarvest(plantWithoutStrain);

      expect(prediction).toBeNull();
    });

    it('should handle strains without flowering time', async () => {
      const { getStrainById } = require('../../data/strains');
      getStrainById.mockReturnValue({ ...mockStrain, floweringTime: null });

      const prediction = await StrainCalendarIntegrationService.predictFloweringAndHarvest(mockPlant);

      expect(prediction).toBeNull();
    });
  });

  describe('compareStrainSchedules', () => {
    const mockStrainB = {
      id: 'strain-2',
      name: 'Blue Dream',
      type: 'sativa',
      floweringTime: 10,
      thcPercentage: 18,
      growDifficulty: 'easy',
    };

    it('should compare two strain schedules', async () => {
      const { getStrainById } = require('../../data/strains');
      getStrainById.mockImplementation((id: string) => {
        if (id === 'strain-1') return mockStrain;
        if (id === 'strain-2') return mockStrainB;
        return null;
      });

      const comparison = await StrainCalendarIntegrationService.compareStrainSchedules(
        'strain-1',
        'strain-2'
      );

      expect(comparison).toBeTruthy();
      expect(comparison!.strainA.name).toBe('OG Kush');
      expect(comparison!.strainB.name).toBe('Blue Dream');
      expect(comparison!.taskFrequencyDifferences).toBeDefined();
      expect(comparison!.timelineDifferences).toBeDefined();
      expect(comparison!.recommendations).toBeInstanceOf(Array);
    });

    it('should handle invalid strain IDs', async () => {
      const { getStrainById } = require('../../data/strains');
      getStrainById.mockReturnValue(null);

      const comparison = await StrainCalendarIntegrationService.compareStrainSchedules(
        'invalid-1',
        'invalid-2'
      );

      expect(comparison).toBeNull();
    });

    it('should generate optimization recommendations', async () => {
      const { getStrainById } = require('../../data/strains');
      getStrainById.mockImplementation((id: string) => {
        if (id === 'strain-1') return mockStrain;
        if (id === 'strain-2') return mockStrainB;
        return null;
      });

      const comparison = await StrainCalendarIntegrationService.compareStrainSchedules(
        'strain-1',
        'strain-2'
      );

      expect(comparison!.recommendations).toContain(
        'Blue Dream takes 2 weeks longer to flower'
      );
      expect(comparison!.recommendations).toContain(
        'Different strain types may require different care schedules'
      );
    });
  });

  describe('strain task adjustments', () => {
    it('should apply sativa-specific adjustments', async () => {
      const { getStrainById } = require('../../data/strains');
      const sativaStrain = { ...mockStrain, type: 'sativa' };
      getStrainById.mockReturnValue(sativaStrain);

      const { TaskAutomationService } = require('../TaskAutomationService');
      const mockBaseTasks = [
        {
          id: 'task-1',
          taskType: 'watering',
          dueDate: '2024-01-02T10:00:00Z',
          priority: 'medium',
          update: jest.fn(),
        },
        {
          id: 'task-2',
          taskType: 'training',
          dueDate: '2024-01-03T10:00:00Z',
          priority: 'medium',
          update: jest.fn(),
        },
      ];
      TaskAutomationService.scheduleForGrowthStage.mockResolvedValue(mockBaseTasks);

      const tasks = await StrainCalendarIntegrationService.scheduleStrainSpecificTasks(
        { ...mockPlant, strainId: 'sativa-strain' },
        'vegetative' as GrowthStage
      );

      // Verify that sativa-specific adjustments were applied
      expect(mockBaseTasks[0].update).toHaveBeenCalled(); // Watering frequency increased
      expect(mockBaseTasks[1].update).toHaveBeenCalled(); // Training priority increased
    });

    it('should apply difficulty-based adjustments', async () => {
      const { getStrainById } = require('../../data/strains');
      const hardStrain = { ...mockStrain, growDifficulty: 'hard' };
      getStrainById.mockReturnValue(hardStrain);

      const { TaskAutomationService } = require('../TaskAutomationService');
      const mockBaseTasks = [
        {
          id: 'task-1',
          taskType: 'inspection',
          dueDate: '2024-01-02T10:00:00Z',
          priority: 'medium',
          update: jest.fn(),
        },
      ];
      TaskAutomationService.scheduleForGrowthStage.mockResolvedValue(mockBaseTasks);

      const tasks = await StrainCalendarIntegrationService.scheduleStrainSpecificTasks(
        { ...mockPlant, strainId: 'hard-strain' },
        'vegetative' as GrowthStage
      );

      // Verify that difficulty-based adjustments were applied
      expect(mockBaseTasks[0].update).toHaveBeenCalled(); // Inspection frequency and priority increased
    });
  });
});