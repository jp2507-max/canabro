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

  // Auth user reference (text field, references auth.users.id)
  @text('user_id') userId?: string;
  
  // Core profile fields
  @text('username') username!: string;
  @text('full_name') fullName?: string;
  @text('display_name') displayName?: string;
  @text('avatar_url') avatarUrl?: string;
  @date('birth_date') birthDate?: Date;
  @text('bio') bio?: string;
  
  // Growing-related fields
  @text('experience_level') experienceLevel?: string;
  @text('preferred_grow_method') preferredGrowMethod?: string;
  @field('growing_since') growingSince?: number; // bigint in Supabase
  @text('location') location?: string;
  @field('is_certified') isCertified?: boolean;
  @text('certifications') certifications?: string; // JSON array stored as text
  
  // Authentication fields
  @text('auth_provider') authProvider?: string;
  @field('email_verified') emailVerified?: boolean;
  @date('last_sign_in') lastSignIn?: Date;
  
  // Sync and status fields
  @text('_status') status?: string;
  @text('_changed') changed?: string;
  @field('is_deleted') isDeleted?: boolean;
  
  // Timestamps
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Children collections
  @children('plants') plants!: Query<Plant>;
  @children('posts') posts!: Query<Post>;

  /**
   * Returns parsed certifications array from serialized storage
   * Note: Supabase stores this as a text array, but WatermelonDB stores as JSON string
   */
  getCertifications(): string[] {
    return this.certifications ? JSON.parse(this.certifications) : [];
  }

  /**
   * Sets certifications by serializing to JSON string
   * Note: Supabase stores this as a text array, but WatermelonDB stores as JSON string
   */
  setCertifications(certs: string[]): void {
    this.certifications = JSON.stringify(certs);
  }
}
