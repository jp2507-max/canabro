/**
 * Diary-related interfaces for the Canabro app
 */

/**
 * Diary entry types
 */
export enum DiaryEntryType {
  GENERAL = 'general',
  WATERING = 'watering',
  FEEDING = 'feeding',
  PRUNING = 'pruning',
  TRAINING = 'training',
  TRANSPLANT = 'transplant',
  PROBLEM = 'problem',
  HARVEST = 'harvest',
  OTHER = 'other',
}

/**
 * Diary entry interface
 */
export interface DiaryEntry {
  id: string;
  plant_id: string;
  user_id: string;
  entry_date: string; // ISO date string
  entry_type: DiaryEntryType;
  title?: string;
  content: string;
  image_url?: string;
  metrics?: {
    temperature?: number; // in Celsius
    humidity?: number; // percentage
    ph_level?: number;
    ppm?: number;
    water_amount?: number; // in ml
    nutrient_amount?: number; // in ml
    light_hours?: number;
  };
  is_public: boolean;
  created_at: string;
  updated_at?: string;
}

/**
 * Interface for creating a new diary entry
 */
export interface CreateDiaryEntryData {
  plant_id: string;
  entry_date: string;
  entry_type: DiaryEntryType;
  title?: string;
  content: string;
  image_url?: string;
  metrics?: {
    temperature?: number;
    humidity?: number;
    ph_level?: number;
    ppm?: number;
    water_amount?: number;
    nutrient_amount?: number;
    light_hours?: number;
  };
  is_public?: boolean;
}

/**
 * Watering entry interface (specialized diary entry)
 */
export interface WateringEntry extends DiaryEntry {
  entry_type: DiaryEntryType.WATERING;
  metrics: {
    water_amount: number; // in ml
    ph_level?: number;
    runoff_ph?: number;
    nutrient_amount?: number; // in ml
    nutrient_type?: string;
  };
}

/**
 * Feeding entry interface (specialized diary entry)
 */
export interface FeedingEntry extends DiaryEntry {
  entry_type: DiaryEntryType.FEEDING;
  metrics: {
    nutrient_amount: number; // in ml
    nutrient_type: string;
    ph_level?: number;
    ppm?: number;
  };
}

/**
 * Grow journal interface for organizing diary entries
 */
export interface GrowJournal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_date: string; // ISO date string
  end_date?: string; // ISO date string
  is_active: boolean;
  is_public: boolean;
  cover_image_url?: string;
  plant_count: number;
  entry_count: number;
  created_at: string;
  updated_at?: string;
}

/**
 * Plant diary entry with plant information
 */
export interface PlantDiaryEntry extends DiaryEntry {
  plant_name: string;
  plant_strain?: string;
  plant_stage?: string;
  plant_image_url?: string;
}

/**
 * Interface for plant diary filters
 */
export interface PlantDiaryFilterOptions {
  plantId?: string;
  entryType?: DiaryEntryType | DiaryEntryType[];
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  isPublic?: boolean;
}
