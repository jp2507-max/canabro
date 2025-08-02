/**
 * LiveNotificationCenter Component
 * 
 * Real-time notification center for community alerts with enhanced 2025 features:
 * - FlashList virtualization for large notification histories
 * - Supabase Realtime v2 with automatic reconnection
 * - Message batching and rate limiting protection (100 msgs/sec)
 * - Smooth scroll animations with useScrollAnimation
 * - Offline-first architecture with WatermelonDB sync
 * - Intelligent notification grouping and batching
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Alert, RefreshControl, Pressable, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Q } from '@nozbe/watermelondb';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
} from 'react-native-reanimated';

// Core UI Components
import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import { FlashListWrapper } from '../ui/FlashListWrapper';
import NetworkResilientImage from '../ui/NetworkResilientImage';
import { AnimatedSpinner } from '../ui/AnimatedSpinner';
import { NotificationBadge } from '../ui/NotificationBadge';

// Animation Hooks
import { useButtonAnimation } from '@/lib/animations/useButtonAnimation';
import { useCardAnimation } from '@/lib/animations/useCardAnimation';
import { useScrollAnimation } from '@/lib/animations/useScrollAnimation';
import { useAnimationCleanup } from '@/lib/animations/useAnimationCleanup';

// Utilities
import { triggerLightHapticSync, triggerMediumHapticSync, triggerHeavyHapticSync } from '@/lib/utils/haptics';
import { log } from '@/lib/utils/logger';
import { format } from '@/lib/utils/date';

/* Server state via TanStack Query */
import { useQueryClient } from '@tanstack/react-query';
import { useNotificationQueries } from '@/lib/hooks/useNotificationQueries';
import { useGroupedNotifications } from '@/lib/hooks/useGroupedNotifications';
import { useRealtimeNotifications } from '@/lib/hooks/useRealtimeNotifications';

// Models and Services
import { LiveNotification, NotificationPriority, NOTIFICATION_PRIORITIES } from '@/lib/models/LiveNotification';
import { database } from '@/lib/models';
import supabase from '@/lib/supabase';
import BatchActionControls from './BatchActionControls';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');

interface NotificationItemProps {
    notification: LiveNotification;
    onPress: (notification: LiveNotification) => void;
    onAction: (notification: LiveNotification, actionId: string) => void;
    onMarkRead: (notification: LiveNotification) => void;
    onDismiss: (notification: LiveNotification) => void;
    isSelected?: boolean;
    showSelection?: boolean;
}

/**
 * Individual notification item component with animations
 */
