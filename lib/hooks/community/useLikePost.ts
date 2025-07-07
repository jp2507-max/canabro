import { useMutation, useQueryClient } from '@tanstack/react-query';
import supabase from '../../supabase';
import { triggerLightHaptic, triggerMediumHaptic } from '../../utils/haptics';

interface LikePostParams {
  postId: string;
  userId: string;
  currentlyLiked: boolean;
}

interface PostData {
  id: string;
  user_has_liked: boolean;
  likes_count: number;
  [key: string]: any;
}

export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, userId, currentlyLiked }: LikePostParams) => {
      // Call the appropriate RPC function based on current state
      const { data, error } = await supabase.rpc(
        currentlyLiked ? 'unlike_post' : 'like_post',
        {
          post_id: postId,
          user_id: userId
        }
      );

      if (error) {
        throw error;
      }

      return data;
    },
    onMutate: async ({ postId, currentlyLiked }) => {
      // Trigger haptic feedback immediately
      if (currentlyLiked) {
        await triggerLightHaptic();
      } else {
        await triggerMediumHaptic();
      }

      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['posts'] });

      // Snapshot the previous value
      const previousPosts = queryClient.getQueryData<PostData[]>(['posts']);

      // Optimistically update the cache
      queryClient.setQueryData<PostData[]>(['posts'], (old) => {
        if (!old) return old;
        
        return old.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              user_has_liked: !currentlyLiked,
              likes_count: currentlyLiked ? post.likes_count - 1 : post.likes_count + 1
            };
          }
          return post;
        });
      });

      // Return a context object with the snapshotted value
      return { previousPosts };
    },
    onError: (err, { postId, currentlyLiked }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousPosts) {
        queryClient.setQueryData(['posts'], context.previousPosts);
      }
      
      console.error('Error toggling like:', err);
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
} 