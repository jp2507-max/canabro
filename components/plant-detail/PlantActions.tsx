import {
  triggerLightHapticSync,
  triggerMediumHaptic,
  triggerWarningHaptic,
} from '@/lib/utils/haptics';
import { router } from 'expo-router';
import React, { useCallback } from 'react';
import { View, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
// Modern animation imports
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnUI,
  interpolateColor as rInterpolateColor,
} from 'react-native-reanimated';

import { OptimizedIcon, IconName } from '../ui/OptimizedIcon';
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';

interface PlantActionsProps {
  plantId: string;
  onDelete: () => void;
}

interface ActionItemProps {
  iconName: IconName;
  label: string;
  onPress: () => void;
  isDestructive?: boolean;
  subLabel?: string;
}

/**
 * Renders an animated, interactive action button with an icon, label, and optional sub-label.
 *
 * Provides visual and haptic feedback on press, with styling that adapts for destructive actions. Displays a chevron icon for non-destructive actions without a sub-label.
 *
 * @param iconName - The name of the icon to display.
 * @param label - The main text label for the action.
 * @param onPress - Callback invoked when the action is pressed.
 * @param isDestructive - If true, styles the action as destructive.
 * @param subLabel - Optional secondary label displayed below the main label.
 */
function ActionItem({
  iconName,
  label,
  onPress,
  isDestructive = false,
  subLabel,
}: ActionItemProps) {
  // Reanimated v3 shared values
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);
  const shadowOpacity = useSharedValue(0.1);

  // Animated styles with React Compiler compatibility
  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const backgroundColor = rInterpolateColor(
      pressed.value,
      [0, 1],
      isDestructive
        ? ['rgba(0, 0, 0, 0)', 'rgba(239, 68, 68, 0.1)']
        : ['rgba(0, 0, 0, 0)', 'rgba(34, 197, 94, 0.1)']
    );

    return {
      transform: [{ scale: scale.value }],
      backgroundColor,
      shadowOpacity: shadowOpacity.value,
    };
  });

  // Modern gesture handling
  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
      pressed.value = withTiming(1, { duration: 150 });
      shadowOpacity.value = withTiming(0.2, { duration: 150 });

      // Run haptics on JS thread
      requestAnimationFrame(() => {
        triggerLightHapticSync();
      });
    })
    .onEnd(() => {
      'worklet';
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      pressed.value = withTiming(0, { duration: 200 });
      shadowOpacity.value = withTiming(0.1, { duration: 200 });

      // Execute onPress on JS thread
      requestAnimationFrame(() => {
        onPress();
      });
    });

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View style={animatedStyle}>
        <View
          className="flex-row items-center px-1 py-4"
          accessible
          accessibilityLabel={label}
          accessibilityRole="button">
          <View
            className={`rounded-xl p-3 ${
              isDestructive
                ? 'bg-red-100 dark:bg-red-900/30'
                : 'bg-primary-100 dark:bg-primary-900/30'
            }`}>
            <OptimizedIcon
              name={iconName}
              size={24}
              color={isDestructive ? '#ef4444' : '#10b981'}
            />
          </View>
          <View className="ml-4 flex-1">
            <ThemedText
              className={`text-lg font-semibold ${
                isDestructive
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-neutral-900 dark:text-white'
              }`}>
              {label}
            </ThemedText>
            {subLabel && (
              <ThemedText variant="muted" className="mt-0.5 text-sm">
                {subLabel}
              </ThemedText>
            )}
          </View>
          {!isDestructive && !subLabel && (
            <OptimizedIcon name="chevron-forward" size={20} color="#9ca3af" />
          )}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

/**
 * Renders a card with interactive action buttons for plant-related operations, such as viewing the grow journal, accessing metrics, and deleting the plant.
 *
 * @param plantId - The unique identifier of the plant for which actions are displayed.
 * @param onDelete - Callback invoked when the delete action is triggered.
 * @returns A React element containing action items for the specified plant.
 */
export function PlantActions({ plantId, onDelete }: PlantActionsProps) {
  const { t } = useTranslation('plants');
  
  const handleGrowJournal = useCallback(() => {
    triggerMediumHaptic();
    router.push({
      pathname: '/(app)/plant/[id]/journal',
      params: { id: plantId },
    });
  }, [plantId]);

  const handleMetrics = useCallback(() => {
    triggerWarningHaptic();
    Alert.alert(t('comingSoon'), 'Plant metrics tracking will be available soon.');
  }, [t]);

  const handleDelete = useCallback(() => {
    triggerWarningHaptic();
    onDelete();
  }, [onDelete]);

  return (
    <ThemedView variant="card" className="mb-4 mt-2 rounded-3xl p-2 shadow-lg">
      <ActionItem iconName="journal-outline" label={t('growJournal')} onPress={handleGrowJournal} />

      <View className="mx-4 h-px bg-neutral-200 dark:bg-neutral-700" />

      <ActionItem
        iconName="stats-chart-outline"
        label={t('metrics')}
        onPress={handleMetrics}
        subLabel={t('comingSoon')}
      />

      <View className="mx-4 h-px bg-neutral-200 dark:bg-neutral-700" />

      <ActionItem
        iconName="trash-outline"
        label={t('deletePlant')}
        onPress={handleDelete}
        isDestructive
      />
    </ThemedView>
  );
}
