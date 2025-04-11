import React from 'react';
import { View } from 'react-native';

import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';

/**
 * Horizontal calendar view for the plant journal screen.
 */
export default function JournalCalendar() {
  // Placeholder implementation
  return (
    <ThemedView
      className="h-24 flex-row items-center justify-between border-b px-4"
      lightClassName="bg-neutral-50 border-neutral-200"
      darkClassName="bg-neutral-900 border-neutral-700">
      {/* TODO: Implement actual calendar logic and horizontal scroll */}
      <View className="flex-1 items-center">
        <ThemedText
          className="text-xs"
          lightClassName="text-neutral-500"
          darkClassName="text-neutral-400">
          M
        </ThemedText>
        <ThemedText className="mt-1 text-lg font-medium">7</ThemedText>
      </View>
      {/* Use ThemedView for the highlighted date */}
      <ThemedView
        className="flex-1 items-center rounded-lg p-2"
        lightClassName="bg-primary-100"
        darkClassName="bg-primary-800">
        <ThemedText
          className="text-xs"
          lightClassName="text-primary-600"
          darkClassName="text-primary-300">
          D
        </ThemedText>
        <ThemedText
          className="mt-1 text-lg font-bold"
          lightClassName="text-primary-700"
          darkClassName="text-primary-200">
          8
        </ThemedText>
      </ThemedView>
      <View className="flex-1 items-center">
        <ThemedText
          className="text-xs"
          lightClassName="text-neutral-500"
          darkClassName="text-neutral-400">
          M
        </ThemedText>
        <ThemedText className="mt-1 text-lg font-medium">9</ThemedText>
      </View>
      <View className="flex-1 items-center">
        <ThemedText
          className="text-xs"
          lightClassName="text-neutral-500"
          darkClassName="text-neutral-400">
          D
        </ThemedText>
        <ThemedText className="mt-1 text-lg font-medium">10</ThemedText>
      </View>
      {/* Add more dates */}
      <View className="items-end">
        <ThemedText
          className="text-xs"
          lightClassName="text-neutral-500"
          darkClassName="text-neutral-400">
          Keimung Tag 32 / W 5
        </ThemedText>
      </View>
    </ThemedView>
  );
}
