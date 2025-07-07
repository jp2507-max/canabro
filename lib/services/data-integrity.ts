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
import { Q } from '@nozbe/watermelondb';
import supabase from '@/lib/supabase';
import { logger } from '@/lib/config/production';
import { Post } from '@/lib/models/Post';

/**
 * Result of data integrity check
 */
export interface DataIntegrityResult {
  postsChecked: number;
  orphanedPosts: number;
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
  removeOrphanedPosts?: boolean; // Remove posts with invalid user references
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
      postsChecked: 0,
      orphanedPosts: 0,
      brokenImageReferences: 0,
      invalidUserReferences: 0,
      cleanedRecords: 0,
      errors: []
    };

    try {
      // Step 1: Check posts for orphaned references
      await this.checkPostIntegrity(result, options);
      
      // Step 2: Validate image references
      if (fixBrokenImages) {
        await this.validateImageReferences(result, options);
      }
      
      // Step 3: Check cross-references between local and remote data
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
   */
  private async checkPostIntegrity(result: DataIntegrityResult, options: CleanupOptions): Promise<void> {
    try {
      const postsCollection = this.database.get<Post>('posts');
      const posts = await postsCollection.query().fetch();
      
      result.postsChecked = posts.length;
      logger.log(`[DataIntegrity] Checking ${posts.length} posts for integrity issues`);

      const orphanedPosts: Post[] = [];
      const brokenImagePosts: Post[] = [];

      for (const post of posts) {
        // Check for missing or invalid user references
        if (!post.userId || typeof post.userId !== 'string' || post.userId.trim() === '') {
          orphanedPosts.push(post);
          result.orphanedPosts++;
          continue;
        }

        // Check for broken image references
        if (post.imageUrl && this.isLikelyBrokenImageUrl(post.imageUrl)) {
          brokenImagePosts.push(post);
          result.brokenImageReferences++;
        }

        // Check for invalid foreign key references
        if (post.plantId && post.plantId.trim() === '') {
          result.invalidUserReferences++;
          if (!options.dryRun) {
            await this.fixInvalidForeignKey(post, 'plantId');
            result.cleanedRecords++;
          }
        }
      }

      // Handle orphaned posts
      if (orphanedPosts.length > 0 && options.removeOrphanedPosts && !options.dryRun) {
        await this.removeOrphanedPosts(orphanedPosts);
        result.cleanedRecords += orphanedPosts.length;
        logger.log(`[DataIntegrity] Removed ${orphanedPosts.length} orphaned posts`);
      }

      // Handle broken image references
      if (brokenImagePosts.length > 0 && options.fixBrokenImages && !options.dryRun) {
        await this.fixBrokenImageReferences(brokenImagePosts);
        result.cleanedRecords += brokenImagePosts.length;
        logger.log(`[DataIntegrity] Fixed ${brokenImagePosts.length} broken image references`);
      }

    } catch (error) {
      const errorMessage = `Post integrity check failed: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMessage);
      logger.error('[DataIntegrity] Post integrity check error', error);
    }
  }

  /**
   * Validate image references for accessibility and corruption
   */
  private async validateImageReferences(result: DataIntegrityResult, _options: CleanupOptions): Promise<void> {
    try {
      const postsCollection = this.database.get<Post>('posts');
      const postsWithImages = await postsCollection.query(
        Q.where('image_url', Q.notEq(null))
      ).fetch();

      logger.log(`[DataIntegrity] Validating ${postsWithImages.length} image references`);

      for (const post of postsWithImages) {
        if (post.imageUrl && this.isLikelyBrokenImageUrl(post.imageUrl)) {
          result.brokenImageReferences++;
          
          if (!_options.dryRun) {
            await this.markPostImageAsCorrupted(post);
            result.cleanedRecords++;
          }
        }
      }

    } catch (error) {
      const errorMessage = `Image validation failed: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMessage);
      logger.error('[DataIntegrity] Image validation error', error);
    }
  }

  /**
   * Validate cross-references between WatermelonDB and Supabase
   */
  private async validateCrossReferences(result: DataIntegrityResult, _options: CleanupOptions): Promise<void> {
    try {
      // Check if posts exist in Supabase but are missing locally
      const { data: supabasePosts, error } = await supabase
        .from('posts')
        .select('id, user_id, image_url')
        .limit(1000); // Limit to prevent overwhelming the system

      if (error) {
        result.errors.push(`Supabase query error: ${error.message}`);
        return;
      }

      if (!supabasePosts || supabasePosts.length === 0) {
        logger.log('[DataIntegrity] No posts found in Supabase for cross-reference validation');
        return;
      }

      const postsCollection = this.database.get<Post>('posts');
      const localPosts = await postsCollection.query().fetch();
      const localPostIds = new Set(localPosts.map(p => p.postId));

      // Find posts that exist in Supabase but not locally
      const missingLocally = supabasePosts.filter(supabasePost => 
        !localPostIds.has(supabasePost.id)
      );

      if (missingLocally.length > 0) {
        logger.log(`[DataIntegrity] Found ${missingLocally.length} posts in Supabase that are missing locally`);
        // This indicates a sync issue - we'll let the sync process handle it
      }

      // Find posts with different image URLs between local and remote
      for (const supabasePost of supabasePosts) {
        const localPost = localPosts.find(p => p.postId === supabasePost.id);
        if (localPost && localPost.imageUrl !== supabasePost.image_url) {
          if (supabasePost.image_url && this.isLikelyBrokenImageUrl(supabasePost.image_url)) {
            result.brokenImageReferences++;
            
            if (!_options.dryRun) {
              await this.markPostImageAsCorrupted(localPost);
              result.cleanedRecords++;
            }
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
   */
  private async removeOrphanedPosts(orphanedPosts: Post[]): Promise<void> {
    if (orphanedPosts.length === 0) return;

    await this.database.write(async () => {
      for (const post of orphanedPosts) {
        try {
          await post.markAsDeleted();
          logger.log(`[DataIntegrity] Marked orphaned post ${post.id} as deleted`);
        } catch (error) {
          logger.error(`[DataIntegrity] Failed to delete orphaned post ${post.id}`, error);
        }
      }
    });
  }

  /**
   * Fix broken image references by marking them as corrupted
   */
  private async fixBrokenImageReferences(postsWithBrokenImages: Post[]): Promise<void> {
    if (postsWithBrokenImages.length === 0) return;

    await this.database.write(async () => {
      for (const post of postsWithBrokenImages) {
        try {
          await this.markPostImageAsCorrupted(post);
          logger.log(`[DataIntegrity] Fixed broken image reference for post ${post.id}`);
        } catch (error) {
          logger.error(`[DataIntegrity] Failed to fix broken image for post ${post.id}`, error);
        }
      }
    });
  }

  /**
   * Mark a post's image as corrupted for graceful UI handling
   */
  private async markPostImageAsCorrupted(post: Post): Promise<void> {
    await post.update((p: Post) => {
      // Clear the broken image URL and mark as corrupted
      p.imageUrl = undefined;
      // Add a flag to indicate the image was corrupted (if the field exists)
      // Note: This would require adding hasCorruptedImage field to Post model
    });
  }

  /**
   * Fix invalid foreign key references
   */
  private async fixInvalidForeignKey(record: Post, fieldName: keyof Post): Promise<void> {
    await record.update((r: Post) => {
      (r as unknown as Record<string, unknown>)[fieldName] = null; // Set invalid foreign keys to null
    });
  }

  /**
   * Get a filtered query that excludes posts with known integrity issues
   */
  getValidPostsQuery() {
    const postsCollection = this.database.get('posts');
    
    return postsCollection.query(
      // Exclude posts with missing user IDs
      Q.where('user_id', Q.notEq('')),
      Q.where('user_id', Q.notEq(null)),
      // Exclude posts marked as deleted
      Q.where('is_deleted', Q.oneOf([false]))
    );
  }

  /**
   * Get a quick health check of the database
   */
  async getDataHealthSummary() {
    try {
      const postsCollection = this.database.get('posts');
      
      const [
        totalPosts,
        postsWithUsers,
        postsWithImages,
        deletedPosts
      ] = await Promise.all([
        postsCollection.query().fetchCount(),
        postsCollection.query(
          Q.where('user_id', Q.notEq('')),
          Q.where('user_id', Q.notEq(null))
        ).fetchCount(),
        postsCollection.query(
          Q.where('image_url', Q.notEq(null))
        ).fetchCount(),
        postsCollection.query(
          Q.where('is_deleted', true)
        ).fetchCount()
      ]);

      return {
        totalPosts,
        validPosts: postsWithUsers,
        postsWithImages,
        deletedPosts,
        orphanedPosts: totalPosts - postsWithUsers,
        healthScore: totalPosts > 0 ? Math.round((postsWithUsers / totalPosts) * 100) : 100
      };
    } catch (error) {
      logger.error('[DataIntegrity] Health summary failed', error);
      return {
        totalPosts: 0,
        validPosts: 0,
        postsWithImages: 0,
        deletedPosts: 0,
        orphanedPosts: 0,
        healthScore: 0,
        error: error instanceof Error ? error.message : String(error)
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
