import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text, relation } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';

export class Post extends Model {
  static table = 'posts';
  static associations: Associations = {
    profiles: { type: 'belongs_to' as const, key: 'user_id' },
    plants: { type: 'belongs_to' as const, key: 'plant_id' },
  };

  @text('post_id') postId!: string;
  @text('user_id') userId!: string;
  @text('content') content!: string;
  @text('image_url') imageUrl?: string;
  @text('plant_id') plantId?: string;
  @field('likes_count') likesCount?: number;
  @field('comments_count') commentsCount?: number;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @date('last_synced_at') lastSyncedAt?: Date;
  @field('is_deleted') isDeleted?: boolean;

  @relation('profiles', 'user_id') profile: any;
  @relation('plants', 'plant_id') plant?: any;
}
