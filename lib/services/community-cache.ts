/**
 * Community Features Caching System (2025 Optimizations)
 * 
 * Implements intelligent caching for messaging, notifications, and social features
 * with offline-first architecture and smart prefetching capabilities.
 */

import { MMKV } from 'react-native-mmkv';
import { DataCache } from './sync/cache';
import { log } from '../utils/logger';
import { smartCacheManager } from './smart-cache-manager';

// Community-specific MMKV instance for messaging and social data
const communityMMKV = new MMKV({ id: 'community-cache-v1' });

// Cache TTL constants (in milliseconds)
const CACHE_TTL = {
  MESSAGES: 30 * 60 * 1000, // 30 minutes
  CONVERSATIONS: 60 * 60 * 1000, // 1 hour
  NOTIFICATIONS: 15 * 60 * 1000, // 15 minutes
  USER_PRESENCE: 5 * 60 * 1000, // 5 minutes
  SOCIAL_FEED: 10 * 60 * 1000, // 10 minutes
  SEARCH_RESULTS: 20 * 60 * 1000, // 20 minutes
  USER_PROFILES: 2 * 60 * 60 * 1000, // 2 hours
} as const;

// Message compression utilities
interface CompressedMessage {
  id: string;
  content: string;
  senderId: string;
  timestamp: number;
  type: 'text' | 'image' | 'file';
  compressed: boolean;
}

interface CacheableMessage {
  id: string;
  content: string;
  senderId: string;
  timestamp?: number;
  type?: 'text' | 'image' | 'file';
}

interface CacheableNotification {
  id: string;
  type: string;
  timestamp: number;
  userId?: string;
}

interface CacheableFeedItem {
  id: string;
  imageUrl?: string;
  images?: string[];
  attachments?: Array<{
    type: string;
    url?: string;
  }>;
}

interface CacheStats {
  timestamp: number;
  caches: {
    messages: number;
    conversations: number;
    notifications: number;
    userPresence: number;
    socialFeed: number;
    search: number;
  };
  mmkvKeys: number;
}

interface MessageBatch {
  messages: CompressedMessage[];
  batchId: string;
  timestamp: number;
  conversationId: string;
}

/**
 * Message compression and deduplication utilities
 */
class MessageCompressor {
  private static readonly COMPRESSION_THRESHOLD = 100; // Compress messages longer than 100 chars
  private static readonly MAX_BATCH_SIZE = 50; // Maximum messages per batch

  /**
   * Compress message content for storage optimization
   */
  static compressMessage(message: CacheableMessage): CompressedMessage {
    const compressed: CompressedMessage = {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      timestamp: message.timestamp || Date.now(),
      type: message.type || 'text',
      compressed: false,
    };

    // Simple compression for long text messages
    if (message.content && message.content.length > this.COMPRESSION_THRESHOLD) {
      try {
        // Basic compression: remove extra whitespace and common patterns
        compressed.content = message.content
          .replace(/\s+/g, ' ')
          .trim();
        compressed.compressed = true;
      } catch (error) {
        log.warn('Message compression failed', { messageId: message.id, error });
      }
    }

    return compressed;
  }

  /**
   * Decompress message content for display
   */
  static decompressMessage(compressed: CompressedMessage): CacheableMessage {
    if (!compressed.compressed) {
      return compressed;
    }

    // For now, just return as-is since we only did basic whitespace compression
    return {
      ...compressed,
      content: compressed.content,
    };
  }

  /**
   * Create message batches for efficient storage and sync
   */
  static createMessageBatch(messages: CacheableMessage[], conversationId: string): MessageBatch {
    const compressedMessages = messages
      .slice(0, this.MAX_BATCH_SIZE)
      .map(msg => this.compressMessage(msg));

    return {
      messages: compressedMessages,
      batchId: `batch_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: Date.now(),
      conversationId,
    };
  }

  /**
   * Deduplicate messages based on ID and content hash
   */
  static deduplicateMessages(messages: CompressedMessage[]): CompressedMessage[] {
    const seen = new Set<string>();
    const deduplicated: CompressedMessage[] = [];

    for (const message of messages) {
      const key = `${message.id}_${this.hashContent(message.content)}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(message);
      }
    }

    return deduplicated;
  }

  private static hashContent(content: string): string {
    // Simple hash function for content deduplication
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
}

/**
 * Community Cache Manager for messaging and social features
 */
export class CommunityCacheManager {
  private messageCache = new DataCache();
  private conversationCache = new DataCache();
  private notificationCache = new DataCache();
  private userPresenceCache = new DataCache();
  private socialFeedCache = new DataCache();
  private searchCache = new DataCache();

