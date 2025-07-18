import { Q } from '@nozbe/watermelondb';
import { database } from '@/lib/models';
import { CareReminder } from '@/lib/models/CareReminder';
import { Plant } from '@/lib/models/Plant';
import { Logger } from '@/lib/utils/production-utils';

export interface CreateReminderOptions {
  plantId: string;
  type: 'watering' | 'nutrients' | 'inspection' | 'custom';
  title: string;
  description?: string;
  scheduledFor: Date;
  repeatInterval?: number; // days
}

export interface ReminderStats {
  total: number;
  overdue: number;
  dueToday: number;
  dueSoon: number; // within 2 days
  completed: number;
}

export class CareReminderService {
  private static instance: CareReminderService;
  
  public static getInstance(): CareReminderService {
    if (!CareReminderService.instance) {
      CareReminderService.instance = new CareReminderService();
    }
    return CareReminderService.instance;
  }

  /**
   * Create a new care reminder
   */
  async createReminder(options: CreateReminderOptions): Promise<CareReminder> {
    return await database.write(async () => {
      return await database.get<CareReminder>('care_reminders').create((reminder) => {
        reminder.plantId = options.plantId;
        reminder.type = options.type;
        reminder.title = options.title;
        reminder.description = options.description;
        reminder.scheduledFor = options.scheduledFor;
        reminder.isCompleted = false;
        reminder.repeatInterval = options.repeatInterval;
      });
    });
  }

  /**
   * Get all active reminders for a plant
   */
  async getActiveRemindersForPlant(plantId: string): Promise<CareReminder[]> {
    const reminders = await database.collections
      .get<CareReminder>('care_reminders')
      .query(
        Q.where('plant_id', plantId),
        Q.where('is_completed', false),
        Q.where('is_deleted', false),
        Q.sortBy('scheduled_for', Q.asc)
      )
      .fetch();

    return reminders;
  }

  /**
   * Get all active reminders across all plants
   */
  async getAllActiveReminders(): Promise<CareReminder[]> {
    const reminders = await database.collections
      .get<CareReminder>('care_reminders')
      .query(
        Q.where('is_completed', false),
        Q.where('is_deleted', false),
        Q.sortBy('scheduled_for', Q.asc)
      )
      .fetch();

    return reminders;
  }

  /**
   * Get reminders that need attention (overdue or due today)
   */
  async getRemindersNeedingAttention(): Promise<CareReminder[]> {
    const reminders = await this.getAllActiveReminders();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return reminders.filter((reminder) => {
      const scheduledDate = new Date(reminder.scheduledFor);
      return scheduledDate < tomorrow; // Overdue or due today
    });
  }

  /**
   * Get reminder statistics
   */
  async getReminderStats(): Promise<ReminderStats> {
    const allReminders = await database.collections
      .get<CareReminder>('care_reminders')
      .query(Q.where('is_deleted', false))
      .fetch();

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const twoDaysFromNow = new Date(today);
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    const stats: ReminderStats = {
      total: 0,
      overdue: 0,
      dueToday: 0,
      dueSoon: 0,
      completed: 0,
    };

    allReminders.forEach((reminder) => {
      if (reminder.isCompleted) {
        stats.completed++;
        return;
      }

      stats.total++;
      const scheduledDate = new Date(reminder.scheduledFor);

      if (scheduledDate < today) {
        stats.overdue++;
      } else if (
        scheduledDate >= today &&
        scheduledDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)
      ) {
        stats.dueToday++;
      } else if (scheduledDate < twoDaysFromNow) {
        stats.dueSoon++;
      }
    });

