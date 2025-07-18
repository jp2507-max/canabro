/**
 * Yield calculation utilities for harvest analysis
 */

import { Plant } from '../models/Plant';

export interface WeightUnit {
  value: 'grams' | 'ounces';
  label: string;
  symbol: string;
}

export const WEIGHT_UNITS: WeightUnit[] = [
  { value: 'grams', label: 'Grams', symbol: 'g' },
  { value: 'ounces', label: 'Ounces', symbol: 'oz' },
];

export interface HarvestData {
  harvestDate: Date;
  wetWeight: number;
  dryWeight?: number;
  trimWeight?: number;
  weightUnit: 'grams' | 'ounces';
  dryingMethod?: string;
  curingNotes?: string;
  photos?: string[];
}

export interface YieldMetrics {
  totalGrowDays: number;
  yieldPerDay: number;
  dryingEfficiency: number;
  totalYield: number;
  trimPercentage: number;
  gramsPerWatt?: number;
  yieldPerSquareFoot?: number;
}

export interface PlantComparison {
  plantId: string;
  plantName: string;
  strain: string;
  totalYield: number;
  yieldPerDay: number;
  growDays: number;
  dryingEfficiency: number;
  harvestDate: Date;
}

/**
 * Convert weight between units
 */
export const convertWeight = (
  weight: number,
  fromUnit: 'grams' | 'ounces',
  toUnit: 'grams' | 'ounces'
): number => {
  if (fromUnit === toUnit) return weight;
  
  if (fromUnit === 'grams' && toUnit === 'ounces') {
    return weight / 28.3495;
  } else if (fromUnit === 'ounces' && toUnit === 'grams') {
    return weight * 28.3495;
  }
  
  return weight;
};

/**
 * Format weight with appropriate unit
 */
export const formatWeight = (weight: number, unit: 'grams' | 'ounces'): string => {
  const unitSymbol = unit === 'grams' ? 'g' : 'oz';
  return `${weight.toFixed(1)} ${unitSymbol}`;
};

/**
 * Calculate comprehensive yield metrics
 */
