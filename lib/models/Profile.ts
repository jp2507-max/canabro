import { Model, Query } from '@nozbe/watermelondb';
import { Associations } from '@nozbe/watermelondb/Model';
import { field, date, readonly, text, children } from '@nozbe/watermelondb/decorators';

import { Plant } from './Plant'; // Import Plant model
import { Post } from './Post'; // Import Post model

/**
 * Profile model representing user profiles in the database
 */
export class Profile extends Model {
  static table = 'profiles';
  static associations: Associations = {
    plants: { type: 'has_many' as const, foreignKey: 'user_id' },
    posts: { type: 'has_many' as const, foreignKey: 'user_id' },
  };

  @text('user_id') userId!: string;
  @text('username') username!: string;
  @text('display_name') displayName?: string;
  @text('avatar_url') avatarUrl?: string;
  @text('experience_level') experienceLevel?: string;
  @text('preferred_grow_method') preferredGrowMethod?: string;
  @text('bio') bio?: string;
  @text('location') location?: string;
  @text('growing_since') growingSince?: string;
  @text('favorite_strains') favoriteStrains?: string;
  @field('is_certified') isCertified?: boolean;
  @text('certifications') certifications?: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @date('last_synced_at') lastSyncedAt?: Date;
  @field('is_deleted') isDeleted?: boolean;

  // Children collections
  @children('plants') plants!: Query<Plant>;
  @children('posts') posts!: Query<Post>;

  /**
   * Returns parsed certifications array from serialized storage
   */
  getCertifications(): string[] {
    return this.certifications ? JSON.parse(this.certifications) : [];
  }

  /**
   * Sets certifications by serializing to JSON string
   */
  setCertifications(certs: string[]): void {
    this.certifications = JSON.stringify(certs);
  }

  /**
   * Returns parsed favorite strains array from serialized storage
   */
  getFavoriteStrains(): string[] {
    return this.favoriteStrains ? JSON.parse(this.favoriteStrains) : [];
  }

  /**
   * Sets favorite strains by serializing to JSON string
   */
  setFavoriteStrains(strains: string[]): void {
    this.favoriteStrains = JSON.stringify(strains);
  }
}
