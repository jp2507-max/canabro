import React, { useState, useEffect } from 'react';
import { View, Text, Alert, Pressable, AccessibilityInfo, ViewStyle } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import {
  generateCDNImageURL,
  IMAGE_CACHE_POLICY,
  IMAGE_PRIORITY_HIGH,
  IMAGE_TRANSITION_DURATION,
  PLACEHOLDER_BLUR_HASH,
} from '@/lib/utils/image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';

import { useButtonAnimation } from '../../lib/animations/useButtonAnimation';
import { useCardAnimation } from '../../lib/animations/useCardAnimation';
import { useCommentLike } from '../../lib/hooks/community/useCommentLike';
import supabase from '../../lib/supabase';
import { Comment } from '../../lib/types/community';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import { triggerSuccessHaptic, triggerErrorHaptic } from '@/lib/utils/haptics';

interface CommentItemProps {
  comment: Comment & {
    profile?: {
      username: string;
      avatar_url: string | null;
    };
    image_url?: string | null;
    user_has_liked?: boolean;
    likes_count?: number;
  };
  currentUserId?: string;
  onReply?: (commentId: string, username: string) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Format a date string into a relative time string (e.g. "2m ago")
 */
function formatRelativeTime(dateString: string): string {
  if (!dateString) {
    console.warn('[CommentItem] Empty dateString provided to formatRelativeTime');
    return 'Unknown time';
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    console.warn('[CommentItem] Invalid dateString provided to formatRelativeTime:', dateString);
    return 'Invalid time';
  }

  const now = new Date();
  const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);

  if (diffSeconds < 60) return `${diffSeconds}s`;
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  const diffWeeks = Math.round(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}w`;
  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo`;
  const diffYears = Math.round(diffDays / 365);
  return `${diffYears}y`;
}

/**
 * CommentItem - Production-quality comment component with sophisticated animations
 * Uses custom animation hooks for consistent interaction patterns
 */
