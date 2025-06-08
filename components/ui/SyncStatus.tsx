import * as Haptics from 'expo-haptics';
import React, { memo, useCallback, useEffect } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
  useDerivedValue,
} from 'react-native-reanimated';

import ThemedText from './ThemedText';

import { useSyncContext } from '@/lib/contexts/SyncContext';
import { useSyncHealth } from '@/lib/hooks/useSyncHealth';

interface SyncStatusProps {
  compact?: boolean;
  onPress?: () => void;
}

// Animation timing configuration
const ANIMATION_CONFIG = {
  spring: { damping: 15, stiffness: 300 },
  duration: { fast: 200, slow: 500 },
};

// Move getStatusColors outside component as a pure function
const getStatusColors = (syncError: Error | null, isSyncing: boolean, healthStatus: string) => {
  'worklet';
  if (syncError)
    return { bg: 'bg-status-danger', text: 'text-status-danger', indicator: '#ef4444' };
  if (isSyncing) return { bg: 'bg-blue-500', text: 'text-blue-600', indicator: '#3b82f6' };

  switch (healthStatus) {
    case 'error':
      return { bg: 'bg-status-danger', text: 'text-status-danger', indicator: '#ef4444' };
    case 'warning':
      return { bg: 'bg-status-warning', text: 'text-status-warning', indicator: '#f59e0b' };
    case 'healthy':
      return { bg: 'bg-status-success', text: 'text-status-success', indicator: '#10b981' };
    default:
      return { bg: 'bg-neutral-400', text: 'text-neutral-500', indicator: '#6b7280' };
  }
};

/**
 * Component to display sync status and health metrics
 * Can be used in a compact form (just icon + minimal info) or full form
 * Features NativeWind v4 theming, Reanimated v3 animations, and haptic feedback
 */
