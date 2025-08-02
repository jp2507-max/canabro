/**
 * Growth Stage Integration Tests
 * 
 * Tests for the growth stage integration functionality
 * to ensure task prioritization and milestone tracking work correctly.
 */

import { type GrowthStage, GROWTH_STAGES } from '../../types/plant';
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
          growthStage: GROWTH_STAGES.VEGETATIVE,
          plantedDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(), // 35 days ago
          userId: 'user-1',
          strainId: null,
          cannabisType: 'hybrid',
        };

        type DetectPlant = {
          id: string;
          name: string;
          growthStage: GrowthStage;
          plantedDate: string;
          userId: string;
          strainId: string | null;
          cannabisType: 'indica' | 'sativa' | 'hybrid';
        };
        const nextStage = await TaskAutomationService.detectGrowthStageTransition(
          mockPlant as unknown as import('../../models/Plant').Plant
        );
        
        // Should transition from vegetative (30 days) to pre-flower after 35 days
        expect(nextStage).toBe(GROWTH_STAGES.PRE_FLOWER);
      });

      it('should return null when plant is not ready for transition', async () => {
        const mockPlant = {
          id: 'plant-1',
          name: 'Test Plant',
          growthStage: GROWTH_STAGES.VEGETATIVE,
          plantedDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
          userId: 'user-1',
          strainId: null,
          cannabisType: 'hybrid',
        };

        type DetectPlant = {
          id: string;
          name: string;
          growthStage: GrowthStage;
          plantedDate: string;
          userId: string;
          strainId: string | null;
          cannabisType: 'indica' | 'sativa' | 'hybrid';
        };
        // Cast to a compatible Plant from models (test-only bypass)
        const nextStage = await TaskAutomationService.detectGrowthStageTransition(
          mockPlant as unknown as import('../../models/Plant').Plant
        );
        
        // Should not transition yet (only 15 days, needs 30)
        expect(nextStage).toBeNull();
      });
    });

    describe('generateTaskTitle', () => {
      it('should generate appropriate task titles', () => {
        type TestableTaskAutomationService = {
          generateTaskTitle: (taskType: string, plantName: string) => string;
        };
        const svc = TaskAutomationService as unknown as TestableTaskAutomationService;
        const title = svc.generateTaskTitle('watering', 'Test Plant');
        expect(title).toBe('Water Test Plant');
      });
    });

    describe('generateTaskDescription', () => {
      it('should generate stage-appropriate task descriptions', () => {
        type TestableTaskAutomationService2 = {
          generateTaskDescription: (taskType: string, stage: GrowthStage) => string;
        };
        const svc2 = TaskAutomationService as unknown as TestableTaskAutomationService2;
        const description = svc2.generateTaskDescription(
          'watering',
          GROWTH_STAGES.FLOWERING
        );
        expect(description).toContain('avoid getting buds wet');
      });
    });

    describe('calculateTaskPriority', () => {
      it('should calculate correct priority for watering in flowering stage', () => {
        type SvcCalcPriority = {
          calculateTaskPriority: (taskType: string, stage: GrowthStage) => 'low' | 'medium' | 'high' | 'critical' | string;
        };
        const svcCalc = TaskAutomationService as unknown as SvcCalcPriority;
        const priority = svcCalc.calculateTaskPriority('watering', GROWTH_STAGES.FLOWERING);
        expect(priority).toBe('high');
      });

      it('should calculate correct priority for feeding in germination stage', () => {
        type SvcCalcPriority2 = {
          calculateTaskPriority: (taskType: string, stage: GrowthStage) => 'low' | 'medium' | 'high' | 'critical' | string;
        };
        const svcCalc2 = TaskAutomationService as unknown as SvcCalcPriority2;
        const priority = svcCalc2.calculateTaskPriority('feeding', GROWTH_STAGES.GERMINATION);
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
          growthStage: GROWTH_STAGES.VEGETATIVE,
          plantedDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
        };

        type ProgressPlant = {
          id: string;
          name: string;
          growthStage: GrowthStage;
          plantedDate: string;
        };
        const progress = await GrowthStageTaskPrioritization.calculateMilestoneProgress(
          mockPlant as unknown as import('../../models/Plant').Plant
        );
        
        // 15 days out of 30 expected = 50%
        expect(progress.progressPercentage).toBe(50);
        expect(progress.currentStage).toBe(GROWTH_STAGES.VEGETATIVE);
        expect(progress.nextStage).toBe(GROWTH_STAGES.PRE_FLOWER);
        expect(progress.isReadyForTransition).toBe(false);
      });

      it('should detect when ready for transition', async () => {
        const mockPlant = {
          id: 'plant-1',
          name: 'Test Plant',
          growthStage: GROWTH_STAGES.VEGETATIVE,
          plantedDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(), // 25 days ago
        };

        const progress = await GrowthStageTaskPrioritization.calculateMilestoneProgress(
          mockPlant as unknown as import('../../models/Plant').Plant
        );
        
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
            growthStage: GROWTH_STAGES.HARVEST,
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
            stage: GROWTH_STAGES.GERMINATION,
            expectedPriority: 'high',
          },
          {
            taskType: 'feeding' as TaskType,
            stage: GROWTH_STAGES.GERMINATION,
            expectedPriority: 'low',
          },
          {
            taskType: 'inspection' as TaskType,
            stage: GROWTH_STAGES.LATE_FLOWERING,
            expectedPriority: 'critical',
          },
          {
            taskType: 'harvest' as TaskType,
            stage: GROWTH_STAGES.HARVEST,
            expectedPriority: 'critical',
          },
        ];

    testCases.forEach(({ taskType, stage, expectedPriority }) => {
      it(`should assign ${expectedPriority} priority to ${taskType} in ${stage} stage`, () => {
        type SvcCalcPriority3 = {
          calculateTaskPriority: (taskType: string, stage: GrowthStage | (typeof GROWTH_STAGES)[keyof typeof GROWTH_STAGES]) => string;
        };
        const svcCalc3 = TaskAutomationService as unknown as SvcCalcPriority3;
        const priority = svcCalc3.calculateTaskPriority(taskType, stage);
        expect(priority).toBe(expectedPriority);
      });
    });
  });

  describe('Environmental Adjustments', () => {
    type SvcEnvAdjust = {
      calculateEnvironmentalAdjustments: (
        taskType: string,
        env: { humidity?: number; pH?: number }
      ) => { rescheduleHours?: number; newPriority?: string };
    };
    const svcEnv = TaskAutomationService as unknown as SvcEnvAdjust;

    it('should delay watering in high humidity', () => {
      const adjustments = svcEnv.calculateEnvironmentalAdjustments('watering', { humidity: 80 });
      
      expect(adjustments.rescheduleHours).toBe(12);
    });

    it('should prioritize watering in low humidity', () => {
      const adjustments = svcEnv.calculateEnvironmentalAdjustments('watering', { humidity: 30 });
      
      expect(adjustments.rescheduleHours).toBe(-6);
      expect(adjustments.newPriority).toBe('high');
    });

    it('should mark feeding as critical when pH is out of range', () => {
      const adjustments = svcEnv.calculateEnvironmentalAdjustments('feeding', { pH: 5.0 });
      
      expect(adjustments.newPriority).toBe('critical');
    });
  });
});
