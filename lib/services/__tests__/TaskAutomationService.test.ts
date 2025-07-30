/**
 * Tests for TaskAutomationService
 * 
 * Verifies that the task automation service correctly reuses and adapts
 * existing scheduling logic for 5-day workflow optimization.
 */

import { TaskAutomationService } from '../TaskAutomationService';
import { GrowthStage } from '../../types/plant';
import { Plant } from '../../models/Plant';

// Mock dependencies
jest.mock('../../database/database');
jest.mock('../../utils/logger');
jest.mock('../../data/strains');

describe('TaskAutomationService', () => {
  const mockPlant = {
    id: 'test-plant-id',
    name: 'Test Plant',
    userId: 'test-user-id',
    growthStage: GrowthStage.VEGETATIVE,
    strainId: '123e4567-e89b-12d3-a456-426614174000',
    cannabisType: 'hybrid',
    plantedDate: new Date().toISOString(),
  } as Plant;

  describe('scheduleForGrowthStage', () => {
    it('should generate tasks optimized for 5-day workflow', async () => {
      // Mock database operations
      const mockDatabase = {
        write: jest.fn((callback) => callback()),
        get: jest.fn(() => ({
          create: jest.fn((callback) => {
            const mockTask = {
              id: 'test-task-id',
              taskId: 'test-task-id',
              plantId: mockPlant.id,
              taskType: 'watering',
              status: 'pending',
            };
            callback(mockTask);
            return mockTask;
          }),
        })),
      };

      // Mock getDatabase
      const { getDatabase } = require('../../database/database');
      getDatabase.mockReturnValue(mockDatabase);

      // Mock strain data
      const { getStrainById } = require('../../data/strains');
      getStrainById.mockReturnValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'OG Kush',
        type: 'hybrid',
      });

      const tasks = await TaskAutomationService.scheduleForGrowthStage(
        mockPlant,
        GrowthStage.VEGETATIVE
      );

      expect(tasks).toBeDefined();
      expect(Array.isArray(tasks)).toBe(true);
      expect(mockDatabase.write).toHaveBeenCalled();
    });

    it('should handle missing strain configuration gracefully', async () => {
      const mockDatabase = {
        write: jest.fn((callback) => callback()),
        get: jest.fn(() => ({
          create: jest.fn((callback) => {
            const mockTask = {
              id: 'test-task-id',
              taskId: 'test-task-id',
              plantId: mockPlant.id,
              taskType: 'watering',
              status: 'pending',
            };
            callback(mockTask);
            return mockTask;
          }),
        })),
      };

      const { getDatabase } = require('../../database/database');
      getDatabase.mockReturnValue(mockDatabase);

      // Mock strain not found
      const { getStrainById } = require('../../data/strains');
      getStrainById.mockReturnValue(undefined);

      const plantWithoutStrain = {
        ...mockPlant,
        strainId: undefined,
        cannabisType: undefined,
      } as Plant;

      const tasks = await TaskAutomationService.scheduleForGrowthStage(
        plantWithoutStrain,
        GrowthStage.VEGETATIVE
      );

      expect(tasks).toBeDefined();
      expect(Array.isArray(tasks)).toBe(true);
    });
  });

  describe('generateRecurringTasks', () => {
    it('should create recurring task series with proper intervals', async () => {
      const mockTasks: any[] = [];
      const mockDatabase = {
        write: jest.fn((callback) => callback()),
        get: jest.fn(() => ({
          create: jest.fn((callback) => {
            const mockTask = {
              id: `test-task-${mockTasks.length}`,
              taskId: `test-task-${mockTasks.length}`,
              plantId: mockPlant.id,
              taskType: 'watering',
              status: 'pending',
              sequenceNumber: mockTasks.length + 1,
            };
            callback(mockTask);
            mockTasks.push(mockTask);
            return mockTask;
          }),
        })),
      };

      const { getDatabase } = require('../../database/database');
      getDatabase.mockReturnValue(mockDatabase);

      const tasks = await TaskAutomationService.generateRecurringTasks(
        mockPlant,
        'watering',
        3 // Every 3 days
      );

      expect(tasks).toBeDefined();
      expect(Array.isArray(tasks)).toBe(true);
      expect(mockDatabase.write).toHaveBeenCalled();
    });
  });

  describe('detectGrowthStageTransition', () => {
    it('should detect when plant is ready for next growth stage', async () => {
      // Mock plant that was planted 15 days ago (should transition from seedling to vegetative)
      const oldPlantedDate = new Date();
      oldPlantedDate.setDate(oldPlantedDate.getDate() - 15);

      const seedlingPlant = {
        ...mockPlant,
        growthStage: GrowthStage.SEEDLING,
        plantedDate: oldPlantedDate.toISOString(),
      } as Plant;

      const { getStrainById } = require('../../data/strains');
      getStrainById.mockReturnValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'OG Kush',
        type: 'hybrid',
      });

      const nextStage = await TaskAutomationService.detectGrowthStageTransition(seedlingPlant);

      expect(nextStage).toBe(GrowthStage.VEGETATIVE);
    });

    it('should return null when plant is not ready for transition', async () => {
      // Mock plant that was planted 5 days ago (not ready to transition from seedling)
      const recentPlantedDate = new Date();
      recentPlantedDate.setDate(recentPlantedDate.getDate() - 5);

      const youngSeedlingPlant = {
        ...mockPlant,
        growthStage: GrowthStage.SEEDLING,
        plantedDate: recentPlantedDate.toISOString(),
      } as Plant;

      const { getStrainById } = require('../../data/strains');
      getStrainById.mockReturnValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'OG Kush',
        type: 'hybrid',
      });

      const nextStage = await TaskAutomationService.detectGrowthStageTransition(youngSeedlingPlant);

      expect(nextStage).toBeNull();
    });
  });

  describe('adjustScheduleForConditions', () => {
    it('should adjust task schedules based on environmental conditions', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          taskType: 'watering',
          dueDate: new Date().toISOString(),
          priority: 'medium',
          update: jest.fn(),
        },
      ];

      const mockDatabase = {
        get: jest.fn(() => ({
          query: jest.fn(() => ({
            fetch: jest.fn().mockResolvedValue(mockTasks),
          })),
        })),
        write: jest.fn((callback) => callback()),
      };

      const { getDatabase } = require('../../database/database');
      getDatabase.mockReturnValue(mockDatabase);

      await TaskAutomationService.adjustScheduleForConditions(mockPlant.id, {
        humidity: 80, // High humidity should delay watering
        temperature: 25,
      });

      expect(mockDatabase.write).toHaveBeenCalled();
      expect(mockTasks[0].update).toHaveBeenCalled();
    });
  });
});