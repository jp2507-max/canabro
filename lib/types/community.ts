/**
 * Community-related interfaces for the Canabro app
 */

// ========================================
// 🎯 SHARED ANIMATION CONSTANTS
// ========================================

/**
 * Standardized animation configurations for consistent UX across community components
 * Used by PostItem, UserAvatar, ContextAwareFAB, and SegmentedControls
 */
export const COMMUNITY_ANIMATION_CONFIG = {
  card: { damping: 15, stiffness: 400 },
  button: { damping: 12, stiffness: 500 },
  like: { damping: 8, stiffness: 300 },
  image: { damping: 20, stiffness: 500 },
  quick: { damping: 20, stiffness: 600 },
  scale: { damping: 15, stiffness: 400 },
  fab: { damping: 12, stiffness: 400 },
  segment: { damping: 15, stiffness: 400 },
} as const;

/**
 * Standardized scale values for press animations
 */
export const COMMUNITY_SCALE_VALUES = {
  cardPress: 0.98,
  buttonPress: 0.9,
  likePress: 0.85,
  likeActive: 1.1,
  imagePress: 0.95,
  avatarPress: 0.95,
  fabPress: 0.9,
  badgePressed: 0.9,
  default: 1,
} as const;

// ========================================
// 🚀 CONSOLIDATED POST INTERFACES
// ========================================

/**
 * Author information for posts (consolidated from PostAuthor interfaces)
 */
export interface PostAuthor {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

/**
 * Unified PostData interface that consolidates all post-related data structures
 * Replaces duplicate PostData interfaces in PostItem.tsx and other components
 */
export interface PostData {
  id: string;
  user_id?: string; // User ID for ownership checks
  content: string;
  image_url: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
  profiles: PostAuthor | null;
  user_has_liked: boolean;
  hasCorruptedImage?: boolean;
  
  // Enhanced fields for post type support
  post_type: PostType;
  title?: string;
  category?: string;
  tags?: string[];
  plant_name?: string;
  growth_stage?: GrowthStage;
  care_tips?: string;
  
  // Additional metadata
  views_count?: number;
  shares_count?: number;
  is_featured?: boolean;
  priority_level?: 1 | 2 | 3 | 4 | 5;
  is_solved?: boolean;
}

/**
 * Post types for different content categories
 */
export type PostType = 'question' | 'plant_share' | 'general';

/**
 * Growth stages for plant sharing posts
 */
export type GrowthStage = 'seedling' | 'vegetative' | 'flowering' | 'harvest' | 'curing';

/**
 * Post categories for question posts
 */
export type PostCategory = 'general' | 'growing_tips' | 'troubleshooting' | 'strain_info' | 'equipment';

/**
 * Post interface matching actual database schema
 */
export interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  plant_stage?: string; // Actual database field
  plant_strain?: string; // Actual database field
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at?: string;
  
  // Fields from function calls
  profiles?: PostAuthor; // Profile data from join
  user_has_liked?: boolean; // From RPC function
}

/**
 * Comment interface for post comments
 */
export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  image_url?: string;
  likes_count: number;
  parent_id?: string; // For nested comments
  created_at: string;
  updated_at?: string;
}

/**
 * Parameters for fetching posts
 */
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

/**
 * Like interface for tracking likes on posts and comments
 */
export interface Like {
  id: string;
  user_id: string;
  post_id?: string;
  comment_id?: string;
  created_at: string;
}

/**
 * Follow interface for tracking user follows
 */
export interface Follow {
  id: string;
  follower_id: string; // User who is following
  following_id: string; // User being followed
  created_at: string;
}

/**
 * Interface for creating a new post matching database schema
 */
export interface CreatePostData {
  content: string;
  image_url?: string;
  plant_stage?: string;
  plant_strain?: string;
}

/**
 * Interface for creating a new general comment
 */
export interface CreatePostCommentData {
  post_id: string;
  content: string;
  parent_id?: string;
  image_url?: string;
}

/**
 * User activity types
 */
export enum ActivityType {
  POST = 'post',
  COMMENT = 'comment',
  LIKE = 'like',
  FOLLOW = 'follow',
  PLANT_UPDATE = 'plant_update',
  DIARY_ENTRY = 'diary_entry',
  ACHIEVEMENT = 'achievement',
}

/**
 * User activity interface for activity feed
 */
export interface Activity {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  post_id?: string;
  comment_id?: string;
  plant_id?: string;
  diary_entry_id?: string;
  target_user_id?: string; // For follows
  content?: string;
  created_at: string;
}

/**
 * Post filter options for segmented control
 */
export type PostFilter = 'all' | 'questions' | 'plants';

/**
 * Interface for post filter configuration
 */
export interface PostFilterConfig {
  key: PostFilter;
  label: string;
  icon: string;
  color: string;
}

