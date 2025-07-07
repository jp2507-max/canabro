/**
 * QuestionPostItem - Specialized component for questions with blue accent styling
 *
 * Features:
 * - Blue accent theme for questions
 * - Priority indicators and solved status
 * - Enhanced visual hierarchy
 * - Optimized animations and haptics
 * - Full accessibility support
 */

import React, { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import { OptimizedIcon } from '../ui/OptimizedIcon';
import NetworkResilientImage from '../ui/NetworkResilientImage';
import UserAvatar from './UserAvatar';
import TagPill from '../ui/TagPill';
import { triggerLightHapticSync } from '../../lib/utils/haptics';
import type { CommunityQuestion } from '../../lib/types/community';

dayjs.extend(relativeTime);

interface QuestionPostItemProps {
  question: CommunityQuestion;
  onLike: (questionId: string, currentlyLiked: boolean) => void;
  onComment: (questionId: string) => void;
  onUserPress: (userId: string) => void;
  onPress?: (questionId: string) => void;
  liking?: boolean;
}

export default function QuestionPostItem({
  question,
  onLike,
  onComment,
  onUserPress,
  onPress,
  liking = false,
}: QuestionPostItemProps) {
  const displayName = useMemo(
    () => question.username || `User ${question.user_id.slice(0, 8)}`,
    [question.username, question.user_id]
  );

  const timeAgo = useMemo(() => dayjs(question.created_at).fromNow(), [question.created_at]);

  const isLiked = useMemo(() => question.user_has_liked ?? false, [question.user_has_liked]);

  const handleLike = React.useCallback(async () => {
    await triggerLightHapticSync();
    onLike(question.id, isLiked);
  }, [question.id, isLiked, onLike]);

  const handleComment = React.useCallback(async () => {
    await triggerLightHapticSync();
    onComment(question.id);
  }, [question.id, onComment]);

  const handleUserPress = React.useCallback(() => {
    onUserPress(question.user_id);
  }, [question.user_id, onUserPress]);

  const handlePress = React.useCallback(() => {
    if (onPress) {
      onPress(question.id);
    }
  }, [question.id, onPress]);

  return (
    <Animated.View
      entering={FadeInDown.duration(300).springify()}
      className="bg-white dark:bg-neutral-900 rounded-2xl mx-4 mb-4 shadow-sm border border-blue-100 dark:border-blue-900/30"
    >
      <Pressable
        onPress={handlePress}
        className="p-4"
        accessibilityRole="button"
        accessibilityLabel={`Question: ${question.title}`}
      >
        {/* Header */}
        <View className="flex-row items-center mb-3">
          <View className="flex-row items-center bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full mr-3">
            <OptimizedIcon
              name="help-circle"
              size={14}
              className="text-blue-600 dark:text-blue-400 mr-1"
            />
            <Text className="text-xs font-medium text-blue-600 dark:text-blue-400">
              Question
            </Text>
          </View>

          {question.category && (
            <View className="bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-full">
              <Text className="text-xs font-medium text-neutral-600 dark:text-neutral-400 capitalize">
                {question.category.replace('_', ' ')}
              </Text>
            </View>
          )}

          {question.is_solved && (
            <View className="ml-2 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
              <OptimizedIcon
                name="checkmark-circle"
                size={14}
                className="text-green-600 dark:text-green-400"
              />
            </View>
          )}
        </View>

        {/* Author Row */}
        <View className="flex-row items-center mb-3">
          <Pressable onPress={handleUserPress} className="flex-row items-center flex-1">
            <UserAvatar
              uri={question.avatar_url || ''}
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

        {/* Title */}
        <Text className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2 leading-6">
          {question.title}
        </Text>

        {/* Content Preview */}
        <Text 
          className="text-sm text-neutral-600 dark:text-neutral-400 mb-3 leading-5"
          numberOfLines={3}
        >
          {question.content}
        </Text>

        {/* Tags */}
        {question.tags && question.tags.length > 0 && (
          <View className="flex-row flex-wrap mb-3">
            {question.tags.slice(0, 3).map((tag, index) => (
              <TagPill
                key={index}
                text={tag}
                variant="blue"
                size="small"
                selected={false}
                onPress={() => {}}
                className="mb-1"
              />
            ))}
            {question.tags.length > 3 && (
              <Text className="text-xs text-neutral-500 dark:text-neutral-400 self-center">
                +{question.tags.length - 3} more
              </Text>
            )}
          </View>
        )}

        {/* Image */}
        {question.image_url && (
          <View className="mb-3 rounded-xl overflow-hidden">
            <NetworkResilientImage
              url={question.image_url}
              height={192}
              contentFit="cover"
            />
          </View>
        )}

        {/* Action Buttons */}
        <View className="flex-row items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <View className="flex-row items-center">
            <Pressable
              onPress={handleLike}
              disabled={liking}
              className="flex-row items-center mr-6"
              accessibilityRole="button"
              accessibilityLabel={isLiked ? 'Unlike question' : 'Like question'}
            >
              <OptimizedIcon
                name={isLiked ? 'heart' : 'heart-outline'}
                size={20}
                className={isLiked ? 'text-red-500' : 'text-neutral-500 dark:text-neutral-400'}
              />
              <Text className="text-sm font-medium text-neutral-600 dark:text-neutral-400 ml-1">
                {question.likes_count}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleComment}
              className="flex-row items-center mr-6"
              accessibilityRole="button"
              accessibilityLabel="View answers"
            >
              <OptimizedIcon
                name="chatbubble-outline"
                size={20}
                className="text-neutral-500 dark:text-neutral-400"
              />
              <Text className="text-sm font-medium text-neutral-600 dark:text-neutral-400 ml-1">
                {question.answers_count} {question.answers_count === 1 ? 'answer' : 'answers'}
              </Text>
            </Pressable>

            <View className="flex-row items-center">
              <OptimizedIcon
                name="search"
                size={20}
                className="text-neutral-500 dark:text-neutral-400"
              />
              <Text className="text-sm font-medium text-neutral-600 dark:text-neutral-400 ml-1">
                {question.views_count}
              </Text>
            </View>
          </View>

          {question.priority_level > 3 && (
            <View className="bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-full">
              <Text className="text-xs font-medium text-orange-600 dark:text-orange-400">
                Urgent
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}
