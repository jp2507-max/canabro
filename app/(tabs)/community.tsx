import React, { useState } from 'react';
import { FlatList, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import ThemedView from '../../components/ui/ThemedView';
import ThemedText from '../../components/ui/ThemedText';
import UserAvatar from '../../components/community/UserAvatar';
import TopicList from '../../components/community/TopicList';
import PostItem from '../../components/community/PostItem';
import CreatePostModal from '../../components/community/CreatePostModal';
import CreatePostScreen from '../../components/community/CreatePostScreen';
import { useTheme } from '../../lib/contexts/ThemeContext';
import { useAuth } from '../../lib/contexts/AuthProvider';
import { useCommunityPosts } from '../../lib/hooks/useCommunityPosts';
import { useProtectedRoute } from '../../lib/hooks/useProtectedRoute';
import { useProfileData } from '../../lib/hooks/useProfileData';

// Topic tags for the horizontal scroll
const TOPICS = [
  { id: '1', name: 'wishlistplant', count: 22 },
  { id: '2', name: 'indoorplants', count: 56 },
  { id: '3', name: 'plantparent', count: 34 },
  { id: '4', name: 'monstera', count: 41 },
  { id: '5', name: 'succulents', count: 29 },
  { id: '6', name: 'growlights', count: 18 },
];

/**
 * Community screen component for displaying and interacting with social posts
 */
export default function CommunityScreen() {
  useProtectedRoute();
  const { theme, isDarkMode } = useTheme();
  const { user } = useAuth();
  const { profile } = useProfileData();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateScreen, setShowCreateScreen] = useState(false);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<{ url: string; index: number } | null>(null);
  
  // Use our custom hook to fetch and manage posts
  const {
    posts,
    loading,
    refreshing,
    hasMore,
    loadMore,
    refresh,
    like,
    addPost
  } = useCommunityPosts();
  
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
    router.push(`/profile/${userId}`);
  };
  
  // Handle plant detail navigation
  const handlePlantPress = (plantId: string) => {
    router.push(`/plant/${plantId}`);
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
  
  const handlePostCreated = () => {
    refresh();
  };
  
  // Render the header with user avatar and topics
  const renderHeader = () => (
    <>
      <ThemedView className="flex-row items-center justify-between p-4">
        <ThemedText className="text-2xl font-bold">Community</ThemedText>
        <TouchableOpacity onPress={() => handleUserPress(user?.id || '')}>
          <UserAvatar
            uri={profile?.avatar_url || 'https://via.placeholder.com/40'}
            verified={false}
          />
        </TouchableOpacity>
      </ThemedView>
      
      <TopicList
        topics={TOPICS}
        activeTopic={activeTopic}
        onTopicPress={handleTopicPress}
      />
    </>
  );
  
  // Render empty state when no posts are available
  const renderEmptyState = () => {
    if (loading) return (
      <ThemedView className="flex-1 items-center justify-center py-20">
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      </ThemedView>
    );
    
    return (
      <ThemedView className="flex-1 items-center justify-center py-20">
        <Ionicons
          name="leaf-outline"
          size={50}
          color={theme.colors.neutral[400]}
          style={{ marginBottom: 16 }}
        />
        <ThemedText className="text-center font-bold text-lg mb-2">No Posts Yet</ThemedText>
        <ThemedText className="text-center text-neutral-500 mb-8 px-8">
          Be the first to share your plants with the community!
        </ThemedText>
        <TouchableOpacity
          onPress={() => setShowCreateModal(true)}
          className="py-3 px-6 rounded-full"
          style={{ backgroundColor: theme.colors.primary[500] }}
        >
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
              post={item}
              onLike={(postId) => like(postId)}
              onComment={(postId) => router.push(`/post/${postId}`)}
              onUserPress={handleUserPress}
              onPlantPress={handlePlantPress}
              onImagePress={(url, index) => setExpandedImage({ url, index })}
            />
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              colors={[theme.colors.primary[500]]}
              tintColor={theme.colors.primary[500]}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
        />
        
        {/* Floating action button */}
        <TouchableOpacity
          className="absolute bottom-6 right-6 w-14 h-14 rounded-full items-center justify-center shadow-lg"
          style={{ backgroundColor: theme.colors.primary[500] }}
          onPress={() => setShowCreateModal(true)}
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
      </ThemedView>
    </SafeAreaView>
  );
}
