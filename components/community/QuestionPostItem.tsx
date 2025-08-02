/**
 * QuestionPostItem - Specialized component for questions with blue accent styling
 *
 * Features:
 * - Blue accent theme for questions
 * - Priority indicators and solved status
 * - Enhanced visual hierarchy
 * - Sophisticated animations and haptics (ported from legacy PostItem)
 * - Advanced gesture handling and interactions
 * - Full accessibility support
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
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
import ModerationIndicator, { type ModerationStatus } from './ModerationIndicator';
import ContentReportModal from './ContentReportModal';
import { CommunityService } from '../../lib/services/community-service';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerLightHapticSync,
  triggerSuccessHaptic,
  triggerErrorHaptic,
} from '../../lib/utils/haptics';
import { 
  COMMUNITY_ANIMATION_CONFIG, 
  COMMUNITY_SCALE_VALUES,
} from '@/lib/types/community';
import { useTranslation } from 'react-i18next';
import type { CommunityQuestion } from '../../lib/types/community';

dayjs.extend(relativeTime);

interface ModerationViolation {
  id?: string;
  type: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  code?: string;
  flaggedAt?: string;
  source?: 'auto' | 'manual';
  details?: Record<string, unknown>;
}

interface QuestionPostItemProps {
  question: CommunityQuestion & {
    moderation_status?: ModerationStatus;
    moderation_metadata?: {
      violations?: ModerationViolation[];
      confidence?: number;
      flaggedAt?: string;
    };
  };
  currentUserId?: string;
  onLike: (questionId: string, currentlyLiked: boolean) => void;
  onComment: (questionId: string) => void;
  onDelete?: (questionId: string) => void;
  onUserPress: (userId: string) => void;
  onImagePress?: (imageUrl: string) => void;
  onPress?: (questionId: string) => void;
  liking?: boolean;
  deleting?: boolean;
  showModerationActions?: boolean;
  isModeratorView?: boolean;
}

// Using shared animation configurations from community types
const ANIMATION_CONFIG = COMMUNITY_ANIMATION_CONFIG;
const SCALE_VALUES = COMMUNITY_SCALE_VALUES;

const QuestionPostItem: React.FC<QuestionPostItemProps> = React.memo(
  ({ 
    question,
    currentUserId,
    onLike,
    onComment,
    onDelete,
    onUserPress,
    onImagePress,
    onPress,
    liking = false,
    deleting = false,
    showModerationActions = false,
    isModeratorView = false,
  }) => {
    const { t } = useTranslation('community');
    // State for modals
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reporting, setReporting] = useState(false);

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
      () => question.username || t('questionPostItem.anonymousUser', { userId: question.user_id.slice(0, 8) }),
      [question.username, question.user_id, t]
    );

    const timeAgo = useMemo(() => dayjs(question.created_at).fromNow(), [question.created_at]);

    const isLiked = useMemo(() => question.user_has_liked ?? false, [question.user_has_liked]);

    // Check if current user owns this question
    const canDelete = useMemo(() => {
      return currentUserId && question.user_id && currentUserId === question.user_id;
    }, [currentUserId, question.user_id]);

    // Handle delete button press
    const handleDeletePress = useCallback(async () => {
      await triggerLightHaptic();
      setShowDeleteModal(true);
    }, []);

    // Handle delete confirmation
    const handleDeleteConfirm = useCallback(async () => {
      if (onDelete) {
        onDelete(question.id);
      }
      setShowDeleteModal(false);
    }, [onDelete, question.id]);

    // Handle delete modal close
    const handleDeleteCancel = useCallback(() => {
      setShowDeleteModal(false);
    }, []);

    // Handle content reporting
    const handleReportPress = useCallback(async () => {
      await triggerLightHaptic();
      setShowReportModal(true);
    }, []);

    const handleReportSubmit = useCallback(async (reason: string, description?: string) => {
      if (!currentUserId) return;
      
      setReporting(true);
      try {
        await CommunityService.reportContent(
          question.id,
          'question',
          currentUserId,
          reason,
          description
        );
        
        await triggerSuccessHaptic();
        setShowReportModal(false);
        // Could show a success toast here
  } catch (error) {
        // Use custom monitoring in production (Sentry if available), fallback to custom logger in dev
        if (process.env.NODE_ENV === 'production') {
          try {
            const Sentry = require('@sentry/react-native');
            if (Sentry?.captureException) {
              Sentry.captureException(error, {
                extra: { context: 'QuestionPostItem.handleReportSubmit', questionId: question.id },
              });
            }
          } catch {
            // Fallback if Sentry not available at runtime
          }
        } else {
          // Use project logger to ensure errors are captured consistently
          const { log } = require('@/lib/utils/logger');
          log.error('Error reporting content:', error);
        }
        await triggerErrorHaptic();
        // Could show an error toast here
      } finally {
        setReporting(false);
      }
    }, [currentUserId, question.id]);

    const handleReportCancel = useCallback(() => {
      setShowReportModal(false);
    }, []);

    // Enhanced event handlers with sophisticated haptic feedback
    const handleUserPress = useCallback(async () => {
      onUserPress(question.user_id);
    }, [question.user_id, onUserPress]);

    const handleLike = useCallback(async () => {
      if (isLiked) {
        await triggerLightHaptic();
      } else {
        await triggerMediumHaptic();
      }
      onLike(question.id, isLiked);
    }, [question.id, isLiked, onLike]);

    const handleComment = useCallback(async () => {
      await triggerLightHaptic();
      onComment(question.id);
    }, [question.id, onComment]);

    const handleImagePress = useCallback(async () => {
      await triggerLightHaptic();
      const imageUrl = question.image_url;
      if (imageUrl && onImagePress) {
        onImagePress(imageUrl);
      }
    }, [question.image_url, onImagePress]);

    const handlePress = useCallback(async () => {
      await triggerLightHaptic();
      if (onPress) {
        onPress(question.id);
      }
    }, [question.id, onPress]);

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
        className="mb-6 overflow-hidden rounded-3xl border border-blue-100 bg-white dark:border-blue-900/30 dark:bg-neutral-900"
        accessibilityRole="text"
        accessibilityLabel={t('questionPostItem.accessibility.questionBy', { title: question.title, displayName })}
      >
        <GestureDetector gesture={onPress ? cardPressGesture : Gesture.Tap()}>
          <Pressable
            className="active:opacity-90"
            accessibilityRole="button"
            accessibilityLabel={t('questionPostItem.accessibility.viewQuestion', { title: question.title })}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between p-5 pb-4">
              <View className="flex-row items-center flex-1">
                <View className="flex-row items-center bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full mr-3">
                  <OptimizedIcon
                    name="help-circle"
                    size={14}
                    className="text-blue-600 dark:text-blue-400 mr-1"
                  />
                  <Text className="text-sm font-semibold text-blue-600 dark:text-blue-400 ml-2">
                    {t('postTypeHeader.question')}
                  </Text>
                </View>

                {question.category && (
                  <View className="bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-full mr-2">
                    <Text className="text-xs font-medium text-neutral-600 dark:text-neutral-400 capitalize">
                      {question.category.replace('_', ' ')}
                    </Text>
                  </View>
                )}

                {question.is_solved && (
                  <View className="bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full mr-2">
                    <OptimizedIcon
                      name="checkmark-circle"
                      size={14}
                      className="text-green-600 dark:text-green-400 mr-1"
                    />
                    <Text className="text-xs font-medium text-green-600 dark:text-green-400">{t('questionPostItem.solved')}</Text>
                  </View>
                )}
              </View>

              {/* Moderation Indicator */}
              {question.moderation_status && question.moderation_status !== 'approved' && (
                <ModerationIndicator
                  status={question.moderation_status}
                  violationCount={question.moderation_metadata?.violations?.length}
                  size="small"
                  showDetails={isModeratorView}
                />
              )}
            </View>

            {/* Enhanced User Header with sophisticated gesture handling */}
            <GestureDetector gesture={userPressGesture}>
              <Pressable
                className="flex-row items-center px-5 pb-4 active:opacity-90"
                accessibilityRole="button"
                accessibilityLabel={t('questionPostItem.accessibility.viewProfile', { name: displayName })}
                accessibilityHint={t('questionPostItem.accessibility.viewProfileHint')}
              >
                <UserAvatar
                  uri={question.avatar_url || ''}
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

            {/* Enhanced Question Title */}
            <View className="px-5 mb-3">
              <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
                {question.title}
              </Text>
            </View>

            {/* Enhanced Post Content with improved typography */}
            <View className="mb-5 px-5">
              <Text className="text-lg font-normal leading-7 text-neutral-900 dark:text-neutral-100">
                {question.content}
              </Text>
            </View>

            {/* Tags */}
            {question.tags && question.tags.length > 0 && (
              <View className="flex-row flex-wrap px-5 mb-5">
                {question.tags.slice(0, 3).map((tag, index) => (
                  <TagPill
                    key={index}
                    text={tag}
                    variant="blue"
                    size="small"
                    selected={false}
                    onPress={() => {}}
                    className="mb-2"
                  />
                ))}
                {question.tags.length > 3 && (
                  <Text className="text-sm text-neutral-500 dark:text-neutral-400 self-center ml-2">
                    +{question.tags.length - 3} more
                  </Text>
                )}
              </View>
            )}

            {/* Enhanced Question Image with sophisticated gesture handling */}
            {question.image_url && (
              <GestureDetector gesture={imageGesture}>
                <Pressable
                  className="mx-5 mb-5 overflow-hidden rounded-2xl bg-neutral-100 active:opacity-95 dark:bg-neutral-800"
                  accessibilityRole="imagebutton"
                  accessibilityLabel={t('questionPostItem.accessibility.viewImage')}
                  accessibilityHint={t('questionPostItem.accessibility.viewImageHint')}
                >
                  <View className="aspect-[4/3]">
                    <NetworkResilientImage
                      url={question.image_url}
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
                  </View>
                </Pressable>
              </GestureDetector>
            )}

            {/* Enhanced Action Buttons */}
            <View className="flex-row items-center justify-between px-5 pb-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <View className="flex-row items-center">
                <Pressable
                  onPress={handleLike}
                  disabled={liking}
                  className="flex-row items-center mr-6 active:opacity-70"
                  accessibilityRole="button"
                  accessibilityLabel={t(isLiked ? 'postActionRow.unlikePost' : 'postActionRow.likePost')}
                >
                  <OptimizedIcon
                    name={isLiked ? 'heart' : 'heart-outline'}
                    size={24}
                    className={isLiked ? 'text-red-500' : 'text-neutral-500 dark:text-neutral-400'}
                  />
                  <Text className="text-base font-medium text-neutral-600 dark:text-neutral-400 ml-2">
                    {question.likes_count}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleComment}
                  className="flex-row items-center mr-6 active:opacity-70"
                  accessibilityRole="button"
                  accessibilityLabel={t('questionPostItem.accessibility.viewAnswers')}
                >
                  <OptimizedIcon
                    name="chatbubble-outline"
                    size={24}
                    className="text-neutral-500 dark:text-neutral-400"
                  />
                  <Text className="text-base font-medium text-neutral-600 dark:text-neutral-400 ml-2">
                    {t('questionPostItem.answers', { count: question.answers_count })}
                  </Text>
                </Pressable>

                <View className="flex-row items-center mr-6">
                  <OptimizedIcon
                    name="search"
                    size={24}
                    className="text-neutral-500 dark:text-neutral-400"
                  />
                  <Text className="text-base font-medium text-neutral-600 dark:text-neutral-400 ml-2">
                    {question.views_count}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center">
                {question.priority_level > 3 && (
                  <View className="bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-full mr-3">
                    <Text className="text-xs font-medium text-orange-600 dark:text-orange-400">
                      {t('questionPostItem.urgent')}
                    </Text>
                  </View>
                )}

                {/* Action buttons */}
                <View className="flex-row items-center">
                  {showModerationActions && !canDelete && (
                    <Pressable
                      onPress={handleReportPress}
                      className="p-2 mr-2 active:opacity-70"
                      accessibilityRole="button"
                      accessibilityLabel={t('questionPostItem.accessibility.reportQuestion')}
                    >
                      <OptimizedIcon
                        name="warning"
                        size={20}
                        className="text-orange-500"
                      />
                    </Pressable>
                  )}

                  {canDelete && (
                    <Pressable
                      onPress={handleDeletePress}
                      disabled={deleting}
                      className="p-2 active:opacity-70"
                      accessibilityRole="button"
                      accessibilityLabel={t('questionPostItem.accessibility.deleteQuestion')}
                    >
                      <OptimizedIcon
                        name="trash-outline"
                        size={20}
                        className="text-red-500"
                      />
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          </Pressable>
        </GestureDetector>

        {/* Delete Confirmation Modal */}
        <DeletePostModal
          visible={showDeleteModal}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          deleting={deleting}
          postType="question"
          moderationReason={question.moderation_metadata?.violations?.[0]?.description}
          showModerationOptions={isModeratorView}
        />

        {/* Content Report Modal */}
        <ContentReportModal
          visible={showReportModal}
          onClose={handleReportCancel}
          onSubmit={handleReportSubmit}
          contentType="question"
          submitting={reporting}
        />
      </Animated.View>
    );
  }
);

export default QuestionPostItem;
