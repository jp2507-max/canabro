import React from 'react';
import { Modal, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';
import { useTheme } from '../../lib/contexts/ThemeContext';

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
  onAskQuestion 
}: CreatePostModalProps) {
  const { theme, isDarkMode } = useTheme();
  
  // Close the modal when clicking the backdrop
  const handleBackdropPress = () => {
    onClose();
  };
  
  // Prevent closing when clicking on the actual modal content
  const handleModalPress = (e: any) => {
    e.stopPropagation();
  };
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        className="flex-1 justify-end bg-black/50" 
        activeOpacity={1} 
        onPress={handleBackdropPress}
      >
        <ThemedView 
          className="rounded-t-xl p-4"
          lightClassName="bg-white"
          darkClassName="bg-neutral-100"
          onTouchEnd={handleModalPress}
        >
          <ThemedView className="items-center mb-4">
            <View className="w-12 h-1 rounded-full bg-neutral-300" />
          </ThemedView>
          
          <ThemedText className="text-xl font-bold mb-4">Create</ThemedText>
          
          <TouchableOpacity onPress={onCreatePost}>
            <ThemedView className="flex-row items-center py-3">
              <ThemedView 
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: theme.colors.primary[100] }}
              >
                <Ionicons name="leaf" size={24} color={theme.colors.primary[600]} />
              </ThemedView>
              <ThemedView className="flex-1">
                <ThemedText className="font-semibold">Share a Plant</ThemedText>
                <ThemedText 
                  className="text-sm"
                  lightClassName="text-neutral-500"
                  darkClassName="text-neutral-400"
                >
                  Post photos and updates about your plants
                </ThemedText>
              </ThemedView>
            </ThemedView>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={onAskQuestion}>
            <ThemedView className="flex-row items-center py-3">
              <ThemedView 
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: theme.colors.primary[100] }}
              >
                <Ionicons name="help-circle" size={24} color={theme.colors.primary[600]} />
              </ThemedView>
              <ThemedView className="flex-1">
                <ThemedText className="font-semibold">Ask a Question</ThemedText>
                <ThemedText 
                  className="text-sm"
                  lightClassName="text-neutral-500"
                  darkClassName="text-neutral-400"
                >
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
