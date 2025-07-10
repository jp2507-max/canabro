
import supabase from '../supabase';
import type { 
  CommunityQuestion, 
  CommunityPlantShare, 
  CreateQuestionData, 
  CreatePlantShareData,
  QuestionFilters,
  PlantShareFilters,
  PostData
} from '../types/community';
import { uploadImage } from '../utils/upload-image';
import { storageCleanupService } from './storage-cleanup';
import { syncRetryService } from './sync/sync-retry';

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
 * - Legacy posts table has been fully migrated to community_questions and community_plant_shares
 * - All community features now use dedicated question/plant-share services
 * - All uploads use `community-questions` and `community-plant-shares` buckets
 */
export class CommunityService {
  /**
   * Soft delete a post (set is_deleted: true) for both questions and plant shares
   */
  static async softDeletePost(postId: string, userId: string): Promise<void> {
    const record = await CommunityService.getPostRecordWithTable(postId);
    if (!record) throw new Error('Post not found');
    if (record.data.user_id !== userId) {
      throw new Error('Unauthorized: You can only delete your own posts');
    }
    const { table } = record;
    const { error } = await supabase
      .from(table)
      .update({ is_deleted: true })
      .eq('id', postId)
      .eq('user_id', userId);
    if (error) throw error;
  }

  /**
   * Restore a soft-deleted post (set is_deleted: false) for both questions and plant shares
   */
  static async restorePost(postId: string, userId: string): Promise<void> {
    const record = await CommunityService.getPostRecordWithTable(postId);
    if (!record) throw new Error('Post not found');
    if (record.data.user_id !== userId) {
      throw new Error('Unauthorized: You can only restore your own posts');
    }
    const { table } = record;
    const { error } = await supabase
      .from(table)
      .update({ is_deleted: false })
      .eq('id', postId)
      .eq('user_id', userId);
    if (error) throw error;
  }
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
    // Get the current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User must be authenticated to create a question');
    }

    // Ensure user_id is set for RLS policy compliance
    const questionData = {
      ...data,
      user_id: data.user_id || user.id, // Use provided user_id or fallback to current user
    };

    const { data: result, error } = await supabase
      .from('community_questions')
      .insert([questionData])
      .select()
      .single();

    if (error) throw error;
    return result as CommunityQuestion;
  }

  /**
   * Create a new general community post (category: 'general')
   * This is the canonical way to create general posts (not questions or plant shares).
   * @param data - General post data (content, optional image_url)
   * @returns The created CommunityQuestion (with category 'general' and no title)
   */
  static async createPost(data: { content: string; image_url?: string }): Promise<CommunityQuestion> {
    // Enforce no title and category 'general'
    const postData: CreateQuestionData = {
      title: '',
      content: data.content,
      category: 'general',
      image_url: data.image_url,
    };
    return CommunityService.createQuestion(postData);
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
    return CommunityService.updateQuestion(questionId, { is_solved: isSolved });
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
    // Get the current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User must be authenticated to create a plant share');
    }

    // Ensure user_id is set for RLS policy compliance
    const plantShareData = {
      ...data,
      user_id: data.user_id || user.id, // Use provided user_id or fallback to current user
    };

    const { data: result, error } = await supabase
      .from('community_plant_shares')
      .insert([plantShareData])
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
  // 🚀 FEED COMBINATOR (Unified UI Support)
  // ========================================

  /**
   * Adapter: CommunityQuestion -> PostData (UI-friendly)
   */
  static adaptQuestionToPostData(q: CommunityQuestion): PostData {
    return {
      id: q.id,
      user_id: q.user_id,
      content: q.content,
      image_url: q.image_url ?? null,
      created_at: q.created_at,
      likes_count: q.likes_count,
      comments_count: q.answers_count,
      profiles: {
        id: q.user_id,
        username: q.username ?? null,
        avatar_url: q.avatar_url ?? null,
      },
      user_has_liked: q.user_has_liked ?? false,
      post_type: 'question',
      title: q.title,
      category: q.category,
      tags: q.tags,
      views_count: q.views_count,
      is_solved: q.is_solved,
      priority_level: q.priority_level,
      shares_count: 0,
    } as PostData;
  }

  /**
   * Adapter: CommunityPlantShare -> PostData
   */
  static adaptPlantShareToPostData(ps: CommunityPlantShare): PostData {
    return {
      id: ps.id,
      user_id: ps.user_id,
      content: ps.content,
      image_url: ps.images_urls?.[0] ?? null,
      created_at: ps.created_at,
      likes_count: ps.likes_count,
      comments_count: ps.comments_count,
      profiles: {
        id: ps.user_id,
        username: ps.username ?? null,
        avatar_url: ps.avatar_url ?? null,
      },
      user_has_liked: ps.user_has_liked ?? false,
      post_type: 'plant_share',
      plant_name: ps.plant_name,
      growth_stage: ps.growth_stage,
      strain_name: ps.strain_name,
      care_tips: ps.care_tips,
      shares_count: ps.shares_count,
      is_featured: ps.is_featured,
    } as PostData;
  }

  /**
   * 🚀 Unified community feed combining questions & plant shares.
   * Returns sorted PostData[] for UI components that expect legacy posts shape.
   */
  static async getCommunityFeed(page: number = 0, limit: number = 20): Promise<PostData[]> {
    // Fetch half & half for now; TODO: smarter mixing algorithm
    const slice = Math.ceil(limit / 2);

    const [questions, plantShares] = await Promise.all([
      CommunityService.getQuestions(page, slice),
      CommunityService.getPlantShares(page, slice),
    ]);

    const combined = [
      ...questions.map(CommunityService.adaptQuestionToPostData),
      ...plantShares.map(CommunityService.adaptPlantShareToPostData),
    ];

    // Sort by created_at descending
    return combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // ========================================
  // 🚀 LIKE MANAGEMENT
  // ========================================

  /**
   * Generic helper to toggle likes atomically using database constraints
   * @param tableName The like table name
   * @param idField The field name for the target ID (e.g., 'question_id', 'plant_share_id')
   * @param targetId The ID of the item being liked
   * @param userId The user performing the like action
   * @returns Promise<boolean> true if now liked, false if now unliked
   */
  private static async toggleLike(
    tableName: string,
    idField: string,
    targetId: string,
    userId: string
  ): Promise<boolean> {
    // First, try to delete the existing like
    const { data: deletedData, error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .eq(idField, targetId)
      .eq('user_id', userId)
      .select('id');

    if (deleteError) throw deleteError;

    // If a like was deleted, return false (now unliked)
    if (deletedData && deletedData.length > 0) {
      return false;
    }

    // If no like was deleted, insert a new like
    const insertData = { [idField]: targetId, user_id: userId };
    const { error: insertError } = await supabase
      .from(tableName)
      .insert([insertData]);

    if (insertError) throw insertError;
    return true; // Now liked
  }

  /**
   * Like/unlike a community question
   */
  static async toggleQuestionLike(questionId: string, userId: string): Promise<boolean> {
    return CommunityService.toggleLike('community_question_likes', 'question_id', questionId, userId);
  }

  /**
   * Like/unlike a community plant share
   */
  static async togglePlantShareLike(plantShareId: string, userId: string): Promise<boolean> {
    return CommunityService.toggleLike('community_plant_share_likes', 'plant_share_id', plantShareId, userId);
  }

  // ========================================
  // 🚨 NEW HELPER: Unified Post Lookup
  // ========================================
  /**
   * Find a post by ID in the split community tables.
   * Returns the table name and row data or null if not found.
   */
  private static async getPostRecordWithTable(postId: string): Promise<
    { table: 'community_questions' | 'community_plant_shares'; data: Record<string, unknown> } | null
  > {
    // Try community_questions first
    const { data: question, error: qError } = await supabase
      .from('community_questions')
      .select('id, user_id, image_url')
      .eq('id', postId)
      .maybeSingle();

    if (qError) throw qError;

    if (question) {
      return { table: 'community_questions', data: question } as const;
    }

    // Fallback to plant shares
    const { data: plantShare, error: psError } = await supabase
      .from('community_plant_shares')
      .select('id, user_id, images_urls')
      .eq('id', postId)
      .maybeSingle();

    if (psError) throw psError;

    if (plantShare) {
      return { table: 'community_plant_shares', data: plantShare } as const;
    }

    return null;
  }
  
  // ========================================
  // 🗑️ DELETION & CLEANUP
  // ========================================

  /**
   * Safely delete a post with comprehensive cleanup
   */
  static async deletePost(postId: string, userId: string): Promise<void> {
    try {
      // Locate the post in the new split tables
      const record = await CommunityService.getPostRecordWithTable(postId);

      if (!record) throw new Error('Post not found');

      if (record.data.user_id !== userId) {
        throw new Error('Unauthorized: You can only delete your own posts');
      }

      // Use retry service for reliable deletion with storage cleanup
      await syncRetryService.executeWithRetry(
        `delete_post_${postId}_${Date.now()}`,
        async () => {
          // Clean up storage assets first (supports question & plant share uploads too)
          const storageCleanupResult = await storageCleanupService.cleanupPostAssets(postId, userId);
          
          if (storageCleanupResult.errors.length > 0) {
            console.warn(`[CommunityService] Storage cleanup errors for post ${postId}:`, storageCleanupResult.errors);
            // Don't fail the deletion if storage cleanup has issues
          }
          
          if (storageCleanupResult.deletedAssets.length > 0) {
            console.warn(`[CommunityService] Cleaned up ${storageCleanupResult.deletedAssets.length} storage assets for post ${postId}`);
          }

          // Delegate to table-specific delete helpers for cascade / integrity logic
          if (record.table === 'community_questions') {
            await CommunityService.deleteQuestion(postId, userId);
          } else {
            await CommunityService.deletePlantShare(postId, userId);
          }
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
      // Verify the user owns the comment and get the post_id
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

      // Determine the correct table for the post and decrement the comment count
      const postRecord = await CommunityService.getPostRecordWithTable(comment.post_id);
      if (!postRecord) {
        console.warn('[CommunityService] Could not find parent post to decrement comment count.');
        return;
      }

      let updateError;
      if (postRecord.table === 'community_questions') {
        // Decrement answers_count for questions
        const { data: qData, error: qFetchError } = await supabase
          .from('community_questions')
          .select('answers_count')
          .eq('id', comment.post_id)
          .single();
        if (!qFetchError && qData) {
          const newCount = Math.max(0, (qData.answers_count ?? 1) - 1);
          const { error: qError } = await supabase
            .from('community_questions')
            .update({ answers_count: newCount })
            .eq('id', comment.post_id);
          updateError = qError;
        } else {
          updateError = qFetchError;
        }
      } else if (postRecord.table === 'community_plant_shares') {
        // Decrement comments_count for plant shares
        const { data: psData, error: psFetchError } = await supabase
          .from('community_plant_shares')
          .select('comments_count')
          .eq('id', comment.post_id)
          .single();
        if (!psFetchError && psData) {
          const newCount = Math.max(0, (psData.comments_count ?? 1) - 1);
          const { error: psError } = await supabase
            .from('community_plant_shares')
            .update({ comments_count: newCount })
            .eq('id', comment.post_id);
          updateError = psError;
        } else {
          updateError = psFetchError;
        }
      }

      if (updateError) {
        console.warn('[CommunityService] Failed to update comment count:', updateError);
      }

    } catch (error) {
      console.error('[CommunityService] Error deleting comment:', error);
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

  // New deletion helpers for question / plant share (use in hooks)
  static async deleteQuestion(questionId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('community_questions')
      .delete()
      .eq('id', questionId)
      .eq('user_id', userId);
    if (error) throw error;
  }

  static async deletePlantShare(plantShareId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('community_plant_shares')
      .delete()
      .eq('id', plantShareId)
      .eq('user_id', userId);
    if (error) throw error;
  }
}
