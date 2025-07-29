import React, { useState, useCallback, useEffect } from 'react';
import { Alert, Platform, Pressable, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Calendar from 'expo-calendar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Animated from 'react-native-reanimated';

import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import { AnimatedSpinner } from '../ui/AnimatedSpinner';
import { EnhancedTextInput } from '../ui/EnhancedTextInput';
import { useButtonAnimation } from '@/lib/animations/useButtonAnimation';
import { triggerLightHapticSync, triggerMediumHapticSync } from '@/lib/utils/haptics';
import { PlantTask } from '@/lib/models/PlantTask';
import { Plant } from '@/lib/models/Plant';
import { taskNotificationService } from '@/lib/services/taskNotificationService';
import { useNotifications } from '@/lib/hooks/useNotifications';
import type { TaskType } from '@/lib/types/taskTypes';

// Only allow these types for the notification form
type AllowedTaskType = 'watering' | 'feeding' | 'inspection' | 'pruning' | 'training' | 'harvest';
const allowedTaskTypes: AllowedTaskType[] = [
  'watering',
  'feeding',
  'inspection',
  'pruning',
  'training',
  'harvest',
];

// Notification permission status
type NotificationStatus = 'unknown' | 'granted' | 'denied' | 'undetermined';

// Form schema for creating task notifications
const taskNotificationSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  taskType: z.enum(['watering', 'feeding', 'inspection', 'pruning', 'training', 'harvest']),
  scheduledFor: z.date(),
  repeatInterval: z.number().min(1).optional(),
  addToCalendar: z.boolean(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  estimatedDuration: z.number().min(1).optional(),
});

type TaskNotificationFormData = z.infer<typeof taskNotificationSchema>;

interface TaskNotificationSchedulerProps {
  plant: Plant;
  onTaskCreated?: (task: PlantTask) => void;
  onClose?: () => void;
  initialTaskType?: TaskType;
  selectedDate?: Date;
}

interface CalendarPermissionStatus {
  status: 'unknown' | 'granted' | 'denied' | 'undetermined';
  canAskAgain: boolean;
}

