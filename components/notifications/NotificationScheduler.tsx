import React, { useState, useCallback, useEffect } from 'react';
import { Alert, Platform, Pressable, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Animated from 'react-native-reanimated';

import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';
import { OptimizedIcon } from '../ui/OptimizedIcon';
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
});

type ReminderFormData = z.infer<typeof reminderSchema>;

interface NotificationSchedulerProps {
  plant: Plant;
  onReminderCreated?: (reminder: CareReminder) => void;
  onClose?: () => void;
}

const NotificationScheduler: React.FC<NotificationSchedulerProps> = ({
  plant,
  onReminderCreated,
  onClose,
}) => {
  const { t } = useTranslation();
  const [isCreating, setIsCreating] = useState(false);
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
    },
  });

  const watchedType = watch('type');



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
      });

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
  }, [permissionStatus, plant.id, onReminderCreated, onClose, t, scheduleNotification]);

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
            leftIcon={getTypeIcon(watchedType)}
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
          render={({ field: { onChange, value } }) => (
            <ThemedView className="flex-row items-center rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800">
              <OptimizedIcon
                name="calendar-outline"
                size={20}
                className="mr-3 text-neutral-600 dark:text-neutral-400"
              />
              <ThemedText className="flex-1">
                {value.toLocaleDateString()} at {value.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </ThemedText>
              {/* TODO: Add date/time picker */}
            </ThemedView>
          )}
        />
      </ThemedView>

      {/* Repeat Interval */}
      <Controller
        control={control}
        name="repeatInterval"
        render={({ field: { onChange, onBlur, value } }) => (
          <EnhancedTextInput
            label={t('notificationScheduler.repeatInterval')}
            value={value?.toString() || ''}
            onChangeText={(text) => onChange(text ? parseInt(text, 10) : undefined)}
            onBlur={onBlur}
            placeholder={t('notificationScheduler.repeatIntervalPlaceholder')}
            error={errors.repeatInterval?.message}
            leftIcon="refresh"
            keyboardType="numeric"
            returnKeyType="done"
            className="mb-6"
          />
        )}
      />

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
                <OptimizedIcon name="loading1" size={20} className="mr-2 text-white" />
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