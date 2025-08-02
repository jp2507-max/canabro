/**
 * UserAchievements Component
 * 
 * Features:
 * - Achievement system using existing AnimatedCard and badge components
 * - Point scoring and leaderboards using existing FlashListWrapper and StatItem
 * - Badges using existing TagPill and NotificationBadge components
 * - Achievement notifications using existing useNotifications and celebration animations
 * - Integration with existing ProfileDetail and activity tracking patterns
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Pressable, Alert } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withSequence,
  withDelay,
  runOnUI,
  FadeIn,
  SlideInUp,
  interpolateColor as rInterpolateColor
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { FlashListWrapper } from '@/components/ui/FlashListWrapper';
import { NotificationBadge } from '@/components/ui/NotificationBadge';
import TagPill from '@/components/ui/TagPill';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';
import SegmentedControl, { SegmentedControlOption } from '@/components/ui/SegmentedControl';
import { AnimatedCard } from '@/lib/animations/AnimatedCard';
import StatItem from '@/components/profile/StatItem';

import { useNotifications } from '@/lib/hooks/useNotifications';
import { UserStats, UserStatsBreakdown } from '@/lib/models/UserStats';
import { triggerHeavyHapticSync, triggerSuccessHapticSync } from '@/lib/utils/haptics';
import { log } from '@/lib/utils/logger';

// Types
interface Achievement {
  id: string;
  achievementId: string;
  title: string;
  description: string;
  metadata: {
    category: keyof UserStatsBreakdown;
    difficulty: 'bronze' | 'silver' | 'gold' | 'platinum';
    points: number;
    iconName: string;
    requirements?: Record<string, number>;
  };
  pointsEarned: number;
  isUnlocked: boolean;
  progressPercentage: number;
  unlockedAt?: Date;
}

interface LeaderboardEntry {
  userId: string;
  username: string;
  avatar?: string;
  totalPoints: number;
  level: number;
  rank: number;
  title: string;
  isCurrentUser: boolean;
}

interface UserAchievementsProps {
  userId: string;
  userStats?: UserStats;
  onAchievementUnlocked?: (achievement: Achievement) => void;
  className?: string;
}

export const UserAchievements: React.FC<UserAchievementsProps> = ({
  userId,
  userStats,
  onAchievementUnlocked,
  className = '',
}) => {
  const { t } = useTranslation(['achievements', 'common']);
  const { scheduleNotification } = useNotifications();

  // State management
  const [activeTab, setActiveTab] = useState<'achievements' | 'leaderboard' | 'stats'>('achievements');
  const [selectedCategory, setSelectedCategory] = useState<keyof UserStatsBreakdown | 'all'>('all');
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Animation values
  const celebrationScale = useSharedValue(1);
  const celebrationOpacity = useSharedValue(0);

  // Tab options
  const tabOptions: SegmentedControlOption[] = [
    { label: t('achievements:tabs.achievements'), value: 'achievements' },
    { label: t('achievements:tabs.leaderboard'), value: 'leaderboard' },
    { label: t('achievements:tabs.stats'), value: 'stats' },
  ];

  // Category filter options
  const categoryOptions = [
    { label: t('achievements:categories.all'), value: 'all' },
    { label: t('achievements:categories.growing'), value: 'growing' },
    { label: t('achievements:categories.community'), value: 'community' },
    { label: t('achievements:categories.social'), value: 'social' },
    { label: t('achievements:categories.knowledge'), value: 'knowledge' },
  ];

  // Load achievements and leaderboard data
  useEffect(() => {
    loadAchievementsData();
    loadLeaderboardData();
  }, [userId]);

  const loadAchievementsData = useCallback(async () => {
    try {
      setIsLoading(true);
      // TODO: Replace with actual Supabase query
      const mockAchievements: Achievement[] = [
        {
          id: '1',
          achievementId: 'first_plant',
          title: t('achievements:achievements.first_plant.title'),
          description: t('achievements:achievements.first_plant.description'),
          metadata: {
            category: 'growing',
            difficulty: 'bronze',
            points: 100,
            iconName: 'leaf-outline',
          },
          pointsEarned: 100,
          isUnlocked: true,
          progressPercentage: 100,
          unlockedAt: new Date('2024-01-15'),
        },
        {
          id: '2',
          achievementId: 'first_harvest',
          title: t('achievements:achievements.first_harvest.title'),
          description: t('achievements:achievements.first_harvest.description'),
          metadata: {
            category: 'growing',
            difficulty: 'silver',
            points: 250,
            iconName: 'flower-outline',
          },
          pointsEarned: 0,
          isUnlocked: false,
          progressPercentage: 75,
        },
        {
          id: '3',
          achievementId: 'community_helper',
          title: t('achievements:achievements.community_helper.title'),
          description: t('achievements:achievements.community_helper.description'),
          metadata: {
            category: 'community',
            difficulty: 'bronze',
            points: 150,
            iconName: 'people-outline',
          },
          pointsEarned: 150,
          isUnlocked: true,
          progressPercentage: 100,
          unlockedAt: new Date('2024-02-01'),
        },
      ];
      setAchievements(mockAchievements);
    } catch (error) {
      log.error('Failed to load achievements:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, t]);

  const loadLeaderboardData = useCallback(async () => {
    try {
      // TODO: Replace with actual Supabase query
      const mockLeaderboard: LeaderboardEntry[] = [
        {
          userId: 'user1',
          username: 'GrowMaster420',
          totalPoints: 2500,
          level: 15,
          rank: 1,
          title: 'Master Grower',
          isCurrentUser: false,
        },
        {
          userId: userId,
          username: 'You',
          totalPoints: userStats?.totalPoints || 1200,
          level: userStats?.level || 8,
          rank: userStats?.leaderboardRank || 3,
          title: userStats?.userTitle || 'Cultivator',
          isCurrentUser: true,
        },
        {
          userId: 'user3',
          username: 'PlantWhisperer',
          totalPoints: 1800,
          level: 12,
          rank: 2,
          title: 'Expert Grower',
          isCurrentUser: false,
        },
      ].sort((a, b) => a.rank - b.rank);
      setLeaderboard(mockLeaderboard);
    } catch (error) {
      log.error('Failed to load leaderboard:', error);
    }
  }, [userId, userStats]);

  // Filter achievements by category
  const filteredAchievements = useMemo(() => {
    if (selectedCategory === 'all') return achievements;
    return achievements.filter(achievement => achievement.metadata.category === selectedCategory);
  }, [achievements, selectedCategory]);

  // Celebration animation for unlocked achievements
  const triggerCelebration = useCallback(() => {
    celebrationOpacity.value = withSequence(
      withSpring(1, { damping: 15, stiffness: 400 }),
      withDelay(2000, withSpring(0, { damping: 15, stiffness: 400 }))
    );
    celebrationScale.value = withSequence(
      withSpring(1.2, { damping: 10, stiffness: 300 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );
    triggerSuccessHapticSync();
  }, []);

  // Handle achievement unlock notification
  const handleAchievementUnlock = useCallback(async (achievement: Achievement) => {
    try {
      // Schedule celebration notification
      await scheduleNotification({
        identifier: `achievement_${achievement.achievementId}`,
        title: t('achievements:notifications.unlocked.title'),
        body: t('achievements:notifications.unlocked.body', { title: achievement.title }),
        data: {
          type: 'achievement_unlocked',
          achievementId: achievement.achievementId,
          points: achievement.metadata.points,
        },
        scheduledFor: new Date(Date.now() + 1000), // 1 second delay
      });

      // Trigger celebration animation
      triggerCelebration();

      // Call parent callback
      onAchievementUnlocked?.(achievement);

      log.info('Achievement unlocked:', achievement.achievementId);
    } catch (error) {
      log.error('Failed to handle achievement unlock:', error);
    }
  }, [scheduleNotification, triggerCelebration, onAchievementUnlocked, t]);

  // Render achievement card
  const renderAchievementCard = useCallback(({ item: achievement }: { item: Achievement }) => {
    const difficultyColors = {
      bronze: 'bg-amber-100 border-amber-300 dark:bg-amber-900/20 dark:border-amber-700',
      silver: 'bg-gray-100 border-gray-300 dark:bg-gray-900/20 dark:border-gray-700',
      gold: 'bg-yellow-100 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-700',
      platinum: 'bg-purple-100 border-purple-300 dark:bg-purple-900/20 dark:border-purple-700',
    };

    const difficultyTextColors = {
      bronze: 'text-amber-700 dark:text-amber-300',
      silver: 'text-gray-700 dark:text-gray-300',
      gold: 'text-yellow-700 dark:text-yellow-300',
      platinum: 'text-purple-700 dark:text-purple-300',
    };

    return (
      <AnimatedCard
        variant="elevated"
        size="medium"
        enableAnimation={true}
        enableHaptics={true}
        className={`mb-4 ${difficultyColors[achievement.metadata.difficulty]}`}
        onPress={() => {
          if (!achievement.isUnlocked && achievement.progressPercentage >= 100) {
            handleAchievementUnlock(achievement);
          }
        }}
      >
        <View className="flex-row items-center space-x-4">
          {/* Achievement Icon */}
          <View className={`relative p-3 rounded-full ${achievement.isUnlocked ? 'bg-primary-500' : 'bg-neutral-300 dark:bg-neutral-600'}`}>
            <OptimizedIcon
              name={achievement.metadata.iconName}
              size={24}
              className={achievement.isUnlocked ? 'text-white' : 'text-neutral-500 dark:text-neutral-400'}
            />
            {achievement.isUnlocked && (
              <View className="absolute -top-1 -right-1">
                <NotificationBadge
                  count={1}
                  priority="medium"
                  size="small"
                  showIcon={true}
                />
              </View>
            )}
          </View>

          {/* Achievement Details */}
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-1">
              <ThemedText className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                {achievement.title}
              </ThemedText>
              <TagPill
                text={t(`achievements:difficulties.${achievement.metadata.difficulty}`)}
                variant="neutral"
                size="small"
                className={difficultyTextColors[achievement.metadata.difficulty]}
              />
            </View>

            <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
              {achievement.description}
            </ThemedText>

            {/* Progress Bar */}
            <View className="mb-2">
              <View className="flex-row justify-between items-center mb-1">
                <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400">
                  {t('achievements:progress')}
                </ThemedText>
                <ThemedText className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  {Math.round(achievement.progressPercentage)}%
                </ThemedText>
              </View>
              <View className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <Animated.View
                  className="h-full bg-primary-500 rounded-full"
                  style={{
                    width: `${achievement.progressPercentage}%`,
                  }}
                />
              </View>
            </View>

            {/* Points and Status */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center space-x-2">
                <OptimizedIcon name="star-outline" size={16} className="text-primary-500" />
                <ThemedText className="text-sm font-medium text-primary-600 dark:text-primary-400">
                  {achievement.metadata.points} {t('achievements:points')}
                </ThemedText>
              </View>
              {achievement.isUnlocked && achievement.unlockedAt && (
                <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400">
                  {t('achievements:unlockedOn', { 
                    date: achievement.unlockedAt.toLocaleDateString() 
                  })}
                </ThemedText>
              )}
            </View>
          </View>
        </View>
      </AnimatedCard>
    );
  }, [handleAchievementUnlock, t]);

  // Render leaderboard entry
  const renderLeaderboardEntry = useCallback(({ item: entry }: { item: LeaderboardEntry }) => (
    <AnimatedCard
      variant={entry.isCurrentUser ? "elevated" : "default"}
      size="medium"
      enableAnimation={true}
      className={`mb-3 ${entry.isCurrentUser ? 'border-2 border-primary-500' : ''}`}
    >
      <View className="flex-row items-center space-x-4">
        {/* Rank Badge */}
        <View className={`w-10 h-10 rounded-full items-center justify-center ${
          entry.rank === 1 ? 'bg-yellow-500' :
          entry.rank === 2 ? 'bg-gray-400' :
          entry.rank === 3 ? 'bg-amber-600' :
          'bg-neutral-300 dark:bg-neutral-600'
        }`}>
          <ThemedText className={`font-bold ${
            entry.rank <= 3 ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'
          }`}>
            #{entry.rank}
          </ThemedText>
        </View>

        {/* User Info */}
        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-1">
            <ThemedText className={`text-lg font-bold ${
              entry.isCurrentUser ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-900 dark:text-neutral-100'
            }`}>
              {entry.username}
            </ThemedText>
            <TagPill
              text={entry.title}
              variant="blue"
              size="small"
            />
          </View>

          <View className="flex-row items-center space-x-4">
            <View className="flex-row items-center space-x-1">
              <OptimizedIcon name="star" size={16} className="text-primary-500" />
              <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {entry.totalPoints.toLocaleString()}
              </ThemedText>
            </View>
            <View className="flex-row items-center space-x-1">
              <OptimizedIcon name="trending-up" size={16} className="text-green-500" />
              <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t('achievements:level')} {entry.level}
              </ThemedText>
            </View>
          </View>
        </View>
      </View>
    </AnimatedCard>
  ), [t]);

  // Render stats overview
  const renderStatsOverview = useCallback(() => {
    if (!userStats) return null;

    const statsData = [
      {
        value: userStats.totalPoints.toLocaleString(),
        label: t('achievements:stats.totalPoints'),
        icon: 'star' as const,
      },
      {
        value: userStats.level,
        label: t('achievements:stats.level'),
        icon: 'trending-up' as const,
      },
      {
        value: userStats.achievementsUnlocked,
        label: t('achievements:stats.achievements'),
        icon: 'trophy' as const,
      },
      {
        value: `#${userStats.leaderboardRank}`,
        label: t('achievements:stats.rank'),
        icon: 'podium' as const,
      },
    ];

    return (
      <View className="space-y-6">
        {/* Level Progress */}
        <AnimatedCard variant="elevated" size="large">
          <View className="items-center space-y-4">
            <View className="items-center">
              <ThemedText className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                {t('achievements:level')} {userStats.level}
              </ThemedText>
              <ThemedText className="text-lg text-neutral-600 dark:text-neutral-400">
                {userStats.userTitle}
              </ThemedText>
            </View>

            {/* Progress Ring */}
            <View className="relative w-32 h-32 items-center justify-center">
              <View className="absolute w-full h-full rounded-full border-8 border-neutral-200 dark:border-neutral-700" />
              <View 
                className="absolute w-full h-full rounded-full border-8 border-primary-500"
                style={{
                  transform: [{ rotate: `${(userStats.levelProgress / 100) * 360}deg` }],
                  borderTopColor: 'transparent',
                  borderRightColor: 'transparent',
                  borderBottomColor: 'transparent',
                }}
              />
              <View className="items-center">
                <ThemedText className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {Math.round(userStats.levelProgress)}%
                </ThemedText>
                <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400">
                  {t('achievements:toNextLevel')}
                </ThemedText>
              </View>
            </View>

            <ThemedText className="text-sm text-center text-neutral-600 dark:text-neutral-400">
              {userStats.pointsToNextLevel} {t('achievements:pointsToNext')}
            </ThemedText>
          </View>
        </AnimatedCard>

        {/* Stats Grid */}
        <View className="flex-row flex-wrap justify-between">
          {statsData.map((stat, index) => (
            <View key={stat.label} className="w-[48%] mb-4">
              <StatItem
                value={stat.value}
                label={stat.label}
                icon={stat.icon}
                index={index}
              />
            </View>
          ))}
        </View>

        {/* Category Breakdown */}
        <AnimatedCard variant="elevated" size="medium">
          <ThemedText className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4">
            {t('achievements:categoryBreakdown')}
          </ThemedText>
          {Object.entries(userStats.statsBreakdown).map(([category, stats]) => {
            const totalCategoryPoints = Object.values(stats).reduce((sum, value) => 
              sum + (typeof value === 'number' ? value : 0), 0
            );
            return (
              <View key={category} className="flex-row items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-700 last:border-b-0">
                <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300 capitalize">
                  {t(`achievements:categories.${category}`)}
                </ThemedText>
                <ThemedText className="text-sm text-primary-600 dark:text-primary-400">
                  {totalCategoryPoints} {t('achievements:points')}
                </ThemedText>
              </View>
            );
          })}
        </AnimatedCard>
      </View>
    );
  }, [userStats, t]);

  // Celebration overlay animation
  const celebrationStyle = useAnimatedStyle(() => ({
    opacity: celebrationOpacity.value,
    transform: [{ scale: celebrationScale.value }],
  }));

  return (
    <ThemedView className={`flex-1 ${className}`}>
      {/* Header */}
      <View className="px-4 py-6 bg-primary-50 dark:bg-primary-900/20">
        <ThemedText className="text-2xl font-bold text-center text-primary-900 dark:text-primary-100 mb-2">
          {t('achievements:title')}
        </ThemedText>
        <ThemedText className="text-center text-primary-700 dark:text-primary-300">
          {t('achievements:subtitle')}
        </ThemedText>
      </View>

      {/* Tab Navigation */}
      <View className="px-4 py-4">
        <SegmentedControl
          options={tabOptions}
          selectedValue={activeTab}
          onValueChange={(value) => setActiveTab(value as typeof activeTab)}
        />
      </View>

      {/* Content */}
      <View className="flex-1 px-4">
        {activeTab === 'achievements' && (
          <View className="flex-1">
            {/* Category Filter */}
            <View className="mb-4">
              <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                {t('achievements:filterByCategory')}
              </ThemedText>
              <View className="flex-row flex-wrap">
                {categoryOptions.map((option) => (
                  <TagPill
                    key={option.value}
                    text={option.label}
                    selected={selectedCategory === option.value}
                    onPress={() => setSelectedCategory(option.value as typeof selectedCategory)}
                    variant="blue"
                    size="small"
                    className="mb-2"
                  />
                ))}
              </View>
            </View>

            {/* Achievements List */}
            <FlashListWrapper
              data={filteredAchievements}
              renderItem={renderAchievementCard}
              keyExtractor={(item) => item.id}
              estimatedItemSize={120}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </View>
        )}

        {activeTab === 'leaderboard' && (
          <FlashListWrapper
            data={leaderboard}
            renderItem={renderLeaderboardEntry}
            keyExtractor={(item) => item.userId}
            estimatedItemSize={80}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}

        {activeTab === 'stats' && renderStatsOverview()}
      </View>

      {/* Celebration Overlay */}
      <Animated.View
        style={[celebrationStyle]}
        className="absolute inset-0 items-center justify-center bg-black/50 pointer-events-none"
        pointerEvents="none"
      >
        <View className="items-center space-y-4">
          <OptimizedIcon name="trophy" size={80} className="text-yellow-500" />
          <ThemedText className="text-2xl font-bold text-white text-center">
            {t('achievements:celebration.title')}
          </ThemedText>
          <ThemedText className="text-lg text-white text-center">
            {t('achievements:celebration.subtitle')}
          </ThemedText>
        </View>
      </Animated.View>
    </ThemedView>
  );
};

export default UserAchievements;