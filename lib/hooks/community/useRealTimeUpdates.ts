import { useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Comment } from '../../types/community';
import supabase from '../../supabase';
import { generateUuid } from '../../utils/uuid';

// Real-time connection status types
export type RealTimeConnectionStatus = 
  | 'CONNECTING'
  | 'OPEN'
  | 'CLOSED'
  | 'ERROR'
  | 'DISCONNECTED';

export interface RealTimeConnectionState {
  status: RealTimeConnectionStatus;
  isConnected: boolean;
  lastStatusChange: Date | null;
}

/**
 * Hook for real-time updates to posts and likes
 * Automatically updates React Query cache when data changes
 */
export function useRealTimePostUpdates(userId?: string) {
  const queryClient = useQueryClient();
  const instanceIdRef = useRef<string>(generateUuid());

  useEffect(() => {
    if (!userId) return;

    const instanceId = instanceIdRef.current;

    // Subscribe to posts table changes
    const postsSubscription = supabase
      .channel(`posts-changes-${userId}-${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
        },
        (payload) => {
          console.log('Posts change received:', payload);
          
          // Invalidate posts queries to refetch fresh data
          queryClient.invalidateQueries({ queryKey: ['posts'] });
        }
      )
      .subscribe();

    // Subscribe to likes table changes
    const likesSubscription = supabase
      .channel(`likes-changes-${userId}-${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
        },
        (payload) => {
          console.log('Likes change received:', payload);
          
          // Update specific post in cache if possible
          if (payload.new && typeof payload.new === 'object' && 'post_id' in payload.new) {
            queryClient.invalidateQueries({ 
              queryKey: ['posts'],
              exact: false 
            });
          }
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      postsSubscription.unsubscribe();
      likesSubscription.unsubscribe();
    };
  }, [userId, queryClient]);
}

/**
 * Hook for real-time updates to comments and comment likes
 * Automatically updates React Query cache when data changes
 */
export function useRealTimeCommentUpdates(postId?: string, userId?: string) {
  const queryClient = useQueryClient();
  const instanceIdRef = useRef<string>(generateUuid());

  useEffect(() => {
    if (!postId || !userId) return;

    const instanceId = instanceIdRef.current;

    // Subscribe to comments table changes
    const commentsSubscription = supabase
      .channel(`comments-${postId}-${userId}-${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          console.log('Comments change received:', payload);
          
          // Invalidate comments queries for this post
          queryClient.invalidateQueries({ 
            queryKey: ['comments', postId] 
          });
          
          // Also invalidate posts to update comment counts
          queryClient.invalidateQueries({ 
            queryKey: ['posts'] 
          });
        }
      )
      .subscribe();

    // Subscribe to comment likes table changes
    // ✅ OPTIMIZED: Only invalidate cache for comment likes belonging to the current post
    const commentLikesSubscription = supabase
      .channel(`comment-likes-${postId}-${userId}-${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comment_likes',
        },
        (payload) => {
          console.log('Comment likes change received:', payload);
          
          // Extract comment_id from the payload
          // Supabase real-time payload structure has new/old properties that can contain the row data
          const rowData = payload.new || payload.old;
          const commentId = rowData && typeof rowData === 'object' && 'comment_id' in rowData 
            ? (rowData as { comment_id: string }).comment_id 
            : null;
          
          if (!commentId) {
            console.warn('No comment_id found in comment_likes payload:', payload);
            return;
          }
          
          // Check if this comment belongs to the current post
          // First, try to get cached comments for this post
          const cachedComments = queryClient.getQueryData(['comments', postId]) as Comment[] | undefined;
          
          if (cachedComments) {
            // Check if any cached comment has this comment_id
            const belongsToCurrentPost = cachedComments.some(comment => comment.id === commentId);
            
            if (belongsToCurrentPost) {
              console.log(`Comment like change for comment ${commentId} belongs to current post ${postId}, invalidating cache`);
              // Only invalidate if the comment belongs to the current post
              queryClient.invalidateQueries({ 
                queryKey: ['comments', postId] 
              });
            } else {
              console.log(`Comment like change for comment ${commentId} does not belong to current post ${postId}, skipping invalidation`);
            }
          } else {
            // If no cached comments, we can't determine the relationship
            // In this case, it's safer to invalidate to ensure consistency
            console.log('No cached comments found, invalidating cache as fallback');
            queryClient.invalidateQueries({ 
              queryKey: ['comments', postId] 
            });
          }
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      commentsSubscription.unsubscribe();
      commentLikesSubscription.unsubscribe();
    };
  }, [postId, userId, queryClient]);
}

/**
 * Hook for real-time connection status monitoring
 * Provides connection state and reconnection handling
 */
export function useRealTimeConnection(): RealTimeConnectionState {
  const [connectionState, setConnectionState] = useState<RealTimeConnectionState>({
    status: 'CONNECTING',
    isConnected: false,
    lastStatusChange: null,
  });
  const instanceIdRef = useRef<string>(generateUuid());

  useEffect(() => {
    const instanceId = instanceIdRef.current;
    
    // Monitor connection status
    const handleConnectionChange = (status: RealTimeConnectionStatus) => {
      console.log('Supabase connection status:', status);
      
      const newState: RealTimeConnectionState = {
        status,
        isConnected: status === 'OPEN',
        lastStatusChange: new Date(),
      };
      
      setConnectionState(newState);
      
      if (status === 'CLOSED' || status === 'DISCONNECTED') {
        console.warn('Real-time connection lost, attempting to reconnect...');
      } else if (status === 'OPEN') {
        console.log('Real-time connection established');
      } else if (status === 'ERROR') {
        console.error('Real-time connection error occurred');
      }
    };

    // Listen for connection status changes
    const subscription = supabase
      .channel(`connection-monitor-${instanceId}`)
      .subscribe((status) => {
        // Map Supabase status to our typed status
        const typedStatus: RealTimeConnectionStatus = 
          typeof status === 'string' && 
          ['CONNECTING', 'OPEN', 'CLOSED', 'ERROR', 'DISCONNECTED'].includes(status)
            ? status as RealTimeConnectionStatus
            : 'ERROR';
        
        handleConnectionChange(typedStatus);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return connectionState;
} 