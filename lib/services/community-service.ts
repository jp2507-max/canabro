import supabase from '../supabase';
import { Post, Comment } from '../types/community'; // Like is unused
import type { 
  CommunityQuestion, 
  CommunityPlantShare, 
  CreateQuestionData, 
  CreatePlantShareData,
  QuestionFilters,
  PlantShareFilters
} from '../types/community';
import { uploadImage } from '../utils/upload-image';
import { DataIntegrityService } from './sync/data-integrity';
import { storageCleanupService } from './storage-cleanup';
import { syncRetryService } from './sync/sync-retry';
import database from '../database/database';

/**
 * Database post record structure
 */
interface DBPost {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  likes_count?: number;
  comments_count?: number;
  created_at: string;
  updated_at: string;
  profiles?: {
    username?: string;
    avatar_url?: string;
  };
}

/**
 * Database comment record structure
 */
interface DBComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  likes_count?: number;
  created_at: string;
  updated_at: string;
  profiles?: {
    username?: string;
    avatar_url?: string;
  };
}

/**
 * Extended Comment interface with user information
 */
interface CommentWithUser extends Comment {
  user: {
    id: string;
    username: string;
    avatar_url?: string;
  };
}

/**
 * Adapts a database post record to our frontend Post model
 */
export function adaptPostFromDB(dbPost: DBPost): Post {
  return {
    id: dbPost.id,
    user_id: dbPost.user_id,
    content: dbPost.content,
    image_url: dbPost.image_url,
    // plant_id: dbPost.plant_id, // Removed - Doesn't exist in live schema
    likes_count: dbPost.likes_count || 0,
    comments_count: dbPost.comments_count || 0,
    // is_public: dbPost.is_public, // Removed non-existent field from adapter
    created_at: dbPost.created_at,
    updated_at: dbPost.updated_at,
  };
}

/**
 * Fetches community posts with pagination
 */
/**
 * Validates and filters posts to remove those with invalid references
 */
async function validateAndFilterPosts(posts: Post[]): Promise<Post[]> {
  if (posts.length === 0) return posts;
  
  try {
    const integrityService = new DataIntegrityService(database);
    
    // Filter out posts with broken image URLs
    const validPosts = posts.filter(post => {
      if (post.image_url && integrityService.isLikelyBrokenImageUrl(post.image_url)) {
        console.warn(`[CommunityService] Filtering out post ${post.id} with broken image URL: ${post.image_url}`);
        return false;
      }
      return true;
    });
    
    // TODO: Cross-reference with WatermelonDB for additional validation if needed
    // For now, we're just filtering broken image URLs in the Supabase data
    
    return validPosts;
  } catch (error) {
    console.warn('[CommunityService] Error during post validation, returning original posts:', error);
    return posts; // Return original posts if validation fails
  }
}

