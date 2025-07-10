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
 * Hook for translating individual strain data objects
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
 * Hook for translating arrays of strain data
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
 * Hook for translating individual strain effects
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
 * Hook for translating individual strain flavors
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
 * Hook for translating strain type
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
 * Hook for translating grow difficulty
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
 * Hook that provides translation utilities
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
 * Hook for getting translation cache statistics
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
