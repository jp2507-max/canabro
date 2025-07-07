/**
 * Utility functions for transforming PostData to specific community post types
 * @file community-transforms.ts
 * @location lib/utils/community-transforms.ts
 */

import type { PostData, CommunityQuestion, CommunityPlantShare, QuestionCategory } from '../types/community';

/**
 * Transforms PostData to CommunityQuestion format
 * Used for rendering question posts in the community feed
 */
export function transformPostToQuestion(post: PostData): CommunityQuestion {
  return {
    id: post.id,
    user_id: post.profiles?.id || '',
    title: post.title || post.content.split('\n')[0] || 'Question',
    content: post.content,
    image_url: post.image_url || undefined,
    category: (post.category || 'general') as QuestionCategory,
    tags: post.tags || [],
    is_solved: post.is_solved || false,
    priority_level: (post.priority_level || 1) as 1 | 2 | 3 | 4 | 5,
    likes_count: post.likes_count,
    answers_count: post.comments_count || 0,
    views_count: post.views_count ?? 0, // Use actual views count or 0 if unavailable
    user_has_liked: post.user_has_liked,
    username: post.profiles?.username || 'Anonymous',
    avatar_url: post.profiles?.avatar_url || '',
    created_at: post.created_at,
    updated_at: post.created_at, // Use created_at as fallback
  };
}

/**
 * Transforms PostData to CommunityPlantShare format
 * Used for rendering plant share posts in the community feed
 */
export function transformPostToPlantShare(post: PostData): CommunityPlantShare {
  return {
    id: post.id,
    user_id: post.profiles?.id || '',
    plant_name: post.plant_name || 'My Plant',
    strain_name: post.plant_name,
    content: post.content,
    images_urls: post.image_url ? [post.image_url] : [],
    growth_stage: post.growth_stage || 'vegetative',
    environment: 'indoor' as const, // Default or could be added to PostData
    growing_medium: 'soil' as const, // Default or could be added to PostData
    care_tips: post.care_tips || '',
    is_featured: post.is_featured || false,
    likes_count: post.likes_count,
    comments_count: post.comments_count || 0,
    shares_count: post.shares_count || 0,
    user_has_liked: post.user_has_liked,
    username: post.profiles?.username || 'Anonymous',
    avatar_url: post.profiles?.avatar_url || '',
    created_at: post.created_at,
    updated_at: post.created_at, // Use created_at as fallback
  };
}

/**
 * Type guard to determine if a post should be rendered as a question
 * Checks post_type first, then falls back to content analysis
 */
export function isQuestionPost(post: PostData): boolean {
  return post.post_type === 'question' || 
         (!!post.content && post.content.includes('?')) ||
         (!!post.title && post.title.length > 0);
}

/**
 * Type guard to determine if a post should be rendered as a plant share
 * Checks post_type first, then falls back to plant-specific fields
 */
export function isPlantSharePost(post: PostData): boolean {
  return post.post_type === 'plant_share' ||
         (!!post.growth_stage && post.growth_stage.length > 0) ||
         (!!post.plant_name && post.plant_name.length > 0);
}
