export interface Strain {
  id: string;
  name: string;
  rating?: number;
  type: 'sativa' | 'indica' | 'hybrid';
  thc: number | null;
  cbd: number | null;
  growDifficulty?: 'easy' | 'medium' | 'difficult';
  floweringTime?: string;
  parents?: string[];
  image?: string | null;
  imageUrl?: string | null; // Add imageUrl property that was missing
  description?: string;
  effects?: string[];
  flavors?: string[];
  url?: string; // External source URL
  // --- Extended fields for richer strain details and API compatibility ---
  yieldIndoor?: string;
  yieldOutdoor?: string;
  yield_indoor?: string;
  yield_outdoor?: string;
  heightIndoor?: string;
  heightOutdoor?: string;
  height_indoor?: string;
  height_outdoor?: string;
  harvestTimeOutdoor?: string;
  harvest_time_outdoor?: string;
  genetics?: string;
  floweringType?: string;
  flowering_type?: string;
  growingTips?: string;
  growing_tips?: string;
  origin?: string;
  breeder?: string;
  isAutoFlower?: boolean;
  isFeminized?: boolean;
  is_auto_flower?: boolean;
  is_feminized?: boolean;
  medicalUses?: string[];
  medical_uses?: string[];
  negativeEffects?: string[];
  negative_effects?: string[];
  link?: string;
  createdAt?: string | number;
  updatedAt?: string | number;
  created_at?: string | number;
  updated_at?: string | number;
  // --- Fields for integration with our database ---
  api_id?: string; // Store the external API ID
  originalId?: string; // Store the original MongoDB ID
}

// Interface for API responses that might include caching info
export interface CachedResponse<T> {
  data: T;
  isFromCache: boolean;
  error?: string; // Add error property that was missing
}

// Type for filter parameters to avoid repetition
export type StrainFilterParams = {
  page?: number;
  limit?: number;
  search?: string;
  growDifficulty?: 'easy' | 'medium' | 'difficult';
  effect?: string;
  flavor?: string;
  thcMin?: number;
  thcMax?: number;
  parent?: string;
  type?: 'sativa' | 'indica' | 'hybrid';
  id?: string;
};

// Raw API response type to replace 'any' types
export interface RawStrainApiResponse {
  // Core fields (ensure these are present and consistently named)
  api_id: string; // The true external API ID (e.g., a MongoDB ObjectId or a UUID string)
  name: string;
  id?: string; // Optional: The internal ID from the API, if different from api_id (e.g. _id from MongoDB)

  // Common strain characteristics
  type?: string | null; // e.g., "sativa", "indica", "hybrid"
  genetics?: string | null; // e.g., "Sativa-dominant", "OG Kush x Durban Poison"
  description?: string | string[] | null; // Can be a single string or an array of strings

  // Cannabinoid content
  thc?: string | number | null; // e.g., "15-20%", 22, "Low", "Unknown"
  cbd?: string | number | null; // e.g., "1-3%", 1, "High", "Unknown"

  // Growing information
  floweringTime?: string | number | null; // e.g., "8-9 weeks", "55-65 days", 60
  fromSeedToHarvest?: string | null; // Added for autoflowers, e.g., "9-10 weeks"
  floweringType?: string | null; // e.g., "Photoperiod", "Autoflower"
  growDifficulty?: string | null; // e.g., "Easy", "Medium", "Hard"
  yieldIndoor?: string | null; // e.g., "400-500g/m²"
  yieldOutdoor?: string | null; // e.g., "600g/plant"
  heightIndoor?: string | number | null; // e.g., "80-120cm", "Medium", 100
  heightOutdoor?: string | number | null; // e.g., "150-250cm", "Tall", 200
  harvestTimeOutdoor?: string | null; // e.g., "End of October", "Mid September"

  // Sensory information
  effects?: string[] | string | null; // Array of effect names or a single string
  flavors?: string[] | string | null; // Array of flavor names or a single string
  terpenes?: string[] | string | null; // Array of terpene names or a single string

  // Additional information
  image_url?: string | null; // Preferred field for the primary image URL
  imageUrl?: string | null; // Keep for compatibility if some API responses use this
  image?: string | null;    // Keep for compatibility if some API responses use this
  link?: string | null; // URL to the strain's page on the source API/website
  parents?: string[] | string | null; // Array of parent strain names or a single string
  breeder?: string | null;
  origin?: string[] | string | null; // Geographical origins, can be array or string

  // Source information for search results
  _source?: 'local' | 'supabase' | 'external';

  // Allow for any other properties that might come from the API
  // This helps in case the API adds new fields or has inconsistent ones
  [key: string]: any; 
}

// API response wrapper types
export interface ApiResponseSingle {
  data: RawStrainApiResponse;
}

export interface ApiResponseArray {
  data: RawStrainApiResponse[];
}

export interface Theme {
  yellow: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
}
