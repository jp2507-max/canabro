import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Alert, Image, Dimensions } from 'react-native';

import { useTheme } from '../../lib/contexts/ThemeContext';
import { Comment } from '../../lib/types/community';
import supabase from '../../lib/supabase';
import StorageImage from '../ui/StorageImage';
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';

interface CommentItemProps {
  comment: Comment & {
    profile?: {
      username: string;
      avatar_url: string | null;
    };
    image_url?: string | null;
  };
  currentUserId?: string;
  onReply?: (commentId: string, username: string) => void;
}

/**
 * Format a date string into a relative time string (e.g. "2m ago")
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);

  if (diffSeconds < 60) return `${diffSeconds}s`;
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  const diffWeeks = Math.round(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}w`;
  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo`;
  const diffYears = Math.round(diffDays / 365);
  return `${diffYears}y`;
}

export default function CommentItem({ comment, currentUserId, onReply }: CommentItemProps) {
  const { theme, isDarkMode } = useTheme();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(comment.likes_count || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [userProfile, setUserProfile] = useState(comment.profile || {
    username: 'Unknown User',
    avatar_url: null,
  });
  
  // Check if the current user is the author of this comment
  const isOwnComment = currentUserId === comment.user_id;
  
  // Fetch profile information if not already available
  useEffect(() => {
    if (!comment.profile && comment.user_id) {
      setIsLoadingProfile(true);
      
      const fetchProfile = async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', comment.user_id)
            .single();
            
          if (error) throw error;
          
          if (data) {
            setUserProfile(data);
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        } finally {
          setIsLoadingProfile(false);
        }
      };
      
      fetchProfile();
    }
  }, [comment.profile, comment.user_id]);
  
  // Colors for UI elements
  const likeIconColor = isLiked 
    ? theme.colors.status.danger 
    : isDarkMode ? theme.colors.neutral[400] : theme.colors.neutral[600];
  const actionTextColor = isDarkMode ? theme.colors.neutral[400] : theme.colors.neutral[600];

  /**
   * Handle liking/unliking a comment
   */
  const handleLikeToggle = async () => {
    if (isLiking || !currentUserId) return;
    
    setIsLiking(true);
    try {
      if (isLiked) {
        // Unlike the comment
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', comment.id)
          .eq('user_id', currentUserId);
          
        if (error) throw error;
        setLikesCount(prev => Math.max(0, prev - 1));
        setIsLiked(false);
      } else {
        // Like the comment
        const { error } = await supabase
          .from('comment_likes')
          .insert({
            comment_id: comment.id,
            user_id: currentUserId,
          });
          
        if (error) throw error;
        setLikesCount(prev => prev + 1);
        setIsLiked(true);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Don't show an alert for like errors to avoid disrupting the user experience
    } finally {
      setIsLiking(false);
    }
  };
  
  // Check if the user has liked this comment when the component mounts
  useEffect(() => {
    if (!currentUserId || !comment.id) return;
    
    const checkLikeStatus = async () => {
      try {
        // Use the RPC function to check if user has liked this comment
        const { data, error } = await supabase
          .rpc('has_user_liked_comment', {
            p_comment_id: comment.id,
            p_user_id: currentUserId
          });
          
        if (error) throw error;
        setIsLiked(data || false);
        
        // Get the current likes count
        const { data: likesData, error: likesError } = await supabase
          .rpc('get_comment_likes_count', {
            comment_id: comment.id
          });
          
        if (likesError) throw likesError;
        setLikesCount(likesData || 0);
      } catch (error) {
        console.error('Error checking like status:', error);
      }
    };
    
    checkLikeStatus();
  }, [comment.id, currentUserId]);
  
  /**
   * Handle replying to a comment
   */
  const handleReply = () => {
    if (onReply) {
      onReply(comment.id, userProfile.username);
    }
  };
  
  /**
   * Handle deleting a comment (for own comments)
   */
  const handleDelete = async () => {
    if (!isOwnComment || !currentUserId) return;
    
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              // First get the post_id before deleting the comment
              const postId = comment.post_id;
              
              // Delete the comment
              const { error } = await supabase
                .from('comments')
                .delete()
                .eq('id', comment.id)
                .eq('user_id', currentUserId);
                
              if (error) throw error;
              
              // Decrement the post's comment count
              await supabase
                .rpc('decrement_comment_count', { post_id: postId })
                .throwOnError();
                
              // Comment will be removed on next fetch
              // Optionally trigger a refresh of the comments list
            } catch (error) {
              console.error('Error deleting comment:', error);
              Alert.alert('Error', 'Failed to delete comment. Please try again.');
            }
          } 
        }
      ]
    );
  };

  return (
    <ThemedView
      className="flex-row p-4 border-b"
      lightClassName="border-neutral-200 bg-white"
      darkClassName="border-neutral-700 bg-neutral-900"
      accessibilityLabel={`Comment by ${userProfile.username}`}>
      {/* User Avatar */}
      <View className="mr-3">
        <View 
          className="items-center justify-center overflow-hidden"
          style={{ 
            width: 36, 
            height: 36, 
            borderRadius: 18,
            backgroundColor: isDarkMode ? theme.colors.neutral[700] : theme.colors.neutral[200]
          }}
          accessibilityLabel={`${userProfile.username}'s avatar`}
        >
          <Ionicons
            name="person-circle-outline"
            size={24}
            color={isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[400]}
          />
        </View>
      </View>

      {/* Comment Content */}
      <View className="flex-1">
        {/* Username and Timestamp */}
        <View className="flex-row items-center justify-between mb-1">
          <View className="flex-row items-center">
            <ThemedText 
              className="font-bold mr-2" 
              darkClassName="text-neutral-100" 
              lightClassName="text-neutral-900"
            >
              {userProfile.username}
            </ThemedText>
            {isOwnComment && (
              <View className="px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900">
                <ThemedText 
                  className="text-xs font-medium"
                  darkClassName="text-primary-300"
                  lightClassName="text-primary-700"
                >
                  You
                </ThemedText>
              </View>
            )}
          </View>
          <ThemedText 
            className="text-xs" 
            darkClassName="text-neutral-400" 
            lightClassName="text-neutral-500"
          >
            {formatRelativeTime(comment.created_at)}
          </ThemedText>
        </View>

        {/* Comment Text */}
        <ThemedText 
          className="text-base mb-2" 
          darkClassName="text-neutral-200" 
          lightClassName="text-neutral-800"
        >
          {comment.content}
        </ThemedText>
        
        {/* Comment Image (if any) */}
        {comment.image_url && (
          <View className="mb-3 mt-1 overflow-hidden rounded-lg">
            <Image 
              source={{ uri: comment.image_url }} 
              style={{
                width: '100%',
                height: 200,
                borderRadius: 8,
                backgroundColor: isDarkMode ? theme.colors.neutral[700] : theme.colors.neutral[200]
              }}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Actions (Like, Reply, Delete) */}
        <View className="flex-row items-center">
          {/* Like Button */}
          <TouchableOpacity 
            onPress={handleLikeToggle} 
            disabled={isLiking || !currentUserId}
            className="flex-row items-center mr-4"
            accessibilityLabel={isLiked ? "Unlike comment" : "Like comment"}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Ionicons 
              name={isLiked ? "heart" : "heart-outline"} 
              size={16} 
              color={likeIconColor} 
            />
            {likesCount > 0 && (
              <ThemedText 
                className="text-xs ml-1" 
                darkClassName="text-neutral-400" 
                lightClassName="text-neutral-600"
              >
                {likesCount}
              </ThemedText>
            )}
          </TouchableOpacity>
          
          {/* Reply Button */}
          {onReply && (
            <TouchableOpacity 
              onPress={handleReply}
              className="flex-row items-center mr-4"
              accessibilityLabel="Reply to comment"
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <Ionicons 
                name="chatbubble-outline" 
                size={16} 
                color={actionTextColor} 
              />
              <ThemedText 
                className="text-xs ml-1" 
                darkClassName="text-neutral-400" 
                lightClassName="text-neutral-600"
              >
                Reply
              </ThemedText>
            </TouchableOpacity>
          )}
          
          {/* Delete Button (only for own comments) */}
          {isOwnComment && (
            <TouchableOpacity 
              onPress={handleDelete}
              className="flex-row items-center"
              accessibilityLabel="Delete comment"
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <Ionicons 
                name="trash-outline" 
                size={16} 
                color={actionTextColor} 
              />
              <ThemedText 
                className="text-xs ml-1" 
                darkClassName="text-neutral-400" 
                lightClassName="text-neutral-600"
              >
                Delete
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ThemedView>
  );
}
