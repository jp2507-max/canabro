/**
 * Strain Calendar Integration Service
 * 
 * Implements strain-specific task scheduling, template recommendations,
 * flowering time predictions, and strain comparison for calendar optimization.
 * 
 * Task 6.1: Connect calendar with plant strain characteristics
 * Requ  private static convertToStrainCharacteristics(strain: DataStrain | Strain): StrainCharacteristics {
    // Handle different strain object structures
    const isDataStrain = 'thcContent' in strain;
    
    return {
      strainId: strain.id as string,
      name: strain.name as string,
      type: (strain.type || 'unknown') as 'indica' | 'sativa' | 'hybrid' | 'cbd' | 'unknown',
      floweringTime: isDataStrain ? 8 : ((strain as any).floweringTime as number) || 8, // Default 8 weeks
      thcPercentage: isDataStrain ? (strain as DataStrain).thcContent : (strain as any).thcPercentage as number | undefined,
      cbdPercentage: isDataStrain ? (strain as DataStrain).cbdContent : (strain as any).cbdPercentage as number | undefined,
      growDifficulty: isDataStrain ? (strain as DataStrain).growDifficulty : (strain as any).growDifficulty as string | undefined,
      averageYield: isDataStrain ? undefined : (strain as any).averageYield as string | undefined,
      heightIndoor: isDataStrain ? undefined : (strain as any).heightIndoor as string | undefined,
      heightOutdoor: isDataStrain ? undefined : (strain as any).heightOutdoor as string | undefined,
    };
  }C1, R6-AC5
 */

import { Q } from '@nozbe/watermelondb';
import { addDays, addWeeks } from '../utils/date';
import { log } from '../utils/logger';

import { Plant } from '../models/Plant';
import { Strain } from '../models/Strain';
import { ScheduleTemplate } from '../models/ScheduleTemplate';
import { PlantTask } from '../models/PlantTask';
import { GrowthStage } from '../types/plant';
import { TaskType } from '../types/taskTypes';
import { Strain as DataStrain, getStrainById } from '../data/strains';
import { database } from '../models';
import { TaskAutomationService } from './TaskAutomationService';

export interface StrainCharacteristics {
  strainId: string;
  name: string;
  type: 'indica' | 'sativa' | 'hybrid' | 'cbd' | 'unknown';
  floweringTime: number; // weeks
  thcPercentage?: number;
  cbdPercentage?: number;
  growDifficulty?: string;
  averageYield?: string;
  heightIndoor?: string;
  heightOutdoor?: string;
}

export interface FloweringPrediction {
  plantId: string;
  strainName: string;
  plantedDate: Date;
  expectedFloweringStart: Date;
  expectedFloweringEnd: Date;
  expectedHarvestDate: Date;
  confidenceLevel: 'low' | 'medium' | 'high';
  factors: string[];
}

export interface StrainTemplateRecommendation {
  templateId: string;
  templateName: string;
  strainType: string;
  matchScore: number; // 0-100
  reasons: string[];
  estimatedDuration: number; // weeks
}

export interface StrainScheduleComparison {
  strainA: StrainCharacteristics;
  strainB: StrainCharacteristics;
  taskFrequencyDifferences: Record<TaskType, number>; // percentage difference
  timelineDifferences: {
    floweringStart: number; // days difference
    harvestDate: number; // days difference
    totalCycle: number; // days difference
  };
  recommendations: string[];
}

export class StrainCalendarIntegrationService {
  
  /**
   * Implement strain-specific task scheduling
   * R6-AC1: WHEN scheduling tasks THEN the system SHALL consider plant strain characteristics
   */
  static async scheduleStrainSpecificTasks(
    plant: Plant,
    growthStage: GrowthStage,
    customStrainData?: StrainCharacteristics
  ): Promise<PlantTask[]> {
    try {
      log.info(`[StrainCalendar] Scheduling strain-specific tasks for ${plant.name} in ${growthStage}`);

      // Get strain characteristics
      const strainData = customStrainData || await this.getStrainCharacteristics(plant);
      if (!strainData) {
        log.warn(`[StrainCalendar] No strain data found for ${plant.name}, using default scheduling`);
        return TaskAutomationService.scheduleForGrowthStage(plant, growthStage);
      }

      // Get strain-specific task adjustments
      const taskAdjustments = this.calculateStrainTaskAdjustments(strainData, growthStage);
      
      // Generate base tasks using existing service
      const baseTasks = await TaskAutomationService.scheduleForGrowthStage(plant, growthStage);
      
      // Apply strain-specific modifications
      const strainSpecificTasks = await this.applyStrainModifications(baseTasks, taskAdjustments, strainData);

      log.info(`[StrainCalendar] Generated ${strainSpecificTasks.length} strain-specific tasks for ${plant.name}`);
      return strainSpecificTasks;
    } catch (error) {
      log.error(`[StrainCalendar] Error scheduling strain-specific tasks:`, error);
      return [];
    }
  }