export async function getPosts({
  page = 1,
  limit = 10,
  userId = null,
}: {
  page?: number;
  limit?: number;
  userId?: string | null;
} = {}): Promise<{
  posts: Post[];
  total: number;
  hasMore: boolean;
}> {
  try {
    let query = supabase
      .from('posts')
      .select('*, profiles!posts_user_id_fkey(username, avatar_url)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, count, error } = await query;

    if (error) throw error;

    // Combine post data with profile info
    const posts = (data || []).map((post) => {
      const profile = post.profiles || {};
      const adaptedPost = adaptPostFromDB(post);
      return {
        ...adaptedPost,
        user: {
          id: post.user_id,
          username: profile.username || 'Unknown',
          avatarUrl: profile.avatar_url,
        },
      };
    });

    // Apply data validation to filter out posts with invalid references
    const validatedPosts = await validateAndFilterPosts(posts);

    return {
      posts: validatedPosts,
      total: count || 0,
      hasMore: count ? page * limit < count : false,
    };
  } catch (error) {
    console.error('Error fetching posts:', error);
    return { posts: [], total: 0, hasMore: false };
  }
}

/**
 * Result type for createPost operation
 */
export interface CreatePostResult {
  success: boolean;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  data?: {
    id: string;
    user_id: string;
    content: string;
    image_url?: string;
    likes_count: number;
    comments_count: number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Creates a new post
 */
export async function createPost(post: {
  user_id: string;
  content: string;
  image_url?: string;
  // plant_id?: string; // Removed - Doesn't exist in live schema (has plant_stage/strain instead)
  // is_public?: boolean; // Removed non-existent field from type definition
}): Promise<CreatePostResult> {
  try {
    // Validate input
    if (!post.user_id) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'User ID is required',
        },
      };
    }

    if (!post.content?.trim()) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Post content cannot be empty',
        },
      };
    }

    // Perform insert without selecting the result
    const { data, error } = await supabase.from('posts').insert([
      {
        user_id: post.user_id,
        content: post.content,
        image_url: post.image_url,
        // plant_id: post.plant_id, // Removed non-existent column
        // is_public: undefined, // Removed non-existent column
        likes_count: 0,
        comments_count: 0,
      },
    ]).select().single();

    if (error) {
      console.error('Error during post insert:', error);
      
      // Categorize different types of Supabase errors
      let errorCode = 'DATABASE_ERROR';
      let errorMessage = 'Failed to create post';

      if (error.code === '23505') {
        errorCode = 'DUPLICATE_ERROR';
        errorMessage = 'A post with this content already exists';
      } else if (error.code === '23503') {
        errorCode = 'FOREIGN_KEY_ERROR';
        errorMessage = 'Invalid user or plant reference';
      } else if (error.code === '42501') {
        errorCode = 'PERMISSION_ERROR';
        errorMessage = 'You do not have permission to create posts';
      } else if (error.code === 'PGRST301') {
        errorCode = 'RLS_ERROR';
        errorMessage = 'Access denied by security policy';
      } else if (error.message?.includes('JWT')) {
        errorCode = 'AUTH_ERROR';
        errorMessage = 'Authentication token is invalid or expired';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorCode = 'NETWORK_ERROR';
        errorMessage = 'Network connection failed. Please check your internet connection';
      }

      return {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
          details: error,
        },
      };
    }

    // If insert succeeded without error, return success
    return {
      success: true,
      data,
    };
  } catch (error: unknown) {
    // Log the error but let the caller handle UI feedback
    console.error('Error in createPost function:', error);
    
    // Handle unexpected errors
    let errorCode = 'UNKNOWN_ERROR';
    let errorMessage = 'An unexpected error occurred while creating the post';

    if (error instanceof Error) {
      if (error.name === 'TypeError' && error.message?.includes('fetch')) {
        errorCode = 'NETWORK_ERROR';
        errorMessage = 'Network connection failed. Please check your internet connection';
      } else if (error.message?.includes('timeout')) {
        errorCode = 'TIMEOUT_ERROR';
        errorMessage = 'Request timed out. Please try again';
      } else {
        errorMessage = error.message;
      }
    }

    return {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        details: error,
      },
    };
  }
}

/**
 * Likes a post
 */
export async function likePost(postId: string, userId: string): Promise<boolean> {
  try {
    // First check if user already liked this post
    const { data: existingLike, error: checkError } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    // If already liked, do nothing (or could implement unlike)
    if (existingLike) {
      return false;
    }

    // Add the like
    const { error: insertError } = await supabase.from('likes').insert([
      {
        post_id: postId,
        user_id: userId,
      },
    ]);

    if (insertError) throw insertError;

    // Increment the likes count on the post
    const { error: updateError } = await supabase.rpc('increment_post_likes', { post_id: postId });

    if (updateError) throw updateError;

    return true;
  } catch (error) {
    console.error('Error liking post:', error);
    return false;
  }
}

/**
 * Gets comments for a post
 */
export async function getComments(postId: string): Promise<CommentWithUser[]> {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*, profiles!comments_user_id_fkey(username, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      throw error; // Re-throw the error after logging
    }

    // Map the database results to the CommentWithUser interface
    const comments = (data || []).map(
      (dbComment: DBComment): CommentWithUser => ({
        // Use dbComment as parameter
        id: dbComment.id,
        post_id: dbComment.post_id,
        user_id: dbComment.user_id,
        content: dbComment.content,
        likes_count: dbComment.likes_count || 0,
        created_at: dbComment.created_at,
        updated_at: dbComment.updated_at, // Assuming updated_at exists, add if needed
        user: {
          id: dbComment.user_id,
          username: dbComment.profiles?.username || 'Unknown', // Access profile via dbComment
          avatar_url: dbComment.profiles?.avatar_url, // Access profile via dbComment
        },
      })
    );

    return comments; // Return the mapped comments
  } catch (error) {
    // Catch block now only handles errors thrown from the try block
    console.error('Error in getComments function:', error);
    return []; // Return empty array on error
  }
}

/**
 * Adds a comment to a post
 */
