import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text, relation } from '@nozbe/watermelondb/decorators';

export class DiaryEntry extends Model {
  static table = 'diary_entries';
  static associations = {
    plants: { type: "belongs_to" as const, key: 'plant_id' },
  };

  @text('plant_id') plantId!: string;
  @text('entry_date') entryDate!: string;
  @text('content') content!: string;
  @text('image_url') imageUrl?: string;
  @text('user_id') userId!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('plants', 'plant_id') plant: any;
}
