import React, { useState, useCallback, useRef } from 'react';
import { takePhoto, selectFromGallery } from '@/lib/utils/image-picker';
import {
  Modal,
  View,
  Pressable,
  TextInput,
  Alert,
  StatusBar,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
  runOnJS,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../lib/contexts/AuthProvider';
import { CommunityService } from '../../lib/services/community-service';
import { uploadQuestionImage, uploadPlantShareImage, uploadQuestionImageWithVerification, uploadPlantShareImageWithVerification } from '../../lib/utils/upload-image';
import NetworkResilientImage from '../ui/NetworkResilientImage';
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
  postType: 'question' | 'plant_share' | null;
};

// Enhanced animation constants
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 300,
  mass: 1,
};

const SELECTION_SPRING = {
  damping: 20,
  stiffness: 400,
  mass: 0.8,
};

function TopBar({ onClose, onPost, canPost, isSubmitting }: {
  onClose: () => void;
  onPost: () => void;
  canPost: boolean;
  isSubmitting: boolean;
}) {
  const closeScale = useSharedValue(1);
  const postScale = useSharedValue(1);
  const postOpacity = useSharedValue(canPost ? 1 : 0.5);

  const closeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: closeScale.value }],
  }));

  const postStyle = useAnimatedStyle(() => ({
    transform: [{ scale: postScale.value }],
    opacity: postOpacity.value,
  }));

  const handleClosePress = () => {
    'worklet';
    closeScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withSpring(1, SPRING_CONFIG)
    );
    runOnJS(triggerLightHaptic)();
    runOnJS(onClose)();
  };

  const handlePostPressIn = () => {
    'worklet';
    postScale.value = withSpring(0.95, SELECTION_SPRING);
  };

  const handlePostPressOut = () => {
    'worklet';
    postScale.value = withSpring(1, SELECTION_SPRING);
  };

  const handlePostPress = () => {
    'worklet';
    runOnJS(triggerMediumHapticSync)();
    runOnJS(onPost)();
  };

  React.useEffect(() => {
    postOpacity.value = withSpring(canPost && !isSubmitting ? 1 : 0.5, SPRING_CONFIG);
  }, [canPost, isSubmitting]);

  return (
    <ThemedView className="flex-row items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
      <Animated.View style={closeStyle}>
        <GestureDetector gesture={Gesture.Tap().onEnd(handleClosePress)}>
          <Pressable 
            className="h-8 w-8 items-center justify-center rounded-full"
            accessibilityLabel="Close"
            accessibilityRole="button">
            <OptimizedIcon name="close" size={24} className="text-neutral-700 dark:text-neutral-300" />
          </Pressable>
        </GestureDetector>
      </Animated.View>

      <ThemedText className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        Create Post
      </ThemedText>

      <Animated.View style={postStyle}>
        <GestureDetector
          gesture={Gesture.Tap()
            .onBegin(handlePostPressIn)
            .onFinalize(handlePostPressOut)
            .onEnd(handlePostPress)}
        >
          <Pressable
            className={`px-6 py-2 rounded-full ${
              canPost && !isSubmitting
                ? 'bg-primary-500 dark:bg-primary-600'
                : 'bg-neutral-300 dark:bg-neutral-600'
            }`}
            disabled={!canPost || isSubmitting}
            accessibilityLabel="Post"
            accessibilityRole="button">
            <ThemedText className={`font-semibold ${
              canPost && !isSubmitting
                ? 'text-white'
                : 'text-neutral-500 dark:text-neutral-400'
            }`}>
              {isSubmitting ? 'Posting...' : 'Post'}
            </ThemedText>
          </Pressable>
        </GestureDetector>
      </Animated.View>
    </ThemedView>
  );
}

// Enhanced selection component with icons and better visual feedback
interface ModernSelectionCardProps {
  onPress: () => void;
  children: React.ReactNode;
  selected: boolean;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof OptimizedIcon>['name'];
  subtitle?: string;
}