  /**
   * Cache conversation messages with compression and deduplication
   */
  async cacheMessages(conversationId: string, messages: CacheableMessage[]): Promise<void> {
    try {
      // Compress and deduplicate messages
      const compressedMessages = messages.map(msg => MessageCompressor.compressMessage(msg));
      const deduplicatedMessages = MessageCompressor.deduplicateMessages(compressedMessages);

      // Create message batch
      const batch = MessageCompressor.createMessageBatch(deduplicatedMessages, conversationId);

      // Store in MMKV for persistence
      const cacheKey = `messages_${conversationId}`;
      communityMMKV.set(cacheKey, JSON.stringify(batch));

      // Store in memory cache for quick access
      this.messageCache.set(cacheKey, batch, CACHE_TTL.MESSAGES);

      log.debug('Messages cached successfully', {
        conversationId,
        originalCount: messages.length,
        compressedCount: deduplicatedMessages.length,
        batchId: batch.batchId,
      });
    } catch (error) {
      log.error('Failed to cache messages', { conversationId, error });
    }
  }

  /**
   * Retrieve cached messages with decompression
   */
  async getCachedMessages(conversationId: string): Promise<CacheableMessage[]> {
    try {
      const cacheKey = `messages_${conversationId}`;

      // Try memory cache first
      let batch: MessageBatch | null = null;
      try {
        batch = await this.messageCache.get(
          cacheKey,
          async () => {
            // Fallback to MMKV storage
            const stored = communityMMKV.getString(cacheKey);
            return stored ? JSON.parse(stored) : null;
          },
          CACHE_TTL.MESSAGES
        );
      } catch (error) {
        log.warn('Memory cache miss, trying MMKV', { conversationId, error });
        const stored = communityMMKV.getString(cacheKey);
        batch = stored ? JSON.parse(stored) : null;
      }

      if (!batch) {
        return [];
      }

      // Decompress messages
      const decompressedMessages = batch.messages.map(msg => 
        MessageCompressor.decompressMessage(msg)
      );

      log.debug('Messages retrieved from cache', {
        conversationId,
        messageCount: decompressedMessages.length,
        batchId: batch.batchId,
      });

      return decompressedMessages;
    } catch (error) {
      log.error('Failed to retrieve cached messages', { conversationId, error });
      return [];
    }
  }

  /**
   * Cache conversation metadata
   */
  async cacheConversation(conversationId: string, conversation: Record<string, unknown>): Promise<void> {
    try {
      const cacheKey = `conversation_${conversationId}`;
      
      // Store in both memory and persistent storage
      this.conversationCache.set(cacheKey, conversation, CACHE_TTL.CONVERSATIONS);
      communityMMKV.set(cacheKey, JSON.stringify(conversation));

      log.debug('Conversation cached', { conversationId });
    } catch (error) {
      log.error('Failed to cache conversation', { conversationId, error });
    }
  }

  /**
   * Cache user presence data
   */
  async cacheUserPresence(userId: string, presence: { status: string; lastSeen?: number }): Promise<void> {
    try {
      const cacheKey = `presence_${userId}`;
      
      // Only use memory cache for presence (short-lived data)
      this.userPresenceCache.set(cacheKey, presence, CACHE_TTL.USER_PRESENCE);

      log.debug('User presence cached', { userId, status: presence.status });
    } catch (error) {
      log.error('Failed to cache user presence', { userId, error });
    }
  }

  /**
   * Cache notifications with intelligent grouping
   */
  async cacheNotifications(userId: string, notifications: CacheableNotification[]): Promise<void> {
    try {
      const cacheKey = `notifications_${userId}`;
      
      // Group notifications by type and time for better UX
      const groupedNotifications = this.groupNotifications(notifications);
      
      this.notificationCache.set(cacheKey, groupedNotifications, CACHE_TTL.NOTIFICATIONS);
      communityMMKV.set(cacheKey, JSON.stringify(groupedNotifications));

      log.debug('Notifications cached', { 
        userId, 
        originalCount: notifications.length,
        groupedCount: groupedNotifications.length 
      });
    } catch (error) {
      log.error('Failed to cache notifications', { userId, error });
    }
  }

  /**
   * Cache social feed with smart prefetching
   */
  async cacheSocialFeed(userId: string, feedItems: CacheableFeedItem[]): Promise<void> {
    try {
      const cacheKey = `social_feed_${userId}`;
      
      // Extract image URLs for prefetching
      const imageUrls = this.extractImageUrls(feedItems);
      
      // Prefetch images in background
      if (imageUrls.length > 0) {
        smartCacheManager.prefetchImages(imageUrls, {
          priority: 'normal',
          isCritical: false,
        }).catch(error => {
          log.warn('Image prefetching failed', { error });
        });
      }

      this.socialFeedCache.set(cacheKey, feedItems, CACHE_TTL.SOCIAL_FEED);
      communityMMKV.set(cacheKey, JSON.stringify(feedItems));

      log.debug('Social feed cached', { 
        userId, 
        itemCount: feedItems.length,
        imageCount: imageUrls.length 
      });
    } catch (error) {
      log.error('Failed to cache social feed', { userId, error });
    }
  }

