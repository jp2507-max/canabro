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

export interface NotificationSettings {
  enablePush: boolean;
  enableEmail: boolean;
  quietHoursStart?: string; // HH:MM format
  quietHoursEnd?: string; // HH:MM format
  advanceNoticeMinutes: number;
  maxDailyNotifications?: number;
  priority: 'low' | 'normal' | 'high';
}

export class NotificationSchedule extends Model {
  static table = 'notification_schedules';
  static associations: Associations = {
    plants: { type: 'belongs_to' as const, key: 'plant_id' },
  };

  @text('plant_id') plantId!: string;
  @text('task_type') taskType!: string;
  @date('next_notification') nextNotification!: Date;
  @field('interval_hours') intervalHours!: number;
  @field('max_notifications') maxNotifications?: number;
  @field('sent_count') sentCount!: number;
  @field('is_active') isActive!: boolean;
  @field('notification_settings') notificationSettings?: string; // JSON string
  @text('user_id') userId!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @date('last_synced_at') lastSyncedAt?: Date;
  @field('is_deleted') isDeleted?: boolean;

  // Relations
  @relation('plants', 'plant_id') plant!: Plant;

  // Writer methods
  @writer async updateNextNotification(nextDate: Date) {
    await this.update((schedule) => {
      schedule.nextNotification = nextDate;
    });
  }

  @writer async incrementSentCount() {
    await this.update((schedule) => {
      schedule.sentCount = (schedule.sentCount || 0) + 1;
    });
  }

  @writer async updateInterval(intervalHours: number) {
    await this.update((schedule) => {
      schedule.intervalHours = intervalHours;
    });
  }

  @writer async updateSettings(settings: Partial<NotificationSettings>) {
    await this.update((schedule) => {
      const currentSettings = schedule.getNotificationSettings();
      schedule.notificationSettings = JSON.stringify({
        ...currentSettings,
        ...settings,
      });
    });
  }

  // Helper methods for JSON fields
  getNotificationSettings(): NotificationSettings | null {
    return this.notificationSettings ? JSON.parse(this.notificationSettings) : null;
  }

  @writer async activate() {
    await this.update((schedule) => {
      schedule.isActive = true;
    });
  }

  @writer async deactivate() {
    await this.update((schedule) => {
      schedule.isActive = false;
    });
  }

  @writer async markAsDeleted() {
    await this.update((schedule) => {
      schedule.isDeleted = true;
    });
  }

  @writer async resetSentCount() {
    await this.update((schedule) => {
      schedule.sentCount = 0;
    });
  }

  // Helper methods
  get isValid(): boolean {
    return !this.isDeleted && this.isActive;
  }

  get isDue(): boolean {
    return this.nextNotification <= new Date();
  }

  get hasReachedMaxNotifications(): boolean {
    if (!this.maxNotifications) return false;
    return this.sentCount >= this.maxNotifications;
  }

  get shouldSendNotification(): boolean {
    return this.isValid && this.isDue && !this.hasReachedMaxNotifications;
  }

  calculateNextNotification(): Date {
    const next = new Date(this.nextNotification);
    next.setHours(next.getHours() + this.intervalHours);
    return next;
  }

  isInQuietHours(date: Date = new Date()): boolean {
    const settings = this.getNotificationSettings();
    if (!settings?.quietHoursStart || !settings?.quietHoursEnd) return false;

    const currentTime = date.getHours() * 60 + date.getMinutes();
    const startTimeParts = settings.quietHoursStart.split(':').map(Number);
    const endTimeParts = settings.quietHoursEnd.split(':').map(Number);
    
    // Validate time parsing
    if (startTimeParts.length !== 2 || endTimeParts.length !== 2) return false;
    if (startTimeParts.some(isNaN) || endTimeParts.some(isNaN)) return false;
    
    const startHour = startTimeParts[0]!;
    const startMin = startTimeParts[1]!;
    const endHour = endTimeParts[0]!;
    const endMin = endTimeParts[1]!;
    
    const quietStart = startHour * 60 + startMin;
    const quietEnd = endHour * 60 + endMin;

    if (quietStart <= quietEnd) {
      return currentTime >= quietStart && currentTime <= quietEnd;
    } else {
      // Quiet hours span midnight
      return currentTime >= quietStart || currentTime <= quietEnd;
    }
  }

  getNextValidNotificationTime(): Date {
    const nextTime = new Date(this.calculateNextNotification());
    
    // Skip quiet hours if configured
    while (this.isInQuietHours(nextTime)) {
      nextTime.setMinutes(nextTime.getMinutes() + 30); // Check every 30 minutes
    }
    
    return nextTime;
  }
}