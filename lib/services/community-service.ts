import supabase from '../supabase';
import { Post, Comment } from '../types/community'; // Like is unused

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

    return {
      posts,
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
