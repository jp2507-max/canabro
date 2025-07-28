import { Plant } from '../models/Plant';
import { PlantMetrics } from '../models/PlantMetrics';
import { Strain } from '../models/Strain';
import { log } from '../utils/logger';
import { addDays, format } from '../utils/date';
import { Q } from '@nozbe/watermelondb';

export interface HarvestPrediction {
  plantId: string;
  predictedHarvestDate: Date;
  confidence: 'low' | 'medium' | 'high';
  daysRemaining: number;
  readinessIndicators: {
    trichomes: 'clear' | 'cloudy' | 'amber' | 'mixed' | 'unknown';
    pistils: number; // percentage brown
    budDensity: number; // 1-10 scale
    floweringWeeks: number;
  };
  recommendations: string[];
}

export interface HarvestWindow {
  earlyHarvest: Date;
  optimalHarvest: Date;
  lateHarvest: Date;
  currentReadiness: number; // 0-100%
}

export class HarvestPredictionService {
  /**
   * Predicts harvest date based on plant data, strain characteristics, and growth metrics
   */
  static async predictHarvestDate(plant: Plant): Promise<HarvestPrediction> {
    try {
      log.info(`[HarvestPredictionService] Predicting harvest for plant ${plant.id}`);

      // Get latest metrics
      const latestMetrics = await plant.plantMetrics
        .extend(Q.sortBy('recorded_at', Q.desc), Q.take(1))
        .fetch();
      
      const metrics = latestMetrics[0];
      
      // Get strain data if available
      const strain = plant.strainObj;
      
      // Calculate days since planting
      const plantedDate = new Date(plant.plantedDate);
      const daysSincePlanting = Math.floor((Date.now() - plantedDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Determine flowering weeks based on growth stage and planting date
      const floweringWeeks = this.calculateFloweringWeeks(plant, daysSincePlanting);
      
      // Get strain-specific flowering time
      const strainFloweringTime = this.getStrainFloweringTime(strain, plant.isAutoFlower || false);
      
      // Calculate predicted harvest date
      const predictedDate = this.calculatePredictedHarvestDate(
        plantedDate,
        plant.growthStage,
        strainFloweringTime,
        plant.isAutoFlower || false
      );
      
      // Assess readiness indicators
      const readinessIndicators = {
        trichomes: (metrics?.trichomeStatus as any) || 'unknown',
        pistils: metrics?.pistilBrownPercentage || 0,
        budDensity: metrics?.budDensity || 0,
        floweringWeeks,
      };
      
      // Calculate confidence based on available data
      const confidence = this.calculateConfidence(plant, metrics, strain);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(
        plant,
        readinessIndicators,
        floweringWeeks,
        strainFloweringTime
      );
      
      const daysRemaining = Math.max(0, Math.floor((predictedDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      
      const prediction: HarvestPrediction = {
        plantId: plant.id,
        predictedHarvestDate: predictedDate,
        confidence,
        daysRemaining,
        readinessIndicators,
        recommendations,
      };
      
      log.info(`[HarvestPredictionService] Prediction complete for plant ${plant.id}:`, {
        predictedDate: format(predictedDate, 'yyyy-MM-dd'),
        daysRemaining,
        confidence,
      });
      
      return prediction;
    } catch (error) {
      log.error(`[HarvestPredictionService] Error predicting harvest for plant ${plant.id}:`, error);
      
      // Return fallback prediction
      return {
        plantId: plant.id,
        predictedHarvestDate: addDays(new Date(), 30), // Default 30 days
        confidence: 'low',
        daysRemaining: 30,
        readinessIndicators: {
          trichomes: 'unknown',
          pistils: 0,
          budDensity: 0,
          floweringWeeks: 0,
        },
        recommendations: ['Unable to generate accurate prediction. Please update plant metrics.'],
      };
    }
  }

  /**
   * Calculates harvest window with early, optimal, and late harvest dates
   */
  static async calculateHarvestWindow(plant: Plant): Promise<HarvestWindow> {
    const prediction = await this.predictHarvestDate(plant);
    const optimalDate = prediction.predictedHarvestDate;
    
    // Early harvest: 1-2 weeks before optimal
    const earlyHarvest = addDays(optimalDate, -10);
    
    // Late harvest: 1 week after optimal
    const lateHarvest = addDays(optimalDate, 7);
    
    // Calculate current readiness percentage
    const currentReadiness = this.calculateReadinessPercentage(prediction.readinessIndicators);
    
    return {
      earlyHarvest,
      optimalHarvest: optimalDate,
      lateHarvest,
      currentReadiness,
    };
  }

  /**
   * Updates plant's expected harvest date based on prediction
   */
  static async updatePlantHarvestPrediction(plant: Plant): Promise<void> {
    try {
      const prediction = await this.predictHarvestDate(plant);
      
      await plant.update((p) => {
        p.expectedHarvestDate = format(prediction.predictedHarvestDate, 'yyyy-MM-dd');
      });
      
      log.info(`[HarvestPredictionService] Updated expected harvest date for plant ${plant.id}`);
    } catch (error) {
      log.error(`[HarvestPredictionService] Error updating harvest prediction for plant ${plant.id}:`, error);
    }
  }

  private static calculateFloweringWeeks(plant: Plant, daysSincePlanting: number): number {
    // Estimate flowering weeks based on growth stage and days since planting
    switch (plant.growthStage) {
      case 'flowering':
        // Assume flowering started 2 weeks ago if no specific data
        return Math.max(0, Math.floor((daysSincePlanting - 56) / 7)); // 8 weeks veg + flowering time
      case 'pre-flowering':
        return 0;
      case 'late-flowering':
        return Math.max(6, Math.floor((daysSincePlanting - 56) / 7));
      default:
        return 0;
    }
  }

  private static getStrainFloweringTime(strain: Strain | undefined, isAutoFlower: boolean): number {
    if (isAutoFlower) {
      return 70; // Auto-flowers typically 10 weeks total
    }
    
    // Try to extract flowering time from strain data
    // This would need to be enhanced based on actual strain data structure
    return 63; // Default 9 weeks flowering for photoperiod strains
  }

  private static calculatePredictedHarvestDate(
    plantedDate: Date,
    growthStage: string,
    strainFloweringTime: number,
    isAutoFlower: boolean
  ): Date {
    if (isAutoFlower) {
      // Auto-flowers: total lifecycle is typically 10-12 weeks
      return addDays(plantedDate, strainFloweringTime);
    }
    
    // Photoperiod plants: vegetative + flowering time
    const vegetativeWeeks = 8; // Default 8 weeks veg
    const totalDays = (vegetativeWeeks * 7) + strainFloweringTime;
    
    // Adjust based on current growth stage
    switch (growthStage) {
      case 'flowering':
        // If already flowering, calculate from current date
        return addDays(new Date(), strainFloweringTime - 14); // Assume 2 weeks into flowering
      case 'late-flowering':
        // Close to harvest
        return addDays(new Date(), 14); // 2 weeks remaining
      default:
        return addDays(plantedDate, totalDays);
    }
  }

  private static calculateConfidence(
    plant: Plant,
    metrics: PlantMetrics | undefined,
    strain: Strain | undefined
  ): 'low' | 'medium' | 'high' {
    let score = 0;
    
    // Strain data available
    if (strain) score += 2;
    
    // Recent metrics available
    if (metrics) {
      score += 2;
      
      // Specific flowering indicators
      if (metrics.trichomeStatus) score += 2;
      if (metrics.pistilBrownPercentage !== undefined) score += 1;
      if (metrics.budDensity) score += 1;
    }
    
    // Growth stage is flowering-related
    if (['flowering', 'pre-flowering', 'late-flowering'].includes(plant.growthStage)) {
      score += 2;
    }
    
    // Auto-flower plants are more predictable
    if (plant.isAutoFlower) score += 1;
    
    if (score >= 8) return 'high';
    if (score >= 5) return 'medium';
    return 'low';
  }

  private static generateRecommendations(
    plant: Plant,
    indicators: HarvestPrediction['readinessIndicators'],
    floweringWeeks: number,
    strainFloweringTime: number
  ): string[] {
    const recommendations: string[] = [];
    
    // Trichome recommendations
    switch (indicators.trichomes) {
      case 'clear':
        recommendations.push('Trichomes are still clear. Wait for cloudy trichomes before harvesting.');
        break;
      case 'cloudy':
        recommendations.push('Trichomes are cloudy - optimal harvest window is approaching.');
        break;
      case 'amber':
        recommendations.push('Trichomes are turning amber. Harvest soon for more sedative effects.');
        break;
      case 'mixed':
        recommendations.push('Mixed trichome colors indicate harvest window is open.');
        break;
      default:
        recommendations.push('Check trichomes with magnification to assess harvest readiness.');
    }
    
    // Pistil recommendations
    if (indicators.pistils < 50) {
      recommendations.push('Less than 50% of pistils are brown. Plant needs more time to mature.');
    } else if (indicators.pistils > 80) {
      recommendations.push('Most pistils are brown. Check trichomes for final harvest timing.');
    }
    
    // Flowering time recommendations
    const expectedFloweringWeeks = Math.floor(strainFloweringTime / 7);
    if (floweringWeeks < expectedFloweringWeeks - 2) {
      recommendations.push(`Plant has ${floweringWeeks} weeks of flowering. Expected ${expectedFloweringWeeks} weeks for this strain.`);
    }
    
    // Bud density recommendations
    if (indicators.budDensity > 0 && indicators.budDensity < 6) {
      recommendations.push('Buds could benefit from more development time for better density.');
    }
    
    return recommendations;
  }

  private static calculateReadinessPercentage(indicators: HarvestPrediction['readinessIndicators']): number {
    let readiness = 0;
    
    // Trichome readiness (40% weight)
    switch (indicators.trichomes) {
      case 'clear': readiness += 0; break;
      case 'cloudy': readiness += 35; break;
      case 'amber': readiness += 40; break;
      case 'mixed': readiness += 40; break;
      default: readiness += 10; break;
    }
    
    // Pistil readiness (30% weight)
    readiness += Math.min(30, (indicators.pistils / 100) * 30);
    
    // Flowering time readiness (20% weight)
    const expectedWeeks = 9; // Default flowering time
    readiness += Math.min(20, (indicators.floweringWeeks / expectedWeeks) * 20);
    
    // Bud density readiness (10% weight)
    readiness += Math.min(10, (indicators.budDensity / 10) * 10);
    
    return Math.min(100, Math.max(0, readiness));
  }
}