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
    onMutate: async ({ post, userId }) => {
      const currentlyLiked = post.user_has_liked;
      // Trigger haptic feedback immediately
      if (currentlyLiked) {
        await triggerLightHaptic();
      } else {
        await triggerMediumHaptic();
      }

      // Use the correct query keys that match the actual infinite posts implementation
      const queryKeys = [
        ['posts', 'infinite', userId], // Main infinite posts query
        ['posts'], // Legacy posts query (if still used)
        ['community-questions'], // Specific question queries
        ['community-plant-shares'], // Specific plant share queries
      ];

      // Cancel any outgoing refetches for all relevant query keys
      await Promise.all(
        queryKeys.map(queryKey => 
          queryClient.cancelQueries({ queryKey })
        )
      );

      // Snapshot the previous values for all query keys
      const previousData = queryKeys.reduce((acc, queryKey) => {
        acc[queryKey.join('-')] = queryClient.getQueryData(queryKey);
        return acc;
      }, {} as Record<string, unknown>);

      // Optimistically update the infinite posts cache
      queryClient.setQueryData(['posts', 'infinite', userId], (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: PostData[]) =>
            page.map(item => {
              if (item.id === post.id) {
                return {
                  ...item,
                  user_has_liked: !currentlyLiked,
                  likes_count: currentlyLiked ? item.likes_count - 1 : item.likes_count + 1
                };
              }
              return item;
            })
          )
        };
      });

      // Also update legacy posts cache if it exists
      queryClient.setQueryData(['posts'], (old: PostData[] | undefined) => {
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

      // Update specific type-based caches
      if (post.post_type === 'question') {
        queryClient.setQueryData(['community-questions'], (old: any) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page: any[]) =>
              page.map(item => {
                if (item.id === post.id) {
                  return {
                    ...item,
                    user_has_liked: !currentlyLiked,
                    likes_count: currentlyLiked ? item.likes_count - 1 : item.likes_count + 1
                  };
                }
                return item;
              })
            )
          };
        });
      } else if (post.post_type === 'plant_share') {
        queryClient.setQueryData(['community-plant-shares'], (old: any) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page: any[]) =>
              page.map(item => {
                if (item.id === post.id) {
                  return {
                    ...item,
                    user_has_liked: !currentlyLiked,
                    likes_count: currentlyLiked ? item.likes_count - 1 : item.likes_count + 1
                  };
                }
                return item;
              })
            )
          };
        });
      }

      // Return a context object with the snapshotted values
      return { previousData, queryKeys, userId, post };
    },
    onError: (err, _args, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData && context?.queryKeys) {
        context.queryKeys.forEach(queryKey => {
          const key = queryKey.join('-');
          if (context.previousData[key] !== undefined) {
            queryClient.setQueryData(queryKey, context.previousData[key]);
          }
        });
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
      if (context?.queryKeys) {
        context.queryKeys.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }
    },
  });
} 