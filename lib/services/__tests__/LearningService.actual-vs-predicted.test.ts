import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { LearningService } from '../LearningService';
import { Plant } from '../../models/Plant';

jest.mock('../../database/database', () => ({
  getDatabase: jest.fn(() => ({
    get: jest.fn(() => ({
      query: jest.fn(() => ({ fetch: jest.fn().mockResolvedValue([]) })),
    })),
  })),
}));

describe('LearningService.computeActualVsPredicted', () => {
  beforeEach(() => jest.clearAllMocks());

  it('computes deltas and errors from per-plant predicted fields', async () => {
    const plant: Partial<Plant> = {
      id: 'p1',
      name: 'Plant',
      userId: 'u1',
      baselineDate: new Date('2025-03-01') as any,
      predictedFlowerMinDays: 56,
      predictedFlowerMaxDays: 70,
      predictedHarvestStart: new Date('2025-05-01') as any,
      predictedHarvestEnd: new Date('2025-06-01') as any,
      yieldUnit: 'g_per_plant' as any,
      yieldMin: 200,
      yieldMax: 300,
      dryWeight: 260,
      harvestDate: new Date('2025-05-28') as any,
      plantMetrics: {
        extend: () => ({ fetch: async () => [] }),
      } as any,
    };

    const res = await LearningService.computeActualVsPredicted(plant as Plant);
    expect(res.plantId).toBe('p1');
    expect(res.flowering.predictedMinDays).toBe(56);
    expect(res.flowering.predictedMaxDays).toBe(70);
    expect(res.harvest.predictedStart).toBeInstanceOf(Date);
    expect(res.harvest.predictedEnd).toBeInstanceOf(Date);
    expect(res.yield.unit).toBe('g_per_plant');
    expect(res.yield.deltaFromMidpoint).toBeDefined();
    expect(res.yield.absolutePercentageError).toBeGreaterThanOrEqual(0);
  });
});


