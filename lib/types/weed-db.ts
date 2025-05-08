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
  _id?: string;
  id?: string;
  name: string;
  THC?: string | number;
  thc?: string | number;
  CBD?: string | number;
  cbd?: string | number;
  type?: string;
  genetics?: string;
  growDifficulty?: string;
  floweringTime?: string;
  parents?: string | string[];
  imageUrl?: string;
  image?: string;
  description?: string | string[];
  effect?: string[];
  effects?: string[];
  smellAndFlavour?: string[];
  flavors?: string[];
  [key: string]: unknown; // Allow for additional properties
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
