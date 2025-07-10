
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Statically import JSON translation files
import en from '../locales/en.json';
import de from '../locales/de.json';

const resources = {
  en: { translation: en },
  de: { translation: de },
};

// Get device language synchronously for immediate initialization
const getDeviceLanguage = (): string => {
  const locales = Localization.getLocales();
  const deviceLang = locales[0]?.languageCode || 'en';
  // Ensure we only use supported languages
  return ['en', 'de'].includes(deviceLang) ? deviceLang : 'en';
};

// Initialize i18n immediately with device language, then update from storage if needed
i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources,
  lng: getDeviceLanguage(), // Start with device language immediately
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React Native is safe from XSS
  },
  react: {
    useSuspense: false, // Disable suspense for React Native
  },
});

// Async function to update language from storage after initialization
const initI18n = async (): Promise<void> => {
  try {
    const savedLanguage = await AsyncStorage.getItem('language');
    if (savedLanguage && ['en', 'de'].includes(savedLanguage)) {
      await i18n.changeLanguage(savedLanguage);
    }
  } catch (error) {
    console.warn('[i18n] Failed to load saved language:', error);
    // Continue with device language
  }
};

export { initI18n };
export default i18n;