const NotificationItem: React.FC<NotificationItemProps> = ({
    notification,
    onPress,
    onAction,
    onMarkRead,
    onDismiss,
    isSelected = false,
    showSelection = false,
}) => {
    const { t } = useTranslation();
    const opacity = useSharedValue(1);
    const translateX = useSharedValue(0);
    const scale = useSharedValue(1);

    // Card animation for press interactions
    const { animatedStyle: cardAnimatedStyle, handlers: cardHandlers } = useCardAnimation({
        enableHaptics: true,
        hapticStyle: 'light',
        onPress: () => onPress(notification),
    });

    // Mark as read animation
    const { animatedStyle: markReadStyle, handlers: markReadHandlers } = useButtonAnimation({
        enableHaptics: true,
        hapticStyle: 'medium',
        onPress: () => onMarkRead(notification),
    });

    // Dismiss animation
    const { animatedStyle: dismissStyle, handlers: dismissHandlers } = useButtonAnimation({
        enableHaptics: true,
        hapticStyle: 'light',
        onPress: () => onDismiss(notification),
    });

    // Cleanup animations on unmount
    useAnimationCleanup({
        sharedValues: [opacity, translateX, scale],
    });

    // Animate item entrance
    useEffect(() => {
        opacity.value = withTiming(1, { duration: 300 });
        scale.value = withSpring(1, { damping: 15, stiffness: 150 });
    }, [opacity, scale]);

    // Animate item removal
    const animateRemoval = useCallback(() => {
        opacity.value = withTiming(0, { duration: 200 });
        translateX.value = withTiming(-WINDOW_HEIGHT, { duration: 300 });
        scale.value = withTiming(0.8, { duration: 200 });
    }, [opacity, translateX, scale]);

    // Item container animated style
    const itemAnimatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [
            { translateX: translateX.value },
            { scale: scale.value },
        ],
    }));

    // Get priority styling
    const getPriorityStyles = (priority: NotificationPriority) => {
        switch (priority) {
            case NOTIFICATION_PRIORITIES.URGENT:
                return {
                    borderColor: 'border-l-status-danger',
                    backgroundColor: 'bg-status-danger/5',
                    textColor: 'text-status-danger',
                };
            case NOTIFICATION_PRIORITIES.HIGH:
                return {
                    borderColor: 'border-l-status-warning',
                    backgroundColor: 'bg-status-warning/5',
                    textColor: 'text-status-warning',
                };
            case NOTIFICATION_PRIORITIES.NORMAL:
                return {
                    borderColor: 'border-l-primary-500',
                    backgroundColor: 'bg-primary-500/5',
                    textColor: 'text-primary-500',
                };
            default:
                return {
                    borderColor: 'border-l-neutral-300 dark:border-l-neutral-600',
                    backgroundColor: 'bg-neutral-50 dark:bg-neutral-800',
                    textColor: 'text-neutral-600 dark:text-neutral-400',
                };
        }
    };

    // Get notification type icon
    const getTypeIcon = (type: string): keyof typeof import('../ui/OptimizedIcon').IconSVG => {
        const iconMap: Record<string, keyof typeof import('../ui/OptimizedIcon').IconSVG> = {
            post_like: 'heart',
            post_comment: 'chatbubble-outline',
            comment_reply: 'chatbubble-ellipses',
            mention: 'at-outline',
            new_follower: 'person-add',
            follow_post: 'notification',
            group_invite: 'people',
            event_reminder: 'calendar',
            message_received: 'mail',
            plant_milestone: 'leaf',
            expert_response: 'checkmark-circle',
        };
        return iconMap[type] || 'notification';
    };

    // Format relative time
    const formatRelativeTime = (date: Date) => {
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

        if (diffInMinutes < 1) return t('notifications.justNow');
        if (diffInMinutes < 60) return t('notifications.minutesAgo', { count: diffInMinutes });

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return t('notifications.hoursAgo', { count: diffInHours });

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return t('notifications.daysAgo', { count: diffInDays });

        return format(date, 'MMM d, h:mm a');
    };

    const priorityStyles = getPriorityStyles(notification.priority);

    return (
        <Animated.View style={[itemAnimatedStyle, cardAnimatedStyle]} className="mb-2">
            <Pressable {...cardHandlers}>
                <ThemedView
                    variant="card"
                    className={`border-l-4 p-4 ${priorityStyles.borderColor} ${priorityStyles.backgroundColor} ${!notification.isRead ? 'ring-1 ring-primary-200 dark:ring-primary-800' : ''
                        } ${isSelected ? 'ring-2 ring-primary-500' : ''}`}
                >
                    {/* Header with icon, title, and timestamp */}
                    <ThemedView className="mb-2 flex-row items-start justify-between">
                        <ThemedView className="flex-1 flex-row items-start">
                            {/* Notification icon */}
                            <ThemedView className="mr-3 mt-1">
                                <OptimizedIcon
                                    name={getTypeIcon(notification.notificationType)}
                                    size={20}
                                    className={priorityStyles.textColor}
                                />
                            </ThemedView>

                            {/* Content */}
                            <ThemedView className="flex-1">
                                <ThemedText
                                    variant="heading"
                                    className={`text-base ${!notification.isRead ? 'font-semibold' : 'font-medium'}`}
                                >
                                    {notification.title}
                                </ThemedText>

                                <ThemedText variant="muted" className="mt-1 text-sm">
                                    {notification.message}
                                </ThemedText>

                                {/* Source user info if available */}
{notification.data?.sourceUser && (
                                    <ThemedView className="mt-2 flex-row items-center">
                                        <NetworkResilientImage
                                            url={notification.data.sourceUser.user_metadata?.avatar_url || null}
                                            width={20}
                                            height={20}
                                            borderRadius={10}
                                        />
                                        <ThemedText variant="muted" className="text-xs ml-2">
{notification.data.sourceUser.user_metadata?.display_name || notification.data.sourceUser?.email}
                                        </ThemedText>
                                    </ThemedView>
                                )}
                            </ThemedView>
                        </ThemedView>

                        {/* Timestamp and unread indicator */}
                        <ThemedView className="ml-2 items-end">
                            <ThemedText variant="muted" className="text-xs">
                                {formatRelativeTime(notification.createdAt)}
                            </ThemedText>

                            {!notification.isRead && (
                                <ThemedView className="mt-1 h-2 w-2 rounded-full bg-primary-500" />
                            )}

                            {notification.priority === NOTIFICATION_PRIORITIES.URGENT && (
                                <ThemedView className="mt-1">
                                    <OptimizedIcon
                                        name="warning"
                                        size={12}
                                        className="text-status-danger"
                                    />
                                </ThemedView>
                            )}
                        </ThemedView>
                    </ThemedView>

                    {/* Action buttons */}
                    {notification.hasActions && notification.actions && (
                        <ThemedView className="mt-3 flex-row flex-wrap gap-2">
                            {notification.actions.map((action) => (
                                <Animated.View key={action.actionId} style={markReadStyle}>
                                    <Pressable
                                        {...markReadHandlers}
                                        onPress={() => onAction(notification, action.actionId)}
                                    >
                                        <ThemedView className="rounded-lg bg-primary-500 px-3 py-1">
                                            <ThemedText className="text-sm font-medium text-white">
                                                {action.label}
                                            </ThemedText>
                                        </ThemedView>
                                    </Pressable>
                                </Animated.View>
                            ))}
                        </ThemedView>
                    )}

                    {/* Quick actions */}
                    <ThemedView className="mt-3 flex-row justify-end space-x-2">
                        {!notification.isRead && (
                            <Animated.View style={markReadStyle}>
                                <Pressable {...markReadHandlers}>
                                    <ThemedView className="flex-row items-center rounded-lg bg-neutral-200 px-3 py-1 dark:bg-neutral-700">
                                        <OptimizedIcon
                                            name="checkmark"
                                            size={14}
                                            className="mr-1 text-neutral-700 dark:text-neutral-300"
                                        />
                                        <ThemedText className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                                            {t('notifications.markRead')}
                                        </ThemedText>
                                    </ThemedView>
                                </Pressable>
                            </Animated.View>
                        )}

                        <Animated.View style={dismissStyle}>
                            <Pressable {...dismissHandlers}>
                                <ThemedView className="flex-row items-center rounded-lg bg-neutral-200 px-3 py-1 dark:bg-neutral-700">
                                    <OptimizedIcon
                                        name="close"
                                        size={14}
                                        className="text-neutral-700 dark:text-neutral-300"
                                    />
                                </ThemedView>
                            </Pressable>
                        </Animated.View>
                    </ThemedView>
                </ThemedView>
            </Pressable>
        </Animated.View>
    );
};

