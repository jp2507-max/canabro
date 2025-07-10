import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import i18n from '../config/i18n';
import { initI18n } from '../config/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SupportedLanguage = 'en' | 'de';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [languageState, setLanguageState] = useState<SupportedLanguage>(i18n.language as SupportedLanguage);

  useEffect(() => {
    // Initialize from storage in background, update state if language changes
    initI18n().then(() => {
      setLanguageState(i18n.language as SupportedLanguage);
    }).catch(error => {
      console.warn('[LanguageProvider] Failed to load saved language:', error);
    });
  }, []);

  const setLanguage = (language: SupportedLanguage) => {
    i18n.changeLanguage(language);
    setLanguageState(language);
    // Save to storage in background
    AsyncStorage.setItem('language', language).catch(error => {
      console.warn('[LanguageProvider] Failed to save language:', error);
    });
  };

  return (
    <LanguageContext.Provider
      value={{
        language: languageState,
        setLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
};
