/**
 * Diagnosis-related interfaces for the Canabro app
 */

/**
 * Plant problem categories for diagnosis
 */
export enum DiagnosisProblemType {
  NUTRIENT_DEFICIENCY = 'nutrient_deficiency',
  NUTRIENT_TOXICITY = 'nutrient_toxicity',
  PEST = 'pest',
  DISEASE = 'disease',
  ENVIRONMENTAL = 'environmental',
  WATERING = 'watering',
  LIGHT = 'light',
  PH = 'ph',
  UNKNOWN = 'unknown'
}

/**
 * Specific nutrient deficiencies
 */
export enum NutrientDeficiency {
  NITROGEN = 'nitrogen',
  PHOSPHORUS = 'phosphorus',
  POTASSIUM = 'potassium',
  CALCIUM = 'calcium',
  MAGNESIUM = 'magnesium',
  SULFUR = 'sulfur',
  IRON = 'iron',
  MANGANESE = 'manganese',
  ZINC = 'zinc',
  BORON = 'boron',
  COPPER = 'copper',
  MOLYBDENUM = 'molybdenum'
}

/**
 * Common cannabis pests
 */
export enum PestType {
  SPIDER_MITES = 'spider_mites',
  APHIDS = 'aphids',
  THRIPS = 'thrips',
  WHITEFLIES = 'whiteflies',
  FUNGUS_GNATS = 'fungus_gnats',
  ROOT_APHIDS = 'root_aphids',
  CATERPILLARS = 'caterpillars',
  LEAFHOPPERS = 'leafhoppers',
  MEALYBUGS = 'mealybugs',
  SCALE_INSECTS = 'scale_insects'
}

/**
 * Common cannabis diseases
 */
export enum DiseaseType {
  POWDERY_MILDEW = 'powdery_mildew',
  BOTRYTIS = 'botrytis',
  FUSARIUM = 'fusarium',
  PYTHIUM = 'pythium',
  LEAF_SEPTORIA = 'leaf_septoria',
  TOBACCO_MOSAIC_VIRUS = 'tobacco_mosaic_virus',
  ROOT_ROT = 'root_rot',
  BLIGHT = 'blight',
  MOLD = 'mold',
  BACTERIAL_INFECTION = 'bacterial_infection'
}

/**
 * Diagnosis result interface
 */
export interface DiagnosisResult {
  id: string;
  user_id: string;
  plant_id?: string;
  image_url: string;
  problem_type: DiagnosisProblemType;
  specific_problem?: string; // Can be a value from the specific enums
  confidence: number; // 0-1
  description: string;
  symptoms: string[];
  suggested_solutions: string[];
  created_at: string;
  is_saved: boolean;
}

/**
 * Diagnosis request interface
 */
export interface DiagnosisRequest {
  image_url: string;
  plant_id?: string;
  additional_info?: {
    growth_stage?: string;
    growing_medium?: string;
    nutrients_used?: string;
    watering_schedule?: string;
    symptoms_description?: string;
  };
}

/**
 * Saved diagnosis interface
 */
export interface SavedDiagnosis {
  id: string;
  diagnosis_id: string;
  user_id: string;
  plant_id?: string;
  notes?: string;
  is_resolved: boolean;
  resolution_notes?: string;
  created_at: string;
  updated_at?: string;
  resolved_at?: string;
}

/**
 * AI model information interface
 */
export interface DiagnosisModelInfo {
  model_version: string;
  last_updated: string;
  accuracy: number;
  problem_types_covered: DiagnosisProblemType[];
  total_diagnoses: number;
}
