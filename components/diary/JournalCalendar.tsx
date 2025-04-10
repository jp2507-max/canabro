import React from 'react';
import { View } from 'react-native';

import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';
import { useTheme } from '../../lib/contexts/ThemeContext';

interface JournalCalendarProps {
  // TODO: Add props like selectedDate, onDateChange, plantStartDate etc.
}

/**
 * Horizontal calendar view for the plant journal screen.
 */
export default function JournalCalendar({}: JournalCalendarProps) {
  const { theme, isDarkMode } = useTheme();

  // Placeholder implementation
  return (
    <ThemedView
      className="h-24 flex-row items-center justify-between px-4 border-b"
      lightClassName="bg-neutral-50 border-neutral-200"
      darkClassName="bg-neutral-900 border-neutral-700">
      {/* TODO: Implement actual calendar logic and horizontal scroll */}
      <View className="flex-1 items-center">
        <ThemedText className="text-xs" lightClassName="text-neutral-500" darkClassName="text-neutral-400">M</ThemedText>
        <ThemedText className="text-lg font-medium mt-1">7</ThemedText>
      </View>
      {/* Use ThemedView for the highlighted date */}
      <ThemedView className="flex-1 items-center p-2 rounded-lg" lightClassName="bg-primary-100" darkClassName="bg-primary-800">
        <ThemedText className="text-xs" lightClassName="text-primary-600" darkClassName="text-primary-300">D</ThemedText>
        <ThemedText className="text-lg font-bold mt-1" lightClassName="text-primary-700" darkClassName="text-primary-200">8</ThemedText>
      </ThemedView>
      <View className="flex-1 items-center">
        <ThemedText className="text-xs" lightClassName="text-neutral-500" darkClassName="text-neutral-400">M</ThemedText>
        <ThemedText className="text-lg font-medium mt-1">9</ThemedText>
      </View>
      <View className="flex-1 items-center">
        <ThemedText className="text-xs" lightClassName="text-neutral-500" darkClassName="text-neutral-400">D</ThemedText>
        <ThemedText className="text-lg font-medium mt-1">10</ThemedText>
      </View>
      {/* Add more dates */}
       <View className="items-end">
         <ThemedText className="text-xs" lightClassName="text-neutral-500" darkClassName="text-neutral-400">Keimung Tag 32 / W 5</ThemedText>
       </View>
    </ThemedView>
  );
}
