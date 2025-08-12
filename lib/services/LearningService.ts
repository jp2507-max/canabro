import { Q } from '@nozbe/watermelondb';
import { differenceInDays, startOfDay, isValid as isValidDate } from '../utils/date';
import { log } from '../utils/logger';

import { Plant } from '../models/Plant';
import { PlantMetrics } from '../models/PlantMetrics';
import { getDatabase } from '../database/database';
import { HarvestDataIntegrator } from './HarvestDataIntegrator';

export interface ActualVsPredictedFlowering {
  predictedMinDays?: number;
  predictedMaxDays?: number;
  actualDays?: number;
  // 0 when actualDays within [min, max]; otherwise distance in days to closest bound
  errorDaysFromRange?: number;
}

export interface ActualVsPredictedHarvestWindow {
  predictedStart?: Date;
  predictedEnd?: Date;
  actualDate?: Date;
  // 0 when actualDate within [start, end]; otherwise distance in days to closest bound
  errorDaysFromWindow?: number;
}

export interface ActualVsPredictedYield {
  unit?: 'g_per_plant' | 'g_per_m2';
  predictedMin?: number;
  predictedMax?: number;
  actualDry?: number; // grams (dry)
  // Signed error vs midpoint of prediction when available; positive = actual above prediction
  deltaFromMidpoint?: number;
  // Absolute percentage error vs midpoint when available
  absolutePercentageError?: number;
}

export interface QualitySnapshot {
  trichomeStatus?: string;
  budDensity?: number;
  averageTemperature?: number;
  averageHumidity?: number;
}

export interface ActualVsPredictedSummary {
  plantId: string;
  flowering: ActualVsPredictedFlowering;
  harvest: ActualVsPredictedHarvestWindow;
  yield: ActualVsPredictedYield;
  quality: QualitySnapshot;
}

export interface StrainSuccessPattern {
  strain: string;
  samples: number;
  averageDryYield?: number;
  averageFlowerDays?: number;
  taskCompletionCorrelation?: number; // 0..1 correlation proxy
  commonSuccessFactors: string[]; // derived hints
}

export interface RecommendationResult {
  patterns: StrainSuccessPattern[];
  recommendedStrains: string[]; // names ordered by performance
}

/**
 * Learning & Feedback Service
 *
 * Implements Task 9 (9.1 Actual vs predicted; 9.2 Recommendations) using existing
 * models and the HarvestDataIntegrator. This is additive and does not require
 * schema changes: actuals are computed from existing plant fields/metrics.
 */
