import React from 'react';
import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import { NotificationBadge } from '../ui/NotificationBadge';
import { useButtonAnimation } from '@/lib/animations/useButtonAnimation';

export interface BatchActionControlsProps {
  showBatchActions: boolean;
  selectedCount: number;
  unreadCount: number;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  onToggleBatchMode: () => void;
  onBatchMarkRead: () => void;
  onBatchDismiss: () => void;
  title: string;
  connectionLabel: string;
}

/**
 * BatchActionControls
 * Encapsulates header UI: title, connection status, unread badge, and batch buttons with animations.
 */
const BatchActionControls: React.FC<BatchActionControlsProps> = ({
  showBatchActions,
  selectedCount,
  unreadCount,
  connectionStatus,
  onToggleBatchMode,
  onBatchMarkRead,
  onBatchDismiss,
  title,
  connectionLabel,
}) => {
  const { animatedStyle: batchToggleStyle, handlers: batchToggleHandlers } = useButtonAnimation({
    enableHaptics: true,
    hapticStyle: 'medium',
    onPress: onToggleBatchMode,
  });

  const { animatedStyle: batchMarkReadStyle, handlers: batchMarkReadHandlers } = useButtonAnimation({
    enableHaptics: true,
    hapticStyle: 'heavy',
    onPress: onBatchMarkRead,
  });

  const { animatedStyle: batchDismissStyle, handlers: batchDismissHandlers } = useButtonAnimation({
    enableHaptics: true,
    hapticStyle: 'medium',
    onPress: onBatchDismiss,
  });

  return (
    <ThemedView className="flex-row items-center justify-between p-4 pb-2">
      <ThemedView className="flex-row items-center">
        <ThemedText variant="heading" className="mr-3 text-xl">
          {title}
        </ThemedText>

        {/* Connection status indicator */}
        <ThemedView className="flex-row items-center">
          <ThemedView
            className={`mr-2 h-2 w-2 rounded-full ${
              connectionStatus === 'connected'
                ? 'bg-status-success'
                : connectionStatus === 'connecting'
                ? 'bg-status-warning'
                : 'bg-status-danger'
            }`}
          />
          <ThemedText variant="muted" className="text-xs">
            {connectionLabel}
          </ThemedText>
        </ThemedView>

        {/* Unread count badge */}
        {unreadCount > 0 && <NotificationBadge count={unreadCount} className="ml-2" />}
      </ThemedView>

      {/* Batch action buttons */}
      <ThemedView className="flex-row space-x-2">
        {selectedCount > 0 && (
          <>
            <Animated.View style={batchMarkReadStyle}>
              <Pressable {...batchMarkReadHandlers}>
                <ThemedView className="flex-row items-center rounded-lg bg-primary-500 px-3 py-2">
                  <OptimizedIcon name="checkmark" size={16} className="mr-1 text-white" />
                  <ThemedText className="text-sm font-medium text-white">
                    {/* Consumers should localize this label; kept as default fallback */}
                    Mark read ({selectedCount})
                  </ThemedText>
                </ThemedView>
              </Pressable>
            </Animated.View>

            <Animated.View style={batchDismissStyle}>
              <Pressable {...batchDismissHandlers}>
                <ThemedView className="flex-row items-center rounded-lg bg-neutral-200 px-3 py-2 dark:bg-neutral-700">
                  <OptimizedIcon name="trash" size={16} className="mr-1 text-neutral-700 dark:text-neutral-300" />
                  <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Dismiss
                  </ThemedText>
                </ThemedView>
              </Pressable>
            </Animated.View>
          </>
        )}

        <Animated.View style={batchToggleStyle}>
          <Pressable {...batchToggleHandlers}>
            <ThemedView
              className={`rounded-lg px-3 py-2 ${
                showBatchActions ? 'bg-primary-500' : 'bg-neutral-200 dark:bg-neutral-700'
              }`}
            >
              <OptimizedIcon
                name="checkmark-circle"
                size={16}
                className={showBatchActions ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'}
              />
            </ThemedView>
          </Pressable>
        </Animated.View>
      </ThemedView>
    </ThemedView>
  );
};

export default BatchActionControls;
