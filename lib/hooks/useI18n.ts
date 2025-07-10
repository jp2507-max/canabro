/**
 * Custom hook for internationalization
 * File: lib/hooks/useI18n.ts
 */

import { useTranslation } from 'react-i18next';
import i18n from '../config/i18n';
import { SupportedLanguage } from '../contexts/LanguageProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useI18n = () => {
  const { t, i18n: i18nInstance } = useTranslation();

  const switchLanguage = async (lng: SupportedLanguage) => {
    await i18n.changeLanguage(lng);
    // Save to storage
    try {
      await AsyncStorage.setItem('language', lng);
    } catch (error) {
      console.warn('[useI18n] Failed to save language:', error);
    }
  };

  return {
    t,
    currentLanguage: i18nInstance.language as SupportedLanguage,
    switchLanguage,
    isReady: i18nInstance.isInitialized,
  };
};

/**
 * Provides the translation function scoped to the 'common' namespace.
 *
 * @returns An object containing the translation function `t` for the 'common' namespace
 */
export function useCommonTranslations() {
  const { t } = useTranslation('common');
  return { t };
}

/**
 * Provides the translation function scoped to the 'navigation' namespace.
 *
 * @returns An object containing the translation function `t` for navigation-related keys
 */
export function useNavigationTranslations() {
  const { t } = useTranslation('navigation');
  return { t };
}

/**
 * Provides the translation function scoped to the 'forms' namespace.
 *
 * @returns An object containing the translation function `t` for form-related translations.
 */
export function useFormTranslations() {
  const { t } = useTranslation('forms');
  return { t };
}

/**
 * Provides the translation function scoped to the 'tasks' namespace.
 *
 * @returns An object containing the translation function `t` for task-related translations
 */
export function useTaskTranslations() {
  const { t } = useTranslation('tasks');
  return { t };
}

/**
 * Provides the translation function scoped to the 'plants' namespace.
 *
 * @returns An object containing the translation function `t` for plant-related translations
 */
export function usePlantTranslations() {
  const { t } = useTranslation('plants');
  return { t };
}

export default useI18n;
