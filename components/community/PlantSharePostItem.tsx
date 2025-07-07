/**
 * PlantSharePostItem - Specialized component for plant shares with green accent styling
 *
 * Features:
 * - Green accent theme for plant shares
 * - Growth stage indicators and care tips
 * - Enhanced visual hierarchy for plant data
 * - Optimized animations and haptics
 * - Full accessibility support
 */

import React, { useMemo } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import { OptimizedIcon } from '../ui/OptimizedIcon';
import NetworkResilientImage from '../ui/NetworkResilientImage';
import UserAvatar from './UserAvatar';
import TagPill from '../ui/TagPill';
import { triggerLightHapticSync } from '../../lib/utils/haptics';
import type { CommunityPlantShare } from '../../lib/types/community';

dayjs.extend(relativeTime);

interface PlantSharePostItemProps {
  plantShare: CommunityPlantShare;
  onLike: (plantShareId: string, currentlyLiked: boolean) => void;
  onComment: (plantShareId: string) => void;
  onUserPress: (userId: string) => void;
  onPress?: (plantShareId: string) => void;
  liking?: boolean;
}

export default function PlantSharePostItem({
  plantShare,
  onLike,
  onComment,
  onUserPress,
  onPress,
  liking = false,
}: PlantSharePostItemProps) {
  const displayName = useMemo(
    () => plantShare.username || `User ${plantShare.user_id.slice(0, 8)}`,
    [plantShare.username, plantShare.user_id]
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

  const handleLike = React.useCallback(async () => {
    await triggerLightHapticSync();
    onLike(plantShare.id, isLiked);
  }, [plantShare.id, isLiked, onLike]);

  const handleComment = React.useCallback(async () => {
    await triggerLightHapticSync();
    onComment(plantShare.id);
  }, [plantShare.id, onComment]);

  const handleUserPress = React.useCallback(() => {
    onUserPress(plantShare.user_id);
  }, [plantShare.user_id, onUserPress]);

  const handlePress = React.useCallback(() => {
    if (onPress) {
      onPress(plantShare.id);
    }
  }, [plantShare.id, onPress]);

  return (
    <Animated.View
      entering={FadeInDown.duration(300).springify()}
      className="bg-white dark:bg-neutral-900 rounded-2xl mx-4 mb-4 shadow-sm border border-green-100 dark:border-green-900/30"
    >
      <Pressable
        onPress={handlePress}
        className="p-4"
        accessibilityRole="button"
        accessibilityLabel={`Plant share: ${plantShare.plant_name}`}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-3">
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

        {/* Author Row */}
        <View className="flex-row items-center mb-3">
          <Pressable onPress={handleUserPress} className="flex-row items-center flex-1">
            <UserAvatar
              uri={plantShare.avatar_url || ''}
              size={32}
            />
            <View className="flex-1 ml-3">
              <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {displayName}
              </Text>
              <Text className="text-xs text-neutral-500 dark:text-neutral-400">
                {timeAgo}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Plant Info */}
        <View className="mb-3">
          <Text className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1">
            {plantShare.plant_name}
          </Text>
          {plantShare.strain_name && (
            <Text className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
              {plantShare.strain_name}
            </Text>
          )}
        </View>

        {/* Content */}
        <Text 
          className="text-sm text-neutral-600 dark:text-neutral-400 mb-3 leading-5"
          numberOfLines={3}
        >
          {plantShare.content}
        </Text>

        {/* Care Tips Preview */}
        {plantShare.care_tips && (
          <View className="bg-green-50 dark:bg-green-900/10 p-3 rounded-xl mb-3">
            <Text className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1">
              💡 Care Tips
            </Text>
            <Text 
              className="text-sm text-green-600 dark:text-green-400"
              numberOfLines={2}
            >
              {plantShare.care_tips}
            </Text>
          </View>
        )}

        {/* Environment & Medium Tags */}
        <View className="flex-row flex-wrap mb-3">
          {plantShare.environment && (
            <TagPill
              text={plantShare.environment}
              variant="green"
              size="small"
              selected={false}
              onPress={() => {}}
              className="mb-1"
            />
          )}
          {plantShare.growing_medium && (
            <TagPill
              text={plantShare.growing_medium.replace('_', ' ')}
              variant="neutral"
              size="small"
              selected={false}
              onPress={() => {}}
              className="mb-1"
            />
          )}
        </View>

        {/* Image Gallery */}
        {plantShare.images_urls && plantShare.images_urls.length > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            className="mb-3"
            contentContainerStyle={{ paddingRight: 16 }}
          >
            {plantShare.images_urls.map((imageUrl, index) => (
              <View key={index} className="mr-3 rounded-xl overflow-hidden">
                <NetworkResilientImage
                  url={imageUrl}
                  width={128}
                  height={128}
                  contentFit="cover"
                />
              </View>
            ))}
          </ScrollView>
        )}

        {/* Action Buttons */}
        <View className="flex-row items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <View className="flex-row items-center">
            <Pressable
              onPress={handleLike}
              disabled={liking}
              className="flex-row items-center mr-6"
              accessibilityRole="button"
              accessibilityLabel={isLiked ? 'Unlike plant share' : 'Like plant share'}
            >
              <OptimizedIcon
                name={isLiked ? 'heart' : 'heart-outline'}
                size={20}
                className={isLiked ? 'text-red-500' : 'text-neutral-500 dark:text-neutral-400'}
              />
              <Text className="text-sm font-medium text-neutral-600 dark:text-neutral-400 ml-1">
                {plantShare.likes_count}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleComment}
              className="flex-row items-center mr-6"
              accessibilityRole="button"
              accessibilityLabel="View comments"
            >
              <OptimizedIcon
                name="chatbubble-outline"
                size={20}
                className="text-neutral-500 dark:text-neutral-400"
              />
              <Text className="text-sm font-medium text-neutral-600 dark:text-neutral-400 ml-1">
                {plantShare.comments_count}
              </Text>
            </Pressable>

            <View className="flex-row items-center">
              <OptimizedIcon
                name="share"
                size={20}
                className="text-neutral-500 dark:text-neutral-400"
              />
              <Text className="text-sm font-medium text-neutral-600 dark:text-neutral-400 ml-1">
                {plantShare.shares_count}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
