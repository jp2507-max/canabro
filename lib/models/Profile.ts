import { Model, Query } from '@nozbe/watermelondb';
import { field, date, readonly, text, children } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';
import { Plant } from './Plant'; // Import Plant model
import { Post } from './Post'; // Import Post model

export class Profile extends Model {
  static table = 'profiles';
  static associations: Associations = {
    plants: { type: 'has_many' as const, foreignKey: 'user_id' },
    posts: { type: 'has_many' as const, foreignKey: 'user_id' },
    // Add other associations here if needed (e.g., follows)
  };

  @text('user_id') userId!: string;
  @text('username') username!: string;
  @text('avatar_url') avatarUrl?: string;
  @text('bio') bio?: string;
  @text('experience_level') experienceLevel?: string;
  @text('preferred_grow_method') preferredGrowMethod?: string;
  @text('favorite_strains') favoriteStrains?: string; // Serialized array
  @text('growing_since') growingSince?: string; // Date as ISO string
  @text('location') location?: string;
  @field('is_certified') isCertified?: boolean;
  @text('certifications') certifications?: string; // Serialized array
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @date('last_synced_at') lastSyncedAt?: Date;
  @field('is_deleted') isDeleted?: boolean;

  // Children collections
  @children('plants') plants!: Query<Plant>;
  @children('posts') posts!: Query<Post>;
  
  // Helper methods to handle serialized arrays
  getFavoriteStrains(): string[] {
    return this.favoriteStrains ? JSON.parse(this.favoriteStrains) : [];
  }
  
  setFavoriteStrains(strains: string[]): void {
    this.favoriteStrains = JSON.stringify(strains);
  }
  
  getCertifications(): string[] {
    return this.certifications ? JSON.parse(this.certifications) : [];
  }
  
  setCertifications(certs: string[]): void {
    this.certifications = JSON.stringify(certs);
  }
}
