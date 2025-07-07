import { useMutation, useQueryClient } from '@tanstack/react-query';
import supabase from '../../supabase';
import { triggerLightHaptic, triggerMediumHaptic } from '../../utils/haptics';

interface LikeCommentParams {
  commentId: string;
  userId: string;
  currentlyLiked: boolean;
}

interface CommentData {
  id: string;
  user_has_liked: boolean;
  likes_count: number;
  [key: string]: any;
}

export function useCommentLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, userId, currentlyLiked }: LikeCommentParams) => {
      // Call the appropriate RPC function based on current state
      const { data, error } = await supabase.rpc(
        currentlyLiked ? 'unlike_comment' : 'like_comment',
        {
          comment_id: commentId,
          user_id: userId
        }
      );

      if (error) {
        throw error;
      }

      return data;
    },
    onMutate: async ({ commentId, currentlyLiked }) => {
      // Trigger haptic feedback immediately
      if (currentlyLiked) {
        await triggerLightHaptic();
      } else {
        await triggerMediumHaptic();
      }

      // Cancel any outgoing refetches for comments
      await queryClient.cancelQueries({ queryKey: ['comments'] });

      // Snapshot the previous value
      const previousComments = queryClient.getQueryData<CommentData[]>(['comments']);

      // Optimistically update the cache
      queryClient.setQueryData<CommentData[]>(['comments'], (old) => {
        if (!old) return old;
        
        return old.map(comment => {
          if (comment.id === commentId) {
            return {
              ...comment,
              user_has_liked: !currentlyLiked,
              likes_count: currentlyLiked ? comment.likes_count - 1 : comment.likes_count + 1
            };
          }
          return comment;
        });
      });

      // Return a context object with the snapshotted value
      return { previousComments };
    },
    onError: (err, { commentId, currentlyLiked }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousComments) {
        queryClient.setQueryData(['comments'], context.previousComments);
      }
      
      console.error('Error toggling comment like:', err);
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['comments'] });
    },
  });
} 