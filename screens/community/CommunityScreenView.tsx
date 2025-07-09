import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { View, Text, RefreshControl } from 'react-native';
import { FlashList, ListRenderItemInfo } from '@shopify/flash-list';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  FadeIn,
  FadeInDown,
  SlideInUp,
  withSpring,
  withDelay,
  cancelAnimation,
} from 'react-native-reanimated';

// 🎯 Types
import { PostData, ContentType } from '../../lib/types/community';
import type { User } from '../../lib/types/user';

// 🧩 UI Components
import ThemedView from '../../components/ui/ThemedView';
import { OptimizedIcon } from '../../components/ui/OptimizedIcon';
import { FlashListWrapper } from '../../components/ui/FlashListWrapper';

// 🎭 Community Components
import CommunitySegmentedControl from '../../components/community/CommunitySegmentedControl';
import QuestionPostItem from '../../components/community/QuestionPostItem';
import PlantSharePostItem from '../../components/community/PlantSharePostItem';
import CreatePostModal from '../../components/community/CreatePostModal';
import CreatePostScreen from '../../components/community/CreatePostScreen';
import CommentModal from '../../components/community/CommentModal';
import ContextAwareFAB from '../../components/community/ContextAwareFAB';

// 🎯 Transforms
import {
  transformPostToQuestion,
  transformPostToPlantShare,
  isQuestionPost,
  isPlantSharePost,
} from '../../lib/utils/community-transforms';

// 🎛️ Utils
import { triggerMediumHapticSync } from '../../lib/utils/haptics';

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
  isOffline: boolean;
}

function CommunityScreenView({
  posts,
  isLoading,
  isRefreshing,
  fetchError,
  showCreateModal,
  setShowCreateModal,
  showCreateScreen,
  setShowCreateScreen,
  isCommentModalVisible,
  selectedPostId,
  handleLike,
  handleCommentPress,
  handleCloseComments,
  handlePostCreated,
  handleRefresh,
  handleLoadMore,
  likingPostId,
  user,
  isOffline,
}: CommunityScreenViewProps) {
  const [activePostFilter, setActivePostFilter] = useState<ContentType | 'all'>('all');
  const [selectedPostType, setSelectedPostType] = useState<'question' | 'plant_share' | null>(null);

  const filteredPosts = useMemo(() => {
    if (activePostFilter === 'all') {
      return posts;
    }
    return posts.filter((post) => {
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

  const handleFilterChange = (key: ContentType | 'all') => {
    setActivePostFilter(key);
  };

  const containerOpacity = useSharedValue(0);
  const fabScale = useSharedValue(0);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const animatedFabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  useEffect(() => {
    containerOpacity.value = withDelay(100, withSpring(1, { damping: 20, stiffness: 300 }));
    fabScale.value = withDelay(400, withSpring(1, { damping: 15, stiffness: 400 }));

    return () => {
      cancelAnimation(containerOpacity);
      cancelAnimation(fabScale);
    };
  }, []);

  const handleFabPress = useCallback(() => {
    if (isOffline) return;
    triggerMediumHapticSync();
    setShowCreateModal(true);
  }, [isOffline, setShowCreateModal]);

  const keyExtractor = useCallback((item: PostData) => item.id, []);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<PostData>) => {
      if (isQuestionPost(item)) {
        const questionData = transformPostToQuestion(item);
        return (
          <Animated.View entering={FadeInDown.delay(index * 50).duration(400).springify()} className="px-4">
            <QuestionPostItem
              question={questionData}
              onLike={handleLike}
              onComment={handleCommentPress}
              onUserPress={() => {}}
              liking={likingPostId === item.id}
            />
          </Animated.View>
        );
      }
      if (isPlantSharePost(item)) {
        const plantShareData = transformPostToPlantShare(item);
        return (
          <Animated.View entering={FadeInDown.delay(index * 50).duration(400).springify()} className="px-4">
            <PlantSharePostItem
              plantShare={plantShareData}
              onLike={handleLike}
              onComment={handleCommentPress}
              onUserPress={() => {}}
              liking={likingPostId === item.id}
            />
          </Animated.View>
        );
      }
      return null;
    },
    [handleLike, handleCommentPress, likingPostId]
  );

  const ListHeaderComponent = useMemo(
    () => (
      <View className="px-4 pb-4">
        <CommunitySegmentedControl
          activeSegment={activePostFilter}
          onSegmentChange={handleFilterChange}
          className="mb-2"
        />
      </View>
    ),
    [activePostFilter, handleFilterChange]
  );

  const renderEmptyState = useMemo(
    () => (
      <Animated.View entering={FadeIn.delay(200).duration(600)} className="flex-1 items-center justify-center px-8 py-20">
        <Animated.View
          entering={SlideInUp.delay(400).duration(500).springify()}
          className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/20"
        >
          <OptimizedIcon
            name={isOffline ? 'cloud-offline-outline' : 'leaf-outline'}
            size={40}
            className="text-primary-600 dark:text-primary-400"
          />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(600).duration(500)}>
          <Text className="mb-3 text-center text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {isOffline ? 'Community is Offline' : 'No Posts Yet'}
          </Text>
          <Text className="mb-8 text-center text-lg leading-6 text-neutral-600 dark:text-neutral-400">
            {isOffline
              ? 'Connect to the internet to view posts and interact with the community.'
              : 'Be the first to share your plants or ask a question!'}
          </Text>
        </Animated.View>
      </Animated.View>
    ),
    [isOffline]
  );

  const ListRender = useMemo(
    () => (
      <FlashListWrapper<PostData>
        data={filteredPosts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={renderEmptyState}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.8}
        estimatedItemSize={200}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
      />
    ),
    [filteredPosts, isRefreshing, renderItem, ListHeaderComponent, renderEmptyState, handleRefresh, handleLoadMore, keyExtractor]
  );

  return (
    <ThemedView className="flex-1">
      <Animated.View style={[animatedContainerStyle, { flex: 1 }]}>{ListRender}</Animated.View>

      {!isOffline && (
        <Animated.View style={animatedFabStyle} className="absolute bottom-20 right-6">
          <ContextAwareFAB
            activeFilter={activePostFilter}
            onPress={handleFabPress}
          />
        </Animated.View>
      )}


      {user && (
        <CreatePostModal
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onAskQuestion={() => {
            setShowCreateModal(false);
            setSelectedPostType('question');
            setShowCreateScreen(true);
          }}
          onCreatePost={() => {
            setShowCreateModal(false);
            setSelectedPostType('plant_share');
            setShowCreateScreen(true);
          }}
        />
      )}

      {user && selectedPostType && (
        <CreatePostScreen
          visible={showCreateScreen}
          onClose={() => {
            setShowCreateScreen(false);
            setSelectedPostType(null);
          }}
          onSuccess={handlePostCreated}
          postType={selectedPostType}
        />
      )}

      {selectedPostId && (
        <CommentModal
          postId={selectedPostId}
          isVisible={isCommentModalVisible}
          onClose={handleCloseComments}
          onCommentAdded={handlePostCreated}
        />
      )}
    </ThemedView>
  );
}

export default React.memo(CommunityScreenView);
