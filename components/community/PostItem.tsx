import React from 'react';
import { Image, FlatList, Pressable, TouchableOpacity } from 'react-native';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';
import UserAvatar from './UserAvatar';
import { useTheme } from '../../lib/contexts/ThemeContext';
import { Post } from '../../lib/types/community';

type PostItemProps = {
  post: Post;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onUserPress?: (userId: string) => void;
  onPlantPress?: (plantId: string) => void;
  onImagePress?: (imageUrl: string, index: number) => void;
};

/**
 * PostItem component for displaying individual community posts
 */
export default function PostItem({ 
  post, 
  onLike,
  onComment,
  onUserPress,
  onPlantPress,
  onImagePress
}: PostItemProps) {
  const { theme, isDarkMode } = useTheme();
  
  return (
    <ThemedView 
      className="mb-4 rounded-xl overflow-hidden"
      lightClassName="bg-white"
      darkClassName="bg-neutral-100"
      style={isDarkMode ? { borderWidth: 1, borderColor: theme.colors.neutral[200] } : theme.shadows.sm}
    >
      {/* Post header with user info */}
      <ThemedView className="p-3 flex-row items-center">
        <TouchableOpacity onPress={() => onUserPress?.(post.userId)}>
          <UserAvatar 
            uri={post.user?.avatarUrl || 'https://via.placeholder.com/40'} 
            verified={post.user?.isVerified} 
          />
        </TouchableOpacity>
        <ThemedView className="ml-2 flex-1">
          <ThemedView className="flex-row items-center">
            <ThemedText className="font-bold">{post.user?.username || 'Anonymous'}</ThemedText>
            <ThemedText 
              className="mx-1 text-sm"
              lightClassName="text-neutral-400"
              darkClassName="text-neutral-500"
            >
              •
            </ThemedText>
            <ThemedText 
              className="text-sm"
              lightClassName="text-neutral-500"
              darkClassName="text-neutral-600"
            >
              {new Date(post.createdAt).toLocaleDateString()}
            </ThemedText>
          </ThemedView>
          {post.plant && (
            <TouchableOpacity onPress={() => onPlantPress?.(post.plant.id)}>
              <ThemedView className="flex-row items-center">
                <ThemedText 
                  className="text-xs mr-1"
                  lightClassName="text-neutral-500"
                  darkClassName="text-neutral-600"
                >
                  Growing:
                </ThemedText>
                <ThemedText 
                  className="text-xs font-medium"
                  lightClassName="text-primary-600"
                  darkClassName="text-primary-400"
                >
                  {post.plant.name}
                </ThemedText>
              </ThemedView>
            </TouchableOpacity>
          )}
        </ThemedView>
      </ThemedView>
      
      {/* Post content */}
      <ThemedView className="px-3 mb-2">
        <ThemedText>{post.content}</ThemedText>
      </ThemedView>
      
      {/* Post images */}
      {post.imageUrls && post.imageUrls.length > 0 && (
        <FlatList
          data={post.imageUrls}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, index) => `image-${index}`}
          renderItem={({ item, index }) => (
            <Pressable onPress={() => onImagePress?.(item, index)}>
              <Image
                source={{ uri: item }}
                style={{ width: 300, height: 300, marginRight: 2 }}
                resizeMode="cover"
              />
            </Pressable>
          )}
        />
      )}
      
      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <ThemedView className="px-3 py-2 flex-row flex-wrap">
          {post.tags.map((tag, idx) => (
            <ThemedText
              key={`tag-${idx}`}
              className="mr-2 text-sm"
              lightClassName="text-primary-600"
              darkClassName="text-primary-400"
            >
              {tag}
            </ThemedText>
          ))}
        </ThemedView>
      )}
      
      {/* Action buttons */}
      <ThemedView className="px-3 py-2 flex-row border-t" lightClassName="border-neutral-200" darkClassName="border-neutral-300">
        <TouchableOpacity 
          className="flex-row items-center mr-4" 
          onPress={() => onLike?.(post.id)}
        >
          <FontAwesome 
            name="heart-o" 
            size={18} 
            color={theme.colors.primary[isDarkMode ? 400 : 600]} 
          />
          <ThemedText className="ml-1" lightClassName="text-neutral-600" darkClassName="text-neutral-500">
            {post.likesCount || 0}
          </ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="flex-row items-center" 
          onPress={() => onComment?.(post.id)}
        >
          <FontAwesome 
            name="comment-o" 
            size={18} 
            color={theme.colors.primary[isDarkMode ? 400 : 600]} 
          />
          <ThemedText className="ml-1" lightClassName="text-neutral-600" darkClassName="text-neutral-500">
            {post.commentsCount || 0}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );
}
