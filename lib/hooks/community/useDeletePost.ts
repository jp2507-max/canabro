import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CommunityService } from '../../services/community-service';
import { Post } from '../../types/community';

interface DeletePostVariables {
  postId: string;
  userId: string;
}

interface DeletePostOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useDeletePost(options?: DeletePostOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, userId }: DeletePostVariables) => {
      await CommunityService.deletePost(postId, userId);
      return postId;
    },
    onMutate: async ({ postId }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['posts'] });

      // Snapshot the previous value
      const previousPosts = queryClient.getQueryData<Post[]>(['posts']);

      // Optimistically remove the post from the cache
      queryClient.setQueryData<Post[]>(['posts'], (old) => {
        if (!old) return [];
        return old.filter(post => post.id !== postId);
      });

      // Return a context object with the snapshotted value
      return { previousPosts };
    },
    onError: (error, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousPosts) {
        queryClient.setQueryData(['posts'], context.previousPosts);
      }
      
      console.error('[useDeletePost] Error deleting post:', error);
      options?.onError?.(error as Error);
    },
    onSuccess: (deletedPostId) => {
      console.log(`[useDeletePost] Successfully deleted post: ${deletedPostId}`);
      options?.onSuccess?.();
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have fresh data
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

export function useSoftDeletePost(options?: DeletePostOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, userId }: DeletePostVariables) => {
      await CommunityService.softDeletePost(postId, userId);
      return postId;
    },
    onMutate: async ({ postId }) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] });
      const previousPosts = queryClient.getQueryData<Post[]>(['posts']);

      // Optimistically mark the post as deleted
      queryClient.setQueryData<Post[]>(['posts'], (old) => {
        if (!old) return [];
        return old.map(post => 
          post.id === postId 
            ? { ...post, is_deleted: true }
            : post
        );
      });

      return { previousPosts };
    },
    onError: (error, variables, context) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(['posts'], context.previousPosts);
      }
      
      console.error('[useSoftDeletePost] Error soft deleting post:', error);
      options?.onError?.(error as Error);
    },
    onSuccess: (deletedPostId) => {
      console.log(`[useSoftDeletePost] Successfully soft deleted post: ${deletedPostId}`);
      options?.onSuccess?.();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

export function useRestorePost(options?: DeletePostOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, userId }: DeletePostVariables) => {
      await CommunityService.restorePost(postId, userId);
      return postId;
    },
    onMutate: async ({ postId }) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] });
      const previousPosts = queryClient.getQueryData<Post[]>(['posts']);

      // Optimistically restore the post
      queryClient.setQueryData<Post[]>(['posts'], (old) => {
        if (!old) return [];
        return old.map(post => 
          post.id === postId 
            ? { ...post, is_deleted: false }
            : post
        );
      });

      return { previousPosts };
    },
    onError: (error, variables, context) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(['posts'], context.previousPosts);
      }
      
      console.error('[useRestorePost] Error restoring post:', error);
      options?.onError?.(error as Error);
    },
    onSuccess: (restoredPostId) => {
      console.log(`[useRestorePost] Successfully restored post: ${restoredPostId}`);
      options?.onSuccess?.();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}
