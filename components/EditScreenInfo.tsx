import * as React from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '../lib/contexts/ThemeContext';

type EditScreenInfoProps = {
  path: string;
};

export function EditScreenInfo({ path }: EditScreenInfoProps) {
  const { isDarkMode } = useTheme();

  return (
    <View className="rounded-lg bg-neutral-100 px-4 py-2 dark:bg-neutral-800">
      <Text className={`text-sm ${isDarkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>
        Edit <Text className="font-bold">{path}</Text> to update this screen
      </Text>
    </View>
  );
}
