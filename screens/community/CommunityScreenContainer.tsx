import React, { useCallback, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import CommunityScreenView from './CommunityScreenView';
import type { PostData } from '../../components/community/PostItem';
import { useAuth } from '../../lib/contexts/AuthProvider';
import supabase from '../../lib/supabase';

const PAGE_SIZE = 10;

function CommunityScreenContainer() {
  const { user, session } = useAuth();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateScreen, setShowCreateScreen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'trending' | 'following'>('trending');
  const [isCommentModalVisible, setIsCommentModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [likingPostId, setLikingPostId] = useState<string | null>(null);

  // Fetch posts with stable identity to avoid unnecessary re-renders
  const fetchPosts = useCallback(
    async (page: number, refreshing = false) => {
      if (!session) return;

      const limit = PAGE_SIZE;
      const offset = page * limit;

      // Loading & refresh state management
      setIsLoading(page === 0 && !refreshing);
      setIsRefreshing(refreshing);

      try {
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select(`*, profiles ( username, avatar_url )`)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (postsError) throw postsError;

        if (!postsData) {
          // Nothing returned – clear or keep existing posts based on refresh flag
          setPosts((prev) => (refreshing ? [] : prev));
          setHasMore(false);
          setFetchError(null);
          return;
        }

        // Update posts using functional state to avoid dependency on `posts`
        setPosts((prev) => (refreshing ? postsData : [...prev, ...postsData]));
        setHasMore(postsData.length === limit);
        setFetchError(null);
      } catch (err) {
        setFetchError((err as Error).message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [session]
  );

  React.useEffect(() => {
    fetchPosts(0, true);
  }, [fetchPosts]);

  const handleRefresh = useCallback(() => {
    setCurrentPage(0);
    fetchPosts(0, true);
  }, [fetchPosts]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchPosts(nextPage);
  }, [hasMore, isLoadingMore, currentPage, fetchPosts]);

  const handleLike = useCallback(async (postId: string, currentlyLiked: boolean) => {
    setLikingPostId(postId);
    // TODO: Implement like/unlike logic with Supabase RPC or mutation
    setLikingPostId(null);
  }, []);

  const handleCommentPress = useCallback((postId: string) => {
    setSelectedPostId(postId);
    setIsCommentModalVisible(true);
  }, []);

  const handleCloseComments = useCallback(() => {
    setIsCommentModalVisible(false);
    setSelectedPostId(null);
  }, []);

  const handlePostCreated = useCallback(() => {
    setShowCreateScreen(false);
    handleRefresh();
  }, [handleRefresh]);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-black">
      <CommunityScreenView
        posts={posts}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        _isLoadingMore={isLoadingMore}
        fetchError={fetchError}
        _activeFilter={activeFilter}
        _setActiveFilter={setActiveFilter}
        showCreateModal={showCreateModal}
        setShowCreateModal={setShowCreateModal}
        showCreateScreen={showCreateScreen}
        setShowCreateScreen={setShowCreateScreen}
        isCommentModalVisible={isCommentModalVisible}
        selectedPostId={selectedPostId}
        handleLike={handleLike}
        handleCommentPress={handleCommentPress}
        handleCloseComments={handleCloseComments}
        handlePostCreated={handlePostCreated}
        handleRefresh={handleRefresh}
        handleLoadMore={handleLoadMore}
        likingPostId={likingPostId}
        user={user}
      />
    </SafeAreaView>
  );
}

export default CommunityScreenContainer;
