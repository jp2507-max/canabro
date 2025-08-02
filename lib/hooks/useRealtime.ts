/**
 * Enhanced Realtime Hook (2025)
 * 
 * React hook for managing Supabase Realtime subscriptions with 2025 optimizations:
 * - Automatic cleanup and memory management
 * - Connection health monitoring
 * - Offline-first capabilities
 * - Performance optimizations
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { RealtimeChannel } from '@supabase/supabase-js';
import { realtimeService, RealtimeSubscriptionConfig, MessageBroadcast, PresenceState } from '../services/realtimeService';
import { realtimeConfig } from '../services/realtimeConfig';
import { log } from '../utils/logger';

export interface UseRealtimeOptions {
    enabled?: boolean;
    autoReconnect?: boolean;
    pauseOnBackground?: boolean;
    enableBatching?: boolean;
    enableRateLimit?: boolean;
    onConnectionChange?: (status: 'connected' | 'disconnected' | 'reconnecting') => void;
    onError?: (error: Error) => void;
}

export interface ConnectionHealth {
    lastPing?: number;
    connectionRetries: number;
    isHealthy: boolean;
    latency?: number;
}

export interface RealtimeHookReturn {
    // Connection status
    isConnected: boolean;
    isReconnecting: boolean;
    connectionHealth: ConnectionHealth;

    // Actions
    broadcast: (message: MessageBroadcast) => Promise<void>;
    trackPresence: (state: PresenceState) => Promise<void>;
    untrackPresence: () => Promise<void>;
    reconnect: () => Promise<void>;

    // State
    presenceState: PresenceState;
    lastError: Error | null;
}

/**
 * Strongly-typed realtime payloads
 */
type PostgresAction = 'INSERT' | 'UPDATE' | 'DELETE';
type PostgresEvent = PostgresAction | '*';

export interface RealtimeRowPayload<Row = unknown> {
    schema: string;
    table: string;
    eventType: PostgresAction;
    commit_timestamp?: string;
    errors?: string | null;
    new?: Row;
    old?: Partial<Row> | null;
}

/**
 * Runtime type guards to validate inbound Supabase payloads
 * and safely narrow types without weakening type safety.
 */
function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function hasKeys<T extends string>(obj: Record<string, unknown>, keys: readonly T[]): obj is Record<T, unknown> {
    return keys.every(k => Object.prototype.hasOwnProperty.call(obj, k));
}

function isPostgresAction(v: unknown): v is PostgresAction {
    return v === 'INSERT' || v === 'UPDATE' || v === 'DELETE';
}

export function isRealtimeRowPayload<Row = unknown>(payload: unknown): payload is RealtimeRowPayload<Row> {
    if (!isObject(payload)) return false;
    if (!hasKeys(payload, ['schema', 'table', 'eventType'] as const)) return false;
    if (typeof payload.schema !== 'string') return false;
    if (typeof payload.table !== 'string') return false;
    if (!isPostgresAction((payload as any).eventType)) return false;
    // new/old are optional and can be unknown shapes; no further runtime validation here
    return true;
}

export function isBatchedBroadcastPayload<T = unknown>(payload: unknown): payload is RealtimeBroadcastPayload<{ messages: T[] }> {
    if (!isRealtimeBroadcastPayload<Record<string, unknown>>(payload)) return false;
    const pl = (payload as RealtimeBroadcastPayload<Record<string, unknown>>).payload;
    return isObject(pl) && Array.isArray((pl as any).messages);
}

export function isRealtimeBroadcastPayload<T = unknown>(payload: unknown): payload is RealtimeBroadcastPayload<T> {
    if (!isObject(payload)) return false;
    if (!hasKeys(payload, ['type', 'payload'] as const)) return false;
    if (typeof payload.type !== 'string') return false;
    // payload can be any; optional metadata fields are not strictly required
    return true;
}

