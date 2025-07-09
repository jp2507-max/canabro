
import { useMutation, useQueryClient } from '@tanstack/react-query';
import supabase from '../../supabase';
import { triggerLightHaptic } from '../../utils/haptics';
import { useAuth } from '../../contexts/AuthProvider';
import useWatermelon from '../useWatermelon';
import { Q } from '@nozbe/watermelondb';
// Minimal PostData type for cache updates
interface PostData {
  id: string;
  comments_count: number;
  [key: string]: string | number | boolean | null | undefined;
}

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
  const { user } = useAuth();
  const { profiles } = useWatermelon();

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

      // Fetch the current user's profile from WatermelonDB
      let username = 'You';
      let avatar_url: string | null = null;
      if (user?.id) {
        try {
          const userProfileArr = await profiles.query(Q.where('user_id', user.id)).fetch();
          const userProfile = userProfileArr.length > 0 ? userProfileArr[0] : undefined;
          if (userProfile) {
            username = userProfile.username || 'You';
            avatar_url = userProfile.avatarUrl || null;
          }
        } catch (_err) {
          // fallback to defaults
        }
      }

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
          username,
          avatar_url
        }
      };

      // Optimistically update the cache
      queryClient.setQueryData<CommentData[]>(['comments', postId], (old) => {
        if (!old) return [optimisticComment];
        return [...old, optimisticComment];
      });

      // Also update the post's comment count
      queryClient.setQueryData<PostData[]>(['posts'], (old) => {
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
      queryClient.setQueryData<PostData[]>(['posts'], (old) => {
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