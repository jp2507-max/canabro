import type { Plant } from '../models/Plant';

export interface AggregatedYield {
  unit: 'g_per_plant' | 'g_per_m2';
  totalMin?: number;
  totalMax?: number;
  plantsCounted: number;
}

/**
 * Aggregate normalized yield expectations across plants.
 * Only aggregates plants with matching units and (optionally) matching environment if provided.
 */
export function aggregateYieldExpectations(
  plants: Plant[],
  opts: { unit?: 'g_per_plant' | 'g_per_m2'; environment?: 'indoor' | 'outdoor' | 'greenhouse' } = {}
): AggregatedYield | null {
  // 1) Environment filter (unchanged behavior)
  const envFiltered = plants.filter((p) => (opts.environment ? p.environment === opts.environment : true));

  // 2) Determine a single consistent unit
  let unit: 'g_per_plant' | 'g_per_m2' | undefined;
  if (opts.unit) {
    unit = opts.unit;
  } else {
    const distinctUnits = new Set(
      envFiltered
        .map((p) => p.yieldUnit)
        .filter((u): u is 'g_per_plant' | 'g_per_m2' => Boolean(u))
    );
    if (distinctUnits.size === 0) return null; // no unit info available
    if (distinctUnits.size > 1) return null; // mixed units, bail out
    unit = [...distinctUnits][0];
  }

  // 3) Filter by the determined unit for aggregation
  const filtered = envFiltered.filter((p) => p.yieldUnit === unit);
  if (filtered.length === 0 || !unit) return null;
  
  let seenMin = false;
  let seenMax = false;
  let sumMin = 0;
  let sumMax = 0;
  let plantsCounted = 0;

  for (const plant of filtered) {
    const min = plant.yieldMin ?? undefined;
    const max = plant.yieldMax ?? undefined;
    if (min == null && max == null) continue;
    
    plantsCounted += 1;
    
    // Track min values only if actually present
    if (min != null) {
      sumMin += min;
      seenMin = true;
    }
    
    // Track max values with fallback logic
    if (max != null) {
      sumMax += max;
      seenMax = true;
    } else if (min != null) {
      // Use min as fallback contribution to max when max is null but min is present
      sumMax += min;
      seenMax = true;
    }
  }

  if (plantsCounted === 0) return null;

  const totalMin = seenMin ? sumMin : undefined;
  const totalMax = seenMax ? sumMax : undefined;

  return { unit, totalMin, totalMax, plantsCounted };
}


