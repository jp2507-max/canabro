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

import { Logger } from '@/lib/utils/production-utils';
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
    // Validate intervalHours is a positive number
    if (typeof intervalHours !== 'number' || isNaN(intervalHours) || intervalHours <= 0) {
      throw new Error('Interval hours must be a positive number');
    }

    // Set a reasonable upper limit (e.g., 1 year = 8760 hours)
    const MAX_INTERVAL_HOURS = 8760;
    if (intervalHours > MAX_INTERVAL_HOURS) {
      throw new Error(`Interval hours cannot exceed ${MAX_INTERVAL_HOURS} (1 year)`);
    }

    await this.update((schedule) => {
      schedule.intervalHours = intervalHours;
    });
  }

  @writer async updateSettings(settings: Partial<NotificationSettings>) {
    await this.update((schedule) => {
      const currentSettings = this.getNotificationSettings();
      schedule.notificationSettings = JSON.stringify({
        ...currentSettings,
        ...settings,
      });
    });
  }

  // Helper methods for JSON fields
  getNotificationSettings(): NotificationSettings | null {
    if (!this.notificationSettings) return null;
    
    try {
      return JSON.parse(this.notificationSettings);
    } catch (error) {
      Logger.error('Failed to parse notification settings:', error);
      // Return default settings if parsing fails
      return {
        enablePush: true,
        enableEmail: false,
        advanceNoticeMinutes: 30,
        priority: 'normal'
      };
    }
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

  private parseTimeString(timeString: string): { hour: number; minute: number } | null {
    if (typeof timeString !== 'string') return null;
    
    const parts = timeString.split(':');
    if (parts.length !== 2) return null;
    
    const hour = parseInt(parts[0], 10);
    const minute = parseInt(parts[1], 10);
    
    if (isNaN(hour) || isNaN(minute)) return null;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    
    return { hour, minute };
  }

  isInQuietHours(date: Date = new Date()): boolean {
    const settings = this.getNotificationSettings();
    const { quietHoursStart, quietHoursEnd } = settings || {};
    
    // Early return if either time string is missing or invalid
    if (!quietHoursStart || !quietHoursEnd || 
        typeof quietHoursStart !== 'string' || 
        typeof quietHoursEnd !== 'string') {
      return false;
    }

    const startTime = this.parseTimeString(quietHoursStart);
    const endTime = this.parseTimeString(quietHoursEnd);
    
    if (!startTime || !endTime) return false;

    const currentTime = date.getHours() * 60 + date.getMinutes();
    const quietStart = startTime.hour * 60 + startTime.minute;
    const quietEnd = endTime.hour * 60 + endTime.minute;

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