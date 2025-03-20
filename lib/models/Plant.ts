import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text, relation } from '@nozbe/watermelondb/decorators';
import { GrowJournal } from './GrowJournal';
import { Associations } from '@nozbe/watermelondb/Model';

export class Plant extends Model {
  static table = 'plants';
  static associations: Associations = {
    grow_journals: { type: 'belongs_to' as const, key: 'journal_id' },
  };

  @text('plant_id') plantId!: string;
  @text('journal_id') journalId!: string;
  @text('name') name!: string;
  @text('strain') strain!: string;
  @text('planted_date') plantedDate!: string;
  @text('growth_stage') growthStage!: string;
  @field('height') height?: number;
  @text('notes') notes?: string;
  @text('image_url') imageUrl?: string;
  @text('user_id') userId!: string;
  @text('location_id') locationId?: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('grow_journals', 'journal_id') journal!: GrowJournal;
}
