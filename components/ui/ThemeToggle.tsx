import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { useTheme } from '../../lib/contexts/ThemeContext';
import { Feather } from '@expo/vector-icons';

interface ThemeToggleProps {
  showLabel?: boolean;
  compact?: boolean;
}

function ThemeToggle({ showLabel = true, compact = false }: ThemeToggleProps) {
  const { isDarkMode, toggleTheme, theme } = useTheme();
  
  return (
    <Pressable
      onPress={toggleTheme}
      className={`flex-row items-center ${compact ? 'p-1' : 'p-2'} rounded-full ${
        isDarkMode ? 'bg-neutral-800' : 'bg-neutral-100'
      }`}
      accessibilityRole="switch"
      accessibilityState={{ checked: isDarkMode }}
      accessibilityLabel="Toggle dark mode"
    >
      <View
        className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} items-center justify-center rounded-full ${
          isDarkMode ? 'bg-primary-600' : 'bg-neutral-200'
        }`}
      >
        <Feather 
          name={isDarkMode ? 'moon' : 'sun'} 
          size={compact ? 16 : 20} 
          color={isDarkMode ? 'white' : theme.colors.primary[600]} 
        />
      </View>
      
      {showLabel && (
        <Text
          className={`ml-2 ${isDarkMode ? 'text-white' : 'text-neutral-800'} ${
            compact ? 'text-sm' : 'text-base'
          }`}
        >
          {isDarkMode ? 'Dark' : 'Light'}
        </Text>
      )}
    </Pressable>
  );
}

export default ThemeToggle;
