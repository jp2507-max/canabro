
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import supabase from '../../supabase';
import { triggerLightHaptic, triggerMediumHaptic } from '../../utils/haptics';

interface LikeCommentParams {
  commentId: string;
  userId: string;
  postId: string; // Added contextual identifier
  currentlyLiked: boolean;
}

interface CommentData {
  id: string;
  user_has_liked: boolean;
  likes_count: number;
  [key: string]: unknown;
}

export function useCommentLike() {
  const queryClient = useQueryClient();

  return useMutation({
  mutationFn: async ({ commentId, userId, postId: _postId, currentlyLiked }: LikeCommentParams) => {
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
    onMutate: async ({ commentId, postId, currentlyLiked }) => {
      // Trigger haptic feedback immediately
      if (currentlyLiked) {
        await triggerLightHaptic();
      } else {
        await triggerMediumHaptic();
      }

      // Cancel any outgoing refetches for this post's comments only
      await queryClient.cancelQueries({ queryKey: ['comments', postId] });

      // Snapshot the previous value
      const previousComments = queryClient.getQueryData<CommentData[]>(['comments', postId]);

      // Optimistically update the cache
      queryClient.setQueryData<CommentData[]>(['comments', postId], (old) => {
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
      return { previousComments, postId };
    },
    onError: (err, { postId }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousComments) {
        queryClient.setQueryData(['comments', postId], context.previousComments);
      }
      // User-facing error notification
      Alert.alert(
        'Like Failed',
        'Unable to update like status. Please try again.',
        [{ text: 'OK' }],
      );
      console.error('Error toggling comment like:', err);
    },
    onSettled: (_data, _error, variables) => {
      // Always refetch after error or success to ensure we have the latest data
      if (variables?.postId) {
        queryClient.invalidateQueries({ queryKey: ['comments', variables.postId] });
      }
    },
  });
}