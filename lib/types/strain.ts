/**
 * Strain-related interfaces for the Canabro app
 */

/**
 * Cannabis species types
 */
export enum StrainSpecies {
  SATIVA = 'sativa',
  INDICA = 'indica',
  HYBRID = 'hybrid',
  RUDERALIS = 'ruderalis',
}

/**
 * Strain difficulty levels for growing
 */
export enum StrainDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

/**
 * Strain effect types
 */
export enum StrainEffectType {
  RELAXED = 'relaxed',
  HAPPY = 'happy',
  EUPHORIC = 'euphoric',
  UPLIFTED = 'uplifted',
  CREATIVE = 'creative',
  ENERGETIC = 'energetic',
  FOCUSED = 'focused',
  HUNGRY = 'hungry',
  TALKATIVE = 'talkative',
  TINGLY = 'tingly',
  SLEEPY = 'sleepy',
}

/**
 * Strain flavor types
 */
export enum StrainFlavorType {
  EARTHY = 'earthy',
  SWEET = 'sweet',
  CITRUS = 'citrus',
  FRUITY = 'fruity',
  PINE = 'pine',
  WOODY = 'woody',
  SPICY = 'spicy',
  HERBAL = 'herbal',
  PUNGENT = 'pungent',
  DIESEL = 'diesel',
  SKUNK = 'skunk',
  CHEESE = 'cheese',
  FLORAL = 'floral',
  TROPICAL = 'tropical',
  BERRY = 'berry',
  GRAPE = 'grape',
  LEMON = 'lemon',
  LIME = 'lime',
  ORANGE = 'orange',
  MANGO = 'mango',
  BLUEBERRY = 'blueberry',
  VANILLA = 'vanilla',
  MINT = 'mint',
  COFFEE = 'coffee',
  CHOCOLATE = 'chocolate',
}

/**
 * Strain interface
 */
export interface Strain {
  id: string;
  api_id?: string; // Add this line
  name: string;
  species?: StrainSpecies;
  description?: string | string[];
  thc?: string | number; // Raw value from API
  cbd?: string | number; // Raw value from API
  thc_percentage?: number; // Parsed numeric value for DB
  cbd_percentage?: number; // Parsed numeric value for DB
  origin?: string;
  genetics?: string;
  type?: string;
  floweringTime?: string;
  floweringType?: string;
  growDifficulty?: string;
  yieldIndoor?: string;
  yieldOutdoor?: string;
  effects?: string[];
  flavors?: string[];
  medicalUses?: string[];
  negativeEffects?: string[];
  growingTips?: string;
  image?: string;
  imageUrl?: string;
  breeder?: string;
  isAutoFlower?: boolean;
  isFeminized?: boolean;
  heightIndoor?: string;
  heightOutdoor?: string;
  parents?: string[];
  harvestTimeOutdoor?: string;
  link?: string;
  createdAt?: string;
  updatedAt?: string;
  // legacy fields for compatibility
  species_legacy?: StrainSpecies;
  description_legacy?: string;
  flowering_time?: number;
  difficulty?: StrainDifficulty;
  yield_indoor?: string;
  yield_outdoor?: string;
  effects_legacy?: StrainEffectType[];
  flavors_legacy?: StrainFlavorType[];
  medical_uses?: string[];
  negative_effects?: string[];
  growing_tips?: string;
  image_url?: string;
  breeder_legacy?: string;
  is_auto_flower?: boolean;
  is_feminized?: boolean;
  height_indoor?: string;
  height_outdoor?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Strain review interface
 */
export interface StrainReview {
  id: string;
  strain_id: string;
  user_id: string;
  rating: number; // 1-5
  title?: string;
  content: string;
  effects_rating?: {
    potency?: number;
    duration?: number;
  };
  grow_rating?: {
    ease?: number;
    yield?: number;
    speed?: number;
  };
  created_at: string;
  updated_at?: string;
}

/**
 * Interface for creating a new strain review
 */
export interface CreateStrainReviewData {
  strain_id: string;
  rating: number;
  title?: string;
  content: string;
  effects_rating?: {
    potency?: number;
    duration?: number;
  };
  grow_rating?: {
    ease?: number;
    yield?: number;
    speed?: number;
  };
}