export async function addComment(comment: {
  post_id: string;
  user_id: string;
  content: string;
}): Promise<CommentWithUser | null> {
  try {
    const { data, error } = await supabase
      .from('comments')
      .insert([
        {
          post_id: comment.post_id,
          user_id: comment.user_id,
          content: comment.content,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Increment the comments count on the post
    const { error: updateError } = await supabase.rpc('increment_post_comments', {
      post_id: comment.post_id,
    });

    if (updateError) throw updateError;

    return {
      id: data.id,
      post_id: data.post_id,
      user_id: data.user_id,
      content: data.content,
      likes_count: 0,
      created_at: data.created_at,
      user: {
        id: data.user_id,
        username: '', // Will be fetched separately
        avatar_url: '',
      },
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    return null;
  }
}

/**
 * Enhanced Community Service with new data models (Task 1.4)
 * 
 * 🏗️ **Architecture Evolution:**
 * - **Old system**: Generic `posts` table with mixed content types
 * - **New system**: Dedicated tables for `community_questions` and `community_plant_shares`
 * - **Storage buckets**: `community-questions` and `community-plant-shares` (replacing generic `posts` bucket)
 * 
 * 📦 **Image Upload Strategy:**
 * - Uses standardized `upload-image.ts` utility for all uploads
 * - Provides proper validation, compression, and error handling
 * - Supports mobile-friendly `imageUri` approach vs File objects
 * 
 * 🔄 **Migration Notes:**
 * - Legacy `posts` functions remain for backward compatibility
 * - New community features use dedicated question/plant-share services
 * - All new uploads use `community-questions` and `community-plant-shares` buckets
 */
export class CommunityService {
  // ========================================
  // 🚀 COMMUNITY QUESTIONS
  // ========================================

  /**
   * Fetch community questions with filtering and pagination
   */
  static async getQuestions(
    page: number = 0,
    limit: number = 10,
    filters: QuestionFilters = {}
  ): Promise<CommunityQuestion[]> {
    const { data, error } = await supabase.rpc('get_community_questions', {
      p_limit: limit,
      p_offset: page * limit,
      p_category: filters.category || null,
      p_is_solved: filters.is_solved || null,
      p_order_by: filters.order_by || 'created_at',
      p_order_direction: filters.order_direction || 'DESC'
    });

    if (error) throw error;
    return data as CommunityQuestion[];
  }

  /**
   * Create a new community question
   */
  static async createQuestion(data: CreateQuestionData): Promise<CommunityQuestion> {
    const { data: result, error } = await supabase
      .from('community_questions')
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return result as CommunityQuestion;
  }

  /**
   * Update a community question
   */
  static async updateQuestion(
    questionId: string, 
    updates: Partial<CommunityQuestion>
  ): Promise<CommunityQuestion> {
    const { data, error } = await supabase
      .from('community_questions')
      .update(updates)
      .eq('id', questionId)
      .select()
      .single();

    if (error) throw error;
    return data as CommunityQuestion;
  }

  /**
   * Mark a question as solved/unsolved
   */
  static async updateQuestionSolved(
    questionId: string, 
    isSolved: boolean
  ): Promise<CommunityQuestion> {
    return this.updateQuestion(questionId, { is_solved: isSolved });
  }

  // ========================================
  // 🚀 COMMUNITY PLANT SHARES
  // ========================================

  /**
   * Fetch community plant shares with filtering and pagination
   */
  static async getPlantShares(
    page: number = 0,
    limit: number = 10,
    filters: PlantShareFilters = {}
  ): Promise<CommunityPlantShare[]> {
    const { data, error } = await supabase.rpc('get_community_plant_shares', {
      p_limit: limit,
      p_offset: page * limit,
      p_growth_stage: filters.growth_stage || null,
      p_environment: filters.environment || null,
      p_order_by: filters.order_by || 'created_at',
      p_order_direction: filters.order_direction || 'DESC'
    });

    if (error) throw error;
    return data as CommunityPlantShare[];
  }

  /**
   * Create a new community plant share
   */
  static async createPlantShare(data: CreatePlantShareData): Promise<CommunityPlantShare> {
    const { data: result, error } = await supabase
      .from('community_plant_shares')
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return result as CommunityPlantShare;
  }

  /**
   * Update a community plant share
   */
  static async updatePlantShare(
    plantShareId: string, 
    updates: Partial<CommunityPlantShare>
  ): Promise<CommunityPlantShare> {
    const { data, error } = await supabase
      .from('community_plant_shares')
      .update(updates)
      .eq('id', plantShareId)
      .select()
      .single();

    if (error) throw error;
    return data as CommunityPlantShare;
  }

  // ========================================
  // 🚀 IMAGE UPLOAD HELPERS
  // ========================================

  /**
   * Upload image for community question using our standardized upload utility
   */
  static async uploadQuestionImage(userId: string, imageUri: string, questionId?: string): Promise<string> {
    const result = await uploadImage({
      bucket: 'community-questions',
      userId,
      imageUri,
      filenamePrefix: questionId ? `question_${questionId}` : 'question',
    });

    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to upload question image');
    }

    return result.publicUrl!;
  }

  /**
   * Upload multiple images for plant share using our standardized upload utility
   */
  static async uploadPlantShareImages(userId: string, imageUris: string[], plantShareId?: string): Promise<string[]> {
    const uploadPromises = imageUris.map(async (imageUri, index) => {
      const result = await uploadImage({
        bucket: 'community-plant-shares',
        userId,
        imageUri,
        filenamePrefix: plantShareId ? `share_${plantShareId}_${index}` : `share_${index}`,
      });

      if (!result.success) {
        throw new Error(result.error?.message || `Failed to upload plant share image ${index + 1}`);
      }

      return result.publicUrl!;
    });

    return Promise.all(uploadPromises);
  }

  // ========================================
  // 🚀 LIKE MANAGEMENT
  // ========================================

  /**
   * Like/unlike a community question
   */
  static async toggleQuestionLike(questionId: string, userId: string): Promise<boolean> {
    // Check if already liked
    const { data: existingLike } = await supabase
      .from('community_question_likes')
      .select('id')
      .eq('question_id', questionId)
      .eq('user_id', userId)
      .single();

    if (existingLike) {
      // Unlike
      const { error } = await supabase
        .from('community_question_likes')
        .delete()
        .eq('question_id', questionId)
        .eq('user_id', userId);
      
      if (error) throw error;
      return false; // Now unliked
    } else {
      // Like
      const { error } = await supabase
        .from('community_question_likes')
        .insert([{ question_id: questionId, user_id: userId }]);
      
      if (error) throw error;
      return true; // Now liked
    }
  }

  /**
   * Like/unlike a community plant share
   */
  static async togglePlantShareLike(plantShareId: string, userId: string): Promise<boolean> {
    // Check if already liked
    const { data: existingLike } = await supabase
      .from('community_plant_share_likes')
      .select('id')
      .eq('plant_share_id', plantShareId)
      .eq('user_id', userId)
      .single();

    if (existingLike) {
      // Unlike
      const { error } = await supabase
        .from('community_plant_share_likes')
        .delete()
        .eq('plant_share_id', plantShareId)
        .eq('user_id', userId);
      
      if (error) throw error;
      return false; // Now unliked
    } else {
      // Like
      const { error } = await supabase
        .from('community_plant_share_likes')
        .insert([{ plant_share_id: plantShareId, user_id: userId }]);
      
      if (error) throw error;
      return true; // Now liked
    }
  }

  // ========================================
  // 🗑️ DELETION & CLEANUP
  // ========================================

  /**
   * Safely delete a post with comprehensive cleanup
   */
  static async deletePost(postId: string, userId: string): Promise<void> {
    try {
      // Verify the user owns the post
      const { data: post, error: fetchError } = await supabase
        .from('posts')
        .select('user_id, image_url')
        .eq('id', postId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch post: ${fetchError.message}`);
      }

      if (!post) {
        throw new Error('Post not found');
      }

      if (post.user_id !== userId) {
        throw new Error('Unauthorized: You can only delete your own posts');
      }

      // Use retry service for reliable deletion with storage cleanup
      await syncRetryService.executeWithRetry(
        `delete_post_${postId}_${Date.now()}`,
        async () => {
          // Clean up storage assets first
          const storageCleanupResult = await storageCleanupService.cleanupPostAssets(postId, userId);
          
          if (storageCleanupResult.errors.length > 0) {
            console.warn(`[CommunityService] Storage cleanup errors for post ${postId}:`, storageCleanupResult.errors);
            // Don't fail the deletion if storage cleanup has issues
          }
          
          if (storageCleanupResult.deletedAssets.length > 0) {
            console.log(`[CommunityService] Cleaned up ${storageCleanupResult.deletedAssets.length} storage assets for post ${postId}`);
          }

          // Use the integrity service's safe deletion method
          const integrityService = new DataIntegrityService(database);
          await integrityService.safeDeletePost(postId);
        },
        'push',
        { maxRetries: 3, baseDelay: 2000 } // Custom retry config for deletions
      );
      
    } catch (error) {
      console.error('[CommunityService] Error deleting post:', error);
      throw error;
    }
  }

  /**
   * Safely delete a comment with validation
   */
  static async deleteComment(commentId: string, userId: string): Promise<void> {
    try {
      // Verify the user owns the comment
      const { data: comment, error: fetchError } = await supabase
        .from('comments')
        .select('user_id, post_id')
        .eq('id', commentId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch comment: ${fetchError.message}`);
      }

      if (!comment) {
        throw new Error('Comment not found');
      }

      if (comment.user_id !== userId) {
        throw new Error('Unauthorized: You can only delete your own comments');
      }

      // Delete the comment
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) {
        throw new Error(`Failed to delete comment: ${error.message}`);
      }

      // Update the parent post's comment count
      const { error: updateError } = await supabase.rpc('decrement_comment_count', {
        post_id: comment.post_id
      });

      if (updateError) {
        console.warn('[CommunityService] Failed to update comment count:', updateError);
      }

    } catch (error) {
      console.error('[CommunityService] Error deleting comment:', error);
      throw error;
    }
  }

  /**
   * Batch delete posts (for administrative purposes)
   */
  static async batchDeletePosts(postIds: string[], userId: string, isAdmin: boolean = false): Promise<{ success: string[], failed: string[] }> {
    const results = { success: [] as string[], failed: [] as string[] };
    
    for (const postId of postIds) {
      try {
        if (isAdmin) {
          // Admin can delete any post
          const integrityService = new DataIntegrityService(database);
          await integrityService.safeDeletePost(postId);
        } else {
          // Regular user can only delete their own posts
          await this.deletePost(postId, userId);
        }
        results.success.push(postId);
      } catch (error) {
        console.warn(`[CommunityService] Failed to delete post ${postId}:`, error);
        results.failed.push(postId);
      }
    }
    
    return results;
  }

  /**
   * Soft delete a post (mark as deleted but keep record)
   */
  static async softDeletePost(postId: string, userId: string): Promise<void> {
    try {
      // Verify the user owns the post
      const { data: post, error: fetchError } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .single();

      if (fetchError || !post) {
        throw new Error('Post not found');
      }

      if (post.user_id !== userId) {
        throw new Error('Unauthorized: You can only delete your own posts');
      }

      // Mark as deleted
      const { error } = await supabase
        .from('posts')
        .update({ 
          is_deleted: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', postId);

      if (error) {
        throw new Error(`Failed to soft delete post: ${error.message}`);
      }

    } catch (error) {
      console.error('[CommunityService] Error soft deleting post:', error);
      throw error;
    }
  }

  /**
   * Restore a soft-deleted post
   */
  static async restorePost(postId: string, userId: string): Promise<void> {
    try {
      // Verify the user owns the post
      const { data: post, error: fetchError } = await supabase
        .from('posts')
        .select('user_id, is_deleted')
        .eq('id', postId)
        .single();

      if (fetchError || !post) {
        throw new Error('Post not found');
      }

      if (post.user_id !== userId) {
        throw new Error('Unauthorized: You can only restore your own posts');
      }

      if (!post.is_deleted) {
        throw new Error('Post is not deleted');
      }

      // Restore the post
      const { error } = await supabase
        .from('posts')
        .update({ 
          is_deleted: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', postId);

      if (error) {
        throw new Error(`Failed to restore post: ${error.message}`);
      }

    } catch (error) {
      console.error('[CommunityService] Error restoring post:', error);
      throw error;
    }
  }

  // ========================================
  // 🚀 ANALYTICS & STATS
  // ========================================

  /**
   * Get community statistics
   */
  static async getCommunityStats(): Promise<{
    totalQuestions: number;
    totalPlantShares: number;
    solvedQuestions: number;
    featuredPlantShares: number;
  }> {
    const [
      { count: totalQuestions },
      { count: totalPlantShares },
      { count: solvedQuestions },
      { count: featuredPlantShares }
    ] = await Promise.all([
      supabase.from('community_questions').select('*', { count: 'exact', head: true }),
      supabase.from('community_plant_shares').select('*', { count: 'exact', head: true }),
      supabase.from('community_questions').select('*', { count: 'exact', head: true }).eq('is_solved', true),
      supabase.from('community_plant_shares').select('*', { count: 'exact', head: true }).eq('is_featured', true)
    ]);

    return {
      totalQuestions: totalQuestions || 0,
      totalPlantShares: totalPlantShares || 0,
      solvedQuestions: solvedQuestions || 0,
      featuredPlantShares: featuredPlantShares || 0
    };
  }
}
