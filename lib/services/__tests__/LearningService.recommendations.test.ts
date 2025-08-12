import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { LearningService } from '../LearningService';
import { Plant } from '../../models/Plant';

jest.mock('../../database/database', () => ({
  getDatabase: jest.fn(() => ({
    get: jest.fn(() => ({
      query: jest.fn(() => ({
        fetch: jest.fn().mockResolvedValue([
          { id: 'p1', strain: 'OG Kush', isDeleted: false, plantMetrics: { extend: () => ({ fetch: async () => [] }) } },
          { id: 'p2', strain: 'Blue Dream', isDeleted: false, plantMetrics: { extend: () => ({ fetch: async () => [] }) } },
        ]),
      })),
    })),
  })),
}));

jest.mock('../HarvestDataIntegrator', () => ({
  HarvestDataIntegrator: {
    analyzeHarvestData: jest.fn(async (plant: Partial<Plant>) => ({
      strain: plant.strain || 'unknown',
      finalWeights: { dry: plant.id === 'p1' ? 300 : 200 },
      floweringDays: plant.id === 'p1' ? 63 : 70,
      taskCompletionRate: plant.id === 'p1' ? 90 : 80,
      growthConditions: { medium: 'soil', lightCondition: 'LED' },
    })),
    updateFutureScheduling: jest.fn(async () => {}),
  },
}));

describe('LearningService recommendations summary', () => {
  beforeEach(() => jest.clearAllMocks());

  it('produces ranked strains based on average yield', async () => {
    const res = await LearningService.getRecommendationsForUser();
    expect(res.patterns.length).toBeGreaterThan(0);
    expect(res.recommendedStrains[0]).toBeDefined();
  });
});


