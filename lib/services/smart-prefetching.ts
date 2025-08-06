/**
 * Smart Prefetching Service (2025 Standards)
 * 
 * Implements intelligent content prefetching based on user behavior patterns,
 * network conditions, and predictive algorithms for community features.
 */

import { Observable, BehaviorSubject } from 'rxjs';
import { communityCacheManager } from './community-cache';
import { smartCacheManager } from './smart-cache-manager';
import { log } from '../utils/logger';
import database from '../database/database';

interface UserBehaviorPattern {
  userId: string;
  conversationFrequency: Record<string, number>; // conversationId -> access frequency
  topicInterests: Record<string, number>; // topic -> interest score
  activeHours: number[]; // Hours of day when user is most active (0-23)
  averageSessionDuration: number; // in minutes
  prefetchPreferences: {
    images: boolean;
    messages: boolean;
    notifications: boolean;
    socialFeed: boolean;
  };
  lastUpdated: number;
}

interface PrefetchTask {
  id: string;
  type: 'messages' | 'images' | 'social_feed' | 'notifications' | 'search_results';
  priority: 'immediate' | 'high' | 'normal' | 'low' | 'background';
  data: Record<string, unknown>;
  estimatedSize: number; // in bytes
  networkRequirement: 'wifi' | 'cellular' | 'any';
  expiresAt: number;
  createdAt: number;
  attempts: number;
}

interface PrefetchStrategy {
  name: string;
  condition: (context: PrefetchContext) => boolean;
  execute: (context: PrefetchContext) => Promise<PrefetchTask[]>;
  priority: number;
}

interface PrefetchContext {
  userId: string;
  currentTime: number;
  networkType: 'wifi' | 'cellular' | 'none';
  batteryLevel: number;
  isCharging: boolean;
  availableStorage: number;
  userBehavior: UserBehaviorPattern;
  recentActivity: Record<string, unknown>[];
}

interface PrefetchMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  bytesDownloaded: number;
  cacheHitRate: number;
  averageResponseTime: number;
  lastPrefetchTime: number;
}

/**
 * Smart Prefetching Manager for Community Features
 */
export class SmartPrefetchingManager {
  private behaviorPatterns = new Map<string, UserBehaviorPattern>();
  private prefetchQueue: PrefetchTask[] = [];
  private activeStrategies: PrefetchStrategy[] = [];
  private metrics: PrefetchMetrics = {
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    bytesDownloaded: 0,
    cacheHitRate: 0,
    averageResponseTime: 0,
    lastPrefetchTime: 0,
  };

  private isRunning = false;
  private currentContext: PrefetchContext | null = null;
  private metricsSubject = new BehaviorSubject<PrefetchMetrics>(this.metrics);

  constructor() {
    this.initializePrefetchStrategies();
    this.startPrefetchLoop();
  }

  /**
   * Start intelligent prefetching for a user
   */
  async startPrefetching(userId: string): Promise<void> {
    try {
      log.info('Starting smart prefetching', { userId });

      // Load or create user behavior pattern
      const behaviorPattern = await this.loadUserBehaviorPattern(userId);
      this.behaviorPatterns.set(userId, behaviorPattern);

      // Create prefetch context
      const context = await this.createPrefetchContext(userId, behaviorPattern);
      this.currentContext = context;

      // Execute prefetch strategies
      await this.executePrefetchStrategies(context);

      log.debug('Prefetching started successfully', { 
        userId, 
        queueSize: this.prefetchQueue.length 
      });
    } catch (error) {
      log.error('Failed to start prefetching', { userId, error });
    }
  }

