/**
 * Community-related interfaces for the Canabro app
 */

/**
 * Post interface for community posts
 */
export interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  plant_id?: string; // Optional reference to a plant
  likes_count: number;
  comments_count: number;
  is_public: boolean;
  created_at: string;
  updated_at?: string;
}

/**
 * Comment interface for post comments
 */
export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  likes_count: number;
  parent_id?: string; // For nested comments
  created_at: string;
  updated_at?: string;
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
 * Interface for creating a new post
 */
export interface CreatePostData {
  content: string;
  image_url?: string;
  plant_id?: string;
  is_public?: boolean;
}

/**
 * Interface for creating a new comment
 */
export interface CreateCommentData {
  post_id: string;
  content: string;
  parent_id?: string;
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
