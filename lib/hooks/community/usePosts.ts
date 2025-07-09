import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { PostData, UsePostsParams, CommentWithLikeStatus } from '../../types/community';
import { CommunityService } from '../../services/community-service';
import supabase from '../../supabase';

// userId is not required for fetching the unified feed; only limit and offset are used.
export function usePosts({ limit = 10, offset = 0 }: Omit<UsePostsParams, 'userId'> = {}) {
  return useQuery({
    queryKey: ['posts', { limit, offset }],
    queryFn: async (): Promise<PostData[]> => {
      const page = Math.floor(offset / limit);
      return CommunityService.getCommunityFeed(page, limit);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// 🚀 Enhanced infinite query hook for better performance
export function useInfinitePosts({ userId, enabled }: { userId?: string, enabled?: boolean }) {
  const LIMIT = 20;
  return useInfiniteQuery({
    queryKey: ['posts', 'infinite', userId],
    queryFn: async ({ pageParam = 0 }): Promise<PostData[]> => {
      if (!userId) {
        throw new Error('User ID is required to fetch posts');
      }

      const page = pageParam / LIMIT;
      return CommunityService.getCommunityFeed(page, LIMIT);
    },
    enabled: !!userId && enabled,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      // If the last page has fewer items than the limit, we've reached the end
      if (lastPage.length < LIMIT) {
        return undefined;
      }
      // Return the next offset
      return allPages.length * LIMIT;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// 🎯 Hook for fetching comments with like status
export function useComments({ postId, userId }: { postId?: string; userId?: string }) {
  return useQuery({
    queryKey: ['comments', postId, userId],
    queryFn: async (): Promise<CommentWithLikeStatus[]> => {
      if (!postId || !userId) {
        throw new Error('Post ID and User ID are required to fetch comments');
      }

      const { data, error } = await supabase.rpc('get_comments_with_like_status', {
        p_post_id: postId,
        p_user_id: userId
      });

      if (error) {
        throw error;
      }

      return data || [];
    },
    enabled: !!postId && !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes (comments change more frequently)
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
} 