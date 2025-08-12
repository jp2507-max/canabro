jest.mock('../../config/i18n', () => ({
  __esModule: true,
  default: { t: (k: string) => k },
  initI18n: jest.fn(),
}));
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { StrainCalendarIntegrationService } from '../StrainCalendarIntegrationService';
import { addDays } from '../../utils/date';
import { Plant } from '../../models/Plant';

jest.mock('../../data/strains', () => ({
  getStrainById: jest.fn(() => ({ id: 'strain-1', name: 'OG Kush', floweringTime: 8 })),
}));

jest.mock('../../models', () => ({
  database: {
    write: jest.fn(async (cb: any) => cb()),
    get: jest.fn(() => ({
      query: jest.fn(() => ({ fetch: jest.fn().mockResolvedValue([]) })),
      create: jest.fn((cb: any) => { const t: any = {}; cb(t); return t; }),
    })),
  },
}));

describe('StrainCalendarIntegrationService prediction with normalized fields', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses baseline + min/max days to compute high-confidence window', async () => {
    const baseline = new Date('2025-03-10T00:00:00.000Z');
    const minDays = 49;
    const maxDays = 63;
    const plant: Partial<Plant> = {
      id: 'p1',
      name: 'Plant P',
      userId: 'u1',
      plantedDate: '2025-02-01',
      growthStage: 'vegetative' as any,
      strainId: 'strain-1',
      baselineDate: baseline as any,
      baselineKind: 'flip' as any,
      predictedFlowerMinDays: minDays,
      predictedFlowerMaxDays: maxDays,
      predictedHarvestStart: undefined as any,
      predictedHarvestEnd: undefined as any,
    };

    const pred = await StrainCalendarIntegrationService.predictFloweringAndHarvest(plant as Plant);
    expect(pred).toBeTruthy();
    expect(pred!.confidenceLevel).toBe('high');
    // Flowering start equals baseline for flip
    expect(pred!.expectedFloweringStart.getTime()).toBe(baseline.getTime());
    // End equals baseline + maxDays
    expect(pred!.expectedFloweringEnd.getTime()).toBe(addDays(baseline, maxDays).getTime());
    // Harvest window bounds align with min/max days offsets
    expect(pred!.harvestWindowStart!.getTime()).toBe(addDays(baseline, minDays).getTime());
    expect(pred!.harvestWindowEnd!.getTime()).toBe(addDays(baseline, maxDays).getTime());
    expect(pred!.factors.some((f) => f.includes('Strain days range'))).toBe(true);
  });
});


