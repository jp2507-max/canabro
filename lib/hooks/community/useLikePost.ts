import { useMutation, useQueryClient } from '@tanstack/react-query';
// import supabase from '../../supabase';
import { CommunityService } from '../../services/community-service';
import { triggerLightHaptic, triggerMediumHaptic } from '../../utils/haptics';
import { PostData } from '../../types/community';
import { Alert } from 'react-native';

export type LikeParams = {
  post: PostData;
  userId: string;
};

export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ post, userId }: LikeParams) => {
      if (post.post_type === 'question') {
        return CommunityService.toggleQuestionLike(post.id, userId);
      }
      if (post.post_type === 'plant_share') {
        return CommunityService.togglePlantShareLike(post.id, userId);
      }
  throw new Error(`Unsupported post_type: ${post.post_type}`);
    },
    onMutate: async ({ post }) => {
      const currentlyLiked = post.user_has_liked;
      // Trigger haptic feedback immediately
      if (currentlyLiked) {
        await triggerLightHaptic();
      } else {
        await triggerMediumHaptic();
      }

      // Determine the correct query key based on post type
      const queryKey = post.post_type === 'question' ? ['questions'] : post.post_type === 'plant_share' ? ['plantShares'] : ['posts'];

      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousPosts = queryClient.getQueryData<PostData[]>(queryKey);

      // Optimistically update the cache
      queryClient.setQueryData<PostData[]>(queryKey, (old) => {
        if (!old) return old;
        return old.map(item => {
          if (item.id === post.id) {
            return {
              ...item,
              user_has_liked: !currentlyLiked,
              likes_count: currentlyLiked ? item.likes_count - 1 : item.likes_count + 1
            };
          }
          return item;
        });
      });

      // Return a context object with the snapshotted value and queryKey
      return { previousPosts, queryKey };
    },
    onError: (err, _args, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousPosts && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousPosts);
      }
      console.error('Error toggling like:', err);
      Alert.alert(
        'Like Failed',
        'Unable to update like status. Please try again.',
        [{ text: 'OK' }]
      );
    },
    onSettled: (_data, _error, _variables, context) => {
      // Always refetch after error or success to ensure we have the latest data
      if (context?.queryKey) {
        queryClient.invalidateQueries({ queryKey: context.queryKey });
      }
    },
  });
} 