import { Model } from '@nozbe/watermelondb';
import { Associations } from '@nozbe/watermelondb/Model';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

export class Notification extends Model {
  static table = 'notifications';
  static associations: Associations = {};

  @text('notification_id') notificationId!: string;
  @text('user_id') userId!: string;
  @text('sender_id') senderId?: string;
  @text('type') type!: string;
  @text('content') content?: string;
  @text('related_post_id') relatedPostId?: string;
  @text('related_comment_id') relatedCommentId?: string;
  @field('is_read') isRead!: boolean;
  @readonly @date('created_at') createdAt!: Date;
}
