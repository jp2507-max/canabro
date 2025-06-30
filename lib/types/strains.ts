/**
 * Strain types and interfaces
 */

export interface Strain {
  id: string;
  name: string;
  type: 'indica' | 'sativa' | 'hybrid' | 'cbd' | 'unknown';
  thc_content?: number; // Using snake_case to match database schema
  cbd_content?: number; // Using snake_case to match database schema
  effects?: string[];
  flavors?: string[];
  description?: string;
  image_url?: string; // Using snake_case to match database schema
  grow_difficulty?: 'easy' | 'moderate' | 'hard'; // Using snake_case
  is_favorite?: boolean; // Used in the component
  created_at?: string;
  updated_at?: string;
}

export interface StrainFilters {
  type?: Strain['type'][];
  thcMin?: number;
  thcMax?: number;
  cbdMin?: number;
  cbdMax?: number;
  effects?: string[];
  flavors?: string[];
  growDifficulty?: Strain['grow_difficulty'][];
}

export interface StrainSearchParams {
  query?: string;
  filters?: StrainFilters;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'thc_content' | 'cbd_content' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

export interface StrainSearchResult {
  strains: Strain[];
  total: number;
  hasMore: boolean;
}

// Effect and flavor types for autocomplete
export interface Effect {
  id: string;
  name: string;
  type: 'positive' | 'negative' | 'medical';
}

export interface Flavor {
  id: string;
  name: string;
  category?: 'fruity' | 'earthy' | 'spicy' | 'sweet' | 'diesel' | 'floral';
}
