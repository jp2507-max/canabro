import { describe, expect, it } from '@jest/globals';
import {
  parseWeeksOrDaysToDays,
  intersectTimeRanges,
  parseYield,
  parseSeasonalHarvestWindow,
  parseStrainData,
  validateStrainData,
} from '../StrainProcessingService';

describe('StrainProcessingService parsing', () => {
  it('parses week ranges to days', () => {
    const r = parseWeeksOrDaysToDays('7-9 weeks');
    expect(r).toEqual({ minDays: 49, maxDays: 63, source: 'weeks', confidence: expect.any(Number) });
  });

  it('parses day ranges to days', () => {
    const r = parseWeeksOrDaysToDays('50-60 days');
    expect(r).toEqual({ minDays: 50, maxDays: 60, source: 'days', confidence: expect.any(Number) });
  });

  it('intersects overlapping ranges', () => {
    const a = { minDays: 49, maxDays: 63, source: 'weeks' as const, confidence: 0.9 };
    const b = { minDays: 50, maxDays: 60, source: 'days' as const, confidence: 0.95 };
    const r = intersectTimeRanges(a, b);
    expect(r?.minDays).toBe(50);
    expect(r?.maxDays).toBe(60);
    expect(r?.source).toBe('days');
  });

  it('flags conflicts on disjoint ranges', () => {
    const a = { minDays: 35, maxDays: 42, source: 'weeks' as const, confidence: 0.9 };
    const b = { minDays: 60, maxDays: 70, source: 'days' as const, confidence: 0.9 };
    const r = intersectTimeRanges(a, b);
    expect(r?.conflict).toBe(true);
    expect(r?.minDays).toBe(35);
    expect(r?.maxDays).toBe(70);
  });

  it('parses yield per plant', () => {
    const y = parseYield('700g/plant');
    expect(y).toMatchObject({ unit: 'g_per_plant', min: 700, max: 700 });
  });

  it('parses yield per m2 range', () => {
    const y = parseYield('400-500 g/m²');
    expect(y).toMatchObject({ unit: 'g_per_m2', min: 400, max: 500 });
  });

  it('parses seasonal windows with dual months', () => {
    const w = parseSeasonalHarvestWindow('End of September/October');
    expect(w).toMatchObject({ startMonth: 9, endMonth: 10, startDay: 21, endDay: 31 });
  });
});

describe('StrainProcessingService integration', () => {
  it('processes a full strain sample', () => {
    const raw = {
      api_id: 'abc123',
      name: 'Test Strain',
      floweringTime: '8-9 weeks',
      fromSeedToHarvest: '10-12 weeks',
      yieldIndoor: '450-550 g/m²',
      yieldOutdoor: '700g/plant',
      harvestTimeOutdoor: 'End of September/October',
      growDifficulty: 'Medium',
      _source: 'external',
    } as any;

    const processed = parseStrainData(raw);
    const v = validateStrainData(processed);
    expect(v.valid).toBe(true);
    expect(processed.cultivation.floweringDays).toBeTruthy();
    expect(processed.cultivation.yieldIndoor?.unit).toBe('g_per_m2');
    expect(processed.cultivation.yieldOutdoor?.unit).toBe('g_per_plant');
    expect(processed.cultivation.harvestWindow).toBeTruthy();
  });
});


