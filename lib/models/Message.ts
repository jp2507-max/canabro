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

import { ConversationThread } from './ConversationThread';

export interface MessageAttachment {
  attachmentId: string;
  type: 'image' | 'file' | 'plant_photo' | 'strain_info';
  url: string;
  thumbnailUrl?: string;
  filename: string;
  fileSize: number;
  metadata?: Record<string, any>;
}

export interface MessageReaction {
  userId: string;
  emoji: string;
  reactedAt: Date;
}

/**
 * Message model for chat messages in conversations
 */
export class Message extends Model {
  static table = 'messages';
  static associations: Associations = {
    conversation_threads: { type: 'belongs_to' as const, key: 'thread_id' },
  };

  @text('thread_id') threadId!: string;
  @text('sender_id') senderId!: string;
  @text('content') content!: string;
  @text('message_type') messageType!: string; // 'text' | 'image' | 'file' | 'plant_share' | 'location'
  @json('attachments', (json) => json) attachments?: MessageAttachment[];
  @text('reply_to') replyTo?: string; // Message ID being replied to
  @json('reactions', (json) => json) reactions?: MessageReaction[];
  @field('is_edited') isEdited!: boolean;
  @date('delivered_at') deliveredAt?: Date;
  @date('read_at') readAt?: Date;
  @field('is_deleted') isDeleted?: boolean;
  @date('last_synced_at') lastSyncedAt?: Date;
  @readonly @date('sent_at') sentAt!: Date;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Relations
  @relation('conversation_threads', 'thread_id') thread!: ConversationThread;

  // Computed properties
  get isTextMessage(): boolean {
    return this.messageType === 'text';
  }

  get hasAttachments(): boolean {
    return (this.attachments?.length || 0) > 0;
  }

  get isReply(): boolean {
    return !!this.replyTo;
  }

  get hasReactions(): boolean {
    return (this.reactions?.length || 0) > 0;
  }

  get reactionCount(): number {
    return this.reactions?.length || 0;
  }

  // Writer methods
  @writer async markAsDelivered() {
    await this.update((message) => {
      message.deliveredAt = new Date();
    });
  }

  @writer async markAsRead() {
    await this.update((message) => {
      message.readAt = new Date();
    });
  }

  @writer async editContent(newContent: string) {
    await this.update((message) => {
      message.content = newContent;
      message.isEdited = true;
    });
  }

  @writer async addReaction(userId: string, emoji: string) {
    await this.update((message) => {
      const currentReactions = message.reactions || [];
      const existingReaction = currentReactions.find(r => r.userId === userId && r.emoji === emoji);
      
      if (!existingReaction) {
        message.reactions = [
          ...currentReactions,
          { userId, emoji, reactedAt: new Date() }
        ];
      }
    });
  }

  @writer async removeReaction(userId: string, emoji: string) {
    await this.update((message) => {
      const currentReactions = message.reactions || [];
      message.reactions = currentReactions.filter(
        r => !(r.userId === userId && r.emoji === emoji)
      );
    });
  }

  @writer async addAttachment(attachment: MessageAttachment) {
    await this.update((message) => {
      const currentAttachments = message.attachments || [];
      message.attachments = [...currentAttachments, attachment];
    });
  }

  @writer async markAsDeleted() {
    await this.update((message) => {
      message.isDeleted = true;
      message.content = '[Message deleted]';
      message.attachments = [];
    });
  }
}