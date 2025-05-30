import React from 'react';
import { TouchableOpacity, View, Alert } from 'react-native';
import { router } from 'expo-router';

import { OptimizedIcon, IconName } from '../ui/OptimizedIcon';
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';
import { useTheme } from '../../lib/contexts/ThemeContext';
import { colors as themeColors } from '../../lib/theme';

interface PlantActionsProps {
  plantId: string;
  onDelete: () => void;
}

interface ActionItemProps {
  iconName: IconName;
  label: string;
  onPress: () => void;
  isDarkMode: boolean;
  isDestructive?: boolean;
  subLabel?: string;
}

function ActionItem({
  iconName,
  label,
  onPress,
  isDarkMode,
  isDestructive = false,
  subLabel,
}: ActionItemProps) {
  const iconColor = isDestructive
    ? themeColors.status.danger
    : isDarkMode
    ? themeColors.primary[400]
    : themeColors.primary[500];
  const textColor = isDestructive
    ? 'text-red-600'
    : isDarkMode
    ? 'text-neutral-100'
    : 'text-neutral-800';

  return (
    <TouchableOpacity
      className="flex-row items-center py-3.5"
      onPress={onPress}
      accessibilityLabel={label}>      <OptimizedIcon name={iconName} size={24} color={iconColor} />
      <ThemedText className={`ml-4 text-lg ${textColor}`}>{label}</ThemedText>
      {subLabel && (
        <ThemedText
          className="ml-auto text-sm"
          lightClassName="text-neutral-400"
          darkClassName="text-neutral-500">
          {subLabel}
        </ThemedText>
      )}      {!isDestructive && !subLabel && (
        <OptimizedIcon
          name="chevron-forward"
          size={22}
          color={isDarkMode ? themeColors.neutral[400] : themeColors.neutral[500]}
          style={{ marginLeft: 'auto' }}
        />
      )}
    </TouchableOpacity>
  );
}

export function PlantActions({ plantId, onDelete }: PlantActionsProps) {
  const { isDarkMode } = useTheme();

  return (
    <ThemedView
      className="mt-2 mb-4 rounded-xl p-1 shadow-sm"
      lightClassName="bg-white border border-neutral-200"
      darkClassName="bg-neutral-800 border border-neutral-700">
      <ActionItem
        iconName="journal-outline"
        label="Grow Journal"
        onPress={() => router.push(`/plant/diary/${plantId}`)}
        isDarkMode={isDarkMode}
      />
      <View
        className="my-1 border-t"
        style={{ borderColor: isDarkMode ? themeColors.neutral[700] : themeColors.neutral[200] }}
      />
      <ActionItem
        iconName="stats-chart-outline"
        label="Metrics"
        onPress={() => Alert.alert('Coming Soon', 'Plant metrics tracking will be available soon.')}
        isDarkMode={isDarkMode}
        subLabel="(Coming Soon)"
      />
      <View
        className="my-1 border-t"
        style={{ borderColor: isDarkMode ? themeColors.neutral[700] : themeColors.neutral[200] }}
      />
      <ActionItem
        iconName="trash-outline"
        label="Delete Plant"
        onPress={onDelete}
        isDarkMode={isDarkMode}
        isDestructive
      />
    </ThemedView>
  );
}
