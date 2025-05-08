import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';

import SyncStatus from './SyncStatus';
import TagPill from './TagPill';
import ThemedText from './ThemedText';
import { useTheme } from '../../lib/contexts/ThemeContext';

interface HomeHeaderProps {
  onAddPlant: () => void;
  plantCount: number;
  isDarkMode?: boolean;
}

export function HomeHeader({ onAddPlant, plantCount, isDarkMode }: HomeHeaderProps) {
  const { theme, isDarkMode: themeDarkMode } = useTheme();
  const dark = isDarkMode ?? themeDarkMode;
  return (
    <View className="mb-4 flex-row items-center justify-between">
      <View>
        <ThemedText
          className="text-2xl font-bold"
          lightClassName="text-green-800"
          darkClassName="text-primary-300">
          My Plants
        </ThemedText>
        <View className="mt-2 flex-row">
          <TagPill text={`Total: ${plantCount}`} isDarkMode={dark} />
        </View>
      </View>
      <SyncStatus compact />
    </View>
  );
}

export default HomeHeader;
