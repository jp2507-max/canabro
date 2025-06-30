/**
 * CreatePostBottomSheet - iOS-like bottom sheet for creating posts and asking questions
 * 
 * Features:
 * - 92% max height ratio with 16px horizontal insets
 * - Gesture dismissal with 0.25 threshold
 * - Keyboard avoidance using existing useEnhancedKeyboard hook
 * - Integration with SegmentedPostControl, PostAuthorRow, PostActionButtons
 * - Enhanced animations and haptic feedback
 * - Accessibility support
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  Platform,
  useWindowDimensions,
  Pressable,
  TextInput,
  Keyboard,
  Alert,
  Text,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';
import { EnhancedTextInput } from '@/components/ui/EnhancedTextInput';
import { KeyboardToolbar } from '@/components/ui/KeyboardToolbar';
import { SegmentedPostControl, PostMode } from './SegmentedPostControl';
import { PostAuthorRow, PrivacyLevel } from './PostAuthorRow';
import { PostActionButtons } from './PostActionButtons';
import { useEnhancedKeyboard } from '@/lib/hooks/useEnhancedKeyboard';
import { triggerLightHaptic, triggerMediumHaptic } from '@/lib/utils/haptics';

export interface CreatePostBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onCreatePost?: (data: PostData) => Promise<void>;
  onCreateQuestion?: (data: QuestionData) => Promise<void>;
  userAvatarUrl?: string;
  userName?: string;
}

export interface PostData {
  content: string;
  privacy: PrivacyLevel;
  image?: string;
  location?: Location.LocationObject;
}

export interface QuestionData {
  title: string;
  content: string;
  privacy: PrivacyLevel;
  image?: string;
  location?: Location.LocationObject;
}

// Animation configurations following iOS design patterns
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 200,
  mass: 0.8,
} as const;



const TIMING_CONFIG = {
  duration: 300,
} as const;

// Bottom sheet configuration
const SHEET_MAX_HEIGHT_RATIO = 0.92;
const SHEET_HORIZONTAL_INSET = 16;
const DISMISS_THRESHOLD = 0.25;

/**
 * iOS-like bottom sheet for creating posts and asking questions
 */