export class LearningService {
  /**
   * Computes actual vs predicted metrics for a harvested plant.
   * Returns zeros or undefineds gracefully when inputs are missing.
   */
  static async computeActualVsPredicted(plant: Plant): Promise<ActualVsPredictedSummary> {
    if (!plant.harvestDate) {
      throw new Error('Plant has not been harvested yet');
    }

    // Flowering
    const predictedMinDays = plant.predictedFlowerMinDays ?? undefined;
    const predictedMaxDays = plant.predictedFlowerMaxDays ?? undefined;
    const baselineDate = plant.baselineDate ?? undefined;

    // Validate and normalize dates to day boundary before diffing
    let actualDays: number | undefined;
    if (baselineDate && isValidDate(baselineDate) && isValidDate(plant.harvestDate)) {
      const baseDay = startOfDay(baselineDate);
      const harvestDay = startOfDay(plant.harvestDate);

      if (baseDay.getTime() > harvestDay.getTime()) {
        // Inverted range; flag anomaly and skip computing negative diffs
        log.warn('[LearningService] baselineDate is after harvestDate; skipping actualDays computation', {
          plantId: plant.id,
          baselineDate: baselineDate?.toISOString?.(),
          harvestDate: plant.harvestDate?.toISOString?.(),
        });
        actualDays = undefined; // Domain: treat as unknown; adjust to 0 if needed later
      } else {
        actualDays = differenceInDays(harvestDay, baseDay);
      }
    } else if (baselineDate) {
      // baseline present but invalid; log and treat as unknown
      if (!isValidDate(baselineDate) || !isValidDate(plant.harvestDate)) {
        log.warn('[LearningService] Invalid baseline or harvest date; skipping actualDays computation', {
          plantId: plant.id,
          baselineDate,
          harvestDate: plant.harvestDate,
        });
      }
      actualDays = undefined;
    } else {
      actualDays = undefined;
    }

    let errorDaysFromRange: number | undefined;
    if (
      actualDays != null &&
      actualDays >= 0 &&
      predictedMinDays != null &&
      predictedMaxDays != null
    ) {
      if (actualDays < predictedMinDays) {
        errorDaysFromRange = predictedMinDays - actualDays;
      } else if (actualDays > predictedMaxDays) {
        errorDaysFromRange = actualDays - predictedMaxDays;
      } else {
        errorDaysFromRange = 0;
      }
    }

    // Harvest window
    const predictedStart = plant.predictedHarvestStart ?? undefined;
    const predictedEnd = plant.predictedHarvestEnd ?? undefined;
    const actualDate = plant.harvestDate;

    let errorDaysFromWindow: number | undefined;
    // Normalize to day boundary if available and valid to avoid timezone off-by-one
    const startDay = predictedStart && isValidDate(predictedStart) ? startOfDay(predictedStart) : undefined;
    const endDay = predictedEnd && isValidDate(predictedEnd) ? startOfDay(predictedEnd) : undefined;
    const actualDay = startOfDay(actualDate);

    if (startDay && endDay) {
      if (actualDay < startDay) {
        errorDaysFromWindow = differenceInDays(startDay, actualDay);
      } else if (actualDay > endDay) {
        errorDaysFromWindow = differenceInDays(actualDay, endDay);
      } else {
        errorDaysFromWindow = 0;
      }
    }

    // Yield
    const unit = plant.yieldUnit ?? undefined;
    const predictedMin = plant.yieldMin ?? undefined;
    const predictedMax = plant.yieldMax ?? undefined;
    const actualDry = plant.dryWeight ?? undefined;

    let deltaFromMidpoint: number | undefined;
    let absolutePercentageError: number | undefined;
    if (actualDry != null && predictedMin != null && predictedMax != null) {
      const midpoint = (predictedMin + predictedMax) / 2;
      deltaFromMidpoint = actualDry - midpoint;
      absolutePercentageError = midpoint > 0 ? Math.abs(deltaFromMidpoint) / midpoint : undefined;
    }

    // Quality snapshot from latest metrics
    const metrics = await plant.plantMetrics.extend(Q.sortBy('recorded_at', Q.desc)).fetch();
    const latest = metrics[0] as PlantMetrics | undefined;

    const quality: QualitySnapshot = {
      trichomeStatus: latest?.trichomeStatus,
      budDensity: latest?.budDensity,
      averageTemperature: await this.calculateAverageMetric(plant, 'temperature'),
      averageHumidity: await this.calculateAverageMetric(plant, 'humidity'),
    };

    return {
      plantId: plant.id,
      flowering: { predictedMinDays, predictedMaxDays, actualDays, errorDaysFromRange },
      harvest: { predictedStart: predictedStart ?? undefined, predictedEnd: predictedEnd ?? undefined, actualDate, errorDaysFromWindow },
      yield: { unit, predictedMin, predictedMax, actualDry, deltaFromMidpoint, absolutePercentageError },
      quality,
    };
  }

  /**
   * Aggregates historical analytics to surface success patterns and recommend strains.
   * Uses HarvestDataIntegrator to avoid duplicating analytics logic.
   */
  static async getRecommendationsForUser(): Promise<RecommendationResult> {
    try {
      const database = getDatabase();
      const plants = await database
        .get<Plant>('plants')
        .query(Q.where('harvest_date', Q.notEq(null)), Q.where('is_deleted', Q.notEq(true)))
        .fetch();

      if (plants.length === 0) {
        return { patterns: [], recommendedStrains: [] };
      }

      const analytics = await Promise.all(plants.map((p) => HarvestDataIntegrator.analyzeHarvestData(p)));

      // Group by strain
      const byStrain = analytics.reduce((acc, a) => {
        const key = a.strain || 'unknown';
        if (!acc[key]) acc[key] = [];
        acc[key]!.push(a);
        return acc;
      }, {} as Record<string, typeof analytics>);

      const patterns: StrainSuccessPattern[] = Object.entries(byStrain).map(([strain, arr]) => {
        const samples = arr.length;
        const averageDryYield = arr.reduce((s, a) => s + (a.finalWeights.dry || 0), 0) / samples;
        const averageFlowerDays = arr.reduce((s, a) => s + (a.floweringDays || 0), 0) / samples;
        const avgCompletion = arr.reduce((s, a) => s + a.taskCompletionRate, 0) / samples;

        const commonSuccessFactors = this.deriveCommonSuccessFactors(arr);
        const taskCompletionCorrelation = avgCompletion / 100; // simple proxy normalization

        return { strain, samples, averageDryYield, averageFlowerDays, taskCompletionCorrelation, commonSuccessFactors };
      });

      // Recommend top-performing strains by avg yield
      const recommendedStrains = patterns
        .slice()
        .sort((a, b) => (b.averageDryYield ?? 0) - (a.averageDryYield ?? 0))
        .map((p) => p.strain)
        .slice(0, 5);

      return { patterns, recommendedStrains };
    } catch (error) {
      log.error('[LearningService] Error generating recommendations', error);
      return { patterns: [], recommendedStrains: [] };
    }
  }

