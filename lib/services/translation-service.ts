/**
 * Translation Service for Dynamic Content
 * 
 * Handles translation of API-sourced content, particularly strain-related data
 * including effects, flavors, types, and descriptions before display.
 */

import { logger } from '../config/production';
import i18n from '../config/i18n';

// Translation cache to improve performance
interface TranslationCache {
  [key: string]: {
    [language: string]: string;
  };
}

const translationCache: TranslationCache = {};
const CACHE_EXPIRY_MS = 1000 * 60 * 30; // 30 minutes
const cacheTimestamps: { [key: string]: number } = {};

/**
 * Cache key generator for consistent caching
 */
function generateCacheKey(type: string, value: string): string {
  return `${type}:${value.toLowerCase().trim()}`;
}

/**
 * Check if cache entry is expired
 */
function isCacheExpired(key: string): boolean {
  const timestamp = cacheTimestamps[key];
  if (!timestamp) return true;
  return Date.now() - timestamp > CACHE_EXPIRY_MS;
}

/**
 * Store translation in cache
 */
function cacheTranslation(key: string, language: string, translation: string): void {
  if (!translationCache[key]) {
    translationCache[key] = {};
  }
  translationCache[key][language] = translation;
  cacheTimestamps[key] = Date.now();
}

/**
 * Get translation from cache
 */
function getCachedTranslation(key: string, language: string): string | null {
  if (isCacheExpired(key)) {
    delete translationCache[key];
    delete cacheTimestamps[key];
    return null;
  }
  return translationCache[key]?.[language] || null;
}

/**
 * Core translation function with fallback mechanisms
 */
function translateWithFallback(
  translationKey: string,
  fallbackValue: string,
  options?: Record<string, string | number>
): string {
  try {
    const translated = i18n.t(translationKey, { ...options, defaultValue: fallbackValue });
    return translated !== translationKey ? translated : fallbackValue;
  } catch (error) {
    logger.warn(`Translation failed for key: ${translationKey}`, error);
    return fallbackValue;
  }
}

/**
 * Translate strain type with proper German grammar
 */
export function translateStrainType(type: string): string {
  if (!type || typeof type !== 'string') return type;
  
  const normalizedType = type.toLowerCase().trim();
  const cacheKey = generateCacheKey('strain_type', normalizedType);
  const currentLanguage = i18n.language;
  
  // Check cache first
  const cached = getCachedTranslation(cacheKey, currentLanguage);
  if (cached) return cached;
  
  const translation = translateWithFallback(
    `strains.type.${normalizedType}`,
    type.charAt(0).toUpperCase() + type.slice(1)
  );
  
  // Cache the result
  cacheTranslation(cacheKey, currentLanguage, translation);
  return translation;
}

/**
 * Translate strain effects array
 */
export function translateStrainEffects(effects: string[]): string[] {
  if (!Array.isArray(effects)) return effects || [];
  
  const currentLanguage = i18n.language;
  
  return effects.map(effect => {
    if (!effect || typeof effect !== 'string') return effect;
    
    const normalizedEffect = effect.toLowerCase().trim();
    const cacheKey = generateCacheKey('strain_effect', normalizedEffect);
    
    // Check cache first
    const cached = getCachedTranslation(cacheKey, currentLanguage);
    if (cached) return cached;
    
    const translation = translateWithFallback(
      `strains.effects.${normalizedEffect}`,
      effect.charAt(0).toUpperCase() + effect.slice(1)
    );
    
    // Cache the result
    cacheTranslation(cacheKey, currentLanguage, translation);
    return translation;
  });
}

/**
 * Translate strain flavors array
 */
export function translateStrainFlavors(flavors: string[]): string[] {
  if (!Array.isArray(flavors)) return flavors || [];
  
  const currentLanguage = i18n.language;
  
  return flavors.map(flavor => {
    if (!flavor || typeof flavor !== 'string') return flavor;
    
    const normalizedFlavor = flavor.toLowerCase().trim();
    const cacheKey = generateCacheKey('strain_flavor', normalizedFlavor);
    
    // Check cache first
    const cached = getCachedTranslation(cacheKey, currentLanguage);
    if (cached) return cached;
    
    const translation = translateWithFallback(
      `strains.flavors.${normalizedFlavor}`,
      flavor.charAt(0).toUpperCase() + flavor.slice(1)
    );
    
    // Cache the result
    cacheTranslation(cacheKey, currentLanguage, translation);
    return translation;
  });
}

/**
 * Translate grow difficulty with German-specific terms
 */
export function translateGrowDifficulty(difficulty: string): string {
  if (!difficulty || typeof difficulty !== 'string') return difficulty;
  
  const normalizedDifficulty = difficulty.toLowerCase().trim();
  const cacheKey = generateCacheKey('grow_difficulty', normalizedDifficulty);
  const currentLanguage = i18n.language;
  
  // Check cache first
  const cached = getCachedTranslation(cacheKey, currentLanguage);
  if (cached) return cached;
  
  const translation = translateWithFallback(
    `strains.difficulty.${normalizedDifficulty}`,
    difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
  );
  
  // Cache the result
  cacheTranslation(cacheKey, currentLanguage, translation);
  return translation;
}