  /**
   * Update user behavior based on activity
   */
  updateUserBehavior(userId: string, activity: {
    type: 'conversation_view' | 'message_send' | 'topic_view' | 'search' | 'social_interaction';
    data: Record<string, unknown>;
    timestamp: number;
  }): void {
    const pattern = this.behaviorPatterns.get(userId);
    if (!pattern) return;

    try {
      switch (activity.type) {
        case 'conversation_view': {
          const conversationId = activity.data.conversationId as string;
          pattern.conversationFrequency[conversationId] = 
            (pattern.conversationFrequency[conversationId] || 0) + 1;
          break;
        }

        case 'topic_view': {
          const topic = activity.data.topic as string;
          pattern.topicInterests[topic] = 
            (pattern.topicInterests[topic] || 0) + 1;
          break;
        }

        case 'message_send': {
          // Increase conversation frequency for sent messages
          const msgConversationId = activity.data.conversationId as string;
          pattern.conversationFrequency[msgConversationId] = 
            (pattern.conversationFrequency[msgConversationId] || 0) + 2; // Higher weight for sending
          break;
        }
      }

      // Update active hours
      const hour = new Date(activity.timestamp).getHours();
      if (!pattern.activeHours.includes(hour)) {
        pattern.activeHours.push(hour);
        pattern.activeHours.sort((a, b) => a - b);
      }

      pattern.lastUpdated = Date.now();
      this.behaviorPatterns.set(userId, pattern);

      // Persist updated pattern
      this.persistUserBehaviorPattern(pattern).catch(error => {
        log.warn('Failed to persist behavior pattern', { userId, error });
      });

      log.debug('User behavior updated', { 
        userId, 
        activityType: activity.type,
        conversationCount: Object.keys(pattern.conversationFrequency).length,
        topicCount: Object.keys(pattern.topicInterests).length,
      });
    } catch (error) {
      log.error('Failed to update user behavior', { userId, error });
    }
  }

  /**
   * Get prefetch metrics observable
   */
  getMetrics(): Observable<PrefetchMetrics> {
    return this.metricsSubject.asObservable();
  }

  /**
   * Configure prefetch preferences for a user
   */
  async configurePrefetchPreferences(
    userId: string, 
    preferences: Partial<UserBehaviorPattern['prefetchPreferences']>
  ): Promise<void> {
    const pattern = this.behaviorPatterns.get(userId);
    if (!pattern) return;

    pattern.prefetchPreferences = {
      ...pattern.prefetchPreferences,
      ...preferences,
    };

    pattern.lastUpdated = Date.now();
    this.behaviorPatterns.set(userId, pattern);

    await this.persistUserBehaviorPattern(pattern);

    log.info('Prefetch preferences updated', { userId, preferences });
  }

