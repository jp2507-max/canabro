import { useMemo } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import supabase from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Types
 */
export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, any> | null;
  is_read: boolean;
  created_at: string; // ISO
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
}

type NotificationError = PostgrestError | { message: string };

/**
 * Query Keys
 */
const notificationKeys = {
  all: (userId?: string) => ['notifications', userId] as const,
  list: (userId: string, filter?: { read?: boolean }) =>
    [...notificationKeys.all(userId), 'list', filter?.read ?? 'all'] as const,
  infinite: (userId: string, pageSize: number, read?: boolean) =>
    [...notificationKeys.all(userId), 'infinite', pageSize, read ?? 'all'] as const,
  byId: (userId: string, id: string) => [...notificationKeys.all(userId), 'detail', id] as const,
};

/**
 * Cache update helper
 * Handles arrays, { items }, and { pages } (where each page may be array or { items }).
 * Applies a partial update to any notification with the matching id and returns
 * a new structure while preserving references when unchanged.
 */
type NotificationLike = { id: string } & Record<string, unknown>;
type ItemsContainer<T extends NotificationLike> = { items: T[] };
type PageContainer<T> = { pages: T[] };

type UpdatableCache =
  | NotificationLike[]
  | ItemsContainer<NotificationLike>
  | PageContainer<NotificationLike[] | ItemsContainer<NotificationLike>>;

function updateNotificationCache<T extends UpdatableCache>(
  cached: T | undefined,
  notificationId: string,
  update: Partial<NotificationLike>
): T | undefined {
  if (!cached) return cached;

  const updateArray = <I extends NotificationLike>(arr: I[]): I[] => {
    let changed = false;
    const next = arr.map((item) => {
      if (item?.id === notificationId) {
        changed = true;
        return { ...item, ...update } as I;
      }
      return item;
    });
    return changed ? next : arr;
  };

  // Case A: flat array
  if (Array.isArray(cached)) {
    const next = updateArray(cached as NotificationLike[]);
    return (next === cached ? cached : (next as unknown)) as T;
  }

  // Case B: object with items
  if ('items' in cached && Array.isArray((cached as ItemsContainer<NotificationLike>).items)) {
    const container = cached as ItemsContainer<NotificationLike>;
    const nextItems = updateArray(container.items);
    if (nextItems === container.items) return cached;
    return { ...cached, items: nextItems } as T;
  }

  // Case C: paginated with pages
  if ('pages' in cached && Array.isArray((cached as PageContainer<unknown>).pages)) {
    const pageContainer = cached as PageContainer<unknown>;
    let anyPageChanged = false;

    const nextPages = pageContainer.pages.map((page) => {
      // Page as array
      if (Array.isArray(page)) {
        const updated = updateArray(page as NotificationLike[]);
        if (updated !== page) anyPageChanged = true;
        return updated;
      }

      // Page as object with items
      if (page && typeof page === 'object' && 'items' in (page as ItemsContainer<NotificationLike>)) {
        const pageObj = page as ItemsContainer<NotificationLike>;
        const nextItems = updateArray(pageObj.items);
        if (nextItems !== pageObj.items) {
          anyPageChanged = true;
          return { ...pageObj, items: nextItems };
        }
        return pageObj;
      }

      // Unknown page shape
      return page;
    });

    if (!anyPageChanged) return cached;
    return { ...cached, pages: nextPages } as T;
  }

  // Unknown shape
  return cached;
}

/**
 * Low-level data fetchers
 */