function ModernSelectionCard({ 
  onPress, 
  children, 
  selected, 
  disabled = false,
  icon,
  subtitle
}: ModernSelectionCardProps) {
  const scale = useSharedValue(1);
  const backgroundColor = useSharedValue(selected ? 1 : 0);
  const borderColor = useSharedValue(selected ? 1 : 0);
  const colorScheme = useColorScheme();

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const bgColor = interpolateColor(
      backgroundColor.value,
      [0, 1],
      colorScheme === 'dark' 
        ? ['#1f2937', '#059669'] // neutral-800 to emerald-600
        : ['#f9fafb', '#10b981'] // neutral-50 to emerald-500
    );

    const borderCol = interpolateColor(
      borderColor.value,
      [0, 1],
      colorScheme === 'dark'
        ? ['#374151', '#059669'] // neutral-700 to emerald-600
        : ['#e5e7eb', '#10b981'] // neutral-200 to emerald-500
    );

    return {
      backgroundColor: bgColor,
      borderColor: borderCol,
      transform: [{ scale: scale.value }],
    };
  });

  const textStyle = useAnimatedStyle(() => {
    'worklet';
    const textColor = interpolateColor(
      backgroundColor.value,
      [0, 1],
      colorScheme === 'dark'
        ? ['#f3f4f6', '#ffffff'] // neutral-100 to white
        : ['#374151', '#ffffff'] // neutral-700 to white
    );

    return { color: textColor };
  });

  const handlePressIn = () => {
    'worklet';
    scale.value = withSpring(0.95, SELECTION_SPRING);
  };

  const handlePressOut = () => {
    'worklet';
    scale.value = withSpring(1, SELECTION_SPRING);
  };

  const handlePress = () => {
    'worklet';
    if (!disabled) {
      runOnJS(triggerLightHaptic)();
      runOnJS(onPress)();
    }
  };

  React.useEffect(() => {
    backgroundColor.value = withSpring(selected ? 1 : 0, SPRING_CONFIG);
    borderColor.value = withSpring(selected ? 1 : 0, SPRING_CONFIG);
  }, [selected]);

  return (
    <GestureDetector
      gesture={Gesture.Tap()
        .onBegin(handlePressIn)
        .onFinalize(handlePressOut)
        .onEnd(handlePress)}
    >
      <Animated.View
        style={[animatedStyle]}
        className="min-h-[64px] flex-1 p-3 rounded-2xl border-2 items-center justify-center"
      >
        {icon && (
          <OptimizedIcon 
            name={icon} 
            size={20} 
            className={selected ? 'text-white' : 'text-neutral-500 dark:text-neutral-400'} 
          />
        )}
        <Animated.Text 
          style={textStyle}
          className="text-sm font-medium text-center mt-1"
        >
          {children}
        </Animated.Text>
        {subtitle && (
          <Animated.Text 
            style={textStyle}
            className="text-xs text-center mt-0.5 opacity-80"
          >
            {subtitle}
          </Animated.Text>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

// Enhanced form section component
interface FormSectionProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ComponentProps<typeof OptimizedIcon>['name'];
}

function FormSection({ title, children, icon }: FormSectionProps) {
  return (
    <ThemedView className="bg-white dark:bg-neutral-800 rounded-2xl p-4 shadow-sm border border-neutral-100 dark:border-neutral-700">
      <View className="flex-row items-center mb-3">
        {icon && (
          <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <OptimizedIcon name={icon} size={18} className="text-emerald-600 dark:text-emerald-400" />
          </View>
        )}
        <ThemedText className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          {title}
        </ThemedText>
      </View>
      {children}
    </ThemedView>
  );
}

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
    <ThemedView className="border-t border-neutral-100 dark:border-neutral-800 px-4 py-3">
      <View className="flex-row items-center space-x-4">
        <NativeActionButton
          iconName="camera"
          onPress={onCameraPress}
          disabled={disabled}
          accessibilityLabel="Take photo"
        />
        <NativeActionButton
          iconName="photo"
          onPress={onPhotoLibraryPress}
          disabled={disabled}
          accessibilityLabel="Choose from library"
        />
      </View>
    </ThemedView>
  );
}

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
  const opacity = useSharedValue(disabled ? 0.5 : 1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    'worklet';
    scale.value = withSpring(0.9, SELECTION_SPRING);
  };

  const handlePressOut = () => {
    'worklet';
    scale.value = withSpring(1, SELECTION_SPRING);
  };

  const handlePress = () => {
    'worklet';
    if (!disabled) {
      runOnJS(triggerLightHaptic)();
      runOnJS(onPress || (() => {}))();
    }
  };

  React.useEffect(() => {
    opacity.value = withSpring(disabled ? 0.5 : 1, SPRING_CONFIG);
  }, [disabled]);

  return (
    <Animated.View style={animatedStyle}>
      <GestureDetector
        gesture={Gesture.Tap()
          .onBegin(handlePressIn)
          .onFinalize(handlePressOut)
          .onEnd(handlePress)}
      >
        <Pressable
          className="h-10 w-10 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-700"
          disabled={disabled}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button">
          <NativeIconSymbol name={iconName} size={20} />
        </Pressable>
      </GestureDetector>
    </Animated.View>
  );
}

// Updated AnimatedSelectionButton for backward compatibility
interface AnimatedSelectionButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  selected: boolean;
  disabled?: boolean;
}