  /**
   * Force prefetch specific content
   */
  async forcePrefetch(tasks: Partial<PrefetchTask>[]): Promise<void> {
    for (const taskData of tasks) {
      const task: PrefetchTask = {
        id: `force_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: taskData.type || 'messages',
        priority: 'immediate',
        data: taskData.data || {},
        estimatedSize: taskData.estimatedSize || 1024,
        networkRequirement: taskData.networkRequirement || 'any',
        expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour
        createdAt: Date.now(),
        attempts: 0,
        ...taskData,
      };

      this.prefetchQueue.unshift(task); // Add to front of queue
    }

    log.debug('Force prefetch tasks added', { taskCount: tasks.length });
  }

  /**
   * Get current prefetch queue status
   */
  getQueueStatus(): {
    totalTasks: number;
    tasksByPriority: Record<string, number>;
    tasksByType: Record<string, number>;
    estimatedTotalSize: number;
  } {
    const tasksByPriority: Record<string, number> = {};
    const tasksByType: Record<string, number> = {};
    let estimatedTotalSize = 0;

    for (const task of this.prefetchQueue) {
      tasksByPriority[task.priority] = (tasksByPriority[task.priority] || 0) + 1;
      tasksByType[task.type] = (tasksByType[task.type] || 0) + 1;
      estimatedTotalSize += task.estimatedSize;
    }

    return {
      totalTasks: this.prefetchQueue.length,
      tasksByPriority,
      tasksByType,
      estimatedTotalSize,
    };
  }

  // Private methods

  private initializePrefetchStrategies(): void {
    this.activeStrategies = [
      {
        name: 'frequent_conversations',
        condition: (context) => context.userBehavior.prefetchPreferences.messages,
        execute: async (context) => this.prefetchFrequentConversations(context),
        priority: 1,
      },
      {
        name: 'topic_based_content',
        condition: (context) => context.userBehavior.prefetchPreferences.socialFeed,
        execute: async (context) => this.prefetchTopicBasedContent(context),
        priority: 2,
      },
      {
        name: 'predictive_images',
        condition: (context) => context.userBehavior.prefetchPreferences.images && context.networkType === 'wifi',
        execute: async (context) => this.prefetchPredictiveImages(context),
        priority: 3,
      },
      {
        name: 'notification_context',
        condition: (context) => context.userBehavior.prefetchPreferences.notifications,
        execute: async (context) => this.prefetchNotificationContext(context),
        priority: 4,
      },
      {
        name: 'search_predictions',
        condition: (context) => context.networkType === 'wifi',
        execute: async (context) => this.prefetchSearchPredictions(context),
        priority: 5,
      },
    ];

    // Sort strategies by priority
    this.activeStrategies.sort((a, b) => a.priority - b.priority);
  }

  private async loadUserBehaviorPattern(userId: string): Promise<UserBehaviorPattern> {
    try {
      // Try to load from database
      const collection = database.get('user_behavior_patterns');
      const existing = await collection.find(userId);

      const existingRecord = existing as any;
      return {
        userId,
        conversationFrequency: JSON.parse(existingRecord.conversationFrequency || '{}'),
        topicInterests: JSON.parse(existingRecord.topicInterests || '{}'),
        activeHours: JSON.parse(existingRecord.activeHours || '[]'),
        averageSessionDuration: existingRecord.averageSessionDuration || 30,
        prefetchPreferences: JSON.parse(existingRecord.prefetchPreferences || JSON.stringify({
          images: true,
          messages: true,
          notifications: true,
          socialFeed: true,
        })),
        lastUpdated: existingRecord.lastUpdated || Date.now(),
      };
    } catch (error) {
      // Create default pattern
      return {
        userId,
        conversationFrequency: {},
        topicInterests: {},
        activeHours: [],
        averageSessionDuration: 30,
        prefetchPreferences: {
          images: true,
          messages: true,
          notifications: true,
          socialFeed: true,
        },
        lastUpdated: Date.now(),
      };
    }
  }

  private async persistUserBehaviorPattern(pattern: UserBehaviorPattern): Promise<void> {
    try {
      await database.write(async () => {
        const collection = database.get('user_behavior_patterns');
        
        try {
          const existing = await collection.find(pattern.userId);
          await existing.update((record: any) => {
            record.conversationFrequency = JSON.stringify(pattern.conversationFrequency);
            record.topicInterests = JSON.stringify(pattern.topicInterests);
            record.activeHours = JSON.stringify(pattern.activeHours);
            record.averageSessionDuration = pattern.averageSessionDuration;
            record.prefetchPreferences = JSON.stringify(pattern.prefetchPreferences);
            record.lastUpdated = pattern.lastUpdated;
          });
        } catch (error) {
          // Record doesn't exist, create new one
          await collection.create((record: any) => {
            record.id = pattern.userId;
            record.conversationFrequency = JSON.stringify(pattern.conversationFrequency);
            record.topicInterests = JSON.stringify(pattern.topicInterests);
            record.activeHours = JSON.stringify(pattern.activeHours);
            record.averageSessionDuration = pattern.averageSessionDuration;
            record.prefetchPreferences = JSON.stringify(pattern.prefetchPreferences);
            record.lastUpdated = pattern.lastUpdated;
          });
        }
      });
    } catch (error) {
      log.error('Failed to persist behavior pattern', { userId: pattern.userId, error });
    }
  }

  private async createPrefetchContext(
    userId: string, 
    behaviorPattern: UserBehaviorPattern
  ): Promise<PrefetchContext> {
    // This would integrate with device APIs to get real network/battery info
    // For now, we'll use mock data
    return {
      userId,
      currentTime: Date.now(),
      networkType: 'wifi', // Would be detected from device
      batteryLevel: 80, // Would be detected from device
      isCharging: false, // Would be detected from device
      availableStorage: 1024 * 1024 * 1024, // 1GB - would be detected from device
      userBehavior: behaviorPattern,
      recentActivity: [], // Would be loaded from recent activity log
    };
  }

  private async executePrefetchStrategies(context: PrefetchContext): Promise<void> {
    for (const strategy of this.activeStrategies) {
      try {
        if (strategy.condition(context)) {
          const tasks = await strategy.execute(context);
          this.prefetchQueue.push(...tasks);
          
          log.debug('Prefetch strategy executed', { 
            strategy: strategy.name, 
            tasksGenerated: tasks.length 
          });
        }
      } catch (error) {
        log.error('Prefetch strategy failed', { 
          strategy: strategy.name, 
          error 
        });
      }
    }

    // Sort queue by priority
    this.sortPrefetchQueue();
  }

  private async prefetchFrequentConversations(context: PrefetchContext): Promise<PrefetchTask[]> {
    const tasks: PrefetchTask[] = [];
    const { conversationFrequency } = context.userBehavior;

    // Get top 5 most frequent conversations
    const topConversations = Object.entries(conversationFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id]) => id);

    for (const conversationId of topConversations) {
      tasks.push({
        id: `conv_${conversationId}_${Date.now()}`,
        type: 'messages',
        priority: 'high',
        data: { conversationId, limit: 50 },
        estimatedSize: 50 * 1024, // 50KB estimated
        networkRequirement: 'any',
        expiresAt: Date.now() + (30 * 60 * 1000), // 30 minutes
        createdAt: Date.now(),
        attempts: 0,
      });
    }

    return tasks;
  }

  private async prefetchTopicBasedContent(context: PrefetchContext): Promise<PrefetchTask[]> {
    const tasks: PrefetchTask[] = [];
    const { topicInterests } = context.userBehavior;

    // Get top 3 topics of interest
    const topTopics = Object.entries(topicInterests)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([topic]) => topic);

    for (const topic of topTopics) {
      tasks.push({
        id: `topic_${topic}_${Date.now()}`,
        type: 'social_feed',
        priority: 'normal',
        data: { topic, limit: 20 },
        estimatedSize: 100 * 1024, // 100KB estimated
        networkRequirement: 'any',
        expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour
        createdAt: Date.now(),
        attempts: 0,
      });
    }

    return tasks;
  }

  private async prefetchPredictiveImages(context: PrefetchContext): Promise<PrefetchTask[]> {
    const tasks: PrefetchTask[] = [];

    // Only prefetch images on WiFi to save data
    if (context.networkType !== 'wifi') {
      return tasks;
    }

    // Get recent messages with image attachments from frequent conversations
    const { conversationFrequency } = context.userBehavior;
    const topConversations = Object.entries(conversationFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([id]) => id);

    for (const conversationId of topConversations) {
      tasks.push({
        id: `images_${conversationId}_${Date.now()}`,
        type: 'images',
        priority: 'low',
        data: { conversationId, imageOnly: true, limit: 10 },
        estimatedSize: 500 * 1024, // 500KB estimated
        networkRequirement: 'wifi',
        expiresAt: Date.now() + (2 * 60 * 60 * 1000), // 2 hours
        createdAt: Date.now(),
        attempts: 0,
      });
    }

    return tasks;
  }

  private async prefetchNotificationContext(context: PrefetchContext): Promise<PrefetchTask[]> {
    const tasks: PrefetchTask[] = [];

    // Prefetch context for recent notifications
    tasks.push({
      id: `notifications_${context.userId}_${Date.now()}`,
      type: 'notifications',
      priority: 'normal',
      data: { userId: context.userId, limit: 20, includeContext: true },
      estimatedSize: 30 * 1024, // 30KB estimated
      networkRequirement: 'any',
      expiresAt: Date.now() + (15 * 60 * 1000), // 15 minutes
      createdAt: Date.now(),
      attempts: 0,
    });

    return tasks;
  }

  private async prefetchSearchPredictions(context: PrefetchContext): Promise<PrefetchTask[]> {
    const tasks: PrefetchTask[] = [];

    // Prefetch search results for user's top interests
    const { topicInterests } = context.userBehavior;
    const topTopics = Object.entries(topicInterests)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([topic]) => topic);

    for (const topic of topTopics) {
      tasks.push({
        id: `search_${topic}_${Date.now()}`,
        type: 'search_results',
        priority: 'background',
        data: { query: topic, limit: 10 },
        estimatedSize: 20 * 1024, // 20KB estimated
        networkRequirement: 'wifi',
        expiresAt: Date.now() + (4 * 60 * 60 * 1000), // 4 hours
        createdAt: Date.now(),
        attempts: 0,
      });
    }

    return tasks;
  }

  private sortPrefetchQueue(): void {
    const priorityOrder = { immediate: 0, high: 1, normal: 2, low: 3, background: 4 };
    
    this.prefetchQueue.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      return a.createdAt - b.createdAt;
    });
  }

  private startPrefetchLoop(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    const processQueue = async () => {
      while (this.isRunning && this.prefetchQueue.length > 0) {
        const task = this.prefetchQueue.shift();
        if (!task) continue;

        try {
          await this.executePrefetchTask(task);
          this.metrics.completedTasks++;
        } catch (error) {
          this.metrics.failedTasks++;
          log.error('Prefetch task failed', { taskId: task.id, error });
          
          // Retry logic
          if (task.attempts < 3) {
            task.attempts++;
            task.createdAt = Date.now(); // Reset creation time for retry
            this.prefetchQueue.push(task);
          }
        }

        this.metrics.totalTasks++;
        this.metricsSubject.next({ ...this.metrics });

        // Small delay between tasks to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Schedule next queue processing
      setTimeout(processQueue, 5000); // Check every 5 seconds
    };

    processQueue();
  }

  private async executePrefetchTask(task: PrefetchTask): Promise<void> {
    const startTime = Date.now();

    try {
      switch (task.type) {
        case 'messages':
          await this.prefetchMessages(task);
          break;
        case 'images':
          await this.prefetchImages(task);
          break;
        case 'social_feed':
          await this.prefetchSocialFeed(task);
          break;
        case 'notifications':
          await this.prefetchNotifications(task);
          break;
        case 'search_results':
          await this.prefetchSearchResults(task);
          break;
      }

      const duration = Date.now() - startTime;
      this.updateMetrics(task, duration, true);

      log.debug('Prefetch task completed', { 
        taskId: task.id, 
        type: task.type, 
        duration 
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateMetrics(task, duration, false);
      throw error;
    }
  }

  private async prefetchMessages(task: PrefetchTask): Promise<void> {
    const { conversationId, limit = 50 } = task.data;
    
    // Check if already cached
    const cached = await communityCacheManager.getCachedMessages(conversationId as string);
    if (cached.length >= (limit as number)) {
      this.metrics.cacheHitRate = (this.metrics.cacheHitRate + 1) / 2; // Simple moving average
      return;
    }

    // Fetch from server
    const supabase = (await import('../supabase')).default;
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit as number);

    if (error) throw error;

    // Cache the messages
    await communityCacheManager.cacheMessages(conversationId as string, messages || []);
  }

  private async prefetchImages(task: PrefetchTask): Promise<void> {
    const { conversationId, limit = 10 } = task.data;
    
    // Get messages with image attachments
    const supabase = (await import('../supabase')).default;
    const { data: messages, error } = await supabase
      .from('messages')
      .select('attachments')
      .eq('conversation_id', conversationId)
      .not('attachments', 'is', null)
      .limit(limit as number);

    if (error) throw error;

    // Extract image URLs
    const imageUrls: string[] = [];
    for (const message of messages || []) {
      if (message.attachments) {
        const attachments = JSON.parse(message.attachments);
        for (const attachment of attachments) {
          if (attachment.type === 'image' && attachment.url) {
            imageUrls.push(attachment.url);
          }
        }
      }
    }

    // Prefetch images
    if (imageUrls.length > 0) {
      await smartCacheManager.prefetchImages(imageUrls, {
        priority: 'low',
        isCritical: false,
      });
    }
  }

  private async prefetchSocialFeed(task: PrefetchTask): Promise<void> {
    const { topic, limit = 20 } = task.data;
    
    // This would fetch social feed content based on topic
    // For now, we'll simulate the prefetch
    const mockFeedItems = Array.from({ length: limit as number }, (_, i) => ({
      id: `feed_${topic}_${i}`,
      content: `Mock content for ${topic}`,
      timestamp: Date.now() - (i * 60000),
    }));

    await communityCacheManager.cacheSocialFeed(
      (task.data.userId as string) || 'unknown',
      mockFeedItems
    );
  }

  private async prefetchNotifications(task: PrefetchTask): Promise<void> {
    const { userId, limit = 20 } = task.data;
    
    const supabase = (await import('../supabase')).default;
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit as number);

    if (error) throw error;

    await communityCacheManager.cacheNotifications(userId as string, notifications || []);
  }

  private async prefetchSearchResults(task: PrefetchTask): Promise<void> {
    const { query, limit = 10 } = task.data;
    
    // This would perform the actual search
    // For now, we'll simulate search results
    const mockResults = Array.from({ length: limit as number }, (_, i) => ({
      id: `result_${query}_${i}`,
      title: `Search result ${i + 1} for ${query}`,
      content: `Mock search result content`,
      relevance: 1 - (i * 0.1),
    }));

    await communityCacheManager.cacheSearchResults(query as string, mockResults);
  }

  private updateMetrics(task: PrefetchTask, duration: number, success: boolean): void {
    this.metrics.bytesDownloaded += task.estimatedSize;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime + duration) / 2; // Simple moving average
    this.metrics.lastPrefetchTime = Date.now();
  }
}

// Export singleton instance
export const smartPrefetchingManager = new SmartPrefetchingManager();

// Export types for external use
export type { UserBehaviorPattern, PrefetchTask, PrefetchMetrics };