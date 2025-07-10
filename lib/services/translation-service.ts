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
 * Generates a normalized cache key by combining a type prefix and a lowercased, trimmed value.
 *
 * @param type - The category or type of the value to be cached
 * @param value - The string value to be normalized and included in the cache key
 * @returns A consistent cache key in the format `type:value`
 */
function generateCacheKey(type: string, value: string): string {
  return `${type}:${value.toLowerCase().trim()}`;
}

/**
 * Determines whether a cached translation entry has expired based on its timestamp.
 *
 * @param key - The cache key to check for expiration
 * @returns True if the cache entry is expired or missing; otherwise, false
 */
function isCacheExpired(key: string): boolean {
  const timestamp = cacheTimestamps[key];
  if (!timestamp) return true;
  return Date.now() - timestamp > CACHE_EXPIRY_MS;
}

/**
 * Stores a translated string in the cache for a specific key and language, and updates its timestamp.
 *
 * Overwrites any existing cached translation for the given key and language.
 */
function cacheTranslation(key: string, language: string, translation: string): void {
  if (!translationCache[key]) {
    translationCache[key] = {};
  }
  translationCache[key][language] = translation;
  cacheTimestamps[key] = Date.now();
}

/**
 * Retrieves a cached translation for the specified key and language if it exists and is not expired.
 *
 * @param key - The cache key representing the translation entry
 * @param language - The language code for the desired translation
 * @returns The cached translation string, or `null` if not found or expired
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
 * Attempts to translate a given key using i18n, returning a fallback value if translation is unavailable or fails.
 *
 * @param translationKey - The key to translate
 * @param fallbackValue - The value to return if translation is missing or an error occurs
 * @param options - Optional parameters to pass to the translation function
 * @returns The translated string, or the fallback value if translation is not found or an error occurs
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
 * Translates a strain type string, applying proper German grammar and caching the result.
 *
 * If a translation is unavailable, returns the original type with the first letter capitalized.
 *
 * @param type - The strain type to translate
 * @returns The translated strain type string
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
 * Translates an array of strain effect strings into the current language, applying caching and fallback to capitalized originals if translations are unavailable.
 *
 * @param effects - The array of strain effect strings to translate
 * @returns An array of translated effect strings
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
 * Translates an array of strain flavor strings into the current language, applying caching and fallback to capitalized originals if translations are unavailable.
 *
 * @param flavors - The array of flavor strings to translate
 * @returns An array of translated flavor strings
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
 * Translates a grow difficulty string, applying German-specific terminology and caching the result.
 *
 * If a translation is unavailable, returns the original difficulty string with the first letter capitalized.
 *
 * @param difficulty - The grow difficulty label to translate
 * @returns The translated grow difficulty string
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
 * Translates a strain description, applying pattern-based translation for German language.
 *
 * If the input is an array, joins it into a single string. For German, replaces common English phrases with German equivalents using pattern matching; for other languages, returns the original text.
 *
 * @param description - The strain description as a string or array of strings
 * @returns The translated or original description string
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
 * Translates common English phrases in strain descriptions to their German equivalents using pattern matching.
 *
 * Applies regex-based replacements for frequently occurring terms to improve translation consistency in German strain descriptions.
 *
 * @param text - The original strain description text
 * @returns The description with recognized English phrases replaced by German translations
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
 * Translates all supported fields of a strain data object, including type, effects, flavors, grow difficulty, and description.
 *
 * Returns a new object with translated fields. If translation fails, the original object is returned.
 *
 * @param strainData - The strain data object to translate
 * @returns A new strain data object with translated fields, or the original object if an error occurs
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
 * Translates all translatable fields of each strain object in an array.
 *
 * Applies translation to the `type`, `effects`, `flavors`, `growDifficulty`, and `description` fields of each strain object, returning a new array with translated objects.
 *
 * @param strains - Array of strain data objects to translate
 * @returns Array of strain data objects with translated fields
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
 * Removes all cached translations and their timestamps.
 *
 * Useful for resetting the cache when the application language changes.
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
 * Returns statistics about the current translation cache, including the total number of cached entries and the list of languages present.
 *
 * @returns An object containing the total number of cache entries and an array of language codes found in the cache.
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
