import supabase from '../supabase';
import { logger } from '../config/production';

interface StorageAsset {
  name: string;
  id?: string;
  bucket_id?: string;
  created_at?: string;
  updated_at?: string;
  last_accessed_at?: string;
  metadata?: Record<string, unknown>;
}

interface CleanupResult {
  deletedAssets: string[];
  errors: string[];
  totalSize: number;
}

interface DeletedAssetItem {
  name?: string;
  id?: string;
}

export class StorageCleanupService {
  private readonly BATCH_SIZE = 50;
  private readonly ORPHAN_AGE_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  /**
   * Clean up storage assets for a deleted post
   */
  async cleanupPostAssets(postId: string, userId: string): Promise<CleanupResult> {
    const result: CleanupResult = {
      deletedAssets: [],
      errors: [],
      totalSize: 0,
    };

    try {
      // Get all assets associated with this post
      const assets = await this.getPostAssets(postId, userId);
      
      if (assets.length === 0) {
        logger.log(`[Storage Cleanup] No assets found for post ${postId}`);
        return result;
      }

      logger.log(`[Storage Cleanup] Found ${assets.length} assets for post ${postId}`);

      // Delete assets using the new multi-bucket approach
      const batchResult = await this.deletePostAssets(assets);
      result.deletedAssets.push(...batchResult.deletedAssets);
      result.errors.push(...batchResult.errors);
      result.totalSize += batchResult.totalSize;

      logger.log(`[Storage Cleanup] Cleaned up ${result.deletedAssets.length} assets for post ${postId}`);
      
      if (result.errors.length > 0) {
        logger.warn(`[Storage Cleanup] ${result.errors.length} errors during cleanup:`, result.errors);
      }

    } catch (error) {
      const errorMessage = `Failed to cleanup assets for post ${postId}: ${error instanceof Error ? error.message : String(error)}`;
      logger.error(`[Storage Cleanup] ${errorMessage}`);
      result.errors.push(errorMessage);
    }

    return result;
  }

  /**
   * Find and clean up orphaned storage assets
   */
  async cleanupOrphanedAssets(userId: string): Promise<CleanupResult> {
    const result: CleanupResult = {
      deletedAssets: [],
      errors: [],
      totalSize: 0,
    };

    try {
      // Get all user's storage assets from all possible buckets
      const buckets = ['avatars', 'posts', 'journals', 'plants', 'community-questions', 'community-plant-shares'];
      const userAssets: StorageAsset[] = [];
      
      for (const bucket of buckets) {
        const { data: assets, error: listError } = await supabase.storage
          .from(bucket)
          .list(`${userId}/`, {
            limit: 1000,
            sortBy: { column: 'created_at', order: 'desc' }
          });

        if (listError) {
          logger.warn(`[Storage Cleanup] Failed to list assets from ${bucket}: ${listError.message}`);
          continue;
        }

        if (assets && assets.length > 0) {
          // Add bucket info to each asset for proper cleanup
          userAssets.push(...assets.map(asset => ({ ...asset, bucket_id: bucket })));
        }
      }

      if (!userAssets || userAssets.length === 0) {
        logger.log(`[Storage Cleanup] No assets found for user ${userId}`);
        return result;
      }

      logger.log(`[Storage Cleanup] Checking ${userAssets.length} assets for orphans`);

      // Check which assets are referenced in the database
      const referencedAssets = await this.getReferencedAssets(userId);
      const referencedPaths = new Set(referencedAssets.map(asset => asset.path));

      // Find orphaned assets (assets not referenced by any post)
      const orphanedAssets = userAssets.filter((asset: StorageAsset & { bucket_id?: string }) => {
        const assetPath = `${userId}/${asset.name}`;
        const isOrphaned = !referencedPaths.has(assetPath);
        const isOldEnough = this.isAssetOldEnough(asset, this.ORPHAN_AGE_THRESHOLD);
        return isOrphaned && isOldEnough;
      });

      if (orphanedAssets.length === 0) {
        logger.log(`[Storage Cleanup] No orphaned assets found for user ${userId}`);
        return result;
      }

      logger.log(`[Storage Cleanup] Found ${orphanedAssets.length} orphaned assets for user ${userId}`);

      // Delete orphaned assets in batches, grouped by bucket
      const assetsByBucket = this.groupAssetsByBucket(orphanedAssets as (StorageAsset & { bucket_id?: string })[]);
      
      for (const [bucket, assets] of Object.entries(assetsByBucket)) {
        const batches = this.createBatches(assets, this.BATCH_SIZE);
        
        for (const batch of batches) {
          const batchPaths = batch.map((asset: StorageAsset) => `${userId}/${asset.name}`);
          const batchResult = await this.deleteAssetPathsFromBucket(batchPaths, bucket);
          result.deletedAssets.push(...batchResult.deletedAssets);
          result.errors.push(...batchResult.errors);
          result.totalSize += batchResult.totalSize;
        }
      }

      logger.log(`[Storage Cleanup] Cleaned up ${result.deletedAssets.length} orphaned assets for user ${userId}`);

    } catch (error) {
      const errorMessage = `Failed to cleanup orphaned assets for user ${userId}: ${error instanceof Error ? error.message : String(error)}`;
      logger.error(`[Storage Cleanup] ${errorMessage}`);
      result.errors.push(errorMessage);
    }

    return result;
  }

