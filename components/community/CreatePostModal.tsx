import React from 'react';
import { Modal, TouchableOpacity, View } from 'react-native';

import { OptimizedIcon } from '../ui/OptimizedIcon';
import { useTheme } from '../../lib/contexts/ThemeContext';
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';

type CreatePostModalProps = {
  visible: boolean;
  onClose: () => void;
  onCreatePost: () => void;
  onAskQuestion: () => void;
};

/**
 * Modal for selecting post creation options
 */
export default function CreatePostModal({
  visible,
  onClose,
  onCreatePost,
  onAskQuestion,
}: CreatePostModalProps) {
  const { theme } = useTheme(); // isDarkMode is unused

  // Close the modal when clicking the backdrop
  const handleBackdropPress = () => {
    onClose();
  };

  // Prevent closing when clicking on the actual modal content
  const handleModalPress = (e: any) => {
    e.stopPropagation();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        className="flex-1 justify-end bg-black/50"
        activeOpacity={1}
        onPress={handleBackdropPress}>
        <ThemedView
          className="rounded-t-xl p-4"
          lightClassName="bg-white"
          darkClassName="bg-neutral-100"
          onTouchEnd={handleModalPress}>
          <ThemedView className="mb-4 items-center">
            <View className="h-1 w-12 rounded-full bg-neutral-300" />
          </ThemedView>

          <ThemedText className="mb-4 text-xl font-bold">Create</ThemedText>

          <TouchableOpacity onPress={onCreatePost}>
            <ThemedView className="flex-row items-center py-3">
              <ThemedView
                className="mr-3 h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: theme.colors.primary[100] }}>
                <OptimizedIcon name="leaf" size={24} color={theme.colors.primary[600]} />
              </ThemedView>
              <ThemedView className="flex-1">
                <ThemedText className="font-semibold">Share a Plant</ThemedText>
                <ThemedText
                  className="text-sm"
                  lightClassName="text-neutral-500"
                  darkClassName="text-neutral-400">
                  Post photos and updates about your plants
                </ThemedText>
              </ThemedView>
            </ThemedView>
          </TouchableOpacity>

          <TouchableOpacity onPress={onAskQuestion}>
            <ThemedView className="flex-row items-center py-3">
              <ThemedView
                className="mr-3 h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: theme.colors.primary[100] }}>
                <OptimizedIcon name="help-circle" size={24} color={theme.colors.primary[600]} />
              </ThemedView>
              <ThemedView className="flex-1">
                <ThemedText className="font-semibold">Ask a Question</ThemedText>
                <ThemedText
                  className="text-sm"
                  lightClassName="text-neutral-500"
                  darkClassName="text-neutral-400">
                  Get help from the community on growing issues
                </ThemedText>
              </ThemedView>
            </ThemedView>
          </TouchableOpacity>
        </ThemedView>
      </TouchableOpacity>
    </Modal>
  );
}
