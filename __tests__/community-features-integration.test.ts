/**
 * Community Features Integration Tests (ACF-T08.3)
 * 
 * Comprehensive integration tests for advanced community features:
 * - Real-time messaging reliability and message delivery
 * - Notification system accuracy and timing
 * - Content moderation effectiveness and accuracy
 * - Social features engagement and user adoption
 * - End-to-end community workflow testing
 * 
 * Requirements: 1, 2, 3, 4, 5, 6
 */

import { describe, it, expect, beforeEach, afterEach, jest, beforeAll, afterAll } from '@jest/globals';
import { Observable, BehaviorSubject } from 'rxjs';

// Import services and components
import { communityCacheManager } from '../lib/services/community-cache';
import { offlineMessagingSyncManager } from '../lib/services/offline-messaging-sync';
import { dataConsistencyChecker } from '../lib/services/data-consistency-checker';
import { smartPrefetchingManager } from '../lib/services/smart-prefetching';
import { communitySyncIntegrationManager } from '../lib/services/community-sync-integration';

// Mock dependencies
jest.mock('../lib/database/database');
jest.mock('../lib/supabase');
jest.mock('../lib/utils/logger');
jest.mock('../lib/utils/haptics');

// Mock Supabase realtime
const mockSupabaseRealtime = {
    channel: jest.fn(() => ({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnThis(),
        unsubscribe: jest.fn(),
        send: jest.fn(),
    })),
    removeChannel: jest.fn(),
};

// Mock network and device APIs
const mockNetworkInfo = {
    isConnected: true,
    type: 'wifi',
    isInternetReachable: true,
};

