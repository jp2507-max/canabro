/**
 * Content Moderation Service Tests
 * 
 * Tests for the content moderation functionality including:
 * - Text content moderation
 * - Image content moderation
 * - Spam detection
 * - Profanity filtering
 * - Cannabis-specific content filtering
 */

import { contentModerationService } from '../content-moderation.service';

describe('ContentModerationService', () => {
  describe('Text Content Moderation', () => {
    it('should allow clean content', async () => {
      const result = await contentModerationService.moderateTextContent(
        'This is a great growing tip for cannabis plants. Thanks for sharing!'
      );

      expect(result.isAllowed).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.suggestedAction).toBe('allow');
    });

    it('should detect profanity', async () => {
      const result = await contentModerationService.moderateTextContent(
        'This is fucking stupid advice'
      );

      expect(result.isAllowed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].type).toBe('profanity');
      expect(result.suggestedAction).toBe('block');
    });

    it('should detect spam patterns', async () => {
      const result = await contentModerationService.moderateTextContent(
        'BUY WEED NOW!!! CHEAP PRICES!!! Contact me at dealer@example.com or call 555-123-4567'
      );

      expect(result.isAllowed).toBe(false);
      expect(result.violations.some(v => v.type === 'spam')).toBe(true);
    });

    it('should detect illegal content references', async () => {
      const result = await contentModerationService.moderateTextContent(
        'I am selling high quality cannabis, contact me for black market deals'
      );

      expect(result.isAllowed).toBe(false);
      expect(result.violations.some(v => v.type === 'illegal_content')).toBe(true);
    });

    it('should detect off-topic content', async () => {
      const result = await contentModerationService.moderateTextContent(
        'Anyone know where to buy cocaine? This is not about cannabis at all'
      );

      expect(result.isAllowed).toBe(false);
      expect(result.violations.some(v => v.type === 'off_topic')).toBe(true);
    });
  });

  describe('Question Moderation', () => {
    it('should moderate question content', async () => {
      const question = {
        title: 'How to grow cannabis?',
        content: 'I need help with growing my plants properly.',
        category: 'growing_tips' as const,
      };

      const result = await contentModerationService.moderateQuestion(question);

      expect(result.isAllowed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should flag inappropriate questions', async () => {
      const question = {
        title: 'Where to buy illegal drugs?',
        content: 'Looking for a drug dealer in my area',
        category: 'general' as const,
      };

      const result = await contentModerationService.moderateQuestion(question);

      expect(result.isAllowed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });
  });

  describe('Plant Share Moderation', () => {
    it('should moderate plant share content', async () => {
      const plantShare = {
        plant_name: 'Northern Lights',
        content: 'Here is my beautiful plant in flowering stage',
        care_tips: 'Water every 2-3 days and maintain proper humidity',
        growth_stage: 'flowering' as const,
      };

      const result = await contentModerationService.moderatePlantShare(plantShare);

      expect(result.isAllowed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('Comment Moderation', () => {
    it('should moderate comment content', async () => {
      const comment = {
        content: 'Great advice! This really helped my plants grow better.',
      };

      const result = await contentModerationService.moderateComment(comment);

      expect(result.isAllowed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should flag inappropriate comments', async () => {
      const comment = {
        content: 'You are such an idiot, this advice is fucking terrible',
      };

      const result = await contentModerationService.moderateComment(comment);

      expect(result.isAllowed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });
  });

  describe('Image Moderation', () => {
    it('should validate image URLs', async () => {
      const validUrl = 'https://supabase.co/storage/v1/object/plants/user123/plant.jpg';
      const result = await contentModerationService.moderateImageContent(validUrl);

      expect(result.isAppropriate).toBe(true);
      expect(result.suggestedAction).toBe('allow');
    });

    it('should reject invalid image URLs', async () => {
      const invalidUrl = 'https://malicious-site.com/bad-image.jpg';
      const result = await contentModerationService.moderateImageContent(invalidUrl);

      expect(result.isAppropriate).toBe(false);
      expect(result.suggestedAction).toBe('block');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully with fail-safe behavior', async () => {
      // Test with null content to trigger error handling
      const result = await contentModerationService.moderateTextContent(null as any);

      expect(result.isAllowed).toBe(true); // Fail-safe allows content
      expect(result.suggestedAction).toBe('flag_for_review');
      expect(result.metadata?.failSafe).toBe(true);
    });
  });

  describe('Moderation Statistics', () => {
    it('should return moderation statistics', async () => {
      const stats = await contentModerationService.getModerationStats('day');

      expect(stats).toHaveProperty('totalModerated');
      expect(stats).toHaveProperty('allowed');
      expect(stats).toHaveProperty('flagged');
      expect(stats).toHaveProperty('blocked');
      expect(stats).toHaveProperty('violationTypes');
      expect(typeof stats.totalModerated).toBe('number');
    });
  });
});