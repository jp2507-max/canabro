import React, { useState, useCallback, useMemo } from 'react';
import { View, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

import UserAvatar from '@/components/community/UserAvatar';
import AnimatedButton from '@/components/buttons/AnimatedButton';
import { FlashListWrapper } from '@/components/ui/FlashListWrapper';
import { NotificationBadge } from '@/components/ui/NotificationBadge';
import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';

import { useNotifications } from '@/lib/hooks/useNotifications';
import * as Haptics from '@/lib/utils/haptics';
import { log } from '@/lib/utils/logger';

// Types based on design document
interface FollowRelationship {
  followerId: string;
  followingId: string;
  followedAt: Date;
  notificationSettings: FollowNotificationSettings;
  relationshipType: 'follow' | 'mutual' | 'blocked';
  isActive: boolean;
}

interface FollowNotificationSettings {
  newPosts: boolean;
  plantUpdates: boolean;
  achievements: boolean;
  liveEvents: boolean;
  directMessages: boolean;
}

interface SocialStats {
  userId: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  likesReceived: number;
  commentsReceived: number;
  expertAnswers: number;
  helpfulVotes: number;
  reputationScore: number;
}

interface User {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  verified: boolean;
  bio?: string;
  location?: string;
  joinedAt: Date;
  socialStats: SocialStats;
}

interface UserFollowingProps {
  currentUserId: string;
  onUserPress?: (user: User) => void;
  onFollowersPress?: () => void;
  onFollowingPress?: () => void;
}

export default function UserFollowing({
  currentUserId,
  onUserPress,
  onFollowersPress,
  onFollowingPress,
}: UserFollowingProps) {
  const { t } = useTranslation('community');
  const { scheduleNotification } = useNotifications();

  // State management
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [followRequests, setFollowRequests] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [socialStats, setSocialStats] = useState<SocialStats | null>(null);

  // Animation values
  const statsScale = useSharedValue(1);

  const animatedStatsStyle = useAnimatedStyle(() => ({
    transform: [{ scale: statsScale.value }],
  }));

  // Follow/Unfollow functionality
  const handleFollowUser = useCallback(async (user: User) => {
    try {
      setIsLoading(true);
      
      // Optimistic update
      const updatedUser = { ...user };
      updatedUser.socialStats.followersCount += 1;
      
      // Haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // TODO: Implement actual follow API call
      // await followUser(user.id);
      
      // Schedule follow notification for the followed user
      await scheduleNotification({
        identifier: `follow_${currentUserId}_${user.id}`,
        title: t('notifications.newFollower'),
        body: t('notifications.newFollowerBody', { username: user.displayName }),
        data: {
          type: 'new_follower',
          followerId: currentUserId,
          followingId: user.id,
        },
        scheduledFor: new Date(Date.now() + 1000), // Immediate notification
      });

      log.info('User followed successfully', { userId: user.id });
      
    } catch (error) {
      log.error('Failed to follow user', { error, userId: user.id });
      Alert.alert(t('errors.followFailed'), t('errors.tryAgain'));
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId, scheduleNotification, t]);

  const handleUnfollowUser = useCallback(async (user: User) => {
    try {
      setIsLoading(true);
      
      // Show confirmation dialog
      Alert.alert(
        t('actions.unfollowUser'),
        t('actions.unfollowConfirm', { username: user.displayName }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('actions.unfollow'),
            style: 'destructive',
            onPress: async () => {
              // Optimistic update
              const updatedUser = { ...user };
              updatedUser.socialStats.followersCount -= 1;
              
              // Haptic feedback
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              
              // TODO: Implement actual unfollow API call
              // await unfollowUser(user.id);
              
              log.info('User unfollowed successfully', { userId: user.id });
            },
          },
        ]
      );
      
    } catch (error) {
      log.error('Failed to unfollow user', { error, userId: user.id });
      Alert.alert(t('errors.unfollowFailed'), t('errors.tryAgain'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // Stats animation
  const animateStats = useCallback(() => {
    statsScale.value = withSpring(1.05, { damping: 15, stiffness: 400 }, () => {
      statsScale.value = withSpring(1, { damping: 15, stiffness: 400 });
    });
  }, [statsScale]);

  // Render user item for lists
  const renderUserItem = useCallback(({ item: user }: { item: User }) => {
    const isFollowing = following.some(f => f.id === user.id);
    const isMutual = followers.some(f => f.id === user.id) && isFollowing;
    
    return (
      <ThemedView className="flex-row items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
        <View className="flex-row items-center flex-1">
          <UserAvatar
            uri={user.avatar || ''}
            size={48}
            verified={user.verified}
            onPress={() => onUserPress?.(user)}
            accessibilityLabel={t('accessibility.userAvatar', { username: user.displayName })}
          />
          
          <View className="ml-3 flex-1">
            <View className="flex-row items-center">
              <ThemedText variant="subtitle" className="font-semibold">
                {user.displayName}
              </ThemedText>
              {isMutual && (
                <View className="ml-2 px-2 py-1 bg-primary-100 dark:bg-primary-900 rounded-full">
                  <ThemedText variant="caption" className="text-primary-600 dark:text-primary-400">
                    {t('labels.mutual')}
                  </ThemedText>
                </View>
              )}
            </View>
            
            <ThemedText variant="caption" className="text-neutral-600 dark:text-neutral-400">
              @{user.username}
            </ThemedText>
            
            {user.bio && (
              <ThemedText variant="caption" className="mt-1 text-neutral-700 dark:text-neutral-300" numberOfLines={2}>
                {user.bio}
              </ThemedText>
            )}
            
            <View className="flex-row items-center mt-2">
              <ThemedText variant="caption" className="text-neutral-500 dark:text-neutral-400">
                {t('stats.followers', { count: user.socialStats.followersCount })}
              </ThemedText>
              <ThemedText variant="caption" className="mx-2 text-neutral-400">•</ThemedText>
              <ThemedText variant="caption" className="text-neutral-500 dark:text-neutral-400">
                {t('stats.posts', { count: user.socialStats.postsCount })}
              </ThemedText>
            </View>
          </View>
        </View>
        
        <View className="ml-3">
          {user.id !== currentUserId && (
            <AnimatedButton
              title={isFollowing ? t('actions.following') : t('actions.follow')}
              onPress={() => isFollowing ? handleUnfollowUser(user) : handleFollowUser(user)}
              loading={isLoading}
              variant={isFollowing ? 'secondary' : 'primary'}
              icon={isFollowing ? 'checkmark' : 'person-add'}
            />
          )}
        </View>
      </ThemedView>
    );
  }, [following, followers, currentUserId, isLoading, onUserPress, handleFollowUser, handleUnfollowUser, t]);

  // Social stats component
  const SocialStatsSection = useMemo(() => (
    <Animated.View style={animatedStatsStyle}>
      <ThemedView className="flex-row justify-around p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl mx-4 mb-4">
        <View className="items-center" onTouchEnd={animateStats}>
          <ThemedText variant="title" className="font-bold text-primary-600 dark:text-primary-400">
            {socialStats?.followersCount || 0}
          </ThemedText>
          <ThemedText variant="caption" className="text-neutral-600 dark:text-neutral-400">
            {t('stats.followers')}
          </ThemedText>
        </View>
        
        <View className="items-center" onTouchEnd={animateStats}>
          <ThemedText variant="title" className="font-bold text-primary-600 dark:text-primary-400">
            {socialStats?.followingCount || 0}
          </ThemedText>
          <ThemedText variant="caption" className="text-neutral-600 dark:text-neutral-400">
            {t('stats.following')}
          </ThemedText>
        </View>
        
        <View className="items-center" onTouchEnd={animateStats}>
          <ThemedText variant="title" className="font-bold text-primary-600 dark:text-primary-400">
            {socialStats?.reputationScore || 0}
          </ThemedText>
          <ThemedText variant="caption" className="text-neutral-600 dark:text-neutral-400">
            {t('stats.reputation')}
          </ThemedText>
        </View>
      </ThemedView>
    </Animated.View>
  ), [socialStats, animatedStatsStyle, animateStats, t]);

  return (
    <ThemedView className="flex-1">
      {/* Social Stats */}
      {SocialStatsSection}
      
      {/* Follow Requests */}
      {followRequests.length > 0 && (
        <ThemedView className="mb-4">
          <View className="flex-row items-center justify-between px-4 py-2">
            <ThemedText variant="subtitle" className="font-semibold">
              {t('sections.followRequests')}
            </ThemedText>
            <NotificationBadge count={followRequests.length} priority="medium" size="small" />
          </View>
          
          <FlashListWrapper
            data={followRequests}
            renderItem={renderUserItem}
            estimatedItemSize={80}
            keyExtractor={(item) => `request_${item.id}`}
            showsVerticalScrollIndicator={false}
          />
        </ThemedView>
      )}
      
      {/* Followers and Following Tabs */}
      <ThemedView className="flex-1">
        <View className="flex-row border-b border-neutral-200 dark:border-neutral-700">
          <View className="flex-1 items-center py-3 border-b-2 border-primary-500">
            <ThemedText variant="subtitle" className="font-semibold text-primary-600 dark:text-primary-400">
              {t('tabs.followers')}
            </ThemedText>
          </View>
          <View className="flex-1 items-center py-3">
            <ThemedText variant="subtitle" className="text-neutral-600 dark:text-neutral-400">
              {t('tabs.following')}
            </ThemedText>
          </View>
        </View>
        
        <FlashListWrapper
          data={followers}
          renderItem={renderUserItem}
          estimatedItemSize={100}
          keyExtractor={(item) => `follower_${item.id}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </ThemedView>
    </ThemedView>
  );
}