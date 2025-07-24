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
import { CareReminder } from '@/lib/models/CareReminder';
import { Plant } from '@/lib/models/Plant';
import { careReminderService } from '@/lib/services/careReminderService';
import { useNotifications } from '@/lib/hooks/useNotifications';

// Notification permission status
type NotificationStatus = 'unknown' | 'granted' | 'denied' | 'undetermined';

// Form schema for creating reminders
const reminderSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  type: z.enum(['watering', 'nutrients', 'inspection', 'custom']),
  scheduledFor: z.date(),
  repeatInterval: z.number().min(1).optional(),
  addToCalendar: z.boolean(),
});

type ReminderFormData = z.infer<typeof reminderSchema>;

interface NotificationSchedulerProps {
  plant: Plant;
  onReminderCreated?: (reminder: CareReminder) => void;
  onClose?: () => void;
}

interface CalendarPermissionStatus {
  status: 'unknown' | 'granted' | 'denied' | 'undetermined';
  canAskAgain: boolean;
}

const NotificationScheduler: React.FC<NotificationSchedulerProps> = ({
  plant,
  onReminderCreated,
  onClose,
}) => {
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
  } = useForm<ReminderFormData>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      type: 'watering',
      scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      addToCalendar: false,
    },
  });

  const watchedType = watch('type') as 'watering' | 'nutrients' | 'inspection' | 'custom';
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

  const addToDeviceCalendar = useCallback(async (reminder: CareReminder): Promise<void> => {
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

      // Create calendar event
      const eventDetails = {
        title: `${plant.name} - ${reminder.title}`,
        startDate: reminder.scheduledFor,
        endDate: new Date(reminder.scheduledFor.getTime() + 30 * 60 * 1000), // 30 minutes duration
        notes: reminder.description || getDefaultDescription(reminder.type),
        alarms: [{ relativeOffset: -15 }], // 15 minutes before
      };

      await Calendar.createEventAsync(defaultCalendar.id, eventDetails);
    } catch (error) {
      console.error('Error adding to calendar:', error);
      throw error;
    }
  }, [calendarPermission.status, plant.name, requestCalendarPermissions]);

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



  const getDefaultDescription = (type: string): string => {
    switch (type) {
      case 'watering':
        return t('notificationScheduler.defaultDescriptions.watering');
      case 'nutrients':
        return t('notificationScheduler.defaultDescriptions.nutrients');
      case 'inspection':
        return t('notificationScheduler.defaultDescriptions.inspection');
      default:
        return t('notificationScheduler.defaultDescriptions.custom');
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

  const getTypeTitle = (type: string): string => {
    switch (type) {
      case 'watering':
        return t('notificationScheduler.types.watering');
      case 'nutrients':
        return t('notificationScheduler.types.nutrients');
      case 'inspection':
        return t('notificationScheduler.types.inspection');
      default:
        return t('notificationScheduler.types.custom');
    }
  };

  const onSubmit = useCallback(async (data: ReminderFormData) => {
    if (permissionStatus !== 'granted') {
      Alert.alert(
        t('notificationScheduler.permissionRequired'),
        t('notificationScheduler.permissionRequiredDescription'),
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
      // Create reminder using service
      const reminder = await careReminderService.createReminder({
        plantId: plant.id,
        type: data.type,
        title: data.title,
        description: data.description,
        scheduledFor: data.scheduledFor,
        repeatInterval: data.repeatInterval,
      });

      // Schedule notification
      await scheduleNotification({
        identifier: reminder.id,
        title: `${plant.name} - ${reminder.title}`,
        body: reminder.description || getDefaultDescription(reminder.type),
        data: {
          reminderId: reminder.id,
          plantId: plant.id,
          type: reminder.type,
        },
        scheduledFor: reminder.scheduledFor,
        repeatInterval: reminder.repeatInterval,
      });

      // Add to device calendar if requested
      if (data.addToCalendar) {
        try {
          await addToDeviceCalendar(reminder);
        } catch (calendarError) {
          console.warn('Failed to add to calendar:', calendarError);
          // Don't fail the entire operation if calendar fails
          Alert.alert(
            t('common.warning'),
            t('notificationScheduler.calendarWarning')
          );
        }
      }

      triggerMediumHapticSync();
      onReminderCreated?.(reminder);
      onClose?.();
    } catch (error) {
      console.error('Error creating reminder:', error);
      Alert.alert(
        t('notificationScheduler.error'),
        t('notificationScheduler.errorCreatingReminder')
      );
    } finally {
      setIsCreating(false);
    }
  }, [permissionStatus, plant.id, onReminderCreated, onClose, t, scheduleNotification, addToDeviceCalendar]);

  const createReminderAnimation = useButtonAnimation({
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
          {t('notificationScheduler.permissionsDisabled')}
        </ThemedText>
        <ThemedText variant="muted" className="mb-6 text-center">
          {t('notificationScheduler.permissionsDisabledDescription')}
        </ThemedText>
        
        <Animated.View style={createReminderAnimation.animatedStyle}>
          <Pressable
            {...createReminderAnimation.handlers}
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
                {t('notificationScheduler.openSettings')}
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
            {t('notificationScheduler.createReminder')}
          </ThemedText>
          <ThemedText variant="muted">
            {plant.name} • {plant.strain}
          </ThemedText>
        </ThemedView>
      </ThemedView>

      {/* Reminder Type Selection */}
      <ThemedView className="mb-6">
        <ThemedText variant="heading" className="mb-3 text-base">
          {t('notificationScheduler.reminderType')}
        </ThemedText>
        <ThemedView className="grid grid-cols-2 gap-2">
          {(['watering', 'nutrients', 'inspection', 'custom'] as const).map((type) => (
            <Controller
              key={type}
              control={control}
              name="type"
              render={({ field: { onChange, value } }) => (
                <Animated.View style={typeSelectionAnimation.animatedStyle}>
                  <Pressable
                    {...typeSelectionAnimation.handlers}
                    onPress={() => {
                      onChange(type);
                      setValue('title', getTypeTitle(type));
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
                        name={getTypeIcon(type)}
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
                        {getTypeTitle(type)}
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
            label={t('notificationScheduler.title')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={t('notificationScheduler.titlePlaceholder')}
            error={errors.title?.message}
            leftIcon={getTypeIcon(watchedType || 'custom')}
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
            label={t('notificationScheduler.description')}
            value={value || ''}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={t('notificationScheduler.descriptionPlaceholder')}
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

      {/* Scheduled Date/Time */}
      <ThemedView className="mb-4">
        <ThemedText variant="heading" className="mb-2 text-base">
          {t('notificationScheduler.scheduledFor')}
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
          {t('notificationScheduler.repeatOptions')}
        </ThemedText>
        
        {/* Quick Repeat Options */}
        <ThemedView className="mb-3 flex-row flex-wrap gap-2">
          {[
            { label: t('notificationScheduler.repeatIntervals.daily'), days: 1 },
            { label: t('notificationScheduler.repeatIntervals.every3Days'), days: 3 },
            { label: t('notificationScheduler.repeatIntervals.weekly'), days: 7 },
            { label: t('notificationScheduler.repeatIntervals.biweekly'), days: 14 },
            { label: t('notificationScheduler.repeatIntervals.monthly'), days: 30 },
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
              label={t('notificationScheduler.customRepeatInterval')}
              value={value?.toString() || ''}
              onChangeText={(text) => onChange(text ? parseInt(text, 10) : undefined)}
              onBlur={onBlur}
              placeholder={t('notificationScheduler.customRepeatIntervalPlaceholder')}
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
                  {t('notificationScheduler.addToDeviceCalendar')}
                </ThemedText>
                <ThemedText variant="muted" className="text-sm">
                  {calendarPermission.status === 'granted'
                    ? t('notificationScheduler.calendarEventDescription')
                    : calendarPermission.status === 'denied'
                    ? t('notificationScheduler.calendarAccessDenied')
                    : t('notificationScheduler.calendarPermissionRequired')
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

        <Animated.View style={createReminderAnimation.animatedStyle} className="flex-1">
          <Pressable {...createReminderAnimation.handlers} disabled={isCreating}>
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
                  ? t('notificationScheduler.creating')
                  : t('notificationScheduler.createReminder')
                }
              </ThemedText>
            </ThemedView>
          </Pressable>
        </Animated.View>
      </ThemedView>
    </ThemedView>
  );
};

export default NotificationScheduler;