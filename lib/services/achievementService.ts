/**
 * Achievement Service
 * 
 * Handles achievement tracking, user stats updates, and leaderboard management
 * Integrates with Supabase for data persistence and real-time updates
 */

import { log } from '@/lib/utils/logger';
import supabase from '@/lib/supabase';
import { UserStats, UserStatsBreakdown } from '@/lib/models/UserStats';
import { AchievementMetadata } from '@/lib/models/UserAchievement';

export interface Achievement {
    id: string;
    achievementId: string;
    title: string;
    description: string;
    metadata: AchievementMetadata;
    pointsEarned: number;
    isUnlocked: boolean;
    progressPercentage: number;
    unlockedAt?: Date;
}

export interface LeaderboardEntry {
    userId: string;
    username: string;
    avatar?: string;
    totalPoints: number;
    level: number;
    rank: number;
    title: string;
    isCurrentUser: boolean;
}

export interface AchievementProgress {
    achievementId: string;
    currentValue: number;
    targetValue: number;
    progressPercentage: number;
}

class AchievementService {
    /**
     * Get user achievements with progress
     */
    async getUserAchievements(userId: string): Promise<Achievement[]> {
        try {
            const { data, error } = await supabase
                .from('user_achievements')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                log.error('Failed to fetch user achievements:', error);
                throw error;
            }

            return data.map(this.mapAchievementFromDB);
        } catch (error) {
            log.error('Error getting user achievements:', error);
            throw error;
        }
    }

    /**
     * Get user statistics
     */
    async getUserStats(userId: string): Promise<UserStats | null> {
        try {
            const { data, error } = await supabase
                .from('user_stats')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No stats found, initialize them
                    return await this.initializeUserStats(userId);
                }
                log.error('Failed to fetch user stats:', error);
                throw error;
            }

            return this.mapUserStatsFromDB(data);
        } catch (error) {
            log.error('Error getting user stats:', error);
            throw error;
        }
    }

    /**
     * Get leaderboard data
     */
    async getLeaderboard(limit: number = 50, currentUserId?: string): Promise<LeaderboardEntry[]> {
        try {
            const { data, error } = await supabase
                .from('user_stats')
                .select(`
          user_id,
          total_points,
          level,
          leaderboard_rank,
          profiles:user_id (
            username,
            avatar_url
          )
        `)
                .order('leaderboard_rank', { ascending: true })
                .limit(limit);

            if (error) {
                log.error('Failed to fetch leaderboard:', error);
                throw error;
            }

            if (!data) {
                return [];
            }

            // Type the database response properly - profiles comes as array from Supabase
            type LeaderboardDBEntry = {
                user_id: string;
                total_points: number;
                level: number;
                leaderboard_rank: number;
                profiles: {
                    username: string;
                    avatar_url?: string;
                }[] | null;
            };

            return data.map((entry: LeaderboardDBEntry) => {
                // Handle profiles array - take first element since it's a one-to-one relationship
                const profile = entry.profiles?.[0] || null;

                return {
                    userId: entry.user_id,
                    username: profile?.username || 'Anonymous',
                    avatar: profile?.avatar_url,
                    totalPoints: entry.total_points,
                    level: entry.level,
                    rank: entry.leaderboard_rank,
                    title: this.getUserTitle(entry.level, 'growing'), // Default to growing
                    isCurrentUser: entry.user_id === currentUserId,
                };
            });
        } catch (error) {
            log.error('Error getting leaderboard:', error);
            throw error;
        }
    }

    /**
     * Update user stats and check for achievement unlocks
     */
    async updateUserStats(
        userId: string,
        category: keyof UserStatsBreakdown,
        statUpdates: Partial<UserStatsBreakdown[keyof UserStatsBreakdown]>
    ): Promise<Achievement[]> {
        try {
            // Get current stats
            const currentStats = await this.getUserStats(userId);
            if (!currentStats) {
                throw new Error('User stats not found');
            }

            // Update the specific category stats
            const updatedBreakdown = {
                ...currentStats.statsBreakdown,
                [category]: {
                    ...currentStats.statsBreakdown[category],
                    ...statUpdates,
                },
            };

            // Update user stats in database
            const { error: updateError } = await supabase
                .from('user_stats')
                .update({
                    stats_breakdown: updatedBreakdown,
                    last_activity: new Date().toISOString(),
                })
                .eq('user_id', userId);

            if (updateError) {
                log.error('Failed to update user stats:', updateError);
                throw updateError;
            }

            // Check for achievement unlocks
            const unlockedAchievements = await this.checkAchievementUnlocks(userId, updatedBreakdown);

            log.info(`Updated user stats for ${userId}, unlocked ${unlockedAchievements.length} achievements`);
            return unlockedAchievements;
        } catch (error) {
            log.error('Error updating user stats:', error);
            throw error;
        }
    }

    /**
     * Unlock achievement and award points
     */
    async unlockAchievement(userId: string, achievementId: string): Promise<Achievement | null> {
        try {
            // Get achievement details
            const { data: achievementData, error: achievementError } = await supabase
                .from('user_achievements')
                .select('*')
                .eq('user_id', userId)
                .eq('achievement_id', achievementId)
                .single();

            if (achievementError || !achievementData) {
                log.error('Achievement not found:', achievementError);
                return null;
            }

            // Check if already unlocked
            if (achievementData.is_unlocked) {
                return this.mapAchievementFromDB(achievementData);
            }

            // Unlock achievement
            const { data: updatedAchievement, error: unlockError } = await supabase
                .from('user_achievements')
                .update({
                    is_unlocked: true,
                    progress_percentage: 100,
                    points_earned: achievementData.metadata.points,
                    unlocked_at: new Date().toISOString(),
                })
                .eq('user_id', userId)
                .eq('achievement_id', achievementId)
                .select()
                .single();

            if (unlockError) {
                log.error('Failed to unlock achievement:', unlockError);
                throw unlockError;
            }

            // Award points using database function
            const { error: pointsError } = await supabase.rpc('award_achievement_points', {
                p_user_id: userId,
                p_achievement_id: achievementId,
                p_points: achievementData.metadata.points,
            });

            if (pointsError) {
                log.error('Failed to award achievement points:', pointsError);
                // Don't throw here, achievement is already unlocked
            }

            log.info(`Achievement unlocked: ${achievementId} for user ${userId}`);
            return this.mapAchievementFromDB(updatedAchievement);
        } catch (error) {
            log.error('Error unlocking achievement:', error);
            throw error;
        }
    }

    /**
     * Check for achievement unlocks based on updated stats
     */
    private async checkAchievementUnlocks(
        userId: string,
        statsBreakdown: UserStatsBreakdown
    ): Promise<Achievement[]> {
        try {
            const unlockedAchievements: Achievement[] = [];

            // Get all user achievements
            const achievements = await this.getUserAchievements(userId);

            // Check each achievement for unlock conditions
            for (const achievement of achievements) {
                if (achievement.isUnlocked) continue;

                const progress = this.calculateAchievementProgress(achievement, statsBreakdown);

                // Update progress in database
                await supabase
                    .from('user_achievements')
                    .update({ progress_percentage: progress.progressPercentage })
                    .eq('user_id', userId)
                    .eq('achievement_id', achievement.achievementId);

                // Check if achievement should be unlocked
                if (progress.progressPercentage >= 100) {
                    const unlockedAchievement = await this.unlockAchievement(userId, achievement.achievementId);
                    if (unlockedAchievement) {
                        unlockedAchievements.push(unlockedAchievement);
                    }
                }
            }

            return unlockedAchievements;
        } catch (error) {
            log.error('Error checking achievement unlocks:', error);
            return [];
        }
    }

    /**
     * Calculate achievement progress based on current stats
     */
    private calculateAchievementProgress(
        achievement: Achievement,
        statsBreakdown: UserStatsBreakdown
    ): AchievementProgress {
        const { achievementId, metadata } = achievement;

        let currentValue = 0;
        let targetValue = 1;

        // Define achievement requirements and calculate progress based on category
        switch (achievementId) {
            case 'first_plant':
                currentValue = statsBreakdown.growing.plantsGrown || 0;
                targetValue = 1;
                break;
            case 'first_harvest':
                currentValue = statsBreakdown.growing.harvestsCompleted || 0;
                targetValue = 1;
                break;
            case 'community_helper':
                currentValue = statsBreakdown.community.helpfulAnswers || 0;
                targetValue = 10;
                break;
            case 'strain_expert':
                currentValue = statsBreakdown.knowledge.strainsReviewed || 0;
                targetValue = 5;
                break;
            case 'social_butterfly':
                currentValue = statsBreakdown.social.followersCount || 0;
                targetValue = 25;
                break;
            case 'master_grower':
                currentValue = statsBreakdown.growing.plantsGrown || 0;
                targetValue = 10;
                break;
            case 'knowledge_seeker':
                currentValue = statsBreakdown.knowledge.questionsAnswered || 0;
                targetValue = 50;
                break;
            case 'community_leader':
                currentValue = statsBreakdown.community.helpfulAnswers || 0;
                targetValue = 100;
                break;
            default:
                // Use metadata requirements if available
                if (metadata.requirements) {
                    const requirementEntries = Object.entries(metadata.requirements);
                    if (requirementEntries.length > 0) {
                        const firstEntry = requirementEntries[0];
                        if (firstEntry) {
                            const [statKey, statTarget] = firstEntry;
                            // Only access valid categories from UserStatsBreakdown
                            if (metadata.category !== 'milestone' && metadata.category in statsBreakdown) {
                                const categoryStats = statsBreakdown[metadata.category as keyof UserStatsBreakdown];
                                currentValue = (categoryStats as Record<string, number>)[statKey] || 0;
                                targetValue = typeof statTarget === 'number' ? statTarget : 1;
                            }
                        }
                    }
                }
        }

        const progressPercentage = Math.min((currentValue / targetValue) * 100, 100);

        return {
            achievementId,
            currentValue,
            targetValue,
            progressPercentage,
        };
    }

    /**
     * Initialize user stats for new user
     */
    private async initializeUserStats(userId: string): Promise<UserStats> {
        try {
            const defaultStats = {
                user_id: userId,
                total_points: 0,
                level: 1,
                experience_points: 0,
                points_to_next_level: 1000,
                achievements_unlocked: 0,
                leaderboard_rank: 0,
                stats_breakdown: {
                    growing: { plantsGrown: 0, harvestsCompleted: 0, strainsGrown: 0, daysActive: 0 },
                    community: { postsCreated: 0, commentsPosted: 0, likesReceived: 0, helpfulAnswers: 0 },
                    social: { followersCount: 0, followingCount: 0, groupsJoined: 0, eventsAttended: 0 },
                    knowledge: { strainsReviewed: 0, questionsAnswered: 0, guidesShared: 0, expertRating: 0 },
                },
                last_activity: new Date().toISOString(),
            };

            const { data, error } = await supabase
                .from('user_stats')
                .insert(defaultStats)
                .select()
                .single();

            if (error) {
                log.error('Failed to initialize user stats:', error);
                throw error;
            }

            return this.mapUserStatsFromDB(data);
        } catch (error) {
            log.error('Error initializing user stats:', error);
            throw error;
        }
    }

    /**
     * Get user title based on level and primary expertise
     */
    private getUserTitle(level: number, expertise: keyof UserStatsBreakdown): string {
        const titles = {
            growing: ['Seedling', 'Sprout', 'Grower', 'Cultivator', 'Master Grower'],
            community: ['Newcomer', 'Helper', 'Contributor', 'Leader', 'Community Champion'],
            knowledge: ['Student', 'Learner', 'Scholar', 'Expert', 'Master Teacher'],
            social: ['Observer', 'Participant', 'Connector', 'Influencer', 'Social Master'],
        };

        const titleIndex = Math.min(Math.floor(level / 10), 4);
        return titles[expertise]?.[titleIndex] || 'Cannabis Enthusiast';
    }

    /**
     * Map achievement from database format
     */
    private mapAchievementFromDB(data: {
        id: string;
        achievement_id: string;
        title: string;
        description: string;
        metadata: AchievementMetadata;
        points_earned: number;
        is_unlocked: boolean;
        progress_percentage: number;
        unlocked_at?: string;
    }): Achievement {
        return {
            id: data.id,
            achievementId: data.achievement_id,
            title: data.title,
            description: data.description,
            metadata: data.metadata,
            pointsEarned: data.points_earned,
            isUnlocked: data.is_unlocked,
            progressPercentage: data.progress_percentage,
            unlockedAt: data.unlocked_at ? new Date(data.unlocked_at) : undefined,
        };
    }

    /**
     * Map user stats from database format
     */
    private mapUserStatsFromDB(data: {
        user_id: string;
        total_points: number;
        level: number;
        experience_points: number;
        points_to_next_level: number;
        achievements_unlocked: number;
        leaderboard_rank: number;
        stats_breakdown: UserStatsBreakdown;
        last_activity: string;
        created_at: string;
        updated_at: string;
    }): UserStats {
        // This would typically use WatermelonDB model, but for now return a plain object
        return {
            userId: data.user_id,
            totalPoints: data.total_points,
            level: data.level,
            experiencePoints: data.experience_points,
            pointsToNextLevel: data.points_to_next_level,
            achievementsUnlocked: data.achievements_unlocked,
            leaderboardRank: data.leaderboard_rank,
            statsBreakdown: data.stats_breakdown,
            lastActivity: new Date(data.last_activity),
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
            get levelProgress() {
                const levelBase = this.level * 1000;
                const currentLevelPoints = this.experiencePoints - (levelBase * (this.level - 1));
                const pointsForThisLevel = levelBase;
                return Math.min((currentLevelPoints / pointsForThisLevel) * 100, 100);
            },
            get primaryExpertise() {
                const breakdown = this.statsBreakdown;
                let maxCategory: keyof UserStatsBreakdown = 'growing';
                let maxScore = 0;

                Object.entries(breakdown).forEach(([category, stats]) => {
                    const score = Object.values(stats).reduce((sum: number, value) => sum + (typeof value === 'number' ? value : 0), 0);
                    if (score > maxScore) {
                        maxScore = score;
                        maxCategory = category as keyof UserStatsBreakdown;
                    }
                });

                return maxCategory;
            },
            get isActive() {
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                return this.lastActivity > sevenDaysAgo;
            },
            get userTitle() {
                const expertise = this.primaryExpertise;
                const level = this.level;
                const titles = {
                    growing: ['Seedling', 'Sprout', 'Grower', 'Cultivator', 'Master Grower'],
                    community: ['Newcomer', 'Helper', 'Contributor', 'Leader', 'Community Champion'],
                    knowledge: ['Student', 'Learner', 'Scholar', 'Expert', 'Master Teacher'],
                    social: ['Observer', 'Participant', 'Connector', 'Influencer', 'Social Master']
                };
                const titleIndex = Math.min(Math.floor(level / 10), 4);
                return titles[expertise]?.[titleIndex] || 'Cannabis Enthusiast';
            },
        } as UserStats;
    }
}

export const achievementService = new AchievementService();