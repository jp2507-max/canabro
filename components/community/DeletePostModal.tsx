/**
 * DeletePostModal - Confirmation modal for post deletion
 */

import React from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, Easing } from 'react-native-reanimated';
import { triggerLightHapticSync, triggerHeavyHapticSync } from '@/lib/utils/haptics';
import { BlurView } from 'expo-blur';
import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';

interface DeletePostModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deleting?: boolean;
  postType?: 'post' | 'comment' | 'question' | 'plantShare';
}

export default function DeletePostModal({
  visible,
  onClose,
  onConfirm,
  deleting = false,
  postType = 'post'
}: DeletePostModalProps) {

  // Modal fade animation
  const fadeOpacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      fadeOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    } else {
      fadeOpacity.value = withTiming(0, { duration: 180, easing: Easing.in(Easing.cubic) });
    }
  }, [visible, fadeOpacity]);

  const fadeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fadeOpacity.value,
  }));

  if (!visible && fadeOpacity.value === 0) return null;

  // Determine the label for the type being deleted
  const getTypeLabel = () => {
    if (postType === 'plantShare') return 'Plant Share';
    if (postType === 'question') return 'Question';
    if (postType === 'comment') return 'Comment';
    return 'Post';
  };

  // Animated scale values for tactile feedback
  const cancelScale = useSharedValue(1);
  const deleteScale = useSharedValue(1);

  const cancelAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cancelScale.value }],
  }));

  const deleteAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: deleteScale.value }],
  }));

  // Animated Pressable
  const AnimatedPressable = React.useMemo(() => Animated.createAnimatedComponent(Pressable), []);

  return (
    <Modal
      visible={visible || fadeOpacity.value > 0}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[{ flex: 1 }, fadeAnimatedStyle]}>
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
                Delete {getTypeLabel()}?
              </ThemedText>
            </View>

            {/* Message */}
            <ThemedText className="text-center text-neutral-600 dark:text-neutral-400 mb-6 leading-relaxed">
              This {getTypeLabel().toLowerCase()} will be permanently deleted. This action cannot be undone.
            </ThemedText>

            {/* Actions */}
            <View className="flex-row space-x-3">
              {/* Cancel Button */}
              <AnimatedPressable
                onPress={onClose}
                disabled={deleting}
                style={cancelAnimatedStyle}
                className="flex-1 py-3 px-4 rounded-xl bg-neutral-100 dark:bg-neutral-800 items-center"
                onPressIn={() => {
                  cancelScale.value = withSpring(0.96, { damping: 10 });
                  triggerLightHapticSync();
                }}
                onPressOut={() => {
                  cancelScale.value = withSpring(1, { damping: 10 });
                }}
              >
                <Text className="font-medium text-neutral-700 dark:text-neutral-300">
                  Cancel
                </Text>
              </AnimatedPressable>

              {/* Delete Button */}
              <AnimatedPressable
                onPress={onConfirm}
                disabled={deleting}
                style={deleteAnimatedStyle}
                className="flex-1 py-3 px-4 rounded-xl bg-red-500 dark:bg-red-600 items-center"
                onPressIn={() => {
                  deleteScale.value = withSpring(0.96, { damping: 10 });
                  triggerHeavyHapticSync();
                }}
                onPressOut={() => {
                  deleteScale.value = withSpring(1, { damping: 10 });
                }}
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
              </AnimatedPressable>
            </View>
          </ThemedView>
        </BlurView>
      </Animated.View>
    </Modal>
  );
}
