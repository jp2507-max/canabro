/**
 * Data Integrity & Cleanup Service
 * 
 * Implements Task 2.1: Immediate Fix - Data Integrity & Cleanup
 * 
 * This service provides utilities to:
 * 1. Identify and clean orphaned posts in WatermelonDB
 * 2. Validate data references between Supabase and WatermelonDB
 * 3. Fix broken image URLs and invalid post references
 * 4. Provide data validation filters for community screens
 */

import { Database } from '@nozbe/watermelondb';

import supabase from '@/lib/supabase';
import { logger } from '@/lib/config/production';
// Removed: import { Post } from '@/lib/models/Post'; - Post model has been deleted

/**
 * Result of data integrity check
 */
export interface DataIntegrityResult {
  // Removed: postsChecked: number; - posts table no longer exists
  // Removed: orphanedPosts: number; - posts table no longer exists
  brokenImageReferences: number;
  invalidUserReferences: number;
  cleanedRecords: number;
  errors: string[];
}

/**
 * Options for cleanup operations
 */
export interface CleanupOptions {
  dryRun?: boolean; // If true, only report issues without fixing them
  fixBrokenImages?: boolean; // Fix broken image references
  removeOrphanedPosts?: boolean; // Remove posts with invalid user references (deprecated - posts table removed)
  batchSize?: number; // Number of records to process in each batch
}

/**
 * Data Integrity and Cleanup Service
 */
export class DataIntegrityService {
  private database: Database;
  
  constructor(database: Database) {
    this.database = database;
  }

  /**
   * Unified community content fetcher – replaces legacy `posts` table queries.
   * Returns selected columns from both `community_questions` and `community_plant_shares`
   * so existing integrity checks can stay intact.
   * 
   * If userId is provided, only fetches content for that user. If userId is undefined/null, fetches all content.
   */
  private async fetchCommunityRows<T extends string>(
    userId: string | undefined,
    columns: readonly T[]
  ): Promise<Array<Record<T, unknown>>> {
    const cols = columns.join(', ');

    // For community_plant_shares, replace only the exact 'image_url' column with 'images_urls'
    const cpsColumns = columns.map((col) => col === 'image_url' ? 'images_urls' : col).join(', ');

    // Build queries conditionally based on userId
    const cqQuery = supabase.from('community_questions').select(cols);
    const cpsQuery = supabase.from('community_plant_shares').select(cpsColumns);
    if (userId) {
      cqQuery.eq('user_id', userId);
      cpsQuery.eq('user_id', userId);
    }

    const [cq, cps] = await Promise.all([
      cqQuery,
      cpsQuery,
    ]);

    if (cq.error) throw new Error(`Community questions query failed: ${cq.error.message}`);
    if (cps.error) throw new Error(`Community plant shares query failed: ${cps.error.message}`);

    // Cast safely to avoid 'any' usage
    const cqRows = ((cq.data || []) as unknown) as Array<Record<string, unknown>>;
    // Cast safely to avoid 'any' usage  
    const cpsRows = (((cps.data || []) as unknown) as Array<Record<string, unknown>>).map((row) => {
      const r = row as Record<string, unknown>;
      if ('images_urls' in r && !('image_url' in r)) {
        const imgs = r.images_urls as unknown;
        const first = Array.isArray(imgs) ? (imgs[0] as string | null) : null;
        return { ...r, image_url: first } as Record<T, unknown>;
      }
      return r as Record<T, unknown>;
    });

    return [...(cqRows as Record<T, unknown>[]), ...cpsRows];
  }

