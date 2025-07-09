// Helper to check for plain object
function isPlainObject(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}
// Type guard for CommunityRow
function isCommunityRow(row: unknown): row is CommunityRow {
  return (
    typeof row === 'object' &&
    row !== null &&
    'id' in row &&
    typeof (row as { id: unknown }).id === 'string'
  );
}
/**
 * Data Integrity Service for Supabase Community Content
 * Handles orphaned record detection, broken reference cleanup, and data validation
 * Note: Local WatermelonDB community content support has been removed - community features require online connectivity
 */


import { Database } from '@nozbe/watermelondb';
import supabase from '../../supabase';
import { logger } from '../../config/production';
import { deleteImage, extractFilePathFromUrl, type StorageBucket } from '../../utils/upload-image';

// Represents a unified row from either community_questions or community_plant_shares
export interface CommunityRow {
  id: string;
  user_id?: string;
  image_url?: string | null;
  [key: string]: unknown;
}

interface SyncRecord {
  id: string;
  user_id?: string;
  [key: string]: unknown;
}

interface _CommunityQuestionRecord extends SyncRecord {
  question_id?: string;
  content?: string;
  image_url?: string | null;
  category?: string | null;
  title?: string | null;
}

interface _CommunityPlantShareRecord extends SyncRecord {
  plant_share_id?: string;
  content?: string;
  images_urls?: string[] | null;
  growth_stage?: string | null;
  strain_name?: string | null;
}

interface _CommentRecord extends SyncRecord {
  question_id?: string;
  plant_share_id?: string;
  content?: string;
}

interface _PlantRecord extends SyncRecord {
  plant_id?: string;
  name?: string;
}

export interface IntegrityCheckResult {
  orphanedQuestions: string[];
  orphanedPlantShares: string[];
  brokenImageUrls: string[];
  missingReferences: string[];
  fixedCount: number;
  errors: string[];
}

export interface SyncValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fixableIssues: string[];
}

/**
 * Data Integrity Service for managing data consistency between local and remote databases
 */
export class DataIntegrityService {
  constructor(private database: Database) {}

