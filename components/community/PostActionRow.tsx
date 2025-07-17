/**
 * PostActionRow - Reusable action buttons for all post types
 * Eliminates duplicate like/comment/share logic across QuestionPostItem and PlantSharePostItem components
 */

import React, { useCallback, useRef, useEffect } from 'react';
import { View, Pressable, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import { triggerLightHapticSync } from '../../lib/utils/haptics';
import { SPRING_CONFIGS, SCALE_VALUES } from '../../lib/constants/animations';
import { useTranslation } from 'react-i18next';

interface PostActionRowProps {
  likes_count: number;
  comments_count: number;
  user_has_liked: boolean;
  onLike: () => void;
  onComment: () => void;
  onDelete?: () => void;
  liking?: boolean;
  deleting?: boolean;
  showDelete?: boolean;
  accentColor?: 'blue' | 'green' | 'neutral';
  className?: string;
}

export default function PostActionRow({
  likes_count,
  comments_count,
  user_has_liked,
  onLike,
  onComment,
  onDelete,
  liking = false,
  deleting = false,
  showDelete = false,
  accentColor = 'neutral',
  className = '',
}: PostActionRowProps) {
  const { t } = useTranslation('community');
  const likeScale = useSharedValue(1);
  const commentScale = useSharedValue(1);
  const deleteScale = useSharedValue(1);

  // Get accent colors based on post type
  const getAccentColors = () => {
    switch (accentColor) {
      case 'blue':
        return {
          liked: 'text-blue-500 dark:text-blue-400',
          unliked: 'text-neutral-500 dark:text-neutral-400',
        };
      case 'green':
        return {
          liked: 'text-green-500 dark:text-green-400',
          unliked: 'text-neutral-500 dark:text-neutral-400',
        };
      default:
        return {
          liked: 'text-red-500 dark:text-red-400',
          unliked: 'text-neutral-500 dark:text-neutral-400',
        };
    }
  };

  const colors = getAccentColors();

  const animatedLikeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const animatedCommentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: commentScale.value }],
  }));

  const animatedDeleteStyle = useAnimatedStyle(() => ({
    transform: [{ scale: deleteScale.value }],
  }));


  // Timeout refs for cleanup
  const likeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const commentTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const deleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleLike = useCallback(async () => {
    if (liking) return;

    await triggerLightHapticSync();
    likeScale.value = withSpring(SCALE_VALUES.likePress, SPRING_CONFIGS.like);
    const hasLiked = user_has_liked;
    if (likeTimeoutRef.current) clearTimeout(likeTimeoutRef.current);
    likeTimeoutRef.current = setTimeout(() => {
      likeScale.value = withSpring(hasLiked ? 1 : SCALE_VALUES.likeActive, SPRING_CONFIGS.like);
    }, 100);

    onLike();
  }, [liking, onLike, user_has_liked, likeScale]);

  const handleComment = useCallback(async () => {
    await triggerLightHapticSync();
    commentScale.value = withSpring(SCALE_VALUES.buttonPress, SPRING_CONFIGS.button);
    if (commentTimeoutRef.current) clearTimeout(commentTimeoutRef.current);
    commentTimeoutRef.current = setTimeout(() => {
      commentScale.value = withSpring(1, SPRING_CONFIGS.button);
    }, 100);
    onComment();
  }, [onComment, commentScale]);

  const handleDelete = useCallback(async () => {
    if (deleting || !onDelete) return;

    await triggerLightHapticSync();
    deleteScale.value = withSpring(SCALE_VALUES.buttonPress, SPRING_CONFIGS.button);
    if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
    deleteTimeoutRef.current = setTimeout(() => {
      deleteScale.value = withSpring(1, SPRING_CONFIGS.button);
    }, 100);
    onDelete();
  }, [deleting, onDelete, deleteScale]);

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      if (likeTimeoutRef.current) clearTimeout(likeTimeoutRef.current);
      if (commentTimeoutRef.current) clearTimeout(commentTimeoutRef.current);
      if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
    };
  }, []);

  return (
    <View className={`flex-row items-center justify-between pt-3 ${className}`}>
      {/* Like Button */}
      <Animated.View style={animatedLikeStyle}>
        <Pressable
          onPress={handleLike}
          disabled={liking}
          className="flex-row items-center"
          accessibilityRole="button"
          accessibilityLabel={`${user_has_liked ? t('postActionRow.unlikePost') : t('postActionRow.likePost')}`}
          accessibilityState={{ selected: user_has_liked }}
        >
          <OptimizedIcon
            name={user_has_liked ? 'heart' : 'heart-outline'}
            size={20}
            className={user_has_liked ? colors.liked : colors.unliked}
          />
          <Text className={`ml-2 text-sm font-medium ${
            user_has_liked ? colors.liked : colors.unliked
          }`}>
            {likes_count}
          </Text>
        </Pressable>
      </Animated.View>

      {/* Comment Button */}
      <Animated.View style={animatedCommentStyle}>
        <Pressable
          onPress={handleComment}
          className="flex-row items-center"
          accessibilityRole="button"
          accessibilityLabel={t('postActionRow.viewComments', { count: comments_count })}
        >
          <OptimizedIcon
            name="chatbubble-outline"
            size={20}
            className="text-neutral-500 dark:text-neutral-400"
          />
          <Text className="ml-2 text-sm font-medium text-neutral-500 dark:text-neutral-400">
            {comments_count}
          </Text>
        </Pressable>
      </Animated.View>

      {/* Share Button */}
      <Pressable
        className="flex-row items-center"
        accessibilityRole="button"
        accessibilityLabel={t('postActionRow.sharePost')}
      >
        <OptimizedIcon
          name="share"
          size={20}
          className="text-neutral-500 dark:text-neutral-400"
        />
      </Pressable>

      {/* Delete Button (only shown for user's own posts) */}
      {showDelete && (
        <Animated.View style={animatedDeleteStyle}>
          <Pressable
            onPress={handleDelete}
            disabled={deleting}
            className="flex-row items-center"
            accessibilityRole="button"
            accessibilityLabel={t('postActionRow.deletePost')}
          >
            <OptimizedIcon
              name={deleting ? "loading1" : "trash-outline"}
              size={20}
              className="text-red-500 dark:text-red-400"
            />
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}