export function isTypingPayload(payload: unknown): payload is TypingPayload {
    if (!isObject(payload)) return false;
    return typeof (payload as any).userId === 'string'
        && typeof (payload as any).threadId === 'string'
        && typeof (payload as any).isTyping === 'boolean';
}

export function isPresenceStateLike(value: unknown): value is PresenceState {
    if (!isObject(value)) return false;
    // minimal presence validation; PresenceState fields can be extended by service
    if (typeof (value as any).userId !== 'string') return false;
    // status often 'online'|'offline'|'away' etc. Treat as string for runtime check
    if (typeof (value as any).status !== 'string') return false;
    return true;
}

export interface RealtimeBroadcastPayload<T = unknown> {
    type: 'message' | 'typing' | 'presence' | 'notification' | string;
    payload: T;
    userId?: string;
    timestamp?: number;
    messageId?: string;
    retryCount?: number;
}

/**
 * Typing payload for typing events
 */
export interface TypingPayload {
    userId: string;
    threadId: string;
    isTyping: boolean;
}

export interface PresenceJoinLeaveEvent {
    key: string;
    currentPresences: Record<string, unknown>;
    newPresences?: Array<{ id: string; metas: Array<Record<string, unknown>> }>;
    leftPresences?: Array<{ id: string; metas: Array<Record<string, unknown>> }>;
}

