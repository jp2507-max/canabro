// Removed duplicate Ionicons import

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { takePhoto, selectFromGallery } from '@/lib/utils/image-picker';
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
import type { StyleProp, ViewStyle } from 'react-native';
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
import { useComments } from '../../lib/hooks/community/usePosts';
import { useRealTimeCommentUpdates } from '../../lib/hooks/community/useRealTimeUpdates';
import supabase from '../../lib/supabase';
import { uploadCommentImage } from '../../lib/utils/upload-image';
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
import { useTranslation } from 'react-i18next';

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
  style?: StyleProp<ViewStyle>;
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
  const { t } = useTranslation('community');
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // 🎯 Use React Query hooks for comments
  const { 
    data: comments = [], 
    isLoading, 
    isRefetching: isRefreshing, 
    refetch: refetchComments 
  } = useComments({ postId: isVisible ? postId : undefined, userId: user?.id });

  // 🎯 Real-time updates for comments
  useRealTimeCommentUpdates(isVisible ? postId : undefined, user?.id);

  const commentsCount = comments.length;

  // Animation values
  const modalScale = useSharedValue(0.95);
  const modalOpacity = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

  // Handle modal animations
  useEffect(() => {
    if (isVisible && postId) {
      // Animate modal entrance
      modalScale.value = withSpring(1, SPRING_CONFIG);
      modalOpacity.value = withSpring(1, SPRING_CONFIG);
      backdropOpacity.value = withTiming(1, { duration: 200 });
    } else {
      // Reset when modal is hidden
      setCommentText('');
      // Animate modal exit
      modalScale.value = withSpring(0.95, SPRING_CONFIG);
      modalOpacity.value = withTiming(0, { duration: 150 });
      backdropOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [isVisible, postId]);

  // Handle refreshing comments
  const handleRefresh = () => {
    refetchComments();
  };

  // Handle taking a photo with the camera
  const handleTakePhoto = async () => {
    try {
      const result = await takePhoto();
      if (result) {
        setSelectedImage(result.uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert(t('common.error'), t('commentModal.failedToTakePhoto'));
    }
  };

  // Handle selecting an image from the gallery
  const handlePickImage = async () => {
    try {
      const result = await selectFromGallery();
      if (result) {
        setSelectedImage(result.uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('common.error'), t('commentModal.failedToPickImage'));
    }
  };

  // Present choice between camera and library
  const handleAttachPhoto = () => {
    Alert.alert(
      t('commentModal.attachPhotoTitle'),
      t('commentModal.attachPhotoMessage'),
      [
        { text: t('commentModal.takePhoto'), onPress: handleTakePhoto },
        { text: t('commentModal.chooseFromLibrary'), onPress: handlePickImage },
        { text: t('commentModal.cancel'), style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  // Upload image using centralized helper
  const handleImageUpload = async (userId: string, uri: string): Promise<string | null> => {
    setIsUploading(true);
    try {
      const result = await uploadCommentImage(userId, uri);
      return result.success ? result.publicUrl || null : null;
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
        imageUrl = await handleImageUpload(user.id, selectedImage);
        if (!imageUrl) {
          // Upload failed, alert shown in upload helper
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
          Alert.alert(t('common.error'), t('commentModal.failedToAddCommentPostMissing'));
        } else {
          Alert.alert(t('common.error'), t('commentModal.failedToAddComment'));
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
          Alert.alert(t('common.warning'), t('commentModal.commentAddedWarning'));
        } else if (commentData) {
          // React Query will automatically update the cache via real-time subscriptions
          // Call the callback if provided
          if (onCommentAdded) onCommentAdded();
        }
      } else {
        console.warn('RPC function did not return comment ID.');
        Alert.alert(
          t('common.warning'),
          t('commentModal.commentPotentialWarningMessage')
        );
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert(t('common.error'), t('commentModal.failedToAddComment'));
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
                    <ThemedText className="text-lg font-bold">{t('commentModal.title')}</ThemedText>
                    {commentsCount > 0 ? (
                      <ThemedText className="ml-2 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                        {commentsCount}
                      </ThemedText>
                    ) : null}
                  </View>
                  <AnimatedActionButton
                    onPress={onClose}
                    className="rounded-full p-2"
                    accessibilityLabel={t('commentModal.close')}
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
                              {t('commentModal.noComments')}
                            </ThemedText>
                            <AnimatedActionButton
                              onPress={focusCommentInput}
                              className="mt-4 rounded-full bg-primary-500 px-5 py-2"
                              accessibilityLabel={t('commentModal.addComment')}
                              hapticStyle={ImpactFeedbackStyle.Medium}>
                              <ThemedText className="font-medium text-white">{t('commentModal.addComment')}</ThemedText>
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
                            accessibilityLabel={t('commentModal.removeImage')}
                            hapticStyle={ImpactFeedbackStyle.Light}>
                            <OptimizedIcon name="close" size={16} className="text-white" />
                          </AnimatedActionButton>
                        </View>
                      )}

                      {/* Enhanced Input Field */}
                      <EnhancedTextInput
                        ref={inputRef}
                        className="max-h-[100px] flex-1"
                        placeholder={t('commentModal.inputPlaceholder')}
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
                      accessibilityLabel={t('commentModal.attachPhoto')}
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
                      accessibilityLabel={t('commentModal.sendComment')}
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
