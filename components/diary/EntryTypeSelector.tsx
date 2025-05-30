import { OptimizedIcon, IconName } from '../ui/OptimizedIcon';
import React from 'react';
import { TouchableOpacity, FlatList } from 'react-native';

import { useTheme } from '../../lib/contexts/ThemeContext';
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';

// Define the entry types based on user requirements
export type DiaryEntryType =
  | 'note'
  | 'watering'
  | 'feeding'
  | 'defoliating'
  | 'training'
  | 'flushing'
  | 'pest_control'
  | 'environment'
  | 'photo'
  | 'harvest';

interface EntryTypeOption {
  type: DiaryEntryType;
  label: string;
  icon: IconName;
  iconColor?: string; // Optional specific color
}

// Map entry types to labels and icons
const entryTypeOptions: EntryTypeOption[] = [
  { type: 'note', label: 'Note', icon: 'note-text-outline' },
  { type: 'watering', label: 'Watering', icon: 'water-outline' }, // Blue
  { type: 'feeding', label: 'Feeding', icon: 'flask-outline' }, // Purple
  { type: 'defoliating', label: 'Defoliating', icon: 'content-cut' },
  { type: 'training', label: 'Training', icon: 'vector-polyline' }, // LST/Topping
  { type: 'flushing', label: 'Flushing', icon: 'waves' },
  { type: 'pest_control', label: 'Pest Control', icon: 'spider-thread' }, // Bug/Pest icon
  { type: 'environment', label: 'Environment', icon: 'thermometer-lines' }, // Temp/Humidity
  { type: 'photo', label: 'Photo', icon: 'camera-outline' },
  { type: 'harvest', label: 'Harvest', icon: 'scissors-cutting' }, // Orange
];

interface EntryTypeSelectorProps {
  onSelectType: (type: DiaryEntryType) => void;
}

export default function EntryTypeSelector({ onSelectType }: EntryTypeSelectorProps) {
  const { theme, isDarkMode } = useTheme();

  // Assign theme colors to specific icons
  entryTypeOptions.find((o) => o.type === 'watering')!.iconColor = theme.colors.special.watering;
  entryTypeOptions.find((o) => o.type === 'feeding')!.iconColor = theme.colors.special.feeding;
  entryTypeOptions.find((o) => o.type === 'harvest')!.iconColor = theme.colors.special.harvesting;

  const renderItem = ({ item }: { item: EntryTypeOption }) => (
    <TouchableOpacity
      onPress={() => onSelectType(item.type)}
      className="mb-2 flex-row items-center rounded-lg p-4 active:opacity-70"
      style={{
        backgroundColor: isDarkMode ? theme.colors.neutral[800] : theme.colors.neutral[100],
      }}>
      <OptimizedIcon
        name={item.icon}
        size={24}
        color={
          item.iconColor || (isDarkMode ? theme.colors.neutral[300] : theme.colors.neutral[700])
        }
        style={{ marginRight: 16 }}
      />
      <ThemedText className="text-base">{item.label}</ThemedText>
    </TouchableOpacity>
  );

  return (
    <ThemedView className="flex-1 p-4">
      <ThemedText className="mb-4 text-xl font-semibold">Select Entry Type</ThemedText>
      <FlatList
        data={entryTypeOptions}
        renderItem={renderItem}
        keyExtractor={(item) => item.type}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </ThemedView>
  );
}
