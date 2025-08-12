import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { StrainTaskGenerator } from '../StrainTaskGenerator';
import { Plant } from '../../models/Plant';

jest.mock('../../models', () => ({
  database: {
    write: jest.fn(async (cb: any) => cb()),
    get: jest.fn(() => ({
      query: jest.fn(() => ({ fetch: jest.fn().mockResolvedValue([]) })),
      create: jest.fn((cb: any) => {
        const task: any = {
          update: jest.fn(),
        };
        cb(task);
        return task;
      }),
    })),
  },
}));

jest.mock('../../data/strains', () => ({
  getStrainById: jest.fn((id: string) => ({ id, name: 'Mock Strain', growDifficulty: 'Medium' })),
}));

describe('StrainTaskGenerator', () => {
  const basePlant: Partial<Plant> = {
    id: 'plant-1',
    userId: 'user-1',
    strainId: 'strain-1',
    predictedHarvestStart: new Date('2025-06-15') as any,
    predictedHarvestEnd: new Date('2025-06-25') as any,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates anchored tasks around harvest start with defaults', async () => {
    const tasks = await StrainTaskGenerator.generateAnchoredTasks(basePlant as Plant, {
      templateVersion: 1,
    });
    expect(tasks.length).toBeGreaterThanOrEqual(2); // pre-harvest + default optional flush/dark depending on flags
    // Ensure strain metadata and source are set
    expect((tasks[0] as any).strainMetadata).toBeDefined();
  });

  it('respects optional toggles (disable flush, enable dark period)', async () => {
    const tasks = await StrainTaskGenerator.generateAnchoredTasks(basePlant as Plant, {
      enableFlush: false,
      enableDarkPeriod: true,
    });
    // Should still have pre-harvest checks; dark period included; flush omitted
    const titles = tasks.map((t: any) => t.title);
    expect(titles).toContain('Pre-harvest checks');
    expect(titles).toContain('Dark period (optional)');
    expect(titles).not.toContain('Flush (optional)');
  });

  it('applies difficulty multiplier to anchor offsets (easy => earlier)', async () => {
    const { getStrainById } = require('../../data/strains');
    getStrainById.mockReturnValue({ id: 'strain-1', name: 'S', growDifficulty: 'Easy' });
    const tasks = await StrainTaskGenerator.generateAnchoredTasks(basePlant as Plant);
    const preHarvest = tasks.find((t: any) => t.title.includes('Pre-harvest'))!;
    const harvestStart = new Date(basePlant.predictedHarvestStart as any);
    // Easy (0.8x) -> offset -7 * 0.8 ≈ -6 days
    const expectedMin = new Date(harvestStart);
    expectedMin.setDate(expectedMin.getDate() - 7); // baseline -7
    const actualOffsetDays = Math.round((new Date(preHarvest.dueDate).getTime() - harvestStart.getTime()) / (1000*60*60*24));
    expect(actualOffsetDays).toBeLessThanOrEqual(-5); // allow rounding tolerance
  });

  it('regenerate deletes auto, unlocked and recreates anchors', async () => {
    const { database } = require('../../models');
    // Mock existing auto tasks to be deleted
    const existing = [
      { plantId: 'plant-1', source: 'auto', locked: false, markAsDeleted: jest.fn() },
      { plantId: 'plant-1', source: 'manual', locked: false, markAsDeleted: jest.fn() },
    ];
    (database.get as any).mockReturnValueOnce({ query: jest.fn(() => ({ fetch: jest.fn().mockResolvedValue(existing) })) });
    // After deletion, generation path
    (database.get as any).mockReturnValue({
      query: jest.fn(() => ({ fetch: jest.fn().mockResolvedValue([]) })),
      create: jest.fn((cb: any) => { const t: any = {}; cb(t); return t; }),
    });

    const res = await StrainTaskGenerator.regenerateForPlant(basePlant as Plant);
    expect(existing[0].markAsDeleted).toHaveBeenCalled();
    expect(res.created).toBeGreaterThan(0);
  });
});


