import { Model, Query } from '@nozbe/watermelondb';
import { Associations } from '@nozbe/watermelondb/Model';
import {
  field,
  date,
  readonly,
  text,
  json,
  children,
  writer,
} from '@nozbe/watermelondb/decorators';

import { EventParticipant } from './EventParticipant';

export interface EventSettings {
  maxParticipants?: number;
  requiresApproval: boolean;
  allowQuestions: boolean;
  allowScreenSharing: boolean;
  recordEvent: boolean;
  isPublic: boolean;
  tags: string[];
}

export interface EventRecording {
  recordingId: string;
  url: string;
  duration: number;
  fileSize: number;
  thumbnailUrl?: string;
  recordedAt: Date;
}

export type EventType = 
  | 'q_and_a' | 'grow_along' | 'strain_review' | 'technique_demo'
  | 'harvest_party' | 'problem_solving' | 'expert_session';

export type EventStatus = 
  | 'scheduled' | 'live' | 'ended' | 'cancelled' | 'recorded';

/**
 * LiveEvent model for community events
 */
export class LiveEvent extends Model {
  static table = 'live_events';
  static associations: Associations = {
    event_participants: { type: 'has_many' as const, foreignKey: 'event_id' },
  };

  @text('title') title!: string;
  @text('description') description!: string;
  @text('event_type') eventType!: EventType;
  @text('host_id') hostId!: string;
  @json('co_hosts', (json) => json) coHosts?: string[];
  @date('scheduled_start') scheduledStart!: Date;
  @date('scheduled_end') scheduledEnd!: Date;
  @date('actual_start') actualStart?: Date;
  @date('actual_end') actualEnd?: Date;
  @text('status') status!: EventStatus;
  @json('settings', (json) => json) settings!: EventSettings;
  @json('recording', (json) => json) recording?: EventRecording;
  @field('is_deleted') isDeleted?: boolean;
  @date('last_synced_at') lastSyncedAt?: Date;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Relations
  @children('event_participants') participants!: Query<EventParticipant>;

  // Computed properties
  get isScheduled(): boolean {
    return this.status === 'scheduled';
  }

  get isLive(): boolean {
    return this.status === 'live';
  }

  get hasEnded(): boolean {
    return this.status === 'ended';
  }

  get isCancelled(): boolean {
    return this.status === 'cancelled';
  }

  get hasRecording(): boolean {
    return !!this.recording;
  }

  get duration(): number {
    if (this.actualStart && this.actualEnd) {
      return this.actualEnd.getTime() - this.actualStart.getTime();
    }
    return this.scheduledEnd.getTime() - this.scheduledStart.getTime();
  }

  get durationMinutes(): number {
    return Math.floor(this.duration / (1000 * 60));
  }

  get isUpcoming(): boolean {
    return this.isScheduled && new Date() < this.scheduledStart;
  }

  get isOverdue(): boolean {
    return this.isScheduled && new Date() > this.scheduledEnd;
  }

  get minutesUntilStart(): number {
    if (!this.isUpcoming) return 0;
    const now = new Date();
    const timeDiff = this.scheduledStart.getTime() - now.getTime();
    return Math.floor(timeDiff / (1000 * 60));
  }

  // Writer methods
  @writer async updateTitle(title: string) {
    await this.update((event) => {
      event.title = title;
    });
  }

  @writer async updateDescription(description: string) {
    await this.update((event) => {
      event.description = description;
    });
  }

  @writer async updateSchedule(scheduledStart: Date, scheduledEnd: Date) {
    await this.update((event) => {
      event.scheduledStart = scheduledStart;
      event.scheduledEnd = scheduledEnd;
    });
  }

  @writer async startEvent() {
    await this.update((event) => {
      event.status = 'live';
      event.actualStart = new Date();
    });
  }

  @writer async endEvent() {
    await this.update((event) => {
      event.status = 'ended';
      event.actualEnd = new Date();
    });
  }

  @writer async cancelEvent() {
    await this.update((event) => {
      event.status = 'cancelled';
    });
  }

  @writer async reschedule(newStart: Date, newEnd: Date) {
    await this.update((event) => {
      event.scheduledStart = newStart;
      event.scheduledEnd = newEnd;
      event.status = 'scheduled';
    });
  }

  @writer async updateSettings(newSettings: Partial<EventSettings>) {
    await this.update((event) => {
      event.settings = { ...event.settings, ...newSettings };
    });
  }

  @writer async addCoHost(userId: string) {
    await this.update((event) => {
      const currentCoHosts = event.coHosts || [];
      if (!currentCoHosts.includes(userId)) {
        event.coHosts = [...currentCoHosts, userId];
      }
    });
  }

  @writer async removeCoHost(userId: string) {
    await this.update((event) => {
      const currentCoHosts = event.coHosts || [];
      event.coHosts = currentCoHosts.filter(id => id !== userId);
    });
  }

  @writer async setRecording(recording: EventRecording) {
    await this.update((event) => {
      event.recording = recording;
      event.status = 'recorded';
    });
  }

  @writer async updateRecording(recordingData: Partial<EventRecording>) {
    await this.update((event) => {
      if (event.recording) {
        event.recording = { ...event.recording, ...recordingData };
      }
    });
  }

  @writer async addTag(tag: string) {
    await this.update((event) => {
      const currentSettings = event.settings || { requiresApproval: false, allowQuestions: true, allowScreenSharing: false, recordEvent: false, isPublic: true, tags: [] };
      const currentTags = currentSettings.tags || [];
      if (!currentTags.includes(tag)) {
        event.settings = {
          ...currentSettings,
          tags: [...currentTags, tag]
        };
      }
    });
  }

  @writer async removeTag(tag: string) {
    await this.update((event) => {
      const currentSettings = event.settings || { requiresApproval: false, allowQuestions: true, allowScreenSharing: false, recordEvent: false, isPublic: true, tags: [] };
      const currentTags = currentSettings.tags || [];
      event.settings = {
        ...currentSettings,
        tags: currentTags.filter(t => t !== tag)
      };
    });
  }

  @writer async markAsDeleted() {
    await this.update((event) => {
      event.isDeleted = true;
      if (event.status === 'scheduled') {
        event.status = 'cancelled';
      }
    });
  }
}