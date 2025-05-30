import React from 'react';
import { Image } from 'react-native';

import { useTheme } from '../../lib/contexts/ThemeContext';
import ThemedView from '../ui/ThemedView';
import { OptimizedIcon } from '../ui/OptimizedIcon';

/**
 * UserAvatar component for displaying user avatar with optional verification badge
 */
export default function UserAvatar({
  uri,
  size = 40,
  verified = false,
}: {
  uri: string;
  size?: number;
  verified?: boolean;
}) {
  const { theme } = useTheme();

  return (
    <ThemedView className="relative">
      <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      {verified && (
        <ThemedView
          className="absolute bottom-0 right-0 items-center justify-center rounded-full"
          style={{
            width: size / 3,
            height: size / 3,
            backgroundColor: theme.colors.primary[500],
            borderWidth: 1.5,
            borderColor: theme.colors.neutral[50],
          }}>
          <OptimizedIcon name="checkmark" size={size / 5} color="white" />
        </ThemedView>
      )}
    </ThemedView>
  );
}
