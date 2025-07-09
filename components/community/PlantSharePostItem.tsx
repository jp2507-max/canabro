/**
 * PlantSharePostItem - Specialized component for plant shares with green accent styling
 *
 * Features:
 * - Green accent theme for plant shares
 * - Growth stage indicators and care tips
 * - Enhanced visual hierarchy for plant data
 * - Sophisticated animations and haptics (ported from legacy PostItem)
 * - Advanced gesture handling and interactions
 * - Full accessibility support
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import { OptimizedIcon } from '../ui/OptimizedIcon';
import NetworkResilientImage from '../ui/NetworkResilientImage';
import UserAvatar from './UserAvatar';
import TagPill from '../ui/TagPill';
import DeletePostModal from './DeletePostModal';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerLightHapticSync,
} from '../../lib/utils/haptics';
import { 
  COMMUNITY_ANIMATION_CONFIG, 
  COMMUNITY_SCALE_VALUES,
} from '@/lib/types/community';
import type { CommunityPlantShare } from '../../lib/types/community';

dayjs.extend(relativeTime);

interface PlantSharePostItemProps {
  plantShare: CommunityPlantShare;
  currentUserId?: string;
  onLike: (plantShareId: string, currentlyLiked: boolean) => void;
  onComment: (plantShareId: string) => void;
  onDelete?: (plantShareId: string) => void;
  onUserPress: (userId: string) => void;
  onImagePress?: (imageUrl: string) => void;
  onPress?: (plantShareId: string) => void;
  liking?: boolean;
  deleting?: boolean;
}

// Using shared animation configurations from community types
const ANIMATION_CONFIG = COMMUNITY_ANIMATION_CONFIG;
const SCALE_VALUES = COMMUNITY_SCALE_VALUES;

const PlantSharePostItem: React.FC<PlantSharePostItemProps> = React.memo(
  ({ 
    plantShare,
    currentUserId,
    onLike,
    onComment,
    onDelete,
    onUserPress,
    onImagePress,
    onPress,
    liking = false,
    deleting = false,
  }) => {
    // State for delete confirmation modal
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Enhanced Reanimated v3 + React Compiler Compatible Animation System
    const scale = useSharedValue(1);
    const shadowOpacity = useSharedValue(0.15);
    const elevation = useSharedValue(4);
    const backgroundOpacity = useSharedValue(1);
    const cardBorderRadius = useSharedValue(24);

    // Enhanced animated styles with color interpolation and sophisticated effects
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

    // Enhanced cleanup animations on unmount
    useEffect(() => {
      return () => {
        cancelAnimation(scale);
        cancelAnimation(shadowOpacity);
        cancelAnimation(elevation);
        cancelAnimation(backgroundOpacity);
        cancelAnimation(cardBorderRadius);
      };
    }, []);

    // Optimized computed values for performance
    const displayName = useMemo(
      () => plantShare.username || 'Anonymous User',
      [plantShare.username]
    );

    const timeAgo = useMemo(() => dayjs(plantShare.created_at).fromNow(), [plantShare.created_at]);

    const isLiked = useMemo(() => plantShare.user_has_liked ?? false, [plantShare.user_has_liked]);

    const growthStageColor = useMemo(() => {
      switch (plantShare.growth_stage) {
        case 'seedling': return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300';
        case 'vegetative': return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300';
        case 'flowering': return 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300';
        case 'harvest': return 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300';
        case 'curing': return 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300';
        default: return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300';
      }
    }, [plantShare.growth_stage]);

    // Check if current user owns this plant share
    const canDelete = useMemo(() => {
      return currentUserId && plantShare.user_id && currentUserId === plantShare.user_id;
    }, [currentUserId, plantShare.user_id]);

    // Handle delete button press
    const handleDeletePress = useCallback(async () => {
      await triggerLightHaptic();
      setShowDeleteModal(true);
    }, []);

    // Handle delete confirmation
    const handleDeleteConfirm = useCallback(async () => {
      if (onDelete) {
        onDelete(plantShare.id);
      }
      setShowDeleteModal(false);
    }, [onDelete, plantShare.id]);

    // Handle delete modal close
    const handleDeleteCancel = useCallback(() => {
      setShowDeleteModal(false);
    }, []);

    // Enhanced event handlers with sophisticated haptic feedback
    const handleUserPress = useCallback(async () => {
      onUserPress(plantShare.user_id);
    }, [plantShare.user_id, onUserPress]);

    const handleLike = useCallback(async () => {
      if (isLiked) {
        await triggerLightHaptic();
      } else {
        await triggerMediumHaptic();
      }
      onLike(plantShare.id, isLiked);
    }, [plantShare.id, isLiked, onLike]);

    const handleComment = useCallback(async () => {
      await triggerLightHaptic();
      onComment(plantShare.id);
    }, [plantShare.id, onComment]);

    const handleImagePress = useCallback(async (imageUrl: string) => {
      await triggerLightHaptic();
      if (onImagePress) {
        onImagePress(imageUrl);
      }
    }, [onImagePress]);

    const handlePress = useCallback(async () => {
      await triggerLightHaptic();
      if (onPress) {
        onPress(plantShare.id);
      }
    }, [plantShare.id, onPress]);

    // Enhanced Modern Gesture Handlers with sophisticated animation sequences
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

    const cardPressGesture = Gesture.Tap()
      .onBegin(() => {
        'worklet';
        scale.value = withSpring(SCALE_VALUES.cardPress, ANIMATION_CONFIG.card);
        shadowOpacity.value = withSpring(0.25, ANIMATION_CONFIG.quick);
      })
      .onEnd(() => {
        'worklet';
        scale.value = withSpring(1, ANIMATION_CONFIG.card);
        shadowOpacity.value = withSpring(0.15, ANIMATION_CONFIG.quick);
        runOnJS(triggerLightHapticSync)();
        runOnJS(handlePress)();
      });

    return (
      <Animated.View
        style={[
          animatedContainerStyle,
          {
            // Enhanced shadow system with neutral colors
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 8 },
            shadowRadius: 16,
            elevation: 4,
          },
        ]}
        className="mb-6 overflow-hidden rounded-3xl border border-green-100 bg-white dark:border-green-900/30 dark:bg-neutral-900"
        accessibilityRole="text"
        accessibilityLabel={`Plant share: ${plantShare.plant_name} by ${displayName}`}
      >
        <GestureDetector gesture={onPress ? cardPressGesture : Gesture.Tap()}>
          <Pressable
            className="active:opacity-90"
            accessibilityRole="button"
            accessibilityLabel={`View plant share: ${plantShare.plant_name}`}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between p-5 pb-4">
              <View className="flex-row items-center">
                <View className="flex-row items-center bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full mr-3">
                  <OptimizedIcon
                    name="leaf"
                    size={14}
                    className="text-green-600 dark:text-green-400 mr-1"
                  />
                  <Text className="text-xs font-medium text-green-600 dark:text-green-400">
                    Plant Share
                  </Text>
                </View>

                <View className={`px-2 py-1 rounded-full ${growthStageColor}`}>
                  <Text className="text-xs font-medium capitalize">
                    {plantShare.growth_stage}
                  </Text>
                </View>
              </View>

              {plantShare.is_featured && (
                <View className="bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-full">
                  <OptimizedIcon
                    name="star"
                    size={14}
                    className="text-yellow-600 dark:text-yellow-400"
                  />
                </View>
              )}
            </View>

            {/* Enhanced User Header with sophisticated gesture handling */}
            <GestureDetector gesture={userPressGesture}>
              <Pressable
                className="flex-row items-center px-5 pb-4 active:opacity-90"
                accessibilityRole="button"
                accessibilityLabel={`View ${displayName}'s profile`}
                accessibilityHint="Double-tap to view user profile"
              >
                <UserAvatar
                  uri={plantShare.avatar_url || ''}
                  size={48}
                />
                <View className="ml-4 flex-1">
                  <Text className="mb-1 text-xl font-bold leading-tight text-neutral-900 dark:text-neutral-100">
                    {displayName}
                  </Text>
                  <Text className="text-base font-medium text-neutral-500 dark:text-neutral-400">
                    {timeAgo}
                  </Text>
                </View>
              </Pressable>
            </GestureDetector>

            {/* Plant Info */}
            <View className="px-5 mb-3">
              <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-1 leading-tight">
                {plantShare.plant_name}
              </Text>
              {plantShare.strain_name && (
                <Text className="text-lg font-medium text-green-600 dark:text-green-400 mb-2">
                  {plantShare.strain_name}
                </Text>
              )}
            </View>

            {/* Enhanced Post Content with improved typography */}
            <View className="mb-5 px-5">
              <Text className="text-lg font-normal leading-7 text-neutral-900 dark:text-neutral-100">
                {plantShare.content}
              </Text>
            </View>

            {/* Care Tips Preview */}
            {plantShare.care_tips && (
              <View className="bg-green-50 dark:bg-green-900/10 p-4 rounded-2xl mx-5 mb-5">
                <Text className="text-sm font-semibold text-green-700 dark:text-green-300 mb-2">
                  💡 Care Tips
                </Text>
                <Text className="text-base text-green-600 dark:text-green-400 leading-6">
                  {plantShare.care_tips}
                </Text>
              </View>
            )}

            {/* Environment & Medium Tags */}
            <View className="flex-row flex-wrap px-5 mb-5">
              {plantShare.environment && (
                <TagPill
                  text={plantShare.environment}
                  variant="green"
                  size="small"
                  selected={false}
                  onPress={() => {}}
                  className="mb-2"
                />
              )}
              {plantShare.growing_medium && (
                <TagPill
                  text={plantShare.growing_medium.replace('_', ' ')}
                  variant="neutral"
                  size="small"
                  selected={false}
                  onPress={() => {}}
                  className="mb-2"
                />
              )}
            </View>

            {/* Enhanced Image Gallery with sophisticated gesture handling */}
            {plantShare.images_urls && plantShare.images_urls.length > 0 && (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                className="mb-5 px-5"
                contentContainerStyle={{ paddingRight: 20 }}
              >
                {plantShare.images_urls.map((imageUrl, index) => {
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
                      runOnJS(handleImagePress)(imageUrl);
                    });

                  return (
                    <GestureDetector key={index} gesture={imageGesture}>
                      <Pressable
                        className="mr-3 overflow-hidden rounded-2xl bg-neutral-100 active:opacity-95 dark:bg-neutral-800"
                        accessibilityRole="imagebutton"
                        accessibilityLabel="View plant image"
                        accessibilityHint="Double-tap to view image in full screen"
                      >
                        <View style={{ width: 128, height: 128 }}>
                          <NetworkResilientImage
                            url={imageUrl}
                            width={128}
                            height={128}
                            contentFit="cover"
                            fallbackIconName="image-outline"
                            fallbackIconSize={32}
                            maxRetries={3}
                            retryDelayMs={800}
                            timeoutMs={6000}
                            enableRetry={true}
                            showProgress={true}
                          />
                        </View>
                      </Pressable>
                    </GestureDetector>
                  );
                })}
              </ScrollView>
            )}

            {/* Enhanced Action Buttons */}
            <View className="flex-row items-center justify-between px-5 pb-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <View className="flex-row items-center">
                <Pressable
                  onPress={handleLike}
                  disabled={liking}
                  className="flex-row items-center mr-6 active:opacity-70"
                  accessibilityRole="button"
                  accessibilityLabel={isLiked ? 'Unlike plant share' : 'Like plant share'}
                >
                  <OptimizedIcon
                    name={isLiked ? 'heart' : 'heart-outline'}
                    size={24}
                    className={isLiked ? 'text-red-500' : 'text-neutral-500 dark:text-neutral-400'}
                  />
                  <Text className="text-base font-medium text-neutral-600 dark:text-neutral-400 ml-2">
                    {plantShare.likes_count}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleComment}
                  className="flex-row items-center mr-6 active:opacity-70"
                  accessibilityRole="button"
                  accessibilityLabel="View comments"
                >
                  <OptimizedIcon
                    name="chatbubble-outline"
                    size={24}
                    className="text-neutral-500 dark:text-neutral-400"
                  />
                  <Text className="text-base font-medium text-neutral-600 dark:text-neutral-400 ml-2">
                    {plantShare.comments_count}
                  </Text>
                </Pressable>

                <View className="flex-row items-center mr-6">
                  <OptimizedIcon
                    name="share"
                    size={24}
                    className="text-neutral-500 dark:text-neutral-400"
                  />
                  <Text className="text-base font-medium text-neutral-600 dark:text-neutral-400 ml-2">
                    {plantShare.shares_count}
                  </Text>
                </View>
              </View>

              {canDelete && (
                <Pressable
                  onPress={handleDeletePress}
                  disabled={deleting}
                  className="p-2 active:opacity-70"
                  accessibilityRole="button"
                  accessibilityLabel="Delete plant share"
                >
                  <OptimizedIcon
                    name="trash-outline"
                    size={20}
                    className="text-red-500"
                  />
                </Pressable>
              )}
            </View>
          </Pressable>
        </GestureDetector>

        {/* Delete Confirmation Modal */}
        <DeletePostModal
          visible={showDeleteModal}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          deleting={deleting}
          postType="plantShare"
        />
      </Animated.View>
    );
  }
);

export default PlantSharePostItem;