  /**
   * Convenience: compute and apply scheduling adjustments for in-progress plants of the same strain.
   * Delegates to HarvestDataIntegrator.updateFutureScheduling to keep logic centralized.
   */
  static async applyLearningToFutureSchedules(harvestedPlant: Plant): Promise<void> {
    try {
      const analytics = await HarvestDataIntegrator.analyzeHarvestData(harvestedPlant);
      await HarvestDataIntegrator.updateFutureScheduling(analytics);
    } catch (error) {
      log.error('[LearningService] Error applying learning to future schedules', error);
    }
  }

  // --- helpers ---
  private static async calculateAverageMetric(
    plant: Plant,
    field: keyof PlantMetrics
  ): Promise<number | undefined> {
    try {
      const metrics = await plant.plantMetrics.extend(Q.sortBy('recorded_at', Q.desc)).fetch();

      const validatedValues: number[] = [];
      for (const metric of metrics) {
        const raw: unknown = (metric as unknown as Record<string, unknown>)[
          field as unknown as string
        ];

        if (raw == null) {
          continue; // skip null/undefined
        }

        if (typeof raw === 'number' && Number.isFinite(raw)) {
          validatedValues.push(raw);
          continue;
        }

        // Allow numeric strings intentionally; convert explicitly
        if (typeof raw === 'string') {
          const parsed = Number(raw);
          if (Number.isFinite(parsed)) {
            validatedValues.push(parsed);
            continue;
          }
        }
        // Non-numeric values are skipped
      }

      if (validatedValues.length === 0) return undefined;
      const sum = validatedValues.reduce((acc, val) => acc + val, 0);
      return sum / validatedValues.length;
    } catch (error) {
      // Avoid swallowing unexpected errors silently; log context
      log.error('[LearningService] Failed to calculate average metric', {
        plantId: plant.id,
        field,
        error,
      });
      return undefined;
    }
  }

  private static deriveCommonSuccessFactors(arr: Awaited<ReturnType<typeof HarvestDataIntegrator.analyzeHarvestData>>[]): string[] {
    const factors: string[] = [];
    const avgYield = arr.reduce((s, a) => s + (a.finalWeights.dry || 0), 0) / arr.length;
    const highPerformers = arr.filter((a) => (a.finalWeights.dry || 0) >= avgYield * 1.1);

    // Check conditions among high performers
    const mediums = this.countBy(highPerformers.map((a) => a.growthConditions.medium));
    const lights = this.countBy(highPerformers.map((a) => a.growthConditions.lightCondition));

    const topMedium = Object.entries(mediums).sort(([, a], [, b]) => b - a)[0]?.[0];
    const topLight = Object.entries(lights).sort(([, a], [, b]) => b - a)[0]?.[0];

    if (topMedium) factors.push(`${topMedium} medium correlated with higher yields`);
    if (topLight) factors.push(`${topLight} lighting correlated with higher yields`);

    const highCompletionShare = arr.filter((a) => a.taskCompletionRate > 85).length / arr.length;
    if (highCompletionShare > 0.6) factors.push('High task completion correlated with better performance');

    return factors;
  }

  private static countBy(values: (string | undefined)[]): Record<string, number> {
    return values.reduce((acc, v) => {
      if (!v) return acc;
      acc[v] = (acc[v] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}


