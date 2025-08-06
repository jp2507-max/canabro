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

import { Message } from './Message';

/**
 * ConversationThread model for direct messaging and group conversations
 */
export class ConversationThread extends Model {
  static table = 'conversation_threads';
  static associations: Associations = {
    messages: { type: 'has_many' as const, foreignKey: 'thread_id' },
  };

  @text('thread_type') threadType!: string; // 'direct' | 'group'
  @json('participants', (json) => json) participants!: string[]; // Array of user IDs
  @text('last_message_id') lastMessageId?: string;
  @field('unread_count') unreadCount!: number;
  @text('created_by') createdBy!: string;
  @text('name') name?: string; // For group conversations
  @text('description') description?: string; // For group conversations
  @text('avatar_url') avatarUrl?: string; // For group conversations
  @json('settings', (json) => json) settings?: Record<string, any>; // Group settings
  @field('is_active') isActive!: boolean;
  @field('is_deleted') isDeleted?: boolean;
  @date('last_synced_at') lastSyncedAt?: Date;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Relations
  @children('messages') messages!: Query<Message>;

  // Computed properties
  get isDirectMessage(): boolean {
    return this.threadType === 'direct';
  }

  get isGroupConversation(): boolean {
    return this.threadType === 'group';
  }

  get participantCount(): number {
    return this.participants?.length || 0;
  }

  // Writer methods
  @writer async updateUnreadCount(count: number) {
    await this.update((thread) => {
      thread.unreadCount = count;
    });
  }

  @writer async markAsRead() {
    await this.update((thread) => {
      thread.unreadCount = 0;
    });
  }

  @writer async updateLastMessage(messageId: string) {
    await this.update((thread) => {
      thread.lastMessageId = messageId;
    });
  }

  @writer async addParticipant(userId: string) {
    await this.update((thread) => {
      const currentParticipants = thread.participants || [];
      if (!currentParticipants.includes(userId)) {
        thread.participants = [...currentParticipants, userId];
      }
    });
  }

  @writer async removeParticipant(userId: string) {
    await this.update((thread) => {
      const currentParticipants = thread.participants || [];
      thread.participants = currentParticipants.filter(id => id !== userId);
    });
  }

  @writer async updateSettings(newSettings: Record<string, any>) {
    await this.update((thread) => {
      thread.settings = { ...thread.settings, ...newSettings };
    });
  }

  @writer async markAsDeleted() {
    await this.update((thread) => {
      thread.isDeleted = true;
      thread.isActive = false;
    });
  }
}