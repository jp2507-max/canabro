import { Plant } from '../models/Plant';
import { PlantTask } from '../models/PlantTask';
import { PlantMetrics } from '../models/PlantMetrics';
import { HarvestPrediction } from './HarvestPredictionService';
import { log } from '../utils/logger';
import { getDatabase } from '../database/database';
import { Q } from '@nozbe/watermelondb';
import { addDays, subDays, format, differenceInDays } from '../utils/date';

export interface HarvestAnalytics {
  plantId: string;
  plantName: string;
  strain: string;
  actualHarvestDate: Date;
  predictedHarvestDate?: Date;
  predictionAccuracy?: number; // days difference
  totalGrowthDays: number;
  floweringDays: number;
  finalWeights: {
    wet?: number;
    dry?: number;
    trim?: number;
  };
  yieldPerDay: number;
  qualityMetrics: {
    trichomeStatus?: string;
    budDensity?: number;
    finalPH?: number;
  };
  growthConditions: {
    medium: string;
    lightCondition: string;
    averageTemperature?: number;
    averageHumidity?: number;
  };
  taskCompletionRate: number;
  lessonsLearned: string[];
}

export interface HarvestComparison {
  plants: HarvestAnalytics[];
  averageYield: number;
  bestPerformer: HarvestAnalytics;
  commonSuccessFactors: string[];
  improvementSuggestions: string[];
}

export interface FuturePlanningData {
  optimalPlantingDates: Date[];
  recommendedStrains: string[];
  suggestedImprovements: string[];
  capacityPlanning: {
    maxConcurrentPlants: number;
    harvestFrequency: number; // days
    yearlyProjection: number;
  };
}

export class HarvestDataIntegrator {
  /**
   * Analyzes completed harvest data for a plant
   */
  static async analyzeHarvestData(plant: Plant): Promise<HarvestAnalytics> {
    try {
      log.info(`[HarvestDataIntegrator] Analyzing harvest data for plant ${plant.id}`);

      if (!plant.harvestDate) {
        throw new Error('Plant has not been harvested yet');
      }

      const database = getDatabase();
      
      // Get plant metrics history
      const metrics = await plant.plantMetrics
        .extend(Q.sortBy('recorded_at', Q.desc))
        .fetch();

      // Get task completion data
      const tasks = await database
        .get<PlantTask>('plant_tasks')
        .query(Q.where('plant_id', plant.id))
        .fetch();

      // Calculate growth periods
      const plantedDate = new Date(plant.plantedDate);
      const harvestDate = plant.harvestDate;
      const totalGrowthDays = differenceInDays(harvestDate, plantedDate);
      
      // Estimate flowering period (assume flowering started when growth stage changed)
      const floweringDays = this.estimateFloweringDays(plant, metrics);

      // Calculate task completion rate
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const taskCompletionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

      // Get final quality metrics
      const finalMetrics = metrics[0]; // Most recent metrics
      const qualityMetrics = {
        trichomeStatus: finalMetrics?.trichomeStatus,
        budDensity: finalMetrics?.budDensity,
        finalPH: finalMetrics?.phLevel,
      };

      // Calculate yield per day
      const dryWeight = plant.dryWeight || 0;
      const yieldPerDay = totalGrowthDays > 0 ? dryWeight / totalGrowthDays : 0;

      // Generate lessons learned
      const lessonsLearned = await this.generateLessonsLearned(plant, tasks, metrics);

      // Check for prediction accuracy if available
      let predictionAccuracy: number | undefined;
      let predictedHarvestDate: Date | undefined;
      
      if (plant.expectedHarvestDate) {
        predictedHarvestDate = new Date(plant.expectedHarvestDate);
        predictionAccuracy = Math.abs(differenceInDays(harvestDate, predictedHarvestDate));
      }

      const analytics: HarvestAnalytics = {
        plantId: plant.id,
        plantName: plant.name,
        strain: plant.strain,
        actualHarvestDate: harvestDate,
        predictedHarvestDate,
        predictionAccuracy,
        totalGrowthDays,
        floweringDays,
        finalWeights: {
          wet: plant.wetWeight,
          dry: plant.dryWeight,
          trim: plant.trimWeight,
        },
        yieldPerDay,
        qualityMetrics,
        growthConditions: {
          medium: plant.growMedium || 'unknown',
          lightCondition: plant.lightCondition || 'unknown',
          averageTemperature: this.calculateAverageMetric(metrics, 'temperature'),
          averageHumidity: this.calculateAverageMetric(metrics, 'humidity'),
        },
        taskCompletionRate,
        lessonsLearned,
      };

      log.info(`[HarvestDataIntegrator] Completed harvest analysis for plant ${plant.id}`);
      return analytics;
    } catch (error) {
      log.error(`[HarvestDataIntegrator] Error analyzing harvest data:`, error);
      throw error;
    }
  }