  /**
   * Performs comprehensive data integrity check and cleanup
   */
  async performIntegrityCheck(userId: string): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      orphanedQuestions: [],
      orphanedPlantShares: [],
      brokenImageUrls: [],
      missingReferences: [],
      fixedCount: 0,
      errors: [],
    };

    try {
      logger.log('[DataIntegrity] Starting comprehensive integrity check...');

      // Check for orphaned community content
      await this.checkOrphanedCommunityContent(userId, result);

  // Check for broken image URLs (userId can be undefined for global check)
  await this.checkBrokenImageUrls(userId, result);

      // Check for missing references
      await this.checkMissingReferences(userId, result);

      // Attempt to fix issues
      await this.fixIdentifiedIssues(result);

      logger.log(`[DataIntegrity] Integrity check completed. Fixed ${result.fixedCount} issues.`);
    } catch (error) {
      const errorMsg = `Integrity check failed: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMsg);
      logger.error('[DataIntegrity]', errorMsg);
    }

    return result;
  }

  /**
   * Validates data before sync operations
   */
  async validatePreSync(records: SyncRecord[], tableName: string): Promise<SyncValidationResult> {
    const result: SyncValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      fixableIssues: [],
    };

    try {
      for (const record of records) {
        await this.validateRecord(record, tableName, result);
      }

      // Mark as invalid if there are critical errors
      result.isValid = result.errors.length === 0;
    } catch (error) {
      result.errors.push(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);
      result.isValid = false;
    }

    return result;
  }

  /**
  * Unified community content fetcher – replaces legacy `posts` table queries.
  *
  * Note: The legacy `posts` table and all related type-unsafe code (e.g., `get<any>('posts')`) have been fully removed.
  * This comment remains for historical context and to clarify that all community content is now fetched from
  * `community_questions` and `community_plant_shares` with strict TypeScript interfaces. No legacy code remains.
   * Returns selected columns from both `community_questions` (CQ) and
   * `community_plant_shares` (CPS) so existing integrity checks can stay intact.
   * For CPS rows we normalise the first element of `images_urls` to `image_url`
   * because several downstream checks expect that property name.
   */
  /**
   * Unified community content fetcher – replaces legacy `posts` table queries.
   *
   * If userId is provided, only fetches content for that user. If userId is undefined/null, fetches all content.
   */
  private async fetchCommunityRows(
    columns: readonly string[],
    userId?: string
  ): Promise<CommunityRow[]> {
    // For community_questions, use columns as-is
    const cqColumns = columns;
    // For community_plant_shares, map 'image_url' to 'images_urls', keep others as-is
    const cpsColumns = columns.map(col => col === 'image_url' ? 'images_urls' : col);
    const cqSelect = cqColumns.join(', ');
    const cpsSelect = cpsColumns.join(', ');

    // Build queries conditionally based on userId
    const cqQuery = supabase.from('community_questions').select(cqSelect);
    const cpsQuery = supabase.from('community_plant_shares').select(cpsSelect);
    if (userId !== undefined && userId !== null && userId !== '') {
      cqQuery.eq('user_id', userId);
      cpsQuery.eq('user_id', userId);
    }

    const [cq, cps] = await Promise.all([
      cqQuery,
      cpsQuery,
    ]);

    if (cq.error) throw new Error(`Community questions query failed: ${cq.error.message}`);
    if (cps.error) throw new Error(`Community plant shares query failed: ${cps.error.message}`);

    // Safely narrow to CommunityRow[] by filtering for objects with id
    const cqRows: CommunityRow[] = (Array.isArray(cq.data) ? cq.data : []).reduce<CommunityRow[]>((acc, row) => {
      if (isPlainObject(row) && isCommunityRow(row)) {
        acc.push(row);
      }
      return acc;
    }, []);

    // For plant shares, normalize images_urls to image_url (first image)
    const cpsRows: CommunityRow[] = (Array.isArray(cps.data) ? cps.data : []).reduce<CommunityRow[]>((acc, row) => {
      if (isPlainObject(row) && isCommunityRow(row)) {
        if ('images_urls' in row && !('image_url' in row)) {
          const imgs = row.images_urls;
          const first = Array.isArray(imgs) ? (imgs[0] as string | null) : null;
          // Explicitly construct the normalized object
          const normalized: CommunityRow = {
            id: row.id,
            user_id: row.user_id,
            image_url: first
          };
          // Optionally copy other known keys from row if needed
          acc.push(normalized);
        } else {
          acc.push(row);
        }
      }
      return acc;
    }, []);

    return [...cqRows, ...cpsRows];
  }

  /**
   * Checks for orphaned community content (questions/plant shares without valid user references)
   */
  private async checkOrphanedCommunityContent(userId: string, result: IntegrityCheckResult): Promise<void> {
    try {
  // Get community content using the unified helper
  // Only fetch for user if userId is provided, otherwise fetch all
  const communityContent = await this.fetchCommunityRows(['id', 'user_id', 'image_url'] as const, userId || undefined);

      if (communityContent.length > 0) {
        // Extract unique user IDs and validate them
        const uniqueUserIds = [...new Set(communityContent
          .map(content => content.user_id)
          .filter((userId): userId is string => typeof userId === 'string' && userId.length > 0))];

        // Batch fetch all profiles for these user IDs
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id')
          .in('id', uniqueUserIds);

        if (profilesError) throw profilesError;

        // Create a Set of existing profile IDs for O(1) lookup
        const existingProfileIds = new Set((profiles || []).map(profile => profile.id));

        // Identify orphaned content by checking which user IDs don't have profiles
        for (const content of communityContent) {
          if (!existingProfileIds.has(content.user_id)) {
            // Determine if it's a question or plant share by checking which table it came from
            const isQuestion = await this.isContentFromQuestions(content.id as string);
            if (isQuestion) {
              result.orphanedQuestions.push(content.id as string);
            } else {
              result.orphanedPlantShares.push(content.id as string);
            }
            logger.warn(`[DataIntegrity] Found orphaned community content: ${content.id} (user: ${content.user_id})`);
          }
        }
      }

      // Note: Local WatermelonDB community content checks removed as offline capabilities 
      // have been completely removed from the app. Only Supabase integrity checks remain.
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      result.errors.push(`Orphaned content check failed: ${errorMessage}`);
      logger.error('[DataIntegrity] Orphaned content check error:', error);
    }
  }

  /**
   * Helper method to determine if content ID belongs to questions table
   */
  private async isContentFromQuestions(contentId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('community_questions')
        .select('id')
        .eq('id', contentId)
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  }

  /**
   * Checks for broken image URLs in community content
   */
  private async checkBrokenImageUrls(userId: string, result: IntegrityCheckResult): Promise<void> {
    try {
      // Get community content with image URLs
  // Only fetch for user if userId is provided, otherwise fetch all
  const communityContent = await this.fetchCommunityRows(['id', 'image_url'] as const, userId);

      for (const content of communityContent) {
        if (content.image_url && this.isLikelyBrokenImageUrl(content.image_url as string)) {
          result.brokenImageUrls.push(content.id as string);
          logger.warn(`[DataIntegrity] Found broken image URL in content: ${content.id}`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      result.errors.push(`Broken image URLs check failed: ${errorMessage}`);
      logger.error('[DataIntegrity] Broken image URLs check error:', error);
    }
  }

  /**
   * Checks for missing references between related records
   */
  private async checkMissingReferences(userId: string, result: IntegrityCheckResult): Promise<void> {
    /**
     * DEPRECATION NOTICE: The legacy `posts` table is no longer used for reference checks.
     * This method now only checks references in `community_questions`, `community_plant_shares`, and `comments`.
     * If you find any logic referencing `posts`, please remove it immediately.
     */
    try {
      // Check plant shares with missing plant references (still relevant in new schema)
      const { data: plantShares, error: plantSharesError } = await supabase
        .from('community_plant_shares')
        .select('id, plant_id')
        .eq('user_id', userId)
        .not('plant_id', 'is', null);

      if (plantSharesError) throw plantSharesError;

      if (plantShares) {
        for (const plantShare of plantShares) {
          if (plantShare.plant_id) {
            const { data: _plant, error: plantError } = await supabase
              .from('plants')
              .select('id')
              .eq('id', plantShare.plant_id)
              .single();

            // PGRST116 = no rows found
            if (plantError && plantError.code === 'PGRST116') {
              result.missingReferences.push(`Plant share ${plantShare.id} references missing plant ${plantShare.plant_id}`);
            }
          }
        }
      }

      // Check comments with missing question/plant share references
      const { data: comments, error: commentsError } = await supabase
        .from('comments')
        .select('id, question_id, plant_share_id')
        .eq('user_id', userId);

      if (commentsError) throw commentsError;

      if (comments) {
        for (const comment of comments) {
          // Check reference to community_questions
          if (comment.question_id) {
            const { data: _question, error: questionError } = await supabase
              .from('community_questions')
              .select('id')
              .eq('id', comment.question_id)
              .single();

            if (questionError && questionError.code === 'PGRST116') {
              result.missingReferences.push(`Comment ${comment.id} references missing question ${comment.question_id}`);
            }
          }

          // Check reference to community_plant_shares
          if (comment.plant_share_id) {
            const { data: _plantShare, error: plantShareError } = await supabase
              .from('community_plant_shares')
              .select('id')
              .eq('id', comment.plant_share_id)
              .single();

            if (plantShareError && plantShareError.code === 'PGRST116') {
              result.missingReferences.push(`Comment ${comment.id} references missing plant share ${comment.plant_share_id}`);
            }
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      result.errors.push(`Missing references check failed: ${errorMessage}`);
      logger.error('[DataIntegrity] Missing references check error:', error);
    }
  }

  /**
   * Attempts to fix identified integrity issues
   */
  private async fixIdentifiedIssues(result: IntegrityCheckResult): Promise<void> {
    let fixedCount = 0;

    // Fix orphaned questions
    for (const questionId of result.orphanedQuestions) {
      try {
        await this.safeDeleteQuestion(questionId);
        fixedCount++;
        logger.log(`[DataIntegrity] Fixed orphaned question: ${questionId}`);
      } catch (error) {
        result.errors.push(`Failed to fix orphaned question ${questionId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Fix orphaned plant shares
    for (const plantShareId of result.orphanedPlantShares) {
      try {
        await this.safeDeletePlantShare(plantShareId);
        fixedCount++;
        logger.log(`[DataIntegrity] Fixed orphaned plant share: ${plantShareId}`);
      } catch (error) {
        result.errors.push(`Failed to fix orphaned plant share ${plantShareId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Fix content with broken image URLs by clearing the image_url
    for (const contentId of result.brokenImageUrls) {
      try {
        const isQuestion = await this.isContentFromQuestions(contentId);
        
        if (isQuestion) {
          await supabase
            .from('community_questions')
            .update({ image_url: null })
            .eq('id', contentId);
        } else {
          await supabase
            .from('community_plant_shares')
            .update({ images_urls: null })
            .eq('id', contentId);
        }
        
        // Note: Local database update removed - community content is Supabase-only

        fixedCount++;
        logger.log(`[DataIntegrity] Fixed broken image URL in ${isQuestion ? 'question' : 'plant share'}: ${contentId}`);
      } catch (error) {
        result.errors.push(`Failed to fix broken image in content ${contentId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    result.fixedCount = fixedCount;
  }

  /**
   * Safely deletes a question and its associated data
   */
  async safeDeleteQuestion(questionId: string): Promise<void> {
    try {
      // Get question data before deletion for cleanup
      const { data: question, error: fetchError } = await supabase
        .from('community_questions')
        .select('image_url, user_id')
        .eq('id', questionId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      // Delete associated answers (community_question_answers)
      await supabase
        .from('community_question_answers')
        .delete()
        .eq('question_id', questionId);

      // Delete associated comments
      await supabase
        .from('comments')
        .delete()
        .eq('question_id', questionId);

      // Delete associated likes
      await supabase
        .from('likes')
        .delete()
        .eq('question_id', questionId);

      // Delete the question
      await supabase
        .from('community_questions')
        .delete()
        .eq('id', questionId);

      // Clean up storage if image exists
      if (question?.image_url && question.user_id) {
        const filePath = extractFilePathFromUrl(question.image_url, question.user_id);
        if (filePath) {
          await deleteImage('community-questions', filePath);
        }
      }

      // Note: Local database operations removed - community content is Supabase-only

      logger.log(`[DataIntegrity] Successfully deleted orphaned question: ${questionId}`);
    } catch (error) {
      logger.error(`[DataIntegrity] Failed to safely delete question ${questionId}:`, error);
      throw error;
    }
  }

  /**
   * Safely deletes a plant share and its associated data
   */
  async safeDeletePlantShare(plantShareId: string): Promise<void> {
    try {
      // Get plant share data before deletion for cleanup
      const { data: plantShare, error: fetchError } = await supabase
        .from('community_plant_shares')
        .select('images_urls, user_id')
        .eq('id', plantShareId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      // Delete associated plant share comments (community_plant_share_comments)
      await supabase
        .from('community_plant_share_comments')
        .delete()
        .eq('plant_share_id', plantShareId);

      // Delete associated comments
      await supabase
        .from('comments')
        .delete()
        .eq('plant_share_id', plantShareId);

      // Delete associated likes
      await supabase
        .from('likes')
        .delete()
        .eq('plant_share_id', plantShareId);

      // Delete the plant share
      await supabase
        .from('community_plant_shares')
        .delete()
        .eq('id', plantShareId);

      // Clean up storage if images exist
      if (plantShare?.images_urls && plantShare.user_id && Array.isArray(plantShare.images_urls)) {
        for (const imageUrl of plantShare.images_urls) {
          if (imageUrl) {
            const filePath = extractFilePathFromUrl(imageUrl, plantShare.user_id);
            if (filePath) {
              await deleteImage('community-plant-shares', filePath);
            }
          }
        }
      }

      // Note: Local database operations removed - community content is Supabase-only

      logger.log(`[DataIntegrity] Successfully deleted orphaned plant share: ${plantShareId}`);
    } catch (error) {
      logger.error(`[DataIntegrity] Failed to safely delete plant share ${plantShareId}:`, error);
      throw error;
    }
  }

  /**
   * Validates individual record before sync
   */
  private async validateRecord(record: SyncRecord, tableName: string, result: SyncValidationResult): Promise<void> {
    // Check for required fields
    if (!record.id || typeof record.id !== 'string') {
      result.errors.push(`${tableName}: Record missing valid ID`);
      return;
    }

    // Table-specific validation
    switch (tableName) {
      case 'community_questions':
        await this.validateQuestionRecord(record, result);
        break;
      case 'community_plant_shares':
        await this.validatePlantShareRecord(record, result);
        break;
      case 'comments':
        await this.validateCommentRecord(record, result);
        break;
      case 'plants':
        await this.validatePlantRecord(record, result);
        break;
      // Add more table validations as needed
    }
  }

  /**
   * Validates question record
   */
  private async validateQuestionRecord(record: SyncRecord, result: SyncValidationResult): Promise<void> {
    if (!record.user_id) {
      result.errors.push(`Question ${record.id}: Missing user_id`);
    }

    const content = (record as { content?: string }).content;
    if (!content || content.trim().length === 0) {
      result.warnings.push(`Question ${record.id}: Empty content`);
    }

    const title = (record as { title?: string }).title;
    if (!title || title.trim().length === 0) {
      result.errors.push(`Question ${record.id}: Missing title`);
    }
  }

  /**
   * Validates plant share record
   */
  private async validatePlantShareRecord(record: SyncRecord, result: SyncValidationResult): Promise<void> {
    if (!record.user_id) {
      result.errors.push(`Plant share ${record.id}: Missing user_id`);
    }

    const content = (record as { content?: string }).content;
    if (!content || content.trim().length === 0) {
      result.warnings.push(`Plant share ${record.id}: Empty content`);
    }
  }

  /**
   * Validates comment record
   */
  private async validateCommentRecord(record: SyncRecord, result: SyncValidationResult): Promise<void> {
    if (!record.user_id) {
      result.errors.push(`Comment ${record.id}: Missing user_id`);
    }

    const commentRecord = record as _CommentRecord;
    if (!commentRecord.question_id && !commentRecord.plant_share_id) {
      result.errors.push(`Comment ${record.id}: Missing question_id or plant_share_id reference`);
    }

    const content = (record as { content?: string }).content;
    if (!content || content.trim().length === 0) {
      result.warnings.push(`Comment ${record.id}: Empty content`);
    }
  }

  /**
   * Validates plant record
   */
  private async validatePlantRecord(record: SyncRecord, result: SyncValidationResult): Promise<void> {
    if (!record.user_id) {
      result.errors.push(`Plant ${record.id}: Missing user_id`);
    }

    const name = (record as { name?: string }).name;
    if (!name || name.trim().length === 0) {
      result.errors.push(`Plant ${record.id}: Missing name`);
    }
  }

  /**
   * Checks if an image URL is likely broken
   */
  public isLikelyBrokenImageUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return true;

    // Check for common broken URL patterns
    const brokenPatterns = [
      /^null$/,
      /^undefined$/,
      /^""$/,
      /^''$/,
      /placeholder/i,
      /example\.com/i,
      /localhost:\d+/,
      /127\.0\.0\.1/,
      /blob:/,
      /^data:image\//,
      /\/storage\/v1\/object\/.*\/undefined/,
      /\/storage\/v1\/object\/.*\/null/,
    ];

    return brokenPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Validates URL format for images
   */
  public isValidImageUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;

    try {
      const parsedUrl = new URL(url);
      
      // Check if it's a valid Supabase storage URL
      const isSupabaseStorage = parsedUrl.hostname.includes('supabase') && 
                              parsedUrl.pathname.includes('/storage/v1/object/');

      // Check for valid image extensions
      const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
      const hasValidExtension = validExtensions.some(ext => 
        parsedUrl.pathname.toLowerCase().includes(ext)
      );

      return isSupabaseStorage && hasValidExtension;
    } catch {
      return false;
    }
  }

  /**
   * Cleans up orphaned storage assets
   */
  async cleanupOrphanedStorageAssets(userId: string): Promise<number> {
    let cleanedCount = 0;

    try {
      // Get all image URLs from community content
  // Only fetch for user if userId is provided, otherwise fetch all
  const communityContent = await this.fetchCommunityRows(['image_url'] as const, userId);
      const usedImageUrls = new Set(
        communityContent
          .map(c => c.image_url)
          .filter((url): url is string => typeof url === 'string' && url.length > 0)
      );

      // Also get plant share images (which use images_urls array)
      const { data: plantShares, error: plantSharesError } = await supabase
        .from('community_plant_shares')
        .select('images_urls')
        .eq('user_id', userId)
        .not('images_urls', 'is', null);

      if (!plantSharesError && plantShares) {
        for (const plantShare of plantShares) {
          if (Array.isArray(plantShare.images_urls)) {
            for (const imageUrl of plantShare.images_urls) {
              if (imageUrl) {
                usedImageUrls.add(imageUrl);
              }
            }
          }
        }
      }

      // List all storage objects for this user
      const buckets: StorageBucket[] = ['community-plant-shares', 'community-questions'];
      
      for (const bucket of buckets) {
        const { data: objects, error: listError } = await supabase.storage
          .from(bucket)
          .list(userId);

        if (listError) {
          logger.warn(`[DataIntegrity] Failed to list objects in ${bucket}:`, listError);
          continue;
        }

        if (objects) {
          for (const obj of objects) {
            const fullPath = `${userId}/${obj.name}`;
            const { data } = supabase.storage.from(bucket).getPublicUrl(fullPath);
            
            if (!usedImageUrls.has(data.publicUrl)) {
              // This storage object is orphaned
              const deleted = await deleteImage(bucket, fullPath);
              if (deleted) {
                cleanedCount++;
                logger.log(`[DataIntegrity] Cleaned up orphaned storage asset: ${fullPath}`);
              }
            }
          }
        }
      }
    } catch (error) {
      logger.error('[DataIntegrity] Failed to cleanup orphaned storage assets:', error);
    }

    return cleanedCount;
  }

  /**
   * @deprecated Community offline capabilities have been removed
   * This method is now a no-op and returns empty results
   */
  async cleanupOrphanedLocalRecords(_userId: string): Promise<{ cleaned: number; errors: string[] }> {
    logger.log('[DataIntegrity] Community offline capabilities removed - no local records to clean up');
    return { cleaned: 0, errors: [] };
  }
}
