import { Model, Query, Q } from '@nozbe/watermelondb';
import { Associations } from '@nozbe/watermelondb/Model';
import {
  field,
  date,
  readonly,
  text,
  relation,
  children,
  lazy,
  writer,
} from '@nozbe/watermelondb/decorators';

import { DiaryEntry } from './DiaryEntry';
import { GrowJournal } from './GrowJournal';
import { Profile } from './Profile'; // Import Profile model

export class Plant extends Model {
  static table = 'plants';
  static associations: Associations = {
    grow_journals: { type: 'belongs_to' as const, key: 'journal_id' },
    diary_entries: { type: 'has_many' as const, foreignKey: 'plant_id' },
    profiles: { type: 'belongs_to' as const, key: 'user_id' }, // Add profile association
  };
  
  // Ensure all required fields are initialized with default values to prevent undefined errors

  // @text('plant_id') plantId!: string; // Removed redundant plant_id field
  @text('journal_id') journalId!: string;
  @text('name') name!: string;
  @text('strain') strain!: string;
  @text('strain_id') strainId?: string;
  @text('planted_date') plantedDate!: string;
  @text('growth_stage') growthStage!: string;
  @field('height') height?: number;
  @text('notes') notes?: string;
  @text('image_url') imageUrl?: string;
  @text('user_id') userId!: string;
  @text('location_id') locationId?: string; // Keep for future use, but form uses location_description for now
  @text('cannabis_type') cannabisType?: string; // Added
  @text('grow_medium') growMedium?: string; // Added
  @text('light_condition') lightCondition?: string; // Added
  @text('location_description') locationDescription?: string; // Added
  @field('is_auto_flower') isAutoFlower?: boolean; // Added
  @field('is_feminized') isFeminized?: boolean; // Added
  @field('thc_content') thcContent?: number; // Added
  @field('cbd_content') cbdContent?: number; // Added
  @text('expected_harvest_date') expectedHarvestDate?: string; // Added (using text for date string)
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @date('last_synced_at') lastSyncedAt?: Date;
  @field('is_deleted') isDeleted?: boolean;

  // Relations
  @relation('grow_journals', 'journal_id') journal!: GrowJournal;
  @relation('profiles', 'user_id') profile!: Profile; // Add profile relation

  // Children collections
  @children('diary_entries') diaryEntries!: Query<DiaryEntry>;

  // Custom queries
  @lazy activeEntries = this.diaryEntries.extend(Q.where('is_deleted', false));

  @lazy recentEntries = this.diaryEntries.extend(Q.sortBy('entry_date', 'desc'), Q.take(5));

  // Derived properties
  get isActive(): boolean {
    return !this.isDeleted;
  }

  get daysSincePlanting(): number {
    const planted = new Date(this.plantedDate);
    const now = new Date();
    return Math.floor((now.getTime() - planted.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Writer methods
  @writer async updateGrowthStage(stage: string) {
    await this.update((plant) => {
      plant.growthStage = stage;
    });
  }

  @writer async updateHeight(height: number) {
    await this.update((plant) => {
      plant.height = height;
    });
  }

  @writer async updateNotes(notes: string) {
    await this.update((plant) => {
      plant.notes = notes;
    });
  }

  @writer async markAsDeleted() {
    await this.update((plant) => {
      plant.isDeleted = true;
    });
  }

  @writer async updateImage(imageUrl: string) {
    await this.update((plant) => {
      plant.imageUrl = imageUrl;
    });
  }
}
