/**
 * Data Integrity Service for Supabase-WatermelonDB Synchronization
 * Handles orphaned record detection, broken reference cleanup, and data validation
 */

import { Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import supabase from '../../supabase';
import { logger } from '../../config/production';
import { deleteImage, extractFilePathFromUrl, type StorageBucket } from '../../utils/upload-image';
import { Post } from '../../models/Post';
import { Profile } from '../../models/Profile';

interface SyncRecord {
  id: string;
  user_id?: string;
  [key: string]: unknown;
}

interface _PostRecord extends SyncRecord {
  post_id?: string;
  content?: string;
  image_url?: string | null;
  plant_id?: string | null;
}

interface _CommentRecord extends SyncRecord {
  post_id?: string;
  content?: string;
}

interface _PlantRecord extends SyncRecord {
  plant_id?: string;
  name?: string;
}

export interface IntegrityCheckResult {
  orphanedPosts: string[];
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
      orphanedPosts: [],
      brokenImageUrls: [],
      missingReferences: [],
      fixedCount: 0,
      errors: [],
    };

    try {
      logger.log('[DataIntegrity] Starting comprehensive integrity check...');

      // Check for orphaned posts
      await this.checkOrphanedPosts(userId, result);

      // Check for broken image URLs
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
   * Checks for orphaned posts (posts without valid user references)
   */
  private async checkOrphanedPosts(userId: string, result: IntegrityCheckResult): Promise<void> {
    try {
      // Check Supabase for orphaned posts using batch queries
      const { data: posts, error } = await supabase
        .from('posts')
        .select('id, user_id, image_url')
        .eq('user_id', userId);

      if (error) throw error;

      if (posts && posts.length > 0) {
        // Get all unique user IDs from posts
        const uniqueUserIds = [...new Set(posts.map(post => post.user_id))];

        // Batch fetch all profiles for these user IDs
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id')
          .in('id', uniqueUserIds);

        if (profilesError) throw profilesError;

        // Create a Set of existing profile IDs for O(1) lookup
        const existingProfileIds = new Set((profiles || []).map(profile => profile.id));

        // Identify orphaned posts by checking which user IDs don't have profiles
        for (const post of posts) {
          if (!existingProfileIds.has(post.user_id)) {
            result.orphanedPosts.push(post.id);
            logger.warn(`[DataIntegrity] Found orphaned post: ${post.id} (user: ${post.user_id})`);
          }
        }
      }

      // Check WatermelonDB for orphaned posts using batch queries
      const postsCollection = this.database.get('posts');
      const localPosts = await postsCollection.query().fetch();

      if (localPosts.length > 0) {
        // Get all unique user IDs from local posts
        const localUserIds = [...new Set(
          localPosts
            .map(post => (post as Post).userId)
            .filter(Boolean) as string[]
        )];

        if (localUserIds.length > 0) {
          // Batch fetch all local profiles for these user IDs
          const profilesCollection = this.database.get('profiles');
          const localProfiles = await profilesCollection
            .query(Q.where('user_id', Q.oneOf(localUserIds)))
            .fetch();

          // Create a Set of existing local profile user IDs for O(1) lookup
          const existingLocalProfileUserIds = new Set(
            localProfiles.map(profile => (profile as Profile).userId)
          );

          // Identify locally orphaned posts
          for (const post of localPosts) {
            const watermelonPost = post as Post;
            const postUserId = watermelonPost.userId;
            if (postUserId && !existingLocalProfileUserIds.has(postUserId)) {
              result.orphanedPosts.push(watermelonPost.id);
              logger.warn(`[DataIntegrity] Found locally orphaned post: ${watermelonPost.id}`);
            }
          }
        }
      }
    } catch (error) {
      result.errors.push(`Orphaned posts check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Checks for broken image URLs in posts
   */
  private async checkBrokenImageUrls(userId: string, result: IntegrityCheckResult): Promise<void> {
    try {
      // Check Supabase posts for broken images
      const { data: posts, error } = await supabase
        .from('posts')
        .select('id, image_url')
        .eq('user_id', userId)
        .not('image_url', 'is', null);

      if (error) throw error;

      if (posts) {
        for (const post of posts) {
          if (post.image_url && this.isLikelyBrokenImageUrl(post.image_url)) {
            result.brokenImageUrls.push(post.id);
            logger.warn(`[DataIntegrity] Found broken image URL in post: ${post.id}`);
          }
        }
      }

      // Check local WatermelonDB posts
      const postsCollection = this.database.get('posts');
      const localPosts = await postsCollection
        .query(Q.where('image_url', Q.notEq(null)))
        .fetch();

      for (const post of localPosts) {
        const watermelonPost = post as Post;
        const imageUrl = watermelonPost.imageUrl;
        if (imageUrl && this.isLikelyBrokenImageUrl(imageUrl)) {
          result.brokenImageUrls.push(watermelonPost.id);
          logger.warn(`[DataIntegrity] Found locally broken image URL in post: ${watermelonPost.id}`);
        }
      }
    } catch (error) {
      result.errors.push(`Broken image URLs check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Checks for missing references between related records
   */
  private async checkMissingReferences(userId: string, result: IntegrityCheckResult): Promise<void> {
    try {
      // Check posts with missing plant references
      const { data: posts, error } = await supabase
        .from('posts')
        .select('id, plant_id')
        .eq('user_id', userId)
        .not('plant_id', 'is', null);

      if (error) throw error;

      if (posts) {
        for (const post of posts) {
          if (post.plant_id) {
            const { data: _plant, error: plantError } = await supabase
              .from('plants')
              .select('id')
              .eq('id', post.plant_id)
              .single();

            if (plantError && plantError.code === 'PGRST116') {
              result.missingReferences.push(`Post ${post.id} references missing plant ${post.plant_id}`);
            }
          }
        }
      }

      // Check comments with missing post references
      const { data: comments, error: commentsError } = await supabase
        .from('comments')
        .select('id, post_id')
        .eq('user_id', userId);

      if (commentsError) throw commentsError;

      if (comments) {
        for (const comment of comments) {
          const { data: _post, error: postError } = await supabase
            .from('posts')
            .select('id')
            .eq('id', comment.post_id)
            .single();

          if (postError && postError.code === 'PGRST116') {
            result.missingReferences.push(`Comment ${comment.id} references missing post ${comment.post_id}`);
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

    // Fix orphaned posts by marking them as deleted
    for (const postId of result.orphanedPosts) {
      try {
        await this.safeDeletePost(postId);
        fixedCount++;
        logger.log(`[DataIntegrity] Fixed orphaned post: ${postId}`);
      } catch (error) {
        result.errors.push(`Failed to fix orphaned post ${postId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Fix posts with broken image URLs by clearing the image_url
    for (const postId of result.brokenImageUrls) {
      try {
        await supabase
          .from('posts')
          .update({ image_url: null })
          .eq('id', postId);
        
        // Also update local database
        const postsCollection = this.database.get('posts');
        await this.database.write(async () => {
          const posts = await postsCollection.query(Q.where('id', postId)).fetch();
          if (posts.length > 0) {
            const post = posts[0] as Post;
            await post.update((p) => {
              p.imageUrl = undefined;
            });
          }
        });

        fixedCount++;
        logger.log(`[DataIntegrity] Fixed broken image URL in post: ${postId}`);
      } catch (error) {
        result.errors.push(`Failed to fix broken image in post ${postId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    result.fixedCount = fixedCount;
  }

  /**
   * Safely deletes a post and its associated data
   */
  async safeDeletePost(postId: string): Promise<void> {
    try {
      // Get post data before deletion for cleanup
      const { data: post, error: fetchError } = await supabase
        .from('posts')
        .select('image_url, user_id')
        .eq('id', postId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      // Delete associated comments first
      await supabase
        .from('comments')
        .delete()
        .eq('post_id', postId);

      // Delete associated likes
      await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId);

      // Delete the post
      await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      // Clean up storage if image exists
      if (post?.image_url && post.user_id) {
        const filePath = extractFilePathFromUrl(post.image_url, post.user_id);
        if (filePath) {
          await deleteImage('community-plant-shares', filePath);
        }
      }

      // Mark as deleted in local database
      const postsCollection = this.database.get('posts');
      await this.database.write(async () => {
        const posts = await postsCollection.query(Q.where('id', postId)).fetch();
        if (posts.length > 0) {
          await posts[0]?.markAsDeleted();
        }
      });

      logger.log(`[DataIntegrity] Successfully deleted orphaned post: ${postId}`);
    } catch (error) {
      logger.error(`[DataIntegrity] Failed to safely delete post ${postId}:`, error);
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
      case 'posts':
        await this.validatePostRecord(record, result);
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
   * Validates post record
   */
  private async validatePostRecord(record: SyncRecord, result: SyncValidationResult): Promise<void> {
    if (!record.user_id) {
      result.errors.push(`Post ${record.id}: Missing user_id`);
    }

    const content = (record as { content?: string }).content;
    if (!content || content.trim().length === 0) {
      result.warnings.push(`Post ${record.id}: Empty content`);
    }

    const imageUrl = (record as { image_url?: string }).image_url;
    if (imageUrl && this.isLikelyBrokenImageUrl(imageUrl)) {
      result.fixableIssues.push(`Post ${record.id}: Broken image URL`);
    }

    // Validate foreign key references
    const plantId = (record as { plant_id?: string }).plant_id;
    if (plantId) {
      try {
        const { data: _plant, error } = await supabase
          .from('plants')
          .select('plant_id')
          .eq('plant_id', plantId)
          .single();

        if (error && error.code === 'PGRST116') {
          result.warnings.push(`Post ${record.id}: References non-existent plant ${plantId}`);
        }
      } catch (_error) {
        result.warnings.push(`Post ${record.id}: Could not validate plant reference`);
      }
    }
  }

  /**
   * Validates comment record
   */
  private async validateCommentRecord(record: SyncRecord, result: SyncValidationResult): Promise<void> {
    const postId = (record as { post_id?: string }).post_id;
    if (!postId) {
      result.errors.push(`Comment ${record.id}: Missing post_id`);
    }

    if (!record.user_id) {
      result.errors.push(`Comment ${record.id}: Missing user_id`);
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
      // Get all image URLs from posts
      const { data: posts, error } = await supabase
        .from('posts')
        .select('image_url')
        .eq('user_id', userId)
        .not('image_url', 'is', null);

      if (error) throw error;

      const usedImageUrls = new Set(posts?.map(p => p.image_url).filter(Boolean) || []);

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
   * Clean up orphaned local records that no longer exist in Supabase
   * This handles cases where records are deleted directly in Supabase
   */
  async cleanupOrphanedLocalRecords(userId: string): Promise<{ cleaned: number; errors: string[] }> {
    const result: { cleaned: number; errors: string[] } = { cleaned: 0, errors: [] };
    
    try {
             // Get all local posts  
       const postsCollection = this.database.get<Post>('posts');
       const localPosts = await postsCollection.query(
         Q.where('user_id', userId)
       ).fetch();

      if (localPosts.length === 0) {
        logger.log('[DataIntegrity] No local posts found for cleanup check');
        return result;
      }

      // Get all posts from Supabase for this user
      const { data: supabasePosts, error: fetchError } = await supabase
        .from('posts')
        .select('id')
        .eq('user_id', userId);

      if (fetchError) {
        result.errors.push(`Failed to fetch Supabase posts: ${fetchError.message}`);
        return result;
      }

      const supabasePostIds = new Set((supabasePosts || []).map(p => p.id));
      
      // Find local posts that no longer exist in Supabase
      const orphanedPosts = localPosts.filter(post => !supabasePostIds.has(post.id));
      
      if (orphanedPosts.length === 0) {
        logger.log('[DataIntegrity] No orphaned local posts found');
        return result;
      }

      logger.log(`[DataIntegrity] Found ${orphanedPosts.length} orphaned local posts to clean up`);

      // Clean up orphaned posts in batch
      await this.database.write(async () => {
        for (const post of orphanedPosts) {
          try {
            // Also clean up related comments and likes locally
            const commentsCollection = this.database.get('comments');
            const likesCollection = this.database.get('likes');
            
                         // Find and delete related comments
             const relatedComments = await commentsCollection.query(
               Q.where('post_id', post.postId)
             ).fetch();
             
             // Find and delete related likes
             const relatedLikes = await likesCollection.query(
               Q.where('post_id', post.postId)
             ).fetch();

            // Delete related records first
            for (const comment of relatedComments) {
              await comment.markAsDeleted();
            }
            for (const like of relatedLikes) {
              await like.markAsDeleted();
            }

            // Delete the post
            await post.markAsDeleted();
            result.cleaned++;
            
            logger.log(`[DataIntegrity] Cleaned up orphaned post ${post.id} and ${relatedComments.length} comments, ${relatedLikes.length} likes`);
          } catch (error) {
            const errorMsg = `Failed to clean up orphaned post ${post.id}: ${error instanceof Error ? error.message : String(error)}`;
            result.errors.push(errorMsg);
            logger.error('[DataIntegrity]', errorMsg);
          }
        }
      });

      logger.log(`[DataIntegrity] Cleanup completed: ${result.cleaned} posts cleaned, ${result.errors.length} errors`);
      
    } catch (error) {
      const errorMsg = `Orphaned records cleanup failed: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMsg);
      logger.error('[DataIntegrity] Cleanup error:', error);
    }

    return result;
  }
}
