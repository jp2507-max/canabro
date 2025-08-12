import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { PlantTaskIntegration } from '../lib/services/PlantTaskIntegration';
import { Plant } from '../lib/models/Plant';

jest.mock('../lib/models', () => ({
  database: {
    write: jest.fn(async (cb: any) => cb()),
    get: jest.fn(() => ({
      query: jest.fn(() => ({ fetch: jest.fn().mockResolvedValue([]) })),
      create: jest.fn((cb: any) => { const t: any = {}; cb(t); return t; }),
      find: jest.fn(async () => ({ id: 'template-1' })),
    })),
  },
}));

jest.mock('../lib/services/TaskSchedulingAdapter', () => ({
  TaskSchedulingAdapter: {
    migrateCareRemindersToTasks: jest.fn(async () => []),
    syncTasksToCareReminders: jest.fn(async () => {}),
    scheduleTaskNotifications: jest.fn(async () => {}),
    updateTasksForGrowthStageChange: jest.fn(async () => {}),
  },
}));

jest.mock('../lib/services/TaskAutomationService', () => ({
  TaskAutomationService: {
    scheduleForGrowthStage: jest.fn(async () => [{ title: 'Water', taskType: 'watering', update: jest.fn() }]),
    generateRecurringTasks: jest.fn(async () => []),
  },
}));

jest.mock('../lib/services/StrainTaskGenerator', () => ({
  StrainTaskGenerator: {
    generateAnchoredTasks: jest.fn(async () => [{ title: 'Pre-harvest checks', taskType: 'inspection' }]),
  },
}));

describe('PlantTaskIntegration scheduling flow', () => {
  beforeEach(() => jest.clearAllMocks());

  it('schedules base + anchored tasks and optionally recurring/notifications', async () => {
    const plant: Partial<Plant> = {
      id: 'plant-1',
      name: 'Test Plant',
      userId: 'user-1',
      growthStage: 'vegetative' as any,
      strainId: 'strain-1',
      plantedDate: new Date().toISOString(),
    };

    const res = await PlantTaskIntegration.scheduleTasksForPlant(plant as Plant, {
      syncWithCareReminders: true,
      scheduleNotifications: true,
    });

    expect(res.tasks.length).toBeGreaterThan(0);
    expect(res.errors.length).toBe(0);
  });
});


