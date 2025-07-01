// Removed duplicate Ionicons import

import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system'; // Import FileSystem
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'; // Import manipulator
import * as ImagePicker from 'expo-image-picker';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  TextInput,
  FlatList,
  ActivityIndicator,
  Keyboard,
  Pressable,
  Alert,
  Image,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CommentItem from './CommentItem';
import { useAuth } from '../../lib/contexts/AuthProvider';
import supabase from '../../lib/supabase';
import { Comment } from '../../lib/types/community';
import {
  ImpactFeedbackStyle,
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerHeavyHaptic,
} from '../../lib/utils/haptics';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import { EnhancedTextInput } from '../ui/EnhancedTextInput';
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';
import EnhancedKeyboardWrapper from '@/components/keyboard/EnhancedKeyboardWrapper';

// Animation configuration
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
  mass: 1,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
};

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
}

// Animated Action Button Component
interface AnimatedActionButtonProps {
  onPress: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  style?: any;
  accessibilityLabel?: string;
  hapticStyle?: ImpactFeedbackStyle;
}

const AnimatedActionButton: React.FC<AnimatedActionButtonProps> = ({
  onPress,
  disabled = false,
  children,
  className = '',
  style,
  accessibilityLabel,
  hapticStyle = ImpactFeedbackStyle.Light,
}) => {
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);

  const handlePress = useCallback(() => {
    if (disabled) return;

    // Map haptic style to appropriate utility function
    switch (hapticStyle) {
      case ImpactFeedbackStyle.Light:
        triggerLightHaptic();
        break;
      case ImpactFeedbackStyle.Medium:
        triggerMediumHaptic();
        break;
      case ImpactFeedbackStyle.Heavy:
        triggerHeavyHaptic();
        break;
      default:
        triggerLightHaptic();
    }

    onPress();
  }, [onPress, disabled, hapticStyle]);

  const gesture = Gesture.Tap()
    .enabled(!disabled)
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(0.95, SPRING_CONFIG);
      pressed.value = withTiming(1, { duration: 100 });
    })
    .onFinalize(() => {
      'worklet';
      scale.value = withSpring(1, SPRING_CONFIG);
      pressed.value = withTiming(0, { duration: 150 });
      runOnJS(handlePress)();
    });

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: scale.value }],
      backgroundColor: interpolateColor(
        pressed.value,
        [0, 1],
        ['transparent', 'rgba(59, 130, 246, 0.1)']
      ),
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        className={className}
        style={[animatedStyle, style]}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled }}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
};