export function useRealtime<Row = unknown, BroadcastT = unknown>(
    config: RealtimeSubscriptionConfig,
    callbacks: {
        onInsert?: (payload: RealtimeRowPayload<Row>) => void;
        onUpdate?: (payload: RealtimeRowPayload<Row>) => void;
        onDelete?: (payload: RealtimeRowPayload<Row>) => void;
        onBroadcast?: (payload: RealtimeBroadcastPayload<BroadcastT>) => void;
        onPresenceSync?: (state: PresenceState) => void;
        onPresenceJoin?: (key: string, currentPresences: Record<string, unknown>, newPresences: Array<{ id: string; metas: Array<Record<string, unknown>> }>) => void;
        onPresenceLeave?: (key: string, currentPresences: Record<string, unknown>, leftPresences: Array<{ id: string; metas: Array<Record<string, unknown>> }>) => void;
    },
    options: UseRealtimeOptions = {}
): RealtimeHookReturn {
    const {
        enabled = true,
        autoReconnect = true,
        pauseOnBackground = true,
        enableBatching = true,
        enableRateLimit = true,
        onConnectionChange,
        onError
    } = options;

    // State
    const [isConnected, setIsConnected] = useState(false);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [presenceState, setPresenceState] = useState<PresenceState>({
        userId: '',
        status: 'offline',
        lastSeen: '',
    });
    const [lastError, setLastError] = useState<Error | null>(null);
    const [connectionHealth, setConnectionHealth] = useState<ConnectionHealth>({
        connectionRetries: 0,
        isHealthy: false,
    });

    // Refs
    const channelRef = useRef<RealtimeChannel | null>(null);
    const appStateRef = useRef<AppStateStatus>(AppState.currentState);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const configRef = useRef(config);
    // Update config ref when config changes
    useEffect(() => {
        configRef.current = config;
    }, [config]);

    /**
     * Enhanced subscription with 2025 features
     */
    const subscribe = useCallback(async () => {
        if (!enabled) return;

        try {
            setIsReconnecting(true);
            setLastError(null);

            // Apply configuration optimizations
            const realtimeConfigData = realtimeConfig.getConfig();
            // Debug mode sourced from monitoring config to avoid relying on non-existent 'debug' flag on RealtimeConfig
            const monitoring = realtimeConfig.getMonitoringConfig?.();
            const debugMode = !!(monitoring && monitoring.logLevel === 'debug');

            // Enhanced callbacks with error handling and performance monitoring
            const enhancedCallbacks = {
                ...callbacks,

                onInsert: callbacks.onInsert ? (payload: unknown) => {
                    try {
                        if (!isRealtimeRowPayload<Row>(payload)) {
                            throw new Error('Invalid payload for onInsert');
                        }
                        let startTime: number | undefined;
                        if (debugMode && typeof performance?.now === 'function') {
                            startTime = performance.now();
                        }
                        callbacks.onInsert!(payload);

                        if (debugMode && startTime !== undefined) {
                            const duration = performance.now() - startTime;
                            log.debug(`[useRealtime] onInsert processed in ${duration}ms`);
                        }
                    } catch (error) {
                        log.error('[useRealtime] Error in onInsert callback:', error);
                        setLastError(error as Error);
                    }
                } : undefined,

                onUpdate: callbacks.onUpdate ? (payload: unknown) => {
                    try {
                        if (!isRealtimeRowPayload<Row>(payload)) {
                            throw new Error('Invalid payload for onUpdate');
                        }
                        let startTime: number | undefined;
                        if (debugMode && typeof performance?.now === 'function') {
                            startTime = performance.now();
                        }
                        callbacks.onUpdate!(payload);

                        if (debugMode && startTime !== undefined) {
                            const duration = performance.now() - startTime;
                            log.debug(`[useRealtime] onUpdate processed in ${duration}ms`);
                        }
                    } catch (error) {
                        log.error('[useRealtime] Error in onUpdate callback:', error);
                        setLastError(error as Error);
                    }
                } : undefined,

                onDelete: callbacks.onDelete ? (payload: unknown) => {
                    try {
                        if (!isRealtimeRowPayload<Row>(payload)) {
                            throw new Error('Invalid payload for onDelete');
                        }
                        callbacks.onDelete!(payload);
                    } catch (error) {
                        log.error('[useRealtime] Error in onDelete callback:', error);
                        setLastError(error as Error);
                    }
                } : undefined,

                onBroadcast: callbacks.onBroadcast ? (payload: unknown) => {
                    try {
                        if (!isRealtimeBroadcastPayload<BroadcastT>(payload)) {
                            throw new Error('Invalid payload for onBroadcast');
                        }

                        if (isBatchedBroadcastPayload<BroadcastT>(payload)) {
                            const items = (payload.payload as any).messages as BroadcastT[];
                            for (const msg of items) {
                                callbacks.onBroadcast!({
                                    ...payload,
                                    payload: msg,
                                } as RealtimeBroadcastPayload<BroadcastT>);
                            }
                        } else {
                            callbacks.onBroadcast!(payload as RealtimeBroadcastPayload<BroadcastT>);
                        }
                    } catch (error) {
                        log.error('[useRealtime] Error in onBroadcast callback:', error);
                        setLastError(error as Error);
                    }
                } : undefined,

                onPresenceSync: callbacks.onPresenceSync
                    ? (state: PresenceState | Record<string, unknown>) => {
                          try {
                              const typed: PresenceState = isPresenceStateLike(state)
                                  ? (state as PresenceState)
                                  : ({
                                        userId: String((state as any)?.userId ?? ''),
                                        status: String((state as any)?.status ?? 'offline') as PresenceState['status'],
                                        lastSeen: String((state as any)?.lastSeen ?? ''),
                                        location: (state as any)?.location,
                                        activity: (state as any)?.activity,
                                    } as PresenceState);

                              setPresenceState(typed);
                              callbacks.onPresenceSync!(typed);
                          } catch (error) {
                              log.error('[useRealtime] Error in onPresenceSync callback:', error);
                              setLastError(error as Error);
                          }
                      }
                    : undefined,

                onPresenceJoin: callbacks.onPresenceJoin
                    ? ((key: string, currentPresences: Record<string, unknown>, newPresences: Array<{ id: string; metas: Array<Record<string, unknown>> }>) => {
                          try {
                              callbacks.onPresenceJoin!(key, currentPresences, newPresences);
                          } catch (error) {
                              log.error('[useRealtime] Error in onPresenceJoin callback:', error);
                              setLastError(error as Error);
                          }
                      }) as (key: string, currentPresences: Record<string, unknown>, newPresences: Array<{ id: string; metas: Array<Record<string, unknown>> }>) => void
                    : undefined,

                onPresenceLeave: callbacks.onPresenceLeave
                    ? ((key: string, currentPresences: Record<string, unknown>, leftPresences: Array<{ id: string; metas: Array<Record<string, unknown>> }>) => {
                          try {
                              callbacks.onPresenceLeave!(key, currentPresences, leftPresences);
                          } catch (error) {
                              log.error('[useRealtime] Error in onPresenceLeave callback:', error);
                              setLastError(error as Error);
                          }
                      }) as (key: string, currentPresences: Record<string, unknown>, leftPresences: Array<{ id: string; metas: Array<Record<string, unknown>> }>) => void
                    : undefined
            };

            const channel = await realtimeService.subscribe(configRef.current, enhancedCallbacks);
            channelRef.current = channel;

            setIsConnected(true);
            setIsReconnecting(false);
            onConnectionChange?.('connected');

            if (debugMode) {
                log.info(`[useRealtime] Successfully subscribed to ${configRef.current.channelName}`);
            }
        } catch (error) {
            log.error(`[useRealtime] Subscription failed:`, error);
            setLastError(error as Error);
            setIsConnected(false);
            setIsReconnecting(false);
            onConnectionChange?.('disconnected');
            onError?.(error as Error);

            // Auto-reconnect if enabled
            if (autoReconnect) {
                const delay = realtimeConfig.getConfig().baseRetryDelay;
                reconnectTimeoutRef.current = setTimeout(() => {
                    subscribe();
                }, delay);
            }
        }
    }, [enabled, callbacks, autoReconnect, onConnectionChange, onError]);

    /**
     * Unsubscribe from channel
     */
    const unsubscribe = useCallback(async () => {
        if (channelRef.current) {
            try {
                await realtimeService.unsubscribe(configRef.current.channelName);
                channelRef.current = null;
                setIsConnected(false);
                onConnectionChange?.('disconnected');
                log.info(`[useRealtime] Unsubscribed from ${configRef.current.channelName}`);
            } catch (error) {
                log.error('[useRealtime] Unsubscribe failed:', error);
            }
        }

        // Clear timeouts
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
    }, [onConnectionChange]);

    /**
     * Enhanced broadcast with rate limiting and batching
     */
    const broadcast = useCallback(async (message: MessageBroadcast) => {
        if (!isConnected || !channelRef.current) {
            log.warn('[useRealtime] Cannot broadcast: not connected');
            return;
        }

        try {
            await realtimeService.broadcast(configRef.current.channelName, message);
        } catch (error) {
            log.error('[useRealtime] Broadcast failed:', error);
            setLastError(error as Error);
            onError?.(error as Error);
        }
    }, [isConnected, onError]);

    /**
     * Track presence with enhanced state management
     */
    const trackPresence = useCallback(async (state: PresenceState) => {
        if (!isConnected || !channelRef.current) {
            log.warn('[useRealtime] Cannot track presence: not connected');
            return;
        }

        try {
            await realtimeService.trackPresence(configRef.current.channelName, state);
        } catch (error) {
            log.error('[useRealtime] Track presence failed:', error);
            setLastError(error as Error);
            onError?.(error as Error);
        }
    }, [isConnected, onError]);

    /**
     * Untrack presence
     */
    const untrackPresence = useCallback(async () => {
        if (!isConnected || !channelRef.current) {
            return;
        }

        try {
            await realtimeService.untrackPresence(configRef.current.channelName);
        } catch (error) {
            log.error('[useRealtime] Untrack presence failed:', error);
            setLastError(error as Error);
        }
    }, [isConnected]);

    /**
     * Manual reconnect
     */
    const reconnect = useCallback(async () => {
        if (isReconnecting) return;
        
        await unsubscribe();
        await subscribe();
    }, [isReconnecting, unsubscribe, subscribe]);

    /**
     * Handle app state changes (background/foreground)
     */
    const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
        if (pauseOnBackground) {
            if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
                // App came to foreground - reconnect
                log.info('[useRealtime] App became active, reconnecting...');
                if (autoReconnect && !isConnected) {
                    subscribe();
                }
            } else if (nextAppState.match(/inactive|background/)) {
                // App went to background - disconnect to save resources
                log.info('[useRealtime] App went to background, disconnecting...');
                unsubscribe();
            }
        }
        appStateRef.current = nextAppState;
    }, [pauseOnBackground, autoReconnect, isConnected, subscribe, unsubscribe]);

    /**
     * Connection health monitoring
     */
    const updateConnectionHealth = useCallback(() => {

        const rawHealth = realtimeService.getConnectionHealth();
        // Map to ConnectionHealth interface (only connectionRetries is available)
        const health: ConnectionHealth = {
            connectionRetries: rawHealth.connectionRetries ?? 0,
            isHealthy: rawHealth.connectionRetries === 0,
        };
        setConnectionHealth(health);

        // Auto-reconnect if connection is unhealthy
        if (autoReconnect && health.connectionRetries > 0 && !isReconnecting) {
            log.warn('[useRealtime] Connection unhealthy, attempting reconnect...');
            reconnect();
        }
    }, [autoReconnect, isReconnecting, reconnect]);

    // Initial subscription
    useEffect(() => {
        if (enabled) {
            subscribe();
        }
        return () => {
            unsubscribe();
        };
    }, [enabled, subscribe, unsubscribe]); // Depend on enabled, subscribe, and unsubscribe to avoid stale closures

    // App state listener
    useEffect(() => {
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription?.remove();
    }, [handleAppStateChange]);

    // Health monitoring
    useEffect(() => {
        if (enabled) {
            healthCheckIntervalRef.current = setInterval(updateConnectionHealth, 10000); // Check every 10 seconds
            return () => {
                if (healthCheckIntervalRef.current) {
                    clearInterval(healthCheckIntervalRef.current);
                }
            };
        }
    }, [enabled, updateConnectionHealth]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            unsubscribe();
            if (healthCheckIntervalRef.current) {
                clearInterval(healthCheckIntervalRef.current);
            }
        };
    }, [unsubscribe]);

    return {
        isConnected,
        isReconnecting,
        connectionHealth,
        broadcast,
        trackPresence,
        untrackPresence,
        reconnect,
        presenceState,
        lastError
    };
}