  /**
   * Cache search results with query-based keys
   */
  async cacheSearchResults(query: string, results: Record<string, unknown>[], filters?: Record<string, unknown>): Promise<void> {
    try {
      const filterHash = filters ? this.hashObject(filters) : '';
      const cacheKey = `search_${this.hashString(query)}_${filterHash}`;
      
      this.searchCache.set(cacheKey, results, CACHE_TTL.SEARCH_RESULTS);

      log.debug('Search results cached', { 
        query, 
        resultCount: results.length,
        cacheKey 
      });
    } catch (error) {
      log.error('Failed to cache search results', { query, error });
    }
  }

  /**
   * Get cached search results
   */
  async getCachedSearchResults(query: string, filters?: Record<string, unknown>): Promise<Record<string, unknown>[]> {
    try {
      const filterHash = filters ? this.hashObject(filters) : '';
      const cacheKey = `search_${this.hashString(query)}_${filterHash}`;
      
      const results = await this.searchCache.get(
        cacheKey,
        async () => null, // Don't fetch if not in cache
        CACHE_TTL.SEARCH_RESULTS
      );

      return results || [];
    } catch (error) {
      log.error('Failed to get cached search results', { query, error });
      return [];
    }
  }

  /**
   * Intelligent cache cleanup based on usage patterns
   */
  async performIntelligentCleanup(): Promise<void> {
    try {
      log.info('Starting intelligent cache cleanup');

      // Clean expired entries from all caches
      this.messageCache.evictExpired();
      this.conversationCache.evictExpired();
      this.notificationCache.evictExpired();
      this.userPresenceCache.evictExpired();
      this.socialFeedCache.evictExpired();
      this.searchCache.evictExpired();

      // Clean old MMKV entries
      await this.cleanupMMKVStorage();

      // Clear image cache if needed
      await smartCacheManager.handleMemoryPressure();

      log.info('Cache cleanup completed');
    } catch (error) {
      log.error('Cache cleanup failed', { error });
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): CacheStats {
    return {
      timestamp: Date.now(),
      caches: {
        messages: this.getCacheSize(this.messageCache),
        conversations: this.getCacheSize(this.conversationCache),
        notifications: this.getCacheSize(this.notificationCache),
        userPresence: this.getCacheSize(this.userPresenceCache),
        socialFeed: this.getCacheSize(this.socialFeedCache),
        search: this.getCacheSize(this.searchCache),
      },
      mmkvKeys: communityMMKV.getAllKeys().length,
    };
  }

  // Private helper methods

  private groupNotifications(notifications: CacheableNotification[]): Array<{
    groupKey: string;
    type: string;
    count: number;
    items: CacheableNotification[];
    hasMore: boolean;
    timestamp: number;
  }> {
    // Group notifications by type and time window (1 hour)
    const groups = new Map<string, CacheableNotification[]>();
    const timeWindow = 60 * 60 * 1000; // 1 hour

    for (const notification of notifications) {
      const timeSlot = Math.floor(notification.timestamp / timeWindow);
      const groupKey = `${notification.type}_${timeSlot}`;
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(notification);
    }

    // Convert groups back to array with group metadata
    return Array.from(groups.entries()).map(([groupKey, items]) => ({
      groupKey,
      type: items[0]?.type || 'text',
      count: items.length,
      items: items.slice(0, 5), // Limit to 5 items per group
      hasMore: items.length > 5,
      timestamp: Math.max(...items.map(item => item.timestamp)),
    }));
  }

  private extractImageUrls(feedItems: CacheableFeedItem[]): string[] {
    const urls: string[] = [];
    
    for (const item of feedItems) {
      if (item.imageUrl) {
        urls.push(item.imageUrl);
      }
      if (item.images && Array.isArray(item.images)) {
        urls.push(...item.images);
      }
      if (item.attachments && Array.isArray(item.attachments)) {
        for (const attachment of item.attachments) {
          if (attachment.type === 'image' && attachment.url) {
            urls.push(attachment.url);
          }
        }
      }
    }

    return urls;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  private hashObject(obj: Record<string, unknown>): string {
    return this.hashString(JSON.stringify(obj));
  }

  private getCacheSize(_cache: DataCache): number {
    // This is a simplified implementation
    // In a real scenario, you'd need to access private members or add a public method
    return 0;
  }

  private async cleanupMMKVStorage(): Promise<void> {
    try {
      const keys = communityMMKV.getAllKeys();
      const now = Date.now();
      let cleanedCount = 0;

      for (const key of keys) {
        try {
          const data = communityMMKV.getString(key);
          if (data) {
            const parsed = JSON.parse(data);
            
            // Check if data has expired based on timestamp
            if (parsed.timestamp && (now - parsed.timestamp) > (24 * 60 * 60 * 1000)) {
              communityMMKV.delete(key);
              cleanedCount++;
            }
          }
        } catch (_error) {
          // If we can't parse the data, it might be corrupted, so delete it
          communityMMKV.delete(key);
          cleanedCount++;
        }
      }

      log.debug('MMKV cleanup completed', { cleanedCount, totalKeys: keys.length });
    } catch (error) {
      log.error('MMKV cleanup failed', { error });
    }
  }
}

// Export singleton instance
export const communityCacheManager = new CommunityCacheManager();

// Export utilities for external use
export { MessageCompressor, CACHE_TTL };