import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text, json } from '@nozbe/watermelondb/decorators';

/**
 * Achievement metadata interface
 */
export interface AchievementMetadata {
  category: 'growing' | 'community' | 'knowledge' | 'milestone' | 'social';
  difficulty: 'bronze' | 'silver' | 'gold' | 'platinum';
  points: number;
  iconName: string;
  // Use unknown for flexible metadata while avoiding any
  requirements?: Record<string, unknown>;
  progress?: {
    current: number;
    target: number;
  };
}

/**
 * UserAchievement model for tracking user achievements and gamification
 */
export class UserAchievement extends Model {
  static table = 'user_achievements';

  @text('user_id') userId!: string;
  @text('achievement_id') achievementId!: string;
  @text('title') title!: string;
  @text('description') description!: string;
  // WatermelonDB requires a sanitizer for @json fields
  @json('metadata', (raw) => (raw ?? {} as AchievementMetadata)) metadata!: AchievementMetadata;
  @field('points_earned') pointsEarned!: number;
  @field('is_unlocked') isUnlocked!: boolean;
  @field('progress_percentage') progressPercentage!: number;
  @readonly @date('unlocked_at') unlockedAt?: Date;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  /**
   * Check if achievement is completed
   */
  get isCompleted(): boolean {
    return this.isUnlocked && this.progressPercentage >= 100;
  }

  /**
   * Get achievement badge color based on difficulty
   */
  get badgeColor(): string {
    switch (this.metadata.difficulty) {
      case 'bronze':
        return '#CD7F32';
      case 'silver':
        return '#C0C0C0';
      case 'gold':
        return '#FFD700';
      case 'platinum':
        return '#E5E4E2';
      default:
        return '#CD7F32';
    }
  }

  /**
   * Get achievement category display name
   */
  get categoryDisplayName(): string {
    switch (this.metadata.category) {
      case 'growing':
        return 'Growing Expert';
      case 'community':
        return 'Community Leader';
      case 'knowledge':
        return 'Knowledge Seeker';
      case 'milestone':
        return 'Milestone Master';
      case 'social':
        return 'Social Butterfly';
      default:
        return 'Achievement';
    }
  }
}