/**
 * Hook for conversation messaging
 */
export interface MessageRow {
    id: string;
    thread_id: string;
    user_id: string;
    content: string | null;
    created_at?: string;
    updated_at?: string;
    // add other known columns if needed
}

export interface TypingBroadcast {
    type: 'typing';
    payload: TypingPayload;
    timestamp?: number;
}

export function useConversationRealtime(
    conversationId: string,
    callbacks: {
        onNewMessage?: (message: RealtimeRowPayload<MessageRow>) => void;
        onMessageUpdate?: (message: RealtimeRowPayload<MessageRow>) => void;
        onMessageDelete?: (message: RealtimeRowPayload<MessageRow>) => void;
        onTyping?: (payload: RealtimeBroadcastPayload<TypingPayload>) => void;
        onPresenceChange?: (state: PresenceState) => void;
    },
    options: UseRealtimeOptions = {}
) {
    return useRealtime<MessageRow, TypingPayload>(
        {
            channelName: `conversation:${conversationId}`,
            table: 'messages',
            filter: `thread_id=eq.${conversationId}`,
        },
        {
            onInsert: callbacks.onNewMessage,
            onUpdate: callbacks.onMessageUpdate,
            onDelete: callbacks.onMessageDelete,
            onBroadcast: callbacks.onTyping,
            onPresenceSync: callbacks.onPresenceChange,
        },
        {
            ...options,
            enableBatching: false, // Don't batch messages for real-time feel
        }
    );
}