function CommentModal({ postId, isVisible, onClose, onCommentAdded }: CommentModalProps) {
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

  // Animation values
  const modalScale = useSharedValue(0.95);
  const modalOpacity = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

  // Fetch comments when modal becomes visible
  useEffect(() => {
    if (isVisible && postId) {
      fetchComments();
      // Animate modal entrance
      modalScale.value = withSpring(1, SPRING_CONFIG);
      modalOpacity.value = withSpring(1, SPRING_CONFIG);
      backdropOpacity.value = withTiming(1, { duration: 200 });
    } else {
      // Reset when modal is hidden
      setComments([]);
      setCommentText('');
      setIsLoading(true);
      // Animate modal exit
      modalScale.value = withSpring(0.95, SPRING_CONFIG);
      modalOpacity.value = withTiming(0, { duration: 150 });
      backdropOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [isVisible, postId]);

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

      if (!result.canceled && result.assets?.[0]?.uri) {
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

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
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

  // Upload image to Supabase storage using Blob (Memory Efficient Implementation)
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

      // Check file size before upload to prevent OOM issues
      const fileInfo = await FileSystem.getInfoAsync(manipResult.uri);
      if (fileInfo.exists && fileInfo.size && fileInfo.size > 10 * 1024 * 1024) {
        // 10MB limit
        Alert.alert('File Too Large', 'Please select an image smaller than 10MB.');
        return null;
      }

      // Determine the correct extension
      const extension = 'jpg';

      // Memory-efficient upload using FileSystem instead of fetch().blob()
      // This streams the file without loading it entirely into memory
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session for upload');
      }

      // Get Supabase URL from the client configuration (consistent with lib/supabase.ts)
      const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured');
      }

      // Use a timestamp and proper extension for the filename within user's comments folder
      const filename = `comment_${Date.now()}.${extension}`;
      const filePath = `${userId}/comments/${filename}`; // Store in posts bucket under user/comments/
      console.log('Uploading comment image to Supabase storage at path:', filePath);

      const uploadUrl = `${supabaseUrl}/storage/v1/object/posts/${filePath}`;

      const uploadResult = await FileSystem.uploadAsync(uploadUrl, manipResult.uri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (uploadResult.status !== 200) {
        const errorText = uploadResult.body || 'Unknown upload error';
        console.error('Upload failed:', errorText);
        throw new Error(`Upload failed with status ${uploadResult.status}: ${errorText}`);
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
      // Upload image if selected BEFORE creating the comment
      let imageUrl: string | null = null;
      if (selectedImage) {
        imageUrl = await uploadImage(user.id, selectedImage);
        if (!imageUrl) {
          // Upload failed, alert shown in uploadImage
          setIsSubmitting(false);
          return; // Stop submission
        }
      }

      // Call RPC function WITH image URL - single atomic operation
      const { data: commentId, error: rpcError } = await supabase.rpc('create_comment', {
        p_post_id: postId,
        p_content: commentText.trim(),
        p_user_id: user.id,
        p_image_url: imageUrl, // Now included in the atomic operation
      });

      if (rpcError) {
        console.error('Error calling create_comment RPC:', rpcError);
        if (rpcError.message.includes('violates foreign key constraint')) {
          Alert.alert('Error', 'Could not add comment. The associated post may no longer exist.');
        } else {
          Alert.alert('Error', 'Failed to add comment. Please try again.');
        }
        throw rpcError;
      }

      // Fetch the newly created comment using the returned ID
      if (commentId) {
        const { data: commentData, error: fetchError } = await supabase
          .from('comments')
          .select(
            `
            *,
            profiles (username, avatar_url)
          `
          )
          .eq('id', commentId)
          .single();

        if (fetchError) {
          console.error('Error fetching newly created comment:', fetchError);
          Alert.alert('Warning', 'Comment added, but could not immediately display it.');
        } else if (commentData) {
          // Add new comment to state - image_url is already set from the atomic operation
          const newComment: CommentWithProfile = {
            ...commentData,
            profile: commentData.profiles as { username: string; avatar_url: string | null },
            image_url: commentData.image_url, // Already set in the database
          };
          setComments((prev) => [newComment, ...prev]);
          setCommentsCount((prev) => prev + 1);

          // Call the callback if provided
          if (onCommentAdded) onCommentAdded();
        }
      } else {
        console.warn('RPC function did not return comment ID.');
        Alert.alert(
          'Warning',
          'Comment may have been created, but could not immediately display it.'
        );
      }
    } catch (error) {
      console.error('Error adding comment:', error);
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

  // 🎯 Performance optimized render functions
  const keyExtractor = React.useCallback((item: CommentWithProfile) => String(item.id), []);

  // Render a comment item
  const renderComment = React.useCallback(
    ({ item }: { item: CommentWithProfile }) => (
      <CommentItem comment={item} currentUserId={user?.id} />
    ),
    [user?.id]
  );

  // Backdrop gesture
  const backdropGesture = Gesture.Tap().onEnd(() => {
    runOnJS(onClose)();
  });

  // Modal animated styles
  const backdropAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: backdropOpacity.value,
    };
  });

  const modalAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { scale: modalScale.value },
        {
          translateY: interpolate(modalOpacity.value, [0, 1], [300, 0]),
        },
      ],
      opacity: modalOpacity.value,
    };
  });

  return (
    <Modal animationType="none" transparent visible={isVisible} onRequestClose={onClose}>
      <GestureDetector gesture={backdropGesture}>
        <Animated.View className="flex-1 bg-black/50" style={backdropAnimatedStyle}>
          <Pressable style={{ flex: 1 }} onPress={onClose}>
            <Animated.View
              className="mt-15 flex-1 overflow-hidden rounded-t-[20px] bg-white dark:bg-neutral-900"
              style={modalAnimatedStyle}>
              <Pressable style={{ flex: 1 }}>
                {/* Header is outside KAV */}
                <ThemedView className="flex-row items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800">
                  <View className="flex-row items-center">
                    <ThemedText className="text-lg font-bold">Comments</ThemedText>
                    {commentsCount > 0 ? (
                      <ThemedText className="ml-2 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                        {commentsCount}
                      </ThemedText>
                    ) : null}
                  </View>
                  <AnimatedActionButton
                    onPress={onClose}
                    className="rounded-full p-2"
                    accessibilityLabel="Close comments"
                    hapticStyle={ImpactFeedbackStyle.Medium}>
                    <OptimizedIcon
                      name="close"
                      size={24}
                      className="text-neutral-700 dark:text-neutral-300"
                    />
                  </AnimatedActionButton>
                </ThemedView>
                {/* Content container with built-in keyboard avoidance */}
                <Animated.View style={{ flex: 1 }}>
                  {/* Comment List */}
                  {isLoading ? (
                    <View className="flex-1 items-center justify-center">
                      <ActivityIndicator size="large" className="text-primary-500" />
                    </View>
                  ) : (
                    <EnhancedKeyboardWrapper className="flex-1" showToolbar={false}>
                      <FlatList
                        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 80 }}
                        keyboardShouldPersistTaps="handled"
                        data={comments}
                        renderItem={renderComment}
                        keyExtractor={keyExtractor}
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        ListEmptyComponent={
                          <ThemedView className="flex-1 items-center justify-center p-8">
                            <OptimizedIcon
                              name="chatbubble-outline"
                              size={40}
                              className="text-neutral-300 dark:text-neutral-600"
                            />
                            <ThemedText className="mt-3 text-center text-base text-neutral-500 dark:text-neutral-400">
                              No comments yet. Be the first to share your thoughts!
                            </ThemedText>
                            <AnimatedActionButton
                              onPress={focusCommentInput}
                              className="mt-4 rounded-full bg-primary-500 px-5 py-2"
                              accessibilityLabel="Add Comment"
                              hapticStyle={ImpactFeedbackStyle.Medium}>
                              <ThemedText className="font-medium text-white">Add Comment</ThemedText>
                            </AnimatedActionButton>
                          </ThemedView>
                        }
                        // ⚡ Reanimated v3 compatible performance optimizations
                        initialNumToRender={10}
                        maxToRenderPerBatch={5}
                        windowSize={10}
                        updateCellsBatchingPeriod={100}
                        removeClippedSubviews={true}
                      />
                    </EnhancedKeyboardWrapper>
                  )}

                  {/* Input Area */}
                  <ThemedView className="flex-row items-center border-t border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800">
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
                            }}
                            className="bg-neutral-200 dark:bg-neutral-700"
                            resizeMode="cover"
                          />
                          <AnimatedActionButton
                            onPress={() => setSelectedImage(null)}
                            className="absolute right-2 top-2 h-6 w-6 items-center justify-center rounded-full bg-black/50"
                            accessibilityLabel="Remove image"
                            hapticStyle={ImpactFeedbackStyle.Light}>
                            <OptimizedIcon name="close" size={16} className="text-white" />
                          </AnimatedActionButton>
                        </View>
                      )}

                      {/* Enhanced Input Field */}
                      <EnhancedTextInput
                        ref={inputRef}
                        className="max-h-[100px] flex-1"
                        placeholder="Add a comment..."
                        value={commentText}
                        onChangeText={setCommentText}
                        multiline
                        editable={!isSubmitting && !isUploading}
                        returnKeyType="send"
                        blurOnSubmit
                        onSubmitEditing={commentText.trim() ? handleAddComment : undefined}
                        maxLength={500}
                        showCharacterCount={commentText.length > 400}
                        onFocus={() => triggerLightHaptic()}
                      />
                    </View>

                    {/* Photo Button */}
                    <AnimatedActionButton
                      onPress={handleAttachPhoto} // Changed to present choice
                      disabled={isSubmitting || isUploading}
                      className="ml-2 rounded-full bg-neutral-300 p-2 dark:bg-neutral-700"
                      accessibilityLabel="Attach photo"
                      hapticStyle={ImpactFeedbackStyle.Light}>
                      <OptimizedIcon
                        name="camera"
                        size={18}
                        className="text-neutral-600 dark:text-neutral-300"
                      />
                    </AnimatedActionButton>

                    {/* Send Button */}
                    <AnimatedActionButton
                      onPress={handleAddComment}
                      disabled={
                        (!commentText.trim() && !selectedImage) || isSubmitting || isUploading
                      }
                      className="ml-2 rounded-full p-2"
                      style={{
                        backgroundColor:
                          (!commentText.trim() && !selectedImage) || isSubmitting || isUploading
                            ? '#e5e7eb'
                            : '#10b981',
                      }}
                      accessibilityLabel="Send comment"
                      hapticStyle={ImpactFeedbackStyle.Medium}>
                      {isSubmitting || isUploading ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <OptimizedIcon name="send" size={18} className="text-white" />
                      )}
                    </AnimatedActionButton>
                  </ThemedView>

                  {/* Keyboard avoidance handled by EnhancedKeyboardWrapper parent */}
                </Animated.View>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
}

export default React.memo(CommentModal);

// Removed StyleSheet definition