async function fetchNotificationsPage(params: {
  userId: string;
  cursor: string | null; // ISO created_at to paginate by time
  pageSize: number;
  read?: boolean;
}): Promise<PaginatedResponse<NotificationItem>> {
  const { userId, cursor, pageSize, read } = params;

  // Build base query
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(pageSize);

  if (typeof read === 'boolean') {
    query = query.eq('is_read', read);
  }

  if (cursor) {
    // pagination: fetch items created before the cursor timestamp
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;
  if (error) {
    throw error as NotificationError;
  }

  const items = (data ?? []) as NotificationItem[];
  const nextCursor =
    items.length === pageSize && items.length > 0 ? items[items.length - 1]!.created_at : null;

  return { items, nextCursor };
}

async function markNotificationRead(params: { id: string; userId: string; is_read: boolean }) {
  const { id, userId, is_read } = params;
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error as NotificationError;
  return data as NotificationItem;
}

async function markAllNotificationsRead(params: { userId: string }) {
  const { userId } = params;
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error as NotificationError;
  return true;
}

/**
 * Hooks
 */

// Infinite (paginated) notifications list
export function useInfiniteNotifications(options: {
  userId: string;
  pageSize?: number;
  read?: boolean;
  enabled?: boolean;
}) {
  const { userId, pageSize = 20, read, enabled = !!userId } = options;

  return useInfiniteQuery({
    queryKey: notificationKeys.infinite(userId, pageSize, read),
    enabled,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      fetchNotificationsPage({
        userId,
        cursor: pageParam,
        pageSize,
        read,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? null,
    select: (data) => {
      // Flatten items and keep pagination cursors
      const items = data.pages.flatMap((p) => p.items);
      const lastPage = data.pages[data.pages.length - 1];
      const nextCursor = lastPage ? lastPage.nextCursor : null;
      return { items, nextCursor, pages: data.pages, pageParams: data.pageParams };
    },
  });
}

// Simple list (first page only) - useful for badges or quick views
export function useNotificationsList(options: {
  userId: string;
  read?: boolean;
  pageSize?: number;
  enabled?: boolean;
}) {
  const { userId, read, pageSize = 20, enabled = !!userId } = options;

  return useQuery({
    queryKey: notificationKeys.list(userId, { read }),
    enabled,
    queryFn: async () => {
      const page = await fetchNotificationsPage({ userId, cursor: null, pageSize, read });
      return page.items;
    },
  });
}

// Single notification by id
export function useNotificationById(options: { userId: string; id?: string; enabled?: boolean }) {
  const { userId, id, enabled = !!userId && !!id } = options;

  return useQuery({
    queryKey: id ? notificationKeys.byId(userId, id) : ['notifications', 'disabled'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('id', id)
        .single();

      if (error) throw error as NotificationError;
      return data as NotificationItem;
    },
  });
}

// Optimistic mutation: mark read/unread
export function useMarkNotificationRead(options: { userId: string }) {
  const { userId } = options;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, is_read }: { id: string; is_read: boolean }) =>
      markNotificationRead({ id, userId, is_read }),
    onMutate: async ({ id, is_read }) => {
      // Cancel related queries
      const keysToInvalidate = [
        notificationKeys.all(userId),
      ];

      await Promise.all(
        keysToInvalidate.map((key) => qc.cancelQueries({ queryKey: key }))
      );

      // Snapshot previous data for rollback
      const prevInfinite = qc.getQueriesData<{ items: NotificationItem[] } | any>({
        queryKey: notificationKeys.infinite(userId, 20, undefined).slice(0, 2), // match base ['notifications', userId]
        type: 'active',
      });

      const prevLists = qc.getQueriesData<NotificationItem[] | undefined>({
        queryKey: notificationKeys.all(userId),
        type: 'active',
      });

      // Optimistically update any cached lists using unified helper
      const updateFields = { is_read };

      // Update all queries under notifications/userId uniformly
      qc.getQueryCache()
        .findAll({ queryKey: notificationKeys.all(userId) })
        .forEach((q) => {
          qc.setQueryData(q.queryKey, (oldData: UpdatableCache | NotificationItem | undefined) => {
            // Nothing cached
            if (!oldData) return oldData;

            // Keep single detail objects intact unless matching id
            if (!Array.isArray(oldData) && typeof oldData === 'object' && 'id' in oldData) {
              const detail = oldData as NotificationItem;
              return detail.id === id ? { ...detail, ...updateFields } : detail;
            }
            return updateNotificationCache(oldData as UpdatableCache | undefined, id, updateFields) as any;
          });
        });

      return { prevInfinite, prevLists };
    },
    onError: (_err, _vars, context) => {
      // Rollback
      if (!context) return;

      // Restore infinite queries
      if (Array.isArray(context.prevInfinite)) {
        context.prevInfinite.forEach(([key, data]) => {
          qc.setQueryData(key as any, data as any);
        });
      }

      // Restore lists
      if (Array.isArray(context.prevLists)) {
        context.prevLists.forEach(([key, data]) => {
          qc.setQueryData(key as any, data as any);
        });
      }
    },
    onSettled: async () => {
      // Invalidate all notification-related queries for server reconciliation
      await qc.invalidateQueries({ queryKey: notificationKeys.all(userId) });
    },
  });
}

