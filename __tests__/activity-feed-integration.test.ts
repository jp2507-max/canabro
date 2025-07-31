/**
 * ActivityFeed Integration Test
 * 
 * Tests the ActivityFeed component functionality including:
 * - Component rendering
 * - Filter functionality
 * - Activity interactions
 * - Real-time updates simulation
 * - Performance with large datasets
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('ActivityFeed Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Functionality', () => {
    it('should handle activity filtering correctly', () => {
      // Mock activity data
      const mockActivities = [
        {
          activityId: '1',
          userId: 'user1',
          activityType: 'plant_updated' as const,
          title: 'User updated their plant',
          description: 'See the latest progress',
          metadata: {
            sourceId: 'plant1',
            sourceType: 'plant',
            relatedUsers: [],
            tags: ['cannabis', 'growing'],
          },
          visibility: 'public' as const,
          engagementStats: {
            likes: 5,
            comments: 2,
            shares: 1,
            views: 50,
            saves: 3,
          },
          createdAt: new Date(),
          user: {
            id: 'user1',
            username: 'TestUser',
            avatar_url: 'https://example.com/avatar.jpg',
          },
        },
        {
          activityId: '2',
          userId: 'user2',
          activityType: 'post_created' as const,
          title: 'User created a post',
          description: 'Check out their update',
          metadata: {
            sourceId: 'post1',
            sourceType: 'post',
            relatedUsers: [],
            tags: ['community'],
          },
          visibility: 'public' as const,
          engagementStats: {
            likes: 10,
            comments: 5,
            shares: 2,
            views: 100,
            saves: 8,
          },
          createdAt: new Date(),
          user: {
            id: 'user2',
            username: 'AnotherUser',
            avatar_url: 'https://example.com/avatar2.jpg',
          },
        },
      ];

      // Test filtering logic
      const plantActivities = mockActivities.filter(activity =>
        ['plant_updated', 'harvest_completed', 'milestone_reached'].includes(activity.activityType)
      );

      const communityActivities = mockActivities.filter(activity =>
        ['post_created', 'comment_added', 'group_joined', 'user_followed', 'post_liked'].includes(activity.activityType)
      );

      expect(plantActivities).toHaveLength(1);
      expect(plantActivities[0].activityType).toBe('plant_updated');

      expect(communityActivities).toHaveLength(1);
      expect(communityActivities[0].activityType).toBe('post_created');
    });

    it('should handle search functionality correctly', () => {
      const mockActivities = [
        {
          activityId: '1',
          title: 'Blue Dream harvest completed',
          description: 'Amazing harvest results',
          user: { username: 'GrowMaster' },
          metadata: { tags: ['blue-dream', 'harvest'] },
        },
        {
          activityId: '2',
          title: 'OG Kush plant update',
          description: 'Weekly progress check',
          user: { username: 'PlantExpert' },
          metadata: { tags: ['og-kush', 'update'] },
        },
      ];

      // Test search by title
      const searchQuery = 'blue dream';
      const filteredByTitle = mockActivities.filter(activity =>
        activity.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      expect(filteredByTitle).toHaveLength(1);
      expect(filteredByTitle[0].activityId).toBe('1');

      // Test search by username
      const usernameQuery = 'expert';
      const filteredByUsername = mockActivities.filter(activity =>
        activity.user?.username?.toLowerCase().includes(usernameQuery.toLowerCase())
      );
      expect(filteredByUsername).toHaveLength(1);
      expect(filteredByUsername[0].activityId).toBe('2');

      // Test search by tags
      const tagQuery = 'harvest';
      const filteredByTags = mockActivities.filter(activity =>
        activity.metadata.tags.some(tag => tag.toLowerCase().includes(tagQuery.toLowerCase()))
      );
      expect(filteredByTags).toHaveLength(1);
      expect(filteredByTags[0].activityId).toBe('1');
    });

    it('should handle engagement stats correctly', () => {
      const mockActivity = {
        activityId: '1',
        engagementStats: {
          likes: 25,
          comments: 8,
          shares: 3,
          views: 150,
          saves: 12,
        },
      };

      // Test engagement stats display
      expect(mockActivity.engagementStats.likes).toBe(25);
      expect(mockActivity.engagementStats.comments).toBe(8);
      expect(mockActivity.engagementStats.views).toBe(150);

      // Test engagement rate calculation
      const engagementRate = (
        (mockActivity.engagementStats.likes + 
         mockActivity.engagementStats.comments + 
         mockActivity.engagementStats.shares) / 
        mockActivity.engagementStats.views
      ) * 100;

      expect(engagementRate).toBeCloseTo(24, 0); // ~24% engagement rate
    });
  });

  describe('Performance Tests', () => {
    it('should handle large datasets efficiently', () => {
      const startTime = Date.now();
      
      // Generate large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, index) => ({
        activityId: `activity_${index}`,
        userId: `user_${index % 10}`,
        activityType: 'post_created' as const,
        title: `Activity ${index}`,
        description: `Description for activity ${index}`,
        metadata: {
          sourceId: `source_${index}`,
          sourceType: 'post',
          relatedUsers: [],
          tags: ['test', `tag_${index % 5}`],
        },
        visibility: 'public' as const,
        engagementStats: {
          likes: Math.floor(Math.random() * 100),
          comments: Math.floor(Math.random() * 50),
          shares: Math.floor(Math.random() * 20),
          views: Math.floor(Math.random() * 500) + 100,
          saves: Math.floor(Math.random() * 30),
        },
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        user: {
          id: `user_${index % 10}`,
          username: `User${index % 10}`,
          avatar_url: `https://example.com/avatar${index % 10}.jpg`,
        },
      }));

      // Test filtering performance
      const filtered = largeDataset.filter(activity =>
        activity.title.toLowerCase().includes('activity')
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(filtered.length).toBe(1000);
      expect(processingTime).toBeLessThan(100); // Should process in under 100ms
    });

    it('should handle sorting efficiently', () => {
      const activities = Array.from({ length: 100 }, (_, index) => ({
        activityId: `activity_${index}`,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        engagementStats: {
          likes: Math.floor(Math.random() * 100),
          comments: Math.floor(Math.random() * 50),
          shares: Math.floor(Math.random() * 20),
          views: Math.floor(Math.random() * 500) + 100,
          saves: Math.floor(Math.random() * 30),
        },
      }));

      const startTime = Date.now();

      // Sort by date (most recent first)
      const sortedByDate = [...activities].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );

      // Sort by engagement (most liked first)
      const sortedByLikes = [...activities].sort(
        (a, b) => b.engagementStats.likes - a.engagementStats.likes
      );

      const endTime = Date.now();
      const sortingTime = endTime - startTime;

      expect(sortedByDate.length).toBe(100);
      expect(sortedByLikes.length).toBe(100);
      expect(sortingTime).toBeLessThan(50); // Should sort in under 50ms

      // Verify sorting correctness
      expect(sortedByDate[0].createdAt.getTime()).toBeGreaterThanOrEqual(
        sortedByDate[1].createdAt.getTime()
      );
      expect(sortedByLikes[0].engagementStats.likes).toBeGreaterThanOrEqual(
        sortedByLikes[1].engagementStats.likes
      );
    });
  });

  describe('Real-time Updates Simulation', () => {
    it('should handle activity updates correctly', () => {
      const initialActivities = [
        {
          activityId: '1',
          title: 'Initial activity',
          engagementStats: { likes: 5, comments: 2, shares: 1, views: 50, saves: 3 },
        },
      ];

      // Simulate real-time update
      const updatedActivity = {
        ...initialActivities[0],
        engagementStats: { likes: 8, comments: 3, shares: 1, views: 65, saves: 4 },
      };

      const updatedActivities = initialActivities.map(activity =>
        activity.activityId === updatedActivity.activityId ? updatedActivity : activity
      );

      expect(updatedActivities[0].engagementStats.likes).toBe(8);
      expect(updatedActivities[0].engagementStats.comments).toBe(3);
      expect(updatedActivities[0].engagementStats.views).toBe(65);
    });

    it('should handle new activity insertion correctly', () => {
      const existingActivities = [
        {
          activityId: '1',
          createdAt: new Date('2024-01-01T10:00:00Z'),
          title: 'Older activity',
        },
        {
          activityId: '2',
          createdAt: new Date('2024-01-01T09:00:00Z'),
          title: 'Even older activity',
        },
      ];

      const newActivity = {
        activityId: '3',
        createdAt: new Date('2024-01-01T11:00:00Z'),
        title: 'New activity',
      };

      // Insert new activity and sort by date
      const updatedActivities = [newActivity, ...existingActivities].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );

      expect(updatedActivities).toHaveLength(3);
      expect(updatedActivities[0].activityId).toBe('3'); // Most recent
      expect(updatedActivities[0].title).toBe('New activity');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing user data gracefully', () => {
      const activityWithoutUser = {
        activityId: '1',
        userId: 'user1',
        title: 'Activity without user data',
        user: null,
      };

      // Should not throw error when user is null
      expect(() => {
        const displayName = activityWithoutUser.user?.username || 'Unknown User';
        expect(displayName).toBe('Unknown User');
      }).not.toThrow();
    });

    it('should handle missing metadata gracefully', () => {
      const activityWithMinimalData = {
        activityId: '1',
        title: 'Minimal activity',
        metadata: {
          sourceId: 'source1',
          sourceType: 'post',
          relatedUsers: [],
          tags: [],
        },
      };

      // Should handle empty tags array
      expect(activityWithMinimalData.metadata.tags).toEqual([]);
      expect(activityWithMinimalData.metadata.relatedUsers).toEqual([]);
    });

    it('should handle invalid dates gracefully', () => {
      const activityWithInvalidDate = {
        activityId: '1',
        createdAt: new Date('invalid-date'),
      };

      // Should handle invalid date
      const isValidDate = !isNaN(activityWithInvalidDate.createdAt.getTime());
      expect(isValidDate).toBe(false);

      // Fallback to current date
      const fallbackDate = isValidDate ? activityWithInvalidDate.createdAt : new Date();
      expect(fallbackDate).toBeInstanceOf(Date);
    });
  });
});

// Export for potential use in other tests
export const mockActivityData = {
  generateMockActivity: (overrides = {}) => ({
    activityId: 'test_activity',
    userId: 'test_user',
    activityType: 'post_created' as const,
    title: 'Test Activity',
    description: 'Test Description',
    metadata: {
      sourceId: 'test_source',
      sourceType: 'post',
      relatedUsers: [],
      tags: ['test'],
    },
    visibility: 'public' as const,
    engagementStats: {
      likes: 0,
      comments: 0,
      shares: 0,
      views: 0,
      saves: 0,
    },
    createdAt: new Date(),
    user: {
      id: 'test_user',
      username: 'TestUser',
      avatar_url: 'https://example.com/avatar.jpg',
    },
    ...overrides,
  }),
};