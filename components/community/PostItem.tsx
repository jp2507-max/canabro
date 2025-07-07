import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import React, { useCallback, useEffect, useMemo } from 'react';
import { Pressable, View, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  runOnJS,
  cancelAnimation,
  interpolateColor as rInterpolateColor,
} from 'react-native-reanimated';

import UserAvatar from './UserAvatar';
import PostTypeHeader from './PostTypeHeader';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import NetworkResilientImage from '../ui/NetworkResilientImage';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerLightHapticSync,
  triggerMediumHapticSync,
} from '../../lib/utils/haptics';
import { 
  COMMUNITY_ANIMATION_CONFIG, 
  COMMUNITY_SCALE_VALUES,
  PostData
} from '@/lib/types/community';

dayjs.extend(relativeTime);

// Define the props for the PostItem component
interface PostItemProps {
  post: PostData;
  currentUserId?: string;
  onLike: (postId: string, currentlyLiked: boolean) => void;
  onComment: (postId: string) => void;
  onUserPress: (userId: string) => void;
  onImagePress?: (imageUrl: string) => void;
  liking?: boolean;
}

// Using shared animation configurations from community types
const ANIMATION_CONFIG = COMMUNITY_ANIMATION_CONFIG;
const SCALE_VALUES = COMMUNITY_SCALE_VALUES;

