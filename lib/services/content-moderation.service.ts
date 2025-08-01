/**
 * Content Moderation Service for Advanced Community Features
 * 
 * Provides automated content filtering, spam detection, and image moderation
 * capabilities for community posts, comments, and user-generated content.
 * 
 * Features:
 * - Keyword filtering and profanity detection
 * - Spam detection using pattern analysis
 * - Image content moderation using AI analysis
 * - Automated action system for policy violations
 * - Integration with existing community components
 */

import { log } from '../utils/logger';
import type { 
  CommunityQuestion, 
  CommunityPlantShare, 
  Comment,
  PostData 
} from '../types/community';

// ========================================
// 🚨 MODERATION TYPES & INTERFACES
// ========================================

export interface ModerationResult {
  isAllowed: boolean;
  confidence: number; // 0-1 confidence score
  violations: ModerationViolation[];
  suggestedAction: ModerationAction;
  metadata?: Record<string, unknown>;
}

export interface ModerationViolation {
  type: ViolationType;
  severity: ViolationSeverity;
  description: string;
  matchedContent?: string;
  confidence: number;
}

export type ViolationType = 
  | 'profanity'
  | 'spam'
  | 'inappropriate_content'
  | 'harassment'
  | 'misinformation'
  | 'copyright'
  | 'adult_content'
  | 'violence'
  | 'illegal_content'
  | 'off_topic';

export type ViolationSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ModerationAction = 
  | 'allow'
  | 'flag_for_review'
  | 'auto_hide'
  | 'require_approval'
  | 'block'
  | 'delete';

export interface ImageModerationResult {
  isAppropriate: boolean;
  confidence: number;
  detectedContent: string[];
  adultContent: boolean;
  violenceContent: boolean;
  suggestedAction: ModerationAction;
}

export interface SpamDetectionResult {
  isSpam: boolean;
  confidence: number;
  indicators: SpamIndicator[];
  score: number; // 0-100 spam score
}

export interface SpamIndicator {
  type: string;
  description: string;
  weight: number;
}

// ========================================
// 🛡️ CONTENT FILTERING CONFIGURATION
// ========================================

/**
 * Profanity and inappropriate content keywords
 * Organized by severity level for graduated responses
 */
const PROFANITY_FILTERS = {
  critical: [
    // Severe profanity and slurs (immediate block)
    'fuck', 'shit', 'bitch', 'asshole', 'damn', 'crap',
    // Add more as needed - keeping it cannabis-community appropriate
  ],
  high: [
    // Moderate profanity (flag for review)
    'stupid', 'idiot', 'moron', 'dumb',
  ],
  medium: [
    // Mild inappropriate language (warning)
    'suck', 'lame', 'crappy',
  ],
};

/**
 * Cannabis-specific inappropriate content
 * Focus on illegal activities and harmful practices
 */
const CANNABIS_INAPPROPRIATE_CONTENT = {
  illegal_activities: [
    'selling', 'buy weed', 'drug dealer', 'black market',
    'illegal sale', 'street dealer', 'trafficking',
  ],
  harmful_practices: [
    'pesticide abuse', 'dangerous chemicals', 'mold contamination',
    'unsafe growing', 'toxic nutrients',
  ],
  off_topic: [
    'hard drugs', 'cocaine', 'heroin', 'meth', 'pills',
    'prescription drugs', 'alcohol abuse',
  ],
};

/**
 * Spam detection patterns
 */
