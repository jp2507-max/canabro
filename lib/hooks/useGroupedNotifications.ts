import { useMemo } from 'react';
import type { LiveNotification, NotificationPriority } from '@/lib/models/LiveNotification';

export interface GroupedNotifications {
  unread: Record<NotificationPriority, LiveNotification[]>;
  read: Record<NotificationPriority, LiveNotification[]>;
}

export interface UseGroupedNotificationsOptions {
  showUnreadOnly?: boolean;
  maxItems?: number;
}

/**
 * Groups notifications by read status and priority, and computes unread count.
 * Purely derived state with memoization for performance.
 */
export function useGroupedNotifications(
  notifications: LiveNotification[] = [],
  _opts?: UseGroupedNotificationsOptions
) {
  const grouped = useMemo<GroupedNotifications>(() => {
    const groups: GroupedNotifications = {
      unread: { urgent: [], high: [], normal: [], low: [] } as Record<NotificationPriority, LiveNotification[]>,
      read: { urgent: [], high: [], normal: [], low: [] } as Record<NotificationPriority, LiveNotification[]>,
    };

    for (const n of notifications) {
      const bucket = n.isRead ? 'read' : 'unread';
      groups[bucket][n.priority].push(n);
    }

    return groups;
  }, [notifications]);

  const unreadCount = useMemo(() => notifications.reduce((acc, n) => acc + (n.isRead ? 0 : 1), 0), [notifications]);

  // Flatten helper used by list virtualization (kept generic, UI comp decides labels)
  type SectionItem =
    | { type: 'section'; key: string; title: string; priority: NotificationPriority; count: number }
    | { type: 'notification'; key: string; notification: LiveNotification };

  const buildFlatData = (labels: {
    unread: Record<NotificationPriority, string>;
    read: Record<NotificationPriority, string>;
  }, showUnreadOnly = false): SectionItem[] => {
    const rows: SectionItem[] = [];
    const push = (title: string, items: LiveNotification[], priority: NotificationPriority, idKey: string) => {
      if (!items.length) return;
      rows.push({ type: 'section', key: `section:${idKey}`, title, priority, count: items.length });
      for (const n of items) rows.push({ type: 'notification', key: `notif:${n.id}`, notification: n });
    };

    // unread buckets
    push(labels.unread.urgent, grouped.unread.urgent, 'urgent', 'unread-urgent');
    push(labels.unread.high, grouped.unread.high, 'high', 'unread-high');
    push(labels.unread.normal, grouped.unread.normal, 'normal', 'unread-normal');
    push(labels.unread.low, grouped.unread.low, 'low', 'unread-low');

    if (!showUnreadOnly) {
      // read buckets
      push(labels.read.urgent, grouped.read.urgent, 'urgent', 'read-urgent');
      push(labels.read.high, grouped.read.high, 'high', 'read-high');
      push(labels.read.normal, grouped.read.normal, 'normal', 'read-normal');
      push(labels.read.low, grouped.read.low, 'low', 'read-low');
    }

    return rows;
  };

  return {
    groupedNotifications: grouped,
    unreadCount,
    buildFlatData,
  };
}
