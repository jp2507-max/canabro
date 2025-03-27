import { useState, useEffect, useCallback } from 'react';
import { Post } from '../types/community';
import { getPosts, createPost, likePost } from '../services/community-service';
import { useAuth } from '../contexts/AuthProvider';

/**
 * Hook for managing community posts with pagination
 */
export function useCommunityPosts(userIdFilter?: string) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const { user } = useAuth();

  const fetchPosts = useCallback(async (pageNumber = 1, replace = true) => {
    try {
      setLoading(pageNumber === 1);
      if (pageNumber !== 1) setRefreshing(true);
      
      const result = await getPosts({
        page: pageNumber,
        limit: 10,
        userId: userIdFilter || null
      });
      
      setPosts(prev => replace ? result.posts : [...prev, ...result.posts]);
      setHasMore(result.hasMore);
      setTotal(result.total);
      setError(null);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load posts'));
      return { posts: [], total: 0, hasMore: false };
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userIdFilter]);

  // Initial load
  useEffect(() => {
    fetchPosts(1, true);
    setPage(1);
  }, [fetchPosts]);

  // Load more posts
  const loadMore = async () => {
    if (loading || refreshing || !hasMore) return;
    
    const nextPage = page + 1;
    await fetchPosts(nextPage, false);
    setPage(nextPage);
  };

  // Refresh posts
  const refresh = async () => {
    setRefreshing(true);
    await fetchPosts(1, true);
    setPage(1);
    setRefreshing(false);
  };

  // Add a new post
  const addPost = async (postData: Omit<Post, 'id' | 'createdAt' | 'updatedAt' | 'likesCount' | 'commentsCount'>) => {
    if (!user) return null;

    try {
      const newPost = await createPost({
        ...postData,
        user_id: user.id
      });

      if (newPost) {
        setPosts(prev => [newPost, ...prev]);
      }

      return newPost;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create post'));
      return null;
    }
  };

  // Like a post
  const like = async (postId: string) => {
    if (!user) return false;

    try {
      const success = await likePost(postId, user.id);

      if (success) {
        // Update the like count locally
        setPosts(prev => prev.map(post => {
          if (post.id === postId) {
            return { ...post, likes_count: post.likes_count + 1 };
          }
          return post;
        }));
      }

      return success;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to like post'));
      return false;
    }
  };

  return {
    posts,
    loading,
    refreshing,
    hasMore,
    total,
    error,
    loadMore,
    refresh,
    addPost,
    like
  };
}
