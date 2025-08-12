import { describe, it, expect } from '@jest/globals';
import {
  inferPlantType,
  inferEnvironment,
  inferHemisphere,
  calculateBaseline,
  preparePlantPredictions,
  type BaselineKind,
} from '../StrainIntegrationService';

import type { RawStrainApiResponse } from '../../types/weed-db';

describe('StrainIntegrationService predictions', () => {
  const baseRaw: RawStrainApiResponse = {
    api_id: 'api-1',
    name: 'Test Strain',
    floweringTime: '8-9 weeks',
    fromSeedToHarvest: '10-12 weeks',
    yieldIndoor: '450-550 g/m²',
    yieldOutdoor: '700g/plant',
    harvestTimeOutdoor: 'End of September/October',
    growDifficulty: 'Medium',
    _source: 'external',
  } as any;

  it('infers plant type from raw strain data', () => {
    expect(inferPlantType({ ...baseRaw, flowering_type: 'autoflower' } as any)).toBe('autoflower');
    expect(inferPlantType({ ...baseRaw, flowering_type: 'photoperiod' } as any)).toBe('photoperiod');
    expect(inferPlantType({ ...baseRaw, type: 'something-else' } as any)).toBe('unknown');
  });

  it('infers plant type when only snake_case flowering_type is provided', () => {
    const onlySnakeAuto = { api_id: 'a1', name: 'Only Auto', flowering_type: 'autoflower' } as any;
    const onlySnakePhoto = { api_id: 'p1', name: 'Only Photo', flowering_type: 'photoperiod' } as any;
    expect(inferPlantType(onlySnakeAuto)).toBe('autoflower');
    expect(inferPlantType(onlySnakePhoto)).toBe('photoperiod');
  });

  it('infers environment with optional override and location text', () => {
    expect(inferEnvironment('Outdoor balcony', undefined)).toBe('outdoor');
    expect(inferEnvironment('Greenhouse tent', undefined)).toBe('greenhouse');
    expect(inferEnvironment('Plain text', 'indoor')).toBe('indoor');
  });

  it('infers hemisphere and supports override', () => {
    expect(inferHemisphere()).toBe('N');
    expect(inferHemisphere('S')).toBe('S');
  });

  it('calculates baseline based on plant type', () => {
    const flip = calculateBaseline('photoperiod', '2025-01-01');
    const germ = calculateBaseline('autoflower', '2025-01-01');
    expect(flip.kind).toBe<'flip' | BaselineKind>('flip');
    expect(germ.kind).toBe<'germination' | BaselineKind>('germination');
    expect(flip.date).toBeInstanceOf(Date);
    expect(germ.date).toBeInstanceOf(Date);
  });

  it('prepares predictions (indoor) prioritizing day ranges', () => {
    const preds = preparePlantPredictions(baseRaw, {
      plantedDateISO: '2025-03-01',
      locationDescription: 'Indoor grow tent',
    });
    expect(preds.environment).toBe('indoor');
    expect(preds.baseline.kind).toBeDefined();
    expect(preds.predictedFlowerMinDays).toBeGreaterThan(0);
    expect(preds.predictedFlowerMaxDays).toBeGreaterThanOrEqual(preds.predictedFlowerMinDays || 0);
    // With numeric day ranges, harvest dates should be computed
    expect(preds.predictedHarvestStart).toBeInstanceOf(Date);
    expect(preds.predictedHarvestEnd).toBeInstanceOf(Date);
    // Yield should select indoor profile
    expect(preds.yieldUnit).toBe('g_per_m2');
    expect(preds.yieldMin).toBeGreaterThan(0);
    expect(preds.yieldMax).toBeGreaterThanOrEqual(preds.yieldMin || 0);
  });

  it('prepares predictions (outdoor) with seasonal window fallback and hemisphere shift', () => {
    const predsNorth = preparePlantPredictions(
      { ...baseRaw, floweringTime: undefined } as any,
      {
        plantedDateISO: '2025-04-15',
        locationDescription: 'Outdoor garden',
      }
    );
    expect(predsNorth.environment).toBe('outdoor');
    expect(predsNorth.predictedHarvestStart).toBeInstanceOf(Date);
    expect(predsNorth.predictedHarvestEnd).toBeInstanceOf(Date);

    const predsSouth = preparePlantPredictions(
      { ...baseRaw, floweringTime: undefined } as any,
      {
        plantedDateISO: '2025-04-15',
        locationDescription: 'Outdoor garden',
        hemisphereOverride: 'S',
      }
    );
    // Hemisphere is respected
    expect(predsSouth.hemisphere).toBe('S');
    expect(predsSouth.predictedHarvestStart).toBeInstanceOf(Date);
    expect(predsSouth.predictedHarvestEnd).toBeInstanceOf(Date);
  });
});


