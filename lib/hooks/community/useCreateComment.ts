import { useMutation, useQueryClient } from '@tanstack/react-query';
import supabase from '../../supabase';
import { triggerLightHaptic } from '../../utils/haptics';

interface CreateCommentParams {
  postId: string;
  userId: string;
  content: string;
  imageUrl?: string;
}

interface CommentData {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  likes_count: number;
  created_at: string;
  updated_at: string;
  user_has_liked: boolean;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, userId, content, imageUrl }: CreateCommentParams) => {
      // Call the create_comment RPC function
      const { data, error } = await supabase.rpc('create_comment', {
        post_id: postId,
        user_id: userId,
        content: content,
        image_url: imageUrl || null
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onMutate: async ({ postId, userId, content, imageUrl }) => {
      // Trigger haptic feedback immediately
      await triggerLightHaptic();

      // Cancel any outgoing refetches for comments
      await queryClient.cancelQueries({ queryKey: ['comments', postId] });

      // Snapshot the previous value
      const previousComments = queryClient.getQueryData<CommentData[]>(['comments', postId]);

      // Create optimistic comment
      const optimisticComment: CommentData = {
        id: `temp-${Date.now()}`,
        post_id: postId,
        user_id: userId,
        content,
        image_url: imageUrl || null,
        likes_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_has_liked: false,
        profile: {
          username: 'You', // Will be replaced with actual data
          avatar_url: null
        }
      };

      // Optimistically update the cache
      queryClient.setQueryData<CommentData[]>(['comments', postId], (old) => {
        if (!old) return [optimisticComment];
        return [...old, optimisticComment];
      });

      // Also update the post's comment count
      queryClient.setQueryData<any[]>(['posts'], (old) => {
        if (!old) return old;
        return old.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              comments_count: post.comments_count + 1
            };
          }
          return post;
        });
      });

      // Return a context object with the snapshotted value
      return { previousComments, postId };
    },
    onError: (err, { postId }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousComments) {
        queryClient.setQueryData(['comments', postId], context.previousComments);
      }
      
      // Also roll back the post's comment count
      queryClient.setQueryData<any[]>(['posts'], (old) => {
        if (!old) return old;
        return old.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              comments_count: Math.max(0, post.comments_count - 1)
            };
          }
          return post;
        });
      });
      
      console.error('Error creating comment:', err);
    },
    onSettled: (data, error, { postId }) => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
} 