const SPAM_PATTERNS = {
  repetitive_text: /(.{10,})\1{2,}/gi, // Repeated text patterns
  excessive_caps: /[A-Z]{10,}/g, // Excessive capitalization
  excessive_punctuation: /[!?]{3,}/g, // Multiple exclamation/question marks
  url_spam: /(https?:\/\/[^\s]+)/gi, // URLs (may be spam)
  email_spam: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, // Email addresses
  phone_spam: /(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g, // Phone numbers
};

// ========================================
// 🤖 CONTENT MODERATION SERVICE
// ========================================

class ContentModerationService {
  private readonly moderationThresholds = {
    spam: 0.7, // 70% confidence threshold for spam
    profanity: 0.8, // 80% confidence threshold for profanity
    inappropriate: 0.75, // 75% confidence threshold for inappropriate content
    image: 0.85, // 85% confidence threshold for image violations
  };

  /**
   * Moderate text content (posts, comments, etc.)
   */
  async moderateTextContent(
    content: string,
    contentType: 'post' | 'comment' | 'question' | 'plant_share' = 'post'
  ): Promise<ModerationResult> {
    try {
      log.info('[ContentModeration] Moderating text content', { contentType, length: content.length });

      const violations: ModerationViolation[] = [];
      let overallConfidence = 0;

      // 1. Profanity Detection
      const profanityResult = this.detectProfanity(content);
      if (profanityResult.violations.length > 0) {
        violations.push(...profanityResult.violations);
        overallConfidence = Math.max(overallConfidence, profanityResult.confidence);
      }

      // 2. Spam Detection
      const spamResult = await this.detectSpam(content);
      if (spamResult.isSpam) {
        violations.push({
          type: 'spam',
          severity: spamResult.confidence > 0.9 ? 'critical' : 'high',
          description: `Spam detected with ${Math.round(spamResult.confidence * 100)}% confidence`,
          confidence: spamResult.confidence,
        });
        overallConfidence = Math.max(overallConfidence, spamResult.confidence);
      }

      // 3. Cannabis-specific inappropriate content
      const inappropriateResult = this.detectInappropriateContent(content);
      if (inappropriateResult.violations.length > 0) {
        violations.push(...inappropriateResult.violations);
        overallConfidence = Math.max(overallConfidence, inappropriateResult.confidence);
      }

      // 4. Determine suggested action
      const suggestedAction = this.determineModerationAction(violations, overallConfidence);
      const isAllowed = suggestedAction === 'allow';

      log.info('[ContentModeration] Text moderation complete', {
        isAllowed,
        violationsCount: violations.length,
        suggestedAction,
        confidence: overallConfidence,
      });

      return {
        isAllowed,
        confidence: overallConfidence,
        violations,
        suggestedAction,
        metadata: {
          contentType,
          contentLength: content.length,
          moderatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      log.error('[ContentModeration] Error moderating text content:', error);
      
      // Fail safe - allow content but flag for manual review
      return {
        isAllowed: true,
        confidence: 0,
        violations: [],
        suggestedAction: 'flag_for_review',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          failSafe: true,
        },
      };
    }
  }

  /**
   * Moderate image content using AI analysis
   */
  async moderateImageContent(imageUrl: string): Promise<ImageModerationResult> {
    try {
      log.info('[ContentModeration] Moderating image content', { imageUrl });

      // For now, implement basic image moderation
      // In production, this would integrate with services like:
      // - Google Cloud Vision API
      // - AWS Rekognition
      // - Microsoft Azure Computer Vision
      // - OpenAI GPT-4 Vision

      // Placeholder implementation - basic URL validation
      const isValidUrl = this.validateImageUrl(imageUrl);
      
      if (!isValidUrl) {
        return {
          isAppropriate: false,
          confidence: 0.9,
          detectedContent: ['invalid_url'],
          adultContent: false,
          violenceContent: false,
          suggestedAction: 'block',
        };
      }

      // TODO: Implement actual AI image analysis
      // For now, return a permissive result for cannabis growing images
      const result: ImageModerationResult = {
        isAppropriate: true,
        confidence: 0.8,
        detectedContent: ['plant', 'cannabis'],
        adultContent: false,
        violenceContent: false,
        suggestedAction: 'allow',
      };

      log.info('[ContentModeration] Image moderation complete', result);
      return result;

    } catch (error) {
      log.error('[ContentModeration] Error moderating image:', error);
      
      // Fail safe - flag for manual review
      return {
        isAppropriate: true,
        confidence: 0,
        detectedContent: [],
        adultContent: false,
        violenceContent: false,
        suggestedAction: 'flag_for_review',
      };
    }
  }

  /**
   * Moderate community question content
   */
  async moderateQuestion(question: Partial<CommunityQuestion>): Promise<ModerationResult> {
    const combinedContent = `${question.title || ''} ${question.content || ''}`.trim();
    return this.moderateTextContent(combinedContent, 'question');
  }

  /**
   * Moderate plant share content
   */
  async moderatePlantShare(plantShare: Partial<CommunityPlantShare>): Promise<ModerationResult> {
    const combinedContent = `${plantShare.plant_name || ''} ${plantShare.content || ''} ${plantShare.care_tips || ''}`.trim();
    return this.moderateTextContent(combinedContent, 'plant_share');
  }

  /**
   * Moderate comment content
   */
  async moderateComment(comment: Partial<Comment>): Promise<ModerationResult> {
    return this.moderateTextContent(comment.content || '', 'comment');
  }

  /**
   * Moderate generic post data
   */
  async moderatePost(post: Partial<PostData>): Promise<ModerationResult> {
    const combinedContent = `${post.title || ''} ${post.content || ''}`.trim();
    return this.moderateTextContent(combinedContent, 'post');
  }

  // ========================================
  // 🔍 PRIVATE DETECTION METHODS
  // ========================================

  /**
   * Detect profanity and inappropriate language
   */
  private detectProfanity(content: string): { violations: ModerationViolation[]; confidence: number } {
    const violations: ModerationViolation[] = [];
    const lowerContent = content.toLowerCase();
    let maxConfidence = 0;

    // Check critical profanity
    for (const word of PROFANITY_FILTERS.critical) {
      if (lowerContent.includes(word)) {
        violations.push({
          type: 'profanity',
          severity: 'critical',
          description: `Critical profanity detected: "${word}"`,
          matchedContent: word,
          confidence: 0.95,
        });
        maxConfidence = Math.max(maxConfidence, 0.95);
      }
    }

    // Check high-level profanity
    for (const word of PROFANITY_FILTERS.high) {
      if (lowerContent.includes(word)) {
        violations.push({
          type: 'profanity',
          severity: 'high',
          description: `Inappropriate language detected: "${word}"`,
          matchedContent: word,
          confidence: 0.8,
        });
        maxConfidence = Math.max(maxConfidence, 0.8);
      }
    }

    // Check medium-level profanity
    for (const word of PROFANITY_FILTERS.medium) {
      if (lowerContent.includes(word)) {
        violations.push({
          type: 'profanity',
          severity: 'medium',
          description: `Mild inappropriate language detected: "${word}"`,
          matchedContent: word,
          confidence: 0.6,
        });
        maxConfidence = Math.max(maxConfidence, 0.6);
      }
    }

    return { violations, confidence: maxConfidence };
  }

  /**
   * Detect spam content using pattern analysis
   */
  private async detectSpam(content: string): Promise<SpamDetectionResult> {
    const indicators: SpamIndicator[] = [];
    let spamScore = 0;

    // Check for repetitive text
    const repetitiveMatches = content.match(SPAM_PATTERNS.repetitive_text);
    if (repetitiveMatches && repetitiveMatches.length > 0) {
      indicators.push({
        type: 'repetitive_text',
        description: 'Repetitive text patterns detected',
        weight: 30,
      });
      spamScore += 30;
    }

    // Check for excessive capitalization
    const capsMatches = content.match(SPAM_PATTERNS.excessive_caps);
    if (capsMatches && capsMatches.length > 0) {
      indicators.push({
        type: 'excessive_caps',
        description: 'Excessive capitalization detected',
        weight: 20,
      });
      spamScore += 20;
    }

    // Check for excessive punctuation
    const punctuationMatches = content.match(SPAM_PATTERNS.excessive_punctuation);
    if (punctuationMatches && punctuationMatches.length > 0) {
      indicators.push({
        type: 'excessive_punctuation',
        description: 'Excessive punctuation detected',
        weight: 15,
      });
      spamScore += 15;
    }

    // Check for URLs (potential spam)
    const urlMatches = content.match(SPAM_PATTERNS.url_spam);
    if (urlMatches && urlMatches.length > 2) {
      indicators.push({
        type: 'multiple_urls',
        description: 'Multiple URLs detected',
        weight: 25,
      });
      spamScore += 25;
    }

    // Check for email addresses
    const emailMatches = content.match(SPAM_PATTERNS.email_spam);
    if (emailMatches && emailMatches.length > 0) {
      indicators.push({
        type: 'email_spam',
        description: 'Email addresses detected',
        weight: 35,
      });
      spamScore += 35;
    }

    // Check for phone numbers
    const phoneMatches = content.match(SPAM_PATTERNS.phone_spam);
    if (phoneMatches && phoneMatches.length > 0) {
      indicators.push({
        type: 'phone_spam',
        description: 'Phone numbers detected',
        weight: 40,
      });
      spamScore += 40;
    }

    const confidence = Math.min(spamScore / 100, 1);
    const isSpam = confidence >= this.moderationThresholds.spam;

    return {
      isSpam,
      confidence,
      indicators,
      score: spamScore,
    };
  }

  /**
   * Detect cannabis-specific inappropriate content
   */
  private detectInappropriateContent(content: string): { violations: ModerationViolation[]; confidence: number } {
    const violations: ModerationViolation[] = [];
    const lowerContent = content.toLowerCase();
    let maxConfidence = 0;

    // Check for illegal activities
    for (const phrase of CANNABIS_INAPPROPRIATE_CONTENT.illegal_activities) {
      if (lowerContent.includes(phrase)) {
        violations.push({
          type: 'illegal_content',
          severity: 'critical',
          description: `Illegal activity reference detected: "${phrase}"`,
          matchedContent: phrase,
          confidence: 0.9,
        });
        maxConfidence = Math.max(maxConfidence, 0.9);
      }
    }

    // Check for harmful practices
    for (const phrase of CANNABIS_INAPPROPRIATE_CONTENT.harmful_practices) {
      if (lowerContent.includes(phrase)) {
        violations.push({
          type: 'inappropriate_content',
          severity: 'high',
          description: `Harmful practice detected: "${phrase}"`,
          matchedContent: phrase,
          confidence: 0.8,
        });
        maxConfidence = Math.max(maxConfidence, 0.8);
      }
    }

    // Check for off-topic content
    for (const phrase of CANNABIS_INAPPROPRIATE_CONTENT.off_topic) {
      if (lowerContent.includes(phrase)) {
        violations.push({
          type: 'off_topic',
          severity: 'medium',
          description: `Off-topic content detected: "${phrase}"`,
          matchedContent: phrase,
          confidence: 0.7,
        });
        maxConfidence = Math.max(maxConfidence, 0.7);
      }
    }

    return { violations, confidence: maxConfidence };
  }

  /**
   * Validate image URL format and accessibility
   */
  private validateImageUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const validDomains = ['supabase.co', 'supabase.in', 'localhost'];
      const isValidDomain = validDomains.some(domain => urlObj.hostname.includes(domain));
      const hasImageExtension = /\.(jpg|jpeg|png|webp|gif)$/i.test(urlObj.pathname);
      
      return isValidDomain && (hasImageExtension || urlObj.pathname.includes('storage'));
    } catch {
      return false;
    }
  }

  /**
   * Determine the appropriate moderation action based on violations
   */
  private determineModerationAction(violations: ModerationViolation[], confidence: number): ModerationAction {
    if (violations.length === 0) {
      return 'allow';
    }

    // Check for critical violations
    const hasCritical = violations.some(v => v.severity === 'critical');
    if (hasCritical) {
      return 'block';
    }

    // Check for high severity violations
    const hasHigh = violations.some(v => v.severity === 'high');
    if (hasHigh && confidence > 0.8) {
      return 'auto_hide';
    }

    // Check for medium severity violations
    const hasMedium = violations.some(v => v.severity === 'medium');
    if (hasMedium || confidence > 0.6) {
      return 'flag_for_review';
    }

    // Low severity or low confidence
    return 'require_approval';
  }

  /**
   * Get moderation statistics for analytics
   */
  async getModerationStats(timeframe: 'day' | 'week' | 'month' = 'day'): Promise<{
    totalModerated: number;
    allowed: number;
    flagged: number;
    blocked: number;
    violationTypes: Record<ViolationType, number>;
  }> {
    // This would typically query a moderation log database
    // For now, return placeholder data
    return {
      totalModerated: 0,
      allowed: 0,
      flagged: 0,
      blocked: 0,
      violationTypes: {
        profanity: 0,
        spam: 0,
        inappropriate_content: 0,
        harassment: 0,
        misinformation: 0,
        copyright: 0,
        adult_content: 0,
        violence: 0,
        illegal_content: 0,
        off_topic: 0,
      },
    };
  }
}

// Export singleton instance
export const contentModerationService = new ContentModerationService();
export default contentModerationService;