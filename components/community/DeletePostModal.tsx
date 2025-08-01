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
import { useTranslation } from 'react-i18next';

interface DeletePostModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deleting?: boolean;
  postType?: 'post' | 'comment' | 'question' | 'plantShare';
  moderationReason?: string;
  showModerationOptions?: boolean;
  onModerationAction?: (action: 'hide' | 'flag' | 'delete') => void;
}

export default function DeletePostModal({
  visible,
  onClose,
  onConfirm,
  deleting = false,
  postType = 'post',
  moderationReason,
  showModerationOptions = false,
  onModerationAction
}: DeletePostModalProps) {
  const { t } = useTranslation('community');

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
    const key = postType === 'plantShare' ? 'plantShare' : postType;
    return t(`deletePostModal.types.${key}`);
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
                {t('deletePostModal.title', { type: getTypeLabel() })}
              </ThemedText>
            </View>

            {/* Message */}
            <ThemedText className="text-center text-neutral-600 dark:text-neutral-400 mb-6 leading-relaxed">
              {moderationReason 
                ? t('deletePostModal.moderationMessage', { type: getTypeLabel().toLowerCase(), reason: moderationReason })
                : t('deletePostModal.message', { type: getTypeLabel().toLowerCase() })
              }
            </ThemedText>

            {/* Moderation Options */}
            {showModerationOptions && onModerationAction && (
              <View className="mb-6">
                <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                  {t('deletePostModal.moderationOptions.title')}
                </ThemedText>
                <View className="space-y-2">
                  <Pressable
                    accessible={true}
                    accessibilityLabel={t('deletePostModal.moderationOptions.hide')}
                    onPress={() => onModerationAction('hide')}
                    className="flex-row items-center p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20"
                  >
                    <OptimizedIcon name="eye-outline" size={20} className="text-yellow-600 dark:text-yellow-400 mr-3" />
                    <ThemedText className="text-yellow-700 dark:text-yellow-300">
                      {t('deletePostModal.moderationOptions.hide')}
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    accessible={true}
                    accessibilityLabel={t('deletePostModal.moderationOptions.flag')}
                    onPress={() => onModerationAction('flag')}
                    className="flex-row items-center p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20"
                  >
                    <OptimizedIcon name="warning" size={20} className="text-orange-600 dark:text-orange-400 mr-3" />
                    <ThemedText className="text-orange-700 dark:text-orange-300">
                      {t('deletePostModal.moderationOptions.flag')}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            )}

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
                  {t('deletePostModal.cancel')}
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
                    {deleting ? t('deletePostModal.deleting') : t('deletePostModal.delete')}
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
