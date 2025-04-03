import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Modal, TextInput, Image, FlatList, TouchableOpacity, ScrollView } from 'react-native';

import { useAuth } from '../../lib/contexts/AuthProvider';
import { useTheme } from '../../lib/contexts/ThemeContext';
import { createPost } from '../../lib/services/community-service';
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';

type CreatePostScreenProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

/**
 * Screen for creating a new community post
 */
export default function CreatePostScreen({ visible, onClose, onSuccess }: CreatePostScreenProps) {
  const { theme, isDarkMode } = useTheme();
  const { user } = useAuth();

  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add image to the post
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImages((prev) => [...prev, result.assets[0].uri]);
    }
  };

  // Remove image from the post
  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Add a tag
  const addTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      // Ensure tags start with #
      const formattedTag = currentTag.trim().startsWith('#')
        ? currentTag.trim()
        : `#${currentTag.trim()}`;

      setTags((prev) => [...prev, formattedTag]);
      setCurrentTag('');
    }
  };

  // Remove a tag
  const removeTag = (index: number) => {
    setTags((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle tag input submission
  const handleTagSubmit = () => {
    addTag();
  };

  // Handle post submission
  const handleSubmit = async () => {
    if (!content.trim() || !user) return;

    setIsSubmitting(true);
    try {
      // TODO: Upload images to storage and get URLs

      const postData = {
        content,
        user_id: user.id,
        image_url: images.length > 0 ? images[0] : undefined,
        is_public: true,
        // If plant is selected, include it here
      };

      const newPost = await createPost(postData);

      if (newPost) {
        // Reset form
        setContent('');
        setImages([]);
        setTags([]);

        // Close modal and notify parent of success
        onClose();
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ThemedView className="flex-1" lightClassName="bg-white" darkClassName="bg-neutral-100">
        {/* Header */}
        <ThemedView
          className="flex-row items-center border-b p-4"
          lightClassName="border-neutral-200"
          darkClassName="border-neutral-300">
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.colors.neutral[600]} />
          </TouchableOpacity>
          <ThemedText className="flex-1 text-center font-bold">Create Post</ThemedText>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            style={{ opacity: !content.trim() || isSubmitting ? 0.5 : 1 }}>
            <ThemedText
              className="font-bold"
              lightClassName="text-primary-600"
              darkClassName="text-primary-500">
              {isSubmitting ? 'Posting...' : 'Post'}
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>

        <ScrollView className="flex-1 p-4">
          {/* Post content input */}
          <TextInput
            multiline
            placeholder="What's on your mind?"
            placeholderTextColor={theme.colors.neutral[400]}
            value={content}
            onChangeText={setContent}
            style={{
              color: isDarkMode ? theme.colors.neutral[600] : theme.colors.neutral[800],
              fontSize: 16,
              minHeight: 100,
            }}
          />

          {/* Image preview */}
          {images.length > 0 && (
            <FlatList
              data={images}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => `image-${index}`}
              className="my-4"
              renderItem={({ item, index }) => (
                <ThemedView className="relative mr-2">
                  <Image
                    source={{ uri: item }}
                    style={{ width: 100, height: 100, borderRadius: 8 }}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    className="absolute right-1 top-1 rounded-full bg-black/70 p-1"
                    onPress={() => removeImage(index)}>
                    <Ionicons name="close" size={16} color="white" />
                  </TouchableOpacity>
                </ThemedView>
              )}
            />
          )}

          {/* Tags input and display */}
          <ThemedView className="mt-4">
            <ThemedText className="mb-2 font-medium">Tags</ThemedText>
            <ThemedView className="mb-2 flex-row flex-wrap">
              {tags.map((tag, index) => (
                <ThemedView
                  key={`tag-${index}`}
                  className="bg-primary-100 mb-2 mr-2 flex-row items-center rounded-full px-3 py-1">
                  <ThemedText lightClassName="text-primary-700" darkClassName="text-primary-800">
                    {tag}
                  </ThemedText>
                  <TouchableOpacity onPress={() => removeTag(index)} className="ml-1">
                    <Ionicons name="close-circle" size={16} color={theme.colors.primary[700]} />
                  </TouchableOpacity>
                </ThemedView>
              ))}
            </ThemedView>
            <ThemedView className="flex-row items-center">
              <TextInput
                placeholder="Add tags (e.g. #plantcare)"
                placeholderTextColor={theme.colors.neutral[400]}
                value={currentTag}
                onChangeText={setCurrentTag}
                onSubmitEditing={handleTagSubmit}
                className="mr-2 flex-1 rounded-lg px-3 py-2"
                style={{
                  color: isDarkMode ? theme.colors.neutral[600] : theme.colors.neutral[800],
                  backgroundColor: isDarkMode
                    ? theme.colors.neutral[200]
                    : theme.colors.neutral[100],
                }}
              />
              <TouchableOpacity onPress={addTag}>
                <Ionicons name="add-circle" size={24} color={theme.colors.primary[600]} />
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>
        </ScrollView>

        {/* Bottom toolbar */}
        <ThemedView
          className="flex-row items-center border-t p-4"
          lightClassName="border-neutral-200 bg-white"
          darkClassName="border-neutral-300 bg-neutral-100">
          <TouchableOpacity onPress={pickImage} className="mr-4">
            <Ionicons name="image" size={24} color={theme.colors.primary[600]} />
          </TouchableOpacity>
          <TouchableOpacity className="mr-4">
            <Ionicons name="leaf" size={24} color={theme.colors.primary[600]} />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="location" size={24} color={theme.colors.primary[600]} />
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    </Modal>
  );
}
