
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Statically import JSON translation files
import en from '../locales/en.json';
import de from '../locales/de.json';

// Keep a single namespace to simplify keys like 'common.welcome' and 'strains.viewDetails'
// Provide only named namespaces (common, navigation, etc.), no 'translation' namespace
const resources = {
  en: { ...en },
  de: { ...de },
} as const;

// Collect all namespace keys from the English resource (assuming all languages have the same keys)
const availableNamespaces = Object.keys(en);

// Get device language synchronously for immediate initialization
const getDeviceLanguage = (): string => {
  const locales = Localization.getLocales();
  const deviceLang = locales[0]?.languageCode || 'en';
  
  // DEBUG: Log locale detection (development only)
  if (__DEV__) {
    console.log('[i18n] Device locales:', locales);
    console.log('[i18n] Detected device language:', deviceLang);
    console.log('[i18n] Available languages:', ['en', 'de']);
  }
  
  // Ensure we only use supported languages
  const selectedLang = ['en', 'de'].includes(deviceLang) ? deviceLang : 'en';
  if (__DEV__) {
    console.log('[i18n] Selected language:', selectedLang);
  }
  
  return selectedLang;
};

// Initialize i18n immediately with device language, then update from storage if needed
const detectedLanguage = getDeviceLanguage();
if (__DEV__) {
  console.log('[i18n] Initializing with language:', detectedLanguage);
}

i18n.use(initReactI18next).init({
  ns: availableNamespaces,
  defaultNS: 'common',
  fallbackNS: 'common',
  nsSeparator: '.', // allow "namespace.key" pattern

  compatibilityJSON: 'v4',
  resources,
  lng: detectedLanguage, // Start with device language immediately
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React Native is safe from XSS
  },
  react: {
    useSuspense: false, // Disable suspense for React Native
  },
});

if (__DEV__) {
  console.log('[i18n] i18n initialized with language:', i18n.language);
}

// Async function to update language from storage after initialization
const initI18n = async (): Promise<void> => {
  try {
    const savedLanguage = await AsyncStorage.getItem('language');
    if (__DEV__) {
      console.log('[i18n] Saved language from storage:', savedLanguage);
    }
    if (savedLanguage && ['en', 'de'].includes(savedLanguage)) {
      if (__DEV__) {
        console.log('[i18n] Changing to saved language:', savedLanguage);
      }
      await i18n.changeLanguage(savedLanguage);
      if (__DEV__) {
        console.log('[i18n] Language changed to:', i18n.language);
      }
    } else {
      if (__DEV__) {
        console.log('[i18n] No valid saved language, keeping device language:', i18n.language);
      }
    }
  } catch (error) {
    console.warn('[i18n] Failed to load saved language:', error);
    // Continue with device language
  }
};

export { initI18n };
export default i18n;
