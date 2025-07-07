import React, { useCallback, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import CommunityScreenView from './CommunityScreenView';
import { useAuth } from '../../lib/contexts/AuthProvider';
import { useInfinitePosts } from '../../lib/hooks/community/usePosts';
import { useLikePost } from '../../lib/hooks/community/useLikePost';
import { useDeletePost } from '../../lib/hooks/community/useDeletePost';
import { useRealTimePostUpdates } from '../../lib/hooks/community/useRealTimeUpdates';

function CommunityScreenContainer() {
  const { user, session: _session } = useAuth();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateScreen, setShowCreateScreen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'trending' | 'following'>('trending');
  const [isCommentModalVisible, setIsCommentModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  // Use React Query hooks for posts and likes
  const { 
    data: queryData,
    isLoading, 
    isRefetching: isRefreshing, 
    error: fetchError,
    refetch: refetchPosts,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfinitePosts({ userId: user?.id });

  // Flatten the infinite query pages into a single posts array
  const posts = queryData?.pages.flatMap(page => page) ?? [];

  const likeMutation = useLikePost();
  const deleteMutation = useDeletePost({
    onSuccess: () => {
      console.log('Post deleted successfully');
    },
    onError: (error) => {
      console.error('Failed to delete post:', error);
      // TODO: Show error toast
    }
  });

  // 🎯 Real-time updates for posts and likes
  useRealTimePostUpdates(user?.id);

  const handleRefresh = useCallback(() => {
    refetchPosts();
  }, [refetchPosts]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleLike = useCallback(async (postId: string, currentlyLiked: boolean) => {
    if (!user?.id) return;

    try {
      await likeMutation.mutateAsync({
        postId,
        userId: user.id,
        currentlyLiked
      });
    } catch (error) {
      console.error('Error liking post:', error);
    }
  }, [user?.id, likeMutation]);

  const handleCommentPress = useCallback((postId: string) => {
    setSelectedPostId(postId);
    setIsCommentModalVisible(true);
  }, []);

  const handleDeletePost = useCallback(async (postId: string) => {
    if (!user?.id) return;

    try {
      await deleteMutation.mutateAsync({
        postId,
        userId: user.id
      });
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  }, [user?.id, deleteMutation]);

  const handleCloseComments = useCallback(() => {
    setIsCommentModalVisible(false);
    setSelectedPostId(null);
  }, []);

  const handlePostCreated = useCallback(() => {
    setShowCreateScreen(false);
    refetchPosts();
  }, [refetchPosts]);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-black">
      <CommunityScreenView
        posts={posts}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        isLoadingMore={isFetchingNextPage}
        fetchError={fetchError?.message || null}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        showCreateModal={showCreateModal}
        setShowCreateModal={setShowCreateModal}
        showCreateScreen={showCreateScreen}
        setShowCreateScreen={setShowCreateScreen}
        isCommentModalVisible={isCommentModalVisible}
        selectedPostId={selectedPostId}
        handleLike={handleLike}
        handleCommentPress={handleCommentPress}
        handleDeletePost={handleDeletePost}
        handleCloseComments={handleCloseComments}
        handlePostCreated={handlePostCreated}
        handleRefresh={handleRefresh}
        handleLoadMore={handleLoadMore}
        likingPostId={likeMutation.isPending ? likeMutation.variables?.postId || null : null}
        deletingPostId={deleteMutation.isPending ? deleteMutation.variables?.postId || null : null}
        user={user}
      />
    </SafeAreaView>
  );
}

export default CommunityScreenContainer;
