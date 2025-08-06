import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '@/lib/utils/production-utils';
import { NotificationPreferences } from '@/components/live-notifications/NotificationPreferences';

const PREFERENCES_STORAGE_KEY = 'notification_preferences';

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

interface UseNotificationPreferencesReturn {
    preferences: NotificationPreferences;
    isLoading: boolean;
    error: string | null;
    updatePreferences: (preferences: NotificationPreferences) => Promise<void>;
    resetToDefaults: () => Promise<void>;
    isInQuietHours: (date?: Date) => boolean;
    isDoNotDisturbActive: (date?: Date) => boolean;
    shouldShowNotification: (type: keyof NotificationPreferences, priority?: 'low' | 'medium' | 'high' | 'critical') => boolean;
}

/**
 * Hook for managing notification preferences with persistence and validation
 */
export const useNotificationPreferences = (): UseNotificationPreferencesReturn => {
    const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load preferences from storage on mount
    useEffect(() => {
        loadPreferences();
    }, []);

    const loadPreferences = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const stored = await AsyncStorage.getItem(PREFERENCES_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);

                // Validate and merge with defaults to handle new preference keys
                const validatedPreferences = validateAndMergePreferences(parsed);
                setPreferences(validatedPreferences);

                Logger.info('Notification preferences loaded successfully');
            } else {
                // First time user - save defaults
                await savePreferences(DEFAULT_PREFERENCES);
                setPreferences(DEFAULT_PREFERENCES);
                Logger.info('Default notification preferences initialized');
            }
        } catch (error) {
            Logger.error('Failed to load notification preferences', { error });
            setError('Failed to load preferences');
            setPreferences(DEFAULT_PREFERENCES);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const savePreferences = useCallback(async (newPreferences: NotificationPreferences) => {
        try {
            // Convert Date objects to ISO strings for storage
            const serializable = {
                ...newPreferences,
                quietHoursStart: newPreferences.quietHoursStart.toISOString(),
                quietHoursEnd: newPreferences.quietHoursEnd.toISOString(),
            };

            await AsyncStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(serializable));
            Logger.info('Notification preferences saved successfully');
        } catch (error) {
            Logger.error('Failed to save notification preferences', { error });
            throw new Error('Failed to save preferences');
        }
    }, []);

    const updatePreferences = useCallback(async (newPreferences: NotificationPreferences) => {
        try {
            setError(null);

            // Validate preferences before saving
            const validatedPreferences = validateAndMergePreferences(newPreferences);

            await savePreferences(validatedPreferences);
            setPreferences(validatedPreferences);

            Logger.info('Notification preferences updated', {
                changes: getPreferenceChanges(preferences, validatedPreferences)
            });
        } catch (error) {
            Logger.error('Failed to update notification preferences', { error });
            setError('Failed to update preferences');
            throw error;
        }
    }, [preferences, savePreferences]);

    const resetToDefaults = useCallback(async () => {
        try {
            await updatePreferences(DEFAULT_PREFERENCES);
            Logger.info('Notification preferences reset to defaults');
        } catch (error) {
            Logger.error('Failed to reset notification preferences', { error });
            throw error;
        }
    }, [updatePreferences]);

    // Check if current time is within quiet hours
    const isInQuietHours = useCallback((date: Date = new Date()): boolean => {
        if (!preferences.enabled || !preferences.quietHoursEnabled) {
            return false;
        }

        const currentHour = date.getHours();
        const currentMinute = date.getMinutes();
        const currentTime = currentHour * 60 + currentMinute;

        const startHour = preferences.quietHoursStart.getHours();
        const startMinute = preferences.quietHoursStart.getMinutes();
        const startTime = startHour * 60 + startMinute;

        const endHour = preferences.quietHoursEnd.getHours();
        const endMinute = preferences.quietHoursEnd.getMinutes();
        const endTime = endHour * 60 + endMinute;

        // Handle overnight quiet hours (e.g., 10 PM to 8 AM)
        if (startTime > endTime) {
            return currentTime >= startTime || currentTime < endTime;
        } else {
            return currentTime >= startTime && currentTime < endTime;
        }
    }, [preferences]);

    // Check if do not disturb is active
    const isDoNotDisturbActive = useCallback((date: Date = new Date()): boolean => {
        if (!preferences.enabled || !preferences.doNotDisturbEnabled) {
            return false;
        }

        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const currentDay = dayNames[date.getDay()];

        return currentDay ? preferences.doNotDisturbDays.includes(currentDay) : false;
    }, [preferences]);

    // Determine if a notification should be shown based on preferences
    const shouldShowNotification = useCallback((
        type: keyof NotificationPreferences,
        priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
    ): boolean => {
        // Master toggle check
        if (!preferences.enabled) {
            return false;
        }

        // Critical notifications can override most settings
        if (priority === 'critical' && preferences.allowCriticalOverride) {
            return true;
        }

        // Check if this notification type is enabled
        const typeEnabled = preferences[type] as boolean;
        if (!typeEnabled) {
            return false;
        }

        // Priority-only mode check
        if (preferences.priorityNotificationsOnly && priority === 'low') {
            return false;
        }

        // Do not disturb check
        if (isDoNotDisturbActive()) {
            return priority === 'critical' && preferences.allowCriticalOverride;
        }

        // Quiet hours check
        if (isInQuietHours()) {
            return priority === 'critical' && preferences.allowCriticalOverride;
        }

        return true;
    }, [preferences, isInQuietHours, isDoNotDisturbActive]);

    return {
        preferences,
        isLoading,
        error,
        updatePreferences,
        resetToDefaults,
        isInQuietHours,
        isDoNotDisturbActive,
        shouldShowNotification,
    };
};