/**
 * Translate strain description with smart text handling
 */
export function translateStrainDescription(description: string | string[]): string {
  if (!description) return '';
  
  let textToTranslate: string;
  if (Array.isArray(description)) {
    textToTranslate = description.join(' ');
  } else {
    textToTranslate = description;
  }
  
  if (!textToTranslate || typeof textToTranslate !== 'string') return textToTranslate || '';
  
  const currentLanguage = i18n.language;
  
  // For German, we'll use a more advanced approach for descriptions
  // Since we can't translate arbitrary text automatically, we'll look for known patterns
  if (currentLanguage === 'de') {
    return translateDescriptionPatterns(textToTranslate);
  }
  
  return textToTranslate;
}

/**
 * Pattern-based translation for common strain description terms
 */
function translateDescriptionPatterns(text: string): string {
  if (!text) return text;
  
  // Common patterns in strain descriptions that can be translated
  const patterns = [
    { en: /delivers swift symptom relief/gi, de: 'bietet schnelle Symptomlinderung' },
    { en: /without heavy sedative effects/gi, de: 'ohne starke beruhigende Wirkung' },
    { en: /stands among the most famous strains/gi, de: 'gehört zu den bekanntesten Sorten' },
    { en: /of all time/gi, de: 'aller Zeiten' },
    { en: /perfect for/gi, de: 'perfekt für' },
    { en: /known for its/gi, de: 'bekannt für seine' },
    { en: /produces a/gi, de: 'erzeugt eine' },
    { en: /relaxing effect/gi, de: 'entspannende Wirkung' },
    { en: /energizing effect/gi, de: 'energetisierende Wirkung' },
    { en: /uplifting high/gi, de: 'erhebende Wirkung' },
    { en: /cerebral buzz/gi, de: 'geistige Stimulation' },
    { en: /body high/gi, de: 'körperliche Wirkung' },
    { en: /couch lock/gi, de: 'starke Entspannung' },
  ];
  
  let translatedText = text;
  
  patterns.forEach(pattern => {
    if (pattern.en.test(translatedText)) {
      translatedText = translatedText.replace(pattern.en, pattern.de);
    }
  });
  
  return translatedText;
}

/**
 * Comprehensive strain data translation function
 * Translates all translatable fields in a strain object
 */
export function translateStrainData<T extends {
  type?: string;
  effects?: string[];
  flavors?: string[];
  growDifficulty?: string;
  description?: string | string[];
  [key: string]: unknown;
}>(strainData: T): T {
  if (!strainData || typeof strainData !== 'object') return strainData;
  
  const translated = { ...strainData };
  
  try {
    // Translate strain type
    if (translated.type) {
      translated.type = translateStrainType(translated.type);
    }
    
    // Translate effects
    if (translated.effects && Array.isArray(translated.effects)) {
      translated.effects = translateStrainEffects(translated.effects);
    }
    
    // Translate flavors
    if (translated.flavors && Array.isArray(translated.flavors)) {
      translated.flavors = translateStrainFlavors(translated.flavors);
    }
    
    // Translate grow difficulty
    if (translated.growDifficulty) {
      translated.growDifficulty = translateGrowDifficulty(translated.growDifficulty);
    }
    
    // Translate description
    if (translated.description) {
      translated.description = translateStrainDescription(translated.description);
    }
    
    return translated;
  } catch (error) {
    logger.error('Error translating strain data:', error);
    return strainData; // Return original data on error
  }
}

/**
 * Translate array of strain data
 */
export function translateStrainsArray<T extends {
  type?: string;
  effects?: string[];
  flavors?: string[];
  growDifficulty?: string;
  description?: string | string[];
  [key: string]: unknown;
}>(strains: T[]): T[] {
  if (!Array.isArray(strains)) return strains || [];
  
  return strains.map(strain => translateStrainData(strain));
}

/**
 * Clear translation cache (useful for language switching)
 */
export function clearTranslationCache(): void {
  Object.keys(translationCache).forEach(key => {
    delete translationCache[key];
  });
  Object.keys(cacheTimestamps).forEach(key => {
    delete cacheTimestamps[key];
  });
  logger.log('Translation cache cleared');
}

/**
 * Get cache statistics for monitoring
 */
export function getTranslationCacheStats(): {
  totalEntries: number;
  languages: string[];
  cacheHitRate?: number;
} {
  const totalEntries = Object.keys(translationCache).length;
  const languages = new Set<string>();
  
  Object.values(translationCache).forEach(langMap => {
    Object.keys(langMap).forEach(lang => languages.add(lang));
  });
  
  return {
    totalEntries,
    languages: Array.from(languages),
  };
}

/**
 * Translation service configuration
 */
export const TranslationServiceConfig = {
  cacheExpiryMs: CACHE_EXPIRY_MS,
  enableCache: true,
  enablePatternMatching: true,
  fallbackToOriginal: true,
} as const;

export default {
  translateStrainType,
  translateStrainEffects,
  translateStrainFlavors,
  translateGrowDifficulty,
  translateStrainDescription,
  translateStrainData,
  translateStrainsArray,
  clearTranslationCache,
  getTranslationCacheStats,
};
