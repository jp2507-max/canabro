/**
 * React hooks for dynamic content translation
 * 
 * Provides hooks for translating strain data and other dynamic content
 * with proper React optimization and caching.
 */

import { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import translationService from '../services/translation-service';
import { logger } from '../config/production';

/**
 * Translates a single strain data object using the current language context.
 *
 * Returns the translated strain object, or the original object if translation fails. Returns `null` if the input is `null` or `undefined`.
 *
 * @param strainData - The strain data object to translate, or `null`/`undefined`
 * @returns The translated strain data object, or `null` if input is `null`/`undefined`
 */
export function useStrainTranslation<T extends {
  type?: string;
  effects?: string[];
  flavors?: string[];
  growDifficulty?: string;
  description?: string | string[];
  [key: string]: unknown;
}>(strainData: T | null | undefined): T | null {
  const { i18n } = useTranslation();
  
  const translatedStrain = useMemo(() => {
    if (!strainData) return null;
    
    try {
      return translationService.translateStrainData(strainData);
    } catch (error) {
      logger.error('Error in useStrainTranslation:', error);
      return strainData;
    }
  }, [strainData, i18n.language]);
  
  return translatedStrain;
}

/**
 * Translates an array of strain data objects based on the current language.
 *
 * Returns an empty array if the input is not a valid array. If translation fails, the original array is returned.
 *
 * @returns The translated array of strain data objects, or the original array on error.
 */
export function useStrainsTranslation<T extends {
  type?: string;
  effects?: string[];
  flavors?: string[];
  growDifficulty?: string;
  description?: string | string[];
  [key: string]: unknown;
}>(strainsData: T[] | null | undefined): T[] {
  const { i18n } = useTranslation();
  
  const translatedStrains = useMemo(() => {
    if (!Array.isArray(strainsData)) return [];
    
    try {
      return translationService.translateStrainsArray(strainsData);
    } catch (error) {
      logger.error('Error in useStrainsTranslation:', error);
      return strainsData;
    }
  }, [strainsData, i18n.language]);
  
  return translatedStrains;
}

/**
 * Translates an array of strain effect strings into the current language.
 *
 * Returns an empty array if the input is not a valid array. If translation fails, returns the original effects array.
 *
 * @param effects - The array of strain effect strings to translate
 * @returns The translated array of effect strings, or the original array on error
 */
export function useStrainEffectsTranslation(effects: string[] | null | undefined): string[] {
  const { i18n } = useTranslation();
  
  const translatedEffects = useMemo(() => {
    if (!Array.isArray(effects)) return [];
    
    try {
      return translationService.translateStrainEffects(effects);
    } catch (error) {
      logger.error('Error in useStrainEffectsTranslation:', error);
      return effects;
    }
  }, [effects, i18n.language]);
  
  return translatedEffects;
}

/**
 * Translates an array of strain flavor strings into the current language.
 *
 * Returns an empty array if the input is not a valid array. If translation fails, returns the original array.
 *
 * @param flavors - The array of strain flavor strings to translate
 * @returns The translated array of flavor strings, or the original array on error
 */
export function useStrainFlavorsTranslation(flavors: string[] | null | undefined): string[] {
  const { i18n } = useTranslation();
  
  const translatedFlavors = useMemo(() => {
    if (!Array.isArray(flavors)) return [];
    
    try {
      return translationService.translateStrainFlavors(flavors);
    } catch (error) {
      logger.error('Error in useStrainFlavorsTranslation:', error);
      return flavors;
    }
  }, [flavors, i18n.language]);
  
  return translatedFlavors;
}

/**
 * Translates a strain type string based on the current language.
 *
 * Returns an empty string if the input is null or undefined. If translation fails, returns the original type string.
 *
 * @param type - The strain type to translate
 * @returns The translated strain type string, or an empty string if input is missing
 */
export function useStrainTypeTranslation(type: string | null | undefined): string {
  const { i18n } = useTranslation();
  
  const translatedType = useMemo(() => {
    if (!type) return '';
    
    try {
      return translationService.translateStrainType(type);
    } catch (error) {
      logger.error('Error in useStrainTypeTranslation:', error);
      return type;
    }
  }, [type, i18n.language]);
  
  return translatedType;
}

/**
 * Translates a grow difficulty string based on the current language.
 *
 * Returns an empty string if the input is null or undefined. If translation fails, returns the original difficulty string.
 *
 * @param difficulty - The grow difficulty string to translate
 * @returns The translated grow difficulty string, or an empty string if input is missing
 */
export function useGrowDifficultyTranslation(difficulty: string | null | undefined): string {
  const { i18n } = useTranslation();
  
  const translatedDifficulty = useMemo(() => {
    if (!difficulty) return '';
    
    try {
      return translationService.translateGrowDifficulty(difficulty);
    } catch (error) {
      logger.error('Error in useGrowDifficultyTranslation:', error);
      return difficulty;
    }
  }, [difficulty, i18n.language]);
  
  return translatedDifficulty;
}

/**
 * Provides utility functions for managing and performing strain data translations within the current language context.
 *
 * Returns functions to clear the translation cache, retrieve cache statistics, translate a single strain object, translate an array of strain objects, and access the current language.
 */
export function useTranslationUtils() {
  const { i18n } = useTranslation();
  
  const clearCache = useCallback(() => {
    translationService.clearTranslationCache();
  }, []);
  
  const getCacheStats = useCallback(() => {
    return translationService.getTranslationCacheStats();
  }, []);
  
  const translateStrain = useCallback(<T extends {
    type?: string;
    effects?: string[];
    flavors?: string[];
    growDifficulty?: string;
    description?: string | string[];
    [key: string]: unknown;
  }>(strain: T) => {
    return translationService.translateStrainData(strain);
  }, [i18n.language]);
  
  const translateStrains = useCallback(<T extends {
    type?: string;
    effects?: string[];
    flavors?: string[];
    growDifficulty?: string;
    description?: string | string[];
    [key: string]: unknown;
  }>(strains: T[]) => {
    return translationService.translateStrainsArray(strains);
  }, [i18n.language]);
  
  return {
    clearCache,
    getCacheStats,
    translateStrain,
    translateStrains,
    currentLanguage: i18n.language,
  };
}

/**
 * Returns translation cache statistics from the translation service.
 *
 * The statistics are memoized and computed only once on mount.
 * @returns An object containing translation cache statistics.
 */
export function useTranslationCacheStats() {
  const stats = useMemo(() => {
    return translationService.getTranslationCacheStats();
  }, []);
  
  return stats;
}

export default {
  useStrainTranslation,
  useStrainsTranslation,
  useStrainEffectsTranslation,
  useStrainFlavorsTranslation,
  useStrainTypeTranslation,
  useGrowDifficultyTranslation,
  useTranslationUtils,
  useTranslationCacheStats,
};
