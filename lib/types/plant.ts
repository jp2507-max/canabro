/**
 * Plant-related interfaces for the Canabro app
 */

/**
 * Plant growth stages - runtime constants
 */
export const GROWTH_STAGES = {
  GERMINATION: 'germination',
  SEEDLING: 'seedling', 
  VEGETATIVE: 'vegetative',
  PRE_FLOWER: 'pre_flower',
  FLOWERING: 'flowering',
  LATE_FLOWERING: 'late_flowering',
  HARVEST: 'harvest',
  CURING: 'curing'
} as const;

/**
 * Plant growth stages - type union
 */
export type GrowthStage = typeof GROWTH_STAGES[keyof typeof GROWTH_STAGES];

/**
 * Array of all growth stages for iteration
 */
export const GROWTH_STAGES_ARRAY: GrowthStage[] = Object.values(GROWTH_STAGES);

// Shared union types for normalized strain-based scheduling fields
export type PlantType = 'photoperiod' | 'autoflower' | 'unknown';
export type BaselineKind = 'flip' | 'germination';
export type Environment = 'indoor' | 'outdoor' | 'greenhouse';
export type Hemisphere = 'N' | 'S';
export type YieldUnit = 'g_per_plant' | 'g_per_m2';
export type YieldCategory = 'low' | 'medium' | 'high' | 'unknown';

// Added Enums (moved from AddPlantForm.tsx)
export enum PlantGrowLocation {
  GrowTent = 'Grow Tent',
  GrowRoom = 'Grow Room',
  Indoor = 'Indoor',
  Outdoor = 'Outdoor',
  Greenhouse = 'Greenhouse',
  Garden = 'Garden',
  Balcony = 'Balcony',
  // Add other custom locations if needed, or handle custom input separately
}

export enum LightCondition {
  FullSun = 'Full Sun',
  PartialSun = 'Partial Sun',
  Shade = 'Shade',
  Artificial = 'Artificial Light',
}

export enum GrowMedium {
  Soil = 'Soil',
  Coco = 'Coco Coir',
  Hydro = 'Hydroponic',
  Aqua = 'Aquaponic',
  SemiHydro = 'Semi-Hydro',
}

export enum CannabisType {
  Indica = 'Indica',
  Sativa = 'Sativa',
  Hybrid = 'Hybrid',
  Ruderalis = 'Ruderalis',
  Unknown = 'Unknown',
}

/**
 * Plant interface for plant data
 */
export interface Plant {
  id: string;
  plant_id?: string; // UUID for the plant
  journal_id?: string; // Reference to grow journal
  user_id: string;
  name: string;
  strain: string;
  strain_id?: string; // Reference to strain catalog
  planted_date: string; // ISO date string
  growth_stage: GrowthStage;
  height?: number; // in cm
  notes?: string;
  image_url?: string | null; // Adjusted to allow null
  location_id?: string; // Reference to grow location
  is_auto_flower?: boolean;
  is_feminized?: boolean;
  is_public?: boolean;
  expected_harvest_date?: string; // ISO date string
  thc_content?: number;
  cbd_content?: number;
  created_at: string;
  updated_at?: string;

  // Added fields from AddPlantForm
  cannabis_type?: CannabisType;
  grow_medium?: GrowMedium;
  light_condition?: LightCondition;
  location_description?: string; // Kept as string to allow custom descriptions, or use PlantGrowLocation enum
  // If using PlantGrowLocation enum strictly: location_description?: PlantGrowLocation;

  // Normalized strain-based scheduling fields (system-owned)
  plant_type?: PlantType;
  baseline_kind?: BaselineKind;
  baseline_date?: string; // ISO date string
  environment?: Environment;
  hemisphere?: Hemisphere;
  predicted_flower_min_days?: number;
  predicted_flower_max_days?: number;
  predicted_harvest_start?: string; // ISO date string
  predicted_harvest_end?: string;   // ISO date string
  schedule_confidence?: number; // 0..1
  yield_unit?: YieldUnit;
  yield_min?: number;
  yield_max?: number;
  yield_category?: YieldCategory;
}

/**
 * Plant metrics interface for tracking plant health and growth
 */
export interface PlantMetrics {
  id: string;
  plant_id: string;
  date: string; // ISO date string
  height: number; // in cm
  leaf_count?: number;
  node_count?: number;
  ph_level?: number;
  temperature?: number; // in Celsius
  humidity?: number; // percentage
  light_intensity?: number; // in lux
  water_amount?: number; // in ml
  nutrient_amount?: number; // in ml
  created_at: string;
  updated_at?: string;
}

/**
 * Plant problem categories
 */
export enum ProblemCategory {
  NUTRIENT_DEFICIENCY = 'nutrient_deficiency',
  PEST = 'pest',
  DISEASE = 'disease',
  ENVIRONMENTAL = 'environmental',
  WATERING = 'watering',
  LIGHT = 'light',
  OTHER = 'other',
}

/**
 * Plant problem interface for tracking issues
 */
export interface PlantProblem {
  id: string;
  plant_id: string;
  user_id: string;
  title: string;
  description: string;
  category: ProblemCategory;
  severity: 'low' | 'medium' | 'high';
  image_url?: string;
  is_resolved: boolean;
  resolution?: string;
  created_at: string;
  updated_at?: string;
  resolved_at?: string;
}

/**
 * Interface for creating a new plant
 */
export interface CreatePlantData {
  name: string;
  strain: string;
  strain_id?: string;
  planted_date: string;
  growth_stage: GrowthStage;
  journal_id?: string;
  height?: number;
  notes?: string;
  image_url?: string;
  location_id?: string;
  is_auto_flower?: boolean;
  is_feminized?: boolean;
  is_public?: boolean;
}
