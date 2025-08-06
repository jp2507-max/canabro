/**
 * Comprehensive Test Suite for Community Caching and Synchronization (2025 Standards)
 * 
 * Tests all aspects of the caching, synchronization, and data consistency systems
 * with focus on offline-first functionality and performance optimization.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

import { communityCacheManager, MessageCompressor } from '../community-cache';
import { offlineMessagingSyncManager } from '../offline-messaging-sync';
import { dataConsistencyChecker } from '../data-consistency-checker';
import { smartPrefetchingManager } from '../smart-prefetching';
import { communitySyncIntegrationManager } from '../community-sync-integration';

// Mock dependencies
jest.mock('../database/database');
jest.mock('../supabase');
jest.mock('../utils/logger');

describe('Community Caching and Synchronization System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('MessageCompressor', () => {
    it('should compress long messages', () => {
      const longMessage = {
        id: 'test-1',
        content: 'This is a very long message that should be compressed because it exceeds the compression threshold and contains lots of repeated whitespace    and    extra    spaces.',
        senderId: 'user-1',
        timestamp: Date.now(),
        type: 'text',
      };

      const compressed = MessageCompressor.compressMessage(longMessage);

      expect(compressed.compressed).toBe(true);
      expect(compressed.content.length).toBeLessThan(longMessage.content.length);
      expect(compressed.content).not.toContain('    '); // Multiple spaces should be reduced
    });

    it('should not compress short messages', () => {
      const shortMessage = {
        id: 'test-2',
        content: 'Short message',
        senderId: 'user-1',
        timestamp: Date.now(),
        type: 'text',
      };

      const compressed = MessageCompressor.compressMessage(shortMessage);

      expect(compressed.compressed).toBe(false);
      expect(compressed.content).toBe(shortMessage.content);
    });

    it('should create message batches correctly', () => {
      const messages = Array.from({ length: 75 }, (_, i) => ({
        id: `msg-${i}`,
        content: `Message ${i}`,
        senderId: 'user-1',
        timestamp: Date.now() + i,
        type: 'text',
      }));

      const batch = MessageCompressor.createMessageBatch(messages, 'conv-1');

      expect(batch.messages.length).toBe(50); // MAX_BATCH_SIZE
      expect(batch.conversationId).toBe('conv-1');
      expect(batch.batchId).toMatch(/^batch_/);
      expect(batch.timestamp).toBeGreaterThan(0);
    });

    it('should deduplicate messages correctly', () => {
      const duplicateMessages = [
        {
          id: 'msg-1',
          content: 'Hello world',
          senderId: 'user-1',
          timestamp: 1000,
          type: 'text',
          compressed: false,
        },
        {
          id: 'msg-2',
          content: 'Different message',
          senderId: 'user-1',
          timestamp: 2000,
          type: 'text',
          compressed: false,
        },
        {
          id: 'msg-3',
          content: 'Hello world', // Same content as msg-1
          senderId: 'user-1',
          timestamp: 1000, // Same timestamp as msg-1
          type: 'text',
          compressed: false,
        },
      ];

      const deduplicated = MessageCompressor.deduplicateMessages(duplicateMessages);

      expect(deduplicated.length).toBe(2); // Should remove one duplicate
      expect(deduplicated.map(m => m.id)).toContain('msg-1');
      expect(deduplicated.map(m => m.id)).toContain('msg-2');
      expect(deduplicated.map(m => m.id)).not.toContain('msg-3');
    });
  });

  describe('CommunityCacheManager', () => {
    it('should cache and retrieve messages correctly', async () => {
      const conversationId = 'conv-test-1';
      const messages = [
        {
          id: 'msg-1',
          content: 'Test message 1',
          senderId: 'user-1',
          timestamp: Date.now(),
          type: 'text',
        },
        {
          id: 'msg-2',
          content: 'Test message 2',
          senderId: 'user-2',
          timestamp: Date.now() + 1000,
          type: 'text',
        },
      ];

      // Cache messages
      await communityCacheManager.cacheMessages(conversationId, messages);

      // Retrieve cached messages
      const cachedMessages = await communityCacheManager.getCachedMessages(conversationId);

      expect(cachedMessages).toHaveLength(2);
      expect(cachedMessages[0].content).toBe('Test message 1');
      expect(cachedMessages[1].content).toBe('Test message 2');
    });

    it('should cache user presence data', async () => {
      const userId = 'user-test-1';
      const presence = {
        status: 'online',
        lastSeen: Date.now(),
        isTyping: false,
      };

      // Should not throw
      await expect(
        communityCacheManager.cacheUserPresence(userId, presence)
      ).resolves.not.toThrow();
    });

    it('should cache and group notifications', async () => {
      const userId = 'user-test-1';
      const notifications = Array.from({ length: 10 }, (_, i) => ({
        id: `notif-${i}`,
        type: 'message',
        timestamp: Date.now() + (i * 1000),
        content: `Notification ${i}`,
      }));

      // Should not throw
      await expect(
        communityCacheManager.cacheNotifications(userId, notifications)
      ).resolves.not.toThrow();
    });

    it('should perform intelligent cleanup', async () => {
      // Should not throw
      await expect(
        communityCacheManager.performIntelligentCleanup()
      ).resolves.not.toThrow();
    });

    it('should provide cache statistics', () => {
      const stats = communityCacheManager.getCacheStats();

      expect(stats).toHaveProperty('timestamp');
      expect(stats).toHaveProperty('caches');
      expect(stats).toHaveProperty('mmkvKeys');
      expect(typeof stats.timestamp).toBe('number');
      expect(typeof stats.mmkvKeys).toBe('number');
    });
  });

  describe('OfflineMessagingSyncManager', () => {
    it('should queue messages for offline sending', async () => {
      const conversationId = 'conv-offline-1';
      const content = 'Offline test message';
      const senderId = 'user-offline-1';

      const messageId = await offlineMessagingSyncManager.sendMessage(
        conversationId,
        content,
        senderId
      );

      expect(messageId).toBeTruthy();
      expect(typeof messageId).toBe('string');

      // Check if message is in offline queue
      const offlineMessages = await offlineMessagingSyncManager.getOfflineMessages(conversationId);
      expect(offlineMessages).toHaveLength(1);
      expect(offlineMessages[0].content).toBe(content);
      expect(offlineMessages[0].status).toBe('pending');
    });

    it('should handle network status changes', () => {
      // Should not throw
      expect(() => {
        offlineMessagingSyncManager.setNetworkStatus(false);
      }).not.toThrow();

      expect(() => {
        offlineMessagingSyncManager.setNetworkStatus(true);
      }).not.toThrow();
    });

    it('should provide sync status observable', () => {
      const syncStatus$ = offlineMessagingSyncManager.getSyncStatus();
      expect(syncStatus$).toBeDefined();
      expect(typeof syncStatus$.subscribe).toBe('function');
    });

    it('should sync messages when online', async () => {
      // Mock online status
      offlineMessagingSyncManager.setNetworkStatus(true);

      const result = await offlineMessagingSyncManager.syncMessages();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('conflicts');
      expect(typeof result.success).toBe('number');
      expect(typeof result.failed).toBe('number');
      expect(typeof result.conflicts).toBe('number');
    });
  });

  describe('DataConsistencyChecker', () => {
    it('should perform consistency check', async () => {
      const report = await dataConsistencyChecker.performConsistencyCheck({
        tables: ['messages', 'conversations'],
        autoRepair: false,
        includeOrphans: true,
      });

      expect(report).toHaveProperty('id');
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('duration');
      expect(report).toHaveProperty('tablesChecked');
      expect(report).toHaveProperty('issuesFound');
      expect(report).toHaveProperty('issuesRepaired');
      expect(report).toHaveProperty('summary');

      expect(Array.isArray(report.tablesChecked)).toBe(true);
      expect(Array.isArray(report.issuesFound)).toBe(true);
      expect(Array.isArray(report.issuesRepaired)).toBe(true);
      expect(typeof report.summary.critical).toBe('number');
      expect(typeof report.summary.high).toBe('number');
      expect(typeof report.summary.medium).toBe('number');
      expect(typeof report.summary.low).toBe('number');
    });

    it('should validate messages correctly', async () => {
      const issues = await dataConsistencyChecker.validateMessages();

      expect(Array.isArray(issues)).toBe(true);
      // Issues array can be empty if no problems found
    });

    it('should provide issue stream observable', () => {
      const issueStream$ = dataConsistencyChecker.getIssueStream();
      expect(issueStream$).toBeDefined();
      expect(typeof issueStream$.subscribe).toBe('function');
    });

    it('should get last report', () => {
      const lastReport = dataConsistencyChecker.getLastReport();
      // Can be null if no report has been generated yet
      if (lastReport) {
        expect(lastReport).toHaveProperty('id');
        expect(lastReport).toHaveProperty('timestamp');
      }
    });
  });

  describe('SmartPrefetchingManager', () => {
    it('should start prefetching for a user', async () => {
      const userId = 'user-prefetch-1';

      // Should not throw
      await expect(
        smartPrefetchingManager.startPrefetching(userId)
      ).resolves.not.toThrow();
    });

    it('should update user behavior', () => {
      const userId = 'user-behavior-1';
      const activity = {
        type: 'conversation_view' as const,
        data: { conversationId: 'conv-1' },
        timestamp: Date.now(),
      };

      // Should not throw
      expect(() => {
        smartPrefetchingManager.updateUserBehavior(userId, activity);
      }).not.toThrow();
    });

    it('should provide metrics observable', () => {
      const metrics$ = smartPrefetchingManager.getMetrics();
      expect(metrics$).toBeDefined();
      expect(typeof metrics$.subscribe).toBe('function');
    });

    it('should configure prefetch preferences', async () => {
      const userId = 'user-config-1';
      const preferences = {
        images: false,
        messages: true,
      };

      // Should not throw
      await expect(
        smartPrefetchingManager.configurePrefetchPreferences(userId, preferences)
      ).resolves.not.toThrow();
    });

    it('should force prefetch specific content', async () => {
      const tasks = [
        {
          type: 'messages' as const,
          data: { conversationId: 'conv-1' },
          estimatedSize: 1024,
        },
      ];

      // Should not throw
      await expect(
        smartPrefetchingManager.forcePrefetch(tasks)
      ).resolves.not.toThrow();
    });

    it('should provide queue status', () => {
      const status = smartPrefetchingManager.getQueueStatus();

      expect(status).toHaveProperty('totalTasks');
      expect(status).toHaveProperty('tasksByPriority');
      expect(status).toHaveProperty('tasksByType');
      expect(status).toHaveProperty('estimatedTotalSize');
      expect(typeof status.totalTasks).toBe('number');
      expect(typeof status.estimatedTotalSize).toBe('number');
    });
  });

  describe('CommunitySyncIntegrationManager', () => {
    it('should initialize integration', async () => {
      // Should not throw
      await expect(
        communitySyncIntegrationManager.initializeIntegration()
      ).resolves.not.toThrow();
    });

    it('should start user sync', async () => {
      const userId = 'user-integration-1';

      // Should not throw
      await expect(
        communitySyncIntegrationManager.startUserSync(userId)
      ).resolves.not.toThrow();
    });

    it('should handle network changes', async () => {
      // Should not throw
      await expect(
        communitySyncIntegrationManager.handleNetworkChange(true, 'wifi')
      ).resolves.not.toThrow();

      await expect(
        communitySyncIntegrationManager.handleNetworkChange(false, 'none')
      ).resolves.not.toThrow();
    });

    it('should perform comprehensive optimization', async () => {
      const result = await communitySyncIntegrationManager.performOptimization();

      expect(result).toHaveProperty('cacheOptimized');
      expect(result).toHaveProperty('consistencyFixed');
      expect(result).toHaveProperty('prefetchOptimized');
      expect(result).toHaveProperty('recommendations');
      expect(typeof result.cacheOptimized).toBe('boolean');
      expect(typeof result.consistencyFixed).toBe('boolean');
      expect(typeof result.prefetchOptimized).toBe('boolean');
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should provide status observable', () => {
      const status$ = communitySyncIntegrationManager.getStatus();
      expect(status$).toBeDefined();
      expect(typeof status$.subscribe).toBe('function');
    });

    it('should update configuration', () => {
      const newConfig = {
        enableAggressiveCaching: false,
        syncFrequency: 'conservative' as const,
      };

      // Should not throw
      expect(() => {
        communitySyncIntegrationManager.updateConfiguration(newConfig);
      }).not.toThrow();

      const currentConfig = communitySyncIntegrationManager.getConfiguration();
      expect(currentConfig.enableAggressiveCaching).toBe(false);
      expect(currentConfig.syncFrequency).toBe('conservative');
    });

    it('should force sync all components', async () => {
      // Should not throw
      await expect(
        communitySyncIntegrationManager.forceSyncAll()
      ).resolves.not.toThrow();
    });

    it('should provide comprehensive diagnostics', async () => {
      const diagnostics = await communitySyncIntegrationManager.getDiagnostics();

      expect(diagnostics).toHaveProperty('status');
      expect(diagnostics).toHaveProperty('cacheStats');
      expect(diagnostics).toHaveProperty('syncMetrics');
      expect(diagnostics).toHaveProperty('consistencyReport');
      expect(diagnostics).toHaveProperty('prefetchMetrics');
      expect(diagnostics).toHaveProperty('systemHealth');

      expect(diagnostics.status).toHaveProperty('overall');
      expect(diagnostics.status).toHaveProperty('components');
      expect(diagnostics.status).toHaveProperty('metrics');
      expect(diagnostics.status).toHaveProperty('recommendations');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete offline-to-online workflow', async () => {
      const userId = 'user-integration-test';
      const conversationId = 'conv-integration-test';

      // 1. Start user sync
      await communitySyncIntegrationManager.startUserSync(userId);

      // 2. Go offline
      await communitySyncIntegrationManager.handleNetworkChange(false, 'none');

      // 3. Send message while offline
      const messageId = await offlineMessagingSyncManager.sendMessage(
        conversationId,
        'Offline integration test message',
        userId
      );

      expect(messageId).toBeTruthy();

      // 4. Check offline messages
      const offlineMessages = await offlineMessagingSyncManager.getOfflineMessages(conversationId);
      expect(offlineMessages).toHaveLength(1);
      expect(offlineMessages[0].status).toBe('pending');

      // 5. Go back online
      await communitySyncIntegrationManager.handleNetworkChange(true, 'wifi');

      // 6. Force sync
      await communitySyncIntegrationManager.forceSyncAll();

      // The message should now be synced (in a real implementation)
    });

    it('should handle cache optimization workflow', async () => {
      const userId = 'user-cache-test';
      const conversationId = 'conv-cache-test';

      // 1. Cache some messages
      const messages = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        content: `Test message ${i}`,
        senderId: userId,
        timestamp: Date.now() + i,
        type: 'text',
      }));

      await communityCacheManager.cacheMessages(conversationId, messages);

      // 2. Perform optimization
      const result = await communitySyncIntegrationManager.performOptimization();

      expect(result.cacheOptimized).toBe(true);

      // 3. Check cache stats
      const stats = communityCacheManager.getCacheStats();
      expect(stats).toHaveProperty('timestamp');
    });

    it('should handle consistency check and repair workflow', async () => {
      // 1. Perform consistency check
      const report = await dataConsistencyChecker.performConsistencyCheck({
        autoRepair: true,
        includeOrphans: true,
      });

      expect(report).toHaveProperty('issuesFound');
      expect(report).toHaveProperty('issuesRepaired');

      // 2. Verify integration status reflects consistency state
      const diagnostics = await communitySyncIntegrationManager.getDiagnostics();
      expect(diagnostics.status.metrics).toHaveProperty('dataIntegrityScore');
      expect(typeof diagnostics.status.metrics.dataIntegrityScore).toBe('number');
    });

    it('should handle prefetch optimization workflow', async () => {
      const userId = 'user-prefetch-test';

      // 1. Start prefetching
      await smartPrefetchingManager.startPrefetching(userId);

      // 2. Update user behavior
      smartPrefetchingManager.updateUserBehavior(userId, {
        type: 'conversation_view',
        data: { conversationId: 'conv-1' },
        timestamp: Date.now(),
      });

      // 3. Check queue status
      const queueStatus = smartPrefetchingManager.getQueueStatus();
      expect(queueStatus).toHaveProperty('totalTasks');

      // 4. Force prefetch
      await smartPrefetchingManager.forcePrefetch([
        {
          type: 'messages',
          data: { conversationId: 'conv-1' },
        },
      ]);

      // Queue should have at least one task
      const updatedStatus = smartPrefetchingManager.getQueueStatus();
      expect(updatedStatus.totalTasks).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large message batches efficiently', async () => {
      const conversationId = 'conv-performance-test';
      const largeMessageSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `perf-msg-${i}`,
        content: `Performance test message ${i} with some additional content to make it realistic`,
        senderId: `user-${i % 10}`,
        timestamp: Date.now() + i,
        type: 'text',
      }));

      const startTime = Date.now();
      await communityCacheManager.cacheMessages(conversationId, largeMessageSet);
      const cacheTime = Date.now() - startTime;

      const retrieveStartTime = Date.now();
      const cachedMessages = await communityCacheManager.getCachedMessages(conversationId);
      const retrieveTime = Date.now() - retrieveStartTime;

      expect(cachedMessages).toHaveLength(1000);
      expect(cacheTime).toBeLessThan(5000); // Should cache 1000 messages in under 5 seconds
      expect(retrieveTime).toBeLessThan(1000); // Should retrieve in under 1 second
    });

    it('should handle concurrent operations efficiently', async () => {
      const userId = 'user-concurrent-test';
      const operations = [];

      // Start multiple concurrent operations
      for (let i = 0; i < 10; i++) {
        operations.push(
          offlineMessagingSyncManager.sendMessage(
            `conv-concurrent-${i}`,
            `Concurrent message ${i}`,
            userId
          )
        );
      }

      const startTime = Date.now();
      const results = await Promise.all(operations);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(10);
      expect(results.every(id => typeof id === 'string')).toBe(true);
      expect(duration).toBeLessThan(2000); // Should complete in under 2 seconds
    });
  });

  describe('Error Handling', () => {
    it('should handle cache failures gracefully', async () => {
      // Test with invalid data
      await expect(
        communityCacheManager.cacheMessages('', [])
      ).resolves.not.toThrow();
    });

    it('should handle sync failures gracefully', async () => {
      // Test sync with no network
      offlineMessagingSyncManager.setNetworkStatus(false);
      
      const result = await offlineMessagingSyncManager.syncMessages();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('failed');
    });

    it('should handle consistency check failures gracefully', async () => {
      // Test with invalid table names
      const report = await dataConsistencyChecker.performConsistencyCheck({
        tables: ['nonexistent_table'],
        autoRepair: false,
      });

      expect(report).toHaveProperty('issuesFound');
      // Should handle gracefully even with invalid tables
    });
  });
});

// Helper functions for testing
function createMockMessage(id: string, content: string, senderId: string) {
  return {
    id,
    content,
    senderId,
    timestamp: Date.now(),
    type: 'text' as const,
  };
}

function createMockConversation(id: string, participants: string[]) {
  return {
    id,
    participants,
    lastMessage: null,
    unreadCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createMockNotification(id: string, userId: string, type: string) {
  return {
    id,
    userId,
    type,
    title: `Test notification ${id}`,
    message: `Test notification message for ${userId}`,
    timestamp: Date.now(),
    isRead: false,
  };
}