interface LiveNotificationCenterProps {
    userId?: string;
    showUnreadOnly?: boolean;
    onNotificationPress?: (notification: LiveNotification) => void;
    maxItems?: number;
}

/**
 * Main LiveNotificationCenter component
 */
const LiveNotificationCenter: React.FC<LiveNotificationCenterProps> = ({
    userId,
    showUnreadOnly = false,
    onNotificationPress,
    maxItems = 100,
}) => {
    const { t } = useTranslation();
    // Replaced hand-managed server state with TanStack Query
    const [notifications, setNotifications] = useState<LiveNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
    const [showBatchActions, setShowBatchActions] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

    // React Query client and notification queries
    const queryClient = useQueryClient();
    const { list, infinite, markRead, markAllRead } = useNotificationQueries({
        userId: userId ?? '',
        pageSize: maxItems,
        read: showUnreadOnly ? true : undefined,
        enabled: Boolean(userId),
    });

    // Mirror query data into local view-model state for rendering/animations/grouping
    useEffect(() => {
        if (infinite.data?.items) {
            // Prefer infinite for larger sets when available
            setNotifications(infinite.data.items as unknown as LiveNotification[]);
            setLoading(infinite.isLoading || infinite.isFetching);
        } else if (list.data) {
            setNotifications(list.data as unknown as LiveNotification[]);
            setLoading(list.isLoading || list.isFetching);
        } else {
            setNotifications([]);
            setLoading(infinite.isLoading || list.isLoading || false);
        }
        // animate when we have data
        if ((infinite.data?.items?.length ?? list.data?.length ?? 0) > 0) {
            listOpacity.value = withTiming(1, { duration: 300 });
        }
    }, [infinite.data, infinite.isLoading, infinite.isFetching, list.data, list.isLoading, list.isFetching]);

    // Real-time moved into hook (useRealtimeNotifications)

    // Animation values
    const headerOpacity = useSharedValue(1);
    const listOpacity = useSharedValue(0);

    // Scroll animation for smooth interactions
    const { scrollHandler, styles: scrollStyles } = useScrollAnimation({
        fadeDistance: 100,
        parallaxFactor: 0.2,
    });

    // Cleanup animations
    useAnimationCleanup({
        sharedValues: [headerOpacity, listOpacity],
    });

    // Grouping moved into hook
    const { groupedNotifications, unreadCount, buildFlatData } = useGroupedNotifications(notifications);

    // Load notifications - now uses TanStack Query refetch instead of direct DB fetch
    const loadNotifications = useCallback(async () => {
        try {
            setLoading(true);
            if (infinite.hasNextPage) {
                // refetch from first page for infinite
                await queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
                await infinite.refetch();
            } else {
                await list.refetch();
            }
            listOpacity.value = withTiming(1, { duration: 300 });
        } catch (error) {
            log.error('Error loading notifications:', error);
            Alert.alert(
                t('notifications.error'),
                t('notifications.errorLoadingNotifications')
            );
        } finally {
            setLoading(false);
        }
    }, [userId, infinite, list, queryClient, t]);

    // Realtime subscription moved into hook
    const notificationsQueryKey = useMemo(
        () => ['notifications', userId, showUnreadOnly, maxItems],
        [userId, showUnreadOnly, maxItems]
    );
    const { status: rtStatus } = useRealtimeNotifications({
        userId,
        maxItems,
        queryClient,
        notificationsQueryKey,
    });
    useEffect(() => {
        setConnectionStatus(rtStatus);
    }, [rtStatus]);

    // Realtime new/update/delete/batch handled in useRealtimeNotifications

    // Reconnection is handled inside useRealtimeNotifications; removed legacy handler

    // Initialize component
    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    // Refresh notifications
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadNotifications();
        setRefreshing(false);
    }, [loadNotifications]);

    // Handle notification press
    const handleNotificationPress = useCallback(async (notification: LiveNotification) => {
        try {
            // Mark as read if not already
            if (!notification.isRead) {
                await notification.markAsRead();
                triggerLightHapticSync();
            }

            // Call external handler
            onNotificationPress?.(notification);

        } catch (error) {
            log.error('Error handling notification press:', error);
        }
    }, [onNotificationPress]);

    // Handle notification action
    const handleNotificationAction = useCallback(async (notification: LiveNotification, actionId: string) => {
        try {
            const action = notification.actions?.find(a => a.actionId === actionId);
            if (!action) return;

            // Mark as read when action is taken (via mutation)
            if (!notification.isRead && userId) {
                markRead.mutate({ id: notification.id, is_read: true });
            }

            // Handle different action types
            switch (action.type) {
                case 'like':
                    triggerMediumHapticSync();
                    break;
                case 'reply':
                    triggerLightHapticSync();
                    break;
                case 'follow':
                    triggerMediumHapticSync();
                    break;
                case 'join':
                    triggerMediumHapticSync();
                    break;
                case 'dismiss':
                    await handleNotificationDismiss(notification);
                    break;
            }

            // Remove action from notification (local model method retained for UI-only cleanup)
            await notification.removeAction(actionId);

        } catch (error) {
            log.error('Error handling notification action:', error);
            Alert.alert(
                t('notifications.error'),
                t('notifications.errorHandlingAction')
            );
        }
    }, [t, userId, markRead]);

    // Mark notification as read
    const handleMarkAsRead = useCallback(async (notification: LiveNotification) => {
        try {
            if (userId) {
                // Use TanStack Query mutation for server state
                markRead.mutate({ id: notification.id, is_read: true });
            }
            triggerLightHapticSync();
        } catch (error) {
            log.error('Error marking notification as read:', error);
        }
    }, [userId, markRead]);

    // Dismiss notification
    const handleNotificationDismiss = useCallback(async (notification: LiveNotification) => {
        try {
            // No per-item animateRemoval available here; rely on UI button animation and refresh state
            await notification.markAsDeleted();
            triggerLightHapticSync();
        } catch (error) {
            log.error('Error dismissing notification:', error);
        }
    }, []);

    // Batch actions
    const handleBatchMarkRead = useCallback(async () => {
        try {
            if (userId) {
                // Prefer server-side bulk where available
                await markAllRead.mutateAsync();
                await queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
            } else {
                // Fallback: individual updates
                const selectedIds = Array.from(selectedNotifications);
                const selectedNotifs = notifications.filter(n => selectedIds.includes(n.id));
                await Promise.all(
                    selectedNotifs.map(n => markRead.mutateAsync({ id: n.id, is_read: true }))
                );
            }

            setSelectedNotifications(new Set());
            setShowBatchActions(false);
            triggerMediumHapticSync();

        } catch (error) {
            log.error('Error batch marking as read:', error);
            Alert.alert(
                t('notifications.error'),
                t('notifications.errorBatchMarkRead')
            );
        }
    }, [selectedNotifications, notifications, userId, markRead, markAllRead, queryClient, t]);

    const handleBatchDismiss = useCallback(async () => {
        try {
            const selectedIds = Array.from(selectedNotifications);
            const selectedNotifs = notifications.filter(n => selectedIds.includes(n.id));

            await Promise.all(
                selectedNotifs.map(notification => notification.markAsDeleted())
            );

            setSelectedNotifications(new Set());
            setShowBatchActions(false);
            triggerMediumHapticSync();

        } catch (error) {
            log.error('Error batch dismissing:', error);
            Alert.alert(
                t('notifications.error'),
                t('notifications.errorBatchDismiss')
            );
        }
    }, [selectedNotifications, notifications, t]);

    // Toggle batch mode
    const toggleBatchMode = useCallback(() => {
        setShowBatchActions(!showBatchActions);
        setSelectedNotifications(new Set());
        triggerLightHapticSync();
    }, [showBatchActions]);

    // Select notification
    const handleSelectNotification = useCallback((notification: LiveNotification) => {
        setSelectedNotifications(prev => {
            const newSet = new Set(prev);
            if (newSet.has(notification.id)) {
                newSet.delete(notification.id);
            } else {
                newSet.add(notification.id);
            }
            return newSet;
        });
        triggerLightHapticSync();
    }, []);

    // Animation for batch actions
    const { animatedStyle: batchToggleStyle, handlers: batchToggleHandlers } = useButtonAnimation({
        enableHaptics: true,
        hapticStyle: 'medium',
        onPress: toggleBatchMode,
    });

    const { animatedStyle: batchMarkReadStyle, handlers: batchMarkReadHandlers } = useButtonAnimation({
        enableHaptics: true,
        hapticStyle: 'heavy',
        onPress: handleBatchMarkRead,
    });

    const { animatedStyle: batchDismissStyle, handlers: batchDismissHandlers } = useButtonAnimation({
        enableHaptics: true,
        hapticStyle: 'medium',
        onPress: handleBatchDismiss,
    });

    // Header animated style
    const headerAnimatedStyle = useAnimatedStyle(() => ({
        opacity: headerOpacity.value,
    }));

    // List animated style
    const listAnimatedStyle = useAnimatedStyle(() => ({
        opacity: listOpacity.value,
    }));

    // Flatten groups into a single virtualized data array (sections + items)
    type SectionItem =
        | { type: 'section'; key: string; title: string; priority: NotificationPriority; count: number }
        | { type: 'notification'; key: string; notification: LiveNotification };

    const flatData: SectionItem[] = useMemo(() => {
        // Use hook-provided flattener so LiveNotificationCenter stays lean
        return buildFlatData(
            {
                unread: {
                    urgent: t('notifications.urgent'),
                    high: t('notifications.high'),
                    normal: t('notifications.normal'),
                    low: t('notifications.low'),
                },
                read: {
                    urgent: t('notifications.readUrgent'),
                    high: t('notifications.readHigh'),
                    normal: t('notifications.readNormal'),
                    low: t('notifications.readLow'),
                },
            },
            showUnreadOnly
        );
    }, [buildFlatData, showUnreadOnly, t]);

    const getItemType = useCallback((item: SectionItem) => item.type, []);

    const keyExtractor = useCallback((item: SectionItem) => item.key, []);

    const renderItem = useCallback(
        ({ item }: { item: SectionItem }) => {
            if (item.type === 'section') {
                const { title, priority, count } = item;
                return (
                    <ThemedView className="px-4 mb-4">
                        <ThemedView className="mb-3 flex-row items-center justify-between">
                            <ThemedText
                                className={`text-sm font-bold uppercase ${priority === NOTIFICATION_PRIORITIES.URGENT ? 'text-status-danger' :
                                    priority === NOTIFICATION_PRIORITIES.HIGH ? 'text-status-warning' :
                                        priority === NOTIFICATION_PRIORITIES.NORMAL ? 'text-primary-500' :
                                            'text-neutral-600 dark:text-neutral-400'
                                    }`}
                            >
                                {title}
                            </ThemedText>
                            <NotificationBadge count={count} />
                        </ThemedView>
                    </ThemedView>
                );
            }

            // notification row
            const n = item.notification;
            return (
                <ThemedView className="px-4">
                    <NotificationItem
                        notification={n}
                        onPress={handleNotificationPress}
                        onAction={handleNotificationAction}
                        onMarkRead={handleMarkAsRead}
                        onDismiss={handleNotificationDismiss}
                        isSelected={selectedNotifications.has(n.id)}
                        showSelection={showBatchActions}
                    />
                </ThemedView>
            );
        },
        [handleNotificationPress, handleNotificationAction, handleMarkAsRead, handleNotificationDismiss, selectedNotifications, showBatchActions]
    );

    // Loading state
    if (loading) {
        return (
            <ThemedView className="flex-1 items-center justify-center p-6">
                <AnimatedSpinner size={48} className="mb-4 text-primary-500" />
                <ThemedText variant="heading" className="mb-2 text-center text-xl">
                    {t('notifications.loading')}
                </ThemedText>
                <ThemedText variant="muted" className="text-center">
                    {t('notifications.loadingDescription')}
                </ThemedText>
            </ThemedView>
        );
    }

    // Empty state
    if (notifications.length === 0) {
        return (
            <ThemedView className="flex-1 items-center justify-center p-6">
                <OptimizedIcon
                    name="notification"
                    size={64}
                    className="mb-4 text-neutral-400"
                />
                <ThemedText variant="heading" className="mb-2 text-center text-xl">
                    {showUnreadOnly
                        ? t('notifications.noUnreadNotifications')
                        : t('notifications.noNotifications')
                    }
                </ThemedText>
                <ThemedText variant="muted" className="text-center">
                    {showUnreadOnly
                        ? t('notifications.noUnreadNotificationsDescription')
                        : t('notifications.noNotificationsDescription')
                    }
                </ThemedText>
            </ThemedView>
        );
    }

    return (
        <ThemedView className="flex-1">
            {/* Header with connection status and batch actions (extracted component) */}
            <Animated.View style={headerAnimatedStyle}>
                <BatchActionControls
                    showBatchActions={showBatchActions}
                    selectedCount={selectedNotifications.size}
                    unreadCount={unreadCount}
                    connectionStatus={connectionStatus}
                    onToggleBatchMode={toggleBatchMode}
                    onBatchMarkRead={handleBatchMarkRead}
                    onBatchDismiss={handleBatchDismiss}
                    title={t('notifications.title')}
                    connectionLabel={t(`notifications.connectionStatus.${connectionStatus}`)}
                />
            </Animated.View>

            {/* Notifications list */}
            <Animated.View style={listAnimatedStyle} className="flex-1">
                <FlashListWrapper
                    data={flatData}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    getItemType={getItemType}
                    onScroll={scrollHandler}
                    scrollEventThrottle={16}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing || infinite.isRefetching || list.isRefetching}
                            onRefresh={handleRefresh}
                        />
                    }
                    ListFooterComponent={<ThemedView className="h-20" />}
                    showsVerticalScrollIndicator={false}
                />
            </Animated.View>
        </ThemedView>
    );
};

export default LiveNotificationCenter;
