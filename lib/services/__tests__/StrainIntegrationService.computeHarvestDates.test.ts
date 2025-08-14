import { computeHarvestDates, type BaselineInfo } from '../StrainIntegrationService';
import type { CultivationProfile } from '../StrainProcessingService';

function makeBaseline(dateIso: string, kind: BaselineInfo['kind'] = 'flip'): BaselineInfo {
  return { kind, date: new Date(dateIso) };
}

function makeCultivationWithWindow(harvestWindow: NonNullable<CultivationProfile['harvestWindow']>): CultivationProfile {
  return {
    floweringDays: null,
    autoSeedToHarvestDays: null,
    harvestWindow,
    yieldIndoor: null,
    yieldOutdoor: null,
    growthDifficulty: 'unknown',
  };
}

describe('computeHarvestDates - seasonal window UTC validation/clamping', () => {
  test('southern hemisphere shifts months by 6 and keeps same year when not wrapping', () => {
    const baseline = makeBaseline('2025-01-01T00:00:00Z');
    const cultivation = makeCultivationWithWindow({
      startMonth: 9, // Sep -> +6 => Mar
      startDay: 15,
      endMonth: 10, // Oct -> +6 => Apr
      endDay: 10,
      confidence: 0.8,
    });

    const { start, end, confidence } = computeHarvestDates(baseline, 'outdoor', cultivation, 'S');
    expect(confidence).toBeCloseTo(0.8);

    expect(start).toBeInstanceOf(Date);
    expect(end).toBeInstanceOf(Date);

    expect(start!.toISOString()).toBe('2025-03-15T00:00:00.000Z');
    expect(end!.toISOString()).toBe('2025-04-10T00:00:00.000Z');
  });

  test('wraps year when end month/day precedes start month/day', () => {
    const baseline = makeBaseline('2025-01-01T00:00:00Z');
    const cultivation = makeCultivationWithWindow({
      startMonth: 11, // Nov
      startDay: 20,
      endMonth: 2, // Feb (next year)
      endDay: 5,
      confidence: 0.7,
    });

    const { start, end } = computeHarvestDates(baseline, 'outdoor', cultivation, 'N');

    expect(start!.toISOString()).toBe('2025-11-20T00:00:00.000Z');
    expect(end!.toISOString()).toBe('2026-02-05T00:00:00.000Z');
  });

  test('clamps Feb 29 on non-leap year to Feb 28 for both start and end', () => {
    const baseline = makeBaseline('2025-01-01T00:00:00Z'); // 2025 is not leap
    const cultivation = makeCultivationWithWindow({
      startMonth: 2,
      startDay: 29,
      endMonth: 2,
      endDay: 29,
      confidence: 0.5,
    });

    const { start, end } = computeHarvestDates(baseline, 'outdoor', cultivation, 'N');

    expect(start!.toISOString()).toBe('2025-02-28T00:00:00.000Z');
    expect(end!.toISOString()).toBe('2025-02-28T00:00:00.000Z');
  });

  test('clamps end in February across wrap to Feb 29 when next year is leap', () => {
    const baseline = makeBaseline('2023-12-01T00:00:00Z'); // next year is 2024 (leap)
    const cultivation = makeCultivationWithWindow({
      startMonth: 11, // Nov (2023)
      startDay: 30,
      endMonth: 2, // Feb (2024)
      endDay: 31, // invalid -> clamp to 29 in leap year
      confidence: 0.5,
    });

    const { start, end } = computeHarvestDates(baseline, 'outdoor', cultivation, 'N');

    expect(start!.toISOString()).toBe('2023-11-30T00:00:00.000Z');
    expect(end!.toISOString()).toBe('2024-02-29T00:00:00.000Z');
  });

  test('clamps days for 30-day months (Apr/Jun)', () => {
    const baseline = makeBaseline('2025-01-01T00:00:00Z');
    const cultivation = makeCultivationWithWindow({
      startMonth: 4, // April
      startDay: 31, // -> 30
      endMonth: 6, // June
      endDay: 31, // -> 30
      confidence: 0.5,
    });

    const { start, end } = computeHarvestDates(baseline, 'outdoor', cultivation, 'N');

    expect(start!.toISOString()).toBe('2025-04-30T00:00:00.000Z');
    expect(end!.toISOString()).toBe('2025-06-30T00:00:00.000Z');
  });
});

describe('computeHarvestDates - numeric range uses UTC baseline normalization', () => {
  test('uses addDays with UTC-midnight baseline to avoid TZ drift', () => {
    // Provide a time-of-day to ensure normalization to UTC midnight
    const baseline: BaselineInfo = { kind: 'germination', date: new Date('2025-06-15T10:30:00Z') };
    const cultivation: CultivationProfile = {
      floweringDays: null,
      autoSeedToHarvestDays: { minDays: 10, maxDays: 20, source: 'days', confidence: 0.9 },
      harvestWindow: null,
      yieldIndoor: null,
      yieldOutdoor: null,
      growthDifficulty: 'unknown',
    };

    const { start, end, confidence } = computeHarvestDates(baseline, 'indoor', cultivation, 'N');
    expect(confidence).toBeNull();

    expect(start!.toISOString()).toBe('2025-06-25T00:00:00.000Z');
    expect(end!.toISOString()).toBe('2025-07-05T00:00:00.000Z');
  });
});


