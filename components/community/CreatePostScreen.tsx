import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system'; // Import FileSystem
import * as Haptics from 'expo-haptics';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'; // Import manipulator
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert, // Import Alert
  ScrollView, // Import ScrollView
} from 'react-native';
// Import useSafeAreaInsets
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
import { createPost } from '../../lib/services/community-service'; // Import createPost
import supabase from '../../lib/supabase'; // Import supabase client
import { OptimizedIcon, type IconName } from '../ui/OptimizedIcon';
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';

// Animation configurations
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 200,
  mass: 0.8,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
};

type CreatePostScreenProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

// Modern animated action button component
const AnimatedActionButton = ({
  onPress,
  iconName,
  size = 28,
  hapticStyle = Haptics.ImpactFeedbackStyle.Light,
}: {
  onPress: () => void;
  iconName: IconName;
  size?: number;
  hapticStyle?: Haptics.ImpactFeedbackStyle;
}) => {
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);

  const handlePress = useCallback(() => {
    runOnJS(Haptics.impactAsync)(hapticStyle);
    onPress();
  }, [onPress, hapticStyle]);

  const gesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(0.85, SPRING_CONFIG);
      pressed.value = withSpring(1, SPRING_CONFIG);
    })
    .onFinalize(() => {
      'worklet';
      scale.value = withSpring(1, SPRING_CONFIG);
      pressed.value = withSpring(0, SPRING_CONFIG);
    })
    .onEnd(() => {
      runOnJS(handlePress)();
    });

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      pressed.value,
      [0, 1],
      ['transparent', 'rgba(59, 130, 246, 0.08)']
    );

    return {
      transform: [{ scale: scale.value }],
      backgroundColor,
      borderRadius: 12,
      padding: 8,
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>
        <OptimizedIcon
          name={iconName}
          size={size}
          className="text-neutral-600 dark:text-neutral-400"
        />
      </Animated.View>
    </GestureDetector>
  );
};

/**
 * Screen for creating a new community post with modern animations and haptic feedback.
 */
