import React, { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, Switch, Alert, TouchableOpacity } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    FadeIn,
    SlideInRight,
} from 'react-native-reanimated';

import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';
import SegmentedControl, { SegmentedControlOption } from '../ui/SegmentedControl';
import TagPill from '../ui/TagPill';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import { triggerLightHaptic, triggerSelectionHaptic, triggerLightHapticSync } from '@/lib/utils/haptics';
import { Logger } from '@/lib/utils/production-utils';

// Types for notification preferences
export interface NotificationPreferences {
    // General settings
    enabled: boolean;

    // Notification types
    messageNotifications: boolean;
    mentionNotifications: boolean;
    followNotifications: boolean;
    communityNotifications: boolean;
    liveEventNotifications: boolean;
    achievementNotifications: boolean;

    // Quiet hours
    quietHoursEnabled: boolean;
    quietHoursStart: Date;
    quietHoursEnd: Date;

    // Frequency and batching
    batchingEnabled: boolean;
    batchingWindow: number; // minutes
    maxBatchSize: number;

    // Do not disturb
    doNotDisturbEnabled: boolean;
    doNotDisturbDays: string[]; // ['monday', 'tuesday', etc.]

    // Priority settings
    priorityNotificationsOnly: boolean;
    allowCriticalOverride: boolean;
}

interface NotificationPreferencesProps {
    preferences: NotificationPreferences;
    onPreferencesChange: (preferences: NotificationPreferences) => void;
    onSave?: () => Promise<void>;
    isLoading?: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
    enabled: true,
    messageNotifications: true,
    mentionNotifications: true,
    followNotifications: true,
    communityNotifications: true,
    liveEventNotifications: true,
    achievementNotifications: true,
    quietHoursEnabled: true,
    quietHoursStart: (() => {
        const now = new Date();
        const start = new Date(now);
        start.setHours(22, 0, 0, 0); // Today at 22:00
        return start;
    })(),
    quietHoursEnd: (() => {
        const now = new Date();
        const end = new Date(now);
        end.setHours(8, 0, 0, 0); // Today at 08:00
        return end;
    })(),
    batchingEnabled: true,
    batchingWindow: 15,
    maxBatchSize: 5,
    doNotDisturbEnabled: false,
    doNotDisturbDays: [],
    priorityNotificationsOnly: false,
    allowCriticalOverride: true,
};

