import React, { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CommunityScreenView from './CommunityScreenView';
import { useAuth } from '../../lib/contexts/AuthProvider';
import { useInfinitePosts } from '../../lib/hooks/community/usePosts';
import { useLikePost, type LikeParams } from '../../lib/hooks/community/useLikePost';
import { useDeletePost, type DeletePostVariables } from '../../lib/hooks/community/useDeletePost';
import { useRealTimePostUpdates } from '../../lib/hooks/community/useRealTimeUpdates';
import { useIsOnline } from '../../lib/hooks/useIsOnline';

function CommunityScreenContainer() {
  const { user } = useAuth();
  const isOnline = useIsOnline();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateScreen, setShowCreateScreen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'trending' | 'following'>('trending');
  const [isCommentModalVisible, setIsCommentModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const {
    data: queryData,
    isLoading,
    isRefetching: isRefreshing,
    error: fetchError,
    refetch: refetchPosts,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfinitePosts({ userId: user?.id, enabled: isOnline });

  const posts = queryData?.pages.flatMap((page) => page) ?? [];

  const likeMutation = useLikePost();
  const deleteMutation = useDeletePost({
    onSuccess: () => {
      console.log('Post deleted successfully');
    },
    onError: (error) => {
      console.error('Failed to delete post:', error);
    },
  });

  useRealTimePostUpdates(user?.id);

  const handleRefresh = useCallback(() => {
    if (isOnline) {
      refetchPosts();
    }
  }, [refetchPosts, isOnline]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && isOnline) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, isOnline]);

  const handleLike = useCallback(
    async (postId: string) => {
      if (!user?.id || !isOnline) return;

      const post = posts.find((p) => p.id === postId);
      if (!post) {
        console.error('Post not found for liking');
        Alert.alert('Like Failed', 'Unable to find the post to like. Please try again.');
        return;
      }

      try {
        await likeMutation.mutateAsync({
          post,
          userId: user.id,
        });
      } catch (error) {
        console.error('Error liking post:', error);
        Alert.alert('Like Failed', 'Unable to like the post. Please try again.');
      }
    },
    [user?.id, likeMutation, posts, isOnline]
  );

  const handleCommentPress = useCallback((postId: string) => {
    setSelectedPostId(postId);
    setIsCommentModalVisible(true);
  }, []);

  const handleDeletePost = useCallback(
    async (postId: string) => {
      if (!user?.id || !isOnline) return;

      const post = posts.find((p) => p.id === postId);
      if (!post) {
        console.error('Post not found for deletion');
        Alert.alert('Delete Failed', 'Unable to find the post to delete. Please try again.');
        return;
      }

      try {
        await deleteMutation.mutateAsync({
          post,
          userId: user.id,
        });
      } catch (error) {
        console.error('Error deleting post:', error);
        Alert.alert('Delete Failed', 'Unable to delete the post. Please try again.');
      }
    },
    [user?.id, deleteMutation, posts, isOnline]
  );

  const handleCloseComments = useCallback(() => {
    setIsCommentModalVisible(false);
    setSelectedPostId(null);
  }, []);

  const handlePostCreated = useCallback(() => {
    setShowCreateScreen(false);
    if (isOnline) {
      refetchPosts();
    }
  }, [refetchPosts, isOnline]);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-black">
      <CommunityScreenView
        posts={posts}
        isLoading={isLoading && isOnline}
        isRefreshing={isRefreshing && isOnline}
        isLoadingMore={isFetchingNextPage && isOnline}
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
        likingPostId={
          likeMutation.isPending
            ? (likeMutation.variables as LikeParams | undefined)?.post?.id ?? null
            : null
        }
        deletingPostId={
          deleteMutation.isPending
            ? (deleteMutation.variables as DeletePostVariables | undefined)?.post?.id ?? null
            : null
        }
        user={user}
        isOffline={!isOnline}
      />
    </SafeAreaView>
  );
}

export default CommunityScreenContainer;