    return stats;
  }

  /**
   * Mark reminder as completed
   */
  async markReminderCompleted(reminderId: string): Promise<void> {
    try {
      const reminder = await database.collections
        .get<CareReminder>('care_reminders')
        .find(reminderId);
      await reminder.markAsCompleted();
    } catch (error) {
      Logger.error('Failed to mark reminder as completed', { reminderId, error });
      // Optionally, rethrow or handle as needed
    }
  }

  /**
   * Snooze reminder by specified days
   */
  async snoozeReminder(reminderId: string, days: number = 1): Promise<void> {
    try {
      const reminder = await database.collections
        .get<CareReminder>('care_reminders')
        .find(reminderId);
      await reminder.snooze(days);
    } catch (error) {
      Logger.error('Failed to snooze reminder', { reminderId, days, error });
    }
  }

  /**
   * Reschedule reminder to a specific date
   */
  async rescheduleReminder(reminderId: string, newDate: Date): Promise<void> {
    try {
      const reminder = await database.collections
        .get<CareReminder>('care_reminders')
        .find(reminderId);
      await reminder.reschedule(newDate);
    } catch (error) {
      Logger.error('Failed to reschedule reminder', { reminderId, newDate, error });
    }
  }

  /**
   * Delete reminder
   */
  async deleteReminder(reminderId: string): Promise<void> {
    try {
      const reminder = await database.collections
        .get<CareReminder>('care_reminders')
        .find(reminderId);
      await reminder.markAsDeleted();
    } catch (error) {
      Logger.error('Failed to delete reminder', { reminderId, error });
    }
  }

  /**
   * Create default reminders for a new plant
   */
  async createDefaultRemindersForPlant(plant: Plant): Promise<CareReminder[]> {
    const now = new Date();
    const reminders: CareReminder[] = [];

    // Default watering reminder (every 3 days)
    const wateringDate = new Date(now);
    wateringDate.setDate(wateringDate.getDate() + (plant.nextWateringDays || 3));
    
    const wateringReminder = await this.createReminder({
      plantId: plant.id,
      type: 'watering',
      title: `Water ${plant.name}`,
      description: 'Time to water your plant',
      scheduledFor: wateringDate,
      repeatInterval: plant.nextWateringDays || 3,
    });
    reminders.push(wateringReminder);

    // Default nutrient reminder (every 7 days)
    const nutrientDate = new Date(now);
    nutrientDate.setDate(nutrientDate.getDate() + (plant.nextNutrientDays || 7));
    
    const nutrientReminder = await this.createReminder({
      plantId: plant.id,
      type: 'nutrients',
      title: `Feed ${plant.name}`,
      description: 'Time to feed your plant with nutrients',
      scheduledFor: nutrientDate,
      repeatInterval: plant.nextNutrientDays || 7,
    });
    reminders.push(nutrientReminder);

    // Weekly inspection reminder
    const inspectionDate = new Date(now);
    inspectionDate.setDate(inspectionDate.getDate() + 7);
    
    const inspectionReminder = await this.createReminder({
      plantId: plant.id,
      type: 'inspection',
      title: `Check ${plant.name}`,
      description: 'Time for a general health inspection',
      scheduledFor: inspectionDate,
      repeatInterval: 7,
    });
    reminders.push(inspectionReminder);

    return reminders;
  }

  /**
   * Batch operations
   */
  async batchMarkCompleted(reminderIds: string[]): Promise<void> {
    // Import i18n for translations
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const i18n = require('@/lib/config/i18n').default;
    await database.write(async () => {
      const results = await Promise.all(
        reminderIds.map(async (id) => {
          try {
            const reminder = await database.collections
              .get<CareReminder>('care_reminders')
              .find(id);
            await reminder.markAsCompleted();
            return { id, success: true };
          } catch (error) {
            // Log error for this reminder, but continue
            console.warn(
              i18n.t('careReminder.batchMarkCompletedError', { id }),
              error
            );
            return { id, success: false, error };
          }
        })
      );
      // Optionally, handle/report results here if needed
    });
  }

  async batchSnooze(reminderIds: string[], days: number = 1): Promise<void> {
    await database.write(async () => {
      const promises = reminderIds.map(async (id) => {
        const reminder = await database.collections
          .get<CareReminder>('care_reminders')
          .find(id);
        return reminder.snooze(days);
      });
      
      await Promise.all(promises);
    });
  }

  async batchDelete(reminderIds: string[]): Promise<void> {
    await database.write(async () => {
      const promises = reminderIds.map(async (id) => {
        const reminder = await database.collections
          .get<CareReminder>('care_reminders')
          .find(id);
        return reminder.markAsDeleted();
      });
      
      await Promise.all(promises);
    });
  }

  /**
   * Clean up old completed reminders (older than 30 days)
   */
  async cleanupOldReminders(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldReminders = await database.collections
      .get<CareReminder>('care_reminders')
      .query(
        Q.where('is_completed', true),
        Q.where('completed_at', Q.lt(thirtyDaysAgo.getTime()))
      )
      .fetch();

    await database.write(async () => {
      const promises = oldReminders.map((reminder) => reminder.markAsDeleted());
      await Promise.all(promises);
    });

    return oldReminders.length;
  }
}

// Export singleton instance
export const careReminderService = CareReminderService.getInstance();