const PostItem: React.FC<PostItemProps> = React.memo(
  ({ post, currentUserId: _currentUserId, onLike, onComment, onUserPress, onImagePress, liking = false }) => {
    // 🎬 Enhanced Reanimated v3 + React Compiler Compatible Animation System
    const scale = useSharedValue(1);
    const shadowOpacity = useSharedValue(0.15);
    const elevation = useSharedValue(4);
    const likeIconScale = useSharedValue(1);
    const commentIconScale = useSharedValue(1);
    const likeIconOpacity = useSharedValue(1);
    const backgroundOpacity = useSharedValue(1);
    const cardBorderRadius = useSharedValue(24);

    // 🎯 Enhanced animated styles with color interpolation and sophisticated effects
    const animatedContainerStyle = useAnimatedStyle(() => {
      const currentScale = scale.value;
      const currentShadowOpacity = shadowOpacity.value;
      const currentElevation = elevation.value;
      const currentBackgroundOpacity = backgroundOpacity.value;
      const currentBorderRadius = cardBorderRadius.value;

      return {
        transform: [{ scale: currentScale }],
        shadowOpacity: currentShadowOpacity,
        elevation: currentElevation,
        opacity: currentBackgroundOpacity,
        borderRadius: currentBorderRadius,
      };
    });

    const animatedLikeStyle = useAnimatedStyle(() => {
      const currentScale = likeIconScale.value;
      const currentOpacity = likeIconOpacity.value;

      // 🎨 Color interpolation for dynamic like button feedback
      const backgroundColor = rInterpolateColor(
        currentScale,
        [0.85, 1, 1.1],
        ['rgba(239, 68, 68, 0.1)', 'transparent', 'rgba(239, 68, 68, 0.15)']
      );

      return {
        transform: [{ scale: currentScale }],
        opacity: currentOpacity,
        backgroundColor,
      };
    });

    const animatedCommentStyle = useAnimatedStyle(() => {
      const currentScale = commentIconScale.value;

      // 🎨 Subtle background color change on press
      const backgroundColor = rInterpolateColor(
        currentScale,
        [0.9, 1],
        ['rgba(113, 113, 122, 0.1)', 'transparent']
      );

      return {
        transform: [{ scale: currentScale }],
        backgroundColor,
      };
    });

    // ♻️ Enhanced cleanup animations on unmount
    useEffect(() => {
      return () => {
        cancelAnimation(scale);
        cancelAnimation(shadowOpacity);
        cancelAnimation(elevation);
        cancelAnimation(likeIconScale);
        cancelAnimation(commentIconScale);
        cancelAnimation(likeIconOpacity);
        cancelAnimation(backgroundOpacity);
        cancelAnimation(cardBorderRadius);
      };
    }, []);

    // 🎯 Optimized computed values for performance
    const displayName = useMemo(
      () => post.profiles?.username || `User ${post.profiles?.id?.slice(0, 8) || 'Unknown'}`,
      [post.profiles?.username, post.profiles?.id]
    );

    const timeAgo = useMemo(() => dayjs(post.created_at).fromNow(), [post.created_at]);

    const isLiked = useMemo(() => post.user_has_liked, [post.user_has_liked]);

    const avatarUri = useMemo(
      () => post.profiles?.avatar_url || 'https://via.placeholder.com/48',
      [post.profiles?.avatar_url]
    ); // 🎯 Enhanced event handlers with sophisticated haptic feedback
    const handleUserPress = useCallback(async () => {
      const profileId = post.profiles?.id;
      if (profileId) {
        onUserPress(profileId);
      }
    }, [post.profiles?.id, onUserPress]);

    const handleLike = useCallback(async () => {
      if (isLiked) {
        await triggerLightHaptic();
      } else {
        await triggerMediumHaptic();
      }
      onLike(post.id, isLiked);
    }, [post.id, isLiked, onLike]);

    const handleComment = useCallback(async () => {
      await triggerLightHaptic();
      onComment(post.id);
    }, [post.id, onComment]);

    const handleImagePress = useCallback(async () => {
      await triggerLightHaptic();
      const imageUrl = post.image_url;
      if (imageUrl && onImagePress) {
        onImagePress(imageUrl);
      }
    }, [post.image_url, onImagePress]);

    // 🎯 Enhanced Modern Gesture Handlers with sophisticated animation sequences
    const userPressGesture = Gesture.Tap()
      .onBegin(() => {
        'worklet';
        scale.value = withSpring(SCALE_VALUES.cardPress, ANIMATION_CONFIG.card);
        shadowOpacity.value = withSpring(0.25, ANIMATION_CONFIG.quick);
        cardBorderRadius.value = withSpring(28, ANIMATION_CONFIG.quick);
      })
      .onEnd(() => {
        'worklet';
        scale.value = withSpring(1, ANIMATION_CONFIG.card);
        shadowOpacity.value = withSpring(0.15, ANIMATION_CONFIG.quick);
        cardBorderRadius.value = withSpring(24, ANIMATION_CONFIG.quick);
        runOnJS(triggerLightHapticSync)();
        runOnJS(handleUserPress)();
      });

    const likeGesture = Gesture.Tap()
      .onBegin(() => {
        'worklet';
        likeIconScale.value = withSpring(SCALE_VALUES.likePress, ANIMATION_CONFIG.like);
        shadowOpacity.value = withSpring(0.25);
      })
      .onEnd(() => {
        'worklet';
        // 🎨 Enhanced like animation with sequence for premium feel
        likeIconScale.value = withSequence(
          withSpring(isLiked ? SCALE_VALUES.likeActive : 1, ANIMATION_CONFIG.like),
          withSpring(1, { damping: 12, stiffness: 400 })
        );
        shadowOpacity.value = withSpring(0.15);
        if (isLiked) {
          runOnJS(triggerLightHapticSync)();
        } else {
          runOnJS(triggerMediumHapticSync)();
        }
        runOnJS(handleLike)();
      })
      .enabled(!liking);

    const commentGesture = Gesture.Tap()
      .onBegin(() => {
        'worklet';
        commentIconScale.value = withSpring(SCALE_VALUES.buttonPress, ANIMATION_CONFIG.button);
      })
      .onEnd(() => {
        'worklet';
        commentIconScale.value = withSpring(1, ANIMATION_CONFIG.button);
        runOnJS(triggerLightHapticSync)();
        runOnJS(handleComment)();
      });

    const imageGesture = Gesture.Tap()
      .onBegin(() => {
        'worklet';
        scale.value = withSpring(SCALE_VALUES.imagePress, ANIMATION_CONFIG.image);
        shadowOpacity.value = withSpring(0.25);
      })
      .onEnd(() => {
        'worklet';
        scale.value = withSpring(1, ANIMATION_CONFIG.image);
        shadowOpacity.value = withSpring(0.15);
        runOnJS(triggerLightHapticSync)();
        runOnJS(handleImagePress)();
      });

    return (
      <Animated.View
        style={[
          animatedContainerStyle,
          {
            // 🎨 Enhanced shadow system with neutral colors
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 8 },
            shadowRadius: 16,
            elevation: 4,
          },
        ]}
        className="mb-6 overflow-hidden rounded-3xl border border-neutral-100 bg-white dark:border-zinc-800 dark:bg-zinc-900"
        accessibilityRole="text"
        accessibilityLabel={`Post by ${displayName}`}>
        {/* 👤 Enhanced User Header with sophisticated gesture handling */}
        <GestureDetector gesture={userPressGesture}>
          <Pressable
            className="flex-row items-center p-5 pb-4 active:opacity-90"
            accessibilityRole="button"
            accessibilityLabel={`View ${displayName}'s profile`}
            accessibilityHint="Double-tap to view user profile">
            <UserAvatar uri={avatarUri} size={48} />
            <View className="ml-4 flex-1">
              <Text className="mb-1 text-xl font-bold leading-tight text-zinc-900 dark:text-zinc-100">
                {displayName}
              </Text>
              <Text className="text-base font-medium text-zinc-500 dark:text-zinc-400">
                {timeAgo}
              </Text>
            </View>
          </Pressable>
        </GestureDetector>

        {/* 📋 Post Type Header for Questions & Plant Shares */}
        <View className="px-5">
          <PostTypeHeader post={post} />
        </View>

        {/* 📝 Enhanced Post Content with improved typography */}
        {post.content && (
          <View className="mb-5 px-5">
            <Text className="text-lg font-normal leading-7 text-zinc-900 dark:text-zinc-100">
              {post.content}
            </Text>
          </View>
        )}

        {/* 🖼️ Enhanced Post Image with sophisticated gesture handling */}
        {post.image_url && (
          <GestureDetector gesture={imageGesture}>
            <Pressable
              className="mx-5 mb-5 overflow-hidden rounded-2xl bg-zinc-100 active:opacity-95 dark:bg-zinc-800"
              accessibilityRole="imagebutton"
              accessibilityLabel="View post image"
              accessibilityHint="Double-tap to view image in full screen">
              <View className="aspect-[4/3]">
                {post.hasCorruptedImage ? (
                  <View className="flex-1 items-center justify-center bg-zinc-100 dark:bg-zinc-800">
                    <OptimizedIcon name="image-outline" size={56} color="#71717a" />
                    <Text className="mt-3 text-base font-medium text-zinc-500 dark:text-zinc-400">
                      Image unavailable
                    </Text>
                  </View>
                ) : (
                  <NetworkResilientImage
                    url={post.image_url}
                    height="100%"
                    width="100%"
                    contentFit="cover"
                    fallbackIconName="image-outline"
                    fallbackIconSize={56}
                    maxRetries={3}
                    retryDelayMs={800}
                    timeoutMs={6000}
                    enableRetry={true}
                    showProgress={true}
                  />
                )}
              </View>
            </Pressable>
          </GestureDetector>
        )}

        {/* 🎯 Enhanced Action Buttons with sophisticated gesture handling and visual polish */}
        <View className="flex-row items-center justify-start border-t border-zinc-200 bg-zinc-50/50 px-5 py-4 dark:border-zinc-700 dark:bg-zinc-800/50">
          {/* ❤️ Enhanced Like Button with dynamic styling and animation */}
          <GestureDetector gesture={likeGesture}>
            <Animated.View style={animatedLikeStyle} className="-m-2 mr-8 rounded-xl p-2">
              <Pressable
                className="flex-row items-center"
                accessibilityRole="button"
                accessibilityLabel={isLiked ? 'Unlike post' : 'Like post'}
                accessibilityState={{ selected: isLiked }}>
                <OptimizedIcon
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={24}
                  color={isLiked ? '#ef4444' : '#71717a'}
                />
                {post.likes_count > 0 ? (
                  <Text className="ml-3 text-base font-semibold text-zinc-700 dark:text-zinc-300">
                    {post.likes_count}
                  </Text>
                ) : null}
              </Pressable>
            </Animated.View>
          </GestureDetector>

          {/* 💬 Enhanced Comment Button with dynamic styling and animation */}
          <GestureDetector gesture={commentGesture}>
            <Animated.View style={animatedCommentStyle} className="-m-2 rounded-xl p-2">
              <Pressable
                className="flex-row items-center"
                accessibilityRole="button"
                accessibilityLabel="Comment on post"
                accessibilityHint="Double-tap to add a comment">
                <OptimizedIcon name="chatbubble-outline" size={24} color="#71717a" />
                {post.comments_count > 0 ? (
                  <Text className="ml-3 text-base font-semibold text-zinc-700 dark:text-zinc-300">
                    {post.comments_count}
                  </Text>
                ) : null}
              </Pressable>
            </Animated.View>
          </GestureDetector>
        </View>
      </Animated.View>
    );
  }
);

export default PostItem;
