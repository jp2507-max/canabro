import { Model } from '@nozbe/watermelondb';
import { Associations } from '@nozbe/watermelondb/Model';
import {
  field,
  date,
  readonly,
  text,
  json,
  relation,
  writer,
} from '@nozbe/watermelondb/decorators';

import { LiveEvent } from './LiveEvent';

export interface EventPermissions {
  canSpeak: boolean;
  canShareScreen: boolean;
  canModerate: boolean;
  canInviteOthers: boolean;
  canRecord: boolean;
}

/**
 * EventParticipant model for live event participation
 */
export class EventParticipant extends Model {
  static table = 'event_participants';
  static associations: Associations = {
    live_events: { type: 'belongs_to' as const, key: 'event_id' },
  };

  @text('event_id') eventId!: string;
  @text('user_id') userId!: string;
  @text('role') role!: string; // 'host' | 'co_host' | 'speaker' | 'participant'
  @json('permissions', (json) => json) permissions!: EventPermissions;
  @field('is_active') isActive!: boolean;
  @date('joined_at') joinedAt?: Date;
  @date('left_at') leftAt?: Date;
  @field('duration_minutes') durationMinutes?: number;
  @field('is_deleted') isDeleted?: boolean;
  @date('last_synced_at') lastSyncedAt?: Date;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Relations
  @relation('live_events', 'event_id') event!: LiveEvent;

  // Computed properties
  get isHost(): boolean {
    return this.role === 'host';
  }

  get isCoHost(): boolean {
    return this.role === 'co_host';
  }

  get isSpeaker(): boolean {
    return this.role === 'speaker';
  }

  get isParticipant(): boolean {
    return this.role === 'participant';
  }

  get canModerate(): boolean {
    return this.permissions?.canModerate || this.isHost || this.isCoHost;
  }

  get hasJoined(): boolean {
    return !!this.joinedAt;
  }

  get hasLeft(): boolean {
    return !!this.leftAt;
  }

  get isCurrentlyInEvent(): boolean {
    return this.hasJoined && !this.hasLeft && this.isActive;
  }

  get participationDuration(): number {
    if (this.joinedAt && this.leftAt) {
      return this.leftAt.getTime() - this.joinedAt.getTime();
    } else if (this.joinedAt && this.isActive) {
      return new Date().getTime() - this.joinedAt.getTime();
    }
    return 0;
  }

  get participationMinutes(): number {
    return Math.floor(this.participationDuration / (1000 * 60));
  }

  // Writer methods
  @writer async updateRole(role: string) {
    await this.update((participant) => {
      participant.role = role;
      participant.permissions = this.getDefaultPermissionsForRole(role);
    });
  }

  @writer async promoteToSpeaker() {
    await this.update((participant) => {
      participant.role = 'speaker';
      participant.permissions = this.getDefaultPermissionsForRole('speaker');
    });
  }

  @writer async promoteToCoHost() {
    await this.update((participant) => {
      participant.role = 'co_host';
      participant.permissions = this.getDefaultPermissionsForRole('co_host');
    });
  }

  @writer async demoteToParticipant() {
    await this.update((participant) => {
      participant.role = 'participant';
      participant.permissions = this.getDefaultPermissionsForRole('participant');
    });
  }

  @writer async joinEvent() {
    await this.update((participant) => {
      participant.joinedAt = new Date();
      participant.isActive = true;
      participant.leftAt = undefined;
    });
  }

  @writer async leaveEvent() {
    await this.update((participant) => {
      participant.leftAt = new Date();
      participant.isActive = false;
      participant.durationMinutes = this.participationMinutes;
    });
  }

  @writer async updatePermissions(newPermissions: Partial<EventPermissions>) {
    await this.update((participant) => {
      participant.permissions = { ...participant.permissions, ...newPermissions };
    });
  }

  @writer async grantPermission(permission: keyof EventPermissions) {
    await this.update((participant) => {
      participant.permissions = {
        ...participant.permissions,
        [permission]: true
      };
    });
  }

  @writer async revokePermission(permission: keyof EventPermissions) {
    await this.update((participant) => {
      participant.permissions = {
        ...participant.permissions,
        [permission]: false
      };
    });
  }

  @writer async markAsDeleted() {
    await this.update((participant) => {
      participant.isDeleted = true;
      participant.isActive = false;
      if (!participant.leftAt) {
        participant.leftAt = new Date();
        participant.durationMinutes = this.participationMinutes;
      }
    });
  }

  // Helper method to get default permissions for a role
  private getDefaultPermissionsForRole(role: string): EventPermissions {
    switch (role) {
      case 'host':
        return {
          canSpeak: true,
          canShareScreen: true,
          canModerate: true,
          canInviteOthers: true,
          canRecord: true,
        };
      case 'co_host':
        return {
          canSpeak: true,
          canShareScreen: true,
          canModerate: true,
          canInviteOthers: true,
          canRecord: false,
        };
      case 'speaker':
        return {
          canSpeak: true,
          canShareScreen: true,
          canModerate: false,
          canInviteOthers: false,
          canRecord: false,
        };
      case 'participant':
      default:
        return {
          canSpeak: false,
          canShareScreen: false,
          canModerate: false,
          canInviteOthers: false,
          canRecord: false,
        };
    }
  }
}