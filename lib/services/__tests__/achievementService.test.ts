/**
 * Achievement Service Tests
 */

import { achievementService } from '../achievementService';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          data: [],
          error: null
        }))
      }))
    }))
  }))
}));

// Mock logger
jest.mock('@/lib/utils/logger', () => ({
  log: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('AchievementService', () => {
  describe('getUserAchievements', () => {
    it('should return empty array when no achievements found', async () => {
      const result = await achievementService.getUserAchievements('test-user-id');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('calculateAchievementProgress', () => {
    it('should calculate progress correctly for first_plant achievement', () => {
      const mockAchievement = {
        id: '1',
        achievementId: 'first_plant',
        title: 'First Plant',
        description: 'Grow your first plant',
        metadata: {
          category: 'growing' as const,
          difficulty: 'bronze' as const,
          points: 100,
          iconName: 'plant'
        },
        pointsEarned: 0,
        isUnlocked: false,
        progressPercentage: 0
      };

      const mockStats = {
        growing: { plantsGrown: 1, harvestsCompleted: 0, strainsGrown: 0, daysActive: 1 },
        community: { postsCreated: 0, commentsPosted: 0, likesReceived: 0, helpfulAnswers: 0 },
        social: { followersCount: 0, followingCount: 0, groupsJoined: 0, eventsAttended: 0 },
        knowledge: { strainsReviewed: 0, questionsAnswered: 0, guidesShared: 0, expertRating: 0 }
      };

      // Access private method for testing
      const progress = (achievementService as any).calculateAchievementProgress(mockAchievement, mockStats);
      
      expect(progress.achievementId).toBe('first_plant');
      expect(progress.currentValue).toBe(1);
      expect(progress.targetValue).toBe(1);
      expect(progress.progressPercentage).toBe(100);
    });
  });
});