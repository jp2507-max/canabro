/**
 * Re-export post-related types from community.ts
 * This file exists for backward compatibility and to avoid import path changes
 * 
 * @deprecated Import directly from './community' instead
 */

// Re-export all post-related types from the centralized community types
export type {
  PostData,
  UsePostsParams,
  CommentWithLikeStatus,
  Comment,
  PostAuthor,
  PostType,
  PostCategory,
  Post,
  Like,
  Follow
} from './community';

export { GrowthStage } from './plant';
