import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { StrainTaskGenerator } from '../StrainTaskGenerator';
import { Plant } from '../../models/Plant';

const mockTasks: any[] = [];

jest.mock('../../models', () => ({
  database: {
    write: jest.fn(async (cb: any) => cb()),
    get: jest.fn(() => ({
      query: jest.fn(() => ({ fetch: jest.fn().mockResolvedValue(mockTasks) })),
      create: jest.fn((cb: any) => { const t: any = {}; cb(t); mockTasks.push(t); return t; }),
    })),
  },
}));

jest.mock('../../data/strains', () => ({
  getStrainById: jest.fn(() => ({ id: 'strain-1', name: 'Mock', growDifficulty: 'medium' })),
}));

describe('StrainTaskGenerator dedupe behavior', () => {
  beforeEach(() => { mockTasks.length = 0; jest.clearAllMocks(); });

  it('avoids creating duplicate anchor tasks for same day/type', async () => {
    const plant: Partial<Plant> = {
      id: 'p1',
      userId: 'u1',
      strainId: 'strain-1',
      predictedHarvestStart: new Date('2025-08-20') as any,
      predictedHarvestEnd: new Date('2025-08-30') as any,
    };

    // First generation
    const first = await StrainTaskGenerator.generateAnchoredTasks(plant as Plant, { enableFlush: true, enableDarkPeriod: true });
    expect(first.length).toBeGreaterThan(0);

    // Simulate existing auto tasks returned by query().fetch()
    (mockTasks as any).push(
      ...first.map((t: any) => ({ plantId: plant.id, source: 'auto', taskType: t.taskType, dueDate: t.dueDate }))
    );

    // Second generation should create zero new tasks due to dedupe
    const second = await StrainTaskGenerator.generateAnchoredTasks(plant as Plant, { enableFlush: true, enableDarkPeriod: true });
    expect(second.length).toBe(0);
  });
});