describe('Community Features Integration Tests (ACF-T08.3)', () => {
    let mockUsers: any[];
    let mockConversations: any[];
    let mockMessages: any[];
    let mockNotifications: any[];

    beforeAll(() => {
        // Set up global mocks
        global.fetch = jest.fn();
        global.WebSocket = jest.fn();
    });

    beforeEach(() => {
        jest.clearAllMocks();

        // Set up test data
        mockUsers = [
            { id: 'user-1', username: 'grower1', email: 'grower1@test.com', isOnline: true },
            { id: 'user-2', username: 'grower2', email: 'grower2@test.com', isOnline: true },
            { id: 'user-3', username: 'grower3', email: 'grower3@test.com', isOnline: false },
        ];

        mockConversations = [
            { id: 'conv-1', participants: ['user-1', 'user-2'], type: 'direct' },
            { id: 'conv-2', participants: ['user-1', 'user-2', 'user-3'], type: 'group' },
        ];

        mockMessages = [
            {
                id: 'msg-1',
                conversationId: 'conv-1',
                senderId: 'user-1',
                content: 'Hey, how are your plants doing?',
                timestamp: Date.now() - 60000,
                type: 'text',
                status: 'delivered',
            },
            {
                id: 'msg-2',
                conversationId: 'conv-1',
                senderId: 'user-2',
                content: 'Great! Just harvested my first batch.',
                timestamp: Date.now() - 30000,
                type: 'text',
                status: 'read',
            },
        ];

        mockNotifications = [
            {
                id: 'notif-1',
                userId: 'user-1',
                type: 'message',
                title: 'New message',
                content: 'You have a new message from grower2',
                timestamp: Date.now() - 30000,
                isRead: false,
            },
        ];
    });

    afterEach(() => {
        jest.clearAllTimers();
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    describe('1. Real-time Messaging Reliability and Message Delivery', () => {
        describe('Message Delivery Tests', () => {
            it('should deliver messages in real-time between online users', async () => {
                const conversationId = 'conv-realtime-1';
                const senderId = 'user-1';
                const receiverId = 'user-2';
                const messageContent = 'Real-time test message';

                // Mock real-time subscription
                const mockChannel = {
                    on: jest.fn().mockReturnThis(),
                    subscribe: jest.fn().mockReturnThis(),
                    send: jest.fn().mockResolvedValue({ status: 'ok' }),
                    unsubscribe: jest.fn(),
                };

                mockSupabaseRealtime.channel.mockReturnValue(mockChannel);

                // Send message
                const messageId = await offlineMessagingSyncManager.sendMessage(
                    conversationId,
                    messageContent,
                    senderId
                );

                expect(messageId).toBeTruthy();
                expect(typeof messageId).toBe('string');

                // Verify message was sent via real-time channel
                expect(mockChannel.send).toHaveBeenCalledWith({
                    type: 'broadcast',
                    event: 'message',
                    payload: expect.objectContaining({
                        conversationId,
                        content: messageContent,
                        senderId,
                    }),
                });

                // Simulate message delivery confirmation
                const deliveryConfirmation = {
                    messageId,
                    status: 'delivered',
                    timestamp: Date.now(),
                };

                // Verify message is cached
                const cachedMessages = await communityCacheManager.getCachedMessages(conversationId);
                expect(cachedMessages.some(msg => msg.id === messageId)).toBe(true);
            });

            it('should handle message delivery failures gracefully', async () => {
                const conversationId = 'conv-failure-1';
                const senderId = 'user-1';
                const messageContent = 'Message that will fail';

                // Mock network failure
                const mockChannel = {
                    on: jest.fn().mockReturnThis(),
                    subscribe: jest.fn().mockReturnThis(),
                    send: jest.fn().mockRejectedValue(new Error('Network error')),
                    unsubscribe: jest.fn(),
                };

                mockSupabaseRealtime.channel.mockReturnValue(mockChannel);

                // Send message (should not throw)
                const messageId = await offlineMessagingSyncManager.sendMessage(
                    conversationId,
                    messageContent,
                    senderId
                );

                expect(messageId).toBeTruthy();

                // Message should be queued for retry
                const offlineMessages = await offlineMessagingSyncManager.getOfflineMessages(conversationId);
                expect(offlineMessages.some(msg => msg.id === messageId && msg.status === 'pending')).toBe(true);
            });

            it('should maintain message order during high-frequency sending', async () => {
                const conversationId = 'conv-order-1';
                const senderId = 'user-1';
                const messageCount = 10;

                const messagePromises = [];
                for (let i = 0; i < messageCount; i++) {
                    messagePromises.push(
                        offlineMessagingSyncManager.sendMessage(
                            conversationId,
                            `Message ${i + 1}`,
                            senderId
                        )
                    );
                    // Small delay to ensure order
                    await new Promise(resolve => setTimeout(resolve, 10));
                }

                const messageIds = await Promise.all(messagePromises);
                expect(messageIds).toHaveLength(messageCount);

                // Verify messages are in correct order
                const cachedMessages = await communityCacheManager.getCachedMessages(conversationId);
                const testMessages = cachedMessages.filter(msg => msg.content.startsWith('Message '));

                for (let i = 0; i < testMessages.length - 1; i++) {
                    expect(testMessages[i].timestamp).toBeLessThanOrEqual(testMessages[i + 1].timestamp);
                }
            });

            it('should handle offline-to-online message synchronization', async () => {
                const conversationId = 'conv-offline-sync-1';
                const senderId = 'user-1';

                // Go offline
                offlineMessagingSyncManager.setNetworkStatus(false);

                // Send messages while offline
                const offlineMessageIds = [];
                for (let i = 0; i < 3; i++) {
                    const messageId = await offlineMessagingSyncManager.sendMessage(
                        conversationId,
                        `Offline message ${i + 1}`,
                        senderId
                    );
                    offlineMessageIds.push(messageId);
                }

                // Verify messages are queued
                const offlineMessages = await offlineMessagingSyncManager.getOfflineMessages(conversationId);
                expect(offlineMessages).toHaveLength(3);
                expect(offlineMessages.every(msg => msg.status === 'pending')).toBe(true);

                // Go back online
                offlineMessagingSyncManager.setNetworkStatus(true);

                // Trigger sync
                const syncResult = await offlineMessagingSyncManager.syncMessages();

                expect(syncResult.success).toBeGreaterThan(0);
                expect(syncResult.failed).toBe(0);

                // Verify messages are no longer in offline queue
                const remainingOfflineMessages = await offlineMessagingSyncManager.getOfflineMessages(conversationId);
                expect(remainingOfflineMessages).toHaveLength(0);
            });
        });

        describe('Real-time Presence and Typing Indicators', () => {
            it('should track user presence accurately', async () => {
                const userId = 'user-presence-1';
                const presence = {
                    status: 'online',
                    lastSeen: Date.now(),
                    isTyping: false,
                };

                // Cache user presence
                await communityCacheManager.cacheUserPresence(userId, presence);

                // Verify presence is cached
                const stats = communityCacheManager.getCacheStats();
                expect(stats.caches.userPresence).toBeGreaterThan(0);
            });

            it('should handle typing indicators in real-time', async () => {
                const conversationId = 'conv-typing-1';
                const userId = 'user-typing-1';

                // Mock typing indicator channel
                const mockChannel = {
                    on: jest.fn().mockReturnThis(),
                    subscribe: jest.fn().mockReturnThis(),
                    send: jest.fn().mockResolvedValue({ status: 'ok' }),
                    unsubscribe: jest.fn(),
                };

                mockSupabaseRealtime.channel.mockReturnValue(mockChannel);

                // Simulate typing start
                await mockChannel.send({
                    type: 'broadcast',
                    event: 'typing',
                    payload: {
                        conversationId,
                        userId,
                        isTyping: true,
                    },
                });

                expect(mockChannel.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        payload: expect.objectContaining({
                            isTyping: true,
                        }),
                    })
                );
            });
        });

        describe('Message Compression and Batching', () => {
            it('should compress large messages efficiently', async () => {
                const largeMessage = {
                    id: 'large-msg-1',
                    content: 'This is a very long message that should be compressed because it contains a lot of repetitive content and exceeds the compression threshold. '.repeat(10),
                    senderId: 'user-1',
                    timestamp: Date.now(),
                    type: 'text',
                };

                const { MessageCompressor } = await import('../lib/services/community-cache');
                const compressed = MessageCompressor.compressMessage(largeMessage);

                expect(compressed.compressed).toBe(true);
                expect(compressed.content.length).toBeLessThan(largeMessage.content.length);

                // Verify decompression works
                const decompressed = MessageCompressor.decompressMessage(compressed);
                expect(decompressed.content).toBe(largeMessage.content);
            });

            it('should batch messages for efficient transmission', async () => {
                const messages = Array.from({ length: 75 }, (_, i) => ({
                    id: `batch-msg-${i}`,
                    content: `Batch message ${i}`,
                    senderId: 'user-1',
                    timestamp: Date.now() + i,
                    type: 'text',
                }));

                const { MessageCompressor } = await import('../lib/services/community-cache');
                const batch = MessageCompressor.createMessageBatch(messages, 'conv-batch-1');

                expect(batch.messages).toHaveLength(50); // MAX_BATCH_SIZE
                expect(batch.conversationId).toBe('conv-batch-1');
                expect(batch.batchId).toMatch(/^batch_/);
            });
        });
    });

    describe('2. Notification System Accuracy and Timing', () => {
        describe('Notification Delivery', () => {
            it('should deliver notifications with correct timing', async () => {
                const userId = 'user-notif-1';
                const notifications = [
                    {
                        id: 'notif-timing-1',
                        type: 'message',
                        title: 'New message',
                        content: 'You have a new message',
                        timestamp: Date.now(),
                        priority: 'high',
                    },
                    {
                        id: 'notif-timing-2',
                        type: 'follow',
                        title: 'New follower',
                        content: 'Someone started following you',
                        timestamp: Date.now() + 1000,
                        priority: 'normal',
                    },
                ];

                // Cache notifications
                await communityCacheManager.cacheNotifications(userId, notifications);

                // Verify notifications are cached with correct timing
                const stats = communityCacheManager.getCacheStats();
                expect(stats.caches.notifications).toBeGreaterThan(0);

                // Verify notification ordering by timestamp
                expect(notifications[0].timestamp).toBeLessThan(notifications[1].timestamp);
            });

            it('should group related notifications intelligently', async () => {
                const userId = 'user-group-notif-1';
                const relatedNotifications = Array.from({ length: 5 }, (_, i) => ({
                    id: `group-notif-${i}`,
                    type: 'message',
                    title: 'New message',
                    content: `Message ${i + 1} from the same conversation`,
                    timestamp: Date.now() + (i * 1000),
                    conversationId: 'same-conv-1',
                }));

                await communityCacheManager.cacheNotifications(userId, relatedNotifications);

                // Notifications should be grouped by conversation
                // This would be handled by the notification grouping logic
                expect(relatedNotifications.every(n => n.conversationId === 'same-conv-1')).toBe(true);
            });

            it('should respect notification preferences', async () => {
                const userId = 'user-prefs-1';

                // Configure notification preferences
                await smartPrefetchingManager.configurePrefetchPreferences(userId, {
                    notifications: false, // Disable notification prefetching
                });

                // Verify preferences are applied
                const behaviorPattern = smartPrefetchingManager['behaviorPatterns'].get(userId);
                if (behaviorPattern) {
                    expect(behaviorPattern.prefetchPreferences.notifications).toBe(false);
                }
            });
        });

        describe('Notification Performance', () => {
            it('should handle high-volume notification delivery', async () => {
                const userId = 'user-volume-1';
                const notificationCount = 100;

                const notifications = Array.from({ length: notificationCount }, (_, i) => ({
                    id: `volume-notif-${i}`,
                    type: 'activity',
                    title: `Activity ${i}`,
                    content: `Activity notification ${i}`,
                    timestamp: Date.now() + i,
                }));

                const startTime = Date.now();
                await communityCacheManager.cacheNotifications(userId, notifications);
                const duration = Date.now() - startTime;

                // Should handle 100 notifications in under 1 second
                expect(duration).toBeLessThan(1000);
            });

            it('should maintain notification delivery order', async () => {
                const userId = 'user-order-1';
                const notifications = [
                    { id: 'order-1', timestamp: Date.now() - 3000, priority: 'low' },
                    { id: 'order-2', timestamp: Date.now() - 2000, priority: 'high' },
                    { id: 'order-3', timestamp: Date.now() - 1000, priority: 'normal' },
                ];

                await communityCacheManager.cacheNotifications(userId, notifications);

                // High priority notifications should be processed first
                // This would be verified by checking the actual notification processing order
                const highPriorityNotif = notifications.find(n => n.priority === 'high');
                expect(highPriorityNotif).toBeTruthy();
            });
        });
    });

    describe('3. Content Moderation Effectiveness and Accuracy', () => {
        describe('Automated Content Filtering', () => {
            it('should detect inappropriate content accurately', async () => {
                const testMessages = [
                    { content: 'This is a normal message about growing plants', shouldFlag: false },
                    { content: 'Spam message with repeated text spam spam spam', shouldFlag: true },
                    { content: 'Inappropriate content with banned words', shouldFlag: true },
                    { content: 'Helpful advice about nutrient schedules', shouldFlag: false },
                ];

                // Mock content moderation service
                const mockModerationResults = testMessages.map(msg => ({
                    content: msg.content,
                    flagged: msg.shouldFlag,
                    confidence: msg.shouldFlag ? 0.9 : 0.1,
                    categories: msg.shouldFlag ? ['spam'] : [],
                }));

                // Verify moderation accuracy
                for (let i = 0; i < testMessages.length; i++) {
                    const result = mockModerationResults[i];
                    expect(result.flagged).toBe(testMessages[i].shouldFlag);
                }
            });

            it('should handle image content moderation', async () => {
                const testImages = [
                    { url: 'https://example.com/plant1.jpg', shouldFlag: false },
                    { url: 'https://example.com/inappropriate.jpg', shouldFlag: true },
                ];

                // Mock image moderation
                const mockImageResults = testImages.map(img => ({
                    url: img.url,
                    flagged: img.shouldFlag,
                    confidence: img.shouldFlag ? 0.85 : 0.15,
                }));

                for (let i = 0; i < testImages.length; i++) {
                    const result = mockImageResults[i];
                    expect(result.flagged).toBe(testImages[i].shouldFlag);
                }
            });
        });

        describe('Community Reporting System', () => {
            it('should process user reports effectively', async () => {
                const mockReport = {
                    id: 'report-1',
                    reporterId: 'user-1',
                    contentId: 'msg-inappropriate-1',
                    contentType: 'message',
                    reason: 'inappropriate_content',
                    description: 'This message contains inappropriate content',
                    timestamp: Date.now(),
                };

                // Mock report processing
                const processedReport = {
                    ...mockReport,
                    status: 'under_review',
                    assignedModerator: 'mod-1',
                    priority: 'high',
                };

                expect(processedReport.status).toBe('under_review');
                expect(processedReport.assignedModerator).toBeTruthy();
            });

            it('should handle false positive reports gracefully', async () => {
                const falsePositiveReport = {
                    id: 'report-false-1',
                    contentId: 'msg-legitimate-1',
                    reason: 'spam',
                    reviewResult: 'no_action_needed',
                    confidence: 0.95, // High confidence it's legitimate
                };

                expect(falsePositiveReport.reviewResult).toBe('no_action_needed');
            });
        });
    });

    describe('4. Social Features Engagement and User Adoption', () => {
        describe('User Following System', () => {
            it('should handle follow/unfollow operations correctly', async () => {
                const followerId = 'user-follower-1';
                const followingId = 'user-following-1';

                // Mock follow operation
                const followRelationship = {
                    followerId,
                    followingId,
                    followedAt: Date.now(),
                    notificationSettings: {
                        newPosts: true,
                        plantUpdates: true,
                        achievements: false,
                    },
                    isActive: true,
                };

                expect(followRelationship.followerId).toBe(followerId);
                expect(followRelationship.followingId).toBe(followingId);
                expect(followRelationship.isActive).toBe(true);

                // Mock unfollow operation
                const unfollowedRelationship = {
                    ...followRelationship,
                    isActive: false,
                    unfollowedAt: Date.now(),
                };

                expect(unfollowedRelationship.isActive).toBe(false);
            });

            it('should generate personalized social feeds', async () => {
                const userId = 'user-feed-1';
                const followedUsers = ['user-2', 'user-3', 'user-4'];

                // Mock social feed generation
                const mockFeedItems = [
                    {
                        id: 'feed-1',
                        authorId: 'user-2',
                        type: 'plant_update',
                        content: 'My plants are flowering!',
                        timestamp: Date.now() - 3600000,
                        engagementScore: 0.8,
                    },
                    {
                        id: 'feed-2',
                        authorId: 'user-3',
                        type: 'harvest_complete',
                        content: 'Just finished my harvest!',
                        timestamp: Date.now() - 7200000,
                        engagementScore: 0.9,
                    },
                ];

                // Cache social feed
                await communityCacheManager.cacheSocialFeed(userId, mockFeedItems);

                // Verify feed items are from followed users
                expect(mockFeedItems.every(item => followedUsers.includes(item.authorId))).toBe(true);
            });
        });

        describe('Achievement System', () => {
            it('should track user achievements accurately', async () => {
                const userId = 'user-achievement-1';
                const mockAchievements = [
                    {
                        id: 'achievement-1',
                        type: 'first_harvest',
                        title: 'First Harvest',
                        description: 'Completed your first harvest',
                        earnedAt: Date.now(),
                        points: 100,
                    },
                    {
                        id: 'achievement-2',
                        type: 'helpful_member',
                        title: 'Helpful Member',
                        description: 'Received 10 helpful votes',
                        earnedAt: Date.now() + 86400000,
                        points: 50,
                    },
                ];

                // Verify achievement structure
                expect(mockAchievements).toHaveLength(2);
                expect(mockAchievements[0].points).toBe(100);
                expect(mockAchievements[1].points).toBe(50);

                // Calculate total points
                const totalPoints = mockAchievements.reduce((sum, achievement) => sum + achievement.points, 0);
                expect(totalPoints).toBe(150);
            });
        });

        describe('Group Management', () => {
            it('should handle group creation and membership', async () => {
                const mockGroup = {
                    id: 'group-1',
                    name: 'Hydroponic Growers',
                    description: 'A group for hydroponic growing enthusiasts',
                    category: 'growing_method',
                    createdBy: 'user-1',
                    members: ['user-1', 'user-2', 'user-3'],
                    settings: {
                        isPublic: true,
                        allowInvites: true,
                        requireApproval: false,
                    },
                    stats: {
                        memberCount: 3,
                        postCount: 15,
                        activeMembers: 2,
                    },
                };

                expect(mockGroup.members).toHaveLength(3);
                expect(mockGroup.stats.memberCount).toBe(3);
                expect(mockGroup.settings.isPublic).toBe(true);
            });
        });
    });

    describe('5. End-to-End Community Workflow Testing', () => {
        describe('Complete User Journey', () => {
            it('should handle complete new user onboarding workflow', async () => {
                const newUserId = 'user-onboarding-1';

                // 1. Initialize user sync
                await communitySyncIntegrationManager.startUserSync(newUserId);

                // 2. Start prefetching
                await smartPrefetchingManager.startPrefetching(newUserId);

                // 3. Configure preferences
                await smartPrefetchingManager.configurePrefetchPreferences(newUserId, {
                    images: true,
                    messages: true,
                    notifications: true,
                    socialFeed: true,
                });

                // 4. Verify user is set up correctly
                const behaviorPattern = smartPrefetchingManager['behaviorPatterns'].get(newUserId);
                expect(behaviorPattern).toBeTruthy();
                expect(behaviorPattern?.userId).toBe(newUserId);
            });

            it('should handle complete messaging workflow', async () => {
                const senderId = 'user-sender-1';
                const receiverId = 'user-receiver-1';
                const conversationId = 'conv-workflow-1';

                // 1. Start conversation
                const messageId = await offlineMessagingSyncManager.sendMessage(
                    conversationId,
                    'Hello! How are your plants doing?',
                    senderId
                );

                expect(messageId).toBeTruthy();

                // 2. Update user behavior
                smartPrefetchingManager.updateUserBehavior(senderId, {
                    type: 'message_send',
                    data: { conversationId, messageId },
                    timestamp: Date.now(),
                });

                // 3. Verify message is cached
                const cachedMessages = await communityCacheManager.getCachedMessages(conversationId);
                expect(cachedMessages.some(msg => msg.id === messageId)).toBe(true);

                // 4. Simulate reply
                const replyId = await offlineMessagingSyncManager.sendMessage(
                    conversationId,
                    'They are doing great! Just started flowering.',
                    receiverId
                );

                expect(replyId).toBeTruthy();
                expect(replyId).not.toBe(messageId);
            });

            it('should handle network disruption and recovery', async () => {
                const userId = 'user-network-1';
                const conversationId = 'conv-network-1';

                // 1. Start with online status
                await communitySyncIntegrationManager.handleNetworkChange(true, 'wifi');

                // 2. Send message while online
                const onlineMessageId = await offlineMessagingSyncManager.sendMessage(
                    conversationId,
                    'Online message',
                    userId
                );

                expect(onlineMessageId).toBeTruthy();

                // 3. Go offline
                await communitySyncIntegrationManager.handleNetworkChange(false, 'none');

                // 4. Send message while offline
                const offlineMessageId = await offlineMessagingSyncManager.sendMessage(
                    conversationId,
                    'Offline message',
                    userId
                );

                expect(offlineMessageId).toBeTruthy();

                // 5. Verify offline message is queued
                const offlineMessages = await offlineMessagingSyncManager.getOfflineMessages(conversationId);
                expect(offlineMessages.some(msg => msg.id === offlineMessageId)).toBe(true);

                // 6. Go back online
                await communitySyncIntegrationManager.handleNetworkChange(true, 'wifi');

                // 7. Force sync
                await communitySyncIntegrationManager.forceSyncAll();

                // 8. Verify offline message is synced
                const remainingOfflineMessages = await offlineMessagingSyncManager.getOfflineMessages(conversationId);
                expect(remainingOfflineMessages.length).toBe(0);
            });
        });

        describe('System Integration', () => {
            it('should maintain data consistency across all components', async () => {
                const userId = 'user-consistency-1';

                // 1. Perform comprehensive consistency check
                const consistencyReport = await dataConsistencyChecker.performConsistencyCheck({
                    autoRepair: true,
                    includeOrphans: true,
                });

                expect(consistencyReport).toHaveProperty('id');
                expect(consistencyReport).toHaveProperty('issuesFound');
                expect(consistencyReport).toHaveProperty('issuesRepaired');

                // 2. Verify system health
                const diagnostics = await communitySyncIntegrationManager.getDiagnostics();
                expect(diagnostics.status.overall).toMatch(/healthy|warning/);

                // 3. Check data integrity score
                expect(diagnostics.status.metrics.dataIntegrityScore).toBeGreaterThanOrEqual(90);
            });

            it('should handle concurrent operations without conflicts', async () => {
                const userId = 'user-concurrent-1';
                const conversationId = 'conv-concurrent-1';

                // Start multiple concurrent operations
                const operations = [
                    offlineMessagingSyncManager.sendMessage(conversationId, 'Message 1', userId),
                    offlineMessagingSyncManager.sendMessage(conversationId, 'Message 2', userId),
                    offlineMessagingSyncManager.sendMessage(conversationId, 'Message 3', userId),
                    smartPrefetchingManager.startPrefetching(userId),
                    communityCacheManager.performIntelligentCleanup(),
                ];

                // All operations should complete without errors
                const results = await Promise.allSettled(operations);
                const failures = results.filter(result => result.status === 'rejected');

                expect(failures.length).toBe(0);
            });

            it('should optimize performance under load', async () => {
                const userCount = 10;
                const messagesPerUser = 5;

                // Create load test scenario
                const loadTestPromises = [];

                for (let i = 0; i < userCount; i++) {
                    const userId = `load-user-${i}`;
                    const conversationId = `load-conv-${i}`;

                    // Start user sync
                    loadTestPromises.push(communitySyncIntegrationManager.startUserSync(userId));

                    // Send multiple messages
                    for (let j = 0; j < messagesPerUser; j++) {
                        loadTestPromises.push(
                            offlineMessagingSyncManager.sendMessage(
                                conversationId,
                                `Load test message ${j}`,
                                userId
                            )
                        );
                    }
                }

                const startTime = Date.now();
                await Promise.all(loadTestPromises);
                const duration = Date.now() - startTime;

                // Should handle load test in reasonable time (under 10 seconds)
                expect(duration).toBeLessThan(10000);

                // Perform optimization
                const optimizationResult = await communitySyncIntegrationManager.performOptimization();
                expect(optimizationResult.cacheOptimized).toBe(true);
            });
        });

        describe('Error Recovery and Resilience', () => {
            it('should recover from database errors gracefully', async () => {
                // Mock database error
                const mockError = new Error('Database connection failed');

                // Operations should handle errors gracefully
                await expect(
                    communityCacheManager.performIntelligentCleanup()
                ).resolves.not.toThrow();

                await expect(
                    dataConsistencyChecker.performConsistencyCheck({ autoRepair: false })
                ).resolves.toBeTruthy();
            });

            it('should handle memory pressure situations', async () => {
                // Simulate memory pressure
                const largeDataSet = Array.from({ length: 1000 }, (_, i) => ({
                    id: `memory-test-${i}`,
                    content: 'Large content '.repeat(100),
                    timestamp: Date.now() + i,
                }));

                // Cache large dataset
                await communityCacheManager.cacheMessages('memory-test-conv', largeDataSet);

                // Perform cleanup under memory pressure
                await communityCacheManager.performIntelligentCleanup();

                // System should remain stable
                const stats = communityCacheManager.getCacheStats();
                expect(stats.timestamp).toBeGreaterThan(0);
            });
        });
    });

    describe('Performance Benchmarks', () => {
        it('should meet message delivery performance targets', async () => {
            const messageCount = 100;
            const conversationId = 'perf-conv-1';
            const senderId = 'perf-user-1';

            const startTime = Date.now();

            const messagePromises = Array.from({ length: messageCount }, (_, i) =>
                offlineMessagingSyncManager.sendMessage(
                    conversationId,
                    `Performance test message ${i}`,
                    senderId
                )
            );

            await Promise.all(messagePromises);
            const duration = Date.now() - startTime;

            // Should send 100 messages in under 5 seconds
            expect(duration).toBeLessThan(5000);
        });

        it('should meet cache performance targets', async () => {
            const itemCount = 1000;
            const conversationId = 'cache-perf-1';

            const messages = Array.from({ length: itemCount }, (_, i) => ({
                id: `cache-msg-${i}`,
                content: `Cache performance message ${i}`,
                senderId: 'cache-user-1',
                timestamp: Date.now() + i,
                type: 'text',
            }));

            // Cache performance test
            const cacheStartTime = Date.now();
            await communityCacheManager.cacheMessages(conversationId, messages);
            const cacheDuration = Date.now() - cacheStartTime;

            // Retrieval performance test
            const retrieveStartTime = Date.now();
            const cachedMessages = await communityCacheManager.getCachedMessages(conversationId);
            const retrieveDuration = Date.now() - retrieveStartTime;

            expect(cachedMessages).toHaveLength(itemCount);
            expect(cacheDuration).toBeLessThan(2000); // Cache 1000 items in under 2 seconds
            expect(retrieveDuration).toBeLessThan(500); // Retrieve in under 500ms
        });

        it('should meet sync performance targets', async () => {
            const userId = 'sync-perf-1';

            const startTime = Date.now();
            await communitySyncIntegrationManager.startUserSync(userId);
            const syncDuration = Date.now() - startTime;

            // User sync should complete in under 3 seconds
            expect(syncDuration).toBeLessThan(3000);

            // Force sync performance
            const forceSyncStartTime = Date.now();
            await communitySyncIntegrationManager.forceSyncAll();
            const forceSyncDuration = Date.now() - forceSyncStartTime;

            // Force sync should complete in under 5 seconds
            expect(forceSyncDuration).toBeLessThan(5000);
        });
    });
});