function SyncStatus({ compact = false, onPress }: SyncStatusProps) {
  const { triggerSync, isSyncing, syncError } = useSyncContext();
  const { health, refresh } = useSyncHealth();

  // Animation values
  const statusScale = useSharedValue(1);
  const pulseAnimation = useSharedValue(0);
  const statusOpacity = useSharedValue(1);
  const containerScale = useSharedValue(1);
  const progressWidth = useSharedValue(0);

  // Share the current indicator colour with the UI thread
  const indicatorColor = useDerivedValue(
    () => getStatusColors(syncError, isSyncing, health.status).indicator,
    [isSyncing, syncError, health.status]
  );

  // Initialize pulse animation when syncing
  useEffect(() => {
    if (isSyncing) {
      // Start pulse animation
      pulseAnimation.value = withRepeat(
        withSequence(
          withTiming(1, { duration: ANIMATION_CONFIG.duration.slow }),
          withTiming(0, { duration: ANIMATION_CONFIG.duration.slow })
        ),
        -1,
        false
      );

      // Animate progress bar
      progressWidth.value = withRepeat(withTiming(100, { duration: 2000 }), -1, true);
    } else {
      // Stop animations when not syncing
      pulseAnimation.value = withTiming(0, { duration: ANIMATION_CONFIG.duration.fast });
      progressWidth.value = withTiming(0, { duration: ANIMATION_CONFIG.duration.fast });
    }
  }, [isSyncing]);

  // Status change animation
  useEffect(() => {
    statusOpacity.value = withSequence(
      withTiming(0.5, { duration: 150 }),
      withTiming(1, { duration: 150 })
    );
    statusScale.value = withSequence(
      withSpring(1.1, ANIMATION_CONFIG.spring),
      withSpring(1, ANIMATION_CONFIG.spring)
    );
  }, [health.status, syncError]);

  // Handle press with haptic feedback and animations
  const handlePress = useCallback(() => {
    // Haptic feedback based on current state
    if (syncError) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else if (isSyncing) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Press animation
    containerScale.value = withSequence(
      withTiming(0.97, { duration: 100 }),
      withSpring(1, ANIMATION_CONFIG.spring)
    );

    if (onPress) {
      onPress();
    } else {
      // If no custom handler provided, trigger a sync
      triggerSync(true);
      refresh();
    }
  }, [onPress, triggerSync, refresh, syncError, isSyncing]);

  // Get a readable time since last sync
  const getLastSyncText = () => {
    if (health.lastSuccessfulSync === 0) return 'Never synced';

    const elapsedSec = health.elapsedSinceLastSync;
    if (elapsedSec < 60) return 'Just now';

    const elapsedMin = Math.floor(elapsedSec / 60);
    if (elapsedMin < 60) return `${elapsedMin}m ago`;

    const elapsedHours = Math.floor(elapsedMin / 60);
    if (elapsedHours < 24) return `${elapsedHours}h ago`;

    const elapsedDays = Math.floor(elapsedHours / 24);
    return `${elapsedDays}d ago`;
  };

  // Animated styles
  const containerAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: containerScale.value }],
    };
  });

  const statusIndicatorStyle = useAnimatedStyle(() => {
    'worklet';
    const color = indicatorColor.value;
    const pulseScale = 1 + pulseAnimation.value * 0.3;
    const pulseOpacity = 0.7 + pulseAnimation.value * 0.3;

    return {
      transform: [{ scale: statusScale.value * pulseScale }],
      opacity: statusOpacity.value * pulseOpacity,
      backgroundColor: color,
    };
  });

  const progressAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      width: `${progressWidth.value}%`,
    };
  });

  const statusColors = getStatusColors(syncError, isSyncing, health.status);

  // Compact view - just an indicator with minimal text
  if (compact) {
    return (
      <Animated.View style={containerAnimatedStyle}>
        <Pressable
          onPress={handlePress}
          className="flex-row items-center rounded-2xl p-2 active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel={`Sync status: ${health.statusText}`}
          accessibilityHint="Press to sync">
          {isSyncing ? (
            <View className="mr-1.5">
              <ActivityIndicator size="small" color={statusColors.indicator} />
            </View>
          ) : (
            <Animated.View
              className="mr-1.5 h-2 w-2 rounded-full"
              style={statusIndicatorStyle}
              accessibilityElementsHidden
            />
          )}

          <ThemedText className="text-xs">
            {isSyncing ? 'Syncing...' : getLastSyncText()}
          </ThemedText>
        </Pressable>
      </Animated.View>
    );
  }

  // Full view - detailed stats and status
  return (
    <Animated.View style={containerAnimatedStyle}>
      <Pressable
        onPress={handlePress}
        className="mx-2 my-1 rounded-lg border border-neutral-200 bg-neutral-50 p-4 
                   active:opacity-80 dark:border-neutral-700 dark:bg-neutral-800"
        accessibilityRole="button"
        accessibilityLabel={`Sync status: ${health.statusText}`}
        accessibilityHint="Press to trigger a manual sync">
        {/* Progress bar for syncing state */}
        {isSyncing && (
          <View className="absolute left-0 right-0 top-0 h-1 overflow-hidden rounded-t-lg bg-neutral-200 dark:bg-neutral-700">
            <Animated.View
              className={`h-full ${statusColors.bg} opacity-70`}
              style={progressAnimatedStyle}
            />
          </View>
        )}

        {/* Header with status indicator and title */}
        <View className="mb-2 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Animated.View
              className="mr-1.5 h-2 w-2 rounded-full"
              style={statusIndicatorStyle}
              accessibilityElementsHidden
            />
            <ThemedText className="text-base font-semibold">
              {isSyncing ? 'Syncing...' : 'Sync Status'}
            </ThemedText>
          </View>
          <ThemedText className="text-xs opacity-70">{getLastSyncText()}</ThemedText>
        </View>

        {/* Status text */}
        <ThemedText className="mb-2">
          {isSyncing ? 'Synchronizing with server...' : health.statusText}
        </ThemedText>

        {/* Error message */}
        {syncError && (
          <ThemedText className="text-status-danger mb-2">
            Error: {syncError.message || 'Unknown error during sync'}
          </ThemedText>
        )}

        {/* Statistics section */}
        {!compact && !isSyncing && health.totalSyncs > 0 && (
          <View className="mt-2 border-t border-neutral-200 pt-2 dark:border-neutral-700">
            {/* Success rate */}
            <View className="mb-1 flex-row justify-between">
              <ThemedText className="text-xs opacity-70">Success rate:</ThemedText>
              <ThemedText
                className={`font-mono text-xs ${
                  health.successRate < 0.7 ? 'text-status-warning' : 'text-status-success'
                }`}>
                {Math.round(health.successRate * 100)}%
              </ThemedText>
            </View>

            {/* Average duration */}
            <View className="mb-1 flex-row justify-between">
              <ThemedText className="text-xs opacity-70">Avg duration:</ThemedText>
              <ThemedText className="font-mono text-xs">
                {Math.round(health.averageSyncDuration)}ms
              </ThemedText>
            </View>

            {/* Slowest operation */}
            {health.slowestOperation && (
              <View className="mb-1 flex-row justify-between">
                <ThemedText className="text-xs opacity-70">Slowest op:</ThemedText>
                <ThemedText className="font-mono text-xs">{health.slowestOperation}</ThemedText>
              </View>
            )}
          </View>
        )}

        {/* Recommendation text */}
        {health.shouldRecommendSync && !isSyncing && (
          <ThemedText className="mt-2 text-center text-xs text-blue-500 dark:text-blue-400">
            Tap to sync now
          </ThemedText>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default memo(SyncStatus);
