import { Model, Query } from '@nozbe/watermelondb';
import { Associations } from '@nozbe/watermelondb/Model';
import {
  field,
  date,
  readonly,
  text,
  json,
  children,
  writer,
} from '@nozbe/watermelondb/decorators';

import { GroupMember } from './GroupMember';

export interface GroupSettings {
  isPublic: boolean;
  allowInvites: boolean;
  requireApproval: boolean;
  maxMembers: number;
  allowFileSharing: boolean;
  moderationLevel: 'low' | 'medium' | 'high';
}

export interface GroupStats {
  memberCount: number;
  postCount: number;
  activeMembers: number;
  engagementRate: number;
  growthRate: number;
}

export type GroupCategory = 
  | 'strain_specific' | 'growing_method' | 'experience_level' | 'location_based'
  | 'problem_solving' | 'equipment' | 'nutrients' | 'harvest_techniques';

/**
 * SocialGroup model for interest-based communities
 */
export class SocialGroup extends Model {
  /**
   * Centralized default values for stats and settings to avoid duplication in writer methods.
   */
  static readonly DEFAULT_STATS: GroupStats = {
    memberCount: 0,
    postCount: 0,
    activeMembers: 0,
    engagementRate: 0,
    growthRate: 0,
  };

  static readonly DEFAULT_SETTINGS: GroupSettings = {
    isPublic: true,
    allowInvites: true,
    requireApproval: false,
    maxMembers: 1000,
    allowFileSharing: true,
    moderationLevel: 'medium',
  };
  static table = 'social_groups';
  static associations: Associations = {
    group_members: { type: 'has_many' as const, foreignKey: 'group_id' },
  };

  @text('name') name!: string;
  @text('description') description!: string;
  @text('category') category!: GroupCategory;
  @json('tags', (json) => json) tags!: string[];
  @text('avatar') avatar?: string;
  @text('cover_image') coverImage?: string;
  @json('settings', (json) => json) settings!: GroupSettings;
  @json('stats', (json) => json) stats!: GroupStats;
  @text('created_by') createdBy!: string;
  @field('is_active') isActive!: boolean;
  @field('is_deleted') isDeleted?: boolean;
  @date('last_synced_at') lastSyncedAt?: Date;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Relations
  @children('group_members') members!: Query<GroupMember>;

  // Computed properties
  get isPublic(): boolean {
    return this.settings?.isPublic || false;
  }

  get memberCount(): number {
    return this.stats?.memberCount || 0;
  }

  get isAtCapacity(): boolean {
    return this.memberCount >= (this.settings?.maxMembers || 1000);
  }

  get engagementRate(): number {
    return this.stats?.engagementRate || 0;
  }

  get daysSinceCreated(): number {
    const now = new Date();
    const timeDiff = now.getTime() - this.createdAt.getTime();
    return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  }

  // Writer methods
  @writer async updateName(name: string) {
    await this.update((group) => {
      group.name = name;
    });
  }

  @writer async updateDescription(description: string) {
    await this.update((group) => {
      group.description = description;
    });
  }

  @writer async updateSettings(newSettings: Partial<GroupSettings>) {
    await this.update((group) => {
      group.settings = { ...group.settings, ...newSettings };
    });
  }

  @writer async updateStats(newStats: Partial<GroupStats>) {
    await this.update((group) => {
      group.stats = { ...group.stats, ...newStats };
    });
  }

  @writer async addTag(tag: string) {
    await this.update((group) => {
      const currentTags = group.tags || [];
      if (!currentTags.includes(tag)) {
        group.tags = [...currentTags, tag];
      }
    });
  }

  @writer async removeTag(tag: string) {
    await this.update((group) => {
      const currentTags = group.tags || [];
      group.tags = currentTags.filter(t => t !== tag);
    });
  }

  @writer async updateAvatar(avatarUrl: string) {
    await this.update((group) => {
      group.avatar = avatarUrl;
    });
  }

  @writer async updateCoverImage(coverImageUrl: string) {
    await this.update((group) => {
      group.coverImage = coverImageUrl;
    });
  }

  @writer async incrementMemberCount() {
    await this.update((group) => {
      const currentStats = group.stats || SocialGroup.DEFAULT_STATS;
      group.stats = {
        ...currentStats,
        memberCount: currentStats.memberCount + 1
      };
    });
  }

  @writer async decrementMemberCount() {
    await this.update((group) => {
      const currentStats = group.stats || SocialGroup.DEFAULT_STATS;
      group.stats = {
        ...currentStats,
        memberCount: Math.max(0, currentStats.memberCount - 1)
      };
    });
  }

  @writer async updateModerationLevel(level: 'low' | 'medium' | 'high') {
    await this.update((group) => {
      const currentSettings = group.settings || SocialGroup.DEFAULT_SETTINGS;
      group.settings = {
        ...currentSettings,
        moderationLevel: level
      };
    });
  }

  @writer async setPrivate() {
    await this.update((group) => {
      const currentSettings = group.settings || SocialGroup.DEFAULT_SETTINGS;
      group.settings = {
        ...currentSettings,
        isPublic: false,
        requireApproval: true
      };
    });
  }

  @writer async setPublic() {
    await this.update((group) => {
      const currentSettings = group.settings || SocialGroup.DEFAULT_SETTINGS;
      group.settings = {
        ...currentSettings,
        isPublic: true,
        requireApproval: false
      };
    });
  }

  @writer async markAsDeleted() {
    await this.update((group) => {
      group.isDeleted = true;
      group.isActive = false;
    });
  }

  @writer async archive() {
    await this.update((group) => {
      group.isActive = false;
    });
  }

  @writer async reactivate() {
    await this.update((group) => {
      group.isActive = true;
      group.isDeleted = false;
    });
  }
}