// ========================================
// 🚀 ENHANCED COMMUNITY INTERFACES (Task 1.4)
// ========================================

/**
 * Question categories for community questions
 */
export type QuestionCategory = 
  | 'general' 
  | 'growing_tips' 
  | 'troubleshooting' 
  | 'strain_info' 
  | 'equipment' 
  | 'nutrients'
  | 'harvest';

/**
 * Growing mediums for plant shares
 */
export type GrowingMedium = 
  | 'soil' 
  | 'hydroponic' 
  | 'coco_coir' 
  | 'rockwool' 
  | 'perlite' 
  | 'other';

/**
 * Growing environments
 */
export type Environment = 
  | 'indoor' 
  | 'outdoor' 
  | 'greenhouse' 
  | 'mixed';

/**
 * Content types for filtering
 */
export type ContentType = 'questions' | 'plant_shares';

/**
 * Community Question interface with comprehensive data model
 */
export interface CommunityQuestion {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: QuestionCategory;
  tags: string[];
  image_url?: string;
  is_solved: boolean;
  priority_level: 1 | 2 | 3 | 4 | 5;
  likes_count: number;
  answers_count: number;
  views_count: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  // Joined fields from server function
  username?: string;
  avatar_url?: string;
  user_has_liked?: boolean;
}

/**
 * Community Plant Share interface with comprehensive data model
 */
export interface CommunityPlantShare {
  id: string;
  user_id: string;
  plant_id?: string;
  plant_name: string;
  strain_name?: string;
  growth_stage: GrowthStage;
  content: string;
  care_tips?: string;
  growing_medium?: GrowingMedium;
  environment?: Environment;
  images_urls: string[];
  is_featured: boolean;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  // Joined fields from server function
  username?: string;
  avatar_url?: string;
  user_has_liked?: boolean;
}

/**
 * Question Answer interface for community Q&A
 */
export interface QuestionAnswer {
  id: string;
  question_id: string;
  user_id: string;
  content: string;
  image_url?: string;
  is_accepted: boolean;
  is_helpful: boolean;
  likes_count: number;
  parent_answer_id?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  // Joined fields
  username?: string;
  avatar_url?: string;
  user_has_liked?: boolean;
}

/**
 * Plant Share Comment interface for plant sharing posts
 */
export interface PlantShareComment {
  id: string;
  plant_share_id: string;
  user_id: string;
  content: string;
  image_url?: string;
  likes_count: number;
  parent_comment_id?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  // Joined fields
  username?: string;
  avatar_url?: string;
  user_has_liked?: boolean;
}

/**
 * Filter interfaces for questions
 */
export interface QuestionFilters {
  category?: QuestionCategory;
  is_solved?: boolean;
  order_by?: 'created_at' | 'likes_count' | 'answers_count';
  order_direction?: 'ASC' | 'DESC';
}

/**
 * Filter interfaces for plant shares
 */
export interface PlantShareFilters {
  growth_stage?: GrowthStage;
  environment?: Environment;
  order_by?: 'created_at' | 'likes_count' | 'comments_count';
  order_direction?: 'ASC' | 'DESC';
}

/**
 * Creation interfaces for questions
 */
export interface CreateQuestionData {
  title: string;
  content: string;
  category: QuestionCategory;
  tags?: string[];
  image_url?: string;
  priority_level?: 1 | 2 | 3 | 4 | 5;
}

/**
 * Creation interfaces for plant shares
 */
export interface CreatePlantShareData {
  plant_id?: string;
  plant_name: string;
  strain_name?: string;
  growth_stage: GrowthStage;
  content: string;
  care_tips?: string;
  growing_medium?: GrowingMedium;
  environment?: Environment;
  images_urls?: string[];
}

/**
 * Creation interfaces for answers
 */
export interface CreateAnswerData {
  question_id: string;
  content: string;
  image_url?: string;
  parent_answer_id?: string;
}

/**
 * Creation interfaces for plant share comments
 */
export interface CreatePlantShareCommentData {
  plant_share_id: string;
  content: string;
  image_url?: string;
  parent_comment_id?: string;
}

// ========================================
// 🎯 SHARED ACTION INTERFACES
// ========================================

/**
 * Common post action handlers to eliminate duplication across PostItem components
 */
export interface PostActionHandlers {
  onLike: (postId: string, currentlyLiked: boolean) => void;
  onComment: (postId: string) => void;
  onUserPress: (userId: string) => void;
  onImagePress?: (imageUrl: string) => void;
  onShare?: (postId: string) => void;
}

/**
 * Post action state for loading indicators
 */
export interface PostActionState {
  liking?: boolean;
  commenting?: boolean;
  sharing?: boolean;
}

/**
 * Common props for all post item components
 */
export interface BasePostItemProps {
  post: PostData;
  currentUserId?: string;
  actionHandlers: PostActionHandlers;
  actionState?: PostActionState;
}
