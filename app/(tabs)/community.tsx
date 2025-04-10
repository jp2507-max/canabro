import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router'; // Correctly import useRouter
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, TouchableOpacity, View, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import CommentModal from '../../components/community/CommentModal'; // Import CommentModal
import CreatePostModal from '../../components/community/CreatePostModal';
import CreatePostScreen from '../../components/community/CreatePostScreen';
// Import the refactored PostItem and its data type
import PostItem, { PostData } from '../../components/community/PostItem';
// Removed TopicList and UserAvatar imports from here
import ThemedText from '../../components/ui/ThemedText';
import ThemedView from '../../components/ui/ThemedView';
import { useAuth } from '../../lib/contexts/AuthProvider';
// Removed WatermelonDB imports (useDatabase, Q, withObservables, Post model)
import { useTheme } from '../../lib/contexts/ThemeContext';
import { useProtectedRoute } from '../../lib/hooks/useProtectedRoute';
import supabase from '../../lib/supabase';
import { PostgrestError } from '@supabase/supabase-js';
// Removed UserAvatar import

// Constants
const PAGE_SIZE = 10; // Number of posts to fetch per page

// Removed TOPICS constant

/**
 * Community screen component using Supabase for data.
 */
function CommunityScreen() {
  useProtectedRoute();
  const { theme, isDarkMode } = useTheme();
  const { user, session } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter(); // Correctly call useRouter

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateScreen, setShowCreateScreen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'trending' | 'following'>('trending'); // State for filter tabs

  // --- Comment Modal State ---
  const [isCommentModalVisible, setIsCommentModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  // --- Supabase Data Fetching State ---
  const [posts, setPosts] = useState<PostData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // --- Like/Unlike State ---
  const [likingPostId, setLikingPostId] = useState<string | null>(null); // Track which post like is in progress

  // --- Supabase Query Function ---
  const fetchPosts = useCallback(
    async (page: number, refreshing = false) => {
      if (!session) return; // Need user session for auth.uid()

      const limit = PAGE_SIZE;
      const offset = page * limit;

      console.log(`Fetching posts: page=${page}, offset=${offset}, limit=${limit}`);

      try {
        // Use standard select instead of RPC
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select(`
            *,
            profiles ( username, avatar_url )
          `) // Select post fields and profile fields
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (postsError) {
          throw postsError;
        }

        if (!postsData) {
          setPosts(refreshing ? [] : posts); // Keep existing posts if data is null/undefined
          setHasMore(false);
          setFetchError(null);
          console.log('No posts data returned.');
          return; // Exit early
        }
        
        // Instead of filtering out posts with old images, we'll keep all posts
        // but mark the ones with potentially problematic images
        const filteredPostsData = postsData.map(post => {
          if (!post.image_url) {
            // No image, no problem
            return { ...post, hasCorruptedImage: false };
          }
          
          // Try to determine if this is a new image (uploaded with ArrayBuffer method)
          // or an old potentially corrupted one
          try {
            const parts = post.image_url.split('_');
            if (parts.length > 1) {
              const lastPart = parts[parts.length - 1];
              const timestamp = parseInt(lastPart.split('.')[0] || '0'); // Define timestamp here
              const now = Date.now();
              const isNewImage = timestamp > (now - 24 * 60 * 60 * 1000); // Within last 24 hours
              
              return { ...post, hasCorruptedImage: !isNewImage };
            }
          } catch (e) {
            console.log('Error parsing image timestamp:', e);
          }
          
          // If we can't determine, assume it might be corrupted but still show it
          return { ...post, hasCorruptedImage: true };
        });
        
        // Don't filter out any posts, just mark them
        
        console.log(`Fetched ${postsData.length} posts, processed ${filteredPostsData.length} posts.`);

        // Fetch likes for the current user for these posts
        const postIds = filteredPostsData.map(p => p.id);
        let likedPostIds = new Set<string>(); // Default to empty set

        if (postIds.length > 0 && session?.user?.id) { // Check if there are posts and user is logged in
          const { data: likesData, error: likesError } = await supabase
            .from('likes')
            .select('post_id')
            .in('post_id', postIds)
            .eq('user_id', session.user.id);

          if (likesError) {
            console.warn('Could not fetch user likes:', likesError.message);
            // Continue without like status if this fails
          } else {
            likedPostIds = new Set((likesData || []).map(l => l.post_id));
          }
        }

        // Process data: Map db results to PostData interface
        const newPosts = filteredPostsData.map((post): PostData => {
          const profile = post.profiles || {};
          return {
            id: post.id,
            content: post.content,
            image_url: post.image_url, // Ensure image_url is mapped
            created_at: post.created_at,
            likes_count: post.likes_count || 0,
            comments_count: post.comments_count || 0,
            profiles: profile ? {
              id: post.user_id, // Assuming user_id on post matches profile id
              username: profile.username || 'Unknown',
              avatar_url: profile.avatar_url,
            } : null,
            user_has_liked: likedPostIds.has(post.id), // Determine like status
            hasCorruptedImage: post.hasCorruptedImage || false, // Pass the corruption flag
          };
        });

        setPosts((prevPosts) => (refreshing ? newPosts : [...prevPosts, ...newPosts]));
        setHasMore(newPosts.length === limit);
        setFetchError(null);

      } catch (err: any) {
        console.error('Error fetching posts:', err);
        const errorMessage = (err as PostgrestError)?.message || 'Failed to fetch posts';
        setFetchError(errorMessage);
        // Don't wipe posts on error during load more or refresh
        // setPosts([]); // Avoid clearing posts on error
      }
    },
    [session] // Depend on session
  );

  // --- Initial Load ---
  useState(() => {
    setIsLoading(true);
    fetchPosts(0, true).finally(() => setIsLoading(false));
  });

  // --- Refresh Handler ---
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setCurrentPage(0); // Reset page
    await fetchPosts(0, true);
    setIsRefreshing(false);
  }, [fetchPosts, isRefreshing]);

  // --- Load More Handler ---
  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || !hasMore || isRefreshing || isLoading) return;

    console.log('Loading more posts...');
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    fetchPosts(nextPage)
      .then(() => {
        setCurrentPage(nextPage);
      })
      .finally(() => {
        setIsLoadingMore(false);
      });
  }, [isLoadingMore, hasMore, isRefreshing, isLoading, currentPage, fetchPosts]);

  // --- Like/Unlike Handler (Direct RPC Call) ---
  const handleLike = async (postId: string, currentlyLiked: boolean) => {
    if (likingPostId === postId || !session) return; // Prevent double-taps or liking when not logged in

    setLikingPostId(postId); // Indicate liking is in progress for this post

    // --- Optimistic Update ---
    setPosts((prevPosts) =>
      prevPosts.map((p) =>
        p.id === postId
          ? {
              ...p,
              user_has_liked: !currentlyLiked,
              likes_count: currentlyLiked ? p.likes_count - 1 : p.likes_count + 1,
            }
          : p
      )
    );

    try {
      // Call the appropriate RPC function
      const functionName = currentlyLiked ? 'unlike_post' : 'like_post';
      const { error: likeError } = await supabase.rpc(functionName, { _post_id: postId });

      if (likeError) {
        throw likeError; // Throw error to trigger catch block
      }

      // Success: Optimistic update is already correct
      console.log('Successfully ' + (currentlyLiked ? 'unliked' : 'liked') + ' post: ' + postId);
    } catch (err) {
      console.error('Error toggling like:', err);

      // --- Revert Optimistic Update on Error ---
      setPosts((prevPosts) =>
        prevPosts.map((p) =>
          p.id === postId
            ? {
                ...p,
                user_has_liked: currentlyLiked, // Revert like status
                likes_count: currentlyLiked ? p.likes_count + 1 : p.likes_count - 1, // Revert count
              }
            : p
        )
      );

      // Show user feedback
      Alert.alert('Error', 'Could not ' + (currentlyLiked ? 'unlike' : 'like') + ' the post. Please try again.');
    } finally {
      setLikingPostId(null); // Reset liking state for this post
    }
  };

  // --- Navigation Handlers ---
  // Removed handleTopicPress

  const handleUserPress = (userId: string) => {
    router.push(`/profile/${userId}` as any);
  };

  // --- Comment Modal Handlers ---
  const handleOpenComments = (postId: string) => {
    setSelectedPostId(postId);
    setIsCommentModalVisible(true);
  };

  const handleCloseComments = () => {
    setIsCommentModalVisible(false);
    setSelectedPostId(null);
  };

  // Update handleCommentPress to use handleOpenComments
  const handleCommentPress = (postId: string) => {
    handleOpenComments(postId);
  };

  // --- Create Post Handlers ---
  const handleCreatePost = () => {
    setShowCreateModal(false);
    setShowCreateScreen(true);
  };

  const handleAskQuestion = () => {
    setShowCreateModal(false);
    setShowCreateScreen(true); // TODO: Differentiate later if needed
  };

  const handlePostCreated = () => {
    // Refresh the feed to show the new post
    handleRefresh();
  };

  // --- Render Functions ---
  // Removed renderHeader function entirely

  const renderListHeader = () => (
    // This component renders the filter tabs and chat icon
    <View className="flex-row items-center justify-between px-4 py-3 mb-2">
      {/* Filter Tabs Container */}
      <View className="flex-row">
        <TouchableOpacity
          onPress={() => setActiveFilter('trending')}
          className="rounded-full px-4 py-1.5 mr-2"
        style={{
          backgroundColor: activeFilter === 'trending'
            ? isDarkMode ? theme.colors.primary[600] : theme.colors.primary[500]
            : isDarkMode ? theme.colors.neutral[700] : theme.colors.neutral[200]
        }}>
        <ThemedText
          className="font-medium"
          style={{
            color: activeFilter === 'trending'
              ? '#FFFFFF'
              : isDarkMode ? theme.colors.neutral[200] : theme.colors.neutral[700]
          }}>
          Trending
        </ThemedText>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setActiveFilter('following')}
        className="rounded-full px-4 py-1.5"
        style={{
          backgroundColor: activeFilter === 'following'
            ? isDarkMode ? theme.colors.primary[600] : theme.colors.primary[500]
            : isDarkMode ? theme.colors.neutral[700] : theme.colors.neutral[200]
          }}>
          <ThemedText
            className="font-medium"
            style={{
              color: activeFilter === 'following'
                ? '#FFFFFF'
                : isDarkMode ? theme.colors.neutral[200] : theme.colors.neutral[700]
            }}>
            Following
          </ThemedText>
        </TouchableOpacity>
        {/* Add other filters like Events, Insights later if needed */}
      </View>

      {/* Chat Icon */}
      <Pressable onPress={() => console.log('Chat pressed')}>
        {({ pressed }) => (
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={28}
            color={isDarkMode ? theme.colors.neutral[300] : theme.colors.neutral[600]}
            style={{ opacity: pressed ? 0.5 : 1 }}
          />
        )}
      </Pressable>
    </View>
  );


  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View className="py-6">
        <ActivityIndicator size="small" color={theme.colors.primary[500]} />
      </View>
    );
  };

  const renderEmptyState = () => {
    // Show loading indicator during initial load
    if (isLoading) {
      return (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      );
    }
    // Show error message if fetch failed
    if (fetchError) {
      return (
        <ThemedView className="flex-1 items-center justify-center py-20 px-8">
          <Ionicons name="alert-circle-outline" size={50} color={theme.colors.status.danger} style={{ marginBottom: 16 }} />
          <ThemedText className="mb-2 text-center text-lg font-bold" darkClassName="text-red-400" lightClassName="text-red-600">
            Error Loading Posts
          </ThemedText>
          <ThemedText className="mb-4 text-center" darkClassName="text-neutral-400" lightClassName="text-neutral-600">
            {fetchError}
          </ThemedText>
          <TouchableOpacity
            onPress={handleRefresh}
            className="rounded-full px-6 py-3"
            style={{ backgroundColor: theme.colors.primary[500] }}>
            <ThemedText className="font-bold text-white">Try Again</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      );
    }
    // Show empty state if no posts and no error
    return (
      <ThemedView className="flex-1 items-center justify-center py-20 px-8">
        <Ionicons
          name="leaf-outline"
          size={50}
          color={isDarkMode ? theme.colors.neutral[600] : theme.colors.neutral[400]}
          style={{ marginBottom: 16 }}
        />
        <ThemedText className="mb-2 text-center text-lg font-bold" darkClassName="text-neutral-300" lightClassName="text-neutral-700">
          No Posts Yet
        </ThemedText>
        <ThemedText className="mb-8 text-center" darkClassName="text-neutral-400" lightClassName="text-neutral-500">
          Be the first to share your plants or ask a question!
        </ThemedText>
        <TouchableOpacity
          onPress={() => setShowCreateModal(true)}
          className="rounded-full px-6 py-3"
          style={{ backgroundColor: theme.colors.primary[500] }}>
          <ThemedText className="font-bold text-white">Create Post</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-black">
      {/* Apply background color to SafeAreaView */}
      <ThemedView className="flex-1" lightClassName="bg-neutral-50" darkClassName="bg-black">
        {/* Removed absolutely positioned header icon */}

        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          extraData={posts} // Add extraData prop tied to the posts state
          renderItem={({ item }) => ( // Corrected implicit return syntax
            <View className="px-3">
              <PostItem
                post={item}
                currentUserId={user?.id}
                onLike={handleLike}
                onComment={handleCommentPress}
                onUserPress={handleUserPress}
              />
            </View>
          )} // Correct closing for renderItem
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={{ paddingBottom: 80 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary[500]]} // Spinner color for Android
              tintColor={theme.colors.primary[500]} // Spinner color for iOS
              progressBackgroundColor={isDarkMode ? theme.colors.neutral[800] : theme.colors.neutral[100]} // Background for spinner
            />
          }
        />

        {/* Floating action button */}
        <TouchableOpacity
          className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full shadow-lg dark:shadow-neutral-900"
          style={{ backgroundColor: theme.colors.primary[500] }}
          onPress={() => setShowCreateModal(true)}
          accessibilityLabel="Create new post"
          accessibilityRole="button">
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
          onSuccess={handlePostCreated} // Refresh feed on success
        />

        {/* Comment Modal */}
        {selectedPostId && ( // Only render if a post is selected
          <CommentModal
            postId={selectedPostId}
            isVisible={isCommentModalVisible}
            onClose={handleCloseComments}
          />
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

// Export the component directly (no HOC needed)
export default CommunityScreen;