  /**
   * Create strain-based template recommendations
   * R6-AC1: Consider strain characteristics for scheduling
   */
  static async getStrainBasedTemplateRecommendations(
    strainId: string,
    growingEnvironment: 'indoor' | 'outdoor' | 'hydroponic' = 'indoor'
  ): Promise<StrainTemplateRecommendation[]> {
    try {
      log.info(`[StrainCalendar] Getting template recommendations for strain ${strainId}`);

      const strain = getStrainById(strainId);
      if (!strain) {
        log.warn(`[StrainCalendar] Strain not found: ${strainId}`);
        return [];
      }

      // Get all available templates
      const templates = await database
        .get<ScheduleTemplate>('schedule_templates')
        .query(
          Q.where('is_public', true),
          Q.sortBy('usage_count', Q.desc)
        )
        .fetch();

      const recommendations: StrainTemplateRecommendation[] = [];

      for (const template of templates) {
        const matchScore = this.calculateTemplateMatchScore(strain, template, growingEnvironment);
        
        if (matchScore > 30) { // Only recommend templates with >30% match
          const reasons = this.generateMatchReasons(strain, template, matchScore);
          
          recommendations.push({
            templateId: template.id,
            templateName: template.name,
            strainType: template.strainType || 'unknown',
            matchScore,
            reasons,
            estimatedDuration: template.durationWeeks,
          });
        }
      }

      // Sort by match score
      recommendations.sort((a, b) => b.matchScore - a.matchScore);

      log.info(`[StrainCalendar] Found ${recommendations.length} template recommendations`);
      return recommendations.slice(0, 5); // Return top 5 recommendations
    } catch (error) {
      log.error(`[StrainCalendar] Error getting template recommendations:`, error);
      return [];
    }
  }

  /**
   * Add flowering time and harvest date predictions
   * R6-AC1: Consider strain characteristics for scheduling
   */
  static async predictFloweringAndHarvest(plant: Plant): Promise<FloweringPrediction | null> {
    try {
      log.info(`[StrainCalendar] Predicting flowering and harvest for ${plant.name}`);

      const strainData = await this.getStrainCharacteristics(plant);
      if (!strainData || !strainData.floweringTime) {
        log.warn(`[StrainCalendar] Insufficient strain data for flowering prediction`);
        return null;
      }

      const plantedDate = new Date(plant.plantedDate);
      const currentStage = plant.growthStage as GrowthStage;
      
      // Calculate expected flowering start based on strain and current stage
      const { floweringStart, confidenceLevel, factors } = this.calculateFloweringStart(
        plantedDate,
        currentStage,
        strainData
      );

      // Calculate flowering end and harvest dates
      const floweringDuration = strainData.floweringTime * 7; // Convert weeks to days
      const floweringEnd = addDays(floweringStart, floweringDuration);
      const harvestDate = addDays(floweringEnd, 7); // Add 1 week for harvest preparation

      const prediction: FloweringPrediction = {
        plantId: plant.id,
        strainName: strainData.name,
        plantedDate,
        expectedFloweringStart: floweringStart,
        expectedFloweringEnd: floweringEnd,
        expectedHarvestDate: harvestDate,
        confidenceLevel,
        factors,
      };

      log.info(`[StrainCalendar] Flowering prediction completed for ${plant.name}`);
      return prediction;
    } catch (error) {
      log.error(`[StrainCalendar] Error predicting flowering and harvest:`, error);
      return null;
    }
  }