export function CreatePostBottomSheet({
  visible,
  onClose,
  onCreatePost,
  onCreateQuestion,
  userAvatarUrl,
  userName,
}: CreatePostBottomSheetProps) {
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // State management
  const [mode, setMode] = useState<PostMode>('post');
  const [content, setContent] = useState('');
  const [questionTitle, setQuestionTitle] = useState('');
  const [privacy, setPrivacy] = useState<PrivacyLevel>('everyone');
  const [image, setImage] = useState<string | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs for input management
  const contentInputRef = useRef<TextInput>(null);
  const titleInputRef = useRef<TextInput>(null);
  const inputRefs = mode === 'question' ? [titleInputRef, contentInputRef] : [contentInputRef];
  const totalInputs = inputRefs.length;

  // Enhanced keyboard handling
  const {
    isKeyboardVisible,
    keyboardHeight,
    currentIndex,
    goToNextInput,
    goToPreviousInput,
    dismissKeyboard,
    canGoNext,
    canGoPrevious,
    setCurrentIndex,
  } = useEnhancedKeyboard(inputRefs, totalInputs);

  // Animation values
  const backdropOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(screenHeight);
  const gestureContext = useSharedValue({ startY: 0 });

  // Calculated sheet height
  const maxSheetHeight = screenHeight * SHEET_MAX_HEIGHT_RATIO;
  const sheetHeight = Math.min(
    maxSheetHeight,
    screenHeight - insets.top - 20 // 20px top margin
  );

  // Reset form when mode changes – skip first render to avoid unintended keyboard hide
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setContent('');
    setQuestionTitle('');
    setImage(null);
    setLocation(null);
    // Do NOT force-dismiss here; user may still be typing
  }, [mode]);

  // Handle modal visibility changes
  useEffect(() => {
    if (visible) {
      showSheet();
    } else {
      hideSheet();
    }
  }, [visible]);

  // Sheet presentation animations
  const showSheet = useCallback(() => {
    triggerMediumHaptic();
    backdropOpacity.value = withTiming(1, TIMING_CONFIG);
    sheetTranslateY.value = withSpring(0, SPRING_CONFIG);
  }, []);

  const hideSheet = useCallback(() => {
    triggerLightHaptic();
    Keyboard.dismiss();
    backdropOpacity.value = withTiming(0, TIMING_CONFIG);
    sheetTranslateY.value = withSpring(screenHeight, SPRING_CONFIG, () => {
      runOnJS(onClose)();
    });
  }, [onClose, screenHeight]);

  // Gesture handling for sheet dismissal
  const panGesture = Gesture.Pan()
    .onStart(() => {
      gestureContext.value = { startY: sheetTranslateY.value };
    })
    .onUpdate((event) => {
      const translateY = Math.max(0, gestureContext.value.startY + event.translationY);
      sheetTranslateY.value = translateY;

      // Update backdrop opacity based on sheet position
      const progress = Math.min(1, translateY / (sheetHeight * DISMISS_THRESHOLD));
      backdropOpacity.value = 1 - progress * 0.7;
    })
    .onEnd((event) => {
      const translateY = gestureContext.value.startY + event.translationY;
      const velocity = event.velocityY;
      const shouldDismiss = 
        translateY > sheetHeight * DISMISS_THRESHOLD || 
        velocity > 1000;

      if (shouldDismiss) {
        hideSheet();
      } else {
        // Snap back to original position
        sheetTranslateY.value = withSpring(0, SPRING_CONFIG);
        backdropOpacity.value = withTiming(1, TIMING_CONFIG);
      }
    });

  // Input focus handlers
  const handleInputFocus = useCallback((index: number) => {
    setCurrentIndex(index);
    triggerLightHaptic();
  }, [setCurrentIndex]);

  // Action handlers
  const handleCameraPress = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Camera permission is needed to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setImage(result.assets[0].uri);
        triggerLightHaptic();
      }
    } catch (error) {
      console.error('Camera error:', error);
    }
  }, []);

  const handleGifPress = useCallback(() => {
    // TODO: Implement GIF picker
    triggerLightHaptic();
    console.log('GIF picker not implemented yet');
  }, []);

  const handleMentionPress = useCallback(() => {
    // TODO: Implement mention functionality
    triggerLightHaptic();
    console.log('Mention functionality not implemented yet');
  }, []);

  const handleLocationPress = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Location permission is needed to add location.');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
      triggerLightHaptic();
    } catch (error) {
      console.error('Location error:', error);
    }
  }, []);

  // Submit handlers
  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;

    const canSubmit = mode === 'question' 
      ? questionTitle.trim().length > 0 && content.trim().length > 0
      : content.trim().length > 0 || image;

    if (!canSubmit) return;

    setIsSubmitting(true);
    triggerMediumHaptic();

    try {
      if (mode === 'question' && onCreateQuestion) {
        await onCreateQuestion({
          title: questionTitle.trim(),
          content: content.trim(),
          privacy,
          image: image || undefined,
          location: location || undefined,
        });
      } else if (mode === 'post' && onCreatePost) {
        await onCreatePost({
          content: content.trim(),
          privacy,
          image: image || undefined,
          location: location || undefined,
        });
      }
      
      // Reset form and close
      setContent('');
      setQuestionTitle('');
      setImage(null);
      setLocation(null);
      hideSheet();
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isSubmitting,
    mode,
    questionTitle,
    content,
    image,
    privacy,
    location,
    onCreateQuestion,
    onCreatePost,
    hideSheet,
  ]);

  // Determine if submit is enabled
  const canSubmit = mode === 'question' 
    ? questionTitle.trim().length > 0 && content.trim().length > 0
    : content.trim().length > 0 || image;

  // Animated styles
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));
  const keyboardOffset = isKeyboardVisible ? keyboardHeight : 0;

  // Platform-specific blur background
  const blurBackgroundStyle = {
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.85)' : '#ffffff',
  };

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={hideSheet}
    >
      <View className="flex-1">
        {/* Backdrop */}
        <Pressable className="flex-1" onPress={hideSheet}>
          <Animated.View
            className="absolute inset-0 bg-black/60"
            style={backdropStyle}
          />
        </Pressable>

        {/* Bottom Sheet */}
        <GestureDetector gesture={panGesture}>
          <Animated.View
            className="absolute bottom-0 rounded-t-[20px] overflow-hidden"
            style={[
              {
                left: SHEET_HORIZONTAL_INSET,
                right: SHEET_HORIZONTAL_INSET,
                height: sheetHeight,
              },
              sheetStyle,
            ]}          >
          <BlurView
            intensity={100}
            tint="light"
            className="flex-1"
            style={blurBackgroundStyle}
          >
            <ThemedView className="flex-1 bg-white/90 dark:bg-neutral-900/90">
              {/* Drag Indicator */}
              <View className="items-center py-2">
                <View className="w-9 h-1 bg-neutral-300 dark:bg-neutral-600 rounded-full" />
              </View>

              {/* Header */}
              <View className="flex-row items-center justify-between px-4 py-2">
                <Pressable
                  onPress={hideSheet}
                  className="p-2 -ml-2"
                  accessibilityLabel="Cancel"
                  accessibilityRole="button"
                >
                  <OptimizedIcon
                    name="close"
                    size={24}
                    className="text-neutral-600 dark:text-neutral-400"
                  />
                </Pressable>

                <ThemedText className="text-lg font-semibold">
                  {mode === 'question' ? 'Ask Question' : 'Create Post'}
                </ThemedText>

                <Pressable
                  onPress={handleSubmit}
                  disabled={!canSubmit || isSubmitting}
                  className={`px-4 py-2 rounded-full ${
                    canSubmit && !isSubmitting
                      ? 'bg-primary-500'
                      : 'bg-neutral-200 dark:bg-neutral-700'
                  }`}
                  accessibilityLabel={mode === 'question' ? 'Post Question' : 'Post'}
                  accessibilityRole="button"
                >
                  <ThemedText
                    className={`text-sm font-medium ${
                      canSubmit && !isSubmitting
                        ? 'text-white'
                        : 'text-neutral-400 dark:text-neutral-500'
                    }`}
                  >
                    {isSubmitting ? 'Posting...' : 'Post'}
                  </ThemedText>
                </Pressable>
              </View>

              {/* Content */}
              <View 
                className="flex-1 px-4"
                style={{ 
                  paddingBottom: Math.max(insets.bottom, keyboardOffset) + (isKeyboardVisible ? 60 : 16)
                }}
              >
                {/* Post Mode Selector */}
                <View className="mb-4">
                  <SegmentedPostControl
                    selectedMode={mode}
                    onModeChange={setMode}
                    disabled={isSubmitting}
                  />
                </View>

                {/* Author Row */}
                <View className="mb-4">
                  <PostAuthorRow
                    userAvatarUrl={userAvatarUrl || ''}
                    userName={userName || 'Anonymous'}
                    privacy={privacy}
                    onPrivacyChange={setPrivacy}
                    disabled={isSubmitting}
                  />
                </View>

                {/* Question Title Input (only for question mode) */}
                {mode === 'question' && (
                  <View className="mb-3">
                    <EnhancedTextInput
                      ref={titleInputRef}
                      variant="post"
                      placeholder="What's your question?"
                      value={questionTitle}
                      onChangeText={setQuestionTitle}
                      maxLength={200}
                      onFocus={() => handleInputFocus(0)}
                      editable={!isSubmitting}
                      className="text-lg font-medium"
                    />
                  </View>
                )}

                {/* Content Input */}
                <View className="flex-1 mb-4">
                  <EnhancedTextInput
                    ref={contentInputRef}
                    variant="post"
                    placeholder={
                      mode === 'question' 
                        ? "Provide more details about your question..." 
                        : "What's on your mind?"
                    }
                    value={content}
                    onChangeText={setContent}                    multiline
                    maxLength={2000}
                    onFocus={() => handleInputFocus(mode === 'question' ? 1 : 0)}
                    editable={!isSubmitting}
                    className="min-h-[120px]"
                  />
                </View>

                {/* Image Preview */}
                {image && image.trim() !== '' && (                  <View className="mb-4">
                    <View className="relative">
                      <Image
                        source={{ uri: image }}
                        className="w-full h-[200px] rounded-xl"
                        contentFit="cover"
                      />
                      <Pressable
                        onPress={() => setImage(null)}
                        className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full items-center justify-center"
                      >
                        <OptimizedIcon
                          name="close"
                          size={20}
                          className="text-white"
                        />
                      </Pressable>
                    </View>
                  </View>
                )}

                {/* Location Preview */}
                {location && (
                  <View className="mb-4 flex-row items-center">
                    <OptimizedIcon
                      name="location-outline"
                      size={16}
                      className="text-primary-500 mr-2"
                    />
                    <Text className="text-sm text-neutral-600 dark:text-neutral-400">
                      Location added
                    </Text>
                    <Pressable
                      onPress={() => setLocation(null)}
                      className="ml-auto p-1"
                      disabled={isSubmitting}
                      accessibilityLabel="Remove location"
                      accessibilityRole="button"
                    >
                      <OptimizedIcon
                        name="close"
                        size={16}
                        className="text-neutral-500"
                      />
                    </Pressable>
                  </View>
                )}

                {/* Action Buttons */}
                <PostActionButtons
                  onCameraPress={handleCameraPress}
                  onGifPress={handleGifPress}
                  onMentionPress={handleMentionPress}
                  onLocationPress={handleLocationPress}
                  disabled={isSubmitting}
                />
              </View>
            </ThemedView>
          </BlurView>
        </Animated.View>
      </GestureDetector>

        {/* Keyboard Toolbar */}
        {isKeyboardVisible && (
          <KeyboardToolbar
            isVisible={isKeyboardVisible}
            keyboardHeight={keyboardHeight}
            currentIndex={currentIndex}
            totalFields={totalInputs}
            canGoNext={canGoNext}
            canGoPrevious={canGoPrevious}
            onNext={goToNextInput}
            onPrevious={goToPreviousInput}
            onDone={dismissKeyboard}
            currentField={mode === 'question' && currentIndex === 0 ? 'Question Title' : 'Content'}
          />
        )}
      </View>
    </Modal>
  );
}

export default CreatePostBottomSheet;
