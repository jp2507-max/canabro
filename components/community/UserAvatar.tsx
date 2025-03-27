import React from 'react';
import { Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ThemedView from '../ui/ThemedView';
import { useTheme } from '../../lib/contexts/ThemeContext';

/**
 * UserAvatar component for displaying user avatar with optional verification badge
 */
export default function UserAvatar({ 
  uri, 
  size = 40, 
  verified = false 
}: { 
  uri: string, 
  size?: number, 
  verified?: boolean 
}) {
  const { theme } = useTheme();
  
  return (
    <ThemedView className="relative">
      <Image 
        source={{ uri }} 
        style={{ width: size, height: size, borderRadius: size / 2 }} 
      />
      {verified && (
        <ThemedView 
          className="absolute bottom-0 right-0 rounded-full items-center justify-center" 
          style={{ 
            width: size / 3, 
            height: size / 3, 
            backgroundColor: theme.colors.primary[500],
            borderWidth: 1.5,
            borderColor: theme.colors.neutral[50]
          }}
        >
          <Ionicons name="checkmark" size={size / 5} color="white" />
        </ThemedView>
      )}
    </ThemedView>
  );
}