export const calculateYieldMetrics = (
  plant: Plant,
  harvestData: HarvestData,
  lightWattage?: number,
  growSpaceArea?: number
): YieldMetrics => {
  // Input validation for negative weights
  if (
    harvestData.wetWeight < 0 ||
    (typeof harvestData.dryWeight === 'number' && harvestData.dryWeight < 0) ||
    (typeof harvestData.trimWeight === 'number' && harvestData.trimWeight < 0)
  ) {
    throw new Error('Weight values cannot be negative');
  }

  const plantedDate = new Date(plant.plantedDate);
  const harvestDate = harvestData.harvestDate;
  const totalGrowDays = Math.floor(
    (harvestDate.getTime() - plantedDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Convert all weights to grams for consistent calculation
  const wetWeightGrams = harvestData.weightUnit === 'grams' 
    ? harvestData.wetWeight 
    : convertWeight(harvestData.wetWeight, 'ounces', 'grams');
    
  const dryWeightGrams = harvestData.dryWeight 
    ? (harvestData.weightUnit === 'grams' 
        ? harvestData.dryWeight 
        : convertWeight(harvestData.dryWeight, 'ounces', 'grams'))
    : 0;

  const trimWeightGrams = harvestData.trimWeight 
    ? (harvestData.weightUnit === 'grams' 
        ? harvestData.trimWeight 
        : convertWeight(harvestData.trimWeight, 'ounces', 'grams'))
    : 0;

  const totalYield = dryWeightGrams + trimWeightGrams;
  const yieldPerDay = totalGrowDays > 0 ? totalYield / totalGrowDays : 0;
  const dryingEfficiency = wetWeightGrams > 0 && dryWeightGrams > 0 
    ? (dryWeightGrams / wetWeightGrams) * 100 
    : 0;
  const trimPercentage = totalYield > 0 ? (trimWeightGrams / totalYield) * 100 : 0;

  // Optional advanced metrics
  const gramsPerWatt = lightWattage && lightWattage > 0 ? dryWeightGrams / lightWattage : undefined;
  const yieldPerSquareFoot = growSpaceArea && growSpaceArea > 0 ? dryWeightGrams / growSpaceArea : undefined;

  return {
    totalGrowDays,
    yieldPerDay: Math.round(yieldPerDay * 100) / 100,
    dryingEfficiency: Math.round(dryingEfficiency * 10) / 10,
    totalYield: Math.round(totalYield * 10) / 10,
    trimPercentage: Math.round(trimPercentage * 10) / 10,
    gramsPerWatt: gramsPerWatt ? Math.round(gramsPerWatt * 100) / 100 : undefined,
    yieldPerSquareFoot: yieldPerSquareFoot ? Math.round(yieldPerSquareFoot * 100) / 100 : undefined,
  };
};

/**
 * Compare multiple plants' yield performance
 */
export const comparePlantYields = (
  plants: Array<{ plant: Plant; harvestData: HarvestData }>
): PlantComparison[] => {
  return plants.map(({ plant, harvestData }) => {
    const metrics = calculateYieldMetrics(plant, harvestData);
    
    return {
      plantId: plant.id,
      plantName: plant.name,
      strain: plant.strain,
      totalYield: metrics.totalYield,
      yieldPerDay: metrics.yieldPerDay,
      growDays: metrics.totalGrowDays,
      dryingEfficiency: metrics.dryingEfficiency,
      harvestDate: harvestData.harvestDate,
    };
  }).sort((a, b) => b.totalYield - a.totalYield); // Sort by total yield descending
};

/**
 * Calculate average metrics across multiple harvests
 */
export const calculateAverageMetrics = (comparisons: PlantComparison[]) => {
  if (comparisons.length === 0) return null;

  const totals = comparisons.reduce(
    (acc, comp) => ({
      totalYield: acc.totalYield + comp.totalYield,
      yieldPerDay: acc.yieldPerDay + comp.yieldPerDay,
      growDays: acc.growDays + comp.growDays,
      dryingEfficiency: acc.dryingEfficiency + comp.dryingEfficiency,
    }),
    { totalYield: 0, yieldPerDay: 0, growDays: 0, dryingEfficiency: 0 }
  );

  const count = comparisons.length;
  
  return {
    averageTotalYield: Math.round((totals.totalYield / count) * 10) / 10,
    averageYieldPerDay: Math.round((totals.yieldPerDay / count) * 100) / 100,
    averageGrowDays: Math.round(totals.growDays / count),
    averageDryingEfficiency: Math.round((totals.dryingEfficiency / count) * 10) / 10,
    totalHarvests: count,
    bestYield: Math.max(...comparisons.map(c => c.totalYield)),
    worstYield: Math.min(...comparisons.map(c => c.totalYield)),
  };
};

/**
 * Export harvest data to CSV format
 */
export const exportHarvestDataToCSV = (comparisons: PlantComparison[]): string => {
  const headers = [
    'Plant Name',
    'Strain',
    'Harvest Date',
    'Total Yield (g)',
    'Yield Per Day (g)',
    'Grow Days',
    'Drying Efficiency (%)',
  ];

  const rows = comparisons.map(comp => [
    comp.plantName,
    comp.strain,
    comp.harvestDate.toLocaleDateString(),
    comp.totalYield.toString(),
    comp.yieldPerDay.toString(),
    comp.growDays.toString(),
    comp.dryingEfficiency.toString(),
  ]);

  const csvContent = [headers, ...rows]
    .map(row =>
      row
        .map(cell => `"${String(cell).replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n');

  return csvContent;
};

/**
 * Export harvest data to JSON format
 */
export const exportHarvestDataToJSON = (comparisons: PlantComparison[]): string => {
  const exportData = {
    exportDate: new Date().toISOString(),
    totalHarvests: comparisons.length,
    averageMetrics: calculateAverageMetrics(comparisons),
    harvests: comparisons,
  };

  return JSON.stringify(exportData, null, 2);
};