  /**
   * Compares multiple harvests to identify patterns and improvements
   */
  static async compareHarvests(plants: Plant[]): Promise<HarvestComparison> {
    try {
      log.info(`[HarvestDataIntegrator] Comparing ${plants.length} harvests`);

      const harvestedPlants = plants.filter(p => p.harvestDate);
      
      if (harvestedPlants.length === 0) {
        throw new Error('No harvested plants to compare');
      }

      // Analyze each plant
      const analytics = await Promise.all(
        harvestedPlants.map(plant => this.analyzeHarvestData(plant))
      );

      // Calculate averages
      const totalYield = analytics.reduce((sum, a) => sum + (a.finalWeights.dry || 0), 0);
      const averageYield = totalYield / analytics.length;

      // Find best performer
      const bestPerformer = analytics.reduce((best, current) => 
        (current.finalWeights.dry || 0) > (best.finalWeights.dry || 0) ? current : best
      );

      // Identify common success factors
      const commonSuccessFactors = this.identifySuccessFactors(analytics);

      // Generate improvement suggestions
      const improvementSuggestions = this.generateImprovementSuggestions(analytics);

      const comparison: HarvestComparison = {
        plants: analytics,
        averageYield,
        bestPerformer,
        commonSuccessFactors,
        improvementSuggestions,
      };

      log.info(`[HarvestDataIntegrator] Completed harvest comparison`);
      return comparison;
    } catch (error) {
      log.error(`[HarvestDataIntegrator] Error comparing harvests:`, error);
      throw error;
    }
  }

  /**
   * Generates future planning recommendations based on harvest history
   */
  static async generateFuturePlanningData(plants: Plant[]): Promise<FuturePlanningData> {
    try {
      log.info(`[HarvestDataIntegrator] Generating future planning data`);

      const harvestedPlants = plants.filter(p => p.harvestDate);
      const analytics = await Promise.all(
        harvestedPlants.map(plant => this.analyzeHarvestData(plant))
      );

      // Calculate optimal planting dates based on harvest cycles
      const optimalPlantingDates = this.calculateOptimalPlantingDates(analytics);

      // Recommend strains based on performance
      const recommendedStrains = this.recommendStrains(analytics);

      // Generate improvement suggestions
      const suggestedImprovements = this.generateImprovementSuggestions(analytics);

      // Calculate capacity planning
      const capacityPlanning = this.calculateCapacityPlanning(analytics);

      const planningData: FuturePlanningData = {
        optimalPlantingDates,
        recommendedStrains,
        suggestedImprovements,
        capacityPlanning,
      };

      log.info(`[HarvestDataIntegrator] Generated future planning data`);
      return planningData;
    } catch (error) {
      log.error(`[HarvestDataIntegrator] Error generating future planning data:`, error);
      throw error;
    }
  }

  /**
   * Updates future scheduling based on harvest outcomes
   */
  static async updateFutureScheduling(harvestAnalytics: HarvestAnalytics): Promise<void> {
    try {
      log.info(`[HarvestDataIntegrator] Updating future scheduling based on harvest data`);

      const database = getDatabase();
      
      // Find plants of the same strain that are still growing
      const similarPlants = await database
        .get<Plant>('plants')
        .query(
          Q.where('strain', harvestAnalytics.strain),
          Q.where('growth_stage', Q.notEq('harvested')),
          Q.where('is_deleted', Q.notEq(true))
        )
        .fetch();

      for (const plant of similarPlants) {
        // Update expected harvest date based on actual performance
        if (harvestAnalytics.predictionAccuracy !== undefined) {
          const currentExpected = plant.expectedHarvestDate ? new Date(plant.expectedHarvestDate) : null;
          
          if (currentExpected) {
            // Adjust prediction based on historical accuracy
            const adjustmentDays = harvestAnalytics.predictionAccuracy > 7 ? 
              Math.floor(harvestAnalytics.predictionAccuracy / 2) : 0;
            
            const adjustedDate = addDays(currentExpected, adjustmentDays);
            
            await plant.update((p) => {
              p.expectedHarvestDate = format(adjustedDate, 'yyyy-MM-dd');
            });
          }
        }

        // Update task schedules based on completion rates
        if (harvestAnalytics.taskCompletionRate < 80) {
          // If completion rate was low, add buffer time to future tasks
          const futureTasks = await database
            .get<PlantTask>('plant_tasks')
            .query(
              Q.where('plant_id', plant.id),
              Q.where('status', 'pending'),
              Q.where('due_date', Q.gte(new Date().toISOString()))
            )
            .fetch();

          await database.write(async () => {
            for (const task of futureTasks) {
              const currentDue = new Date(task.dueDate);
              const bufferedDue = addDays(currentDue, 1); // Add 1 day buffer
              
              await task.update((t) => {
                t.dueDate = bufferedDue.toISOString();
              });
            }
          });
        }
      }

      log.info(`[HarvestDataIntegrator] Updated scheduling for ${similarPlants.length} similar plants`);
    } catch (error) {
      log.error(`[HarvestDataIntegrator] Error updating future scheduling:`, error);
    }
  }

