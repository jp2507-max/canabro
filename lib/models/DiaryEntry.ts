import { Model } from '@nozbe/watermelondb';
import { Associations } from '@nozbe/watermelondb/Model';
import { field, date, readonly, text, relation } from '@nozbe/watermelondb/decorators';

import { Plant } from './Plant';

export class DiaryEntry extends Model {
  static table = 'diary_entries';
  static associations: Associations = {
    plant: { type: 'belongs_to' as const, key: 'plant_id' },
  };

  @text('entry_id') entryId!: string;
  @text('plant_id') plantId!: string;
  @text('entry_date') entryDate!: string;
  @text('entry_type') entryType!: string;
  @text('content') content!: string;
  @text('image_url') imageUrl?: string;
  @field('metrics') metrics?: string; // Added metrics field (JSON string)
  @text('user_id') userId!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @date('last_synced_at') lastSyncedAt?: Date;
  @field('is_deleted') isDeleted?: boolean;

  @relation('plant', 'plant_id') plant!: Plant;
}
