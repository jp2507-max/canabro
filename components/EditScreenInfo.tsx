import * as React from 'react';
import { Text, View } from 'react-native';

type EditScreenInfoProps = {
  path: string;
};

export function EditScreenInfo({ path }: EditScreenInfoProps) {
  return (
    <View className="rounded-lg bg-neutral-100 px-4 py-2 dark:bg-neutral-800">
      <Text className="text-sm text-neutral-600 dark:text-neutral-300">
        Edit <Text className="font-bold">{path}</Text> to update this screen
      </Text>
    </View>
  );
}
