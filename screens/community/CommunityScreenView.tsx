import React, { useMemo } from 'react';
import { FlatList, TouchableOpacity, View, RefreshControl } from 'react-native';
import ThemedView from '../../components/ui/ThemedView';
import ThemedText from '../../components/ui/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import PostItem from '../../components/community/PostItem';
import CommentModal from '../../components/community/CommentModal';
import CreatePostModal from '../../components/community/CreatePostModal';
import CreatePostScreen from '../../components/community/CreatePostScreen';
import { useTheme } from '../../lib/contexts/ThemeContext';
import type { PostData } from '../../components/community/PostItem';

interface CommunityScreenViewProps {
  posts: PostData[];
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  fetchError: string | null;
  activeFilter: 'trending' | 'following';
  setActiveFilter: (filter: 'trending' | 'following') => void;
  showCreateModal: boolean;
  setShowCreateModal: (show: boolean) => void;
  showCreateScreen: boolean;
  setShowCreateScreen: (show: boolean) => void;
  isCommentModalVisible: boolean;
  selectedPostId: string | null;
  handleLike: (postId: string, currentlyLiked: boolean) => void;
  handleCommentPress: (postId: string) => void;
  handleCloseComments: () => void;
  handleCreatePost: () => void;
  handleAskQuestion: () => void;
  handlePostCreated: () => void;
  handleRefresh: () => void;
  handleLoadMore: () => void;
  likingPostId: string | null;
  user: any;
}

function CommunityScreenView({
  posts,
  isLoading,
  isRefreshing,
  isLoadingMore,
  fetchError,
  activeFilter,
  setActiveFilter,
  showCreateModal,
  setShowCreateModal,
  showCreateScreen,
  setShowCreateScreen,
  isCommentModalVisible,
  selectedPostId,
  handleLike,
  handleCommentPress,
  handleCloseComments,
  handleCreatePost,
  handleAskQuestion,
  handlePostCreated,
  handleRefresh,
  handleLoadMore,
  likingPostId,
  user,
}: CommunityScreenViewProps) {
  const { theme, isDarkMode } = useTheme();

  const renderItem = useMemo(
    () =>
      ({ item }: { item: PostData }) => (
        <View className="px-3">
          <PostItem
            post={item}
            currentUserId={user?.id}
            onLike={handleLike}
            onComment={handleCommentPress}
            onUserPress={() => {}}
            liking={likingPostId === item.id}
          />
        </View>
      ),
    [user, handleLike, handleCommentPress, likingPostId]
  );

  const renderEmptyState = useMemo(
    () => (
      <ThemedView className="flex-1 items-center justify-center px-8 py-20">
        <Ionicons
          name="leaf-outline"
          size={50}
          color={isDarkMode ? theme.colors.neutral[600] : theme.colors.neutral[400]}
          style={{ marginBottom: 16 }}
        />
        <ThemedText
          className="mb-2 text-center text-lg font-bold"
          darkClassName="text-neutral-300"
          lightClassName="text-neutral-700"
        >
          No Posts Yet
        </ThemedText>
        <ThemedText
          className="mb-8 text-center"
          darkClassName="text-neutral-400"
          lightClassName="text-neutral-500"
        >
          Be the first to share your plants or ask a question!
        </ThemedText>
        <TouchableOpacity
          onPress={() => setShowCreateModal(true)}
          className="rounded-full px-6 py-3"
          style={{ backgroundColor: theme.colors.primary[500] }}
          accessibilityLabel="Create Post"
          accessibilityRole="button"
        >
          <ThemedText className="font-bold text-white">Create Post</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    ),
    [isDarkMode, theme, setShowCreateModal]
  );

  return (
    <ThemedView className="flex-1" lightClassName="bg-neutral-50" darkClassName="bg-black">
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmptyState}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary[500]]}
            tintColor={theme.colors.primary[500]}
            progressBackgroundColor={
              isDarkMode ? theme.colors.neutral[800] : theme.colors.neutral[100]
            }
          />
        }
      />

      {/* Floating action button */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full shadow-lg dark:shadow-neutral-900"
        style={{ backgroundColor: theme.colors.primary[500] }}
        onPress={() => setShowCreateModal(true)}
        accessibilityLabel="Create new post"
        accessibilityRole="button"
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>

      {/* Create post modal */}
      <CreatePostModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreatePost={handleCreatePost}
        onAskQuestion={handleAskQuestion}
      />

      {/* Create post screen */}
      <CreatePostScreen
        visible={showCreateScreen}
        onClose={() => setShowCreateScreen(false)}
        onSuccess={handlePostCreated}
      />

      {/* Comment Modal */}
      {selectedPostId && (
        <CommentModal
          postId={selectedPostId}
          isVisible={isCommentModalVisible}
          onClose={handleCloseComments}
        />
      )}
    </ThemedView>
  );
}

export default CommunityScreenView;
