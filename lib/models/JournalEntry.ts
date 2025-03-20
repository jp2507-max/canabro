import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text, relation } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';
import { GrowJournal } from './GrowJournal';

export class JournalEntry extends Model {
  static table = 'journal_entries';
  static associations: Associations = {
    grow_journals: { type: 'belongs_to' as const, key: 'journal_id' },
  };

  @text('entry_id') entryId!: string;
  @text('journal_id') journalId!: string;
  @text('content') content!: string;
  @text('image_url') imageUrl?: string;
  @text('plant_stage') plantStage?: string;
  @field('plant_height') plantHeight?: number;
  @field('water_amount') waterAmount?: number;
  @text('nutrients') nutrients?: string;
  @field('temperature') temperature?: number;
  @field('humidity') humidity?: number;
  @field('light_hours') lightHours?: number;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Using strong typing for relationship
  @relation('grow_journals', 'journal_id') journal!: GrowJournal;
}
