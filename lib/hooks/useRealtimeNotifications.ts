import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { triggerLightHapticSync, triggerMediumHapticSync, triggerHeavyHapticSync } from '@/lib/utils/haptics';
import { log } from '@/lib/utils/logger';
import supabase from '@/lib/supabase';
import type { LiveNotification } from '@/lib/models/LiveNotification';
import type { QueryClient, QueryKey } from '@tanstack/react-query';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

type NotificationCache = LiveNotification[] | { items: LiveNotification[] };

function isItemsObject(value: unknown): value is { items: LiveNotification[] } {
  return !!value && typeof value === 'object' && Array.isArray((value as { items?: unknown }).items);
}

interface UseRealtimeNotificationsParams {
  userId?: string;
  maxItems?: number;
  queryClient: QueryClient;
  notificationsQueryKey: QueryKey;
}

/**
 * Encapsulates Supabase Realtime subscription for live_notifications with
 * connection status, reconnection/backoff, and cache updates.
 */
export function useRealtimeNotifications({
  userId,
  maxItems = 100,
  queryClient,
  notificationsQueryKey,
}: UseRealtimeNotificationsParams) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');

  const channelRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
  }, [queryClient, notificationsQueryKey]);

  const handleNew = useCallback((n: any) => {
    try {
      if (n.priority === 'urgent') triggerHeavyHapticSync();
      else if (n.priority === 'high') triggerMediumHapticSync();
      else triggerLightHapticSync();

      queryClient.setQueryData<NotificationCache | undefined>(
        notificationsQueryKey,
        (old) => {
          const nextItem = n as LiveNotification;
          if (Array.isArray(old)) {
            const next = [nextItem, ...old];
            return next.slice(0, maxItems);
          }
          if (isItemsObject(old)) {
            const items = [nextItem, ...old.items].slice(0, maxItems);
            return { ...old, items };
          }
          return [nextItem].slice(0, maxItems);
        }
      );
    } catch (e) {
      log.error('Realtime handleNew error', e);
    }
  }, [queryClient, notificationsQueryKey, maxItems]);

  const handleUpdate = useCallback((n: any) => {
    queryClient.setQueryData<NotificationCache | undefined>(
      notificationsQueryKey,
      (old) => {
        const updated = n as LiveNotification;
        if (Array.isArray(old)) return old.map(x => (x.id === updated.id ? updated : x));
        if (isItemsObject(old)) {
          const items = old.items.map(x => (x.id === updated.id ? updated : x));
          return { ...old, items };
        }
        return old;
      }
    );
  }, [queryClient, notificationsQueryKey]);

  const handleDelete = useCallback((n: any) => {
    queryClient.setQueryData<NotificationCache | undefined>(
      notificationsQueryKey,
      (old) => {
        const removed = n as LiveNotification;
        if (Array.isArray(old)) return old.filter(x => x.id !== removed.id);
        if (isItemsObject(old)) {
          const items = old.items.filter(x => x.id !== removed.id);
          return { ...old, items };
        }
        return old;
      }
    );
  }, [queryClient, notificationsQueryKey]);

  const handleBatch = useCallback((batch: any[]) => {
    if (!batch?.length) return;
    const processed = batch.slice(0, 10);
    queryClient.setQueryData<NotificationCache | undefined>(
      notificationsQueryKey,
      (old) => {
        const incoming = processed as LiveNotification[];
        if (Array.isArray(old)) {
          const next = [...incoming, ...old];
          return next.slice(0, maxItems);
        }
        if (isItemsObject(old)) {
          const items = [...incoming, ...old.items].slice(0, maxItems);
          return { ...old, items };
        }
        return incoming.slice(0, maxItems);
      }
    );
    triggerLightHapticSync();
  }, [queryClient, notificationsQueryKey, maxItems]);

  // note: declared before setup to avoid circular reference initialization errors when used in setup's body
  const handleReconnection = useCallback((): void => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      log.warn('Max reconnection attempts reached');
      return;
    }
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
    reconnectAttempts.current += 1;

    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    reconnectTimeoutRef.current = setTimeout(() => {
      log.info(`Realtime reconnection attempt ${reconnectAttempts.current}`);
      setup();
    }, delay);
  }, [maxReconnectAttempts]); // setup is intentionally excluded; see setup dependency on handleReconnection

  const teardown = useCallback(() => {
    try {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    } catch (e) {
      log.warn('Realtime teardown error', e);
    }
  }, []);

  const setup = useCallback((): void => {
    try {
      setStatus('connecting');
      if (channelRef.current) channelRef.current.unsubscribe();

      const channel = supabase
        .channel(`live_notifications:${userId || 'all'}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'live_notifications',
            ...(userId ? { filter: `user_id=eq.${userId}` } : {}),
          },
          (payload) => {
            log.info('Realtime change', payload);
            invalidate();
            switch (payload.eventType) {
              case 'INSERT': handleNew(payload.new as any); break;
              case 'UPDATE': handleUpdate(payload.new as any); break;
              case 'DELETE': handleDelete(payload.old as any); break;
            }
          }
        )
        .on('broadcast', { event: 'notification_batch' }, (payload) => {
          log.info('Realtime batch', payload);
          const notifications = (payload as { notifications?: LiveNotification[] } | any)?.notifications;
          if (Array.isArray(notifications)) {
            handleBatch(notifications);
          }
          invalidate();
        })
        .on('presence', { event: 'sync' }, () => {
          setStatus('connected');
          reconnectAttempts.current = 0;
        })
        .subscribe((s: any) => {
          log.info('Realtime status', s);
          if (s === 'SUBSCRIBED') {
            setStatus('connected');
            reconnectAttempts.current = 0;
          } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') {
            setStatus('disconnected');
            handleReconnection();
          }
        });

      channelRef.current = channel;
    } catch (e) {
      log.error('Realtime setup error', e);
      setStatus('disconnected');
      handleReconnection();
    }
  }, [userId, invalidate, handleNew, handleUpdate, handleDelete, handleBatch, handleReconnection]);

  useEffect(() => {
    setup();
    return () => {
      teardown();
    };
  }, [setup, teardown]);

  return {
    status,
    reconnectingAttempts: reconnectAttempts.current,
    reconnect: () => {
      teardown();
      reconnectAttempts.current = 0;
      setup();
    },
    teardown,
  };
}