  /**
   * Build strain comparison for scheduling optimization
   * R6-AC5: WHEN comparing plants THEN the calendar SHALL show how different schedules affected outcomes
   */
  static async compareStrainSchedules(
    strainIdA: string,
    strainIdB: string
  ): Promise<StrainScheduleComparison | null> {
    try {
      log.info(`[StrainCalendar] Comparing schedules for strains ${strainIdA} and ${strainIdB}`);

      const strainA = getStrainById(strainIdA);
      const strainB = getStrainById(strainIdB);

      if (!strainA || !strainB) {
        log.warn(`[StrainCalendar] One or both strains not found for comparison`);
        return null;
      }

      const strainDataA = this.convertToStrainCharacteristics(strainA);
      const strainDataB = this.convertToStrainCharacteristics(strainB);

      // Calculate task frequency differences
      const taskFrequencyDifferences = this.calculateTaskFrequencyDifferences(strainDataA, strainDataB);

      // Calculate timeline differences
      const timelineDifferences = this.calculateTimelineDifferences(strainDataA, strainDataB);

      // Generate optimization recommendations
      const recommendations = this.generateOptimizationRecommendations(strainDataA, strainDataB);

      const comparison: StrainScheduleComparison = {
        strainA: strainDataA,
        strainB: strainDataB,
        taskFrequencyDifferences,
        timelineDifferences,
        recommendations,
      };

      log.info(`[StrainCalendar] Strain comparison completed`);
      return comparison;
    } catch (error) {
      log.error(`[StrainCalendar] Error comparing strain schedules:`, error);
      return null;
    }
  }

  /**
   * Get strain characteristics from plant or strain ID
   */
  private static async getStrainCharacteristics(plant: Plant): Promise<StrainCharacteristics | null> {
    try {
      if (!plant.strainId) {
        return null;
      }

      const strain = getStrainById(plant.strainId);
      if (!strain) {
        return null;
      }

      return this.convertToStrainCharacteristics(strain);
    } catch (error) {
      log.error(`[StrainCalendar] Error getting strain characteristics:`, error);
      return null;
    }
  }

  /**
   * Convert Strain model to StrainCharacteristics interface
   */
  private static convertToStrainCharacteristics(strain: DataStrain | Strain): StrainCharacteristics {
    // Handle different strain object structures
    const isDataStrain = 'thcContent' in strain;
    
    return {
      strainId: strain.id as string,
      name: strain.name as string,
      type: (strain.type || 'unknown') as 'indica' | 'sativa' | 'hybrid' | 'cbd' | 'unknown',
      floweringTime: isDataStrain ? 8 : ((strain as any).floweringTime as number) || 8, // Default 8 weeks
      thcPercentage: isDataStrain ? (strain as DataStrain).thcContent : (strain as any).thcPercentage as number | undefined,
      cbdPercentage: isDataStrain ? (strain as DataStrain).cbdContent : (strain as any).cbdPercentage as number | undefined,
      growDifficulty: isDataStrain ? (strain as DataStrain).growDifficulty : (strain as any).growDifficulty as string | undefined,
      averageYield: isDataStrain ? undefined : (strain as any).averageYield as string | undefined,
      heightIndoor: isDataStrain ? undefined : (strain as any).heightIndoor as string | undefined,
      heightOutdoor: isDataStrain ? undefined : (strain as any).heightOutdoor as string | undefined,
    };
  }

  /**
   * Calculate strain-specific task adjustments
   */
  private static calculateStrainTaskAdjustments(
    strain: StrainCharacteristics,
    growthStage: GrowthStage
  ): Record<TaskType, { frequencyMultiplier: number; priorityAdjustment: number }> {
    const adjustments: Record<TaskType, { frequencyMultiplier: number; priorityAdjustment: number }> = {
      watering: { frequencyMultiplier: 1, priorityAdjustment: 0 },
      feeding: { frequencyMultiplier: 1, priorityAdjustment: 0 },
      inspection: { frequencyMultiplier: 1, priorityAdjustment: 0 },
      pruning: { frequencyMultiplier: 1, priorityAdjustment: 0 },
      training: { frequencyMultiplier: 1, priorityAdjustment: 0 },
      defoliation: { frequencyMultiplier: 1, priorityAdjustment: 0 },
      flushing: { frequencyMultiplier: 1, priorityAdjustment: 0 },
      harvest: { frequencyMultiplier: 1, priorityAdjustment: 0 },
      transplant: { frequencyMultiplier: 1, priorityAdjustment: 0 },
    };

    // Adjust based on strain type
    switch (strain.type) {
      case 'sativa':
        adjustments.watering.frequencyMultiplier = 1.2; // More frequent watering
        adjustments.training.priorityAdjustment = 1; // Higher training priority
        adjustments.pruning.frequencyMultiplier = 1.3; // More frequent pruning
        break;
      case 'indica':
        adjustments.feeding.frequencyMultiplier = 0.9; // Less frequent feeding
        adjustments.inspection.frequencyMultiplier = 0.8; // Less frequent inspection
        break;
      case 'hybrid':
        adjustments.inspection.frequencyMultiplier = 1.1; // Slightly more inspection
        break;
    }

    // Adjust based on grow difficulty
    if (strain.growDifficulty === 'hard') {
      adjustments.inspection.frequencyMultiplier *= 1.5;
      adjustments.inspection.priorityAdjustment = 1;
    }

    return adjustments;
  }