// Bulk: mark all as read
export function useMarkAllNotificationsRead(options: { userId: string }) {
  const { userId } = options;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => markAllNotificationsRead({ userId }),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: notificationKeys.all(userId) });

      const prevData = qc.getQueriesData({ queryKey: notificationKeys.all(userId), type: 'active' });

      // Optimistically set all cached notifications to read
      const setAllRead = (arr: NotificationItem[]) => arr.map((n) => ({ ...n, is_read: true }));

      qc.getQueryCache()
        .findAll({ queryKey: notificationKeys.all(userId) })
        .forEach((q) => {
          qc.setQueryData(q.queryKey, (old: any) => {
            if (!old) return old;

            // For single detail objects, force is_read: true if it's a NotificationItem
            if (!Array.isArray(old) && typeof old === 'object' && 'id' in old && 'is_read' in old) {
              return { ...old, is_read: true };
            }

            // Reuse helper by mapping: update all ids found to is_read: true
            // Since helper targets one id, we fall back to shape-based mapping once here
            const setAllReadArr = (arr: NotificationItem[]) => arr.map((n) => ({ ...n, is_read: true }));
            if (Array.isArray(old)) return setAllReadArr(old);
            if (old && typeof old === 'object' && 'items' in old && Array.isArray((old as any).items)) {
              return { ...old, items: setAllReadArr((old as any).items) };
            }
            if (old && typeof old === 'object' && 'pages' in old && Array.isArray((old as any).pages)) {
              return {
                ...old,
                pages: (old as any).pages.map((p: any) =>
                  Array.isArray(p)
                    ? setAllReadArr(p)
                    : p && typeof p === 'object' && 'items' in p && Array.isArray(p.items)
                    ? { ...p, items: setAllReadArr(p.items) }
                    : p
                ),
              };
            }
            return old;
          });
        });

      return { prevData };
    },
    onError: (_e, _v, ctx) => {
      if (!ctx) return;
      if (Array.isArray(ctx.prevData)) {
        ctx.prevData.forEach(([key, data]) => qc.setQueryData(key as any, data as any));
      }
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: notificationKeys.all(userId) });
    },
  });
}

/**
 * Facade that groups common notification queries/mutations
 */
export function useNotificationQueries(options: { userId: string; pageSize?: number; read?: boolean; enabled?: boolean }) {
  const { userId, pageSize, read, enabled } = options;

  const infinite = useInfiniteNotifications({ userId, pageSize, read, enabled });
  const list = useNotificationsList({ userId, read, pageSize, enabled });
  const markRead = useMarkNotificationRead({ userId });
  const markAllRead = useMarkAllNotificationsRead({ userId });

  const api = useMemo(
    () => ({
      keys: notificationKeys,
      infinite,
      list,
      markRead,
      markAllRead,
    }),
    [infinite, list, markRead, markAllRead]
  );

  return api;
}

export type UseNotificationQueriesReturn = ReturnType<typeof useNotificationQueries>;