const TaskNotificationScheduler: React.FC<TaskNotificationSchedulerProps> = ({
  plant,
  onTaskCreated,
  onClose,
  initialTaskType,
  selectedDate,
}) => {
  // Fallback to 'watering' if initialTaskType is not allowed or undefined
  const safeInitialTaskType: AllowedTaskType = initialTaskType && allowedTaskTypes.includes(initialTaskType as AllowedTaskType)
    ? (initialTaskType as AllowedTaskType)
    : 'watering';
  const { t } = useTranslation();
  const [isCreating, setIsCreating] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [calendarPermission, setCalendarPermission] = useState<CalendarPermissionStatus>({
    status: 'unknown',
    canAskAgain: true,
  });
  const { permissionStatus, scheduleNotification } = useNotifications();

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TaskNotificationFormData>({
    resolver: zodResolver(taskNotificationSchema),
    defaultValues: {
      taskType: safeInitialTaskType,
      scheduledFor: selectedDate || new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow or selected date
      addToCalendar: false,
      priority: 'medium',
      estimatedDuration: 15, // Default 15 minutes
    },
  });

  const watchedTaskType = watch('taskType');
  const watchedScheduledFor = watch('scheduledFor');

  // Check calendar permissions on mount
  useEffect(() => {
    const checkCalendarPermissions = async () => {
      try {
        const { status, canAskAgain } = await Calendar.getCalendarPermissionsAsync();
        setCalendarPermission({ status, canAskAgain });
      } catch (error) {
        console.error('Error checking calendar permissions:', error);
        setCalendarPermission({ status: 'denied', canAskAgain: false });
      }
    };

    checkCalendarPermissions();
  }, []);

  // Set default title when task type changes
  useEffect(() => {
    if (watchedTaskType) {
      setValue('title', getTaskTypeTitle(watchedTaskType));
    }
  }, [watchedTaskType, setValue]);

  const requestCalendarPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const { status, canAskAgain } = await Calendar.requestCalendarPermissionsAsync();
      setCalendarPermission({ status, canAskAgain });
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting calendar permissions:', error);
      setCalendarPermission({ status: 'denied', canAskAgain: false });
      return false;
    }
  }, []);

  const addToDeviceCalendar = useCallback(async (task: PlantTask): Promise<void> => {
    try {
      if (calendarPermission.status !== 'granted') {
        const granted = await requestCalendarPermissions();
        if (!granted) {
          throw new Error('Calendar permission not granted');
        }
      }

      // Get default calendar
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCalendar = calendars.find(cal => cal.isPrimary) || calendars[0];

      if (!defaultCalendar) {
        throw new Error('No calendar available');
      }

      // Create calendar event with task-focused details
      const eventDetails = {
        title: `🌱 ${plant.name} - ${task.title}`,
        startDate: new Date(task.dueDate),
        endDate: new Date(new Date(task.dueDate).getTime() + (task.estimatedDuration || 15) * 60 * 1000),
        notes: `${task.description || getTaskTypeDescription(task.taskType)}\n\nPlant: ${plant.name}\nStrain: ${plant.strain}\nPriority: ${task.priority || 'medium'}`,
        alarms: [{ relativeOffset: -15 }], // 15 minutes before
      };

      await Calendar.createEventAsync(defaultCalendar.id, eventDetails);
    } catch (error) {
      console.error('Error adding task to calendar:', error);
      throw error;
    }
  }, [calendarPermission.status, plant.name, plant.strain, requestCalendarPermissions]);

  const handleDateChange = useCallback((event: { type: string; nativeEvent: { timestamp: number; utcOffset: number } }, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate && watchedScheduledFor) {
      // Preserve the time from the current scheduled date
      const currentDate = watchedScheduledFor;
      if (currentDate) {
        const newDate = new Date(selectedDate);
        newDate.setHours(currentDate.getHours(), currentDate.getMinutes());
        setValue('scheduledFor', newDate);
      }
    }
  }, [setValue, watchedScheduledFor]);

  const handleTimeChange = useCallback((event: { type: string; nativeEvent: { timestamp: number; utcOffset: number } }, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime && watchedScheduledFor) {
      // Preserve the date from the current scheduled date
      const currentDate = watchedScheduledFor;
      if (currentDate) {
        const newDate = new Date(currentDate);
        newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
        setValue('scheduledFor', newDate);
      }
    }
  }, [setValue, watchedScheduledFor]);

  const getTaskTypeDescription = (taskType: string): string => {
    switch (taskType) {
      case 'watering':
        return t('taskNotifications.defaultDescriptions.watering');
      case 'feeding':
        return t('taskNotifications.defaultDescriptions.feeding');
      case 'inspection':
        return t('taskNotifications.defaultDescriptions.inspection');
      case 'pruning':
        return t('taskNotifications.defaultDescriptions.pruning');
      case 'training':
        return t('taskNotifications.defaultDescriptions.training');
      case 'harvest':
        return t('taskNotifications.defaultDescriptions.harvest');
      default:
        return t('taskNotifications.defaultDescriptions.custom');
    }
  };

  const getTaskTypeIcon = (taskType: string) => {
    switch (taskType) {
      case 'watering':
        return 'water-outline';
      case 'feeding':
        return 'nutrition-outline';
      case 'inspection':
        return 'search-outline';
      case 'pruning':
        return 'cut-outline';
      case 'training':
        return 'leaf-outline';
      case 'harvest':
        return 'leaf-outline';
      default:
        return 'checkmark-circle';
    }
  };

  const getTaskTypeTitle = (taskType: string): string => {
    switch (taskType) {
      case 'watering':
        return t('taskNotifications.types.watering');
      case 'feeding':
        return t('taskNotifications.types.feeding');
      case 'inspection':
        return t('taskNotifications.types.inspection');
      case 'pruning':
        return t('taskNotifications.types.pruning');
      case 'training':
        return t('taskNotifications.types.training');
      case 'harvest':
        return t('taskNotifications.types.harvest');
      default:
        return t('taskNotifications.types.custom');
    }
  };

  const onSubmit = useCallback(async (data: TaskNotificationFormData) => {
    if (permissionStatus !== 'granted') {
      Alert.alert(
        t('taskNotifications.permissionRequired'),
        t('taskNotifications.permissionRequiredDescription'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.settings'), onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
          }},
        ]
      );
      return;
    }

    setIsCreating(true);
    try {
      // Create task using service
      const task = await taskNotificationService.createTaskWithNotification({
        plantId: plant.id,
        taskType: data.taskType as TaskType,
        title: data.title,
        description: data.description,
        dueDate: data.scheduledFor,
        priority: data.priority || 'medium',
        estimatedDuration: data.estimatedDuration,
        repeatInterval: data.repeatInterval,
      });

      // Schedule notification with task-focused content
      await scheduleNotification({
        identifier: task.id,
        title: `🌱 ${plant.name} - ${task.title}`,
        body: `${task.description || getTaskTypeDescription(task.taskType)} • Priority: ${task.priority}${task.estimatedDuration ? ` • ~${task.estimatedDuration}min` : ''}`,
        data: {
          taskId: task.id,
          plantId: plant.id,
          taskType: task.taskType,
          priority: task.priority,
          navigateTo: 'calendar',
          selectedDate: data.scheduledFor.toISOString(),
        },
        scheduledFor: data.scheduledFor,
        repeatInterval: data.repeatInterval,
      });

      // Add to device calendar if requested
      if (data.addToCalendar) {
        try {
          await addToDeviceCalendar(task);
        } catch (calendarError) {
          console.warn('Failed to add task to calendar:', calendarError);
          // Don't fail the entire operation if calendar fails
          Alert.alert(
            t('common.warning'),
            t('taskNotifications.calendarWarning')
          );
        }
      }

      triggerMediumHapticSync();
      onTaskCreated?.(task);
      onClose?.();
    } catch (error) {
      console.error('Error creating task:', error);
      Alert.alert(
        t('taskNotifications.error'),
        t('taskNotifications.errorCreatingTask')
      );
    } finally {
      setIsCreating(false);
    }
  }, [permissionStatus, plant.id, plant.name, onTaskCreated, onClose, t, scheduleNotification, addToDeviceCalendar]);

  const createTaskAnimation = useButtonAnimation({
    enableHaptics: true,
    hapticStyle: 'medium',
    onPress: handleSubmit(onSubmit),
  });

  const cancelAnimation = useButtonAnimation({
    enableHaptics: true,
    hapticStyle: 'light',
    onPress: onClose,
  });

  const typeSelectionAnimation = useButtonAnimation({
    enableHaptics: true,
    hapticStyle: 'light',
  });

  if (permissionStatus === 'denied') {
    return (
      <ThemedView className="flex-1 items-center justify-center p-6">
        <OptimizedIcon
          name="notification"
          size={64}
          className="mb-4 text-neutral-400"
        />
        <ThemedText variant="heading" className="mb-2 text-center text-xl">
          {t('taskNotifications.permissionsDisabled')}
        </ThemedText>
        <ThemedText variant="muted" className="mb-6 text-center">
          {t('taskNotifications.permissionsDisabledDescription')}
        </ThemedText>
        
        <Animated.View style={createTaskAnimation.animatedStyle}>
          <Pressable
            {...createTaskAnimation.handlers}
            onPress={() => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            }}
          >
            <ThemedView className="flex-row items-center rounded-lg bg-primary-500 px-6 py-3">
              <OptimizedIcon name="settings" size={20} className="mr-2 text-white" />
              <ThemedText className="font-medium text-white">
                {t('taskNotifications.openSettings')}
              </ThemedText>
            </ThemedView>
          </Pressable>
        </Animated.View>
      </ThemedView>
    );
  }

  return (
    <ThemedView className="flex-1 p-4">
      {/* Header */}
      <ThemedView className="mb-6 flex-row items-center">
        <ThemedView className="mr-4 h-12 w-12 overflow-hidden rounded-lg">
          {plant.imageUrl ? (
            <Animated.Image
              source={{ uri: plant.imageUrl }}
              className="h-full w-full"
              resizeMode="cover"
            />
          ) : (
            <ThemedView className="h-full w-full items-center justify-center bg-neutral-200 dark:bg-neutral-700">
              <OptimizedIcon
                name="flower-tulip-outline"
                size={24}
                className="text-neutral-400"
              />
            </ThemedView>
          )}
        </ThemedView>
        <ThemedView className="flex-1">
          <ThemedText variant="heading" className="text-xl">
            {t('taskNotifications.createTask')}
          </ThemedText>
          <ThemedText variant="muted">
            {plant.name} • {plant.strain}
          </ThemedText>
        </ThemedView>
      </ThemedView>

      {/* Task Type Selection */}
      <ThemedView className="mb-6">
        <ThemedText variant="heading" className="mb-3 text-base">
          {t('taskNotifications.taskType')}
        </ThemedText>
        <ThemedView className="grid grid-cols-2 gap-2">
          {(['watering', 'feeding', 'inspection', 'pruning', 'training', 'harvest'] as const).map((type) => (
            <Controller
              key={type}
              control={control}
              name="taskType"
              render={({ field: { onChange, value } }) => (
                <Animated.View style={typeSelectionAnimation.animatedStyle}>
                  <Pressable
                    {...typeSelectionAnimation.handlers}
                    onPress={() => {
                      onChange(type);
                      setValue('title', getTaskTypeTitle(type));
                      triggerLightHapticSync();
                    }}
                  >
                    <ThemedView
                      className={`flex-row items-center rounded-lg border-2 p-3 ${
                        value === type
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800'
                      }`}
                    >
                      <OptimizedIcon
                        name={getTaskTypeIcon(type)}
                        size={20}
                        className={`mr-2 ${
                          value === type
                            ? 'text-primary-500'
                            : 'text-neutral-600 dark:text-neutral-400'
                        }`}
                      />
                      <ThemedText
                        className={`text-sm font-medium ${
                          value === type
                            ? 'text-primary-700 dark:text-primary-300'
                            : 'text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        {getTaskTypeTitle(type)}
                      </ThemedText>
                    </ThemedView>
                  </Pressable>
                </Animated.View>
              )}
            />
          ))}
        </ThemedView>
      </ThemedView>

      {/* Title Input */}
      <Controller
        control={control}
        name="title"
        render={({ field: { onChange, onBlur, value } }) => (
          <EnhancedTextInput
            label={t('taskNotifications.title')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={t('taskNotifications.titlePlaceholder')}
            error={errors.title?.message}
            leftIcon={getTaskTypeIcon(watchedTaskType || 'custom')}
            returnKeyType="next"
            className="mb-4"
          />
        )}
      />

      {/* Description Input */}
      <Controller
        control={control}
        name="description"
        render={({ field: { onChange, onBlur, value } }) => (
          <EnhancedTextInput
            label={t('taskNotifications.description')}
            value={value || ''}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={t('taskNotifications.descriptionPlaceholder')}
            error={errors.description?.message}
            leftIcon="document-text-outline"
            multiline
            showCharacterCount
            maxLength={200}
            returnKeyType="done"
            className="mb-4"
          />
        )}
      />

      {/* Priority and Duration Row */}
      <ThemedView className="mb-4 flex-row space-x-3">
        {/* Priority Selection */}
        <ThemedView className="flex-1">
          <ThemedText variant="heading" className="mb-2 text-base">
            {t('taskNotifications.priority')}
          </ThemedText>
          <Controller
            control={control}
            name="priority"
            render={({ field: { onChange, value } }) => (
              <ThemedView className="flex-row flex-wrap gap-1">
                {(['low', 'medium', 'high', 'critical'] as const).map((priority) => (
                  <Pressable
                    key={priority}
                    onPress={() => {
                      onChange(priority);
                      triggerLightHapticSync();
                    }}
                    className={`rounded-full border px-3 py-2 ${
                      value === priority
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-neutral-300 bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-700'
                    }`}
                  >
                    <ThemedText
                      className={`text-xs ${
                        value === priority
                          ? 'text-primary-700 dark:text-primary-300'
                          : 'text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      {t(`taskNotifications.priorities.${priority}`)}
                    </ThemedText>
                  </Pressable>
                ))}
              </ThemedView>
            )}
          />
        </ThemedView>

        {/* Estimated Duration */}
        <ThemedView className="flex-1">
          <Controller
            control={control}
            name="estimatedDuration"
            render={({ field: { onChange, onBlur, value } }) => (
              <EnhancedTextInput
                label={t('taskNotifications.estimatedDuration')}
                value={value?.toString() || ''}
                onChangeText={(text) => onChange(text ? parseInt(text, 10) : undefined)}
                onBlur={onBlur}
                placeholder="15"
                error={errors.estimatedDuration?.message}
                leftIcon="calendar"
                keyboardType="numeric"
                returnKeyType="done"
              />
            )}
          />
        </ThemedView>
      </ThemedView>

      {/* Scheduled Date/Time */}
      <ThemedView className="mb-4">
        <ThemedText variant="heading" className="mb-2 text-base">
          {t('taskNotifications.scheduledFor')}
        </ThemedText>
        <Controller
          control={control}
          name="scheduledFor"
          render={({ field: { value } }) => (
            <ThemedView className="space-y-2">
              {/* Date Picker Button */}
              <Pressable
                onPress={() => setShowDatePicker(true)}
                className="flex-row items-center rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800"
              >
                <OptimizedIcon
                  name="calendar-outline"
                  size={20}
                  className="mr-3 text-neutral-600 dark:text-neutral-400"
                />
                <ThemedText className="flex-1">
                  {value?.toLocaleDateString() || ''}
                </ThemedText>
                <OptimizedIcon
                  name="chevron-down"
                  size={16}
                  className="text-neutral-400"
                />
              </Pressable>

              {/* Time Picker Button */}
              <Pressable
                onPress={() => setShowTimePicker(true)}
                className="flex-row items-center rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800"
              >
                <OptimizedIcon
                  name="calendar"
                  size={20}
                  className="mr-3 text-neutral-600 dark:text-neutral-400"
                />
                <ThemedText className="flex-1">
                  {value?.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  }) || ''}
                </ThemedText>
                <OptimizedIcon
                  name="chevron-down"
                  size={16}
                  className="text-neutral-400"
                />
              </Pressable>
            </ThemedView>
          )}
        />

        {/* Date Picker Modal */}
        {showDatePicker && watchedScheduledFor && (
          <DateTimePicker
            testID="dateTimePicker"
            value={watchedScheduledFor}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}

        {/* Time Picker Modal */}
        {showTimePicker && watchedScheduledFor && (
          <DateTimePicker
            testID="dateTimePicker"
            value={watchedScheduledFor}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
          />
        )}
      </ThemedView>

      {/* Repeat Interval */}
      <ThemedView className="mb-4">
        <ThemedText variant="heading" className="mb-3 text-base">
          {t('taskNotifications.repeatOptions')}
        </ThemedText>
        
        {/* Quick Repeat Options */}
        <ThemedView className="mb-3 flex-row flex-wrap gap-2">
          {[
            { label: t('taskNotifications.repeatIntervals.daily'), days: 1 },
            { label: t('taskNotifications.repeatIntervals.every3Days'), days: 3 },
            { label: t('taskNotifications.repeatIntervals.weekly'), days: 7 },
            { label: t('taskNotifications.repeatIntervals.biweekly'), days: 14 },
            { label: t('taskNotifications.repeatIntervals.monthly'), days: 30 },
          ].map((option) => (
            <Controller
              key={option.days}
              control={control}
              name="repeatInterval"
              render={({ field: { onChange, value } }) => (
                <Pressable
                  onPress={() => {
                    onChange(value === option.days ? undefined : option.days);
                    triggerLightHapticSync();
                  }}
                  className={`rounded-full border px-3 py-2 ${
                    value === option.days
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-neutral-300 bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-700'
                  }`}
                >
                  <ThemedText
                    className={`text-sm ${
                      value === option.days
                        ? 'text-primary-700 dark:text-primary-300'
                        : 'text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    {option.label}
                  </ThemedText>
                </Pressable>
              )}
            />
          ))}
        </ThemedView>

        {/* Custom Repeat Interval */}
        <Controller
          control={control}
          name="repeatInterval"
          render={({ field: { onChange, onBlur, value } }) => (
            <EnhancedTextInput
              label={t('taskNotifications.customRepeatInterval')}
              value={value?.toString() || ''}
              onChangeText={(text) => onChange(text ? parseInt(text, 10) : undefined)}
              onBlur={onBlur}
              placeholder={t('taskNotifications.customRepeatIntervalPlaceholder')}
              error={errors.repeatInterval?.message}
              leftIcon="refresh"
              keyboardType="numeric"
              returnKeyType="done"
            />
          )}
        />
      </ThemedView>

      {/* Calendar Integration */}
      <ThemedView className="mb-6">
        <Controller
          control={control}
          name="addToCalendar"
          render={({ field: { onChange, value } }) => (
            <Pressable
              onPress={() => {
                onChange(!value);
                triggerLightHapticSync();
              }}
              className="flex-row items-center rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800"
            >
              <OptimizedIcon
                name={value ? 'checkmark-circle' : 'close-circle'}
                size={24}
                className={`mr-3 ${
                  value
                    ? 'text-primary-500'
                    : 'text-neutral-400'
                }`}
              />
              <ThemedView className="flex-1">
                <ThemedText className="font-medium">
                  {t('taskNotifications.addToDeviceCalendar')}
                </ThemedText>
                <ThemedText variant="muted" className="text-sm">
                  {calendarPermission.status === 'granted'
                    ? t('taskNotifications.calendarEventDescription')
                    : calendarPermission.status === 'denied'
                    ? t('taskNotifications.calendarAccessDenied')
                    : t('taskNotifications.calendarPermissionRequired')
                  }
                </ThemedText>
              </ThemedView>
            </Pressable>
          )}
        />
      </ThemedView>

      {/* Action Buttons */}
      <ThemedView className="flex-row space-x-3">
        <Animated.View style={cancelAnimation.animatedStyle} className="flex-1">
          <Pressable {...cancelAnimation.handlers}>
            <ThemedView className="flex-row items-center justify-center rounded-lg border border-neutral-300 bg-neutral-100 px-4 py-3 dark:border-neutral-600 dark:bg-neutral-700">
              <ThemedText className="font-medium text-neutral-700 dark:text-neutral-300">
                {t('common.cancel')}
              </ThemedText>
            </ThemedView>
          </Pressable>
        </Animated.View>

        <Animated.View style={createTaskAnimation.animatedStyle} className="flex-1">
          <Pressable {...createTaskAnimation.handlers} disabled={isCreating}>
            <ThemedView
              className={`flex-row items-center justify-center rounded-lg px-4 py-3 ${
                isCreating
                  ? 'bg-primary-300'
                  : 'bg-primary-500'
              }`}
            >
              {isCreating ? (
                <AnimatedSpinner size={20} className="mr-2" />
              ) : (
                <OptimizedIcon name="checkmark" size={20} className="mr-2 text-white" />
              )}
              <ThemedText className="font-medium text-white">
                {isCreating
                  ? t('taskNotifications.creating')
                  : t('taskNotifications.createTask')
                }
              </ThemedText>
            </ThemedView>
          </Pressable>
        </Animated.View>
      </ThemedView>
    </ThemedView>
  );
};

export default TaskNotificationScheduler;