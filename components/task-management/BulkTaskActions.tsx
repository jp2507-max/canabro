import React, { useState, useCallback } from 'react';
import { Alert, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated from 'react-native-reanimated';

import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';
import { OptimizedIcon, IconName } from '../ui/OptimizedIcon';
import { useButtonAnimation } from '@/lib/animations/useButtonAnimation';
import { triggerLightHapticSync, triggerMediumHapticSync, triggerHeavyHapticSync } from '@/lib/utils/haptics';
import { PlantTask } from '@/lib/models/PlantTask';

interface BulkTaskActionsProps {
  selectedTasks: Set<string>;
  tasks: PlantTask[];
  onBulkComplete: (taskIds: string[]) => Promise<void>;
  onBulkReschedule: (taskIds: string[], newDate: Date) => Promise<void>;
  onBulkSnooze: (taskIds: string[], minutes: number) => Promise<void>;
  onBulkDelete?: (taskIds: string[]) => Promise<void>;
  onClearSelection: () => void;
  isVisible: boolean;
}

interface BulkActionButtonProps {
  icon: IconName;
  label: string;
  count: number;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

const BulkActionButton: React.FC<BulkActionButtonProps> = ({
  icon,
  label,
  count,
  onPress,
  variant = 'secondary',
  disabled = false,
}) => {
  const { animatedStyle, handlers } = useButtonAnimation({
    enableHaptics: true,
    hapticStyle: variant === 'danger' ? 'heavy' : variant === 'primary' ? 'medium' : 'light',
    onPress: disabled ? undefined : onPress,
  });

  const getVariantClasses = () => {
    if (disabled) {
      return 'bg-neutral-200 dark:bg-neutral-700';
    }
    
    switch (variant) {
      case 'primary':
        return 'bg-primary-500 dark:bg-primary-600';
      case 'danger':
        return 'bg-red-500 dark:bg-red-600';
      default:
        return 'bg-neutral-200 dark:bg-neutral-700';
    }
  };

  const getTextClasses = () => {
    if (disabled) {
      return 'text-neutral-400 dark:text-neutral-500';
    }
    
    switch (variant) {
      case 'primary':
      case 'danger':
        return 'text-white';
      default:
        return 'text-neutral-700 dark:text-neutral-300';
    }
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        {...handlers}
        disabled={disabled}
        className={`flex-row items-center rounded-lg px-3 py-2 ${getVariantClasses()}`}
        accessibilityRole="button"
        accessibilityLabel={`${label} ${count} tasks`}
        accessibilityState={{ disabled }}
      >
        <OptimizedIcon
          name={icon}
          size={16}
          className={`mr-1 ${getTextClasses()}`}
        />
        <ThemedText className={`text-sm font-medium ${getTextClasses()}`}>
          {label} ({count})
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
};

const BulkTaskActions: React.FC<BulkTaskActionsProps> = ({
  selectedTasks,
  tasks,
  onBulkComplete,
  onBulkReschedule,
  onBulkSnooze,
  onBulkDelete,
  onClearSelection,
  isVisible,
}) => {
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedTaskIds = Array.from(selectedTasks);
  const selectedCount = selectedTaskIds.length;



  const handleBulkComplete = useCallback(async () => {
    if (selectedCount === 0 || isProcessing) return;

    // Show confirmation for bulk completion
    Alert.alert(
      t('taskManagement.bulkActions.confirmComplete.title', 'Complete Tasks'),
      t('taskManagement.bulkActions.confirmComplete.message', {
        count: selectedCount,
        defaultValue: `Are you sure you want to mark ${selectedCount} task${selectedCount > 1 ? 's' : ''} as completed?`
      }),
      [
        {
          text: t('common.cancel', 'Cancel'),
          style: 'cancel',
          onPress: () => triggerLightHapticSync(),
        },
        {
          text: t('taskManagement.bulkActions.complete', 'Complete'),
          style: 'default',
          onPress: async () => {
            try {
              setIsProcessing(true);
              await onBulkComplete(selectedTaskIds);
              triggerMediumHapticSync();
              onClearSelection();
            } catch (error) {
              console.error('Error completing tasks:', error);
              Alert.alert(
                t('taskManagement.bulkActions.error.title', 'Error'),
                t('taskManagement.bulkActions.error.complete', 'Failed to complete tasks. Please try again.')
              );
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  }, [selectedCount, selectedTaskIds, onBulkComplete, onClearSelection, isProcessing, t]);

  const handleBulkSnooze = useCallback(async (minutes: number) => {
    if (selectedCount === 0 || isProcessing) return;

    const hours = minutes / 60;
    const timeLabel = hours >= 24 
      ? `${Math.floor(hours / 24)} day${Math.floor(hours / 24) > 1 ? 's' : ''}`
      : hours >= 1 
        ? `${hours} hour${hours > 1 ? 's' : ''}`
        : `${minutes} minute${minutes > 1 ? 's' : ''}`;

    Alert.alert(
      t('taskManagement.bulkActions.confirmSnooze.title', 'Snooze Tasks'),
      t('taskManagement.bulkActions.confirmSnooze.message', {
        count: selectedCount,
        time: timeLabel,
        defaultValue: `Snooze ${selectedCount} task${selectedCount > 1 ? 's' : ''} for ${timeLabel}?`
      }),
      [
        {
          text: t('common.cancel', 'Cancel'),
          style: 'cancel',
          onPress: () => triggerLightHapticSync(),
        },
        {
          text: t('taskManagement.bulkActions.snooze', 'Snooze'),
          style: 'default',
          onPress: async () => {
            try {
              setIsProcessing(true);
              await onBulkSnooze(selectedTaskIds, minutes);
              triggerLightHapticSync();
              onClearSelection();
            } catch (error) {
              console.error('Error snoozing tasks:', error);
              Alert.alert(
                t('taskManagement.bulkActions.error.title', 'Error'),
                t('taskManagement.bulkActions.error.snooze', 'Failed to snooze tasks. Please try again.')
              );
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  }, [selectedCount, selectedTaskIds, onBulkSnooze, onClearSelection, isProcessing, t]);

  const handleBulkReschedule = useCallback(() => {
    if (selectedCount === 0 || isProcessing) return;

    // For now, show options for common reschedule times
    // In a full implementation, this would open a date picker
    Alert.alert(
      t('taskManagement.bulkActions.reschedule.title', 'Reschedule Tasks'),
      t('taskManagement.bulkActions.reschedule.message', {
        count: selectedCount,
        defaultValue: `Choose when to reschedule ${selectedCount} task${selectedCount > 1 ? 's' : ''}:`
      }),
      [
        {
          text: t('common.cancel', 'Cancel'),
          style: 'cancel',
          onPress: () => triggerLightHapticSync(),
        },
        {
          text: t('taskManagement.bulkActions.reschedule.tomorrow', 'Tomorrow'),
          onPress: async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            try {
              setIsProcessing(true);
              await onBulkReschedule(selectedTaskIds, tomorrow);
              triggerLightHapticSync();
              onClearSelection();
            } catch (error) {
              console.error('Error rescheduling tasks:', error);
              Alert.alert(
                t('taskManagement.bulkActions.error.title', 'Error'),
                t('taskManagement.bulkActions.error.reschedule', 'Failed to reschedule tasks. Please try again.')
              );
            } finally {
              setIsProcessing(false);
            }
          },
        },
        {
          text: t('taskManagement.bulkActions.reschedule.nextWeek', 'Next Week'),
          onPress: async () => {
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            try {
              setIsProcessing(true);
              await onBulkReschedule(selectedTaskIds, nextWeek);
              triggerLightHapticSync();
              onClearSelection();
            } catch (error) {
              console.error('Error rescheduling tasks:', error);
              Alert.alert(
                t('taskManagement.bulkActions.error.title', 'Error'),
                t('taskManagement.bulkActions.error.reschedule', 'Failed to reschedule tasks. Please try again.')
              );
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  }, [selectedCount, selectedTaskIds, onBulkReschedule, onClearSelection, isProcessing, t]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedCount === 0 || isProcessing || !onBulkDelete) return;

    Alert.alert(
      t('taskManagement.bulkActions.confirmDelete.title', 'Delete Tasks'),
      t('taskManagement.bulkActions.confirmDelete.message', {
        count: selectedCount,
        defaultValue: `Are you sure you want to delete ${selectedCount} task${selectedCount > 1 ? 's' : ''}? This action cannot be undone.`
      }),
      [
        {
          text: t('common.cancel', 'Cancel'),
          style: 'cancel',
          onPress: () => triggerLightHapticSync(),
        },
        {
          text: t('taskManagement.bulkActions.delete', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              setIsProcessing(true);
              await onBulkDelete(selectedTaskIds);
              triggerHeavyHapticSync();
              onClearSelection();
            } catch (error) {
              console.error('Error deleting tasks:', error);
              Alert.alert(
                t('taskManagement.bulkActions.error.title', 'Error'),
                t('taskManagement.bulkActions.error.delete', 'Failed to delete tasks. Please try again.')
              );
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  }, [selectedCount, selectedTaskIds, onBulkDelete, onClearSelection, isProcessing, t]);

  if (!isVisible || selectedCount === 0) {
    return null;
  }

  return (
    <ThemedView className="border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3">
      <ThemedView className="flex-row items-center justify-between">
        {/* Selection info */}
        <ThemedView className="flex-row items-center">
          <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('taskManagement.bulkActions.selected', {
              count: selectedCount,
              defaultValue: `${selectedCount} selected`
            })}
          </ThemedText>
        </ThemedView>

        {/* Action buttons */}
        <ThemedView className="flex-row space-x-2">
          {/* Complete button */}
          <BulkActionButton
            icon="checkmark"
            label={t('taskManagement.bulkActions.complete', 'Complete')}
            count={selectedCount}
            onPress={handleBulkComplete}
            variant="primary"
            disabled={isProcessing}
          />

          {/* Snooze button */}
          <BulkActionButton
            icon="refresh"
            label={t('taskManagement.bulkActions.snooze', 'Snooze')}
            count={selectedCount}
            onPress={() => handleBulkSnooze(60)} // 1 hour default
            disabled={isProcessing}
          />

          {/* Reschedule button */}
          <BulkActionButton
            icon="calendar-outline"
            label={t('taskManagement.bulkActions.reschedule', 'Reschedule')}
            count={selectedCount}
            onPress={handleBulkReschedule}
            disabled={isProcessing}
          />

          {/* Delete button (optional) */}
          {onBulkDelete && (
            <BulkActionButton
              icon="trash-outline"
              label={t('taskManagement.bulkActions.delete', 'Delete')}
              count={selectedCount}
              onPress={handleBulkDelete}
              variant="danger"
              disabled={isProcessing}
            />
          )}

          {/* Clear selection button */}
          <BulkActionButton
            icon="close"
            label={t('common.cancel', 'Cancel')}
            count={0}
            onPress={() => {
              triggerLightHapticSync();
              onClearSelection();
            }}
            disabled={isProcessing}
          />
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
};

export default BulkTaskActions;