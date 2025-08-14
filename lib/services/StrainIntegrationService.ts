import { RawStrainApiResponse } from '../types/weed-db';
import {
  extractCultivationData,
  getProcessedStrain,
  type CultivationProfile,
  type ProcessedStrainData,
  type TimeRangeDays,
  type YieldProfile,
  hasCultivationRangeData,
  buildGenericCultivationProfile,
} from './StrainProcessingService';
import { addDays } from '../utils/date';
import { log } from '../utils/logger';
import * as Sentry from '@sentry/react-native';

import type { PlantType, BaselineKind, Environment, Hemisphere, YieldUnit, YieldCategory } from '../types/plant';
export type { PlantType, BaselineKind, Environment, Hemisphere } from '../types/plant';

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
  yieldUnit: YieldUnit | null;
  yieldMin: number | null;
  yieldMax: number | null;
  yieldCategory: YieldCategory;
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

  if (dateISO instanceof Date) {
    // Return a clone to avoid mutating the original reference
    return new Date(dateISO.getTime());
  }

  try {
    const raw = String(dateISO).trim();

    // If the string lacks a timezone offset or trailing 'Z', treat it as UTC.
    // Examples considered UTC:
    // - '2025-01-01'            -> '2025-01-01T00:00:00Z'
    // - '2025-01-01T12:34:56'   -> '2025-01-01T12:34:56Z'
    const hasTimezone = /z$/i.test(raw) || /[+-]\d{2}:\d{2}$/.test(raw);

    let normalized = raw;
    if (!hasTimezone) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        // Date-only string; pin to midnight UTC
        normalized = `${raw}T00:00:00Z`;
      } else if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
        // Date-time without TZ; append 'Z' to mark UTC
        normalized = `${raw}Z`;
      } else {
        // Fallback: append 'Z' so engine parses in UTC
        normalized = `${raw}Z`;
      }
    }

    const parsed = new Date(normalized);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  } catch {
    return new Date();
  }
}

export function inferPlantType(raw: RawStrainApiResponse): PlantType {
  const typeStr = (raw.floweringType || raw.flowering_type || raw.type || '')
      ?.toString()
      .toLowerCase();
  if (typeStr.includes('auto')) return 'autoflower';
  if (typeStr.includes('photo') || typeStr.includes('photoperiod')) return 'photoperiod';
  // Fallback to flags if present
  if (raw.isAutoFlower === true || raw.is_auto_flower === true) {
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

function getUtcLastDayOfMonth(year: number, month1to12: number): number {
  const safeMonth = Math.max(1, Math.min(12, Math.trunc(month1to12)));
  // Day 0 gives last day of previous month; with month set to 1..12 this yields
  // the last day for the intended month in range 28..31, accounting for leap years.
  return new Date(Date.UTC(Math.trunc(year), safeMonth, 0)).getUTCDate();
}

export function computeHarvestDates(
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
    // Normalize baseline to UTC midnight to keep math in UTC
    const baselineUtc = new Date(
      Date.UTC(
        baselineDate.getUTCFullYear(),
        baselineDate.getUTCMonth(),
        baselineDate.getUTCDate()
      )
    );
    return {
      start: addDays(baselineUtc, primaryRange.minDays),
      end: addDays(baselineUtc, primaryRange.maxDays),
      confidence: null, // confidence handled by caller from days range
    };
  }

  // For outdoor without numeric range, fallback to seasonal window if present
  if (env === 'outdoor' && cultivation.harvestWindow) {
    const year = baselineDate.getUTCFullYear();
    const { startMonth, startDay, endMonth, endDay, confidence } = cultivation.harvestWindow;

    // Shift months for southern hemisphere by ~6 months
    const shiftMonth = (m: number, shiftBy: number) => ((m - 1 + shiftBy) % 12 + 12) % 12 + 1;
    const sMonth = hemisphere === 'S' ? shiftMonth(startMonth, 6) : startMonth;
    const eMonth = hemisphere === 'S' ? shiftMonth(endMonth, 6) : endMonth;

    // Determine if the window wraps into the next year (e.g., Nov -> Feb)
    const wrapsYear = eMonth < sMonth || (eMonth === sMonth && endDay < startDay);
    const startYear = year;
    const endYear = wrapsYear ? year + 1 : year;

    // Clamp days to the actual last day in the target month/year (UTC) and >= 1
    const clampedStartDay = Math.max(1, Math.min(startDay, getUtcLastDayOfMonth(startYear, sMonth)));
    const clampedEndDay = Math.max(1, Math.min(endDay, getUtcLastDayOfMonth(endYear, eMonth)));

    const start = new Date(Date.UTC(startYear, sMonth - 1, clampedStartDay));
    const end = new Date(Date.UTC(endYear, eMonth - 1, clampedEndDay));

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
  try {
    const processed: ProcessedStrainData = getProcessedStrain(raw);
    let cultivation = extractCultivationData(processed);

    // 11.1 Validation + generic profiles: fallback to generic profile when no usable data
    if (!hasCultivationRangeData(cultivation)) {
      cultivation = buildGenericCultivationProfile();
    }

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

    const predictions: StrainPredictions = {
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

    // Telemetry: parser version + confidence for diagnostics
    try {
      log.info('[StrainIntegrationService] Predictions prepared', {
        parserVersion: processed.metadata?.parserVersion,
        scheduleConfidence: predictions.scheduleConfidence,
        plantType,
        environment,
      });
    } catch (err) {
      Sentry.captureException(err);
      log.warn('[StrainIntegrationService] Telemetry logging failed', err);
    }

    return predictions;
  } catch (err) {
    // Ensure we always return a valid StrainPredictions object
    Sentry.captureException(err);
    log.warn('[StrainIntegrationService] Prediction generation failed', err);

    // Preserve best-effort context
    const plantType = input.plantTypeOverride ?? inferPlantType(raw);
    const environment = inferEnvironment(input.locationDescription, input.preferredEnvironment);
    const hemisphere = inferHemisphere(input.hemisphereOverride);
    const baseline = calculateBaseline(plantType, input.plantedDateISO);

    // Build generic cultivation profile (kept for parity; not directly used in minimal predictions)
    const _genericCultivation = buildGenericCultivationProfile();

    const fallback: StrainPredictions = {
      plantType,
      environment,
      hemisphere,
      baseline,
      predictedFlowerMinDays: null,
      predictedFlowerMaxDays: null,
      predictedHarvestStart: null,
      predictedHarvestEnd: null,
      scheduleConfidence: null,
      yieldUnit: null,
      yieldMin: null,
      yieldMax: null,
      yieldCategory: 'unknown',
    };

    return fallback;
  }
}

export default {
  inferPlantType,
  inferEnvironment,
  inferHemisphere,
  calculateBaseline,
  preparePlantPredictions,
};


