/**
 * Community Service for Advanced Community Features
 * 
 * This service provides high-level methods for managing community features
 * including messaging, notifications, social groups, and live events.
 */

import { database } from '../models';
import { 
  ConversationThread, 
  Message, 
  LiveNotification, 
  UserPresence, 
  FollowRelationship, 
  SocialGroup, 
  GroupMember,
  LiveEvent, 
  EventParticipant, 
  CommunityPoll 
} from '../models';
import { realtimeService } from './realtimeService';
import { log } from '../utils/logger';
import { Q } from '@nozbe/watermelondb';

export interface CreateConversationParams {
  threadType: 'direct' | 'group';
  participants: string[];
  createdBy: string;
  name?: string;
  description?: string;
}

export interface SendMessageParams {
  threadId: string;
  senderId: string;
  content: string;
  messageType?: string;
  attachments?: any[];
  replyTo?: string;
}

export interface CreateNotificationParams {
  userId: string;
  notificationType: string;
  title: string;
  message: string;
  data: any;
  priority?: string;
  actions?: any[];
}

export interface CreateSocialGroupParams {
  name: string;
  description: string;
  category: string;
  tags: string[];
  createdBy: string;
  settings?: any;
}

export interface CreateLiveEventParams {
  title: string;
  description: string;
  eventType: string;
  hostId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  settings?: any;
}

class CommunityService {
  /**
   * MESSAGING METHODS
   */

  /**
   * Create a new conversation thread
   */
  async createConversation(params: CreateConversationParams): Promise<ConversationThread> {
    try {
      const conversation = await database.write(async () => {
        return await database.get<ConversationThread>('conversation_threads').create((thread) => {
          thread.threadType = params.threadType;
          thread.participants = params.participants;
          thread.createdBy = params.createdBy;
          thread.unreadCount = 0;
          thread.isActive = true;
          
          if (params.name) thread.name = params.name;
          if (params.description) thread.description = params.description;
        });
      });

      log.info('[CommunityService] Created conversation:', conversation.id);
      return conversation;
    } catch (error) {
      log.error('[CommunityService] Error creating conversation:', error);
      throw error;
    }
  }

  /**
   * Send a message in a conversation
   */
  async sendMessage(params: SendMessageParams): Promise<Message> {
    try {
      const message = await database.write(async () => {
        return await database.get<Message>('messages').create((msg) => {
          msg.threadId = params.threadId;
          msg.senderId = params.senderId;
          msg.content = params.content;
          msg.messageType = params.messageType || 'text';
          msg.isEdited = false;
          
          if (params.attachments) msg.attachments = params.attachments;
          if (params.replyTo) msg.replyTo = params.replyTo;
        });
      });

      // Update conversation's last message
      const conversation = await database.get<ConversationThread>('conversation_threads').find(params.threadId);
      await conversation.updateLastMessage(message.id);

      // Broadcast message via realtime
      await realtimeService.broadcast(`conversation:${params.threadId}`, {
        type: 'message',
        payload: {
          id: message.id,
          content: message.content,
          senderId: message.senderId,
          messageType: message.messageType,
        },
        userId: params.senderId,
        timestamp: Date.now(),
      });

      log.info('[CommunityService] Sent message:', message.id);
      return message;
    } catch (error) {
      log.error('[CommunityService] Error sending message:', error);
      throw error;
    }
  }

  /**
   * Get conversation messages
   */
  async getConversationMessages(threadId: string, limit: number = 50): Promise<Message[]> {
    try {
      const messages = await database.get<Message>('messages')
        .query(
          Q.where('thread_id', threadId),
          Q.where('is_deleted', Q.notEq(true)),
          Q.sortBy('sent_at', Q.desc),
          Q.take(limit)
        )
        .fetch();

      return messages;
    } catch (error) {
      log.error('[CommunityService] Error getting messages:', error);
      throw error;
    }
  }

  /**
   * NOTIFICATION METHODS
   */

