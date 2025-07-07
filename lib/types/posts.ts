/**
 * Shared types for post-related data structures
 * Used across community features for consistency
 */

import { Comment } from './community';

export interface PostData {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
  profiles: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  } | null;
  user_has_liked: boolean;
  post_type: 'question' | 'plant_share' | 'general';
  title?: string;
  category?: string;
  tags?: string[];
  plant_name?: string;
  growth_stage?: 'seedling' | 'vegetative' | 'flowering' | 'harvest' | 'curing';
  care_tips?: string;
}

export interface UsePostsParams {
  userId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Extended Comment interface with like status for RPC functions
 */
export interface CommentWithLikeStatus extends Comment {
  user_has_liked: boolean;
  profiles?: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  } | null;
}
