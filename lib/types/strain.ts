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
  RUDERALIS = 'ruderalis'
}

/**
 * Strain difficulty levels for growing
 */
export enum StrainDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
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
  SLEEPY = 'sleepy'
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
  CHOCOLATE = 'chocolate'
}

/**
 * Strain interface
 */
export interface Strain {
  id: string;
  name: string;
  species: StrainSpecies;
  description?: string;
  thc_content?: number; // percentage
  cbd_content?: number; // percentage
  origin?: string;
  flowering_time?: number; // in weeks
  difficulty?: StrainDifficulty;
  yield_indoor?: string;
  yield_outdoor?: string;
  effects?: StrainEffectType[];
  flavors?: StrainFlavorType[];
  medical_uses?: string[];
  negative_effects?: string[];
  growing_tips?: string;
  image_url?: string;
  breeder?: string;
  is_auto_flower?: boolean;
  is_feminized?: boolean;
  height_indoor?: string;
  height_outdoor?: string;
  created_at: string;
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
