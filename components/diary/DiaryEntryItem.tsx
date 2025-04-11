import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs'; // For date formatting
import React from 'react';
import { View } from 'react-native';

import { DiaryEntryType } from './EntryTypeSelector'; // Import entry type definitions
import { useTheme } from '../../lib/contexts/ThemeContext';
import { DiaryEntry } from '../../lib/types/diary'; // Import the correct type
import StorageImage from '../ui/StorageImage'; // Use StorageImage for Supabase URLs
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';

interface DiaryEntryItemProps {
  entry: DiaryEntry;
}

// Helper to get icon and label for entry type
const getEntryTypeDetails = (type: DiaryEntryType, theme: any) => {
  // Reusing the logic/data from EntryTypeSelector might be better, but defining here for now
  const details: { [key in DiaryEntryType]?: { icon: string; label: string; color?: string } } = {
    note: { icon: 'note-text-outline', label: 'Note' },
    watering: { icon: 'water-outline', label: 'Watering', color: theme.colors.special.watering },
    feeding: { icon: 'flask-outline', label: 'Feeding', color: theme.colors.special.feeding },
    defoliating: { icon: 'content-cut', label: 'Defoliating' },
    training: { icon: 'vector-polyline', label: 'Training' },
    flushing: { icon: 'waves', label: 'Flushing' },
    pest_control: { icon: 'spider-thread', label: 'Pest Control' },
    environment: { icon: 'thermometer-lines', label: 'Environment' },
    photo: { icon: 'camera-outline', label: 'Photo' },
    harvest: { icon: 'scissors-cutting', label: 'Harvest', color: theme.colors.special.harvesting },
  };
  return details[type] || { icon: 'help-circle-outline', label: type }; // Default fallback
};

// Helper to render metrics nicely
const renderMetrics = (
  metrics: Record<string, any> | undefined | null,
  theme: any,
  isDarkMode: boolean
) => {
  if (!metrics || typeof metrics !== 'object' || Object.keys(metrics).length === 0) {
    return null;
  }

  // Attempt to parse if it's a string (might happen if model field isn't auto-parsed)
  let parsedMetrics = metrics;
  if (typeof metrics === 'string') {
    try {
      parsedMetrics = JSON.parse(metrics);
    } catch (error) {
      console.error('Failed to parse metrics JSON string:', metrics, error); // Log the error too
      return <ThemedText className="text-xs text-status-danger">Invalid metrics data</ThemedText>;
    }
  }

  if (typeof parsedMetrics !== 'object' || parsedMetrics === null) {
    return null;
  }

  return (
    <View className="mt-2 flex-row flex-wrap">
      {Object.entries(parsedMetrics).map(([key, value]) => (
        <View
          key={key}
          className="mb-1 mr-2 rounded bg-neutral-200 px-2 py-0.5 dark:bg-neutral-700">
          <ThemedText
            className="text-xs"
            lightClassName="text-neutral-700"
            darkClassName="text-neutral-300">
            <ThemedText className="font-medium">{key.replace(/_/g, ' ')}:</ThemedText>{' '}
            {String(value)}
          </ThemedText>
        </View>
      ))}
    </View>
  );
};

export default function DiaryEntryItem({ entry }: DiaryEntryItemProps) {
  const { theme, isDarkMode } = useTheme();
  const { icon, label, color } = getEntryTypeDetails(entry.entry_type as DiaryEntryType, theme);
  const iconColor = color || (isDarkMode ? theme.colors.neutral[300] : theme.colors.neutral[700]);

  // Format date - ensure entry.entry_date is a valid date string or timestamp
  let formattedDate = 'Invalid Date';
  try {
    // Assuming entry_date is YYYY-MM-DD or a full ISO string
    formattedDate = dayjs(entry.entry_date).format('MMM D, YYYY');
  } catch (error) {
    console.error('Error formatting date:', entry.entry_date, error);
  }

  return (
    <ThemedView
      className="mb-4 overflow-hidden rounded-lg border"
      lightClassName="border-neutral-200 bg-white"
      darkClassName="border-neutral-700 bg-neutral-800">
      {/* Image Header (if image exists) */}
      {entry.image_url && (
        <StorageImage
          url={entry.image_url}
          height={150} // Adjust height as needed
          contentFit="cover"
          accessibilityLabel={`Image for diary entry on ${formattedDate}`}
        />
      )}

      {/* Content Area */}
      <View className="p-3">
        <View className="mb-2 flex-row items-center justify-between">
          {/* Type Icon and Label */}
          <View className="flex-row items-center">
            <MaterialCommunityIcons
              name={icon as any}
              size={18}
              color={iconColor}
              className="mr-2"
            />
            <ThemedText className="font-semibold">{label}</ThemedText>
          </View>
          {/* Date */}
          <ThemedText
            className="text-xs"
            lightClassName="text-neutral-500"
            darkClassName="text-neutral-400">
            {formattedDate}
          </ThemedText>
        </View>

        {/* Content/Notes */}
        {entry.content && entry.content.trim() && (
          <ThemedText className="mb-2">{entry.content}</ThemedText>
        )}

        {/* Metrics */}
        {renderMetrics(entry.metrics, theme, isDarkMode)}

        {/* Add Edit/Delete buttons if needed */}
      </View>
    </ThemedView>
  );
}