// Helper function to validate and merge preferences with defaults
function validateAndMergePreferences(stored: any): NotificationPreferences {
    const merged = { ...DEFAULT_PREFERENCES };

    // Merge boolean preferences
    const booleanKeys: (keyof NotificationPreferences)[] = [
        'enabled', 'messageNotifications', 'mentionNotifications', 'followNotifications',
        'communityNotifications', 'liveEventNotifications', 'achievementNotifications',
        'quietHoursEnabled', 'batchingEnabled', 'doNotDisturbEnabled',
        'priorityNotificationsOnly', 'allowCriticalOverride'
    ];

    booleanKeys.forEach(key => {
        if (typeof stored[key] === 'boolean') {
            (merged as any)[key] = stored[key];
        }
    });

    // Merge numeric preferences
    if (typeof stored.batchingWindow === 'number' && stored.batchingWindow > 0) {
        merged.batchingWindow = Math.min(stored.batchingWindow, 60); // Max 60 minutes
    }

    if (typeof stored.maxBatchSize === 'number' && stored.maxBatchSize > 0) {
        merged.maxBatchSize = Math.min(stored.maxBatchSize, 20); // Max 20 notifications
    }

    // Merge array preferences
    if (Array.isArray(stored.doNotDisturbDays)) {
        const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        merged.doNotDisturbDays = stored.doNotDisturbDays.filter((day: string) => validDays.includes(day));
    }

    // Merge date preferences
    try {
        if (stored.quietHoursStart) {
            const startDate = new Date(stored.quietHoursStart);
            if (!isNaN(startDate.getTime())) {
                merged.quietHoursStart = startDate;
            }
        }

        if (stored.quietHoursEnd) {
            const endDate = new Date(stored.quietHoursEnd);
            if (!isNaN(endDate.getTime())) {
                merged.quietHoursEnd = endDate;
            }
        }
    } catch (error) {
        Logger.warn('Invalid date format in stored preferences, using defaults');
    }

    return merged;
}

// Helper function to get changes between preferences
function getPreferenceChanges(
    oldPrefs: NotificationPreferences,
    newPrefs: NotificationPreferences
): Record<string, { from: any; to: any }> {
    const changes: Record<string, { from: any; to: any }> = {};

    Object.keys(newPrefs).forEach(key => {
        const oldValue = oldPrefs[key as keyof NotificationPreferences];
        const newValue = newPrefs[key as keyof NotificationPreferences];

        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            changes[key] = { from: oldValue, to: newValue };
        }
    });

    return changes;
}
