import * as Haptics from 'expo-haptics';
import React, { useMemo, useEffect } from 'react';
import { FlatList, View, RefreshControl } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  cancelAnimation,
} from 'react-native-reanimated';

import CommentModal from '../../components/community/CommentModal';
import CreatePostModal from '../../components/community/CreatePostModal';
import CreatePostScreen from '../../components/community/CreatePostScreen';
import PostItem from '../../components/community/PostItem';
import type { PostData } from '../../components/community/PostItem';
import FloatingActionButton from '../../components/ui/FloatingActionButton';
import { OptimizedIcon } from '../../components/ui/OptimizedIcon';
import ThemedText from '../../components/ui/ThemedText';

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
  // 🎬 Enhanced Animation System with Entrance Sequences
  const containerOpacity = useSharedValue(0);
  const fabScale = useSharedValue(0);

  const animatedContainerStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: containerOpacity.value,
    };
  });

  const animatedFabStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: fabScale.value }],
    };
  });

  // 🎯 Initialize entrance animations
  useEffect(() => {
    containerOpacity.value = withDelay(100, withSpring(1, { damping: 20, stiffness: 300 }));
    fabScale.value = withDelay(400, withSpring(1, { damping: 15, stiffness: 400 }));

    return () => {
      // Cancel any ongoing animations
      cancelAnimation(containerOpacity);
      cancelAnimation(fabScale);
    };
  }, []);

  // 🎯 Enhanced FAB press handler with haptic feedback
  const handleFabPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowCreateModal(true);
  };

  // 🎯 Performance optimized render functions with React.useCallback
  const keyExtractor = React.useCallback((item: PostData) => item.id, []);

  const renderItem = React.useCallback(
    ({ item, index }: { item: PostData; index: number }) => (
      <Animated.View
        entering={FadeInDown.delay(index * 50)
          .duration(400)
          .springify()}
        className="px-4">
        <PostItem
          post={item}
          currentUserId={user?.id}
          onLike={handleLike}
          onComment={handleCommentPress}
          onUserPress={() => {}}
          liking={likingPostId === item.id}
        />
      </Animated.View>
    ),
    [user, handleLike, handleCommentPress, likingPostId]
  );

  const renderEmptyState = useMemo(
    () => (
      <Animated.View
        entering={FadeIn.delay(200).duration(600)}
        className="flex-1 items-center justify-center px-8 py-20">
        <Animated.View
          entering={SlideInUp.delay(400).duration(500).springify()}
          className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/20">
          <OptimizedIcon
            name="leaf-outline"
            size={40}
            className="text-primary-600 dark:text-primary-400"
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(600).duration(500)}>
          <ThemedText className="mb-3 text-center text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            No Posts Yet
          </ThemedText>
          <ThemedText className="mb-8 text-center text-lg leading-6 text-neutral-600 dark:text-neutral-400">
            Be the first to share your plants or ask a question!
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(800).duration(500)}>
          <FloatingActionButton
            onPress={handleFabPress}
            iconName="add"
            size={56}
            className="bg-primary-500 dark:bg-primary-600"
            accessibilityLabel="Create Post"
          />
        </Animated.View>
      </Animated.View>
    ),
    [handleFabPress]
  );

  const renderLoadingState = useMemo(
    () => (
      <Animated.View entering={FadeIn.duration(300)} className="flex-1 items-center justify-center">
        <View className="items-center">
          <View className="mb-4 h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/20">
            <OptimizedIcon
              name="leaf"
              size={24}
              className="text-primary-600 dark:text-primary-400"
            />
          </View>
          <ThemedText className="text-lg font-medium text-neutral-600 dark:text-neutral-400">
            Loading posts...
          </ThemedText>
        </View>
      </Animated.View>
    ),
    []
  );

  const renderErrorState = useMemo(
    () => (
      <Animated.View
        entering={FadeIn.duration(300)}
        className="flex-1 items-center justify-center px-8">
        <View className="items-center">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <OptimizedIcon
              name="warning-outline"
              size={32}
              className="text-red-600 dark:text-red-400"
            />
          </View>
          <ThemedText className="mb-2 text-center text-xl font-bold text-neutral-900 dark:text-neutral-100">
            Something went wrong
          </ThemedText>
          <ThemedText className="mb-6 text-center text-base text-neutral-600 dark:text-neutral-400">
            {fetchError || 'Failed to load posts. Please try again.'}
          </ThemedText>
          <FloatingActionButton
            onPress={handleRefresh}
            iconName="camera-flip-outline"
            size={48}
            className="bg-primary-500 dark:bg-primary-600"
            accessibilityLabel="Retry loading posts"
          />
        </View>
      </Animated.View>
    ),
    [fetchError, handleRefresh]
  );

  return (
    <Animated.View style={animatedContainerStyle} className="flex-1 bg-neutral-50 dark:bg-black">
      {isLoading && posts.length === 0 ? (
        renderLoadingState
      ) : fetchError && posts.length === 0 ? (
        renderErrorState
      ) : (
        <>
          <FlatList
            data={posts}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            ListEmptyComponent={renderEmptyState}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            contentContainerStyle={{
              paddingBottom: 100,
              paddingTop: 8,
            }}
            className="flex-1"
            showsVerticalScrollIndicator={false}
            // ⚡ Reanimated v3 + FlatList performance optimizations
            initialNumToRender={8}
            windowSize={10}
            maxToRenderPerBatch={5}
            updateCellsBatchingPeriod={100}
            removeClippedSubviews={true}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={['#10b981']}
                tintColor="#10b981"
                progressBackgroundColor="transparent"
                className="bg-transparent"
              />
            }
          />

          {/* 🚀 Enhanced Floating Action Button with Sophisticated Animations */}
          {posts.length > 0 && (
            <Animated.View style={animatedFabStyle} className="absolute bottom-6 right-6">
              <FloatingActionButton
                onPress={handleFabPress}
                iconName="add"
                size={64}
                className="bg-primary-500 shadow-lg shadow-primary-500/25 dark:bg-primary-600"
                accessibilityLabel="Create new post"
              />
            </Animated.View>
          )}
        </>
      )}

      {/* 🎯 Enhanced Create Post Modal */}
      <CreatePostModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreatePost={handleCreatePost}
        onAskQuestion={handleAskQuestion}
      />

      {/* Create Post Screen */}
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
    </Animated.View>
  );
}

export default React.memo(CommunityScreenView);