export default function CreatePostScreen({ visible, onClose, onSuccess }: CreatePostScreenProps) {
  const { user } = useAuth(); // Keep user context if needed for posting
  const insets = useSafeAreaInsets(); // Get safe area insets

  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [image, setImage] = useState<string | null>(null); // State for selected image URI
  const [location, setLocation] = useState<Location.LocationObject | null>(null); // State for location

  const canPost = content.trim().length > 0 || image; // Can post if there's text or an image

  // --- Action Handlers ---

  const handleTakePhoto = useCallback(async () => {
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
      console.log('Photo taken:', result.assets[0].uri);
    }
  }, []);

  const handlePickImage = useCallback(async () => {
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
      console.log('Image selected:', result.assets[0].uri);
    }
  }, []);

  const handleGetLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Location permission is needed to add location.');
      return;
    }

    try {
      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
      console.log('Location fetched:', currentLocation);
      Alert.alert('Location Added', 'Location coordinates saved!');
    } catch (error) {
      console.error('Error fetching location:', error);
      Alert.alert('Error', 'Could not fetch location.');
    }
  }, []);

  // --- Image Upload Function (Adapted from AddPlantForm) ---
  const uploadImage = async (userId: string, imageUri: string): Promise<string | null> => {
    console.log('Starting image processing and upload for URI:', imageUri); // Revert log message
    try {
      // --- Manipulate Image ---
      console.log('Manipulating image...');
      const manipResult = await manipulateAsync(
        imageUri,
        [{ resize: { width: 1024 } }], // Resize to max width 1024, height adjusts automatically
        { compress: 0.7, format: SaveFormat.JPEG } // Compress and save as JPEG
      );
      console.log(
        'Image manipulated:',
        manipResult.uri,
        `(${manipResult.width}x${manipResult.height})`
      );
      // ---

      // Check file size before upload to prevent OOM issues
      const fileInfo = await FileSystem.getInfoAsync(manipResult.uri);
      if (fileInfo.exists && fileInfo.size && fileInfo.size > 10 * 1024 * 1024) {
        // 10MB limit
        Alert.alert('File Too Large', 'Please select an image smaller than 10MB.');
        return null;
      }

      // Manipulation forces JPEG extension
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

      // Use a timestamp and proper extension for the filename
      const filename = `post_${Date.now()}.${extension || 'jpg'}`;
      const filePath = `${userId}/${filename}`;
      console.log('Uploading image to Supabase storage at path:', filePath);

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

      console.log('Image uploaded successfully to Supabase.');

      // Get the public URL
      const { data: urlData } = supabase.storage.from('posts').getPublicUrl(filePath);

      if (!urlData || !urlData.publicUrl) {
        console.error('Could not get public URL for path:', filePath);
        throw new Error('Could not get public URL after upload.');
      }

      console.log('Image public URL:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
      return null;
    }
  };
  // ---

  // Handle post submission
  const handleSubmit = useCallback(async () => {
    if (!canPost || !user) return;
    setIsSubmitting(true);
    console.log('Submitting post:', { content, imageUri: image, location: location?.coords });

    let imageUrl: string | undefined = undefined; // Use undefined for clarity

    try {
      // --- Upload Image if selected ---
      if (image) {
        const uploadedUrl = await uploadImage(user.id, image);
        if (!uploadedUrl) {
          // Upload failed, alert was shown in uploadImage function
          setIsSubmitting(false);
          return; // Stop submission
        }
        imageUrl = uploadedUrl;
      }
      // ---

      console.log('Calling createPost with:', { userId: user.id, content, imageUrl });
      const newPost = await createPost({
        user_id: user.id, // Use authenticated user ID
        content,
        image_url: imageUrl, // Pass the uploaded image URL here
        // Add plant_id or is_public if needed
      });

      if (newPost === true) {
        // Check for boolean true instead of accessing .id
        console.log('Post created successfully.'); // Updated log message
        setContent(''); // Clear content
        setImage(null); // Clear image
        setLocation(null); // Clear location
        onSuccess?.(); // Trigger refresh in parent component
        onClose(); // Close modal
      } else {
        Alert.alert('Error', 'Failed to create post.');
      }
    } catch (error) {
      console.error('Error during post submission:', error);
      Alert.alert('Error', 'An unexpected error occurred while creating the post.');
    } finally {
      setIsSubmitting(false);
    }
  }, [canPost, user, content, image, location, onSuccess, onClose]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <ThemedView className="flex-1 bg-white dark:bg-black">
        {/* Header with Top Safe Area Padding - Stays outside KAV */}
        <View style={{ paddingTop: insets.top }}>
          <View className="flex-row items-center justify-between px-4 py-3">
            <Pressable onPress={onClose} hitSlop={10}>
              <ThemedText className="text-lg text-neutral-800 dark:text-neutral-200">
                Cancel
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={!canPost || isSubmitting}
              className={`rounded-full px-5 py-1.5 ${
                !canPost || isSubmitting ? 'bg-neutral-300 dark:bg-neutral-800' : 'bg-primary-500'
              }`}>
              <ThemedText
                className={`text-lg font-semibold ${
                  !canPost || isSubmitting ? 'text-neutral-500 dark:text-neutral-600' : 'text-white'
                }`}>
                Post
              </ThemedText>
            </Pressable>
          </View>
        </View>
        {/* End Header */}

        {/* KeyboardAvoidingView now wraps ScrollView AND Toolbar */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }} // KAV takes remaining space
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0} // Reset offset to 0 for iOS
        >
          {/* ScrollView for content and keyboard dismissal */}
          <ScrollView
            style={{ flex: 1 }} // ScrollView takes available space within KAV
            contentContainerStyle={{ flexGrow: 1 }} // Ensure content can grow
            keyboardShouldPersistTaps="handled" // Dismiss keyboard on tap outside input
          >
            {/* Main Content Area - Removed flex: 1 */}
            <View className="px-4 pt-2">
              <TextInput
                value={content}
                onChangeText={setContent}
                placeholder="What's on your mind?"
                placeholderTextColor="#9CA3AF"
                multiline
                className="flex-1 text-lg leading-snug text-neutral-900 dark:text-neutral-100" // Use flex-1 to take available space
                style={{
                  textAlignVertical: 'top',
                }} // Ensure text starts at top
              />
              {/* Optionally display selected image preview here */}
              {/* Add <Image source={{ uri: image }} ... /> for preview */}
              {image && (
                <ThemedText className="mt-2 text-sm text-green-500">Image selected!</ThemedText>
              )}
              {location && (
                <ThemedText className="mt-1 text-sm text-blue-500">Location added!</ThemedText>
              )}
            </View>
          </ScrollView>
          {/* End ScrollView / Content Area */}

          {/* Bottom Toolbar - Now INSIDE KeyboardAvoidingView */}
          <View
            className="border-t border-neutral-200 px-4 dark:border-neutral-700" // Border only
            style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 12, paddingTop: 12 }} // Apply padding top/bottom
          >
            <View className="flex-row items-center justify-between">
              {/* Icon Group - Using gap for precise spacing */}
              <View className="flex-row items-center" style={{ gap: 20 }}>
                <AnimatedActionButton
                  onPress={handleTakePhoto}
                  iconName="camera-outline"
                  hapticStyle={Haptics.ImpactFeedbackStyle.Medium}
                />
                <AnimatedActionButton
                  onPress={handlePickImage}
                  iconName="images-outline"
                  hapticStyle={Haptics.ImpactFeedbackStyle.Light}
                />
                <AnimatedActionButton
                  onPress={handleGetLocation}
                  iconName="location-outline"
                  hapticStyle={Haptics.ImpactFeedbackStyle.Light}
                />
              </View>
              {/* Reply Text Removed */}
            </View>
          </View>
          {/* End Bottom Toolbar */}
        </KeyboardAvoidingView>
        {/* End KeyboardAvoidingView */}
      </ThemedView>
    </Modal>
  );
}
