import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CreatePostModal from '../../components/community/CreatePostModal';
import CreatePostScreen from '../../components/community/CreatePostScreen';
import PostItem from '../../components/community/PostItem';
import TopicList from '../../components/community/TopicList';
import UserAvatar from '../../components/community/UserAvatar';
import ThemedText from '../../components/ui/ThemedText';
import ThemedView from '../../components/ui/ThemedView';
import { useAuth } from '../../lib/contexts/AuthProvider';
import { useDatabase } from '../../lib/contexts/DatabaseProvider'; // Import useDatabase instead of using withDatabase HOC
import { useTheme } from '../../lib/contexts/ThemeContext';
// import { useCommunityPosts } from '../../lib/hooks/useCommunityPosts'; // Removed hook
import { useProtectedRoute } from '../../lib/hooks/useProtectedRoute';
// import { useProfileData } from '../../lib/hooks/useProfileData'; // Keep for avatar for now, or fetch profile via WDB relation in PostItem
// WatermelonDB imports
import { Post } from '../../lib/models/Post'; // Import WatermelonDB Post model

// Topic tags for the horizontal scroll
const TOPICS = [
  { id: '1', name: 'wishlistplant', count: 22 },
  { id: '2', name: 'indoorplants', count: 56 },
  { id: '3', name: 'plantparent', count: 34 },
  { id: '4', name: 'monstera', count: 41 },
  { id: '5', name: 'succulents', count: 29 },
  { id: '6', name: 'growlights', count: 18 },
];

// Define props injected by HOCs
interface InjectedProps {
  posts: Post[];
}

/**
 * Base Community screen component
 */
function CommunityScreenBase({ posts }: InjectedProps) {
  useProtectedRoute(); // Keep protected route logic
  const { theme } = useTheme();
  const { user } = useAuth(); // Keep auth context
  // const { profile } = useProfileData(); // Maybe fetch profile via Post relation later
  const { database, sync, isSyncing } = useDatabase(); // Get database from DatabaseProvider context

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateScreen, setShowCreateScreen] = useState(false);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  // const [expandedImage, setExpandedImage] = useState<{ url: string; index: number } | null>(null); // Unused state

  // Removed useCommunityPosts hook and its state variables (loading, refreshing, hasMore, etc.)
  // const { posts, loading, refreshing, hasMore, loadMore, refresh, like, addPost } = useCommunityPosts();

  // Handle topic selection
  const handleTopicPress = (topicId: string) => {
    if (activeTopic === topicId) {
      setActiveTopic(null); // Deselect if already active
    } else {
      setActiveTopic(topicId);
    }
  };

  // Handle user profile navigation
  const handleUserPress = (userId: string) => {
    // Use any type assertion to avoid TypeScript errors with dynamic routes
    router.push(`/profile/${userId}` as any);
  };

  // Handle plant detail navigation
  const handlePlantPress = (plantId: string) => {
    // Use any type assertion to avoid TypeScript errors with dynamic routes
    router.push(`/plant/${plantId}` as any);
  };

  // Handle create post actions
  const handleCreatePost = () => {
    setShowCreateModal(false);
    setShowCreateScreen(true);
  };

  const handleAskQuestion = () => {
    setShowCreateModal(false);
    // TODO: Navigate to question asking screen
    // For now, just open the regular post screen
    setShowCreateScreen(true);
  };

  // Called after CreatePostScreen successfully creates a post
  const handlePostCreated = () => {
    // Optionally trigger sync after local creation
    sync();
  };

  // Reimplement like action using the @writer method on the Post model
  // Add explicit type for postId
  const handleLike = async (postId: string) => {
    console.log('Attempting WatermelonDB like for post:', postId);
    try {
      // Find the post first
      const post = await database.get<Post>('posts').find(postId);
      // Call the @writer method directly on the post instance
      await post.incrementLikes();

      // Optional: Trigger sync after successful write if needed immediately
      // await sync();
    } catch (error) {
      console.error('Error liking post via WatermelonDB:', error);
      // Optionally show an alert to the user
      // Alert.alert("Error", "Could not like the post.");
    }
  };

  // Reimplement refresh action
  const handleRefresh = async () => {
    console.log('Manual sync triggered on community refresh');
    await sync({ force: true, showFeedback: true }); // Force sync with backend
  };

  // Render the header with user avatar and topics
  const renderHeader = () => (
    <>
      <ThemedView className="flex-row items-center justify-between p-4">
        <ThemedText className="text-2xl font-bold">Community</ThemedText>
        <TouchableOpacity onPress={() => handleUserPress(user?.id || '')}>
          <UserAvatar
            // TODO: Get avatar from user context or fetch profile via relation
            uri="https://via.placeholder.com/40"
            verified={false}
          />
        </TouchableOpacity>
      </ThemedView>

      <TopicList topics={TOPICS} activeTopic={activeTopic} onTopicPress={handleTopicPress} />
    </>
  );

  // Render empty state when no posts are available
  // Loading is handled implicitly by withObservables (renders empty/null initially)
  const renderEmptyState = () => {
    // Can add a loading indicator if posts is null/undefined initially if desired
    // if (posts === null) return <ActivityIndicator />;

    return (
      <ThemedView className="flex-1 items-center justify-center py-20">
        <Ionicons
          name="leaf-outline"
          size={50}
          color={theme.colors.neutral[400]}
          style={{ marginBottom: 16 }}
        />
        <ThemedText className="mb-2 text-center text-lg font-bold">No Posts Yet</ThemedText>
        <ThemedText className="mb-8 px-8 text-center text-neutral-500">
          Be the first to share your plants with the community!
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
    <SafeAreaView className="flex-1" edges={['top']}>
      <ThemedView className="flex-1" lightClassName="bg-neutral-100" darkClassName="bg-neutral-950">
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          renderItem={({ item }) => (
            <PostItem
              post={item} // Pass the WatermelonDB Post model instance
              onLike={handleLike} // Use new handler
              onComment={(postId: string) => router.push(`/post/${postId}` as any)} // Add type for postId
              onUserPress={handleUserPress}
              onPlantPress={handlePlantPress}
              // Add explicit types for url and index
              // onImagePress={(url: string, index: number) => setExpandedImage({ url, index })} // Removed as expandedImage state is unused
            />
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={isSyncing} // Use isSyncing state
              onRefresh={handleRefresh} // Use new handler
              colors={[theme.colors.primary[500]]}
              tintColor={theme.colors.primary[500]}
            />
          }
          // Removed onEndReached and related props for pagination
        />

        {/* Floating action button */}
        <TouchableOpacity
          className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full shadow-lg"
          style={{ backgroundColor: theme.colors.primary[500] }}
          onPress={() => setShowCreateModal(true)}>
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
      </ThemedView>
    </SafeAreaView>
  );
}

// Create a custom HOC that provides posts from the database
const enhance = withObservables([], () => {
  // Get database directly from the imported database instance
  const db = require('../../lib/database/database').default;

  // Check if database is available before trying to query
  if (!db) {
    console.error('Database instance is not available in withObservables');
    return { posts: [] };
  }

  try {
    // Use the database to query posts
    return {
      posts: db
        .get('posts')
        .query(Q.where('is_deleted', false), Q.sortBy('created_at', Q.desc))
        .observe(),
    };
  } catch (error) {
    console.error('Error setting up observable query:', error);
    return { posts: [] };
  }
});

// Export the enhanced component
export default enhance(CommunityScreenBase);
