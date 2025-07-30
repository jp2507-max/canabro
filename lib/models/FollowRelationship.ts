import { Model } from '@nozbe/watermelondb';
import {
  field,
  date,
  readonly,
  text,
  json,
  writer,
} from '@nozbe/watermelondb/decorators';

export interface FollowNotificationSettings {
  newPosts: boolean;
  plantUpdates: boolean;
  achievements: boolean;
  liveEvents: boolean;
  directMessages: boolean;
}

/**
 * FollowRelationship model for user following
 */
export class FollowRelationship extends Model {
  static table = 'follow_relationships';

  @text('follower_id') followerId!: string;
  @text('following_id') followingId!: string;
  @json('notification_settings', (json) => json) notificationSettings!: FollowNotificationSettings;
  @text('relationship_type') relationshipType!: string; // 'follow' | 'mutual' | 'blocked'
  @field('is_active') isActive!: boolean;
  @field('is_deleted') isDeleted?: boolean;
  @date('last_synced_at') lastSyncedAt?: Date;
  @readonly @date('followed_at') followedAt!: Date;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Computed properties
  get isMutualFollow(): boolean {
    return this.relationshipType === 'mutual';
  }

  get isBlocked(): boolean {
    return this.relationshipType === 'blocked';
  }

  get isFollowing(): boolean {
    return this.relationshipType === 'follow' || this.relationshipType === 'mutual';
  }

  get daysSinceFollowed(): number {
    const now = new Date();
    const timeDiff = now.getTime() - this.followedAt.getTime();
    return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  }

  // Writer methods
  @writer async updateRelationshipType(type: string) {
    await this.update((relationship) => {
      relationship.relationshipType = type;
    });
  }

  @writer async setMutual() {
    await this.update((relationship) => {
      relationship.relationshipType = 'mutual';
    });
  }

  @writer async blockUser() {
    await this.update((relationship) => {
      relationship.relationshipType = 'blocked';
      relationship.isActive = false;
    });
  }

  @writer async unblockUser() {
    await this.update((relationship) => {
      relationship.relationshipType = 'follow';
      relationship.isActive = true;
    });
  }

  @writer async updateNotificationSettings(settings: Partial<FollowNotificationSettings>) {
    await this.update((relationship) => {
      relationship.notificationSettings = {
        ...relationship.notificationSettings,
        ...settings
      };
    });
  }

  @writer async enableAllNotifications() {
    await this.update((relationship) => {
      relationship.notificationSettings = {
        newPosts: true,
        plantUpdates: true,
        achievements: true,
        liveEvents: true,
        directMessages: true,
      };
    });
  }

  @writer async disableAllNotifications() {
    await this.update((relationship) => {
      relationship.notificationSettings = {
        newPosts: false,
        plantUpdates: false,
        achievements: false,
        liveEvents: false,
        directMessages: false,
      };
    });
  }

  @writer async unfollow() {
    await this.update((relationship) => {
      relationship.isActive = false;
      relationship.isDeleted = true;
    });
  }

  @writer async refollow() {
    await this.update((relationship) => {
      relationship.isActive = true;
      relationship.isDeleted = false;
      relationship.followedAt = new Date();
    });
  }

  @writer async markAsDeleted() {
    await this.update((relationship) => {
      relationship.isDeleted = true;
      relationship.isActive = false;
    });
  }
}