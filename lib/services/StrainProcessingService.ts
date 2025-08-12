import { RawStrainApiResponse } from '../types/weed-db';
import { sanitizeString } from '../utils/data-parsing';

/**
 * StrainProcessingService
 * Parses and normalizes cultivation-relevant fields from RawStrainApiResponse.
 * Provides confidence scoring and a 24h in-memory cache keyed by api_id + parser version.
 */

export type YieldUnit = 'g_per_plant' | 'g_per_m2';
export type YieldCategory = 'low' | 'medium' | 'high' | 'unknown';

export interface TimeRangeDays {
  minDays: number | null;
  maxDays: number | null;
  source: 'weeks' | 'days' | 'inferred' | 'unknown';
  confidence: number; // 0..1
  conflict?: boolean;
}

export interface SeasonalWindow {
  startMonth: number; // 1..12
  startDay: number; // 1..31
  endMonth: number; // 1..12
  endDay: number; // 1..31
  confidence: number; // 0..1
}

export interface YieldProfile {
  unit: YieldUnit | null;
  min: number | null;
  max: number | null;
  category: YieldCategory;
  confidence: number; // 0..1
}

export interface CultivationProfile {
  floweringDays: TimeRangeDays | null;
  autoSeedToHarvestDays: TimeRangeDays | null;
  harvestWindow: SeasonalWindow | null;
  yieldIndoor: YieldProfile | null;
  yieldOutdoor: YieldProfile | null;
  growthDifficulty: 'easy' | 'medium' | 'hard' | 'unknown';
}

export interface ProcessedStrainData {
  id: string;
  name: string;
  genetics?: string | null;
  cultivation: CultivationProfile;
  metadata: {
    parserVersion: string;
    source: 'local' | 'supabase' | 'external' | 'unknown';
  };
}

const PARSER_VERSION = '1.0.0';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

type CacheEntry = { data: ProcessedStrainData; ts: number };
const cache = new Map<string, CacheEntry>();

