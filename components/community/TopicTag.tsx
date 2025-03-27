import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';
import { useTheme } from '../../lib/contexts/ThemeContext';

/**
 * TopicTag component for displaying topic/hashtag badges
 */
export default function TopicTag({ 
  name, 
  count, 
  isActive = false,
  onPress
}: { 
  name: string, 
  count?: number, 
  isActive?: boolean,
  onPress?: () => void
}) {
  const { theme, isDarkMode } = useTheme();
  
  return (
    <ThemedView 
      className="px-3 py-2 mr-2 rounded-full flex-row items-center"
      style={{ 
        backgroundColor: isActive 
          ? theme.colors.primary[isDarkMode ? 400 : 500] 
          : isDarkMode 
            ? theme.colors.neutral[100] 
            : 'rgba(220, 252, 231, 0.7)' // Light mint green background for better contrast
      }}
      onTouchEnd={onPress}
    >
      <Ionicons 
        name="pricetag-outline" 
        size={14} 
        color={isActive ? 'white' : theme.colors.primary[isDarkMode ? 300 : 600]} 
        style={{ marginRight: 4 }}
      />
      <ThemedText 
        className={`text-sm font-medium ${isActive ? 'text-white' : ''}`} 
        lightClassName={isActive ? '' : 'text-primary-700'}
        darkClassName={isActive ? '' : 'text-primary-300'}
      >
        {name}
      </ThemedText>
      {count && (
        <ThemedText 
          className="ml-1 text-xs" 
          lightClassName={isActive ? 'text-white' : 'text-primary-500'} 
          darkClassName={isActive ? 'text-white' : 'text-primary-400'}
        >
          {count}
        </ThemedText>
      )}
    </ThemedView>
  );
}