const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({
    preferences = DEFAULT_PREFERENCES,
    onPreferencesChange,
    onSave,
    isLoading = false,
}) => {
    const { t } = useTranslation();
    const [showStartTimePicker, setShowStartTimePicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Animation values
    const fadeOpacity = useSharedValue(preferences.enabled ? 1 : 0.5);

    // Update animation when enabled state changes
    useEffect(() => {
        fadeOpacity.value = withSpring(preferences.enabled ? 1 : 0.5, {
            damping: 20,
            stiffness: 300,
        });
    }, [preferences.enabled, fadeOpacity]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: fadeOpacity.value,
    }));

    // Handle preference updates
    const updatePreference = useCallback(
        <K extends keyof NotificationPreferences>(
            key: K,
            value: NotificationPreferences[K]
        ) => {
            const updatedPreferences = { ...preferences, [key]: value };
            onPreferencesChange(updatedPreferences);
            setHasUnsavedChanges(true);
            triggerSelectionHaptic();

            Logger.info('Notification preference updated', { key, value });
        },
        [preferences, onPreferencesChange]
    );

    // Frequency options for segmented control
    const frequencyOptions: SegmentedControlOption[] = [
        {
            key: 'instant',
            label: t('notifications.preferences.instant', 'Instant'),
            icon: 'flash',
            color: 'text-blue-500',
        },
        {
            key: 'batched',
            label: t('notifications.preferences.batched', 'Batched'),
            icon: 'archive',
            color: 'text-green-500',
        },
        {
            key: 'priority',
            label: t('notifications.preferences.priority_only', 'Priority Only'),
            icon: 'star',
            color: 'text-orange-500',
        },
    ];

    const getCurrentFrequencyKey = useCallback(() => {
        if (preferences.priorityNotificationsOnly) return 'priority';
        if (preferences.batchingEnabled) return 'batched';
        return 'instant';
    }, [preferences.priorityNotificationsOnly, preferences.batchingEnabled]);

    const handleFrequencyChange = useCallback(
        (key: string) => {
            switch (key) {
                case 'instant':
                    updatePreference('batchingEnabled', false);
                    updatePreference('priorityNotificationsOnly', false);
                    break;
                case 'batched':
                    updatePreference('batchingEnabled', true);
                    updatePreference('priorityNotificationsOnly', false);
                    break;
                case 'priority':
                    updatePreference('batchingEnabled', false);
                    updatePreference('priorityNotificationsOnly', true);
                    break;
            }
        },
        [updatePreference]
    );

    // Days of week for do not disturb
    const daysOfWeek = [
        { key: 'monday', label: t('common.days.monday', 'Mon') },
        { key: 'tuesday', label: t('common.days.tuesday', 'Tue') },
        { key: 'wednesday', label: t('common.days.wednesday', 'Wed') },
        { key: 'thursday', label: t('common.days.thursday', 'Thu') },
        { key: 'friday', label: t('common.days.friday', 'Fri') },
        { key: 'saturday', label: t('common.days.saturday', 'Sat') },
        { key: 'sunday', label: t('common.days.sunday', 'Sun') },
    ];

    const handleDayToggle = useCallback(
        (day: string) => {
            const currentDays = preferences.doNotDisturbDays;
            const updatedDays = currentDays.includes(day)
                ? currentDays.filter(d => d !== day)
                : [...currentDays, day];

            updatePreference('doNotDisturbDays', updatedDays);
        },
        [preferences.doNotDisturbDays, updatePreference]
    );

    // Time picker handlers
    const handleStartTimeChange = useCallback(
        (event: any, selectedTime?: Date) => {
            setShowStartTimePicker(false);
            if (selectedTime && event.type === 'set') {
                updatePreference('quietHoursStart', selectedTime);
            }
        },
        [updatePreference]
    );

    const handleEndTimeChange = useCallback(
        (event: any, selectedTime?: Date) => {
            setShowEndTimePicker(false);
            if (selectedTime && event.type === 'set') {
                updatePreference('quietHoursEnd', selectedTime);
            }
        },
        [updatePreference]
    );

    // Format time for display
    const formatTime = useCallback((date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, []);

    // Save handler
    const handleSave = useCallback(async () => {
        if (onSave) {
            try {
                await onSave();
                setHasUnsavedChanges(false);
                await triggerLightHaptic();

                Alert.alert(
                    t('notifications.preferences.saved_title', 'Preferences Saved'),
                    t('notifications.preferences.saved_message', 'Your notification preferences have been updated.'),
                    [{ text: t('common.ok', 'OK') }]
                );
            } catch (error) {
                Logger.error('Failed to save notification preferences', { error });
                Alert.alert(
                    t('common.error', 'Error'),
                    t('notifications.preferences.save_error', 'Failed to save preferences. Please try again.'),
                    [{ text: t('common.ok', 'OK') }]
                );
            }
        }
    }, [onSave, t, hasUnsavedChanges]);

    return (
        <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeIn.duration(600)} className="p-4">

                    {/* Header */}
                    <ThemedView className="mb-6">
                        <ThemedText variant="heading" className="text-2xl mb-2">
                            {t('notifications.preferences.title', 'Notification Preferences')}
                        </ThemedText>
                        <ThemedText variant="muted" className="text-base">
                            {t('notifications.preferences.subtitle', 'Customize how and when you receive notifications')}
                        </ThemedText>
                    </ThemedView>

                    {/* Master Toggle */}
                    <Animated.View entering={SlideInRight.delay(100).duration(500)}>
                        <ThemedView variant="card" className="p-4 mb-4">
                            <View className="flex-row items-center justify-between">
                                <View className="flex-1 mr-4">
                                    <ThemedText className="text-lg font-semibold mb-1">
                                        {t('notifications.preferences.enable_notifications', 'Enable Notifications')}
                                    </ThemedText>
                                    <ThemedText variant="muted" className="text-sm">
                                        {t('notifications.preferences.enable_description', 'Turn all notifications on or off')}
                                    </ThemedText>
                                </View>
                                <Switch
                                    value={preferences.enabled}
                                    onValueChange={(value) => updatePreference('enabled', value)}
                                    trackColor={{ false: '#d1d5db', true: '#10b981' }}
                                    thumbColor={preferences.enabled ? '#ffffff' : '#f3f4f6'}
                                    accessibilityLabel={t('notifications.preferences.enable_notifications', 'Enable Notifications')}
                                />
                            </View>
                        </ThemedView>
                    </Animated.View>

                    {/* Notification Types */}
                    <Animated.View
                        entering={SlideInRight.delay(200).duration(500)}
                        style={animatedStyle}
                    >
                        <ThemedView variant="card" className="p-4 mb-4">
                            <ThemedText className="text-lg font-semibold mb-4">
                                {t('notifications.preferences.notification_types', 'Notification Types')}
                            </ThemedText>

                            {[
                                {
                                    key: 'messageNotifications',
                                    title: t('notifications.types.messages', 'Messages'),
                                    description: t('notifications.types.messages_desc', 'Direct messages and group chats'),
                                    icon: 'chatbubble',
                                },
                                {
                                    key: 'mentionNotifications',
                                    title: t('notifications.types.mentions', 'Mentions'),
                                    description: t('notifications.types.mentions_desc', 'When someone mentions you'),
                                    icon: 'at',
                                },
                                {
                                    key: 'followNotifications',
                                    title: t('notifications.types.follows', 'Follows'),
                                    description: t('notifications.types.follows_desc', 'New followers and follow activity'),
                                    icon: 'person-add',
                                },
                                {
                                    key: 'communityNotifications',
                                    title: t('notifications.types.community', 'Community'),
                                    description: t('notifications.types.community_desc', 'Posts, comments, and community activity'),
                                    icon: 'people',
                                },
                                {
                                    key: 'liveEventNotifications',
                                    title: t('notifications.types.live_events', 'Live Events'),
                                    description: t('notifications.types.live_events_desc', 'Live discussions and events'),
                                    icon: 'radio',
                                },
                                {
                                    key: 'achievementNotifications',
                                    title: t('notifications.types.achievements', 'Achievements'),
                                    description: t('notifications.types.achievements_desc', 'Badges and milestones'),
                                    icon: 'trophy',
                                },
                            ].map((item) => {
                                const prefValue = preferences[item.key as keyof NotificationPreferences];
                                const isEnabled = typeof prefValue === 'boolean' ? prefValue : false;

                                return (
                                    <View key={item.key} className="flex-row items-center justify-between py-3">
                                        <View className="flex-row items-center flex-1 mr-4">
                                            <OptimizedIcon
                                                name={item.icon as any}
                                                size={20}
                                                className="text-primary-500 mr-3"
                                            />
                                            <View className="flex-1">
                                                <ThemedText className="font-medium mb-1">
                                                    {item.title}
                                                </ThemedText>
                                                <ThemedText variant="muted" className="text-xs">
                                                    {item.description}
                                                </ThemedText>
                                            </View>
                                        </View>
                                        <Switch
                                            value={isEnabled}
                                            onValueChange={(value) => updatePreference(item.key as keyof NotificationPreferences, value)}
                                            trackColor={{ false: '#d1d5db', true: '#10b981' }}
                                            thumbColor={isEnabled ? '#ffffff' : '#f3f4f6'}
                                            disabled={!preferences.enabled}
                                            accessibilityRole="switch"
                                            accessibilityLabel={`${t('notifications.preferences.toggle', 'Toggle')} ${item.title}`}
                                            accessibilityHint={t('notifications.preferences.switch_hint', 'Double tap to toggle this notification type')}
                                        />
                                    </View>
                                );
                            })}
                        </ThemedView>
                    </Animated.View>

                    {/* Frequency Control */}
                    <Animated.View
                        entering={SlideInRight.delay(300).duration(500)}
                        style={animatedStyle}
                    >
                        <ThemedView variant="card" className="p-4 mb-4">
                            <ThemedText className="text-lg font-semibold mb-2">
                                {t('notifications.preferences.frequency', 'Notification Frequency')}
                            </ThemedText>
                            <ThemedText variant="muted" className="text-sm mb-4">
                                {t('notifications.preferences.frequency_desc', 'Choose how often you receive notifications')}
                            </ThemedText>

                            <SegmentedControl
                                options={frequencyOptions}
                                selectedKey={getCurrentFrequencyKey()}
                                onSelectionChange={handleFrequencyChange}
                                className="mb-4"
                            />

                            {preferences.batchingEnabled && (
                                <View className="mt-4 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                                    <ThemedText className="font-medium mb-2">
                                        {t('notifications.preferences.batching_settings', 'Batching Settings')}
                                    </ThemedText>
                                    <View className="flex-row items-center justify-between mb-2">
                                        <ThemedText variant="muted" className="text-sm">
                                            {t('notifications.preferences.batch_window', 'Batch Window')}
                                        </ThemedText>
                                        <ThemedText className="font-medium">
                                            {preferences.batchingWindow} {t('common.minutes', 'minutes')}
                                        </ThemedText>
                                    </View>
                                    <View className="flex-row items-center justify-between">
                                        <ThemedText variant="muted" className="text-sm">
                                            {t('notifications.preferences.max_batch_size', 'Max Batch Size')}
                                        </ThemedText>
                                        <ThemedText className="font-medium">
                                            {preferences.maxBatchSize} {t('notifications.preferences.notifications', 'notifications')}
                                        </ThemedText>
                                    </View>
                                </View>
                            )}
                        </ThemedView>
                    </Animated.View>

                    {/* Quiet Hours */}
                    <Animated.View
                        entering={SlideInRight.delay(400).duration(500)}
                        style={animatedStyle}
                    >
                        <ThemedView variant="card" className="p-4 mb-4">
                            <View className="flex-row items-center justify-between mb-4">
                                <View className="flex-1 mr-4">
                                    <ThemedText className="text-lg font-semibold mb-1">
                                        {t('notifications.preferences.quiet_hours', 'Quiet Hours')}
                                    </ThemedText>
                                    <ThemedText variant="muted" className="text-sm">
                                        {t('notifications.preferences.quiet_hours_desc', 'Pause notifications during specific hours')}
                                    </ThemedText>
                                </View>
                                <Switch
                                    value={preferences.quietHoursEnabled}
                                    onValueChange={(value) => updatePreference('quietHoursEnabled', value)}
                                    trackColor={{ false: '#d1d5db', true: '#10b981' }}
                                    thumbColor={preferences.quietHoursEnabled ? '#ffffff' : '#f3f4f6'}
                                    disabled={!preferences.enabled}
                                    accessibilityLabel={t('notifications.preferences.quiet_hours_toggle', 'Enable Quiet Hours')}
                                />
                            </View>

{preferences.quietHoursEnabled && (
                                <View>
                                    <View className="flex-row items-center justify-between mb-3">
                                        <ThemedText className="font-medium">
                                            {t('notifications.preferences.start_time', 'Start Time')}
                                        </ThemedText>
                                        <TouchableOpacity
                                            onPress={() => setShowStartTimePicker(true)}
                                            className="bg-neutral-100 dark:bg-neutral-700 px-3 py-2 rounded-lg"
                                        >
                                            <ThemedText className="font-medium">
                                                {formatTime(preferences.quietHoursStart)}
                                            </ThemedText>
                                        </TouchableOpacity>
                                    </View>

                                    <View className="flex-row items-center justify-between">
                                        <ThemedText className="font-medium">
                                            {t('notifications.preferences.end_time', 'End Time')}
                                        </ThemedText>
                                        <TouchableOpacity
                                            onPress={() => setShowEndTimePicker(true)}
                                            className="bg-neutral-100 dark:bg-neutral-700 px-3 py-2 rounded-lg"
                                        >
                                            <ThemedText className="font-medium">
                                                {formatTime(preferences.quietHoursEnd)}
                                            </ThemedText>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </ThemedView>
                    </Animated.View>

                    {/* Do Not Disturb */}
                    <Animated.View
                        entering={SlideInRight.delay(500).duration(500)}
                        style={animatedStyle}
                    >
                        <ThemedView variant="card" className="p-4 mb-4">
                            <View className="flex-row items-center justify-between mb-4">
                                <View className="flex-1 mr-4">
                                    <ThemedText className="text-lg font-semibold mb-1">
                                        {t('notifications.preferences.do_not_disturb', 'Do Not Disturb')}
                                    </ThemedText>
                                    <ThemedText variant="muted" className="text-sm">
                                        {t('notifications.preferences.do_not_disturb_desc', 'Disable notifications on specific days')}
                                    </ThemedText>
                                </View>
                                <Switch
                                    value={preferences.doNotDisturbEnabled}
                                    onValueChange={(value) => updatePreference('doNotDisturbEnabled', value)}
                                    trackColor={{ false: '#d1d5db', true: '#10b981' }}
                                    thumbColor={preferences.doNotDisturbEnabled ? '#ffffff' : '#f3f4f6'}
                                    disabled={!preferences.enabled}
                                    accessibilityLabel={t('notifications.preferences.dnd_toggle', 'Enable Do Not Disturb')}
                                />
                            </View>

                            {preferences.doNotDisturbEnabled && (
                                <View>
                                    <ThemedText className="font-medium mb-3">
                                        {t('notifications.preferences.select_days', 'Select Days')}
                                    </ThemedText>
                                    <View className="flex-row flex-wrap">
                                        {daysOfWeek.map((day) => (
                                            <TagPill
                                                key={day.key}
                                                text={day.label}
                                                selected={preferences.doNotDisturbDays.includes(day.key)}
                                                onPress={() => handleDayToggle(day.key)}
                                                variant="neutral"
                                                size="small"
                                                className="mb-2"
                                            />
                                        ))}
                                    </View>
                                </View>
                            )}
                        </ThemedView>
                    </Animated.View>

                    {/* Advanced Settings */}
                    <Animated.View
                        entering={SlideInRight.delay(600).duration(500)}
                        style={animatedStyle}
                    >
                        <ThemedView variant="card" className="p-4 mb-6">
                            <ThemedText className="text-lg font-semibold mb-4">
                                {t('notifications.preferences.advanced', 'Advanced Settings')}
                            </ThemedText>

                            <View className="flex-row items-center justify-between py-3">
                                <View className="flex-1 mr-4">
                                    <ThemedText className="font-medium mb-1">
                                        {t('notifications.preferences.critical_override', 'Allow Critical Override')}
                                    </ThemedText>
                                    <ThemedText variant="muted" className="text-xs">
                                        {t('notifications.preferences.critical_override_desc', 'Critical notifications bypass quiet hours and do not disturb')}
                                    </ThemedText>
                                </View>
                                <Switch
                                    value={preferences.allowCriticalOverride}
                                    onValueChange={(value) => updatePreference('allowCriticalOverride', value)}
                                    trackColor={{ false: '#d1d5db', true: '#10b981' }}
                                    thumbColor={preferences.allowCriticalOverride ? '#ffffff' : '#f3f4f6'}
                                    disabled={!preferences.enabled}
                                    accessibilityLabel={t('notifications.preferences.critical_override_toggle', 'Allow Critical Override')}
                                />
                            </View>
                        </ThemedView>
                    </Animated.View>

                    {/* Save Button */}
                    {onSave && hasUnsavedChanges && (
                        <Animated.View entering={SlideInRight.delay(700).duration(500)}>
                            <TouchableOpacity
                                onPress={handleSave}
                                disabled={isLoading}
                                className="bg-primary-500 rounded-xl p-4 mb-6"
                            >
                                <ThemedText className="text-white text-center font-semibold text-lg">
                                    {isLoading
                                        ? t('common.saving', 'Saving...')
                                        : t('notifications.preferences.save', 'Save Preferences')
                                    }
                                </ThemedText>
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                </Animated.View>
            </ScrollView>

            {/* Time Pickers */}
            {showStartTimePicker && (
                <DateTimePicker
                    value={preferences.quietHoursStart}
                    mode="time"
                    display="default"
                    onChange={handleStartTimeChange}
                />
            )}

            {showEndTimePicker && (
                <DateTimePicker
                    value={preferences.quietHoursEnd}
                    mode="time"
                    display="default"
                    onChange={handleEndTimeChange}
                />
            )}
        </SafeAreaView>
    );
};

export default NotificationPreferences;