function AnimatedSelectionButton({ onPress, children, selected, disabled = false }: AnimatedSelectionButtonProps) {
  return (
    <ModernSelectionCard
      onPress={onPress}
      selected={selected}
      disabled={disabled}
    >
      {children}
    </ModernSelectionCard>
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
  const [isImageFreshlyUploaded, setIsImageFreshlyUploaded] = useState(false);
  
  // Plant share specific form fields
  const [plantName, setPlantName] = useState('');
  const [growthStage, setGrowthStage] = useState<'seedling' | 'vegetative' | 'flowering' | 'harvest' | 'curing'>('vegetative');
  const [environment, setEnvironment] = useState<'indoor' | 'outdoor' | 'greenhouse' | 'mixed'>('indoor');

  const contentInputRef = useRef<TextInput>(null);

  // Fix: Ensure canPost is always boolean and postType is defined
  const canPost = Boolean(
    postType &&
    (content.trim().length >= 10 || image) && // ✅ Now requires 10+ characters
    (postType !== 'plant_share' || plantName.trim().length > 0)
  );

  // Image upload function using appropriate upload function based on post type
  const handleImageUpload = async (userId: string, imageUri: string): Promise<string | null> => {
    const uploadFunction = postType === 'question' ? uploadQuestionImageWithVerification : uploadPlantShareImageWithVerification;
    const result = await uploadFunction(userId, imageUri);
    return result.success ? result.publicUrl || null : null;
  };

  // Action handlers
  const handleImagePicker = useCallback(async () => {
    const result = await selectFromGallery();
    if (result) {
      setImage(result.uri);
      setIsImageFreshlyUploaded(false); // Local image, not freshly uploaded
    }
  }, []);

  const handleCameraPress = useCallback(async () => {
    const result = await takePhoto();
    if (result) {
      setImage(result.uri);
      setIsImageFreshlyUploaded(false); // Local image, not freshly uploaded
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canPost || !user || !postType) {
      Alert.alert('Error', 'Please select a post type before submitting.');
      return;
    }
    setIsSubmitting(true);
    try {
      let imageUrl: string | null = null;
      if (image) {
        imageUrl = await handleImageUpload(user.id, image);
        if (!imageUrl) {
          setIsSubmitting(false);
          return;
        }
        
        // Mark the uploaded image URL as freshly uploaded for better handling
        setImage(imageUrl);
        setIsImageFreshlyUploaded(true);
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
    setIsImageFreshlyUploaded(false);
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
        className="flex-1 bg-neutral-50 dark:bg-neutral-900"
        showToolbar={true}
        doneText="Done"
        extraOffset={0}>
        <ThemedView className="flex-1 bg-neutral-50 dark:bg-neutral-900" style={{ paddingTop: insets.top }}>
          {/* Top Bar */}
          <TopBar 
            onClose={handleClose}
            onPost={handleSubmit}
            canPost={canPost}
            isSubmitting={isSubmitting}
          />

          {/* Author Row with Privacy Selector - Enhanced avatar size */}
          <ThemedView className="px-4 py-4 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-800">
            <PostAuthorRow
              userAvatarUrl={user?.user_metadata?.avatar_url || ''}
              userName={user?.user_metadata?.username || 'You'}
              privacy="everyone"
              disabled={isSubmitting}
            />
          </ThemedView>

          {/* Post Type Header or Error */}
          {postType ? (
            <ThemedView className="px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800">
              <View className="flex-row items-center">
                {postType === 'question' ? (
                  <>
                    <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                      <OptimizedIcon name="help-circle" size={18} className="text-amber-600 dark:text-amber-400" />
                    </View>
                    <ThemedText className="text-sm font-medium text-amber-700 dark:text-amber-300">
                      Ask a Question
                    </ThemedText>
                  </>
                ) : (
                  <>
                    <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                      <OptimizedIcon name="leaf" size={18} className="text-emerald-600 dark:text-emerald-400" />
                    </View>
                    <ThemedText className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      Share a Plant
                    </ThemedText>
                  </>
                )}
              </View>
            </ThemedView>
          ) : (
            <ThemedView className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
              <ThemedText className="text-sm font-medium text-red-700 dark:text-red-300">
                Please select a post type to continue.
              </ThemedText>
            </ThemedView>
          )}

          {/* Main Content - Scrollable */}
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="px-4 py-4 space-y-4">
              {/* Enhanced Text Input */}
              <FormSection title="Share Your Story" icon="pencil">
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
                  editable={!!postType && !isSubmitting}
                />
                {/* Content validation feedback */}
                {content.length > 0 && content.trim().length < 10 && (
                  <ThemedText className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    Content must be at least 10 characters long ({content.trim().length}/10)
                  </ThemedText>
                )}
              </FormSection>

              {/* Plant Share Form Fields */}
              {postType === 'plant_share' && (
                <>
                  {/* Plant Details Section */}
                  <FormSection title="Plant Details" icon="leaf">
                    <View className="space-y-4">
                      {/* Plant Name Input */}
                      <View>
                        <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          Plant Name *
                        </ThemedText>
                        <EnhancedTextInput
                          value={plantName}
                          onChangeText={setPlantName}
                          placeholder="e.g., My Purple Kush"
                          maxLength={50}
                          showCharacterCount
                          accessibilityLabel="Plant name"
                          editable={!!postType && !isSubmitting}
                        />
                      </View>
                    </View>
                  </FormSection>

                                     {/* Growth Stage Section */}
                   <FormSection title="Growth Stage">
                     <View className="flex-row flex-wrap gap-2">
                       <ModernSelectionCard
                         onPress={() => setGrowthStage('seedling')}
                         selected={growthStage === 'seedling'}
                         disabled={isSubmitting || !postType}
                         subtitle="Just starting">
                         🌱 Seedling
                       </ModernSelectionCard>
                      
                      <ModernSelectionCard
                        onPress={() => setGrowthStage('vegetative')}
                        selected={growthStage === 'vegetative'}
                        disabled={isSubmitting || !postType}
                        icon="leaf"
                        subtitle="Growing leaves">
                        Vegetative
                      </ModernSelectionCard>
                      
                      <ModernSelectionCard
                        onPress={() => setGrowthStage('flowering')}
                        selected={growthStage === 'flowering'}
                        disabled={isSubmitting || !postType}
                        icon="flower"
                        subtitle="Producing buds">
                        Flowering
                      </ModernSelectionCard>
                      
                      <ModernSelectionCard
                        onPress={() => setGrowthStage('harvest')}
                        selected={growthStage === 'harvest'}
                        disabled={isSubmitting || !postType}
                        icon="checkmark-circle"
                        subtitle="Ready to harvest">
                        Harvest
                      </ModernSelectionCard>
                      
                      <ModernSelectionCard
                        onPress={() => setGrowthStage('curing')}
                        selected={growthStage === 'curing'}
                        disabled={isSubmitting || !postType}
                        subtitle="Drying & curing">
                        🏺 Curing
                      </ModernSelectionCard>
                    </View>
                  </FormSection>

                  {/* Environment Section */}
                  <FormSection title="Growing Environment" icon="home">
                    <View className="flex-row flex-wrap gap-2">
                      <ModernSelectionCard
                        onPress={() => setEnvironment('indoor')}
                        selected={environment === 'indoor'}
                        disabled={isSubmitting || !postType}
                        icon="home"
                        subtitle="Controlled climate">
                        Indoor
                      </ModernSelectionCard>
                      
                      <ModernSelectionCard
                        onPress={() => setEnvironment('outdoor')}
                        selected={environment === 'outdoor'}
                        disabled={isSubmitting || !postType}
                        icon="sun"
                        subtitle="Natural sunlight">
                        Outdoor
                      </ModernSelectionCard>
                      
                      <ModernSelectionCard
                        onPress={() => setEnvironment('greenhouse')}
                        selected={environment === 'greenhouse'}
                        disabled={isSubmitting || !postType}
                        icon="home"
                        subtitle="Protected growing">
                        Greenhouse
                      </ModernSelectionCard>
                      
                      <ModernSelectionCard
                        onPress={() => setEnvironment('mixed')}
                        selected={environment === 'mixed'}
                        disabled={isSubmitting || !postType}
                        subtitle="Indoor & outdoor">
                        🔄 Mixed
                      </ModernSelectionCard>
                    </View>
                  </FormSection>
                </>
              )}

              {/* Show selected image preview */}
              {image && (
                <FormSection title="Selected Image" icon="image-outline">
                  <View className="relative rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-700 h-40">
                    <Pressable 
                      onPress={() => setImage(null)} 
                      className="absolute top-2 right-2 z-10 w-8 h-8 bg-black/50 rounded-full items-center justify-center">
                      <NativeIconSymbol name="close" size={20} tintColor="#FFFFFF" />
                    </Pressable>
                    <NetworkResilientImage 
                      url={image} 
                      width="100%" 
                      height={160}
                      contentFit="cover" 
                      fallbackIconName="image-outline"
                      fallbackIconSize={32}
                      maxRetries={3}
                      retryDelayMs={800}
                      timeoutMs={6000}
                      enableRetry={true}
                      showProgress={true}
                      initialLoadDelayMs={isImageFreshlyUploaded ? 2000 : 0}
                    />
                  </View>
                </FormSection>
              )}
            </View>
          </ScrollView>

          {/* Enhanced Bottom Toolbar */}
          <EnhancedBottomToolbar
            onCameraPress={handleCameraPress}
            onPhotoLibraryPress={handleImagePicker}
            onMentionPress={_handleMentionPress}
            disabled={isSubmitting || !postType}
          />
        </ThemedView>
      </EnhancedKeyboardWrapper>
    </Modal>
  );
}
