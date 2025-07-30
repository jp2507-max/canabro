import { Model } from '@nozbe/watermelondb';
import {
  field,
  date,
  readonly,
  text,
  json,
  writer,
} from '@nozbe/watermelondb/decorators';

import { User } from '@/lib/types/user';

export interface NotificationData {
  sourceId: string;
  sourceType: 'post' | 'comment' | 'message' | 'follow' | 'mention' | 'event';
  sourceUser?: User;
  additionalData?: Record<string, any>;
  deepLink: string;
}

export interface NotificationAction {
  actionId: string;
  label: string;
  type: 'like' | 'reply' | 'follow' | 'join' | 'dismiss';
  endpoint?: string;
  requiresConfirmation: boolean;
}

export type NotificationType = 
  | 'post_like' | 'post_comment' | 'comment_reply' | 'mention'
  | 'new_follower' | 'follow_post' | 'group_invite' | 'event_reminder'
  | 'message_received' | 'plant_milestone' | 'expert_response';

/**
 * Priority levels for notifications
 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Constants for notification priority levels
 */
export const NOTIFICATION_PRIORITIES = {
  LOW: 'low' as const,
  NORMAL: 'normal' as const,
  HIGH: 'high' as const,
  URGENT: 'urgent' as const,
} as const;

/**
 * Array of all valid priority values for validation
 */
export const VALID_PRIORITIES: readonly NotificationPriority[] = [
  NOTIFICATION_PRIORITIES.LOW,
  NOTIFICATION_PRIORITIES.NORMAL,
  NOTIFICATION_PRIORITIES.HIGH,
  NOTIFICATION_PRIORITIES.URGENT,
] as const;

/**
 * LiveNotification model for real-time community alerts
 */
export class LiveNotification extends Model {
  static table = 'live_notifications';

  @text('user_id') userId!: string;
  @text('notification_type') notificationType!: NotificationType;
  @text('title') title!: string;
  @text('message') message!: string;
  @json('data', (json) => json) data!: NotificationData;
  @text('priority') priority!: NotificationPriority;
  @field('is_read') isRead!: boolean;
  @field('is_actionable') isActionable!: boolean;
  @json('actions', (json) => json) actions?: NotificationAction[];
  @date('expires_at') expiresAt?: Date;
  @field('is_deleted') isDeleted?: boolean;
  @date('last_synced_at') lastSyncedAt?: Date;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Computed properties
  get isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  get isHighPriority(): boolean {
    return this.priority === NOTIFICATION_PRIORITIES.HIGH || 
           this.priority === NOTIFICATION_PRIORITIES.URGENT;
  }

  get hasActions(): boolean {
    return (this.actions?.length || 0) > 0;
  }

  get actionCount(): number {
    return this.actions?.length || 0;
  }

  /**
   * Get priority display information
   */
  get priorityInfo(): { level: NotificationPriority; displayName: string; color: string } {
    const priorityMap = {
      [NOTIFICATION_PRIORITIES.LOW]: {
        level: NOTIFICATION_PRIORITIES.LOW,
        displayName: 'Low',
        color: 'text-fg-muted', // semantic: foreground muted
      },
      [NOTIFICATION_PRIORITIES.NORMAL]: {
        level: NOTIFICATION_PRIORITIES.NORMAL,
        displayName: 'Normal',
        color: 'text-primary-foreground', // semantic: primary foreground
      },
      [NOTIFICATION_PRIORITIES.HIGH]: {
        level: NOTIFICATION_PRIORITIES.HIGH,
        displayName: 'High',
        color: 'text-attention-foreground', // semantic: attention foreground
      },
      [NOTIFICATION_PRIORITIES.URGENT]: {
        level: NOTIFICATION_PRIORITIES.URGENT,
        displayName: 'Urgent',
        color: 'text-danger-foreground', // semantic: danger foreground
      },
    };
    
    return priorityMap[this.priority];
  }

  /**
   * Validates if a priority value is valid
   */
  static isValidPriority(priority: string): priority is NotificationPriority {
    return VALID_PRIORITIES.includes(priority as NotificationPriority);
  }

  // Writer methods
  @writer async markAsRead() {
    await this.update((notification) => {
      notification.isRead = true;
    });
  }

  @writer async markAsUnread() {
    await this.update((notification) => {
      notification.isRead = false;
    });
  }

  @writer async updatePriority(priority: NotificationPriority) {
    if (!LiveNotification.isValidPriority(priority)) {
      throw new Error(`Invalid priority: ${priority}. Must be one of: ${VALID_PRIORITIES.join(', ')}`);
    }
    
    await this.update((notification) => {
      notification.priority = priority;
    });
  }

  @writer async addAction(action: NotificationAction) {
    await this.update((notification) => {
      const currentActions = notification.actions || [];
      notification.actions = [...currentActions, action];
      notification.isActionable = true;
    });
  }

  @writer async removeAction(actionId: string) {
    await this.update((notification) => {
      const currentActions = notification.actions || [];
      notification.actions = currentActions.filter(a => a.actionId !== actionId);
      notification.isActionable = notification.actions.length > 0;
    });
  }

  @writer async updateData(newData: Partial<NotificationData>) {
    await this.update((notification) => {
      notification.data = { ...notification.data, ...newData };
    });
  }

  @writer async markAsDeleted() {
    await this.update((notification) => {
      notification.isDeleted = true;
    });
  }

  @writer async setExpiration(expiresAt: Date) {
    await this.update((notification) => {
      notification.expiresAt = expiresAt;
    });
  }
}