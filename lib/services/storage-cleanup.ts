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
  // DRY: Centralized bucket list and pattern regex for Supabase storage buckets
  private static readonly BUCKETS = [
    'avatars',
    'posts',
    'journals',
    'plants',
    'community-questions',
    'community-plant-shares',
    'plant-images',
  ];
  private static readonly BUCKET_PATTERN = `(?:${StorageCleanupService.BUCKETS.join('|')})`;
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
      const userAssets: StorageAsset[] = [];
      for (const bucket of StorageCleanupService.BUCKETS) {
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

      logger.log(`[Storage Cleanup] Found ${referencedPaths.size} referenced asset paths for user ${userId}`);
      
      // Debug log first few referenced paths for troubleshooting
      if (referencedPaths.size > 0) {
        const samplePaths = Array.from(referencedPaths).slice(0, 3);
        logger.log(`[Storage Cleanup] Sample referenced paths: ${samplePaths.join(', ')}`);
      }

      // Find orphaned assets (assets not referenced by any post)
      const orphanedAssets = userAssets.filter((asset: StorageAsset & { bucket_id?: string }) => {
        // Validate asset name to prevent undefined/null paths
        if (!asset.name || typeof asset.name !== 'string') {
          logger.warn(`[Storage Cleanup] Asset with invalid name found in ${asset.bucket_id || 'unknown'} bucket:`, asset);
          return false;
        }

        const assetPath = this.normalizeAssetPath(`${userId}/${asset.name}`);
        const isOrphaned = !referencedPaths.has(assetPath);
        const isOldEnough = this.isAssetOldEnough(asset, this.ORPHAN_AGE_THRESHOLD);
        
        // Debug potential false positives
        if (isOrphaned && isOldEnough) {
          this.debugAssetPathComparison(assetPath, referencedPaths, userId);
          logger.log(`[Storage Cleanup] Asset marked as orphaned: ${assetPath}`);
        }
        
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
          // Filter out any assets with invalid names and construct valid paths
          const batchPaths = batch
            .filter((asset: StorageAsset) => asset.name && typeof asset.name === 'string')
            .map((asset: StorageAsset) => this.normalizeAssetPath(`${userId}/${asset.name}`));
          
          if (batchPaths.length > 0) {
            const batchResult = await this.deleteAssetPathsFromBucket(batchPaths, bucket);
            result.deletedAssets.push(...batchResult.deletedAssets);
            result.errors.push(...batchResult.errors);
            result.totalSize += batchResult.totalSize;
          }
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
      const assets: string[] = [];

      // Helper to process image url / content fields
      const processImageFields = (row: Record<string, unknown>) => {
        if (row.image_url && typeof row.image_url === 'string') {
          const assetPath = this.extractAssetPath(row.image_url);
          if (assetPath && this.validateUserAssetPath(assetPath, userId)) {
            assets.push(this.normalizeAssetPath(assetPath));
          }
        }
        if (row.images_urls && Array.isArray(row.images_urls)) {
          row.images_urls.forEach((url) => {
            if (typeof url === 'string') {
              const p = this.extractAssetPath(url);
              if (p && this.validateUserAssetPath(p, userId)) {
                assets.push(this.normalizeAssetPath(p));
              }
            }
          });
        }
        if (row.content && typeof row.content === 'string') {
          const embeddedAssets = this.extractEmbeddedAssets(row.content, userId);
          assets.push(...embeddedAssets.map((path) => this.normalizeAssetPath(path)));
        }
      };

      // Query community_questions
      const { data: question, error: qError } = await supabase
        .from('community_questions')
        .select('image_url, content')
        .eq('id', postId)
        .eq('user_id', userId)
        .maybeSingle();

      if (qError) throw new Error(`Failed to get question data: ${qError.message}`);
      if (question) processImageFields(question as Record<string, unknown>);

      // Query community_plant_shares
      const { data: plantShare, error: psError } = await supabase
        .from('community_plant_shares')
        .select('images_urls, content')
        .eq('id', postId)
        .eq('user_id', userId)
        .maybeSingle();

      if (psError) throw new Error(`Failed to get plant share data: ${psError.message}`);
      if (plantShare) processImageFields(plantShare as Record<string, unknown>);
 
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
      // Check community_questions table
      const { data: questions, error: qError } = await supabase
        .from('community_questions')
        .select('id, image_url, content')
        .eq('user_id', userId);

      if (qError) {
        logger.warn(`[Storage Cleanup] Error querying community_questions: ${qError.message}`);
      } else if (questions) {
        questions.forEach((q) => {
          if (q.image_url) {
            const assetPath = this.extractAssetPath(q.image_url);
            if (assetPath && this.validateUserAssetPath(assetPath, userId)) {
              referencedAssets.push({ path: this.normalizeAssetPath(assetPath), table: 'community_questions', id: q.id });
            }
          }
          if (q.content) {
            this.extractEmbeddedAssets(q.content, userId).forEach((p) => {
              referencedAssets.push({ path: this.normalizeAssetPath(p), table: 'community_questions', id: q.id });
            });
          }
        });
      }

      // Check community_plant_shares table
      const { data: plantShares, error: psError } = await supabase
        .from('community_plant_shares')
        .select('id, images_urls, content')
        .eq('user_id', userId);

      if (psError) {
        logger.warn(`[Storage Cleanup] Error querying community_plant_shares: ${psError.message}`);
      } else if (plantShares) {
        plantShares.forEach((ps) => {
          if (ps.images_urls && Array.isArray(ps.images_urls)) {
            ps.images_urls.forEach((url: string) => {
              const assetPath = this.extractAssetPath(url);
              if (assetPath && this.validateUserAssetPath(assetPath, userId)) {
                referencedAssets.push({ path: this.normalizeAssetPath(assetPath), table: 'community_plant_shares', id: ps.id });
              }
            });
          }
          if (ps.content) {
            this.extractEmbeddedAssets(ps.content, userId).forEach((p) => {
              referencedAssets.push({ path: this.normalizeAssetPath(p), table: 'community_plant_shares', id: ps.id });
            });
          }
        });
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
          const normalizedPath = this.normalizeAssetPath(assetPath);
          referencedAssets.push({ path: normalizedPath, table: 'profiles', id: profile.id });
        }
      }

    } catch (error) {
      logger.error(`[Storage Cleanup] Error getting referenced assets: ${error}`);
    }

    return referencedAssets;
  }

  /**
   * Normalize asset paths to ensure consistent comparison
   * This prevents path format mismatches that could cause valid assets to be marked as orphaned
   */
  private normalizeAssetPath(path: string): string {
    if (!path || typeof path !== 'string') {
      return '';
    }

    // Remove any leading/trailing whitespace
    let normalized = path.trim();
    
    // Remove any double slashes (except for protocol)
    normalized = normalized.replace(/([^:]\/)\/+/g, '$1');
    
    // Ensure consistent forward slashes
    normalized = normalized.replace(/\\/g, '/');
    
    // Remove trailing slash if present
    if (normalized.endsWith('/') && normalized.length > 1) {
      normalized = normalized.slice(0, -1);
    }
    
    return normalized;
  }

  /**
   * Extract asset path from a Supabase storage URL
   */
  private extractAssetPath(url: string): string | null {
    if (!url || typeof url !== 'string') return null;

    try {
      // Handle Supabase storage URLs - match known storage buckets only
          const storageUrlPattern = new RegExp(`\\/storage\\/v1\\/object\\/public\\/${StorageCleanupService.BUCKET_PATTERN}\\/(.+)$`);
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
  const storageUrlPattern = new RegExp(`\\/storage\\/v1\\/object\\/public\\/${StorageCleanupService.BUCKET_PATTERN}\\/([^"'\\s]+)`, 'g');
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
    if (!assetPath || !userId || typeof assetPath !== 'string' || typeof userId !== 'string') {
      return false;
    }

    // Normalize the path for consistent validation
    const normalizedPath = this.normalizeAssetPath(assetPath);
    
    // Ensure the asset path starts with the user ID to prevent unauthorized access
    const expectedPrefix = `${userId}/`;
    const pathStartsWithUserId = normalizedPath.startsWith(expectedPrefix);
    
    // Additional validation: ensure path doesn't contain suspicious patterns
    const hasValidStructure = !normalizedPath.includes('..') && // No directory traversal
                             !normalizedPath.includes('//') && // No double slashes (after normalization)
                             normalizedPath.length > expectedPrefix.length; // Has actual filename after userId
    
    return pathStartsWithUserId && hasValidStructure;
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
  private determineBucketFromPath(assetPath: string): string | null {
    // First try to extract bucket from URL if it's a full URL
    if (assetPath.includes('/storage/v1/object/public/')) {
      const bucket = this.extractBucketFromUrl(assetPath);
      if (bucket && StorageCleanupService.BUCKETS.includes(bucket)) return bucket;
    }

    // Default bucket mapping based on common patterns
    const bucketPatterns: [string, string[]][] = [
      ['avatars', ['/avatar/', '_avatar_']],
      ['posts', ['/post/', '_post_']],
      ['journals', ['/journal/', '_journal_']],
      ['plants', ['/plant/', '_plant_']],
      ['community-questions', ['/question/', '_question_']],
      ['community-plant-shares', ['/share/', '_share_']],
    ];
    for (const [bucket, patterns] of bucketPatterns) {
      if (patterns.some((p) => assetPath.includes(p))) {
        return bucket;
      }
    }
    // If we reach here, bucket is undetermined
    logger.warn(`[Storage Cleanup] Could not determine bucket for asset path: ${assetPath}`);
    return null;
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

    // Group assets by bucket, skipping undetermined buckets
    const assetsByBucket: Record<string, string[]> = {};
    for (const assetPath of assetPaths) {
      const bucket = this.determineBucketFromPath(assetPath);
      if (!bucket) {
        logger.warn(`[Storage Cleanup] Skipping asset with undetermined bucket: ${assetPath}`);
        continue;
      }
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
      const bucket: string | null = (asset.bucket_id && StorageCleanupService.BUCKETS.includes(asset.bucket_id))
        ? asset.bucket_id
        : this.determineBucketFromPath(asset.name ?? '');
      if (!bucket) {
        logger.warn(`[Storage Cleanup] Skipping asset with undetermined bucket in groupAssetsByBucket: ${asset.name}`);
        return acc;
      }
      if (!acc[bucket]) {
        acc[bucket] = [];
      }
      (acc[bucket] as StorageAsset[]).push(asset);
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

  /**
   * Debug utility to log asset path comparison details
   * Helps troubleshoot why valid assets might be marked as orphaned
   */
  private debugAssetPathComparison(assetPath: string, referencedPaths: Set<string>, userId: string): void {
    if (!assetPath.includes('undefined') && !referencedPaths.has(assetPath)) {
      logger.warn(`[Storage Cleanup] Asset marked as orphaned but may be valid:`, {
        assetPath,
        userId,
        pathLength: assetPath.length,
        containsUserId: assetPath.includes(userId),
        similarPaths: Array.from(referencedPaths).filter(refPath => 
          refPath.includes(assetPath.split('/').pop() || '') ||
          assetPath.includes(refPath.split('/').pop() || '')
        ).slice(0, 3)
      });
    }
  }
}

// Singleton instance for global use
export const storageCleanupService = new StorageCleanupService();