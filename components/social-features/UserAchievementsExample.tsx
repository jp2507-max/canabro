/**
 * UserAchievements Example Usage
 * 
 * Demonstrates how to integrate the UserAchievements component
 * with existing profile and community features
 */

import React, { useCallback } from 'react';
import { View, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import UserAchievements from './UserAchievements';
import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { AnimatedCard } from '@/lib/animations/AnimatedCard';

import { useAchievements } from '@/lib/hooks/useAchievements';
import { Achievement } from '@/lib/services/achievementService';
import { triggerSuccessHapticSync } from '@/lib/utils/haptics';
import { log } from '@/lib/utils/logger';

interface UserAchievementsExampleProps {
  userId: string;
  className?: string;
}

export const UserAchievementsExample: React.FC<UserAchievementsExampleProps> = ({
  userId,
  className = '',
}) => {
  const { t } = useTranslation(['achievements', 'common']);

  // Use the achievements hook
  const {
    achievements,
    userStats,
    leaderboard,
    isLoadingStats,
    updateStats,
    refreshData,
  } = useAchievements({
    userId,
    enableRealtime: true,
    onAchievementUnlocked: handleAchievementUnlocked,
  });

  // Handle achievement unlock with celebration
  function handleAchievementUnlocked(achievement: Achievement) {
    triggerSuccessHapticSync();
    
    Alert.alert(
      t('achievements:celebration.title'),
      t('achievements:notifications.unlocked.body', { title: achievement.title }),
      [
        {
          text: t('common:ok'),
          style: 'default',
        },
      ]
    );

    log.info('Achievement unlocked in example:', achievement.achievementId);
  }

  // Example: Update user stats when they complete an action
  const handlePlantAdded = useCallback(async () => {
    try {
      const unlockedAchievements = await updateStats('growing', {
        plantsGrown: (userStats?.statsBreakdown.growing.plantsGrown || 0) + 1,
      });

      if (unlockedAchievements.length > 0) {
        log.info(`Unlocked ${unlockedAchievements.length} achievements from adding plant`);
      }
    } catch (error) {
      log.error('Failed to update stats after adding plant:', error);
    }
  }, [updateStats, userStats]);

  // Example: Update stats when user helps community
  const handleCommunityHelp = useCallback(async () => {
    try {
      const unlockedAchievements = await updateStats('community', {
        helpfulAnswers: (userStats?.statsBreakdown.community.helpfulAnswers || 0) + 1,
      });

      if (unlockedAchievements.length > 0) {
        log.info(`Unlocked ${unlockedAchievements.length} achievements from helping community`);
      }
    } catch (error) {
      log.error('Failed to update stats after community help:', error);
    }
  }, [updateStats, userStats]);

  // Example: Update stats when user follows someone
  const handleUserFollowed = useCallback(async () => {
    try {
      const unlockedAchievements = await updateStats('social', {
        followingCount: (userStats?.statsBreakdown.social.followingCount || 0) + 1,
      });

      if (unlockedAchievements.length > 0) {
        log.info(`Unlocked ${unlockedAchievements.length} achievements from following user`);
      }
    } catch (error) {
      log.error('Failed to update stats after following user:', error);
    }
  }, [updateStats, userStats]);

  if (isLoadingStats) {
    return (
      <ThemedView className={`flex-1 items-center justify-center ${className}`}>
        <ThemedText className="text-lg text-neutral-600 dark:text-neutral-400">
          {t('common:loading')}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView className={`flex-1 ${className}`}>
      {/* Quick Stats Overview */}
      <AnimatedCard variant="elevated" size="medium" className="mx-4 mb-4">
        <View className="flex-row items-center justify-between">
          <View className="items-center">
            <ThemedText className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {userStats?.level || 1}
            </ThemedText>
            <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
              {t('achievements:level')}
            </ThemedText>
          </View>
          <View className="items-center">
            <ThemedText className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {userStats?.totalPoints.toLocaleString() || '0'}
            </ThemedText>
            <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
              {t('achievements:stats.totalPoints')}
            </ThemedText>
          </View>
          <View className="items-center">
            <ThemedText className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {userStats?.achievementsUnlocked || 0}
            </ThemedText>
            <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
              {t('achievements:stats.achievements')}
            </ThemedText>
          </View>
        </View>
      </AnimatedCard>

      {/* Main Achievements Component */}
      <UserAchievements
        userId={userId}
        userStats={userStats}
        onAchievementUnlocked={handleAchievementUnlocked}
        className="flex-1"
      />

      {/* Example Action Buttons (for testing) */}
      {__DEV__ && (
        <View className="p-4 space-y-2">
          <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Development Actions:
          </ThemedText>
          <View className="flex-row space-x-2">
            <AnimatedCard
              variant="outlined"
              size="small"
              onPress={handlePlantAdded}
              className="flex-1"
            >
              <ThemedText className="text-center text-sm">Add Plant</ThemedText>
            </AnimatedCard>
            <AnimatedCard
              variant="outlined"
              size="small"
              onPress={handleCommunityHelp}
              className="flex-1"
            >
              <ThemedText className="text-center text-sm">Help Community</ThemedText>
            </AnimatedCard>
            <AnimatedCard
              variant="outlined"
              size="small"
              onPress={handleUserFollowed}
              className="flex-1"
            >
              <ThemedText className="text-center text-sm">Follow User</ThemedText>
            </AnimatedCard>
          </View>
        </View>
      )}
    </ThemedView>
  );
};

export default UserAchievementsExample;