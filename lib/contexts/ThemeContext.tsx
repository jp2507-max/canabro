import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  currentScheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  isLight: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>('system');
  const systemColorScheme = useColorScheme();

  const currentScheme = theme === 'system' 
    ? (systemColorScheme || 'light') 
    : theme === 'dark' 
    ? 'dark' 
    : 'light';

  const isDark = currentScheme === 'dark';
  const isLight = currentScheme === 'light';

  const value: ThemeContextType = {
    theme,
    currentScheme,
    setTheme,
    isDark,
    isLight,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
