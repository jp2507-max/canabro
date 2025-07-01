/**
 * PrivacyIconTest - Debug component to test privacy icons
 */
import React from 'react';
import { View } from 'react-native';
import ThemedText from '@/components/ui/ThemedText';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';

export function PrivacyIconTest() {
  return (
    <View className="p-4">
      <ThemedText className="mb-4 text-lg font-bold">Privacy Icons Test</ThemedText>

      <View className="mb-2 flex-row items-center">
        <OptimizedIcon name="globe-outline" size={16} />
        <ThemedText className="ml-2">Everyone</ThemedText>
      </View>

      <View className="mb-2 flex-row items-center">
        <OptimizedIcon name="people-outline" size={16} />
        <ThemedText className="ml-2">Followers</ThemedText>
      </View>

      <View className="mb-2 flex-row items-center">
        <OptimizedIcon name="lock-closed-outline" size={16} />
        <ThemedText className="ml-2">Private</ThemedText>
      </View>
    </View>
  );
}
