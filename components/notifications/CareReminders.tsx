import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Alert, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Q } from '@nozbe/watermelondb';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { format } from '@/lib/utils/date';
import Animated from 'react-native-reanimated';

import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import { useButtonAnimation } from '@/lib/animations/useButtonAnimation';
import { useCardAnimation } from '@/lib/animations/useCardAnimation';
import { triggerLightHapticSync, triggerMediumHapticSync } from '@/lib/utils/haptics';
import { CareReminder } from '@/lib/models/CareReminder';
import { Plant } from '@/lib/models/Plant';
import { database } from '@/lib/models';
import { careReminderService } from '@/lib/services/careReminderService';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface CareReminderCardProps {
  reminder: CareReminder;
  plant: Plant;
  onMarkDone: (reminder: CareReminder) => void;
  onSnooze: (reminder: CareReminder, days: number) => void;
  onReschedule: (reminder: CareReminder) => void;
  isSelected: boolean;
  onSelect: (reminder: CareReminder) => void;
  showSelection: boolean;
}

const CareReminderCard: React.FC<CareReminderCardProps> = ({
  reminder,
  plant,
  onMarkDone,
  onSnooze,
  onReschedule,
  isSelected,
  onSelect,
  showSelection,
}) => {
  const { t } = useTranslation();
  const { animatedStyle, handlers } = useCardAnimation({
    enableHaptics: true,
    hapticStyle: 'light',
    onPress: () => {
      if (showSelection) {
        onSelect(reminder);
      }
    },
  });

  const markDoneAnimation = useButtonAnimation({
    enableHaptics: true,
    hapticStyle: 'medium',
    onPress: () => onMarkDone(reminder),
  });

  const snoozeAnimation = useButtonAnimation({
    enableHaptics: true,
    hapticStyle: 'light',
    onPress: () => onSnooze(reminder, 1),
  });

  const rescheduleAnimation = useButtonAnimation({
    enableHaptics: true,
    hapticStyle: 'light',
    onPress: () => onReschedule(reminder),
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-status-danger bg-status-danger/5';
      case 'high':
        return 'border-l-status-warning bg-status-warning/5';
      case 'medium':
        return 'border-l-primary-500 bg-primary-500/5';
      default:
        return 'border-l-neutral-300 dark:border-l-neutral-600 bg-neutral-50 dark:bg-neutral-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'watering':
        return 'water-outline';
      case 'nutrients':
        return 'nutrition-outline';
      case 'inspection':
        return 'search-outline';
      default:
        return 'checkmark-circle';
    }
  };

  const formatDueDate = (scheduledFor: Date) => {
    const now = new Date();
    const diffInDays = Math.ceil((scheduledFor.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays < 0) {
      return t('careReminders.overdue', { days: Math.abs(diffInDays) });
    } else if (diffInDays === 0) {
      return t('careReminders.dueToday');
    } else if (diffInDays === 1) {
      return t('careReminders.dueTomorrow');
    } else {
      return t('careReminders.dueInDays', { days: diffInDays });
    }
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable {...handlers}>
        <ThemedView
          variant="card"
          className={`mb-3 border-l-4 p-4 ${getPriorityColor(reminder.priorityLevel)} ${
            isSelected ? 'ring-2 ring-primary-500' : ''
          }`}
        >
          {/* Header with plant info and selection */}
          <ThemedView className="mb-3 flex-row items-center justify-between">
            <ThemedView className="flex-1 flex-row items-center">
              {plant.imageUrl && (
                <ThemedView className="mr-3 h-12 w-12 overflow-hidden rounded-lg">
                  <Animated.Image
                    source={{ uri: plant.imageUrl }}
                    className="h-full w-full"
                    resizeMode="cover"
                  />
                </ThemedView>
              )}
              <ThemedView className="flex-1">
                <ThemedText variant="heading" className="text-base">
                  {plant.name}
                </ThemedText>
                <ThemedText variant="muted" className="text-sm">
                  {plant.strain}
                </ThemedText>
              </ThemedView>
            </ThemedView>
            
            {showSelection && (
              <Animated.View style={markDoneAnimation.animatedStyle}>
                <Pressable {...markDoneAnimation.handlers}>
                  <ThemedView
                    className={`h-6 w-6 rounded-full border-2 ${
                      isSelected
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-neutral-300 dark:border-neutral-600'
                    }`}
                  >
                    {isSelected && (
                      <OptimizedIcon
                        name="checkmark"
                        size={12}
                        className="text-white"
                      />
                    )}
                  </ThemedView>
                </Pressable>
              </Animated.View>
            )}
          </ThemedView>

          {/* Reminder details */}
          <ThemedView className="mb-3 flex-row items-center">
            <OptimizedIcon
              name={getTypeIcon(reminder.type)}
              size={20}
              className="mr-3 text-primary-500"
            />
            <ThemedView className="flex-1">
              <ThemedText variant="heading" className="text-base">
                {reminder.title}
              </ThemedText>
              {reminder.description && (
                <ThemedText variant="muted" className="text-sm">
                  {reminder.description}
                </ThemedText>
              )}
            </ThemedView>
          </ThemedView>

          {/* Due date and priority */}
          <ThemedView className="mb-4 flex-row items-center justify-between">
            <ThemedText
              className={`text-sm font-medium ${
                reminder.priorityLevel === 'urgent'
                  ? 'text-status-danger'
                  : reminder.priorityLevel === 'high'
                  ? 'text-status-warning'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              {formatDueDate(reminder.scheduledFor)}
            </ThemedText>
            <ThemedText variant="muted" className="text-xs">
              {format(reminder.scheduledFor, 'MMM d, h:mm a')}
            </ThemedText>
          </ThemedView>

          {/* Action buttons */}
          {!showSelection && (
            <ThemedView className="flex-row space-x-2">
              <Animated.View style={markDoneAnimation.animatedStyle} className="flex-1">
                <Pressable {...markDoneAnimation.handlers}>
                  <ThemedView className="flex-row items-center justify-center rounded-lg bg-primary-500 px-4 py-2">
                    <OptimizedIcon name="checkmark" size={16} className="mr-2 text-white" />
                    <ThemedText className="font-medium text-white">
                      {t('careReminders.markDone')}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              </Animated.View>

              <Animated.View style={snoozeAnimation.animatedStyle}>
                <Pressable {...snoozeAnimation.handlers}>
                  <ThemedView className="flex-row items-center justify-center rounded-lg bg-neutral-200 px-3 py-2 dark:bg-neutral-700">
                    <OptimizedIcon
                      name="refresh"
                      size={16}
                      className="mr-1 text-neutral-700 dark:text-neutral-300"
                    />
                    <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {t('careReminders.snooze')}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              </Animated.View>

              <Animated.View style={rescheduleAnimation.animatedStyle}>
                <Pressable {...rescheduleAnimation.handlers}>
                  <ThemedView className="flex-row items-center justify-center rounded-lg bg-neutral-200 px-3 py-2 dark:bg-neutral-700">
                    <OptimizedIcon
                      name="calendar-outline"
                      size={16}
                      className="text-neutral-700 dark:text-neutral-300"
                    />
                  </ThemedView>
                </Pressable>
              </Animated.View>
            </ThemedView>
          )}
        </ThemedView>
      </Pressable>
    </Animated.View>
  );
};

interface CareRemindersProps {
  plantId?: string; // Optional filter for specific plant
  showCompleted?: boolean;
  onReminderPress?: (reminder: CareReminder) => void;
}

const CareReminders: React.FC<CareRemindersProps> = ({
  plantId,
  showCompleted = false,
  onReminderPress,
}) => {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReminders, setSelectedReminders] = useState<Set<string>>(new Set());
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [reminders, setReminders] = useState<CareReminder[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);

  // Load reminders and plants
  useEffect(() => {
    let reminderSubscription: any;
    let plantsSubscription: any;

    const loadData = async () => {
      try {
        setLoading(true);
        
        // Query reminders
        const reminderQuery = database.collections
          .get<CareReminder>('care_reminders')
          .query(
            Q.where('is_deleted', false),
            showCompleted ? Q.where('is_completed', true) : Q.where('is_completed', false),
            ...(plantId ? [Q.where('plant_id', plantId)] : []),
            Q.sortBy('scheduled_for', Q.asc)
          );

        // Query plants
        const plantsQuery = database.collections
          .get<Plant>('plants')
          .query(Q.where('is_deleted', false));

        // Set up observables
        reminderSubscription = reminderQuery.observe().subscribe(setReminders);
        plantsSubscription = plantsQuery.observe().subscribe(setPlants);
      } catch (error) {
        console.error('Error loading care reminders:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => {
      reminderSubscription?.unsubscribe();
      plantsSubscription?.unsubscribe();
    };
  }, [plantId, showCompleted]);

  // Create plant lookup map
  const plantMap = useMemo(() => {
    const map = new Map<string, Plant>();
    plants.forEach((plant) => map.set(plant.id, plant));
    return map;
  }, [plants]);

  // Group reminders by priority
  const groupedReminders = useMemo(() => {
    const groups = {
      urgent: [] as CareReminder[],
      high: [] as CareReminder[],
      medium: [] as CareReminder[],
      low: [] as CareReminder[],
    };

    reminders.forEach((reminder) => {
      groups[reminder.priorityLevel].push(reminder);
    });

    return groups;
  }, [reminders]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // Refresh data - WatermelonDB will automatically update
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleMarkDone = useCallback(async (reminder: CareReminder) => {
    try {
      await careReminderService.markReminderCompleted(reminder.id);
      triggerMediumHapticSync();
      
      // Cancel any scheduled notification
      await Notifications.cancelScheduledNotificationAsync(reminder.id);
    } catch (error) {
      console.error('Error marking reminder as done:', error);
      Alert.alert(
        t('careReminders.error'),
        t('careReminders.errorMarkingDone')
      );
    }
  }, [t]);

  const handleSnooze = useCallback(async (reminder: CareReminder, days: number) => {
    try {
      await careReminderService.snoozeReminder(reminder.id, days);
      triggerLightHapticSync();
      
      // Reschedule notification
      await scheduleNotification(reminder, days);
    } catch (error) {
      console.error('Error snoozing reminder:', error);
      Alert.alert(
        t('careReminders.error'),
        t('careReminders.errorSnoozing')
      );
    }
  }, [t]);

  const handleReschedule = useCallback((reminder: CareReminder) => {
    // This would open a date picker modal
    // For now, just snooze by 1 day
    handleSnooze(reminder, 1);
  }, [handleSnooze]);

  const handleSelectReminder = useCallback((reminder: CareReminder) => {
    setSelectedReminders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(reminder.id)) {
        newSet.delete(reminder.id);
      } else {
        newSet.add(reminder.id);
      }
      return newSet;
    });
  }, []);

  const handleBatchMarkDone = useCallback(async () => {
    try {
      const selectedReminderIds = Array.from(selectedReminders);
      
      await careReminderService.batchMarkCompleted(selectedReminderIds);
      
      // Cancel notifications for all selected reminders
      await Promise.all(
        selectedReminderIds.map((id) => Notifications.cancelScheduledNotificationAsync(id))
      );
      
      setSelectedReminders(new Set());
      setShowBatchActions(false);
      triggerMediumHapticSync();
    } catch (error) {
      console.error('Error batch marking reminders as done:', error);
      Alert.alert(
        t('careReminders.error'),
        t('careReminders.errorBatchMarkingDone')
      );
    }
  }, [selectedReminders, t]);

  const handleBatchSnooze = useCallback(async (days: number) => {
    try {
      const selectedReminderIds = Array.from(selectedReminders);
      
      await careReminderService.batchSnooze(selectedReminderIds, days);
      
      // Reschedule notifications for all selected reminders
      const selectedReminderObjects = reminders.filter((r) => selectedReminders.has(r.id));
      await Promise.all(
        selectedReminderObjects.map((reminder) => scheduleNotification(reminder, days))
      );
      
      setSelectedReminders(new Set());
      setShowBatchActions(false);
      triggerLightHapticSync();
    } catch (error) {
      console.error('Error batch snoozing reminders:', error);
      Alert.alert(
        t('careReminders.error'),
        t('careReminders.errorBatchSnoozing')
      );
    }
  }, [reminders, selectedReminders, t]);

  const toggleBatchMode = useCallback(() => {
    setShowBatchActions(!showBatchActions);
    setSelectedReminders(new Set());
    triggerLightHapticSync();
  }, [showBatchActions]);

  // Helper function to schedule notifications
  const scheduleNotification = async (reminder: CareReminder, daysFromNow: number = 0) => {
    try {
      const plant = plantMap.get(reminder.plantId);
      if (!plant) return;

      const scheduledDate = new Date(reminder.scheduledFor);
      if (daysFromNow > 0) {
        scheduledDate.setDate(scheduledDate.getDate() + daysFromNow);
      }

      await Notifications.scheduleNotificationAsync({
        identifier: reminder.id,
        content: {
          title: `${plant.name} - ${reminder.title}`,
          body: reminder.description || t('careReminders.defaultNotificationBody'),
          data: {
            reminderId: reminder.id,
            plantId: plant.id,
            type: reminder.type,
          },
        },
        trigger: {
          type: SchedulableTriggerInputTypes.DATE,
          date: scheduledDate,
        },
      });
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  };

  const batchActionsAnimation = useButtonAnimation({
    enableHaptics: true,
    hapticStyle: 'medium',
    onPress: toggleBatchMode,
  });

  const batchMarkDoneAnimation = useButtonAnimation({
    enableHaptics: true,
    hapticStyle: 'heavy',
    onPress: handleBatchMarkDone,
  });

  const batchSnoozeAnimation = useButtonAnimation({
    enableHaptics: true,
    hapticStyle: 'light',
    onPress: () => handleBatchSnooze(1),
  });

  if (reminders.length === 0) {
    return (
      <ThemedView className="flex-1 items-center justify-center p-6">
        <OptimizedIcon
          name="checkmark-circle"
          size={64}
          className="mb-4 text-primary-500"
        />
        <ThemedText variant="heading" className="mb-2 text-center text-xl">
          {showCompleted
            ? t('careReminders.noCompletedReminders')
            : t('careReminders.noActiveReminders')
          }
        </ThemedText>
        <ThemedText variant="muted" className="text-center">
          {showCompleted
            ? t('careReminders.noCompletedRemindersDescription')
            : t('careReminders.noActiveRemindersDescription')
          }
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView className="flex-1">
      {/* Header with batch actions */}
      <ThemedView className="flex-row items-center justify-between p-4">
        <ThemedText variant="heading" className="text-xl">
          {showCompleted ? t('careReminders.completed') : t('careReminders.active')}
        </ThemedText>
        
        <ThemedView className="flex-row space-x-2">
          {selectedReminders.size > 0 && (
            <>
              <Animated.View style={batchMarkDoneAnimation.animatedStyle}>
                <Pressable {...batchMarkDoneAnimation.handlers}>
                  <ThemedView className="flex-row items-center rounded-lg bg-primary-500 px-3 py-2">
                    <OptimizedIcon name="checkmark" size={16} className="mr-1 text-white" />
                    <ThemedText className="text-sm font-medium text-white">
                      {t('careReminders.markDone')} ({selectedReminders.size})
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              </Animated.View>

              <Animated.View style={batchSnoozeAnimation.animatedStyle}>
                <Pressable {...batchSnoozeAnimation.handlers}>
                  <ThemedView className="flex-row items-center rounded-lg bg-neutral-200 px-3 py-2 dark:bg-neutral-700">
                    <OptimizedIcon
                      name="refresh"
                      size={16}
                      className="mr-1 text-neutral-700 dark:text-neutral-300"
                    />
                    <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {t('careReminders.snooze')}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              </Animated.View>
            </>
          )}

          <Animated.View style={batchActionsAnimation.animatedStyle}>
            <Pressable {...batchActionsAnimation.handlers}>
              <ThemedView
                className={`rounded-lg px-3 py-2 ${
                  showBatchActions
                    ? 'bg-primary-500'
                    : 'bg-neutral-200 dark:bg-neutral-700'
                }`}
              >
                <OptimizedIcon
                  name="checkmark-circle"
                  size={16}
                  className={
                    showBatchActions
                      ? 'text-white'
                      : 'text-neutral-700 dark:text-neutral-300'
                  }
                />
              </ThemedView>
            </Pressable>
          </Animated.View>
        </ThemedView>
      </ThemedView>

      {/* Reminders list */}
      <ScrollView
        className="flex-1 px-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Urgent reminders */}
        {groupedReminders.urgent.length > 0 && (
          <ThemedView className="mb-4">
            <ThemedText className="mb-2 text-sm font-bold uppercase text-status-danger">
              {t('careReminders.urgent')}
            </ThemedText>
            {groupedReminders.urgent.map((reminder) => {
              const plant = plantMap.get(reminder.plantId);
              if (!plant) return null;
              
              return (
                <CareReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  plant={plant}
                  onMarkDone={handleMarkDone}
                  onSnooze={handleSnooze}
                  onReschedule={handleReschedule}
                  isSelected={selectedReminders.has(reminder.id)}
                  onSelect={handleSelectReminder}
                  showSelection={showBatchActions}
                />
              );
            })}
          </ThemedView>
        )}

        {/* High priority reminders */}
        {groupedReminders.high.length > 0 && (
          <ThemedView className="mb-4">
            <ThemedText className="mb-2 text-sm font-bold uppercase text-status-warning">
              {t('careReminders.high')}
            </ThemedText>
            {groupedReminders.high.map((reminder) => {
              const plant = plantMap.get(reminder.plantId);
              if (!plant) return null;
              
              return (
                <CareReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  plant={plant}
                  onMarkDone={handleMarkDone}
                  onSnooze={handleSnooze}
                  onReschedule={handleReschedule}
                  isSelected={selectedReminders.has(reminder.id)}
                  onSelect={handleSelectReminder}
                  showSelection={showBatchActions}
                />
              );
            })}
          </ThemedView>
        )}

        {/* Medium priority reminders */}
        {groupedReminders.medium.length > 0 && (
          <ThemedView className="mb-4">
            <ThemedText className="mb-2 text-sm font-bold uppercase text-primary-500">
              {t('careReminders.medium')}
            </ThemedText>
            {groupedReminders.medium.map((reminder) => {
              const plant = plantMap.get(reminder.plantId);
              if (!plant) return null;
              
              return (
                <CareReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  plant={plant}
                  onMarkDone={handleMarkDone}
                  onSnooze={handleSnooze}
                  onReschedule={handleReschedule}
                  isSelected={selectedReminders.has(reminder.id)}
                  onSelect={handleSelectReminder}
                  showSelection={showBatchActions}
                />
              );
            })}
          </ThemedView>
        )}

        {/* Low priority reminders */}
        {groupedReminders.low.length > 0 && (
          <ThemedView className="mb-4">
            <ThemedText className="mb-2 text-sm font-bold uppercase text-neutral-600 dark:text-neutral-400">
              {t('careReminders.low')}
            </ThemedText>
            {groupedReminders.low.map((reminder) => {
              const plant = plantMap.get(reminder.plantId);
              if (!plant) return null;
              
              return (
                <CareReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  plant={plant}
                  onMarkDone={handleMarkDone}
                  onSnooze={handleSnooze}
                  onReschedule={handleReschedule}
                  isSelected={selectedReminders.has(reminder.id)}
                  onSelect={handleSelectReminder}
                  showSelection={showBatchActions}
                />
              );
            })}
          </ThemedView>
        )}

        {/* Bottom padding for safe area */}
        <ThemedView className="h-20" />
      </ScrollView>
    </ThemedView>
  );
};

export default CareReminders;