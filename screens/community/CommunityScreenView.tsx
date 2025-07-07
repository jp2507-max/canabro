import React, { useMemo, useEffect, useState } from 'react';
import { View, RefreshControl, Text } from 'react-native';
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
import {
  CommunitySegmentedControl,
  QuestionPostItem,
  PlantSharePostItem,
  ContextAwareFAB,
} from '../../components/community';
import PostItem from '../../components/community/PostItem';
import FloatingActionButton from '../../components/ui/FloatingActionButton';
import { AnimatedFlashList } from '../../components/ui/FlashListWrapper';
import { OptimizedIcon } from '../../components/ui/OptimizedIcon';
import { triggerMediumHapticSync } from '../../lib/utils/haptics';
import type { User } from '../../lib/types/user';
import type { ContentType, PostData } from '../../lib/types/community';
import { 
  transformPostToQuestion, 
  transformPostToPlantShare, 
  isQuestionPost, 
  isPlantSharePost 
} from '../../lib/utils/community-transforms';

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
  handleDeletePost?: (postId: string) => void;
  handleCloseComments: () => void;
  handlePostCreated: () => void;
  handleRefresh: () => void;
  handleLoadMore: () => void;
  likingPostId: string | null;
  deletingPostId?: string | null;
  user: User | null;
}

function CommunityScreenView({
  posts,
  isLoading,
  isRefreshing,
  isLoadingMore: _isLoadingMore,
  fetchError,
  activeFilter: _activeFilter,
  setActiveFilter: _setActiveFilter,
  showCreateModal,
  setShowCreateModal,
  showCreateScreen,
  setShowCreateScreen,
  isCommentModalVisible,
  selectedPostId,
  handleLike,
  handleCommentPress,
  handleDeletePost,
  handleCloseComments,
  handlePostCreated,
  handleRefresh,
  handleLoadMore,
  likingPostId,
  deletingPostId,
  user,
}: CommunityScreenViewProps) {
  // 🎛️ Post filtering state
  const [activePostFilter, setActivePostFilter] = useState<ContentType | 'all'>('all');
  
  // 🎯 Post type state for create screen
  const [selectedPostType, setSelectedPostType] = useState<'question' | 'plant_share' | null>(null);

  // 🎯 Filter posts based on active filter
  const filteredPosts = useMemo(() => {
    if (activePostFilter === 'all') {
      return posts;
    }
    
    return posts.filter(post => {
      // Default post_type to 'general' for existing posts
      const postType = post.post_type || 'general';
      
      if (activePostFilter === 'questions') {
        return postType === 'question';
      }
      if (activePostFilter === 'plant_shares') {
        return postType === 'plant_share';
      }
      return true;
    });
  }, [posts, activePostFilter]);

  // 🎯 Handle filter selection
  const handleFilterChange = (key: ContentType | 'all') => {
    setActivePostFilter(key);
  };
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

  // 🎯 Enhanced FAB press handler with context-aware behavior
  const handleFabPress = React.useCallback(() => {
    // Handle haptic feedback safely
    triggerMediumHapticSync();
    setShowCreateModal(true);
  }, [setShowCreateModal]);

  // 🎯 Performance optimized render functions with React.useCallback
  const keyExtractor = React.useCallback((item: unknown) => {
    const post = item as PostData;
    return post.id;
  }, []);

  const renderItem = React.useCallback(
    ({ item, index }: { item: unknown; index: number }) => {
      const post = item as PostData;
      
      // Determine post type and render appropriate component
      if (isQuestionPost(post)) {
        const question = transformPostToQuestion(post);

        return (
          <Animated.View
            entering={FadeInDown.delay(index * 50).duration(400).springify()}
          >
            <QuestionPostItem
              question={question}
              onLike={handleLike}
              onComment={handleCommentPress}
              onUserPress={() => {}}
              liking={likingPostId === post.id}
            />
          </Animated.View>
        );
      } else if (isPlantSharePost(post)) {
        const plantShare = transformPostToPlantShare(post);

        return (
          <Animated.View
            entering={FadeInDown.delay(index * 50).duration(400).springify()}
          >
            <PlantSharePostItem
              plantShare={plantShare}
              onLike={handleLike}
              onComment={handleCommentPress}
              onUserPress={() => {}}
              liking={likingPostId === post.id}
            />
          </Animated.View>
        );
      } else {
        // Fallback to generic PostItem for other types
        return (
          <Animated.View
            entering={FadeInDown.delay(index * 50).duration(400).springify()}
            className="px-4">
            <PostItem
              post={post}
              currentUserId={user?.id}
              onLike={handleLike}
              onComment={handleCommentPress}
              onDelete={handleDeletePost}
              onUserPress={() => {}}
              liking={likingPostId === post.id}
              deleting={deletingPostId === post.id}
            />
          </Animated.View>
        );
      }
    },
    [user, handleLike, handleCommentPress, handleDeletePost, likingPostId, deletingPostId]
  );

  // 🎛️ Header component with segmented control
  const ListHeaderComponent = React.useMemo(() => (
    <View className="px-4 pb-4">
      <CommunitySegmentedControl
        activeSegment={activePostFilter}
        onSegmentChange={handleFilterChange}
        className="mb-2"
      />
    </View>
  ), [activePostFilter, handleFilterChange]);

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
          <Text className="mb-3 text-center text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            No Posts Yet
          </Text>
          <Text className="mb-8 text-center text-lg leading-6 text-neutral-600 dark:text-neutral-400">
            Be the first to share your plants or ask a question!
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(800).duration(500)}>
          <ContextAwareFAB
            activeFilter={activePostFilter}
            onPress={handleFabPress}
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
          <Text className="text-lg font-medium text-neutral-600 dark:text-neutral-400">
            Loading posts...
          </Text>
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
          <Text className="mb-2 text-center text-xl font-bold text-neutral-900 dark:text-neutral-100">
            Something went wrong
          </Text>
          <Text className="mb-6 text-center text-base text-neutral-600 dark:text-neutral-400">
            {fetchError || 'Failed to load posts. Please try again.'}
          </Text>
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
          <AnimatedFlashList
            data={filteredPosts}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            ListEmptyComponent={renderEmptyState}
            ListHeaderComponent={ListHeaderComponent}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            estimatedItemSize={450}
            contentContainerStyle={{
              paddingBottom: 100,
              paddingTop: 8,
            }}
            className="flex-1"
            showsVerticalScrollIndicator={false}
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

          {/* 🚀 Enhanced Context-Aware FAB */}
          {filteredPosts.length > 0 && (
            <Animated.View style={animatedFabStyle} className="absolute bottom-20 right-6">
              <ContextAwareFAB
                activeFilter={activePostFilter}
                onPress={handleFabPress}
              />
            </Animated.View>
          )}
        </>
      )}

      {/* Create Post Modal */}
      <CreatePostModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreatePost={() => {
          setShowCreateModal(false);
          setSelectedPostType('plant_share');
          setShowCreateScreen(true);
        }}
        onAskQuestion={() => {
          setShowCreateModal(false);
          setSelectedPostType('question');
          setShowCreateScreen(true);
        }}
      />

      {/* Create Post Screen */}
      <CreatePostScreen
        visible={showCreateScreen}
        onClose={() => {
          setShowCreateScreen(false);
          setSelectedPostType(null);
        }}
        onSuccess={handlePostCreated}
        postType={selectedPostType}
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
