import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback } from 'react';
import { View, Alert } from 'react-native';
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

// Modern animated action item component
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

      // Haptic feedback
      runOnUI(() => {
        'worklet';
      })();
      // Run haptics on JS thread
      requestAnimationFrame(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

export function PlantActions({ plantId, onDelete }: PlantActionsProps) {
  const handleGrowJournal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/plant/diary/${plantId}`);
  }, [plantId]);

  const handleMetrics = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('Coming Soon', 'Plant metrics tracking will be available soon.');
  }, []);

  const handleDelete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onDelete();
  }, [onDelete]);

  return (
    <ThemedView variant="card" className="mb-4 mt-2 rounded-3xl p-2 shadow-lg">
      <ActionItem iconName="journal-outline" label="Grow Journal" onPress={handleGrowJournal} />

      <View className="mx-4 h-px bg-neutral-200 dark:bg-neutral-700" />

      <ActionItem
        iconName="stats-chart-outline"
        label="Metrics"
        onPress={handleMetrics}
        subLabel="Coming Soon"
      />

      <View className="mx-4 h-px bg-neutral-200 dark:bg-neutral-700" />

      <ActionItem
        iconName="trash-outline"
        label="Delete Plant"
        onPress={handleDelete}
        isDestructive
      />
    </ThemedView>
  );
}
