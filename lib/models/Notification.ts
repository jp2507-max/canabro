import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';

export class Notification extends Model {
  static table = 'notifications';
  static associations: Associations = {};

  @text('notification_id') notificationId!: string;
  @text('user_id') userId!: string;
  @text('title') title!: string;
  @text('message') message!: string;
  @text('type') type!: string;
  @field('is_read') isRead: boolean = false;
  @text('related_id') relatedId?: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
