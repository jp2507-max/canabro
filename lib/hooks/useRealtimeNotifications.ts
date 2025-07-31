import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { triggerLightHapticSync, triggerMediumHapticSync, triggerHeavyHapticSync } from '@/lib/utils/haptics';
import { log } from '@/lib/utils/logger';
import supabase from '@/lib/supabase';
import type { LiveNotification } from '@/lib/models/LiveNotification';
import type { QueryClient } from '@tanstack/react-query';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

interface UseRealtimeNotificationsParams {
  userId?: string;
  maxItems?: number;
  queryClient: QueryClient;
  notificationsQueryKey: readonly unknown[];
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
    queryClient.invalidateQueries({ queryKey: notificationsQueryKey as any });
  }, [queryClient, notificationsQueryKey]);

  const handleNew = useCallback((n: any) => {
    try {
      if (n.priority === 'urgent') triggerHeavyHapticSync();
      else if (n.priority === 'high') triggerMediumHapticSync();
      else triggerLightHapticSync();

      queryClient.setQueryData<LiveNotification[] | { items: LiveNotification[] } | undefined>(
        notificationsQueryKey,
        (old) => {
          if (Array.isArray(old)) {
            const next = [n as LiveNotification, ...old];
            return next.slice(0, maxItems);
          }
          if (old && typeof old === 'object' && Array.isArray((old as any).items)) {
            const items = [(n as LiveNotification), ...((old as any).items as LiveNotification[])].slice(0, maxItems);
            return { ...(old as any), items };
          }
          return [n as LiveNotification].slice(0, maxItems);
        }
      );
    } catch (e) {
      log.error('Realtime handleNew error', e);
    }
  }, [queryClient, notificationsQueryKey, maxItems]);

  const handleUpdate = useCallback((n: any) => {
    queryClient.setQueryData<LiveNotification[] | { items: LiveNotification[] } | undefined>(
      notificationsQueryKey,
      (old) => {
        if (Array.isArray(old)) return old.map(x => (x.id === n.id ? n : x));
        if (old && typeof old === 'object' && Array.isArray((old as any).items)) {
          const items = ((old as any).items as LiveNotification[]).map(x => (x.id === n.id ? n : x));
          return { ...(old as any), items };
        }
        return old;
      }
    );
  }, [queryClient, notificationsQueryKey]);

  const handleDelete = useCallback((n: any) => {
    queryClient.setQueryData<LiveNotification[] | { items: LiveNotification[] } | undefined>(
      notificationsQueryKey,
      (old) => {
        if (Array.isArray(old)) return old.filter(x => x.id !== n.id);
        if (old && typeof old === 'object' && Array.isArray((old as any).items)) {
          const items = ((old as any).items as LiveNotification[]).filter(x => x.id !== n.id);
          return { ...(old as any), items };
        }
        return old;
      }
    );
  }, [queryClient, notificationsQueryKey]);

  const handleBatch = useCallback((batch: any[]) => {
    if (!batch?.length) return;
    const processed = batch.slice(0, 10);
    queryClient.setQueryData<LiveNotification[] | { items: LiveNotification[] } | undefined>(
      notificationsQueryKey,
      (old) => {
        if (Array.isArray(old)) {
          const next = [...(processed as LiveNotification[]), ...old];
          return next.slice(0, maxItems);
        }
        if (old && typeof old === 'object' && Array.isArray((old as any).items)) {
          const items = [
            ...(processed as LiveNotification[]),
            ...((old as any).items as LiveNotification[]),
          ].slice(0, maxItems);
          return { ...(old as any), items };
        }
        return (processed as LiveNotification[]).slice(0, maxItems);
      }
    );
    triggerLightHapticSync();
  }, [queryClient, notificationsQueryKey, maxItems]);

  const handleReconnection = useCallback(() => {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const setup = useCallback(() => {
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
          handleBatch((payload as any).notifications);
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
