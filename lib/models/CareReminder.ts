import { Model } from '@nozbe/watermelondb';
import { Associations } from '@nozbe/watermelondb/Model';
import {
  field,
  date,
  readonly,
  text,
  relation,
  writer,
} from '@nozbe/watermelondb/decorators';

import { Plant } from './Plant';

export class CareReminder extends Model {
  static table = 'care_reminders';
  static associations: Associations = {
    plants: { type: 'belongs_to' as const, key: 'plant_id' },
  };

  @text('plant_id') plantId!: string;
  @text('type') type!: string; // 'watering' | 'nutrients' | 'inspection' | 'custom'
  @text('title') title!: string;
  @text('description') description?: string;
  @date('scheduled_for') scheduledFor!: Date;
  @field('is_completed') isCompleted!: boolean;
  @field('repeat_interval') repeatInterval?: number; // days
  @date('completed_at') completedAt?: Date;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @date('last_synced_at') lastSyncedAt?: Date;
  @field('is_deleted') isDeleted?: boolean;

  // Relations
  @relation('plants', 'plant_id') plant!: Plant;

  // Derived properties
  get isActive(): boolean {
    return !this.isDeleted;
  }

  get isOverdue(): boolean {
    if (this.isCompleted) return false;
    return new Date() > this.scheduledFor;
  }

  get isDueToday(): boolean {
    if (this.isCompleted) return false;
    const today = new Date();
    const scheduledDate = new Date(this.scheduledFor);
    
    return (
      today.getFullYear() === scheduledDate.getFullYear() &&
      today.getMonth() === scheduledDate.getMonth() &&
      today.getDate() === scheduledDate.getDate()
    );
  }

  get isDueSoon(): boolean {
    if (this.isCompleted) return false;
    const now = new Date();
    const timeDiff = this.scheduledFor.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    return daysDiff <= 2 && daysDiff >= 0;
  }

  get daysUntilDue(): number {
    const now = new Date();
    const timeDiff = this.scheduledFor.getTime() - now.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  get formattedScheduledDate(): string {
    return this.scheduledFor.toLocaleDateString();
  }

  get priorityLevel(): 'low' | 'medium' | 'high' | 'urgent' {
    if (this.isCompleted) return 'low';
    
    const daysUntil = this.daysUntilDue;
    
    if (daysUntil < 0) return 'urgent'; // Overdue
    if (daysUntil === 0) return 'high'; // Due today
    if (daysUntil <= 2) return 'medium'; // Due soon
    return 'low'; // Due later
  }

  // Writer methods
  @writer async markAsCompleted() {
    await this.update((reminder) => {
      reminder.isCompleted = true;
      reminder.completedAt = new Date();
    });

    // If this is a repeating reminder, create the next one
    if (this.repeatInterval && this.repeatInterval > 0) {
      await this.createNextReminder();
    }
  }

  @writer async markAsIncomplete() {
    await this.update((reminder) => {
      reminder.isCompleted = false;
      reminder.completedAt = undefined;
    });
  }

  @writer async reschedule(newDate: Date) {
    await this.update((reminder) => {
      reminder.scheduledFor = newDate;
      reminder.isCompleted = false;
      reminder.completedAt = undefined;
    });
  }

  @writer async snooze(days: number = 1) {
    const newDate = new Date(this.scheduledFor);
    newDate.setDate(newDate.getDate() + days);
    await this.reschedule(newDate);
  }

  @writer async updateRepeatInterval(days: number) {
    await this.update((reminder) => {
      reminder.repeatInterval = days;
    });
  }

  private async createNextReminder() {
    if (!this.repeatInterval) return;

    const nextDate = new Date(this.scheduledFor);
    nextDate.setDate(nextDate.getDate() + this.repeatInterval);

    const database = this.database;
    await database.write(async () => {
      await database.get<CareReminder>('care_reminders').create((newReminder) => {
        newReminder.plantId = this.plantId;
        newReminder.type = this.type;
        newReminder.title = this.title;
        newReminder.description = this.description;
        newReminder.scheduledFor = nextDate;
        newReminder.isCompleted = false;
        newReminder.repeatInterval = this.repeatInterval;
      });
    });
  }

  @writer async markAsDeleted() {
    await this.update((reminder) => {
      reminder.isDeleted = true;
    });
  }
}