// Removed duplicate Ionicons import
import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer'; // Import decode
import * as FileSystem from 'expo-file-system'; // Import FileSystem
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'; // Import manipulator
import * as ImagePicker from 'expo-image-picker';
import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView, // Keep KAV for now, revert its props later if needed
  Platform,
  ActivityIndicator,
  Keyboard,
  Animated,
  Pressable,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CommentItem from './CommentItem';
import { useAuth } from '../../lib/contexts/AuthProvider';
import { useTheme } from '../../lib/contexts/ThemeContext';
import supabase from '../../lib/supabase';
import { Comment } from '../../lib/types/community';
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';

interface CommentModalProps {
  postId: string;
  isVisible: boolean;
  onClose: () => void;
  onCommentAdded?: () => void; // Optional callback when a comment is added
}

// Comment with profile data for display
interface CommentWithProfile extends Comment {
  profile?: {
    username: string;
    avatar_url: string | null;
  };
  image_url?: string | null;
}

export default function CommentModal({
  postId,
  isVisible,
  onClose,
  onCommentAdded,
}: CommentModalProps) {
  const { theme, isDarkMode } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  // Removed keyboardHeight state and listeners

  // Fetch comments when modal becomes visible
  useEffect(() => {
    if (isVisible && postId) {
      fetchComments();
    } else {
      // Reset when modal is hidden
      setComments([]);
      setCommentText('');
      setIsLoading(true);
    }
  }, [isVisible, postId]);

  // Animate modal appearance
  useEffect(() => {
    if (isVisible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, fadeAnim]);

  // Fetch comments from Supabase
  const fetchComments = async () => {
    if (!postId) return;

    setIsLoading(true);
    try {
      const { data, error, count } = await supabase
        .from('comments')
        .select(
          `
          *,
          profiles (username, avatar_url)
        `,
          { count: 'exact' }
        )
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to include profile information
      const commentsWithProfiles =
        data?.map((comment) => ({
          ...comment,
          profile: comment.profiles as { username: string; avatar_url: string | null },
        })) || [];

      setComments(commentsWithProfiles);
      if (count !== null) setCommentsCount(count);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Handle refreshing comments
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchComments();
  };

  // Handle taking a photo with the camera
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  // Handle selecting an image from the gallery
  const handlePickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant camera roll permissions to attach photos.'
        );
        return;
      }

      // Launch image picker using lowercase string literal for media type
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], // Use lowercase string literal 'images'
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // Present choice between camera and library
  const handleAttachPhoto = () => {
    Alert.alert(
      'Attach Photo',
      'Choose an option:',
      [
        { text: 'Take Photo...', onPress: handleTakePhoto },
        { text: 'Choose from Library...', onPress: handlePickImage },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  // Upload image to Supabase storage using ArrayBuffer (Corrected Implementation)
  const uploadImage = async (userId: string, uri: string): Promise<string | null> => {
    console.log('Starting comment image processing and upload for URI:', uri);
    try {
      setIsUploading(true);

      // --- Manipulate Image ---
      console.log('Manipulating comment image...');
      const manipResult = await manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }], // Resize
        { compress: 0.7, format: SaveFormat.JPEG } // Compress and save as JPEG
      );
      console.log(
        'Comment image manipulated:',
        manipResult.uri,
        `(${manipResult.width}x${manipResult.height})`
      );

      // Determine the correct MIME type and extension
      const mimeType = 'image/jpeg';
      const extension = 'jpg';

      // Step 1: Read the *manipulated* file as a Base64 string
      console.log('Reading manipulated comment file as Base64...');
      const base64Data = await FileSystem.readAsStringAsync(manipResult.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Step 2: Convert the Base64 string to an ArrayBuffer
      console.log('Converting Base64 to ArrayBuffer for comment image...');
      const arrayBuffer = decode(base64Data);

      // Use a timestamp and proper extension for the filename within user's comments folder
      const filename = `comment_${Date.now()}.${extension}`;
      const filePath = `${userId}/comments/${filename}`; // Store in posts bucket under user/comments/
      console.log('Uploading comment image to Supabase storage at path:', filePath);

      // Step 3: Upload the ArrayBuffer with explicit content type to the 'posts' bucket
      console.log('Uploading ArrayBuffer to Supabase (posts bucket)...');
      const { error: uploadError } = await supabase.storage
        .from('posts') // Use the 'posts' bucket
        .upload(filePath, arrayBuffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        console.error('Supabase upload error for comment image:', uploadError);
        throw uploadError; // Throw error to be caught by handleAddComment
      }

      console.log('Comment image uploaded successfully to Supabase.');

      // Get the public URL from the 'posts' bucket
      const { data: urlData } = supabase.storage.from('posts').getPublicUrl(filePath);

      if (!urlData || !urlData.publicUrl) {
        console.error('Could not get public URL for comment image path:', filePath);
        throw new Error('Could not get public URL after comment image upload.');
      }

      console.log('Comment image public URL:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading comment image:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
      return null; // Indicate failure
    } finally {
      setIsUploading(false);
    }
  };

  // Add a new comment
  const handleAddComment = async () => {
    if ((!commentText.trim() && !selectedImage) || isSubmitting || !user) return;

    Keyboard.dismiss();
    setIsSubmitting(true);

    try {
      // Upload image if selected
      let imageUrl: string | null = null;
      if (selectedImage) {
        imageUrl = await uploadImage(user.id, selectedImage);
        if (!imageUrl) {
          // Upload failed, alert shown in uploadImage
          setIsSubmitting(false);
          return; // Stop submission
        }
      }

      // Call RPC function *without* image URL
      const { error: rpcError } = await supabase.rpc('create_comment', {
        p_post_id: postId,
        p_content: commentText.trim(),
        p_user_id: user.id,
        // p_image_url: imageUrl // REMOVED - Function doesn't accept it
      });
      // Removed .throwOnError() to handle error manually if needed

      if (rpcError) {
        console.error('Error calling create_comment RPC:', rpcError);
        // Attempt to provide a more specific error message based on common issues
        if (rpcError.message.includes('violates foreign key constraint')) {
          Alert.alert('Error', 'Could not add comment. The associated post may no longer exist.');
        } else {
          Alert.alert('Error', 'Failed to add comment. Please try again.');
        }
        throw rpcError; // Re-throw to be caught by outer catch block
      }

      // Fetch the newly created comment to get its ID and other details
      // Important: Fetch based on user_id and post_id, ordered by creation time descending
      const { data: commentData, error: fetchError } = await supabase
        .from('comments')
        .select(
          `
          *,
          profiles (username, avatar_url)
        `
        )
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchError) {
        console.error('Error fetching newly created comment:', fetchError);
        // Proceed cautiously, maybe alert user? Or just log?
        Alert.alert('Warning', 'Comment added, but could not immediately display it.');
        // For now, just log and continue without adding to UI immediately
      } else if (commentData && commentData[0]) {
        const newCommentRaw = commentData[0];
        let finalImageUrl = null; // Default to null

        // If an image was uploaded, update the comment record with the URL
        if (imageUrl) {
          console.log(`Updating comment ${newCommentRaw.id} with image URL: ${imageUrl}`);
          const { error: updateError } = await supabase
            .from('comments')
            .update({ image_url: imageUrl })
            .eq('id', newCommentRaw.id);

          if (updateError) {
            console.error('Error updating comment with image URL:', updateError);
            // Decide how to handle this - maybe alert user?
            Alert.alert('Warning', 'Comment added, but failed to attach image.');
          } else {
            finalImageUrl = imageUrl; // Set final URL only if update succeeds
          }
        }

        // Add new comment to state with potentially updated image URL
        const newComment: CommentWithProfile = {
          ...newCommentRaw,
          profile: newCommentRaw.profiles as { username: string; avatar_url: string | null },
          image_url: finalImageUrl, // Use the final URL
        };
        setComments((prev) => [newComment, ...prev]);
        setCommentsCount((prev) => prev + 1);

        // Call the callback if provided
        if (onCommentAdded) onCommentAdded();
      } else {
        console.warn('Could not fetch the newly created comment after RPC call.');
        Alert.alert('Warning', 'Comment added, but could not immediately display it.');
        // Maybe try fetching again or inform user?
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      // Show error to user
      Alert.alert('Error', 'Failed to add comment. Please try again.');
    } finally {
      setCommentText('');
      setSelectedImage(null);
      setIsSubmitting(false);
    }
  };

  // Focus the input field
  const focusCommentInput = () => {
    inputRef.current?.focus();
  };

  // Render a comment item
  const renderComment = ({ item }: { item: CommentWithProfile }) => (
    <CommentItem comment={item} currentUserId={user?.id} />
  );

  // Theme colors for UI elements
  const inputBgColor = isDarkMode ? theme.colors.neutral[700] : theme.colors.neutral[100];
  const inputTextColor = isDarkMode ? theme.colors.neutral[100] : theme.colors.neutral[900];
  const placeholderTextColor = isDarkMode ? theme.colors.neutral[400] : theme.colors.neutral[500];

  const headerBg = isDarkMode ? theme.colors.neutral[800] : theme.colors.neutral[50];
  const modalBg = isDarkMode ? theme.colors.neutral[900] : theme.colors.background; // Use theme background for light mode

  return (
    <Modal animationType="none" transparent visible={isVisible} onRequestClose={onClose}>
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          opacity: fadeAnim,
        }}>
        <Pressable style={{ flex: 1 }} onPress={onClose}>
          <Animated.View
            style={{
              flex: 1,
              marginTop: 60,
              backgroundColor: modalBg,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              overflow: 'hidden',
              // Removed marginBottom: keyboardHeight
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0],
                  }),
                },
              ],
            }}>
            <Pressable style={{ flex: 1 }}>
              {/* Header is outside KAV */}
              <ThemedView
                className="flex-row items-center justify-between border-b px-4 py-3"
                style={{ backgroundColor: headerBg }}
                lightClassName="border-neutral-200"
                darkClassName="border-neutral-700">
                <View className="flex-row items-center">
                  <ThemedText className="text-lg font-bold">Comments</ThemedText>
                  {commentsCount > 0 && (
                    <ThemedText
                      className="ml-2 text-sm font-medium"
                      darkClassName="text-neutral-400"
                      lightClassName="text-neutral-500">
                      {commentsCount}
                    </ThemedText>
                  )}
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  accessibilityLabel="Close comments"
                  hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <Ionicons
                    name="close"
                    size={24}
                    color={isDarkMode ? theme.colors.neutral[300] : theme.colors.neutral[700]}
                  />
                </TouchableOpacity>
              </ThemedView>
              {/* KAV wraps FlatList and Input Area */}
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} // Reverted behavior
                style={{ flex: 1 }}
                keyboardVerticalOffset={insets.bottom + 10} // Reverted offset
              >
                {/* Comment List */}
                {isLoading ? (
                  <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color={theme.colors.primary[500]} />
                  </View>
                ) : (
                  <FlatList
                    data={comments}
                    renderItem={renderComment}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 80 }} // Reverted extra padding
                    refreshing={isRefreshing}
                    onRefresh={handleRefresh}
                    ListEmptyComponent={
                      <ThemedView className="flex-1 items-center justify-center p-8">
                        <Ionicons
                          name="chatbubble-outline"
                          size={40}
                          color={isDarkMode ? theme.colors.neutral[600] : theme.colors.neutral[300]}
                        />
                        <ThemedText
                          className="mt-3 text-center text-base"
                          darkClassName="text-neutral-400"
                          lightClassName="text-neutral-500">
                          No comments yet. Be the first to share your thoughts!
                        </ThemedText>
                        <TouchableOpacity
                          onPress={focusCommentInput}
                          className="mt-4 rounded-full px-5 py-2"
                          style={{ backgroundColor: theme.colors.primary[500] }}>
                          <ThemedText className="font-medium text-white">Add Comment</ThemedText>
                        </TouchableOpacity>
                      </ThemedView>
                    }
                    initialNumToRender={10}
                    maxToRenderPerBatch={5}
                    windowSize={10}
                  />
                )}

                {/* Input Area */}
                <ThemedView
                  className="flex-row items-center border-t p-3"
                  style={{ backgroundColor: headerBg }} // Removed explicit paddingBottom
                  lightClassName="border-neutral-200"
                  darkClassName="border-neutral-700">
                  {/* User Avatar REMOVED */}
                  {/* <View className="mr-2"> ... </View> */}

                  <View className="flex-1">
                    {/* Selected Image Preview */}
                    {selectedImage && (
                      <View className="relative mb-2">
                        <Image
                          source={{ uri: selectedImage }}
                          style={{
                            width: '100%',
                            height: 120,
                            borderRadius: 8,
                            backgroundColor: isDarkMode
                              ? theme.colors.neutral[700]
                              : theme.colors.neutral[200],
                          }}
                          resizeMode="cover"
                        />
                        <TouchableOpacity
                          onPress={() => setSelectedImage(null)}
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            borderRadius: 12,
                            width: 24,
                            height: 24,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          accessibilityLabel="Remove image">
                          <Ionicons name="close" size={16} color="white" />
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Input Field */}
                    <TextInput
                      ref={inputRef}
                      className="max-h-[100px] flex-1 rounded-[20px] px-[15px] py-[10px] text-base"
                      style={{ backgroundColor: inputBgColor, color: inputTextColor }}
                      placeholder="Add a comment..."
                      placeholderTextColor={placeholderTextColor}
                      value={commentText}
                      onChangeText={setCommentText}
                      multiline
                      editable={!isSubmitting && !isUploading}
                      returnKeyType="send"
                      blurOnSubmit
                      onSubmitEditing={commentText.trim() ? handleAddComment : undefined}
                    />
                  </View>

                  {/* Photo Button */}
                  <TouchableOpacity
                    onPress={handleAttachPhoto} // Changed to present choice
                    disabled={isSubmitting || isUploading}
                    className="ml-2 rounded-full p-2"
                    style={{
                      backgroundColor: isDarkMode
                        ? theme.colors.neutral[700]
                        : theme.colors.neutral[300],
                    }}
                    accessibilityLabel="Attach photo">
                    <Ionicons
                      name="camera-outline"
                      size={18}
                      color={isDarkMode ? theme.colors.neutral[300] : theme.colors.neutral[600]}
                    />
                  </TouchableOpacity>

                  {/* Send Button */}
                  <TouchableOpacity
                    onPress={handleAddComment}
                    disabled={
                      (!commentText.trim() && !selectedImage) || isSubmitting || isUploading
                    }
                    className="ml-2 rounded-full p-2"
                    style={{
                      backgroundColor:
                        (!commentText.trim() && !selectedImage) || isSubmitting || isUploading
                          ? isDarkMode
                            ? theme.colors.neutral[700]
                            : theme.colors.neutral[200]
                          : theme.colors.primary[500],
                    }}
                    accessibilityLabel="Send comment">
                    {isSubmitting || isUploading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Ionicons name="send" size={18} color="white" />
                    )}
                  </TouchableOpacity>
                </ThemedView>
              </KeyboardAvoidingView>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

// Removed StyleSheet definition
