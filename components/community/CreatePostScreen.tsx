import React, { useState, useCallback, useRef } from 'react';
import { takePhoto, selectFromGallery } from '@/lib/utils/image-picker';
import {
  Modal,
  View,
  Pressable,
  TextInput,
  Alert,
  StatusBar,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../lib/contexts/AuthProvider';
import { CommunityService } from '../../lib/services/community-service';
import { uploadQuestionImage, uploadPlantShareImage } from '../../lib/utils/upload-image';
import { triggerLightHaptic, triggerMediumHapticSync } from '@/lib/utils/haptics';
import { EnhancedTextInput } from '../ui/EnhancedTextInput';
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';
import EnhancedKeyboardWrapper from '@/components/keyboard/EnhancedKeyboardWrapper';
import { PostAuthorRow } from './PostAuthorRow';
import { NativeIconSymbol } from '@/components/ui/NativeIconSymbol';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';

type CreatePostScreenProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  postType?: 'question' | 'plant_share' | null;
};

// Animation config
const SPRING_CONFIG = {
  damping: 20,
  stiffness: 300,
  mass: 0.8,
} as const;

/**
 * Top Bar Component with X, Privacy pill, and Post button
 */
function TopBar({ onClose, onPost, canPost, isSubmitting }: {
  onClose: () => void;
  onPost: () => void;
  canPost: boolean;
  isSubmitting: boolean;
}) {
  const closeScale = useSharedValue(1);
  const postScale = useSharedValue(1);
  const postPressed = useSharedValue(0);

  const closeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: closeScale.value }],
  }));

  const postAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      postPressed.value,
      [0, 1],
      ['#BAE06F', '#9BC34F'] // limePrimary to limePrimary-active
    );

    return {
      transform: [{ scale: postScale.value }],
      backgroundColor,
    };
  });

  const handleClosePress = () => {
    'worklet';
    closeScale.value = withSpring(0.9, SPRING_CONFIG);
    runOnJS(() => {
      triggerLightHaptic();
      setTimeout(() => {
        closeScale.value = withSpring(1, SPRING_CONFIG);
        onClose();
      }, 100);
    })();
  };

  const handlePostPressIn = () => {
    'worklet';
    if (!canPost || isSubmitting) return;
    postScale.value = withSpring(0.95, SPRING_CONFIG);
    postPressed.value = withSpring(1, SPRING_CONFIG);
    runOnJS(triggerLightHaptic)();
  };

  const handlePostPressOut = () => {
    'worklet';
    postScale.value = withSpring(1, SPRING_CONFIG);
    postPressed.value = withSpring(0, SPRING_CONFIG);
  };

  const handlePostPress = () => {
    if (!canPost || isSubmitting) return;
    triggerMediumHapticSync();
    onPost();
  };

  return (
    <ThemedView className="flex-row items-center justify-between px-4 h-16 bg-white">
      {/* Close Button - Made even bigger with SF Symbol */}
      <Animated.View style={closeAnimatedStyle}>
        <Pressable
          onPress={handleClosePress}
          className="w-12 h-12 items-center justify-center"
          accessibilityLabel="Close"
          accessibilityRole="button">
          <NativeIconSymbol 
            name="close" 
            size={32} 
            tintColor="#000000"
            weight="medium"
          />
        </Pressable>
      </Animated.View>

      {/* Spacer - Privacy selector will be in the author row */}
      <View />

      {/* Post Button - Made even bigger */}
      <Animated.View style={postAnimatedStyle} className="rounded-3xl">
        <Pressable
          onPress={handlePostPress}
          onPressIn={handlePostPressIn}
          onPressOut={handlePostPressOut}
          disabled={!canPost || isSubmitting}
          className={`px-8 h-12 items-center justify-center rounded-3xl ${
            !canPost || isSubmitting ? 'opacity-50' : ''
          }`}
          style={{
            shadowColor: 'rgba(0,0,0,0.10)',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 1,
            shadowRadius: 2,
            elevation: 2,
          }}
          accessibilityLabel="Post"
          accessibilityRole="button">
          <ThemedText className="text-lg font-semibold" style={{ color: '#33663F' }}>
            {isSubmitting ? 'Posting...' : 'Post'}
          </ThemedText>
        </Pressable>
      </Animated.View>
    </ThemedView>
  );
}

