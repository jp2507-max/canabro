import { RawStrainApiResponse } from '../types/weed-db';
import {
  extractCultivationData,
  getProcessedStrain,
  type CultivationProfile,
  type ProcessedStrainData,
  type TimeRangeDays,
  type YieldProfile,
} from './StrainProcessingService';
import { addDays } from '../utils/date';

export type PlantType = 'photoperiod' | 'autoflower' | 'unknown';
export type BaselineKind = 'flip' | 'germination';
export type Environment = 'indoor' | 'outdoor' | 'greenhouse';
export type Hemisphere = 'N' | 'S';

export interface BaselineInfo {
  kind: BaselineKind;
  date: Date;
}

export interface StrainPredictions {
  plantType: PlantType;
  environment: Environment;
  hemisphere: Hemisphere;
  baseline: BaselineInfo;
  predictedFlowerMinDays: number | null;
  predictedFlowerMaxDays: number | null;
  predictedHarvestStart: Date | null;
  predictedHarvestEnd: Date | null;
  scheduleConfidence: number | null;
  yieldUnit: 'g_per_plant' | 'g_per_m2' | null;
  yieldMin: number | null;
  yieldMax: number | null;
  yieldCategory: 'low' | 'medium' | 'high' | 'unknown';
}

export interface PreparePlantPredictionsInput {
  plantedDateISO: string; // ISO string from form
  locationDescription?: string;
  preferredEnvironment?: Environment; // optional override from UI
  hemisphereOverride?: Hemisphere; // optional override from UI
  plantTypeOverride?: PlantType; // optional override from UI
}

function coerceDate(dateISO: string | Date | undefined | null): Date {
  if (!dateISO) return new Date();
  if (dateISO instanceof Date) return dateISO;
  const d = new Date(dateISO);
  return isNaN(d.getTime()) ? new Date() : d;
}

export function inferPlantType(raw: RawStrainApiResponse): PlantType {
  const 
    typeStr = (raw.floweringType || raw.flowering_type || raw.type || '')
      ?.toString()
      .toLowerCase();
  if (typeStr.includes('auto')) return 'autoflower';
  if (typeStr.includes('photo') || typeStr.includes('photoperiod')) return 'photoperiod';
  // Fallback to flags if present
  if ((raw as any).isAutoFlower === true || (raw as any).is_auto_flower === true) {
    return 'autoflower';
  }
  return 'unknown';
}

export function inferEnvironment(locationDescription?: string, preferred?: Environment): Environment {
  if (preferred) return preferred;
  const text = (locationDescription || '').toLowerCase();
  if (text.includes('outdoor')) return 'outdoor';
  if (text.includes('greenhouse')) return 'greenhouse';
  return 'indoor';
}

export function inferHemisphere(override?: Hemisphere): Hemisphere {
  if (override) return override;
  // Simple default; future: infer from device location/timezone if available
  return 'N';
}

function pickDaysRange(
  plantType: PlantType,
  cultivation: CultivationProfile
): { range: TimeRangeDays | null; confidence: number | null } {
  if (plantType === 'autoflower') {
    const r = cultivation.autoSeedToHarvestDays || cultivation.floweringDays || null;
    return { range: r, confidence: r?.confidence ?? null };
  }
  // photoperiod or unknown
  const r = cultivation.floweringDays || cultivation.autoSeedToHarvestDays || null;
  return { range: r, confidence: r?.confidence ?? null };
}

function computeHarvestDates(
  baseline: BaselineInfo,
  env: Environment,
  cultivation: CultivationProfile,
  hemisphere: Hemisphere
): { start: Date | null; end: Date | null; confidence: number | null } {
  // Indoor/greenhouse: prefer day ranges from baseline date
  const baselineDate = baseline.date;

  // If we have a numeric range, we can compute dates
  const primaryRange = baseline.kind === 'germination'
    ? cultivation.autoSeedToHarvestDays || cultivation.floweringDays
    : cultivation.floweringDays || cultivation.autoSeedToHarvestDays;

  if (primaryRange && primaryRange.minDays !== null && primaryRange.maxDays !== null) {
    return {
      start: addDays(baselineDate, primaryRange.minDays),
      end: addDays(baselineDate, primaryRange.maxDays),
      confidence: null, // confidence handled by caller from days range
    };
  }

  // For outdoor without numeric range, fallback to seasonal window if present
  if (env === 'outdoor' && cultivation.harvestWindow) {
    const year = baselineDate.getFullYear();
    const { startMonth, startDay, endMonth, endDay, confidence } = cultivation.harvestWindow;

    // Shift months for southern hemisphere by ~6 months
    const shiftMonth = (m: number, shiftBy: number) => ((m - 1 + shiftBy) % 12 + 12) % 12 + 1;
    const sMonth = hemisphere === 'S' ? shiftMonth(startMonth, 6) : startMonth;
    const eMonth = hemisphere === 'S' ? shiftMonth(endMonth, 6) : endMonth;

    const start = new Date(Date.UTC(year, sMonth - 1, startDay));
    // If window wraps into next year (e.g., Nov -> Feb), move end year forward
    const wrapsYear = eMonth < sMonth || (eMonth === sMonth && endDay < startDay);
    const endYear = wrapsYear ? year + 1 : year;
    const end = new Date(Date.UTC(endYear, eMonth - 1, endDay));

    return { start, end, confidence };
  }

  return { start: null, end: null, confidence: null };
}

function pickYieldForEnvironment(
  env: Environment,
  cultivation: CultivationProfile
): YieldProfile | null {
  if (env === 'outdoor') return cultivation.yieldOutdoor;
  // For greenhouse/indoor prefer indoor if available
  return cultivation.yieldIndoor || cultivation.yieldOutdoor;
}

export function calculateBaseline(
  plantType: PlantType,
  plantedDateISO: string
): BaselineInfo {
  const plantedDate = coerceDate(plantedDateISO);
  if (plantType === 'autoflower') {
    return { kind: 'germination', date: plantedDate };
  }
  // For photoperiod/unknown, assume baseline at planted date until user confirms flip date
  return { kind: 'flip', date: plantedDate };
}

export function preparePlantPredictions(
  raw: RawStrainApiResponse,
  input: PreparePlantPredictionsInput
): StrainPredictions {
  const processed: ProcessedStrainData = getProcessedStrain(raw);
  const cultivation = extractCultivationData(processed);

  const plantType = input.plantTypeOverride ?? inferPlantType(raw);
  const environment = inferEnvironment(input.locationDescription, input.preferredEnvironment);
  const hemisphere = inferHemisphere(input.hemisphereOverride);
  const baseline = calculateBaseline(plantType, input.plantedDateISO);

  const { range, confidence } = pickDaysRange(plantType, cultivation);
  const { start, end, confidence: seasonalConfidence } = computeHarvestDates(
    baseline,
    environment,
    cultivation,
    hemisphere
  );
  const y = pickYieldForEnvironment(environment, cultivation);

  return {
    plantType,
    environment,
    hemisphere,
    baseline,
    predictedFlowerMinDays: range?.minDays ?? null,
    predictedFlowerMaxDays: range?.maxDays ?? null,
    predictedHarvestStart: start,
    predictedHarvestEnd: end,
    scheduleConfidence: confidence ?? seasonalConfidence ?? null,
    yieldUnit: y?.unit ?? null,
    yieldMin: y?.min ?? null,
    yieldMax: y?.max ?? null,
    yieldCategory: y?.category ?? 'unknown',
  };
}

export default {
  inferPlantType,
  inferEnvironment,
  inferHemisphere,
  calculateBaseline,
  preparePlantPredictions,
};


