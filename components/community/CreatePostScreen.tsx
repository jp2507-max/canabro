import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import React, { useState } from 'react';
import {
  Modal,
  TouchableOpacity,
  View,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert, // Import Alert
  Keyboard, // Import Keyboard
  ScrollView, // Import ScrollView
} from 'react-native';
import * as FileSystem from 'expo-file-system'; // Import FileSystem
import { decode } from 'base64-arraybuffer'; // Import decode from base64-arraybuffer
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'; // Import manipulator
// Import useSafeAreaInsets
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../lib/contexts/AuthProvider';
import { useTheme } from '../../lib/contexts/ThemeContext';
import { createPost } from '../../lib/services/community-service'; // Import createPost
import supabase from '../../lib/supabase'; // Import supabase client
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';

type CreatePostScreenProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

/**
 * Screen for creating a new community post, styled like the provided image.
 */
export default function CreatePostScreen({ visible, onClose, onSuccess }: CreatePostScreenProps) {
  const { theme, isDarkMode } = useTheme();
  const { user } = useAuth(); // Keep user context if needed for posting
  const insets = useSafeAreaInsets(); // Get safe area insets

  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [image, setImage] = useState<string | null>(null); // State for selected image URI
  const [location, setLocation] = useState<Location.LocationObject | null>(null); // State for location

  const canPost = content.trim().length > 0 || image; // Can post if there's text or an image

  // --- Action Handlers ---

  const handleTakePhoto = async () => {
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

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      console.log('Photo taken:', result.assets[0].uri);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Media library permission is needed to select photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // Reverted to deprecated version to fix TS error
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      console.log('Image selected:', result.assets[0].uri);
    }
  };

  const handleGetLocation = async () => {
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
  };

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
      console.log('Image manipulated:', manipResult.uri, `(${manipResult.width}x${manipResult.height})`);
      // --- ---

      // Determine the correct MIME type (manipulation forces JPEG)
      const mimeType = 'image/jpeg';
      const extension = 'jpg'; // Manipulation forces JPEG

      // Step 1: Read the *manipulated* file as a Base64 string
      console.log('Reading manipulated file as Base64...');
      const base64Data = await FileSystem.readAsStringAsync(manipResult.uri, { // Use manipResult.uri
        encoding: FileSystem.EncodingType.Base64,
      });

      // Step 2: Convert the Base64 string to an ArrayBuffer
      console.log('Converting Base64 to ArrayBuffer...');
      const arrayBuffer = decode(base64Data);
      
      // Use a timestamp and proper extension for the filename
      const filename = `post_${Date.now()}.${extension || 'jpg'}`;
      const filePath = `${userId}/${filename}`;
      console.log('Uploading image to Supabase storage at path:', filePath);
      
      // Step 3: Upload the ArrayBuffer with explicit content type
      console.log('Uploading ArrayBuffer to Supabase...');
      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, arrayBuffer, {
          contentType: mimeType,
          upsert: false, // Set to false to ensure we don't overwrite existing files
        });
      
      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        throw uploadError;
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
  // --- ---

  // Handle post submission
  const handleSubmit = async () => {
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
      // --- ---

      console.log('Calling createPost with:', { userId: user.id, content, imageUrl });
      const newPost = await createPost({
        user_id: user.id, // Use authenticated user ID
        content: content,
        image_url: imageUrl, // Pass the uploaded image URL here
        // Add plant_id or is_public if needed
      });

      if (newPost === true) { // Check for boolean true instead of accessing .id
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
    // Keep state clearing within try/finally or handle based on success
    // setContent('');
    setImage(null); // Clear image
    setLocation(null); // Clear location
    onClose(); // Close modal on success
    onSuccess?.();
  };

  // Define UI color variables based on theme
  const iconColor = isDarkMode ? theme.colors.neutral[400] : theme.colors.neutral[600];
  const placeholderTextColor = isDarkMode ? theme.colors.neutral[600] : theme.colors.neutral[400];
  const postButtonBg = isDarkMode ? theme.colors.primary[500] : theme.colors.primary[500];
  const postButtonText = theme.colors.neutral[50]; // White text for both themes
  const disabledPostButtonBg = isDarkMode ? theme.colors.neutral[800] : theme.colors.neutral[300];
  const disabledPostButtonText = isDarkMode ? theme.colors.neutral[600] : theme.colors.neutral[500];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent={true}>
      <ThemedView className="flex-1" lightClassName="bg-white" darkClassName="bg-black">
        {/* Header with Top Safe Area Padding - Stays outside KAV */}
        <View style={{ paddingTop: insets.top }}>
          <View className="flex-row items-center justify-between px-4 py-3">
            <Pressable onPress={onClose} hitSlop={10}>
              <ThemedText className="text-lg" lightClassName="text-neutral-800" darkClassName="text-neutral-200">
                Cancel
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={!canPost || isSubmitting}
              className="rounded-full px-5 py-1.5"
              style={{
                backgroundColor: !canPost || isSubmitting ? disabledPostButtonBg : postButtonBg,
              }}>
              <ThemedText
                className="text-lg font-semibold"
                style={{
                  color: !canPost || isSubmitting ? disabledPostButtonText : postButtonText,
                }}>
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
              placeholderTextColor={placeholderTextColor}
              multiline
              className="flex-1 text-lg leading-snug" // Use flex-1 to take available space
              style={{ color: isDarkMode ? theme.colors.neutral[100] : theme.colors.neutral[900], textAlignVertical: 'top' }} // Ensure text starts at top
            />
            {/* Optionally display selected image preview here */}
            {/* Add <Image source={{ uri: image }} ... /> for preview */}
            {image && (
              <ThemedText className="text-sm text-green-500 mt-2">Image selected!</ThemedText>
            )}
            {location && (
              <ThemedText className="text-sm text-blue-500 mt-1">Location added!</ThemedText>
            )}
            </View>
          </ScrollView>
          {/* End ScrollView / Content Area */}

          {/* Bottom Toolbar - Now INSIDE KeyboardAvoidingView */}
          <View
            className="border-t px-4 dark:border-neutral-700 light:border-neutral-200" // Border only
            style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 12, paddingTop: 12 }} // Apply padding top/bottom
          >
            <View className="flex-row items-center justify-between">
            {/* Icon Group - Using gap for precise spacing */}
            <View className="flex-row items-center" style={{ gap: 15 }}>
              <TouchableOpacity onPress={handleTakePhoto} hitSlop={10}>
                <Ionicons name="camera-outline" size={28} color={iconColor} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePickImage} hitSlop={10}>
                <Ionicons name="images-outline" size={28} color={iconColor} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleGetLocation} hitSlop={10}>
                <Ionicons name="location-outline" size={28} color={iconColor} />
              </TouchableOpacity>
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