/**
 * Native iOS-style Bottom Toolbar - Enhanced design with SF Symbols
 */
function EnhancedBottomToolbar({ 
  onCameraPress,
  onPhotoLibraryPress,
  onMentionPress: _onMentionPress,
  disabled = false,
}: {
  onCameraPress?: () => void;
  onPhotoLibraryPress?: () => void;
  onMentionPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <ThemedView className="px-6 py-4 bg-white border-t border-neutral-100">
      <View className="flex-row items-center justify-around">
        <NativeActionButton
          iconName="camera"
          onPress={onCameraPress}
          disabled={disabled}
          accessibilityLabel="Take photo with camera"
        />
        <NativeActionButton
          iconName="images-outline"
          onPress={onPhotoLibraryPress}
          disabled={disabled}
          accessibilityLabel="Choose from photo library"
        />
        <NativeActionButton
          iconName="calendar-outline"
          onPress={() => console.log('Calendar pressed')}
          disabled={disabled}
          accessibilityLabel="Schedule post"
        />
        <NativeActionButton
          iconName="layers-outline"
          onPress={() => console.log('Layers pressed')}
          disabled={disabled}
          accessibilityLabel="Add layers"
        />
        <View className="w-6" />
      </View>
    </ThemedView>
  );
}

/**
 * Native iOS-style action button - Enhanced design with SF Symbols
 */
function NativeActionButton({ 
  iconName,
  onPress, 
  disabled,
  accessibilityLabel 
}: {
  iconName: string;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    'worklet';
    if (disabled) return;
    scale.value = withSpring(0.8, SPRING_CONFIG);
    opacity.value = withSpring(0.6, SPRING_CONFIG);
    runOnJS(triggerLightHaptic)();
  };

  const handlePressOut = () => {
    'worklet';
    scale.value = withSpring(1, SPRING_CONFIG);
    opacity.value = withSpring(1, SPRING_CONFIG);
  };

  const handlePress = () => {
    if (disabled) return;
    triggerMediumHapticSync();
    onPress?.();
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        className={`w-16 h-16 items-center justify-center rounded-2xl ${
          disabled ? 'opacity-30' : 'bg-neutral-50'
        }`}
        style={{
          shadowColor: 'rgba(0,0,0,0.05)',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 1,
          shadowRadius: 3,
          elevation: 1,
        }}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button">
        <NativeIconSymbol 
          name={iconName}
          size={28} 
          tintColor={disabled ? "#9CA3AF" : "#374151"}
          weight="regular"
          scale="large"
        />
      </Pressable>
    </Animated.View>
  );
}

/**
 * Animated Selection Button for form options
 */
interface AnimatedSelectionButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  selected: boolean;
  disabled?: boolean;
}

function AnimatedSelectionButton({ onPress, children, selected, disabled = false }: AnimatedSelectionButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const backgroundColor = interpolateColor(
      selected ? 1 : 0,
      [0, 1],
      ['rgba(0,0,0,0)', '#22c55e'] // transparent to green-500
    );
    const borderColor = interpolateColor(
      selected ? 1 : 0,
      [0, 1],
      ['#d4d4d8', '#22c55e'] // neutral-300 to green-500
    );
    return {
      transform: [{ scale: scale.value }],
      backgroundColor,
      borderColor,
    };
  });

  const gesture = Gesture.Tap()
    .enabled(!disabled)
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
    })
    .onFinalize(() => {
      'worklet';
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    })
    .onEnd(() => {
      runOnJS(triggerLightHaptic)();
      runOnJS(onPress)();
    });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={animatedStyle}
        className={`border-2 rounded-xl px-4 py-2 ${disabled ? 'opacity-50' : ''}`}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

/**
 * Main CreatePost Screen Component
 */
