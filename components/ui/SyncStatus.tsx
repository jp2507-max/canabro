import { useColorScheme } from 'nativewind';
import React, { memo, useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import ThemedText from './ThemedText';
import { useSyncContext } from '../../lib/contexts/SyncContext';
import useSyncHealth from '../../lib/hooks/useSyncHealth';

interface SyncStatusProps {
  compact?: boolean;
  onPress?: () => void;
}

/**
 * Component to display sync status and health metrics
 * Can be used in a compact form (just icon + minimal info) or full form
 */
function SyncStatus({ compact = false, onPress }: SyncStatusProps) {
  const { colorScheme } = useColorScheme();
  const { isSyncing, syncError, triggerSync } = useSyncContext();
  const { health, refresh } = useSyncHealth();

  // Handle press - trigger sync and refresh metrics
  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
    } else {
      // If no custom handler provided, trigger a sync
      triggerSync(true);
      refresh();
    }
  }, [onPress, triggerSync, refresh]);

  // Determine the icon color based on status
  const getStatusColor = () => {
    if (syncError) return '#ff5252';
    if (isSyncing) return '#64b5f6';

    switch (health.status) {
      case 'error':
        return '#ff5252';
      case 'warning':
        return '#ffab40';
      case 'healthy':
        return '#4caf50';
      default:
        return '#9e9e9e';
    }
  };

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

  // Compact view - just an indicator with minimal text
  if (compact) {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [styles.compactContainer, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Sync status: ${health.statusText}`}
        accessibilityHint="Press to sync">
        {isSyncing ? (
          <ActivityIndicator size="small" color={getStatusColor()} />
        ) : (
          <View
            style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]}
            accessibilityElementsHidden
          />
        )}
        <ThemedText style={styles.compactText}>
          {isSyncing ? 'Syncing...' : getLastSyncText()}
        </ThemedText>
      </Pressable>
    );
  }

  // Full view - detailed stats and status
  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
        { backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#f5f5f5' },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Sync status: ${health.statusText}`}
      accessibilityHint="Press to trigger a manual sync">
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View
            style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]}
            accessibilityElementsHidden
          />
          <ThemedText style={styles.title}>{isSyncing ? 'Syncing...' : 'Sync Status'}</ThemedText>
        </View>
        <ThemedText style={styles.timestamp}>{getLastSyncText()}</ThemedText>
      </View>

      <ThemedText style={styles.statusText}>
        {isSyncing ? 'Synchronizing with server...' : health.statusText}
      </ThemedText>

      {syncError ? (
        <ThemedText style={styles.errorText}>
          Error: {syncError.message || 'Unknown error during sync'}
        </ThemedText>
      ) : null}

      {!compact && !isSyncing && health.totalSyncs > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <ThemedText style={styles.statLabel}>Success rate:</ThemedText>
            <ThemedText
              style={[
                styles.statValue,
                health.successRate < 0.7 ? styles.warningText : styles.goodText,
              ]}>
              {Math.round(health.successRate * 100)}%
            </ThemedText>
          </View>

          <View style={styles.statRow}>
            <ThemedText style={styles.statLabel}>Avg duration:</ThemedText>
            <ThemedText style={styles.statValue}>
              {Math.round(health.averageSyncDuration)}ms
            </ThemedText>
          </View>

          {health.slowestOperation ? (
            <View style={styles.statRow}>
              <ThemedText style={styles.statLabel}>Slowest op:</ThemedText>
              <ThemedText style={styles.statValue}>{health.slowestOperation}</ThemedText>
            </View>
          ) : null}
        </View>
      )}

      {health.shouldRecommendSync && !isSyncing && (
        <ThemedText style={styles.recommendText}>Tap to sync now</ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 16,
  },
  pressed: {
    opacity: 0.7,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontWeight: '600',
    fontSize: 16,
  },
  timestamp: {
    fontSize: 12,
    opacity: 0.7,
  },
  statusText: {
    marginBottom: 8,
  },
  errorText: {
    color: '#ff5252',
    marginBottom: 8,
  },
  warningText: {
    color: '#ffab40',
  },
  goodText: {
    color: '#4caf50',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  statValue: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  compactText: {
    fontSize: 12,
  },
  recommendText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    color: '#2196f3',
  },
});

export default memo(SyncStatus);