  /**
   * Create a live notification
   */
  async createNotification(params: CreateNotificationParams): Promise<LiveNotification> {
    try {
      const notification = await database.write(async () => {
        return await database.get<LiveNotification>('live_notifications').create((notif) => {
          notif.userId = params.userId;
          notif.notificationType = params.notificationType as any;
          notif.title = params.title;
          notif.message = params.message;
          notif.data = params.data;
          notif.priority = params.priority || 'normal';
          notif.isRead = false;
          notif.isActionable = (params.actions?.length || 0) > 0;
          
          if (params.actions) notif.actions = params.actions;
        });
      });

      log.info('[CommunityService] Created notification:', notification.id);
      return notification;
    } catch (error) {
      log.error('[CommunityService] Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId: string, limit: number = 50): Promise<LiveNotification[]> {
    try {
      const notifications = await database.get<LiveNotification>('live_notifications')
        .query(
          Q.where('user_id', userId),
          Q.where('is_deleted', Q.notEq(true)),
          Q.sortBy('created_at', Q.desc),
          Q.take(limit)
        )
        .fetch();

      return notifications;
    } catch (error) {
      log.error('[CommunityService] Error getting notifications:', error);
      throw error;
    }
  }

  /**
   * PRESENCE METHODS
   */

  /**
   * Update user presence
   */
  async updateUserPresence(userId: string, status: string, presenceData?: any): Promise<UserPresence> {
    try {
      // Try to find existing presence record
      let presence: UserPresence;
      
      try {
        const existingPresences = await database.get<UserPresence>('user_presence')
          .query(Q.where('user_id', userId))
          .fetch();
        
        presence = existingPresences[0]!;
      } catch (error) {
        // No existing presence found, will create new one
        presence = null as any;
      }

      if (presence) {
        // Update existing presence
        await presence.updateStatus(status);
        if (presenceData) {
          await presence.updatePresenceData(presenceData);
        }
      } else {
        // Create new presence record
        presence = await database.write(async () => {
          return await database.get<UserPresence>('user_presence').create((pres) => {
            pres.userId = userId;
            pres.status = status;
            pres.lastSeen = new Date();
            pres.isOnline = status !== 'offline';
            
            if (presenceData) pres.presenceData = presenceData;
          });
        });
      }

      log.info('[CommunityService] Updated user presence:', { userId, status });
      return presence;
    } catch (error) {
      log.error('[CommunityService] Error updating presence:', error);
      throw error;
    }
  }

  /**
   * SOCIAL FEATURES METHODS
   */

  /**
   * Follow a user
   */
  async followUser(followerId: string, followingId: string): Promise<FollowRelationship> {
    try {
      const relationship = await database.write(async () => {
        return await database.get<FollowRelationship>('follow_relationships').create((rel) => {
          rel.followerId = followerId;
          rel.followingId = followingId;
          rel.relationshipType = 'follow';
          rel.isActive = true;
          rel.notificationSettings = {
            newPosts: true,
            plantUpdates: true,
            achievements: false,
            liveEvents: true,
            directMessages: true,
          };
        });
      });

      log.info('[CommunityService] Created follow relationship:', relationship.id);
      return relationship;
    } catch (error) {
      log.error('[CommunityService] Error following user:', error);
      throw error;
    }
  }

  /**
   * Create a social group
   */
  async createSocialGroup(params: CreateSocialGroupParams): Promise<SocialGroup> {
    try {
      const group = await database.write(async () => {
        return await database.get<SocialGroup>('social_groups').create((grp) => {
          grp.name = params.name;
          grp.description = params.description;
          grp.category = params.category as any;
          grp.tags = params.tags;
          grp.createdBy = params.createdBy;
          grp.isActive = true;
          grp.settings = params.settings || {
            isPublic: true,
            allowInvites: true,
            requireApproval: false,
            maxMembers: 1000,
            allowFileSharing: true,
            moderationLevel: 'medium',
          };
          grp.stats = {
            memberCount: 1, // Creator is first member
            postCount: 0,
            activeMembers: 1,
            engagementRate: 0,
            growthRate: 0,
          };
        });
      });

      // Add creator as admin member
      await database.write(async () => {
        await database.get<GroupMember>('group_members').create((member) => {
          member.groupId = group.id;
          member.userId = params.createdBy;
          member.role = 'admin';
          member.isActive = true;
          member.permissions = {
            canPost: true,
            canComment: true,
            canInvite: true,
            canModerate: true,
            canManageMembers: true,
            canEditGroup: true,
          };
        });
      });

      log.info('[CommunityService] Created social group:', group.id);
      return group;
    } catch (error) {
      log.error('[CommunityService] Error creating social group:', error);
      throw error;
    }
  }

  /**
   * LIVE EVENTS METHODS
   */

  /**
   * Create a live event
   */
  async createLiveEvent(params: CreateLiveEventParams): Promise<LiveEvent> {
    try {
      const event = await database.write(async () => {
        return await database.get<LiveEvent>('live_events').create((evt) => {
          evt.title = params.title;
          evt.description = params.description;
          evt.eventType = params.eventType as any;
          evt.hostId = params.hostId;
          evt.scheduledStart = params.scheduledStart;
          evt.scheduledEnd = params.scheduledEnd;
          evt.status = 'scheduled';
          evt.settings = params.settings || {
            requiresApproval: false,
            allowQuestions: true,
            allowScreenSharing: false,
            recordEvent: false,
            isPublic: true,
            tags: [],
          };
        });
      });

      // Add host as participant
      await database.write(async () => {
        await database.get<EventParticipant>('event_participants').create((participant) => {
          participant.eventId = event.id;
          participant.userId = params.hostId;
          participant.role = 'host';
          participant.isActive = true;
          participant.permissions = {
            canSpeak: true,
            canShareScreen: true,
            canModerate: true,
            canInviteOthers: true,
            canRecord: true,
          };
        });
      });

      log.info('[CommunityService] Created live event:', event.id);
      return event;
    } catch (error) {
      log.error('[CommunityService] Error creating live event:', error);
      throw error;
    }
  }

  /**
   * Create a community poll
   */
  async createCommunityPoll(
    question: string,
    options: string[],
    createdBy: string,
    settings?: any
  ): Promise<CommunityPoll> {
    try {
      const poll = await database.write(async () => {
        return await database.get<CommunityPoll>('community_polls').create((p) => {
          p.question = question;
          p.createdBy = createdBy;
          p.status = 'active';
          p.options = options.map((text, index) => ({
            optionId: `option_${index}`,
            text,
            votes: 0,
            voters: [],
          }));
          p.settings = settings || {
            allowMultipleChoices: false,
            requiresAuthentication: true,
            showResultsBeforeVoting: false,
            allowAddOptions: false,
            isAnonymous: false,
          };
          p.results = {
            totalVotes: 0,
            participantCount: 0,
            demographics: {
              experienceLevels: {},
              growingMethods: {},
              locations: {},
            },
            trends: [],
          };
        });
      });

      log.info('[CommunityService] Created community poll:', poll.id);
      return poll;
    } catch (error) {
      log.error('[CommunityService] Error creating poll:', error);
      throw error;
    }
  }

  /**
   * Initialize real-time subscriptions for a user
   */
  async initializeRealtimeSubscriptions(userId: string): Promise<void> {
    try {
      // Subscribe to user notifications
      await realtimeService.subscribeToNotifications(userId, {
        onNewNotification: (notification) => {
          log.info('[CommunityService] New notification received:', notification);
          // Handle new notification (e.g., show toast, update UI)
        },
        onNotificationUpdate: (notification) => {
          log.info('[CommunityService] Notification updated:', notification);
          // Handle notification update
        },
      });

      // Update user presence to online
      await this.updateUserPresence(userId, 'online');

      log.info('[CommunityService] Initialized realtime subscriptions for user:', userId);
    } catch (error) {
      log.error('[CommunityService] Error initializing realtime subscriptions:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources when user logs out or app closes
   */
  async cleanup(userId?: string): Promise<void> {
    try {
      if (userId) {
        // Set user presence to offline
        await this.updateUserPresence(userId, 'offline');
      }

      // Cleanup all realtime subscriptions
      await realtimeService.cleanup();

      log.info('[CommunityService] Cleanup completed');
    } catch (error) {
      log.error('[CommunityService] Error during cleanup:', error);
    }
  }
}

// Export singleton instance
export const communityService = new CommunityService();
export default communityService;