export default function CreatePostScreen({ visible, onClose, onSuccess, postType }: CreatePostScreenProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  
  // Plant share specific form fields
  const [plantName, setPlantName] = useState('');
  const [growthStage, setGrowthStage] = useState<'seedling' | 'vegetative' | 'flowering' | 'harvest'>('vegetative');
  const [environment, setEnvironment] = useState<'indoor' | 'outdoor' | 'greenhouse'>('indoor');

  const contentInputRef = useRef<TextInput>(null);

  // Fix: Ensure canPost is always boolean
  const canPost = Boolean(
    (content.trim().length > 0 || image) && 
    (postType !== 'plant_share' || plantName.trim().length > 0)
  );

  // Image upload function using appropriate upload function based on post type
  const handleImageUpload = async (userId: string, imageUri: string): Promise<string | null> => {
    const uploadFunction = postType === 'question' ? uploadQuestionImage : uploadPlantShareImage;
    const result = await uploadFunction(userId, imageUri);
    return result.success ? result.publicUrl || null : null;
  };

  // Action handlers
  const handleImagePicker = useCallback(async () => {
    const result = await selectFromGallery();
    if (result) {
      setImage(result.uri);
    }
  }, []);

  const handleCameraPress = useCallback(async () => {
    const result = await takePhoto();
    if (result) {
      setImage(result.uri);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canPost || !user) return;
    
    setIsSubmitting(true);
    try {
      let imageUrl: string | null = null;
      if (image) {
        imageUrl = await handleImageUpload(user.id, image);
        if (!imageUrl) {
          setIsSubmitting(false);
          return;
        }
      }

      if (postType === 'question') {
        await CommunityService.createQuestion({
          title: content.trim().length > 50 ? content.trim().substring(0, 50) + '...' : content.trim(),
          content: content.trim(),
          category: 'general',
          image_url: imageUrl ?? undefined,
        });
      } else if (postType === 'plant_share') {
        await CommunityService.createPlantShare({
          plant_name: plantName.trim(),
          content: content.trim(),
          growth_stage: growthStage,
          environment: environment,
          images_urls: imageUrl ? [imageUrl] : undefined,
        });
      } else {
        // Fallback to general post if no specific type
        throw new Error('Post type not specified. Please select a post type from the menu.');
      }

      Alert.alert('Success', 'Post created successfully!');
      onSuccess?.();
      handleReset();
      onClose();
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [canPost, user, content, image, onSuccess, onClose, postType, plantName, growthStage, environment]);

  const handleReset = () => {
    setContent('');
    setImage(null);
    setPlantName('');
    setGrowthStage('vegetative');
    setEnvironment('indoor');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Placeholder handlers for other actions
  const _handleMentionPress = () => console.log('Mention pressed');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      <EnhancedKeyboardWrapper
        className="flex-1 bg-white"
        showToolbar={true}
        doneText="Done"
        extraOffset={0}>
        <ThemedView className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
          {/* Top Bar */}
          <TopBar 
            onClose={handleClose}
            onPost={handleSubmit}
            canPost={canPost}
            isSubmitting={isSubmitting}
          />

          {/* Author Row with Privacy Selector - Enhanced avatar size */}
          <ThemedView className="px-4 py-4 border-b border-neutral-100">
            <PostAuthorRow
              userAvatarUrl={user?.user_metadata?.avatar_url || ''}
              userName={user?.user_metadata?.username || 'You'}
              privacy="everyone"
              disabled={isSubmitting}
            />
          </ThemedView>

          {/* Post Type Header */}
          {postType && (
            <ThemedView className="px-4 py-3 bg-neutral-50 border-b border-neutral-100">
              <View className="flex-row items-center">
                {postType === 'question' ? (
                  <>
                    <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                      <OptimizedIcon name="help-circle" size={18} className="text-amber-600" />
                    </View>
                    <ThemedText className="text-sm font-medium text-neutral-700">
                      Ask a Question
                    </ThemedText>
                  </>
                ) : (
                  <>
                    <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-green-100">
                      <OptimizedIcon name="leaf" size={18} className="text-green-600" />
                    </View>
                    <ThemedText className="text-sm font-medium text-neutral-700">
                      Share a Plant
                    </ThemedText>
                  </>
                )}
              </View>
            </ThemedView>
          )}

          {/* Main Content */}
          <ThemedView className="flex-1 px-4 py-4">
            {/* Enhanced Text Input */}
            <EnhancedTextInput
              ref={contentInputRef}
              value={content}
              onChangeText={setContent}
              placeholder={
                postType === 'question' 
                  ? "What's your growing question?" 
                  : postType === 'plant_share'
                  ? "Tell us about your plant..."
                  : "What's on your mind?"
              }
              variant="post"
              multiline
              autoFocus
              showCharacterCount={false}
              inputAccessoryViewID="PostToolbar"
              accessibilityLabel="Post content"
            />

            {/* Plant Share Form Fields */}
            {postType === 'plant_share' && (
              <View className="mt-4 space-y-4">
                {/* Plant Name Input */}
                <View>
                  <ThemedText className="text-sm font-medium text-neutral-700 mb-2">
                    Plant Name *
                  </ThemedText>
                  <EnhancedTextInput
                    value={plantName}
                    onChangeText={setPlantName}
                    placeholder="e.g., My Purple Kush"
                    maxLength={50}
                    showCharacterCount
                    accessibilityLabel="Plant name"
                  />
                </View>

                {/* Growth Stage Selector */}
                <View>
                  <ThemedText className="text-sm font-medium text-neutral-700 mb-2">
                    Growth Stage *
                  </ThemedText>
                  <View className="flex-row flex-wrap gap-2">
                    {(['seedling', 'vegetative', 'flowering', 'harvest'] as const).map((stage) => (
                      <AnimatedSelectionButton
                        key={stage}
                        onPress={() => setGrowthStage(stage)}
                        selected={growthStage === stage}
                        disabled={isSubmitting}>
                        <ThemedText
                          className={
                            growthStage === stage
                              ? 'font-medium text-white'
                              : 'text-neutral-900 dark:text-neutral-100'
                          }>
                          {stage.charAt(0).toUpperCase() + stage.slice(1)}
                        </ThemedText>
                      </AnimatedSelectionButton>
                    ))}
                  </View>
                </View>

                {/* Environment Selector */}
                <View>
                  <ThemedText className="text-sm font-medium text-neutral-700 mb-2">
                    Environment *
                  </ThemedText>
                  <View className="flex-row flex-wrap gap-2">
                    {(['indoor', 'outdoor', 'greenhouse'] as const).map((env) => (
                      <AnimatedSelectionButton
                        key={env}
                        onPress={() => setEnvironment(env)}
                        selected={environment === env}
                        disabled={isSubmitting}>
                        <ThemedText
                          className={
                            environment === env
                              ? 'font-medium text-white'
                              : 'text-neutral-900 dark:text-neutral-100'
                          }>
                          {env.charAt(0).toUpperCase() + env.slice(1)}
                        </ThemedText>
                      </AnimatedSelectionButton>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Show selected image preview */}
            {image && (
              <View className="mt-4 rounded-lg overflow-hidden">
                <Pressable onPress={() => setImage(null)} className="absolute top-2 right-2 z-10 w-8 h-8 bg-black/50 rounded-full items-center justify-center">
                  <NativeIconSymbol name="close" size={20} tintColor="#FFFFFF" />
                </Pressable>
                <ThemedText className="text-sm text-neutral-600 mb-2">Image selected</ThemedText>
              </View>
            )}
          </ThemedView>

          {/* Enhanced Bottom Toolbar */}
          <EnhancedBottomToolbar
            onCameraPress={handleCameraPress}
            onPhotoLibraryPress={handleImagePicker}
            onMentionPress={_handleMentionPress}
            disabled={isSubmitting}
          />
        </ThemedView>
      </EnhancedKeyboardWrapper>
    </Modal>
  );
}
