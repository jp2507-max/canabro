import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React, { useState, useCallback, useRef } from 'react';
import {
  Modal,
  View,
  Pressable,
  TextInput,
  Alert,
  StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../lib/contexts/AuthProvider';
import { createPost } from '../../lib/services/community-service';
import supabase from '../../lib/supabase';
import { triggerLightHaptic, triggerMediumHapticSync } from '@/lib/utils/haptics';
import { EnhancedTextInput } from '../ui/EnhancedTextInput';
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';
import EnhancedKeyboardWrapper from '@/components/keyboard/EnhancedKeyboardWrapper';
import { PostActionButtons } from './PostActionButtons';
import { PostAuthorRow } from './PostAuthorRow';
import { NativeIconSymbol } from '@/components/ui/NativeIconSymbol';

type CreatePostScreenProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
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
  onMentionPress,
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
 * Main CreatePost Screen Component
 */
export default function CreatePostScreen({ visible, onClose, onSuccess }: CreatePostScreenProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [image, setImage] = useState<string | null>(null);

  const contentInputRef = useRef<TextInput>(null);

  // Fix: Ensure canPost is always boolean
  const canPost = Boolean(content.trim().length > 0 || image);

  // Image upload function (simplified - keeping core logic)
  const uploadImage = async (userId: string, imageUri: string): Promise<string | null> => {
    try {
      const manipResult = await manipulateAsync(
        imageUri,
        [{ resize: { width: 1024 } }],
        { compress: 0.7, format: SaveFormat.JPEG }
      );

      const fileInfo = await FileSystem.getInfoAsync(manipResult.uri);
      if (fileInfo.exists && fileInfo.size && fileInfo.size > 10 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Please select an image smaller than 10MB.');
        return null;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session for upload');
      }

      const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured');
      }

      const filename = `post_${Date.now()}.jpg`;
      const filePath = `${userId}/${filename}`;
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
        throw new Error(`Upload failed with status ${uploadResult.status}`);
      }

      const { data: urlData } = supabase.storage.from('posts').getPublicUrl(filePath);
      return urlData?.publicUrl || null;
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
      return null;
    }
  };

  // Action handlers
  const handleImagePicker = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Media library permission is needed to select photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setImage(result.assets[0].uri);
    }
  }, []);

  const handleCameraPress = useCallback(async () => {
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
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canPost || !user) return;
    
    setIsSubmitting(true);
    try {
      let imageUrl: string | null = null;
      if (image) {
        imageUrl = await uploadImage(user.id, image);
        if (!imageUrl) {
          setIsSubmitting(false);
          return;
        }
      }

      await createPost({
        content: content.trim(),
        image_url: imageUrl ?? undefined,
        user_id: user.id,
      });

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
  }, [canPost, user, content, image, onSuccess, onClose]);

  const handleReset = () => {
    setContent('');
    setImage(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Placeholder handlers for other actions
  const handleMentionPress = () => console.log('Mention pressed');

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

          {/* Main Content */}
          <ThemedView className="flex-1 px-4 py-4">
            {/* Enhanced Text Input */}
            <EnhancedTextInput
              ref={contentInputRef}
              value={content}
              onChangeText={setContent}
              placeholder="What's on your mind?"
              variant="post"
              multiline
              autoFocus
              showCharacterCount={false}
              inputAccessoryViewID="PostToolbar"
              accessibilityLabel="Post content"
            />

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
            onMentionPress={handleMentionPress}
            disabled={isSubmitting}
          />
        </ThemedView>
      </EnhancedKeyboardWrapper>
    </Modal>
  );
}
