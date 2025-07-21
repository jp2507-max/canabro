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
import { PlantTask } from './PlantTask';

export class CalendarEvent extends Model {
  static table = 'calendar_events';
  static associations: Associations = {
    plants: { type: 'belongs_to' as const, key: 'plant_id' },
    plant_tasks: { type: 'belongs_to' as const, key: 'task_id' },
  };

  @text('title') title!: string;
  @text('description') description?: string;
  @date('start_date') startDate!: Date;
  @date('end_date') endDate?: Date;
  @text('event_type') eventType!: string; // 'task', 'milestone', 'reminder'
  @text('plant_id') plantId?: string;
  @text('task_id') taskId?: string;
  @field('is_all_day') isAllDay!: boolean;
  @text('recurrence_rule') recurrenceRule?: string; // RRULE format
  @field('metadata') metadata?: string; // JSON string
  @text('user_id') userId!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @date('last_synced_at') lastSyncedAt?: Date;
  @field('is_deleted') isDeleted?: boolean;

  // Relations
  @relation('plants', 'plant_id') plant?: Plant;
  @relation('plant_tasks', 'task_id') task?: PlantTask;

  // Writer methods
  @writer async updateEventDetails(
    title: string,
    description?: string,
    startDate?: Date,
    endDate?: Date
  ) {
    await this.update((event) => {
      event.title = title;
      if (description !== undefined) event.description = description;
      if (startDate) event.startDate = startDate;
      if (endDate) event.endDate = endDate;
    });
  }

  @writer async setRecurrence(recurrenceRule: string) {
    await this.update((event) => {
      event.recurrenceRule = recurrenceRule;
    });
  }

  @writer async updateMetadata(metadata: Record<string, any>) {
    await this.update((event) => {
      const currentMetadata = this.getMetadata();
      event.metadata = JSON.stringify({ ...currentMetadata, ...metadata });
    });
  }

  // Helper methods for JSON fields
  getMetadata(): Record<string, any> {
    if (!this.metadata) return {};
    
    try {
      return JSON.parse(this.metadata);
    } catch (error) {
      console.error('Failed to parse metadata:', error);
      return {};
    }
  }

  @writer async markAsDeleted() {
    await this.update((event) => {
      event.isDeleted = true;
    });
  }

  // Helper methods
  get isActive(): boolean {
    return !this.isDeleted;
  }

  get duration(): number {
    if (!this.endDate) return 0;
    return this.endDate.getTime() - this.startDate.getTime();
  }

  get isRecurring(): boolean {
    return !!this.recurrenceRule;
  }

  get isTask(): boolean {
    return this.eventType === 'task' && !!this.taskId;
  }

  get isMilestone(): boolean {
    return this.eventType === 'milestone';
  }

  get isReminder(): boolean {
    return this.eventType === 'reminder';
  }

  isOnDate(date: Date): boolean {
    const eventDate = new Date(this.startDate);
    const checkDate = new Date(date);
    
    return (
      eventDate.getFullYear() === checkDate.getFullYear() &&
      eventDate.getMonth() === checkDate.getMonth() &&
      eventDate.getDate() === checkDate.getDate()
    );
  }

  isInDateRange(startDate: Date, endDate: Date): boolean {
    return this.startDate >= startDate && this.startDate <= endDate;
  }
}