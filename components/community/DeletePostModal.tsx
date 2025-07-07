/**
 * DeletePostModal - Confirmation modal for post deletion
 */

import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { BlurView } from 'expo-blur';
import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';

interface DeletePostModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deleting?: boolean;
  postType?: 'post' | 'comment';
}

export default function DeletePostModal({
  visible,
  onClose,
  onConfirm,
  deleting = false,
  postType = 'post'
}: DeletePostModalProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <BlurView
        intensity={20}
        className="flex-1 items-center justify-center bg-black/30"
      >
        <ThemedView className="mx-6 rounded-2xl bg-white/95 dark:bg-neutral-900/95 p-6 shadow-2xl min-w-[280px]">
          {/* Header */}
          <View className="items-center mb-4">
            <View className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 items-center justify-center mb-3">
              <OptimizedIcon
                name="trash-outline"
                size={24}
                className="text-red-600 dark:text-red-400"
              />
            </View>
            <ThemedText className="text-lg font-semibold text-center">
              Delete {postType === 'post' ? 'Post' : 'Comment'}?
            </ThemedText>
          </View>

          {/* Message */}
          <ThemedText className="text-center text-neutral-600 dark:text-neutral-400 mb-6 leading-relaxed">
            This {postType} will be permanently deleted. This action cannot be undone.
          </ThemedText>

          {/* Actions */}
          <View className="flex-row space-x-3">
            {/* Cancel Button */}
            <Pressable
              onPress={onClose}
              disabled={deleting}
              className="flex-1 py-3 px-4 rounded-xl bg-neutral-100 dark:bg-neutral-800 items-center active:opacity-70"
            >
              <Text className="font-medium text-neutral-700 dark:text-neutral-300">
                Cancel
              </Text>
            </Pressable>

            {/* Delete Button */}
            <Pressable
              onPress={onConfirm}
              disabled={deleting}
              className="flex-1 py-3 px-4 rounded-xl bg-red-500 dark:bg-red-600 items-center active:opacity-70"
            >
              <View className="flex-row items-center">
                {deleting && (
                  <OptimizedIcon
                    name="loading1"
                    size={16}
                    className="text-white mr-2"
                  />
                )}
                <Text className="font-medium text-white">
                  {deleting ? 'Deleting...' : 'Delete'}
                </Text>
              </View>
            </Pressable>
          </View>
        </ThemedView>
      </BlurView>
    </Modal>
  );
}
