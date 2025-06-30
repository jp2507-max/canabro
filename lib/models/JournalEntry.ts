import { Model } from '@nozbe/watermelondb';
import { Associations } from '@nozbe/watermelondb/Model';
import { date, readonly, text, relation } from '@nozbe/watermelondb/decorators'; // field is unused

import { GrowJournal } from './GrowJournal';

export class JournalEntry extends Model {
  static table = 'journal_entries';
  static associations: Associations = {
    grow_journals: { type: 'belongs_to' as const, key: 'journal_id' },
  };

  @text('entry_id') entryId!: string;
  @text('journal_id') journalId!: string;
  @text('user_id') userId!: string;
  @text('entry_date') entryDate!: string;
  @text('entry_type') entryType!: string;
  @text('title') title!: string;
  @text('content') content?: string;
  @text('media') media?: string; // Serialized JSON array
  @text('metrics') metrics?: string; // Serialized JSON
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Using strong typing for relationship
  @relation('grow_journals', 'journal_id') journal!: GrowJournal;

  // Helper methods for serialized data
  getMedia(): string[] {
    return this.media ? JSON.parse(this.media) : [];
  }

  setMedia(mediaUrls: string[]): void {
    this.media = JSON.stringify(mediaUrls);
  }

  getMetrics(): Record<string, any> {
    return this.metrics ? JSON.parse(this.metrics) : {};
  }

  setMetrics(metricsData: Record<string, any>): void {
    this.metrics = JSON.stringify(metricsData);
  }
}