  /**
   * Get storage assets associated with a specific post
   */
  private async getPostAssets(postId: string, userId: string): Promise<string[]> {
    try {
      // Query the database to find assets associated with this post
      const { data: postData, error } = await supabase
        .from('posts')
        .select('image_url, content')
        .eq('id', postId)
        .eq('user_id', userId)
        .single();

      if (error) {
        throw new Error(`Failed to get post data: ${error.message}`);
      }

      const assets: string[] = [];

      // Extract image URL if present
      if (postData.image_url && typeof postData.image_url === 'string') {
        const assetPath = this.extractAssetPath(postData.image_url);
        if (assetPath && this.validateUserAssetPath(assetPath, userId)) {
          assets.push(assetPath);
        }
      }

      // Extract any embedded images from content
      if (postData.content && typeof postData.content === 'string') {
        const embeddedAssets = this.extractEmbeddedAssets(postData.content, userId);
        assets.push(...embeddedAssets);
      }

      return assets;
    } catch (error) {
      logger.error(`[Storage Cleanup] Error getting post assets: ${error}`);
      return [];
    }
  }

  /**
   * Get all assets referenced in the database for a user
   */
  private async getReferencedAssets(userId: string): Promise<{ path: string; table: string; id: string }[]> {
    const referencedAssets: { path: string; table: string; id: string }[] = [];

    try {
      // Check posts table
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id, image_url, content')
        .eq('user_id', userId);

      if (postsError) {
        logger.warn(`[Storage Cleanup] Error querying posts: ${postsError.message}`);
      } else if (posts) {
        for (const post of posts) {
          if (post.image_url) {
            const assetPath = this.extractAssetPath(post.image_url);
            if (assetPath && this.validateUserAssetPath(assetPath, userId)) {
              referencedAssets.push({ path: assetPath, table: 'posts', id: post.id });
            }
          }
          
          if (post.content) {
            const embeddedAssets = this.extractEmbeddedAssets(post.content, userId);
            embeddedAssets.forEach(path => {
              referencedAssets.push({ path, table: 'posts', id: post.id });
            });
          }
        }
      }

      // Check journal_entries table
      const { data: entries, error: entriesError } = await supabase
        .from('journal_entries')
        .select('id, image_url')
        .eq('user_id', userId);

      if (entriesError) {
        logger.warn(`[Storage Cleanup] Error querying journal entries: ${entriesError.message}`);
      } else if (entries) {
        for (const entry of entries) {
          if (entry.image_url) {
            const assetPath = this.extractAssetPath(entry.image_url);
            if (assetPath && this.validateUserAssetPath(assetPath, userId)) {
              referencedAssets.push({ path: assetPath, table: 'journal_entries', id: entry.id });
            }
          }
        }
      }

      // Check profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, avatar_url')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        logger.warn(`[Storage Cleanup] Error querying profile: ${profileError.message}`);
      } else if (profile && profile.avatar_url) {
        const assetPath = this.extractAssetPath(profile.avatar_url);
        if (assetPath && this.validateUserAssetPath(assetPath, userId)) {
          referencedAssets.push({ path: assetPath, table: 'profiles', id: profile.id });
        }
      }

    } catch (error) {
      logger.error(`[Storage Cleanup] Error getting referenced assets: ${error}`);
    }