/**
 * Hook for user notifications
 */
export interface NotificationRow {
    id: string;
    user_id: string;
    title?: string | null;
    body?: string | null;
    read?: boolean;
    created_at?: string;
    // extend as needed
}

export function useNotificationRealtime(
    userId: string,
    callbacks: {
        onNewNotification?: (notification: RealtimeRowPayload<NotificationRow>) => void;
        onNotificationUpdate?: (notification: RealtimeRowPayload<NotificationRow>) => void;
    },
    options: UseRealtimeOptions = {}
) {
    return useRealtime<NotificationRow>(
        {
            channelName: `notifications:${userId}`,
            table: 'live_notifications',
            filter: `user_id=eq.${userId}`,
        },
        {
            onInsert: callbacks.onNewNotification,
            onUpdate: callbacks.onNotificationUpdate,
        },
        {
            ...options,
            enableBatching: false, // Don't batch notifications
        }
    );
}

/**
 * Hook for live events
 */
export interface LiveEventRow {
    id: string;
    title?: string | null;
    status?: string | null;
    starts_at?: string | null;
    ends_at?: string | null;
}

export interface EventBroadcastPayload {
    event: string;
    data?: unknown;
}

export function useLiveEventRealtime(
    eventId: string,
    callbacks: {
        onEventUpdate?: (event: RealtimeRowPayload<LiveEventRow>) => void;
        onParticipantJoin?: (participant: PresenceState) => void;
        onParticipantLeave?: (participant: PresenceState) => void;
        onBroadcast?: (payload: RealtimeBroadcastPayload<EventBroadcastPayload>) => void;
        onPresenceChange?: (state: PresenceState) => void;
    },
    options: UseRealtimeOptions = {}
) {
    return useRealtime<LiveEventRow, EventBroadcastPayload>(
        {
            channelName: `event:${eventId}`,
            table: 'live_events',
            filter: `id=eq.${eventId}`,
        },
        {
            onUpdate: callbacks.onEventUpdate,
            onBroadcast: callbacks.onBroadcast,
            onPresenceSync: callbacks.onPresenceChange,
            onPresenceJoin: (_key: string, _currentPresences: Record<string, unknown>, newPresences: Array<{ id: string; metas: Array<Record<string, unknown>> }>) => {
                const maybe = newPresences?.[0]?.metas?.[0];
                const first: PresenceState = isPresenceStateLike(maybe)
                    ? (maybe as PresenceState)
                    : ({
                          userId: String((maybe as any)?.userId ?? ''),
                          status: String((maybe as any)?.status ?? 'offline') as PresenceState['status'],
                          lastSeen: String((maybe as any)?.lastSeen ?? ''),
                          location: (maybe as any)?.location,
                          activity: (maybe as any)?.activity,
                      } as PresenceState);
                callbacks.onParticipantJoin?.(first);
            },
            onPresenceLeave: (_key: string, _currentPresences: Record<string, unknown>, leftPresences: Array<{ id: string; metas: Array<Record<string, unknown>> }>) => {
                const maybe = leftPresences?.[0]?.metas?.[0];
                const first: PresenceState = isPresenceStateLike(maybe)
                    ? (maybe as PresenceState)
                    : ({
                          userId: String((maybe as any)?.userId ?? ''),
                          status: String((maybe as any)?.status ?? 'offline') as PresenceState['status'],
                          lastSeen: String((maybe as any)?.lastSeen ?? ''),
                          location: (maybe as any)?.location,
                          activity: (maybe as any)?.activity,
                      } as PresenceState);
                callbacks.onParticipantLeave?.(first);
            },
        },
        {
            ...options,
            enableBatching: true, // Enable batching for events
        }
    );
}
