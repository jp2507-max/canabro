import { Model } from '@nozbe/watermelondb';
import {
  field,
  date,
  readonly,
  text,
  json,
  writer,
} from '@nozbe/watermelondb/decorators';

export interface PresenceData {
  location?: string; // Current screen/page
  activity?: string; // What the user is doing
  deviceInfo?: {
    platform: string;
    version: string;
  };
  customStatus?: string;
}

/**
 * UserPresence model for online status tracking
 */
export class UserPresence extends Model {
  static table = 'user_presence';

  @text('user_id') userId!: string;
  @text('status') status!: string; // 'online' | 'away' | 'busy' | 'offline'
  @date('last_seen') lastSeen!: Date;
  @field('is_online') isOnline!: boolean;
  @json('presence_data', (json) => json) presenceData?: PresenceData;
  @text('connection_id') connectionId?: string; // WebSocket connection ID
  @field('heartbeat_interval') heartbeatInterval?: number; // Seconds
  @date('last_heartbeat') lastHeartbeat?: Date;
  @field('is_deleted') isDeleted?: boolean;
  @date('last_synced_at') lastSyncedAt?: Date;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Computed properties
  get isActive(): boolean {
    if (!this.isOnline) return false;
    
    const now = new Date();
    const lastActivity = this.lastHeartbeat || this.lastSeen;
    const timeDiff = now.getTime() - lastActivity.getTime();
    const maxInactiveTime = (this.heartbeatInterval || 30) * 2 * 1000; // 2x heartbeat interval
    
    return timeDiff < maxInactiveTime;
  }

  get minutesSinceLastSeen(): number {
    const now = new Date();
    const timeDiff = now.getTime() - this.lastSeen.getTime();
    return Math.floor(timeDiff / (1000 * 60));
  }

  get isRecentlyActive(): boolean {
    return this.minutesSinceLastSeen < 5; // Active within last 5 minutes
  }

  get statusDisplay(): string {
    if (this.isOnline && this.isActive) {
      return this.status;
    } else if (this.isRecentlyActive) {
      return 'away';
    } else {
      return 'offline';
    }
  }

  // Writer methods
  @writer async updateStatus(status: string) {
    await this.update((presence) => {
      presence.status = status;
      presence.lastSeen = new Date();
      presence.isOnline = status !== 'offline';
    });
  }

  @writer async setOnline(connectionId?: string) {
    await this.update((presence) => {
      presence.isOnline = true;
      presence.status = 'online';
      presence.lastSeen = new Date();
      presence.lastHeartbeat = new Date();
      if (connectionId) {
        presence.connectionId = connectionId;
      }
    });
  }

  @writer async setOffline() {
    await this.update((presence) => {
      presence.isOnline = false;
      presence.status = 'offline';
      presence.lastSeen = new Date();
      presence.connectionId = undefined;
    });
  }

  @writer async updateHeartbeat() {
    await this.update((presence) => {
      presence.lastHeartbeat = new Date();
      presence.lastSeen = new Date();
      if (!presence.isOnline) {
        presence.isOnline = true;
        presence.status = 'online';
      }
    });
  }

  @writer async updatePresenceData(data: Partial<PresenceData>) {
    await this.update((presence) => {
      presence.presenceData = { ...presence.presenceData, ...data };
      presence.lastSeen = new Date();
    });
  }

  @writer async setCustomStatus(customStatus: string) {
    await this.update((presence) => {
      const currentData = presence.presenceData || {};
      presence.presenceData = { ...currentData, customStatus };
    });
  }

  @writer async updateLocation(location: string) {
    await this.update((presence) => {
      const currentData = presence.presenceData || {};
      presence.presenceData = { ...currentData, location };
      presence.lastSeen = new Date();
    });
  }

  @writer async setHeartbeatInterval(interval: number) {
    await this.update((presence) => {
      presence.heartbeatInterval = interval;
    });
  }

  @writer async markAsDeleted() {
    await this.update((presence) => {
      presence.isDeleted = true;
      presence.isOnline = false;
      presence.status = 'offline';
    });
  }
}