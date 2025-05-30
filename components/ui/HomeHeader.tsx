import React from 'react';
import { View } from 'react-native';

import SyncStatus from './SyncStatus';
import ThemedText from './ThemedText';
import { useTheme } from '../../lib/contexts/ThemeContext';

interface HomeHeaderProps {
  plantCount: number;
}

export function HomeHeader({ plantCount }: HomeHeaderProps) {
  return (
    <View className="px-4 pt-6 pb-4 flex-row items-center justify-between">
      <View>
        <ThemedText className="text-3xl font-bold text-gray-900 dark:text-white">
          My Plants
        </ThemedText>
        <ThemedText className="text-base text-gray-600 dark:text-gray-400 mt-1">
          {plantCount > 0
            ? `You have ${plantCount} plant${plantCount > 1 ? 's' : ''}.`
            : "Let's add your first plant!"}
        </ThemedText>
      </View>
      <SyncStatus compact />
    </View>
  );
}

export default HomeHeader;
