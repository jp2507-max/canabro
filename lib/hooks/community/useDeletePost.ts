import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CommunityService } from '../../services/community-service';
import { PostData } from '../../types/community';

export interface DeletePostVariables {
  post: PostData;
  userId: string;
}

interface SoftDeleteVariables {
  postId: string;
  userId: string;
}

interface RestorePostVariables {
  postId: string;
  userId: string;
}

interface DeletePostOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useDeletePost(options?: DeletePostOptions) {
  const queryClient = useQueryClient();

  return useMutation<string, Error, DeletePostVariables, { previousPosts?: PostData[] }>({
    mutationFn: async ({ post, userId }: DeletePostVariables) => {
      if (post.post_type === 'question') {
        await CommunityService.deleteQuestion(post.id, userId);
      } else if (post.post_type === 'plant_share') {
        await CommunityService.deletePlantShare(post.id, userId);
      } else {
        const errorMsg = `[useDeletePost] Unsupported post type: ${post.post_type}`;
        console.warn(errorMsg);
        throw new Error(errorMsg);
      }
      return post.id;
    },
    onMutate: async ({ post }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['posts'] });

      // Snapshot the previous value
      const previousPosts = queryClient.getQueryData<PostData[]>(['posts']);

      // Optimistically remove the post from the cache
      queryClient.setQueryData<PostData[]>(['posts'], (old) => {
        if (!old) return [];
        return old.filter(item => item.id !== post.id);
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
    onSuccess: (deletedId) => {
      console.log(`[useDeletePost] Successfully deleted post: ${deletedId}`);
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

  return useMutation<string, Error, SoftDeleteVariables, { previousPosts?: PostData[] }>({
    mutationFn: async ({ postId, userId }: SoftDeleteVariables) => {
      await CommunityService.softDeletePost(postId, userId);
      return postId;
    },
    onMutate: async ({ postId }) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] });
      const previousPosts = queryClient.getQueryData<PostData[]>(['posts']);

      // Optimistically mark the post as deleted
      queryClient.setQueryData<PostData[]>(['posts'], (old) => {
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

  return useMutation<string, Error, RestorePostVariables, { previousPosts?: PostData[] }>({
    mutationFn: async ({ postId, userId }: RestorePostVariables) => {
      await CommunityService.restorePost(postId, userId);
      return postId;
    },
    onMutate: async ({ postId }) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] });
      const previousPosts = queryClient.getQueryData<PostData[]>(['posts']);

      // Optimistically restore the post
      queryClient.setQueryData<PostData[]>(['posts'], (old) => {
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