export default React.memo(function CommentItem({
  comment,
  currentUserId,
  onReply,
}: CommentItemProps) {
  // 🎬 Enhanced animation system using custom hooks
  const cardAnimation = useCardAnimation({
    enableShadowAnimation: true,
    enableHaptics: true,
    hapticStyle: 'light',
  });

  const likeButtonAnimation = useButtonAnimation({
    enableHaptics: true,
    hapticStyle: 'medium',
  });

  const replyButtonAnimation = useButtonAnimation({
    enableHaptics: true,
    hapticStyle: 'light',
  });

  const deleteButtonAnimation = useButtonAnimation({
    enableHaptics: true,
    hapticStyle: 'medium',
  });

  // 🎯 Multi-value animations for enhanced visual feedback
  const translateY = useSharedValue(30); // Entrance animation
  const opacity = useSharedValue(0); // Fade in effect
  const elevationValue = useSharedValue(2); // Dynamic elevation
  
  // 🎯 Use React Query hook for comment likes
  const commentLikeMutation = useCommentLike();
  
  const [userProfile, setUserProfile] = useState(
    comment.profile || {
      username: 'Unknown User',
      avatar_url: null,
    }
  );

  // Check if the current user is the author of this comment
  const isOwnComment = currentUserId === comment.user_id;

  // 🎬 Enhanced entrance animation with staggered effects
  const entranceStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  // 🎯 Dynamic shadow and elevation system
  const shadowStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      elevation: elevationValue.value,
      shadowOpacity: cardAnimation.sharedValues.shadowOpacity.value * 0.8, // Adjusted for comments
    };
  });

  // Initialize entrance animations
  useEffect(() => {
    const entranceDelay = Math.min(200, Math.random() * 100); // Staggered entrance

    const timeoutId = setTimeout(() => {
      opacity.value = withTiming(1, { duration: 400 });
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
      elevationValue.value = withSpring(4, { damping: 15, stiffness: 200 });
    }, entranceDelay);

    return () => clearTimeout(timeoutId);
  }, []);

  // Fetch profile information if not already available
  useEffect(() => {
    if (!comment.profile && comment.user_id) {
      const fetchProfile = async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', comment.user_id)
            .single();

          if (error) throw error;

          if (data) {
            setUserProfile(data);
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      };

      fetchProfile();
    }
  }, [comment.profile, comment.user_id]);

  /**
   * Handle liking/unliking a comment using React Query hook
   * Provides immediate feedback with optimistic updates
   */
  const handleLikeToggle = async () => {
    if (commentLikeMutation.isPending || !currentUserId) return;

    const currentlyLiked = comment.user_has_liked || false;

    try {
      await commentLikeMutation.mutateAsync({
        commentId: comment.id,
        userId: currentUserId,
        currentlyLiked,
      });
    } catch (error) {
      console.error('Error toggling comment like:', error);
      await triggerErrorHaptic();
    }
  };

  // Like state comes from the comment prop (fetched with like status)
  const isLiked = comment.user_has_liked || false;
  const likesCount = comment.likes_count || 0;

  /**
   * Handle replying to a comment
   */
  const handleReply = async () => {
    if (onReply) {
      onReply(comment.id, userProfile.username);
    }
  };

  /**
   * Handle deleting a comment (for own comments)
   */
  const handleDelete = async () => {
    if (!isOwnComment || !currentUserId) return;

    Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            // First get the post_id before deleting the comment
            const postId = comment.post_id;

            // Delete the comment
            const { error } = await supabase
              .from('comments')
              .delete()
              .eq('id', comment.id)
              .eq('user_id', currentUserId);

            if (error) throw error;

            // Decrement the post's comment count
            await supabase.rpc('decrement_comment_count', { post_id: postId }).throwOnError();

            // ✅ Success haptic feedback
            triggerSuccessHaptic();
          } catch (error) {
            console.error('Error deleting comment:', error);
            Alert.alert('Error', 'Failed to delete comment. Please try again.');
            // ✅ Error haptic feedback
            triggerErrorHaptic();
          }
        },
      },
    ]);
  };

  // 🎯 Modern gesture handlers using Gesture.Tap() API
  const likeGesture = Gesture.Tap()
    .enabled(!commentLikeMutation.isPending && !!currentUserId)
    .onBegin(() => {
      'worklet';
      // Enhanced animation with sequence for premium feel
      likeButtonAnimation.sharedValues.scale.value = withSequence(
        withSpring(0.85, { damping: 15, stiffness: 600 }),
        withSpring(isLiked ? 1.1 : 1.05, { damping: 12, stiffness: 400 }),
        withSpring(1, { damping: 15, stiffness: 300 })
      );

      // Dynamic elevation change
      elevationValue.value = withSpring(8, { damping: 15, stiffness: 400 });
    })
    .onEnd(() => {
      'worklet';
      // Reset elevation
      elevationValue.value = withSpring(4, { damping: 15, stiffness: 300 });
      runOnJS(handleLikeToggle)();
    });

  const replyGesture = Gesture.Tap()
    .enabled(!!onReply)
    .onBegin(() => {
      'worklet';
      replyButtonAnimation.sharedValues.scale.value = withSpring(0.92, {
        damping: 15,
        stiffness: 500,
      });
    })
    .onEnd(() => {
      'worklet';
      replyButtonAnimation.sharedValues.scale.value = withSpring(1, {
        damping: 15,
        stiffness: 400,
      });
      runOnJS(handleReply)();
    });

  const deleteGesture = Gesture.Tap()
    .enabled(isOwnComment)
    .onBegin(() => {
      'worklet';
      deleteButtonAnimation.sharedValues.scale.value = withSpring(0.9, {
        damping: 12,
        stiffness: 500,
      });
      // Subtle warning animation
      elevationValue.value = withSpring(6, { damping: 15, stiffness: 400 });
    })
    .onEnd(() => {
      'worklet';
      deleteButtonAnimation.sharedValues.scale.value = withSpring(1, {
        damping: 15,
        stiffness: 400,
      });
      elevationValue.value = withSpring(4, { damping: 15, stiffness: 300 });
      runOnJS(handleDelete)();
    });

  return (
    <Animated.View
      style={[cardAnimation.animatedStyle, shadowStyle, entranceStyle]}
      className="mx-4 mb-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900 dark:shadow-zinc-800/50"
      accessibilityLabel={`Comment by ${userProfile.username}`}>
      <View className="flex-row">
        {/* User Avatar */}
        <View className="mr-3">
          <View
            className="h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
            accessibilityLabel={`${userProfile.username}'s avatar`}>
            {userProfile.avatar_url ? (
              <ExpoImage
                source={generateCDNImageURL(userProfile.avatar_url, 'thumbnail')}
                className="h-full w-full"
                contentFit="cover"
                cachePolicy={IMAGE_CACHE_POLICY}
                transition={{ duration: IMAGE_TRANSITION_DURATION }}
                placeholder={{ blurhash: PLACEHOLDER_BLUR_HASH }}
              />
            ) : (
              <OptimizedIcon
                name="person-circle-outline"
                size={20}
                color="#71717a" // zinc-500
              />
            )}
          </View>
        </View>

        {/* Comment Content */}
        <View className="flex-1">
          {/* Username and Timestamp */}
          <View className="mb-2 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Text className="mr-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {userProfile.username}
              </Text>
              {isOwnComment && (
                <View className="rounded-full bg-primary-100 px-2 py-0.5 dark:bg-primary-900">
                  <Text className="text-xs font-medium text-primary-700 dark:text-primary-300">
                    You
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-xs text-zinc-500 dark:text-zinc-400">
              {formatRelativeTime(comment.created_at)}
            </Text>
          </View>

          {/* Comment Text */}
          <Text className="mb-3 text-sm leading-5 text-zinc-800 dark:text-zinc-200">
            {comment.content}
          </Text>

          {/* Comment Image (if any) */}
          {comment.image_url && (
            <View className="mb-3 overflow-hidden rounded-xl">
              <ExpoImage
                source={generateCDNImageURL(comment.image_url, 'small')}
                className="h-48 w-full bg-zinc-100 dark:bg-zinc-800"
                contentFit="cover"
                cachePolicy={IMAGE_CACHE_POLICY}
                priority={IMAGE_PRIORITY_HIGH}
                transition={{ duration: IMAGE_TRANSITION_DURATION }}
                placeholder={{ blurhash: PLACEHOLDER_BLUR_HASH }}
              />
            </View>
          )}

          {/* Enhanced Actions with Modern Gesture System */}
          <View className="flex-row items-center">
            {/* 💝 Enhanced Like Button with Sophisticated Animations */}
            <GestureDetector gesture={likeGesture}>
              <Animated.View style={likeButtonAnimation.animatedStyle} className="mr-4">
                <AnimatedPressable
                  className="flex-row items-center rounded-lg px-2 py-1 active:bg-zinc-100 dark:active:bg-zinc-800"
                  accessibilityLabel={isLiked ? 'Unlike comment' : 'Like comment'}
                  hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <OptimizedIcon
                    name={isLiked ? 'heart' : 'heart-outline'}
                    size={16}
                    color={isLiked ? '#ef4444' : '#71717a'} // red-500 if liked, zinc-500 if not
                  />
                  {likesCount > 0 ? (
                    <Text className="ml-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {likesCount}
                    </Text>
                  ) : null}
                </AnimatedPressable>
              </Animated.View>
            </GestureDetector>

            {/* 💬 Enhanced Reply Button */}
            {onReply && (
              <GestureDetector gesture={replyGesture}>
                <Animated.View style={replyButtonAnimation.animatedStyle} className="mr-4">
                  <AnimatedPressable
                    className="flex-row items-center rounded-lg px-2 py-1 active:bg-zinc-100 dark:active:bg-zinc-800"
                    accessibilityLabel="Reply to comment"
                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <OptimizedIcon
                      name="chatbubble-outline"
                      size={16}
                      color="#71717a" // zinc-500
                    />
                    <Text className="ml-1 text-xs text-zinc-500 dark:text-zinc-400">Reply</Text>
                  </AnimatedPressable>
                </Animated.View>
              </GestureDetector>
            )}

            {/* 🗑️ Enhanced Delete Button (only for own comments) */}
            {isOwnComment && (
              <GestureDetector gesture={deleteGesture}>
                <Animated.View style={deleteButtonAnimation.animatedStyle}>
                  <AnimatedPressable
                    className="flex-row items-center rounded-lg px-2 py-1 active:bg-red-50 dark:active:bg-red-900/20"
                    accessibilityLabel="Delete comment"
                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <OptimizedIcon
                      name="trash-outline"
                      size={16}
                      color="#ef4444" // red-500
                    />
                    <Text className="ml-1 text-xs text-red-500 dark:text-red-400">Delete</Text>
                  </AnimatedPressable>
                </Animated.View>
              </GestureDetector>
            )}
          </View>
        </View>
      </View>
    </Animated.View>
  );
});
