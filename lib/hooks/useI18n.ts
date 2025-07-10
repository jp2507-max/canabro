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
 * Hook for common translations (most frequently used namespace)
 */
export function useCommonTranslations() {
  const { t } = useTranslation('common');
  return { t };
}

/**
 * Hook for navigation translations
 */
export function useNavigationTranslations() {
  const { t } = useTranslation('navigation');
  return { t };
}

/**
 * Hook for form translations
 */
export function useFormTranslations() {
  const { t } = useTranslation('forms');
  return { t };
}

/**
 * Hook for task translations
 */
export function useTaskTranslations() {
  const { t } = useTranslation('tasks');
  return { t };
}

/**
 * Hook for plant translations
 */
export function usePlantTranslations() {
  const { t } = useTranslation('plants');
  return { t };
}

export default useI18n;
