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

export interface RealtimeHookReturn {
    // Connection status
    isConnected: boolean;
    isReconnecting: boolean;
    connectionHealth: any;
    
    // Actions
    broadcast: (message: MessageBroadcast) => Promise<void>;
    trackPresence: (state: PresenceState) => Promise<void>;
    untrackPresence: () => Promise<void>;
    reconnect: () => Promise<void>;
    
    // State
    presenceState: any;
    lastError: Error | null;
}

export function useRealtime(
    config: RealtimeSubscriptionConfig,
    callbacks: {
        onInsert?: (payload: any) => void;
        onUpdate?: (payload: any) => void;
        onDelete?: (payload: any) => void;
        onBroadcast?: (payload: any) => void;
        onPresenceSync?: (state: any) => void;
        onPresenceJoin?: (key: string, currentPresences: any, newPresences: any) => void;
        onPresenceLeave?: (key: string, currentPresences: any, leftPresences: any) => void;
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
    const [presenceState, setPresenceState] = useState({});
    const [lastError, setLastError] = useState<Error | null>(null);
    const [connectionHealth, setConnectionHealth] = useState({});

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
            
            // Enhanced callbacks with error handling and performance monitoring
            const enhancedCallbacks = {
                ...callbacks,
                onInsert: callbacks.onInsert ? (payload: any) => {
                    try {
                        const startTime = performance.now();
                        callbacks.onInsert!(payload);
                        const duration = performance.now() - startTime;
                        log.debug(`[useRealtime] onInsert processed in ${duration}ms`);
                    } catch (error) {
                        log.error('[useRealtime] Error in onInsert callback:', error);
                        setLastError(error as Error);
                    }
                } : undefined,
                
                onUpdate: callbacks.onUpdate ? (payload: any) => {
                    try {
                        const startTime = performance.now();
                        callbacks.onUpdate!(payload);
                        const duration = performance.now() - startTime;
                        log.debug(`[useRealtime] onUpdate processed in ${duration}ms`);
                    } catch (error) {
                        log.error('[useRealtime] Error in onUpdate callback:', error);
                        setLastError(error as Error);
                    }
                } : undefined,
                
                onDelete: callbacks.onDelete ? (payload: any) => {
                    try {
                        callbacks.onDelete!(payload);
                    } catch (error) {
                        log.error('[useRealtime] Error in onDelete callback:', error);
                        setLastError(error as Error);
                    }
                } : undefined,
                
                onBroadcast: callbacks.onBroadcast ? (payload: any) => {
                    try {
                        // Handle batched messages
                        if (payload.payload?.messages && Array.isArray(payload.payload.messages)) {
                            payload.payload.messages.forEach((msg: any) => {
                                callbacks.onBroadcast!(msg);
                            });
                        } else {
                            callbacks.onBroadcast!(payload);
                        }
                    } catch (error) {
                        log.error('[useRealtime] Error in onBroadcast callback:', error);
                        setLastError(error as Error);
                    }
                } : undefined,
                
                onPresenceSync: callbacks.onPresenceSync ? (state: any) => {
                    try {
                        setPresenceState(state);
                        callbacks.onPresenceSync!(state);
                    } catch (error) {
                        log.error('[useRealtime] Error in onPresenceSync callback:', error);
                        setLastError(error as Error);
                    }
                } : undefined,
                
                onPresenceJoin: callbacks.onPresenceJoin,
                onPresenceLeave: callbacks.onPresenceLeave
            };

            const channel = await realtimeService.subscribe(configRef.current, enhancedCallbacks);
            channelRef.current = channel;
            
            setIsConnected(true);
            setIsReconnecting(false);
            onConnectionChange?.('connected');
            
            log.info(`[useRealtime] Successfully subscribed to ${configRef.current.channelName}`);
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
        const health = realtimeService.getConnectionHealth();
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
    }, [enabled]); // Only depend on enabled to avoid unnecessary re-subscriptions

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
    }, []);

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
export function useConversationRealtime(
    conversationId: string,
    callbacks: {
        onNewMessage?: (message: any) => void;
        onMessageUpdate?: (message: any) => void;
        onMessageDelete?: (message: any) => void;
        onTyping?: (payload: any) => void;
        onPresenceChange?: (state: any) => void;
    },
    options: UseRealtimeOptions = {}
) {
    return useRealtime(
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
export function useNotificationRealtime(
    userId: string,
    callbacks: {
        onNewNotification?: (notification: any) => void;
        onNotificationUpdate?: (notification: any) => void;
    },
    options: UseRealtimeOptions = {}
) {
    return useRealtime(
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
export function useLiveEventRealtime(
    eventId: string,
    callbacks: {
        onEventUpdate?: (event: any) => void;
        onParticipantJoin?: (participant: any) => void;
        onParticipantLeave?: (participant: any) => void;
        onBroadcast?: (payload: any) => void;
        onPresenceChange?: (state: any) => void;
    },
    options: UseRealtimeOptions = {}
) {
    return useRealtime(
        {
            channelName: `event:${eventId}`,
            table: 'live_events',
            filter: `id=eq.${eventId}`,
        },
        {
            onUpdate: callbacks.onEventUpdate,
            onBroadcast: callbacks.onBroadcast,
            onPresenceSync: callbacks.onPresenceChange,
            onPresenceJoin: (_key: any, _currentPresences: any, newPresences: any) => {
                callbacks.onParticipantJoin?.(newPresences);
            },
            onPresenceLeave: (_key: any, _currentPresences: any, leftPresences: any) => {
                callbacks.onParticipantLeave?.(leftPresences);
            },
        },
        {
            ...options,
            enableBatching: true, // Enable batching for events
        }
    );
}