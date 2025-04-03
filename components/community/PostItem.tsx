import { FontAwesome } from '@expo/vector-icons';
import { withObservables } from '@nozbe/watermelondb/react';
import React from 'react';
import { Image, Pressable, TouchableOpacity, View } from 'react-native'; // Added View
import { of as of$ } from 'rxjs'; // Import of from rxjs

import UserAvatar from './UserAvatar';
import { useTheme } from '../../lib/contexts/ThemeContext';
import { Plant } from '../../lib/models/Plant'; // Import Plant model
import { Post } from '../../lib/models/Post'; // Import WatermelonDB Post model
import { Profile } from '../../lib/models/Profile'; // Import Profile model
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';

// WatermelonDB imports

// Props for the base component, including resolved relations
interface PostItemBaseProps {
  post: Post; // WatermelonDB Post model instance
  user: Profile | null; // Resolved user profile
  plant: Plant | null; // Resolved plant
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onUserPress?: (userId: string) => void;
  onPlantPress?: (plantId: string) => void;
  onImagePress?: (imageUrl: string, index: number) => void; // index is always 0 for single image
}

/**
 * Base PostItem component - receives resolved data as props
 */
function PostItemBase({
  post,
  user, // Receive resolved user
  plant, // Receive resolved plant
  onLike,
  onComment,
  onUserPress,
  onPlantPress,
  onImagePress,
}: PostItemBaseProps) {
  const { theme, isDarkMode } = useTheme();

  // Handle cases where post might somehow be null (though HOC should prevent this)
  if (!post) {
    return null; // Or render a placeholder/error
  }

  return (
    <ThemedView
      className="mb-4 overflow-hidden rounded-xl"
      lightClassName="bg-white"
      darkClassName="bg-neutral-800" // Adjusted dark background
      style={
        isDarkMode ? { borderWidth: 1, borderColor: theme.colors.neutral[700] } : theme.shadows.sm
      } // Adjusted dark border
    >
      {/* Post header with user info */}
      <ThemedView className="flex-row items-center p-3">
        {/* Use resolved user prop */}
        <TouchableOpacity onPress={() => user && onUserPress?.(user.id)}>
          <UserAvatar
            uri={user?.avatarUrl || 'https://via.placeholder.com/40'}
            verified={false} // Assuming 'isVerified' isn't on WDB Profile model yet
          />
        </TouchableOpacity>
        <View className="ml-2 flex-1">
          {' '}
          {/* Use standard View */}
          <View className="flex-row items-center">
            {' '}
            {/* Use standard View */}
            {/* Use resolved user prop */}
            <ThemedText className="font-bold">{user?.username || 'Anonymous'}</ThemedText>
            <ThemedText
              className="mx-1 text-sm"
              lightClassName="text-neutral-400"
              darkClassName="text-neutral-500">
              •
            </ThemedText>
            <ThemedText
              className="text-sm"
              lightClassName="text-neutral-500"
              darkClassName="text-neutral-400" // Adjusted dark text
            >
              {/* Use model's createdAt field */}
              {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ''}
            </ThemedText>
          </View>
          {/* Use resolved plant prop */}
          {plant && (
            <TouchableOpacity onPress={() => onPlantPress?.(plant.id)}>
              <View className="flex-row items-center">
                {' '}
                {/* Use standard View */}
                <ThemedText
                  className="mr-1 text-xs"
                  lightClassName="text-neutral-500"
                  darkClassName="text-neutral-400" // Adjusted dark text
                >
                  Growing:
                </ThemedText>
                <ThemedText
                  className="text-xs font-medium"
                  lightClassName="text-primary-600"
                  darkClassName="text-primary-400">
                  {/* Use resolved plant prop */}
                  {plant.name}
                </ThemedText>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </ThemedView>

      {/* Post content */}
      <View className="mb-2 px-3">
        {' '}
        {/* Use standard View */}
        <ThemedText>{post.content}</ThemedText>
      </View>

      {/* Post images - Assuming single imageUrl on WDB model */}
      {post.imageUrl && (
        <Pressable onPress={() => onImagePress?.(post.imageUrl!, 0)}>
          <Image
            source={{ uri: post.imageUrl }}
            style={{ width: '100%', height: 300 }} // Adjust styling as needed
            resizeMode="cover"
          />
        </Pressable>
      )}
      {/* If multiple images are needed, a PostMedia relation/model would be required */}

      {/* Tags - Assuming tags are not directly on WDB model for now */}
      {/* <ThemedView className="px-3 py-2 flex-row flex-wrap"> ... </ThemedView> */}

      {/* Action buttons */}
      <ThemedView
        className="flex-row border-t px-3 py-2"
        lightClassName="border-neutral-200"
        darkClassName="border-neutral-700">
        {' '}
        {/* Adjusted dark border */}
        <TouchableOpacity className="mr-4 flex-row items-center" onPress={() => onLike?.(post.id)}>
          <FontAwesome
            name="heart-o"
            size={18}
            color={theme.colors.primary[isDarkMode ? 400 : 600]}
          />
          <ThemedText
            className="ml-1"
            lightClassName="text-neutral-600"
            darkClassName="text-neutral-400">
            {' '}
            {/* Adjusted dark text */}
            {/* Use model's likesCount field */}
            {post.likesCount || 0}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity className="flex-row items-center" onPress={() => onComment?.(post.id)}>
          <FontAwesome
            name="comment-o"
            size={18}
            color={theme.colors.primary[isDarkMode ? 400 : 600]}
          />
          <ThemedText
            className="ml-1"
            lightClassName="text-neutral-600"
            darkClassName="text-neutral-400">
            {' '}
            {/* Adjusted dark text */}
            {/* Use model's commentsCount field */}
            {post.commentsCount || 0}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );
}

// Define HOC to enhance PostItemBase with related data
// Note: The 'post' prop is the input to this enhancer
const enhance = withObservables(
  ['post'], // Observe changes to the post prop itself
  ({ post }: { post: Post }) => ({
    // Observe the user relation (profile)
    // Use of$(null) as fallback if relation is optional or not yet loaded/found
    user: post.profile ? post.profile.observe() : of$(null),
    // Observe the plant relation
    plant: post.plant ? post.plant.observe() : of$(null),
    // We also need to observe the post's own fields for changes (like likesCount)
    post: post.observe(),
  })
);

// Export the enhanced component
export default enhance(PostItemBase);