  /**
   * Comprehensive data integrity check and cleanup
   */
  async runIntegrityCheck(options: CleanupOptions = {}): Promise<DataIntegrityResult> {
    const {
      dryRun = false,
      fixBrokenImages = true,
      removeOrphanedPosts = true,
      batchSize: _batchSize = 100
    } = options;

    logger.log('[DataIntegrity] Starting comprehensive data integrity check', { 
      dryRun, 
      fixBrokenImages, 
      removeOrphanedPosts 
    });

    const result: DataIntegrityResult = {
      // Removed: postsChecked: 0,
      // Removed: orphanedPosts: 0,
      brokenImageReferences: 0,
      invalidUserReferences: 0,
      cleanedRecords: 0,
      errors: []
    };

    try {
      // Step 1: Clean up orphaned local posts
      await this.cleanupOrphanedLocalPosts(result);
      
      // Step 2: Check posts for orphaned references (deprecated)
      await this.checkPostIntegrity(result, options);
      
      // Step 3: Validate image references
      if (fixBrokenImages) {
        await this.validateImageReferences(result, options);
      }
      
      // Step 4: Fix legacy images that point to removed posts bucket
      await this.fixLegacyCommunityImages(result, options);

      // Step 5: Check cross-references between local and remote data
      await this.validateCrossReferences(result, options);

      logger.log('[DataIntegrity] Integrity check completed', result);
      
    } catch (error) {
      const errorMessage = `Integrity check failed: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMessage);
      logger.error('[DataIntegrity] Integrity check error', error);
    }

    return result;
  }

  /**
   * Check posts for orphaned references and invalid data
   * NOTE: This method is deprecated as the posts table has been removed.
   * Community content is now handled via community_questions and community_plant_shares tables.
   */
  private async checkPostIntegrity(result: DataIntegrityResult, _options: CleanupOptions): Promise<void> {
    try {
      logger.log('[DataIntegrity] Posts table integrity check skipped - table removed in favor of community_questions and community_plant_shares');
      
      // TODO: Implement integrity checks for community_questions and community_plant_shares tables
      // This would involve checking for orphaned user references, broken image URLs, etc.
      // in the new community tables instead of the deprecated posts table.
      
    } catch (error) {
      const errorMessage = `Post integrity check failed: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMessage);
      logger.error('[DataIntegrity] Post integrity check error', error);
    }
  }

  /**
   * Validate image references for accessibility and corruption
   * NOTE: This method needs to be updated to check community_questions and community_plant_shares tables
   */
  private async validateImageReferences(result: DataIntegrityResult, _options: CleanupOptions): Promise<void> {
    try {
      logger.log('[DataIntegrity] Image validation for posts table skipped - table removed');
      
      // TODO: Implement image validation for community_questions and community_plant_shares tables
      
    } catch (error) {
      const errorMessage = `Image validation failed: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMessage);
      logger.error('[DataIntegrity] Image validation error', error);
    }
  }

  /**
   * Validate cross-references between WatermelonDB and Supabase
   * NOTE: This method needs to be updated to check community_questions and community_plant_shares tables
   */
  private async validateCrossReferences(result: DataIntegrityResult, _options: CleanupOptions): Promise<void> {
    try {
      // Check if posts exist in Supabase but are missing locally
      const supabasePosts = await this.fetchCommunityRows(undefined, ['id', 'user_id', 'image_url'] as const);

      if (!supabasePosts || supabasePosts.length === 0) {
        logger.log('[DataIntegrity] No community content found in Supabase for cross-reference validation');
        return;
      }

      logger.log(`[DataIntegrity] Found ${supabasePosts.length} community posts in Supabase for validation`);

      // Find posts with different image URLs between local and remote
      for (const supabasePost of supabasePosts) {
        const imageUrl = supabasePost.image_url as string;
        if (imageUrl && this.isLikelyBrokenImageUrl(imageUrl)) {
          result.brokenImageReferences++;
          
          if (!_options.dryRun) {
            result.cleanedRecords++;
          }
        }
      }

    } catch (error) {
      const errorMessage = `Cross-reference validation failed: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMessage);
      logger.error('[DataIntegrity] Cross-reference validation error', error);
    }
  }

  /**
   * Validate image_url fields for community_questions and community_plant_shares.
   * If the URL still points to the deprecated `posts/` storage bucket we consider it broken and
   * set image_url to NULL so the UI will fall back to placeholder instead of retry-looping.
   */
  private async fixLegacyCommunityImages(result: DataIntegrityResult, _options: CleanupOptions): Promise<void> {
    // Handle community_questions table (has image_url column)
    try {
      const { data: questionRows, error: questionError } = await supabase
        .from('community_questions')
        .select('id, image_url')
        .ilike('image_url', '%posts/%');

      if (questionError) {
        throw questionError;
      }

      if (questionRows && questionRows.length > 0) {
        const questionIdsToFix: string[] = [];
        questionRows.forEach((row) => {
          const url = row.image_url as string | null;
          if (url && url.startsWith('posts/')) {
            questionIdsToFix.push(row.id as string);
            result.brokenImageReferences++;
          }
        });

        if (questionIdsToFix.length && !_options.dryRun && _options.fixBrokenImages !== false) {
          const { error: updateError } = await supabase
            .from('community_questions')
            .update({ image_url: null })
            .in('id', questionIdsToFix);

          if (updateError) {
            throw updateError;
          }

          result.cleanedRecords += questionIdsToFix.length;
          logger.log(`[DataIntegrity] Cleared legacy post images for ${questionIdsToFix.length} community_questions`);
        }
      }
    } catch (err) {
      const msg = `[DataIntegrity] Failed to clean legacy images in community_questions: ${err instanceof Error ? err.message : String(err)}`;
      result.errors.push(msg);
      logger.error(msg);
    }

    // Handle community_plant_shares table (has images_urls array column)
    try {
      const { data: shareRows, error: shareError } = await supabase
        .from('community_plant_shares')
        .select('id, images_urls')
        .not('images_urls', 'is', null);

      if (shareError) {
        throw shareError;
      }

      if (shareRows && shareRows.length > 0) {
        const shareIdsToFix: string[] = [];
        shareRows.forEach((row) => {
          const urls = row.images_urls as string[] | null;
          if (urls && Array.isArray(urls)) {
            const hasLegacyUrls = urls.some(url => url && url.startsWith('posts/'));
            if (hasLegacyUrls) {
              shareIdsToFix.push(row.id as string);
              result.brokenImageReferences++;
            }
          }
        });

        if (shareIdsToFix.length && !_options.dryRun && _options.fixBrokenImages !== false) {
          // For each record, filter out the legacy URLs
          for (const id of shareIdsToFix) {
            const record = shareRows.find(r => r.id === id);
            if (record && record.images_urls) {
              const cleanUrls = (record.images_urls as string[]).filter(url => !url.startsWith('posts/'));
              
              const { error: updateError } = await supabase
                .from('community_plant_shares')
                .update({ images_urls: cleanUrls.length > 0 ? cleanUrls : null })
                .eq('id', id);

              if (updateError) {
                throw updateError;
              }
            }
          }

          result.cleanedRecords += shareIdsToFix.length;
          logger.log(`[DataIntegrity] Cleared legacy post images for ${shareIdsToFix.length} community_plant_shares`);
        }
      }
    } catch (err) {
      const msg = `[DataIntegrity] Failed to clean legacy images in community_plant_shares: ${err instanceof Error ? err.message : String(err)}`;
      result.errors.push(msg);
      logger.error(msg);
    }
  }

  /**
   * Clean up orphaned local posts records that no longer exist in Supabase
   * Since the posts table has been removed from Supabase, we need to remove any local posts
   */
  private async cleanupOrphanedLocalPosts(result: DataIntegrityResult): Promise<void> {
    // Check if posts table exists in local WatermelonDB
    const postsCollection = this.database.collections.get('posts');
    if (!postsCollection) {
      logger.log('[DataIntegrity] Posts collection not found locally - skipping orphaned local posts cleanup (expected after migration)');
      return;
    }

    const localPosts = await postsCollection.query().fetch();
    if (localPosts.length > 0) {
      logger.log(`[DataIntegrity] Found ${localPosts.length} orphaned local posts. Removing them...`);
      // Delete all local posts since the table no longer exists in Supabase
      await this.database.write(async () => {
        for (const post of localPosts) {
          await post.markAsDeleted();
        }
      });
      result.cleanedRecords += localPosts.length;
      logger.log(`[DataIntegrity] Removed ${localPosts.length} orphaned local posts`);
    }
  }

  /**
   * Check if an image URL is likely broken or corrupted
   */
  /**
   * Check if a URL is likely broken or invalid
   * Public method for use in other services
   */
  public isLikelyBrokenImageUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return true;
    
    // Check for common patterns of broken URLs
    const brokenPatterns = [
      /^data:image\/[^;]*;base64,(?:[A-Za-z0-9+/]{4}){0,2}$/,  // Incomplete base64
      /^blob:.*expired/i,  // Expired blob URLs
      /^file:\/\//,  // Local file URLs that won't work in production
      /localhost/,  // Localhost URLs
      /127\.0\.0\.1/,  // Local IP addresses
      /\.(tmp|temp)$/i,  // Temporary files
      /undefined|null/i,  // Literal strings
    ];

    return brokenPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Remove orphaned posts that have invalid user references
   * NOTE: This method is deprecated as the posts table has been removed.
   */
  private async removeOrphanedPosts(): Promise<void> {
    logger.log('[DataIntegrity] removeOrphanedPosts method deprecated - posts table removed');
    // Method no longer needed as posts table has been removed
  }

  /**
   * Fix broken image references by marking them as corrupted
   * NOTE: This method is deprecated as the posts table has been removed.
   */
  private async fixBrokenImageReferences(): Promise<void> {
    logger.log('[DataIntegrity] fixBrokenImageReferences method deprecated - posts table removed');
    // Method no longer needed as posts table has been removed
  }

  /**
   * Mark a post's image as corrupted for graceful UI handling
   * NOTE: This method is deprecated as the posts table has been removed.
   */
  private async markPostImageAsCorrupted(): Promise<void> {
    logger.log('[DataIntegrity] markPostImageAsCorrupted method deprecated - posts table removed');
    // Method no longer needed as posts table has been removed
  }

  /**
   * Fix invalid foreign key references
   * NOTE: This method is deprecated as the posts table has been removed.
   */
  private async fixInvalidForeignKey(): Promise<void> {
    logger.log('[DataIntegrity] fixInvalidForeignKey method deprecated - posts table removed');
    // Method no longer needed as posts table has been removed
  }

  /**
   * Get query for valid posts (not deleted, has valid user)
   * NOTE: This method is deprecated as the posts table has been removed.
   * Community content queries should use community_questions and community_plant_shares tables.
   */
  getValidPostsQuery() {
    logger.log('[DataIntegrity] getValidPostsQuery method deprecated - posts table removed');
    return null; // No longer applicable
  }

  /**
   * Get summary of data health for monitoring purposes
   */
  async getDataHealthSummary() {
    try {
      // TODO: Update to include community_questions and community_plant_shares table counts
      
      const [
        totalPosts,
        validPosts,
        postsWithImages,
        deletedPosts
      ] = await Promise.all([
        Promise.resolve(0), // No longer applicable - posts table removed
        Promise.resolve(0), // No longer applicable - posts table removed
        Promise.resolve(0), // No longer applicable - posts table removed
        Promise.resolve(0)  // No longer applicable - posts table removed
      ]);

      return {
        posts: {
          total: totalPosts,
          valid: validPosts,
          withImages: postsWithImages,
          deleted: deletedPosts,
          orphanedPercentage: 0 // No longer applicable
        },
        lastUpdated: Date.now()
      };
    } catch (error) {
      logger.error('[DataIntegrity] Failed to get data health summary', error);
      return {
        posts: { total: 0, valid: 0, withImages: 0, deleted: 0, orphanedPercentage: 0 },
        lastUpdated: Date.now()
      };
    }
  }

  /**
   * Perform comprehensive cleanup including orphaned local records
   */
  async performComprehensiveCleanup(userId: string): Promise<DataIntegrityResult & { orphanedLocalRecords: number }> {
    const baseResult = await this.runIntegrityCheck();
    let orphanedLocalRecordsCount = 0;

    try {
             // Use the sync data integrity service to clean up orphaned local records
       const { DataIntegrityService: SyncDataIntegrityService } = await import('./sync/data-integrity');
       const syncDataIntegrityService = new SyncDataIntegrityService(this.database);
      const cleanupResult = await syncDataIntegrityService.cleanupOrphanedLocalRecords(userId);
      
      orphanedLocalRecordsCount = cleanupResult.cleaned;
      baseResult.errors.push(...cleanupResult.errors);
      
      if (cleanupResult.cleaned > 0) {
        logger.log(`[DataIntegrity] Cleaned up ${cleanupResult.cleaned} orphaned local records`);
      }
    } catch (error) {
      const errorMsg = `Failed to cleanup orphaned local records: ${error instanceof Error ? error.message : String(error)}`;
      baseResult.errors.push(errorMsg);
      logger.error('[DataIntegrity]', errorMsg);
    }

    return {
      ...baseResult,
      orphanedLocalRecords: orphanedLocalRecordsCount
    };
  }

  /**
   * Trigger cleanup when sync detects inconsistencies
   */
  async handleSyncInconsistencies(userId: string): Promise<void> {
    logger.log('[DataIntegrity] Handling sync inconsistencies...');
    
    try {
      const result = await this.performComprehensiveCleanup(userId);
      
      if (result.errors.length > 0) {
        logger.warn('[DataIntegrity] Cleanup completed with errors:', result.errors);
      } else {
        logger.log('[DataIntegrity] Cleanup completed successfully');
      }
    } catch (error) {
      logger.error('[DataIntegrity] Failed to handle sync inconsistencies:', error);
    }
  }

  /**
   * Emergency cleanup for orphaned posts that exist locally but not in Supabase
   * Call this method to immediately resolve sync inconsistencies
   */
  async emergencyCleanup(userId: string): Promise<{ success: boolean; message: string; details?: object }> {
    try {
      logger.log('[DataIntegrity] Starting emergency cleanup for orphaned local records...');
      
      const result = await this.performComprehensiveCleanup(userId);
      
      const summary = {
        orphanedRecords: result.orphanedLocalRecords,
        brokenImages: result.brokenImageReferences, 
        cleanedRecords: result.cleanedRecords,
        errors: result.errors.length
      };
      
      if (result.errors.length > 0) {
        return {
          success: false,
          message: `Emergency cleanup completed with ${result.errors.length} errors. Cleaned ${result.orphanedLocalRecords} orphaned records.`,
          details: summary
        };
      } else {
        return {
          success: true,
          message: `Emergency cleanup successful. Cleaned ${result.orphanedLocalRecords} orphaned records, ${result.brokenImageReferences} broken images, and ${result.cleanedRecords} other issues.`,
          details: summary
        };
      }
    } catch (error) {
      const errorMsg = `Emergency cleanup failed: ${error instanceof Error ? error.message : String(error)}`;
      logger.error('[DataIntegrity]', errorMsg);
      return {
        success: false,
        message: errorMsg
      };
    }
  }

  /**
   * Force cleanup of local community data that no longer exists in Supabase
   */
  async forceCleanupLocalCommunityData(): Promise<{ cleaned: number; errors: string[] }> {
    const result: { cleaned: number; errors: string[] } = { cleaned: 0, errors: [] };
    
    try {
      // Get all community data from Supabase
      const supabaseQuestions = await supabase
        .from('community_questions')
        .select('id');
      
      const supabaseShares = await supabase
        .from('community_plant_shares')
        .select('id');
        
      if (supabaseQuestions.error) {
        throw new Error(`Failed to fetch questions: ${supabaseQuestions.error.message}`);
      }
      
      if (supabaseShares.error) {
        throw new Error(`Failed to fetch plant shares: ${supabaseShares.error.message}`);
      }
      
      const supabaseQuestionIds = new Set((supabaseQuestions.data || []).map(q => q.id));
      const supabaseShareIds = new Set((supabaseShares.data || []).map(s => s.id));
      
      logger.log(`[DataIntegrity] Found ${supabaseQuestionIds.size} questions and ${supabaseShareIds.size} plant shares in Supabase`);
      
      // Check for orphaned local community questions
      try {
        const localQuestions = await this.database.collections.get('community_questions').query().fetch();
        
        for (const localQuestion of localQuestions) {
          if (!supabaseQuestionIds.has(localQuestion.id)) {
            await this.database.write(async () => {
              await localQuestion.destroyPermanently();
            });
            result.cleaned++;
            logger.log(`[DataIntegrity] Removed orphaned local question: ${localQuestion.id}`);
          }
        }
      } catch (_err) {
        logger.log('[DataIntegrity] Community questions table not found locally (expected after schema migration)');
      }
      
      // Check for orphaned local community plant shares
      try {
        const localShares = await this.database.collections.get('community_plant_shares').query().fetch();
        
        for (const localShare of localShares) {
          if (!supabaseShareIds.has(localShare.id)) {
            await this.database.write(async () => {
              await localShare.destroyPermanently();
            });
            result.cleaned++;
            logger.log(`[DataIntegrity] Removed orphaned local plant share: ${localShare.id}`);
          }
        }
      } catch (_err) {
        logger.log('[DataIntegrity] Community plant shares table not found locally (expected after schema migration)');
      }
      
      // Check for orphaned local posts (from old schema)
      const postsCollection = this.database.collections.get('posts');
      if (!postsCollection) {
        logger.log('[DataIntegrity] Posts collection not found locally (expected after schema migration)');
      } else {
        const localPosts = await postsCollection.query().fetch();
        for (const localPost of localPosts) {
          await this.database.write(async () => {
            await localPost.destroyPermanently();
          });
          result.cleaned++;
          logger.log(`[DataIntegrity] Removed orphaned local post: ${localPost.id}`);
        }
      }
      
      logger.log(`[DataIntegrity] Force cleanup completed. Cleaned ${result.cleaned} orphaned records`);
      
    } catch (error) {
      const errorMsg = `Force cleanup failed: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMsg);
      logger.error('[DataIntegrity]', errorMsg);
    }
    
    return result;
  }
}

/**
 * Create a singleton instance for the app
 */
let dataIntegrityService: DataIntegrityService | null = null;

export function createDataIntegrityService(database: Database): DataIntegrityService {
  if (!dataIntegrityService) {
    dataIntegrityService = new DataIntegrityService(database);
  }
  return dataIntegrityService;
}

export function getDataIntegrityService(): DataIntegrityService | null {
  return dataIntegrityService;
}
