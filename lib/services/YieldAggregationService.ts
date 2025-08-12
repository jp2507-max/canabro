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
  const filtered = plants.filter((p) => {
    const unitMatches = opts.unit ? p.yieldUnit === opts.unit : Boolean(p.yieldUnit);
    const envMatches = opts.environment ? p.environment === opts.environment : true;
    return unitMatches && envMatches;
  });

  if (filtered.length === 0) return null;

  const unit = (opts.unit || (filtered[0].yieldUnit as 'g_per_plant' | 'g_per_m2'))!;
  let totalMin: number | undefined;
  let totalMax: number | undefined;
  let plantsCounted = 0;

  for (const plant of filtered) {
    if (plant.yieldUnit !== unit) continue;
    const min = plant.yieldMin ?? undefined;
    const max = plant.yieldMax ?? undefined;
    if (min == null && max == null) continue;
    plantsCounted += 1;
    totalMin = (totalMin ?? 0) + (min ?? 0);
    totalMax = (totalMax ?? 0) + (max ?? (min ?? 0));
  }

  return { unit, totalMin, totalMax, plantsCounted };
}


