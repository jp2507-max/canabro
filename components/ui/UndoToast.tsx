/**
 * UndoToast - Provides undo functionality for accidental deletions
 */

import React, { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  cancelAnimation,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { OptimizedIcon } from './OptimizedIcon';
import { triggerLightHaptic } from '../../lib/utils/haptics';

interface UndoToastProps {
  visible: boolean;
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number; // Auto-dismiss duration in milliseconds
}

export default function UndoToast({
  visible,
  message,
  onUndo,
  onDismiss,
  duration = 5000, // 5 seconds default
}: UndoToastProps) {
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (visible) {
      // Animate in
      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      opacity.value = withSpring(1);

      // Auto-dismiss after duration
      timer = setTimeout(() => {
        onDismiss();
      }, duration);
    } else {
      // Animate out
      translateY.value = withSpring(100);
      opacity.value = withSpring(0);
    }

    return () => {
      if (timer) clearTimeout(timer);
      // Cancel ongoing animations to prevent memory leaks and inconsistent UI states
      cancelAnimation(translateY);
      cancelAnimation(opacity);
    };
  }, [visible, duration, onDismiss]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const handleUndo = () => {
    triggerLightHaptic();
    onUndo();
  };

  const handleDismiss = () => {
    triggerLightHaptic();
    onDismiss();
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[animatedStyle]}
      className="absolute bottom-safe left-4 right-4 z-50"
    >
      <BlurView
        intensity={80}
        className="rounded-2xl overflow-hidden"
      >
        <View className="bg-neutral-900/90 dark:bg-neutral-100/90 px-4 py-3 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <OptimizedIcon
              name="trash-outline"
              size={20}
              className="text-neutral-100 dark:text-neutral-900 mr-3"
            />
            <Text className="text-neutral-100 dark:text-neutral-900 text-sm font-medium flex-1">
              {message}
            </Text>
          </View>

          <View className="flex-row items-center ml-4">
            <Pressable
              onPress={handleUndo}
              className="px-3 py-1.5 bg-blue-600 dark:bg-blue-500 rounded-lg mr-2"
            >
              <Text className="text-white text-sm font-semibold">
                Undo
              </Text>
            </Pressable>

            <Pressable
              onPress={handleDismiss}
              className="p-1"
            >
              <OptimizedIcon
                name="close"
                size={18}
                className="text-neutral-400 dark:text-neutral-600"
              />
            </Pressable>
          </View>
        </View>
      </BlurView>
    </Animated.View>
  );
}