    return referencedAssets;
  }

  /**
   * Extract asset path from a Supabase storage URL
   */
  private extractAssetPath(url: string): string | null {
    if (!url || typeof url !== 'string') return null;

    try {
      // Handle Supabase storage URLs - match known storage buckets only
      const bucketPattern = '(?:avatars|posts|journals|plants|community-questions|community-plant-shares|plant-images)';
      const storageUrlPattern = new RegExp(`\\/storage\\/v1\\/object\\/public\\/${bucketPattern}\\/(.+)$`);
      const match = url.match(storageUrlPattern);
      
      if (match && match[1]) {
        return match[1];
      }

      // Handle direct paths
      if (url.includes('/') && !url.startsWith('http')) {
        return url;
      }

      return null;
    } catch (error) {
      logger.warn(`[Storage Cleanup] Error extracting asset path from URL: ${url}`, error);
      return null;
    }
  }

  /**
   * Extract embedded asset paths from content
   */
  private extractEmbeddedAssets(content: string, userId: string): string[] {
    const assets: string[] = [];
    
    try {
      // Look for Supabase storage URLs in content - match known storage buckets only
      const bucketPattern = '(?:avatars|posts|journals|plants|community-questions|community-plant-shares|plant-images)';
      const storageUrlPattern = new RegExp(`\\/storage\\/v1\\/object\\/public\\/${bucketPattern}\\/([^"'\\s]+)`, 'g');
      let match;
      
      while ((match = storageUrlPattern.exec(content)) !== null) {
        if (match[1] && this.validateUserAssetPath(match[1], userId)) {
          assets.push(match[1]);
        }
      }
    } catch (error) {
      logger.warn(`[Storage Cleanup] Error extracting embedded assets from content`, error);
    }

    return assets;
  }

  /**
   * Validate that an asset path belongs to the specified user
   */
  private validateUserAssetPath(assetPath: string, userId: string): boolean {
    if (!assetPath || !userId) {
      return false;
    }

    // Ensure the asset path starts with the user ID to prevent unauthorized access
    return assetPath.startsWith(`${userId}/`);
  }

  /**
   * Check if asset is old enough to be considered for cleanup
   */
  private isAssetOldEnough(asset: { created_at?: string; updated_at?: string }, threshold: number): boolean {
    try {
      const assetDate = new Date(asset.updated_at || asset.created_at || '');
      const now = new Date();
      return (now.getTime() - assetDate.getTime()) > threshold;
    } catch (error) {
      logger.warn(`[Storage Cleanup] Error checking asset age`, error);
      return false;
    }
  }

  /**
   * Create batches from an array
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Delete a batch of assets by their storage objects (legacy method)
   */
  private async deleteBatch(assets: StorageAsset[], userId: string): Promise<CleanupResult> {
    const paths = assets.map(asset => `${userId}/${asset.name}`);
    return this.deletePostAssets(paths);
  }

  /**
   * Delete assets by their paths (legacy method - tries to determine bucket)
   */
  private async deleteAssetPaths(paths: string[]): Promise<CleanupResult> {
    return this.deletePostAssets(paths);
  }

  /**
   * Determine which bucket an asset path belongs to based on the URL pattern
   */
  private determineBucketFromPath(assetPath: string): string {
    // First try to extract bucket from URL if it's a full URL
    if (assetPath.includes('/storage/v1/object/public/')) {
      const bucket = this.extractBucketFromUrl(assetPath);
      if (bucket) return bucket;
    }

    // Default bucket mapping based on common patterns
    if (assetPath.includes('/avatar/') || assetPath.includes('_avatar_')) {
      return 'avatars';
    }
    if (assetPath.includes('/post/') || assetPath.includes('_post_')) {
      return 'posts';
    }
    if (assetPath.includes('/journal/') || assetPath.includes('_journal_')) {
      return 'journals';
    }
    if (assetPath.includes('/plant/') || assetPath.includes('_plant_')) {
      return 'plants';
    }
    if (assetPath.includes('/question/') || assetPath.includes('_question_')) {
      return 'community-questions';
    }
    if (assetPath.includes('/share/') || assetPath.includes('_share_')) {
      return 'community-plant-shares';
    }
    
    // Default to posts bucket if pattern unclear
    return 'posts';
  }

  /**
   * Extract bucket name from a Supabase storage URL
   */
  private extractBucketFromUrl(url: string): string | null {
    if (!url || typeof url !== 'string') return null;

    try {
      const bucketPattern = '\\/storage\\/v1\\/object\\/public\\/([^/]+)\\/';
      const match = url.match(new RegExp(bucketPattern));
      
      if (match && match[1]) {
        return match[1];
      }

      return null;
    } catch (error) {
      logger.warn(`[Storage Cleanup] Error extracting bucket from URL: ${url}`, error);
      return null;
    }
  }

  /**
   * Clean up assets for a post by deleting from appropriate buckets
   */
  private async deletePostAssets(assetPaths: string[]): Promise<CleanupResult> {
    const result: CleanupResult = {
      deletedAssets: [],
      errors: [],
      totalSize: 0,
    };

    // Group assets by bucket
    const assetsByBucket: Record<string, string[]> = {};
    
    for (const assetPath of assetPaths) {
      const bucket = this.determineBucketFromPath(assetPath);
      if (!assetsByBucket[bucket]) {
        assetsByBucket[bucket] = [];
      }
      assetsByBucket[bucket].push(assetPath);
    }

    // Delete from each bucket
    for (const [bucket, paths] of Object.entries(assetsByBucket)) {
      const batchResult = await this.deleteAssetPathsFromBucket(paths, bucket);
      result.deletedAssets.push(...batchResult.deletedAssets);
      result.errors.push(...batchResult.errors);
      result.totalSize += batchResult.totalSize;
    }

    return result;
  }

  /**
   * Group assets by their bucket for efficient cleanup
   */
  private groupAssetsByBucket(assets: (StorageAsset & { bucket_id?: string })[]): Record<string, StorageAsset[]> {
    return assets.reduce((acc, asset) => {
      const bucket = asset.bucket_id || 'posts'; // Default to posts bucket
      if (!acc[bucket]) {
        acc[bucket] = [];
      }
      acc[bucket].push(asset);
      return acc;
    }, {} as Record<string, StorageAsset[]>);
  }

  /**
   * Delete assets from a specific bucket
   */
  private async deleteAssetPathsFromBucket(paths: string[], bucket: string): Promise<CleanupResult> {
    const result: CleanupResult = {
      deletedAssets: [],
      errors: [],
      totalSize: 0,
    };

    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .remove(paths);

      if (error) {
        result.errors.push(`Failed to delete assets from ${bucket}: ${error.message}`);
        return result;
      }

      if (data) {
        result.deletedAssets = data.map((item: DeletedAssetItem) => item.name || '').filter(Boolean);
        logger.log(`[Storage Cleanup] Successfully deleted ${result.deletedAssets.length} assets from ${bucket}`);
      }
    } catch (error) {
      const errorMessage = `Error deleting asset paths from ${bucket}: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMessage);
      logger.error(`[Storage Cleanup] ${errorMessage}`);
    }

    return result;
  }
}

// Singleton instance for global use
export const storageCleanupService = new StorageCleanupService();