  /**
   * Apply strain modifications to base tasks
   */
  private static async applyStrainModifications(
    baseTasks: PlantTask[],
    adjustments: Record<TaskType, { frequencyMultiplier: number; priorityAdjustment: number }>,
    strain: StrainCharacteristics
  ): Promise<PlantTask[]> {
    const modifiedTasks: PlantTask[] = [];

    await database.write(async () => {
      for (const task of baseTasks) {
        const adjustment = adjustments[task.taskType];
        
        // Apply frequency adjustments by modifying due dates
        if (adjustment.frequencyMultiplier !== 1) {
          const originalDueDate = new Date(task.dueDate);
          const adjustedHours = Math.round(24 * (1 - adjustment.frequencyMultiplier));
          originalDueDate.setHours(originalDueDate.getHours() + adjustedHours);
          
          await task.update((t: PlantTask) => {
            t.dueDate = originalDueDate.toISOString();
          });
        }

        // Apply priority adjustments
        if (adjustment.priorityAdjustment !== 0) {
          const currentPriority = task.priority;
          const newPriority = this.adjustPriority(currentPriority || 'medium', adjustment.priorityAdjustment);
          
          await task.update((t: PlantTask) => {
            t.priority = newPriority;
          });
        }

        // Add strain-specific notes
        await task.update((t: PlantTask) => {
          t.description = `${t.description || ''}\nStrain-specific: ${strain.name} (${strain.type})`.trim();
        });

        modifiedTasks.push(task);
      }
    });

    return modifiedTasks;
  }

  /**
   * Calculate template match score based on strain characteristics
   */
  private static calculateTemplateMatchScore(
    strain: DataStrain,
    template: ScheduleTemplate,
    environment: string
  ): number {
    let score = 0;

    // Strain type match (40% weight)
    if (template.strainType === strain.type) {
      score += 40;
    } else if (template.strainType === 'hybrid' && strain.type !== 'unknown') {
      score += 20; // Hybrid templates work reasonably for most strains
    }

    // Environment match (30% weight)
    if (template.category.toLowerCase().includes(environment)) {
      score += 30;
    }

    // Duration match (20% weight)
    const expectedDuration = this.calculateExpectedCycleDuration(strain);
    const durationDiff = Math.abs(template.durationWeeks - expectedDuration);
    if (durationDiff <= 2) {
      score += 20;
    } else if (durationDiff <= 4) {
      score += 10;
    }

    // Usage popularity (10% weight)
    if (template.usageCount > 10) {
      score += 10;
    } else if (template.usageCount > 5) {
      score += 5;
    }

    return Math.min(100, score);
  }

  /**
   * Generate match reasons for template recommendations
   */
  private static generateMatchReasons(
    strain: DataStrain,
    template: ScheduleTemplate,
    matchScore: number
  ): string[] {
    const reasons: string[] = [];

    if (template.strainType === strain.type) {
      reasons.push(`Perfect strain type match (${strain.type})`);
    }

    if (matchScore > 70) {
      reasons.push('High compatibility with strain characteristics');
    }

    if (template.usageCount > 10) {
      reasons.push('Popular template with proven results');
    }

    const expectedDuration = this.calculateExpectedCycleDuration(strain);
    if (Math.abs(template.durationWeeks - expectedDuration) <= 2) {
      reasons.push('Duration matches expected grow cycle');
    }

    return reasons;
  }

  /**
   * Calculate expected cycle duration based on strain
   */
  private static calculateExpectedCycleDuration(strain: DataStrain | StrainCharacteristics): number {
    const baseVegetative = 8; // weeks
    
    // Handle different strain types
    let floweringTime: number;
    if ('floweringTime' in strain && typeof strain.floweringTime === 'number') {
      floweringTime = strain.floweringTime;
    } else {
      floweringTime = 8; // Default flowering time
    }
    
    const curing = 3; // weeks
    
    return baseVegetative + floweringTime + curing;
  }

