import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text, children } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';

export class GrowJournal extends Model {
  static table = 'grow_journals';
  static associations: Associations = {
    journal_entries: { type: 'has_many' as const, foreignKey: 'journal_id' },
  };

  @text('journal_id') journalId!: string;
  @text('user_id') userId!: string;
  @text('title') title!: string;
  @text('description') description?: string;
  @text('plant_strain') plantStrain!: string;
  @text('start_date') startDate!: string;
  @text('status') status!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @children('journal_entries') journalEntries: any;
}
