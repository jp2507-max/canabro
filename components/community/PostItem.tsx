import { Ionicons } from '@expo/vector-icons'; // Added Ionicons & MaterialCommunityIcons
import dayjs from 'dayjs'; // Using dayjs for relative time
import relativeTime from 'dayjs/plugin/relativeTime'; // Import plugin
import React from 'react';
import { Pressable, TouchableOpacity, View } from 'react-native';

import UserAvatar from './UserAvatar';
import { useTheme } from '../../lib/contexts/ThemeContext';
// Removed WatermelonDB imports (Post, Profile, Plant, withObservables, of$)
import StorageImage from '../ui/StorageImage';
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';

dayjs.extend(relativeTime); // Extend dayjs with the plugin

// Define the expected structure for profile data coming from Supabase
interface PostAuthor {
  id: string;
  username: string | null;
  avatar_url: string | null;
  // Add other relevant profile fields if needed, e.g., is_verified
}

// Define the expected structure for post data coming from Supabase
export interface PostData {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string; // Expect ISO string format from Supabase
  likes_count: number;
  comments_count: number;
  // Assuming profiles table is joined in the Supabase query
  profiles: PostAuthor | null;
  // Assuming we fetch whether the current user liked the post
  user_has_liked: boolean;
  // Flag to indicate if the image is potentially corrupted (uploaded before ArrayBuffer fix)
  hasCorruptedImage?: boolean;
  // Optional: Add plant data if needed and joined
  // plant: { id: string; name: string } | null;
}

// Define the props for the PostItem component
interface PostItemProps {
  post: PostData;
  currentUserId?: string; // Optional: To enable/disable interactions for own posts or specific logic
  onLike: (postId: string, currentlyLiked: boolean) => void; // Pass current like status
  onComment: (postId: string) => void;
  onUserPress: (userId: string) => void;
  // onPlantPress?: (plantId: string) => void; // Keep if plant data is included
  onImagePress?: (imageUrl: string) => void;
}

/**
 * PostItem component - Renders a single post in the community feed.
 * Receives structured data fetched from Supabase via props.
 */
function PostItem({
  post,
  currentUserId,
  onLike,
  onComment,
  onUserPress,
  // onPlantPress,
  onImagePress,
}: PostItemProps) {
  const { theme, isDarkMode } = useTheme();
  const author = post.profiles; // Extracted for clarity

  // Fallback for missing author data
  const displayName = author?.username || 'Anonymous';
  const avatarUrl = author?.avatar_url; // Use the fetched avatar URL

  // Format timestamp
  const timeAgo = dayjs(post.created_at).fromNow();

  const handleLikePress = () => {
    onLike(post.id, post.user_has_liked);
  };

  const handleCommentPress = () => {
    onComment(post.id);
  };

  const handleUserAvatarPress = () => {
    if (author?.id) {
      onUserPress(author.id);
    }
  };

  const handleImagePress = () => {
    if (post.image_url) {
      onImagePress?.(post.image_url);
    }
  };

  return (
    <ThemedView
      className="mb-4 overflow-hidden rounded-lg border" // Use border for dark mode consistency
      lightClassName="bg-white border-neutral-200 shadow-sm" // Light mode: white bg, light border, shadow
      darkClassName="bg-neutral-900 border-neutral-700" // Dark mode: dark bg, darker border
    >
      {/* Post Header */}
      <Pressable onPress={handleUserAvatarPress} className="flex-row items-center p-3">
        {/* Add verification later if needed */}
        <UserAvatar uri={avatarUrl || 'https://via.placeholder.com/40'} verified={false} />
        <View className="ml-3 flex-1">
          <ThemedText
            className="font-semibold"
            darkClassName="text-neutral-100"
            lightClassName="text-neutral-900">
            {displayName}
          </ThemedText>
          <ThemedText
            className="text-xs"
            darkClassName="text-neutral-400"
            lightClassName="text-neutral-500">
            {timeAgo}
          </ThemedText>
          {/* Optional: Add Plant Link Here if needed */}
          {/* {post.plant && onPlantPress && ( ... )} */}
        </View>
        {/* Optional: Add More Options Button (...) here */}
      </Pressable>

      {/* Post Content */}
      {post.content ? (
        <View className="mb-3 px-3">
          <ThemedText darkClassName="text-neutral-200" lightClassName="text-neutral-800">
            {post.content}
          </ThemedText>
        </View>
      ) : null}

      {/* Post Image */}
      {post.image_url && (
        <Pressable onPress={handleImagePress} className="mb-3">
          <View className="h-64 w-full">
            <StorageImage
              url={post.image_url}
              height="100%"
              width="100%"
              contentFit="cover"
              accessibilityLabel="Post image"
              fallbackIconName="image-outline"
              fallbackIconSize={40}
            />
            {/* Show warning for potentially corrupted images */}
            {post.hasCorruptedImage && (
              <View className="absolute bottom-0 left-0 right-0 bg-red-500/70 p-2">
                <ThemedText className="text-center text-xs font-medium text-white">
                  This image may not load correctly. Please re-upload.
                </ThemedText>
              </View>
            )}
          </View>
        </Pressable>
      )}

      {/* Action Buttons & Counts */}
      <View className="light:border-neutral-200 flex-row items-center justify-start border-t px-3 py-2 dark:border-neutral-700">
        {/* Like Button */}
        <TouchableOpacity
          onPress={handleLikePress}
          className="mr-5 flex-row items-center"
          accessibilityLabel="Like button"
          accessibilityRole="button">
          <Ionicons
            name={post.user_has_liked ? 'heart' : 'heart-outline'}
            size={20}
            color={
              post.user_has_liked
                ? theme.colors.status.danger
                : isDarkMode
                  ? theme.colors.neutral[400]
                  : theme.colors.neutral[600]
            }
          />
          {post.likes_count > 0 && (
            <ThemedText
              className="ml-1.5 text-sm"
              darkClassName="text-neutral-400"
              lightClassName="text-neutral-600">
              {post.likes_count}
            </ThemedText>
          )}
        </TouchableOpacity>

        {/* Comment Button */}
        <TouchableOpacity
          onPress={handleCommentPress}
          className="flex-row items-center"
          accessibilityLabel="Comment on post"
          accessibilityRole="button">
          <Ionicons
            name="chatbubble-outline"
            size={20}
            color={isDarkMode ? theme.colors.neutral[400] : theme.colors.neutral[600]}
          />
          {post.comments_count > 0 && (
            <ThemedText
              className="ml-1.5 text-sm"
              darkClassName="text-neutral-400"
              lightClassName="text-neutral-600">
              {post.comments_count}
            </ThemedText>
          )}
        </TouchableOpacity>

        {/* Optional: Share Button */}
        {/* <TouchableOpacity className="ml-auto"> ... </TouchableOpacity> */}
      </View>
    </ThemedView>
  );
}

// Remove the enhance HOC, export the base component directly
export default PostItem;