  /**
   * Calculate flowering start date based on strain and current stage
   */
  private static calculateFloweringStart(
    plantedDate: Date,
    currentStage: GrowthStage,
    strain: StrainCharacteristics
  ): { floweringStart: Date; confidenceLevel: 'low' | 'medium' | 'high'; factors: string[] } {
    const factors: string[] = [];
    let confidenceLevel: 'low' | 'medium' | 'high' = 'medium';

    // Base vegetative period based on strain type
    let vegetativeDays = 56; // 8 weeks default
    
    switch (strain.type) {
      case 'sativa':
        vegetativeDays = 70; // 10 weeks
        factors.push('Sativa strains typically need longer vegetative period');
        break;
      case 'indica':
        vegetativeDays = 49; // 7 weeks
        factors.push('Indica strains can flower earlier');
        break;
      case 'hybrid':
        vegetativeDays = 56; // 8 weeks
        factors.push('Hybrid strain with balanced growth pattern');
        break;
    }

    // Adjust confidence based on available data
    if (strain.floweringTime) {
      confidenceLevel = 'high';
      factors.push(`Strain flowering time: ${strain.floweringTime} weeks`);
    } else {
      confidenceLevel = 'low';
      factors.push('Using estimated flowering time (strain data incomplete)');
    }

    // Adjust based on current stage
    const floweringStart = addDays(plantedDate, vegetativeDays);
    
    if (currentStage === 'flowering' || currentStage === 'pre_flower') {
      confidenceLevel = 'high';
      factors.push('Plant is already in or approaching flowering stage');
    }

    return { floweringStart, confidenceLevel, factors };
  }

  /**
   * Calculate task frequency differences between strains
   */
  private static calculateTaskFrequencyDifferences(
    strainA: StrainCharacteristics,
    strainB: StrainCharacteristics
  ): Record<TaskType, number> {
    const adjustmentsA = this.calculateStrainTaskAdjustments(strainA, 'vegetative');
    const adjustmentsB = this.calculateStrainTaskAdjustments(strainB, 'vegetative');

    const differences: Record<TaskType, number> = {} as Record<TaskType, number>;

    for (const taskType of Object.keys(adjustmentsA) as TaskType[]) {
      const freqA = adjustmentsA[taskType].frequencyMultiplier;
      const freqB = adjustmentsB[taskType].frequencyMultiplier;
      differences[taskType] = Math.round(((freqA - freqB) / freqB) * 100);
    }

    return differences;
  }

  /**
   * Calculate timeline differences between strains
   */
  private static calculateTimelineDifferences(
    strainA: StrainCharacteristics,
    strainB: StrainCharacteristics
  ): { floweringStart: number; harvestDate: number; totalCycle: number } {
    const cycleA = this.calculateExpectedCycleDuration(strainA) * 7; // Convert to days
    const cycleB = this.calculateExpectedCycleDuration(strainB) * 7;

    const floweringA = (strainA.floweringTime || 8) * 7;
    const floweringB = (strainB.floweringTime || 8) * 7;

    return {
      floweringStart: 0, // Simplified - would need more complex calculation
      harvestDate: floweringA - floweringB,
      totalCycle: cycleA - cycleB,
    };
  }

  /**
   * Generate optimization recommendations for strain comparison
   */
  private static generateOptimizationRecommendations(
    strainA: StrainCharacteristics,
    strainB: StrainCharacteristics
  ): string[] {
    const recommendations: string[] = [];

    // Compare flowering times
    if (strainA.floweringTime && strainB.floweringTime) {
      if (strainA.floweringTime > strainB.floweringTime) {
        recommendations.push(`${strainA.name} takes ${strainA.floweringTime - strainB.floweringTime} weeks longer to flower`);
      } else if (strainB.floweringTime > strainA.floweringTime) {
        recommendations.push(`${strainB.name} takes ${strainB.floweringTime - strainA.floweringTime} weeks longer to flower`);
      }
    }

    // Compare strain types
    if (strainA.type !== strainB.type) {
      recommendations.push(`Different strain types may require different care schedules`);
    }

    // Compare grow difficulty
    if (strainA.growDifficulty && strainB.growDifficulty) {
      if (strainA.growDifficulty === 'hard' && strainB.growDifficulty !== 'hard') {
        recommendations.push(`${strainA.name} requires more attention and monitoring`);
      } else if (strainB.growDifficulty === 'hard' && strainA.growDifficulty !== 'hard') {
        recommendations.push(`${strainB.name} requires more attention and monitoring`);
      }
    }

    return recommendations;
  }

  /**
   * Adjust priority level based on adjustment value
   */
  private static adjustPriority(
    currentPriority: 'low' | 'medium' | 'high' | 'critical',
    adjustment: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    const priorities = ['low', 'medium', 'high', 'critical'];
    const currentIndex = priorities.indexOf(currentPriority);
    const newIndex = Math.max(0, Math.min(3, currentIndex + adjustment));
    return priorities[newIndex] as 'low' | 'medium' | 'high' | 'critical';
  }
}