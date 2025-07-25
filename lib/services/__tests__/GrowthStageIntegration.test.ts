/**
 * Growth Stage Integration Tests
 * 
 * Tests for the growth stage integration functionality
 * to ensure task prioritization and milestone tracking work correctly.
 */

import { GrowthStage } from '../../types/plant';
import { TaskType } from '../../types/taskTypes';
import { GrowthStageTaskPrioritization } from '../GrowthStageTaskPrioritization';
import { TaskAutomationService } from '../TaskAutomationService';

// Mock the database and models
jest.mock('../../models', () => ({
  database: {
    get: jest.fn(() => ({
      find: jest.fn(),
      query: jest.fn(() => ({
        fetch: jest.fn(() => Promise.resolve([])),
      })),
      create: jest.fn(),
    })),
    write: jest.fn((callback) => callback()),
  },
}));

jest.mock('../../utils/logger', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('GrowthStageIntegration', () => {
  describe('TaskAutomationService', () => {
    describe('detectGrowthStageTransition', () => {
      it('should detect when a plant is ready for stage transition', async () => {
        const mockPlant = {
          id: 'plant-1',
          name: 'Test Plant',
          growthStage: GrowthStage.VEGETATIVE,
          plantedDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(), // 35 days ago
          userId: 'user-1',
          strainId: null,
          cannabisType: 'hybrid',
        };

        const nextStage = await TaskAutomationService.detectGrowthStageTransition(mockPlant as any);
        
        // Should transition from vegetative (30 days) to pre-flower after 35 days
        expect(nextStage).toBe(GrowthStage.PRE_FLOWER);
      });

      it('should return null when plant is not ready for transition', async () => {
        const mockPlant = {
          id: 'plant-1',
          name: 'Test Plant',
          growthStage: GrowthStage.VEGETATIVE,
          plantedDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
          userId: 'user-1',
          strainId: null,
          cannabisType: 'hybrid',
        };

        const nextStage = await TaskAutomationService.detectGrowthStageTransition(mockPlant as any);
        
        // Should not transition yet (only 15 days, needs 30)
        expect(nextStage).toBeNull();
      });
    });

    describe('generateTaskTitle', () => {
      it('should generate appropriate task titles', () => {
        const title = (TaskAutomationService as any).generateTaskTitle('watering', 'Test Plant');
        expect(title).toBe('Water Test Plant');
      });
    });

    describe('generateTaskDescription', () => {
      it('should generate stage-appropriate task descriptions', () => {
        const description = (TaskAutomationService as any).generateTaskDescription(
          'watering',
          GrowthStage.FLOWERING
        );
        expect(description).toContain('avoid getting buds wet');
      });
    });

    describe('calculateTaskPriority', () => {
      it('should calculate correct priority for watering in flowering stage', () => {
        const priority = (TaskAutomationService as any).calculateTaskPriority(
          'watering',
          GrowthStage.FLOWERING
        );
        expect(priority).toBe('high');
      });

      it('should calculate correct priority for feeding in germination stage', () => {
        const priority = (TaskAutomationService as any).calculateTaskPriority(
          'feeding',
          GrowthStage.GERMINATION
        );
        expect(priority).toBe('low');
      });
    });
  });

  describe('GrowthStageTaskPrioritization', () => {
    describe('calculateMilestoneProgress', () => {
      it('should calculate correct progress percentage', async () => {
        const mockPlant = {
          id: 'plant-1',
          name: 'Test Plant',
          growthStage: GrowthStage.VEGETATIVE,
          plantedDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
        };

        const progress = await GrowthStageTaskPrioritization.calculateMilestoneProgress(mockPlant as any);
        
        // 15 days out of 30 expected = 50%
        expect(progress.progressPercentage).toBe(50);
        expect(progress.currentStage).toBe(GrowthStage.VEGETATIVE);
        expect(progress.nextStage).toBe(GrowthStage.PRE_FLOWER);
        expect(progress.isReadyForTransition).toBe(false);
      });

      it('should detect when ready for transition', async () => {
        const mockPlant = {
          id: 'plant-1',
          name: 'Test Plant',
          growthStage: GrowthStage.VEGETATIVE,
          plantedDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(), // 25 days ago
        };

        const progress = await GrowthStageTaskPrioritization.calculateMilestoneProgress(mockPlant as any);
        
        // 25 days out of 30 expected = 83.33% (>80% threshold)
        expect(progress.progressPercentage).toBeGreaterThan(80);
        expect(progress.isReadyForTransition).toBe(true);
      });
    });

    describe('getCelebrationMilestones', () => {
      it('should generate celebration messages for harvest stage', async () => {
        // Mock the database query to return a plant in harvest stage
        const mockDatabase = require('../../models').database;
        mockDatabase.get.mockReturnValue({
          find: jest.fn().mockResolvedValue({
            id: 'plant-1',
            name: 'Test Plant',
            growthStage: GrowthStage.HARVEST,
            plantedDate: new Date().toISOString(),
          }),
        });

        const celebrations = await GrowthStageTaskPrioritization.getCelebrationMilestones('plant-1');
        
        expect(celebrations).toContain(expect.stringContaining('Harvest time'));
        expect(celebrations).toContain(expect.stringContaining('congratulations'));
      });
    });
  });

  describe('Priority Matrix', () => {
    const testCases = [
      {
        taskType: 'watering' as TaskType,
        stage: GrowthStage.GERMINATION,
        expectedPriority: 'high',
      },
      {
        taskType: 'feeding' as TaskType,
        stage: GrowthStage.GERMINATION,
        expectedPriority: 'low',
      },
      {
        taskType: 'inspection' as TaskType,
        stage: GrowthStage.LATE_FLOWERING,
        expectedPriority: 'critical',
      },
      {
        taskType: 'harvest' as TaskType,
        stage: GrowthStage.HARVEST,
        expectedPriority: 'critical',
      },
    ];

    testCases.forEach(({ taskType, stage, expectedPriority }) => {
      it(`should assign ${expectedPriority} priority to ${taskType} in ${stage} stage`, () => {
        const priority = (TaskAutomationService as any).calculateTaskPriority(taskType, stage);
        expect(priority).toBe(expectedPriority);
      });
    });
  });

  describe('Environmental Adjustments', () => {
    it('should delay watering in high humidity', () => {
      const adjustments = (TaskAutomationService as any).calculateEnvironmentalAdjustments(
        'watering',
        { humidity: 80 }
      );
      
      expect(adjustments.rescheduleHours).toBe(12);
    });

    it('should prioritize watering in low humidity', () => {
      const adjustments = (TaskAutomationService as any).calculateEnvironmentalAdjustments(
        'watering',
        { humidity: 30 }
      );
      
      expect(adjustments.rescheduleHours).toBe(-6);
      expect(adjustments.newPriority).toBe('high');
    });

    it('should mark feeding as critical when pH is out of range', () => {
      const adjustments = (TaskAutomationService as any).calculateEnvironmentalAdjustments(
        'feeding',
        { pH: 5.0 }
      );
      
      expect(adjustments.newPriority).toBe('critical');
    });
  });
});