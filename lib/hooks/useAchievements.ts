/**
 * useAchievements Hook
 * 
 * Custom hook for managing user achievements, stats, and leaderboard data
 * Provides reactive state management and real-time updates
 */

import { useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { achievementService, Achievement, LeaderboardEntry } from '@/lib/services/achievementService';
import { UserStats, UserStatsBreakdown } from '@/lib/models/UserStats';
import { useNotifications } from './useNotifications';
import { log } from '@/lib/utils/logger';

interface UseAchievementsOptions {
  userId: string;
  enableRealtime?: boolean;
  onAchievementUnlocked?: (achievement: Achievement) => void;
}

interface UseAchievementsReturn {
  // Data
  achievements: Achievement[];
  userStats: UserStats | null;
  leaderboard: LeaderboardEntry[];
  
  // Loading states
  isLoadingAchievements: boolean;
  isLoadingStats: boolean;
  isLoadingLeaderboard: boolean;
  
  // Actions
  updateStats: (category: keyof UserStatsBreakdown, updates: Partial<UserStatsBreakdown[keyof UserStatsBreakdown]>) => Promise<Achievement[]>;
  unlockAchievement: (achievementId: string) => Promise<Achievement | null>;
  refreshData: () => Promise<void>;
  
  // Error states
  achievementsError: Error | null;
  statsError: Error | null;
  leaderboardError: Error | null;
}

export const useAchievements = ({
  userId,
  enableRealtime = true,
  onAchievementUnlocked,
}: UseAchievementsOptions): UseAchievementsReturn => {
  const queryClient = useQueryClient();
  const { scheduleNotification } = useNotifications();

  // Query keys
  const achievementsKey = ['achievements', userId];
  const statsKey = ['userStats', userId];
  const leaderboardKey = ['leaderboard'];

  // Fetch user achievements
  const {
    data: achievements = [],
    isLoading: isLoadingAchievements,
    error: achievementsError,
  } = useQuery({
    queryKey: achievementsKey,
    queryFn: () => achievementService.getUserAchievements(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch user stats
  const {
    data: userStats = null,
    isLoading: isLoadingStats,
    error: statsError,
  } = useQuery({
    queryKey: statsKey,
    queryFn: () => achievementService.getUserStats(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch leaderboard
  const {
    data: leaderboard = [],
    isLoading: isLoadingLeaderboard,
    error: leaderboardError,
  } = useQuery({
    queryKey: leaderboardKey,
    queryFn: () => achievementService.getLeaderboard(50, userId),
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Update user stats mutation
  const updateStatsMutation = useMutation({
    mutationFn: async ({
      category,
      updates,
    }: {
      category: keyof UserStatsBreakdown;
      updates: Partial<UserStatsBreakdown[keyof UserStatsBreakdown]>;
    }) => {
      return achievementService.updateUserStats(userId, category, updates);
    },
    onSuccess: (unlockedAchievements) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: statsKey });
      queryClient.invalidateQueries({ queryKey: achievementsKey });
      queryClient.invalidateQueries({ queryKey: leaderboardKey });

      // Handle newly unlocked achievements
      unlockedAchievements.forEach(handleAchievementUnlock);
    },
    onError: (error) => {
      log.error('Failed to update user stats:', error);
    },
  });

  // Unlock achievement mutation
  const unlockAchievementMutation = useMutation({
    mutationFn: (achievementId: string) => {
      return achievementService.unlockAchievement(userId, achievementId);
    },
    onSuccess: (achievement) => {
      if (achievement) {
        // Invalidate and refetch related queries
        queryClient.invalidateQueries({ queryKey: statsKey });
        queryClient.invalidateQueries({ queryKey: achievementsKey });
        queryClient.invalidateQueries({ queryKey: leaderboardKey });

        handleAchievementUnlock(achievement);
      }
    },
    onError: (error) => {
      log.error('Failed to unlock achievement:', error);
    },
  });

  // Handle achievement unlock with notifications and callbacks
  const handleAchievementUnlock = useCallback(async (achievement: Achievement) => {
    try {
      // Schedule celebration notification
      await scheduleNotification({
        identifier: `achievement_${achievement.achievementId}`,
        title: 'Achievement Unlocked! 🏆',
        body: `Congratulations! You've unlocked: ${achievement.title}`,
        data: {
          type: 'achievement_unlocked',
          achievementId: achievement.achievementId,
          points: achievement.metadata.points,
        },
        scheduledFor: new Date(Date.now() + 1000), // 1 second delay
      });

      // Call parent callback
      onAchievementUnlocked?.(achievement);

      log.info('Achievement unlocked notification sent:', achievement.achievementId);
    } catch (error) {
      log.error('Failed to handle achievement unlock:', error);
    }
  }, [scheduleNotification, onAchievementUnlocked]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: achievementsKey }),
        queryClient.invalidateQueries({ queryKey: statsKey }),
        queryClient.invalidateQueries({ queryKey: leaderboardKey }),
      ]);
    } catch (error) {
      log.error('Failed to refresh achievement data:', error);
    }
  }, [queryClient]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!enableRealtime || !userId) return;

    // TODO: Set up Supabase real-time subscriptions for achievements and stats
    // This would listen for changes to user_achievements and user_stats tables
    
    const cleanup = () => {
      // Cleanup subscriptions
    };

    return cleanup;
  }, [userId, enableRealtime]);

  // Wrapper functions for mutations
  const updateStats = useCallback(
    async (
      category: keyof UserStatsBreakdown,
      updates: Partial<UserStatsBreakdown[keyof UserStatsBreakdown]>
    ): Promise<Achievement[]> => {
      const result = await updateStatsMutation.mutateAsync({ category, updates });
      return result;
    },
    [updateStatsMutation]
  );

  const unlockAchievement = useCallback(
    async (achievementId: string): Promise<Achievement | null> => {
      const result = await unlockAchievementMutation.mutateAsync(achievementId);
      return result;
    },
    [unlockAchievementMutation]
  );

  return {
    // Data
    achievements,
    userStats,
    leaderboard,
    
    // Loading states
    isLoadingAchievements,
    isLoadingStats,
    isLoadingLeaderboard,
    
    // Actions
    updateStats,
    unlockAchievement,
    refreshData,
    
    // Error states
    achievementsError: achievementsError as Error | null,
    statsError: statsError as Error | null,
    leaderboardError: leaderboardError as Error | null,
  };
};

export default useAchievements;
