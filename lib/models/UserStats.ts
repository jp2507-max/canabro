import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text, json } from '@nozbe/watermelondb/decorators';

/**
 * User statistics breakdown interface
 */
export interface UserStatsBreakdown {
  growing: {
    plantsGrown: number;
    harvestsCompleted: number;
    strainsGrown: number;
    daysActive: number;
  };
  community: {
    postsCreated: number;
    commentsPosted: number;
    likesReceived: number;
    helpfulAnswers: number;
  };
  social: {
    followersCount: number;
    followingCount: number;
    groupsJoined: number;
    eventsAttended: number;
  };
  knowledge: {
    strainsReviewed: number;
    questionsAnswered: number;
    guidesShared: number;
    expertRating: number;
  };
}

/**
 * UserStats model for tracking user statistics and leaderboard data
 */
export class UserStats extends Model {
  static table = 'user_stats';

  @text('user_id') userId!: string;
  @field('total_points') totalPoints!: number;
  @field('level') level!: number;
  @field('experience_points') experiencePoints!: number;
  @field('points_to_next_level') pointsToNextLevel!: number;
  @field('achievements_unlocked') achievementsUnlocked!: number;
  @field('leaderboard_rank') leaderboardRank!: number;
  // WatermelonDB requires a sanitizer for @json fields
  @json('stats_breakdown', (raw) => (raw ?? {} as UserStatsBreakdown)) statsBreakdown!: UserStatsBreakdown;
  @readonly @date('last_activity') lastActivity!: Date;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  /**
   * Calculate level progress percentage
   */
  get levelProgress(): number {
    const levelBase = this.level * 1000; // Each level requires 1000 more points
    const currentLevelPoints = this.experiencePoints - (levelBase * (this.level - 1));
    const pointsForThisLevel = levelBase;
    return Math.min((currentLevelPoints / pointsForThisLevel) * 100, 100);
  }

  /**
   * Get user's primary expertise area
   */
  get primaryExpertise(): keyof UserStatsBreakdown {
    const breakdown = this.statsBreakdown;
    let maxCategory: keyof UserStatsBreakdown = 'growing';
    let maxScore = 0;

    Object.entries(breakdown).forEach(([category, stats]) => {
      const score = Object.values(stats).reduce((sum: number, value) => sum + (typeof value === 'number' ? value : 0), 0 as number);
      if ((score as number) > maxScore) {
        maxScore = score as number;
        maxCategory = category as keyof UserStatsBreakdown;
      }
    });

    return maxCategory;
  }

  /**
   * Check if user is active (activity within last 7 days)
   */
  get isActive(): boolean {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return this.lastActivity > sevenDaysAgo;
  }

  /**
   * Get user's title based on level and expertise
   */
  get userTitle(): string {
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
  }
}