  private static estimateFloweringDays(plant: Plant, metrics: PlantMetrics[]): number {
    // Try to find when flowering stage was first recorded
    const floweringMetrics = metrics
      .filter(m => m.recordedAt)
      .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());

    // If we have metrics, try to estimate flowering start
    if (floweringMetrics.length > 0 && plant.harvestDate) {
      // Assume flowering started 8 weeks after planting for photoperiod
      const plantedDate = new Date(plant.plantedDate);
      const estimatedFloweringStart = plant.isAutoFlower ? 
        addDays(plantedDate, 21) : // 3 weeks for auto
        addDays(plantedDate, 56);   // 8 weeks for photo

      return differenceInDays(plant.harvestDate, estimatedFloweringStart);
    }

    // Fallback estimates
    return plant.isAutoFlower ? 49 : 63; // 7 or 9 weeks
  }

  private static calculateAverageMetric(metrics: PlantMetrics[], field: keyof PlantMetrics): number | undefined {
    const values = metrics
      .map(m => m[field] as number)
      .filter(v => typeof v === 'number' && !isNaN(v));

    if (values.length === 0) return undefined;
    
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private static async generateLessonsLearned(
    plant: Plant,
    tasks: PlantTask[],
    metrics: PlantMetrics[]
  ): Promise<string[]> {
    const lessons: string[] = [];

    // Task completion lessons
    const completionRate = tasks.length > 0 ? 
      (tasks.filter(t => t.status === 'completed').length / tasks.length) * 100 : 0;

    if (completionRate < 70) {
      lessons.push('Improve task completion rate - many scheduled tasks were missed');
    } else if (completionRate > 90) {
      lessons.push('Excellent task adherence - consistent care schedule was maintained');
    }

    // Yield lessons
    const yieldPerDay = plant.dryWeight && plant.harvestDate ? 
      plant.dryWeight / differenceInDays(plant.harvestDate, new Date(plant.plantedDate)) : 0;

    if (yieldPerDay > 1) {
      lessons.push('High yield efficiency - growth conditions and care were optimal');
    } else if (yieldPerDay < 0.5) {
      lessons.push('Low yield efficiency - consider improving growing conditions or strain selection');
    }

    // Environmental lessons
    const avgTemp = this.calculateAverageMetric(metrics, 'temperature');
    const avgHumidity = this.calculateAverageMetric(metrics, 'humidity');

    if (avgTemp && (avgTemp < 18 || avgTemp > 28)) {
      lessons.push('Temperature was outside optimal range - consider climate control improvements');
    }

    if (avgHumidity && (avgHumidity < 40 || avgHumidity > 70)) {
      lessons.push('Humidity levels were suboptimal - adjust ventilation and humidity control');
    }

    // Strain-specific lessons
    if (plant.isAutoFlower) {
      lessons.push('Auto-flower strain completed successfully - consider for consistent harvests');
    }

    return lessons;
  }

  private static identifySuccessFactors(analytics: HarvestAnalytics[]): string[] {
    const factors: string[] = [];
    
    // High-performing plants analysis
    const topPerformers = analytics
      .filter(a => (a.finalWeights.dry || 0) > analytics.reduce((sum, b) => sum + (b.finalWeights.dry || 0), 0) / analytics.length)
      .slice(0, 3);

    // Common growing conditions among top performers
    const commonMediums = this.findCommonValues(topPerformers, 'growthConditions.medium');
    const commonLightConditions = this.findCommonValues(topPerformers, 'growthConditions.lightCondition');

    if (commonMediums.length > 0) {
      factors.push(`${commonMediums[0]} growing medium showed best results`);
    }

    if (commonLightConditions.length > 0) {
      factors.push(`${commonLightConditions[0]} lighting performed well`);
    }

    // Task completion correlation
    const highCompletionPlants = analytics.filter(a => a.taskCompletionRate > 85);
    if (highCompletionPlants.length > analytics.length * 0.6) {
      factors.push('Consistent task completion correlates with better yields');
    }

    return factors;
  }

  private static generateImprovementSuggestions(analytics: HarvestAnalytics[]): string[] {
    const suggestions: string[] = [];
    
    // Yield improvements
    const avgYield = analytics.reduce((sum, a) => sum + (a.finalWeights.dry || 0), 0) / analytics.length;
    const lowYieldPlants = analytics.filter(a => (a.finalWeights.dry || 0) < avgYield * 0.8);

    if (lowYieldPlants.length > 0) {
      suggestions.push('Focus on improving growing conditions for underperforming plants');
    }

    // Task completion improvements
    const avgCompletion = analytics.reduce((sum, a) => sum + a.taskCompletionRate, 0) / analytics.length;
    if (avgCompletion < 80) {
      suggestions.push('Implement better task reminder system to improve care consistency');
    }

    // Environmental improvements
    const tempIssues = analytics.filter(a => 
      a.growthConditions.averageTemperature && 
      (a.growthConditions.averageTemperature < 18 || a.growthConditions.averageTemperature > 28)
    );

    if (tempIssues.length > analytics.length * 0.3) {
      suggestions.push('Invest in better temperature control systems');
    }

    // Prediction accuracy improvements
    const inaccuratePredictions = analytics.filter(a => 
      a.predictionAccuracy && a.predictionAccuracy > 7
    );

    if (inaccuratePredictions.length > analytics.length * 0.4) {
      suggestions.push('Improve harvest prediction accuracy by recording more detailed growth metrics');
    }

    return suggestions;
  }

  private static calculateOptimalPlantingDates(analytics: HarvestAnalytics[]): Date[] {
    const dates: Date[] = [];
    const today = new Date();
    
    // Calculate average growth cycle length
    const avgGrowthDays = analytics.reduce((sum, a) => sum + a.totalGrowthDays, 0) / analytics.length;
    
    // Suggest planting dates for continuous harvest every 4-6 weeks
    for (let i = 0; i < 6; i++) {
      const plantingDate = addDays(today, i * 35); // 5 week intervals
      dates.push(plantingDate);
    }
    
    return dates;
  }

  private static recommendStrains(analytics: HarvestAnalytics[]): string[] {
    // Rank strains by performance
    const strainPerformance = analytics.reduce((acc, a) => {
      if (!acc[a.strain]) {
        acc[a.strain] = { totalYield: 0, count: 0, avgCompletion: 0 };
      }
      const strainData = acc[a.strain]!;
      strainData.totalYield += a.finalWeights.dry || 0;
      strainData.count += 1;
      strainData.avgCompletion += a.taskCompletionRate;
      return acc;
    }, {} as Record<string, { totalYield: number; count: number; avgCompletion: number }>);

    return Object.entries(strainPerformance)
      .map(([strain, data]) => ({
        strain,
        avgYield: data.totalYield / data.count,
        avgCompletion: data.avgCompletion / data.count,
      }))
      .sort((a, b) => b.avgYield - a.avgYield)
      .slice(0, 3)
      .map(s => s.strain);
  }

  private static calculateCapacityPlanning(analytics: HarvestAnalytics[]): FuturePlanningData['capacityPlanning'] {
    const avgGrowthDays = analytics.reduce((sum, a) => sum + a.totalGrowthDays, 0) / analytics.length;
    
    return {
      maxConcurrentPlants: Math.ceil(analytics.length * 1.2), // 20% buffer
      harvestFrequency: Math.floor(avgGrowthDays / 4), // Staggered harvests
      yearlyProjection: Math.floor(365 / (avgGrowthDays / 4)), // Harvests per year
    };
  }

  private static findCommonValues(items: unknown[], path: string): string[] {
    const values = items.map(item => {
      const keys = path.split('.');
      let value: any = item;
      for (const key of keys) {
        if (value === null || value === undefined || typeof value !== 'object') return null;
        value = (value as Record<string, unknown>)[key];
      }
      return value;
    }).filter(Boolean);

    const counts = values.reduce((acc: Record<string, number>, val: any) => {
      const key = String(val);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .map(([value]) => value);
  }
}