export function getProcessedStrain(api: RawStrainApiResponse): ProcessedStrainData {
  const key = `${api.api_id || api.id || api.name}:${PARSER_VERSION}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  const data = parseStrainData(api);
  cache.set(key, { data, ts: Date.now() });
  return data;
}

export function parseStrainData(api: RawStrainApiResponse): ProcessedStrainData {
  const name = sanitizeString(api.name || '');
  const genetics = typeof api.genetics === 'string' ? sanitizeString(api.genetics) : null;

  const floweringDays = parseWeeksOrDaysToDays(api.floweringTime);

  const autoSeedToHarvestDays = parseWeeksOrDaysToDays(api.fromSeedToHarvest);

  const harvestWindow = parseSeasonalHarvestWindow(api.harvestTimeOutdoor);

  const yieldIndoor = parseYield(getStringField(api, ['yieldIndoor', 'yield_indoor']));
  const yieldOutdoor = parseYield(getStringField(api, ['yieldOutdoor', 'yield_outdoor']));

  const difficulty = normalizeDifficulty(api.growDifficulty);

  const processed: ProcessedStrainData = {
    id: (api.api_id || api.id || name) as string,
    name,
    genetics,
    cultivation: {
      floweringDays,
      autoSeedToHarvestDays,
      harvestWindow,
      yieldIndoor,
      yieldOutdoor,
      growthDifficulty: difficulty,
    },
    metadata: {
      parserVersion: PARSER_VERSION,
      source: api._source || 'unknown',
    },
  };

  return processed;
}

/**
 * Returns the last UTC day (28..31) of a given month in a given year.
 * month1to12 is 1 for January through 12 for December.
 */
function getLastDayOfMonth(year: number, month1to12: number): number {
  const safeMonth = Math.max(1, Math.min(12, Math.trunc(month1to12)));
  // Using day = 0 returns the last day of the previous month; with month set to 1..12,
  // this yields the last day of the intended month in 1..12.
  return new Date(Date.UTC(Math.trunc(year), safeMonth, 0)).getUTCDate();
}

/**
 * Returns only the cultivation profile from a processed strain. This aligns the
 * service API with the design document, enabling downstream services to depend
 * on a narrow surface when they only need cultivation fields.
 */
export function extractCultivationData(processed: ProcessedStrainData): CultivationProfile {
  return processed.cultivation;
}

export function validateStrainData(data: ProcessedStrainData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const f = data.cultivation.floweringDays;
  if (f && f.minDays !== null && f.maxDays !== null) {
    if (f.minDays < 0 || f.maxDays < 0) errors.push('Flowering days cannot be negative');
    if (f.minDays > f.maxDays) errors.push('Flowering days min cannot exceed max');
  }
  const a = data.cultivation.autoSeedToHarvestDays;
  if (a && a.minDays !== null && a.maxDays !== null) {
    if (a.minDays < 0 || a.maxDays < 0) errors.push('Auto seed-to-harvest days cannot be negative');
    if (a.minDays > a.maxDays) errors.push('Auto seed-to-harvest min cannot exceed max');
  }
  const yi = data.cultivation.yieldIndoor;
  if (yi && yi.min !== null && yi.max !== null) {
    if (yi.min < 0 || yi.max < 0) errors.push('Indoor yield cannot be negative');
    if (yi.min > yi.max) errors.push('Indoor yield min cannot exceed max');
  }
  const yo = data.cultivation.yieldOutdoor;
  if (yo && yo.min !== null && yo.max !== null) {
    if (yo.min < 0 || yo.max < 0) errors.push('Outdoor yield cannot be negative');
    if (yo.min > yo.max) errors.push('Outdoor yield min cannot exceed max');
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Returns true if any numeric cultivation range exists that could drive a schedule.
 */
export function hasCultivationRangeData(cultivation: CultivationProfile): boolean {
  const d = cultivation.floweringDays;
  const a = cultivation.autoSeedToHarvestDays;
  const hasDays =
    (d && d.minDays !== null && d.maxDays !== null) ||
    (a && a.minDays !== null && a.maxDays !== null);
  return Boolean(hasDays) || Boolean(cultivation.harvestWindow);
}

/**
 * Generic, conservative cultivation profile used as a fallback when parsing fails
 * or data is incomplete. Values are intentionally broad with low confidence.
 */
export function buildGenericCultivationProfile(): CultivationProfile {
  const genericDays: TimeRangeDays = {
    minDays: 56, // ~8 weeks
    maxDays: 70, // ~10 weeks
    source: 'inferred',
    confidence: 0.4,
  };
  const genericYield: YieldProfile = {
    unit: null,
    min: null,
    max: null,
    category: 'unknown',
    confidence: 0.3,
  };
  return {
    floweringDays: genericDays,
    autoSeedToHarvestDays: null,
    harvestWindow: null,
    yieldIndoor: genericYield,
    yieldOutdoor: genericYield,
    growthDifficulty: 'unknown',
  };
}

// --- Parsing helpers ---

function getStringField(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

/**
 * Parses a string or number describing weeks or days into a TimeRangeDays.
 * Examples: "7-9 weeks" => 49..63, "50–60 days" => 50..60
 */
export function parseWeeksOrDaysToDays(value?: string | number | null): TimeRangeDays | null {
  if (value === null || value === undefined) return null;
  const str = String(value).toLowerCase().trim();
  if (!str) return null;

  // day range: 50-60 days
  const dayRange = str.match(/(\d+)\s*[–-]\s*(\d+)\s*(?:days?|dys?)/i);
  if (dayRange) {
    const minStr = dayRange[1];
    const maxStr = dayRange[2];
    if (minStr !== undefined && maxStr !== undefined) {
      const min = parseInt(minStr, 10);
      const max = parseInt(maxStr, 10);
      if (isFinite(min) && isFinite(max)) {
      return { minDays: min, maxDays: max, source: 'days', confidence: 0.95 };
      }
    }
  }

  // single days: 60 days
  const singleDays = str.match(/(\d+)\s*(?:days?|dys?)/i);
  if (singleDays) {
    const dStr = singleDays[1];
    if (dStr !== undefined) {
      const d = parseInt(dStr, 10);
      if (isFinite(d)) return { minDays: d, maxDays: d, source: 'days', confidence: 0.9 };
    }
  }

  // weeks range: 7-9 weeks
  const weekRange = str.match(/(\d+)\s*[–-]\s*(\d+)\s*(?:weeks?|wks?)/i);
  if (weekRange) {
    const wminStr = weekRange[1];
    const wmaxStr = weekRange[2];
    if (wminStr !== undefined && wmaxStr !== undefined) {
      const wmin = parseInt(wminStr, 10);
      const wmax = parseInt(wmaxStr, 10);
      if (isFinite(wmin) && isFinite(wmax)) {
        return {
          minDays: wmin * 7,
          maxDays: wmax * 7,
          source: 'weeks',
          confidence: 0.95,
        };
      }
    }
  }

  // single weeks: 8 weeks
  const singleWeeks = str.match(/(\d+)\s*(?:weeks?|wks?)/i);
  if (singleWeeks) {
    const wStr = singleWeeks[1];
    if (wStr !== undefined) {
      const w = parseInt(wStr, 10);
      if (isFinite(w)) return { minDays: w * 7, maxDays: w * 7, source: 'weeks', confidence: 0.9 };
    }
  }

  // pure number heuristic
  if (/^\d+$/.test(str)) {
    const n = parseInt(str, 10);
    if (n > 30) {
      return { minDays: n, maxDays: n, source: 'days', confidence: 0.6 };
    }
    return { minDays: n * 7, maxDays: n * 7, source: 'weeks', confidence: 0.6 };
  }

  return null;
}

/**
 * If both ranges exist, intersect them; mark conflict and reduce confidence if disjoint.
 */
export function intersectTimeRanges(a: TimeRangeDays | null, b: TimeRangeDays | null): TimeRangeDays | null {
  if (!a && !b) return a || b;
  if (!a) return b;
  if (!b) return a;

  if (a.minDays === null || a.maxDays === null) return b;
  if (b.minDays === null || b.maxDays === null) return a;

  const min = Math.max(a.minDays, b.minDays);
  const max = Math.min(a.maxDays, b.maxDays);
  if (min <= max) {
    // overlapping -> intersection, confidence slightly reduced but solid
    return {
      minDays: min,
      maxDays: max,
      source: a.source === 'days' || b.source === 'days' ? 'days' : 'weeks',
      confidence: Math.min(0.95, Math.max(a.confidence, b.confidence) - 0.05),
    };
  }
  // disjoint -> union range but mark conflict and reduce confidence
  return {
    minDays: Math.min(a.minDays, b.minDays),
    maxDays: Math.max(a.maxDays, b.maxDays),
    source: a.source === 'days' || b.source === 'days' ? 'days' : 'weeks',
    confidence: Math.max(0.5, Math.min(a.confidence, b.confidence) - 0.2),
    conflict: true,
  };
}

/**
 * Parses yield strings like "700g/plant" or "400-500 g/m²" into a normalized profile.
 */
export function parseYield(value?: string | null): YieldProfile | null {
  if (!value) return null;
  const str = String(value).toLowerCase().replace(/\s+/g, ' ').trim();
  if (!str) return null;

  const perPlant = /(\d+(?:\.\d+)?)\s*(?:g|grams)\s*\/\s*(?:plant|pl)/i;
  const perM2 = /(\d+(?:\.\d+)?)\s*(?:g|grams)\s*\/\s*m(?:\^?2|²)/i;
  const rangePerM2 = /(\d+)\s*[–-]\s*(\d+)\s*(?:g|grams)\s*\/\s*m(?:\^?2|²)/i;
  const rangePerPlant = /(\d+)\s*[–-]\s*(\d+)\s*(?:g|grams)\s*\/\s*(?:plant|pl)/i;

  // ranges first
  let unit: YieldUnit | null = null;
  let min: number | null = null;
  let max: number | null = null;
  let confidence = 0.9;

  let m = str.match(rangePerM2);
  if (m) {
    const minStr = m[1];
    const maxStr = m[2];
    if (minStr !== undefined && maxStr !== undefined) {
      unit = 'g_per_m2';
      min = parseFloat(minStr);
      max = parseFloat(maxStr);
    }
  } else if ((m = str.match(rangePerPlant))) {
    const minStr = m[1];
    const maxStr = m[2];
    if (minStr !== undefined && maxStr !== undefined) {
      unit = 'g_per_plant';
      min = parseFloat(minStr);
      max = parseFloat(maxStr);
    }
  } else if ((m = str.match(perM2))) {
    const singleStr = m[1];
    if (singleStr !== undefined) {
      unit = 'g_per_m2';
      min = max = parseFloat(singleStr);
      confidence = 0.85;
    }
  } else if ((m = str.match(perPlant))) {
    const singleStr = m[1];
    if (singleStr !== undefined) {
      unit = 'g_per_plant';
      min = max = parseFloat(singleStr);
      confidence = 0.85;
    }
  } else {
    // fallback: try to find any number and infer per plant if contains 'plant'
    const generic = str.match(/(\d+(?:\.\d+)?)/);
    if (generic) {
      const numStr = generic[1];
      if (numStr !== undefined) {
        const num = parseFloat(numStr);
        min = max = isFinite(num) ? num : null;
        unit = str.includes('m2') || str.includes('m²') ? 'g_per_m2' : 'g_per_plant';
        confidence = 0.6;
      }
    }
  }

  const category = categorizeYield(unit, min, max);
  return { unit, min, max, category, confidence };
}

function categorizeYield(
  unit: YieldUnit | null,
  min: number | null,
  max: number | null
): YieldCategory {
  if (!unit || min === null || max === null) return 'unknown';
  const avg = (min + max) / 2;
  if (unit === 'g_per_plant') {
    if (avg < 200) return 'low';
    if (avg <= 400) return 'medium';
    return 'high';
  }
  // g_per_m2 thresholds
  if (avg < 400) return 'low';
  if (avg <= 600) return 'medium';
  return 'high';
}

/**
 * Parses seasonal harvest phrases like "End of September/October" into window.
 * Heuristic mapping: Early=1-10, Mid=11-20, End=21-31.
 */
export function parseSeasonalHarvestWindow(value?: string | null): SeasonalWindow | null {
  if (!value) return null;
  const str = String(value).trim();
  if (!str) return null;

  const lower = str.toLowerCase();
  const period: 'early' | 'mid' | 'end' | null = lower.includes('early')
    ? 'early'
    : lower.includes('mid')
      ? 'mid'
      : lower.includes('end')
        ? 'end'
        : null;

  const months = extractMonths(str);
  if (months.length === 0) return null;

  const firstMaybe = months[0];
  if (typeof firstMaybe !== 'number') return null;
  const first = firstMaybe;
  const second = months[1];
  const dayRange = periodToDayRange(period);

  if (typeof second === 'number') {
    // e.g., End of September/October -> start at first month period start, end at second month period end
    const periodEndDay = period === 'early' ? 10 : period === 'mid' ? 20 : 31;
    const referenceYear = new Date().getUTCFullYear();
    const clampedEndDay = Math.min(periodEndDay, getLastDayOfMonth(referenceYear, second));
    return {
      startMonth: first,
      startDay: dayRange.start,
      endMonth: second,
      endDay: clampedEndDay,
      confidence: 0.6,
    };
  }

  return {
    startMonth: first,
    startDay: dayRange.start,
    endMonth: first,
    endDay: dayRange.end,
    confidence: 0.6,
  };
}

function extractMonths(input: string): number[] {
  const MONTHS: Record<string, number> = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
  };
  const found: number[] = [];
  const lower = input.toLowerCase();
  Object.keys(MONTHS).forEach((m) => {
    if (lower.includes(m)) {
      const monthNum = MONTHS[m as keyof typeof MONTHS];
      if (typeof monthNum === 'number') found.push(monthNum);
    }
  });
  // also support formats like Sep/Oct
  const shortMap: Record<string, number> = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    sept: 9,
    oct: 10,
    nov: 11,
    dec: 12,
  };
  const shortMatches = lower.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b/g);
  if (shortMatches) {
    shortMatches.forEach((s) => {
      const monthNum = shortMap[s as keyof typeof shortMap];
      if (typeof monthNum === 'number') found.push(monthNum);
    });
  }
  // de-duplicate and cap to 2 months
  return Array.from(new Set(found)).slice(0, 2);
}

function periodToDayRange(period: 'early' | 'mid' | 'end' | null): { start: number; end: number } {
  switch (period) {
    case 'early':
      return { start: 1, end: 10 };
    case 'mid':
      return { start: 11, end: 20 };
    case 'end':
      return { start: 21, end: 31 };
    default:
      return { start: 1, end: 31 };
  }
}

function normalizeDifficulty(value?: string | null): 'easy' | 'medium' | 'hard' | 'unknown' {
  if (!value) return 'unknown';
  const v = value.toLowerCase();
  if (v.includes('easy')) return 'easy';
  if (v.includes('medium')) return 'medium';
  if (v.includes('hard') || v.includes('difficult')) return 'hard';
  return 'unknown';
}

export const StrainProcessingService = {
  parseStrainData,
  getProcessedStrain,
  extractCultivationData,
  validateStrainData,
};

export default StrainProcessingService;


