/**
 * ContentReportModal - Modal for reporting inappropriate content
 * 
 * Features:
 * - User-friendly reporting interface
 * - Multiple report categories
 * - Optional description field
 * - Integration with content moderation system
 */

import React, { useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, TextInput } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  Easing 
} from 'react-native-reanimated';
import { triggerLightHapticSync, triggerMediumHapticSync } from '@/lib/utils/haptics';
import { BlurView } from 'expo-blur';
import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';
import { useTranslation } from 'react-i18next';

interface ContentReportModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: string, description?: string) => void;
  contentType: 'post' | 'comment' | 'question' | 'plantShare';
  submitting?: boolean;
}

const REPORT_REASONS = [
  {
    key: 'spam',
    icon: 'mail',
    color: 'text-orange-600 dark:text-orange-400',
  },
  {
    key: 'inappropriate_content',
    icon: 'warning',
    color: 'text-red-600 dark:text-red-400',
  },
  {
    key: 'harassment',
    icon: 'person',
    color: 'text-red-600 dark:text-red-400',
  },
  {
    key: 'misinformation',
    icon: 'help-circle',
    color: 'text-yellow-600 dark:text-yellow-400',
  },
  {
    key: 'off_topic',
    icon: 'chatbubble-outline',
    color: 'text-blue-600 dark:text-blue-400',
  },
  {
    key: 'copyright',
    icon: 'document-text-outline',
    color: 'text-purple-600 dark:text-purple-400',
  },
  {
    key: 'other',
    icon: 'settings',
    color: 'text-gray-600 dark:text-gray-400',
  },
] as const;

export default function ContentReportModal({
  visible,
  onClose,
  onSubmit,
  contentType,
  submitting = false,
}: ContentReportModalProps) {
  const { t } = useTranslation('community');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [description, setDescription] = useState('');

  // AnimatedPressable must be created unconditionally to respect Rules of Hooks
  const AnimatedPressable = React.useMemo(() => Animated.createAnimatedComponent(Pressable), []);

  // Modal fade animation (hooks must be before any early return)
  const fadeOpacity = useSharedValue(0);

  // Animated scale values for buttons (declare before any returns)
  const submitScale = useSharedValue(1);
  const cancelScale = useSharedValue(1);

  React.useEffect(() => {
    if (visible) {
      fadeOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    } else {
      fadeOpacity.value = withTiming(0, { duration: 180, easing: Easing.in(Easing.cubic) });
      // Reset form when modal closes
      setSelectedReason('');
      setDescription('');
    }
  }, [visible, fadeOpacity]);

  const fadeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fadeOpacity.value,
  }));

  const submitAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: submitScale.value }],
  }));

  const cancelAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cancelScale.value }],
  }));

  // Guard render after hooks are initialized to follow Rules of Hooks
  if (!visible && fadeOpacity.value === 0) {
    return null;
  }

  const handleSubmit = () => {
    if (!selectedReason) return;
    
    triggerMediumHapticSync();
    onSubmit(selectedReason, description.trim() || undefined);
  };

  const handleReasonSelect = (reason: string) => {
    triggerLightHapticSync();
    setSelectedReason(reason);
  };

  // Moved above to ensure hooks are not after an early return

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
          className="flex-1 items-center justify-center bg-black/30 px-6"
        >
          <ThemedView className="w-full max-w-md rounded-2xl bg-white/95 dark:bg-neutral-900/95 p-6 shadow-2xl">
            {/* Header */}
            <View className="items-center mb-6">
              <View className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 items-center justify-center mb-3">
                <OptimizedIcon
                  name="warning"
                  size={24}
                  className="text-red-600 dark:text-red-400"
                />
              </View>
              <ThemedText className="text-lg font-semibold text-center">
                {t('contentReportModal.title')}
              </ThemedText>
              <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400 text-center mt-1">
                {t('contentReportModal.subtitle', { type: contentType })}
              </ThemedText>
            </View>

            <ScrollView className="max-h-80" showsVerticalScrollIndicator={false}>
              {/* Report Reasons */}
              <View className="mb-6">
                <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                  {t('contentReportModal.reasonLabel')}
                </ThemedText>
                <View className="space-y-2">
                  {REPORT_REASONS.map((reason) => (
                    <Pressable
                      key={reason.key}
                      onPress={() => handleReasonSelect(reason.key)}
                      className={`flex-row items-center p-3 rounded-xl border ${
                        selectedReason === reason.key
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                          : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'
                      }`}
                    >
                      <OptimizedIcon
                        name={reason.icon as any}
                        size={20}
                        className={`${reason.color} mr-3`}
                      />
                      <ThemedText className="flex-1 text-sm">
                        {t(`contentReportModal.reasons.${reason.key}`)}
                      </ThemedText>
                      {selectedReason === reason.key && (
                        <OptimizedIcon
                          name="checkmark-circle"
                          size={20}
                          className="text-blue-600 dark:text-blue-400"
                        />
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Description Field */}
              <View className="mb-6">
                <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  {t('contentReportModal.descriptionLabel')}
                </ThemedText>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder={t('contentReportModal.descriptionPlaceholder')}
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                  className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm"
                  style={{ textAlignVertical: 'top' }}
                />
                <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  {t('contentReportModal.descriptionHint')}
                </ThemedText>
              </View>
            </ScrollView>

            {/* Actions */}
            <View className="flex-row space-x-3">
              {/* Cancel Button */}
              <AnimatedPressable
                onPress={onClose}
                disabled={submitting}
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
                  {t('contentReportModal.cancel')}
                </Text>
              </AnimatedPressable>

              {/* Submit Button */}
              <AnimatedPressable
                onPress={handleSubmit}
                disabled={!selectedReason || submitting}
                style={submitAnimatedStyle}
                className={`flex-1 py-3 px-4 rounded-xl items-center ${
                  !selectedReason || submitting
                    ? 'bg-neutral-300 dark:bg-neutral-700'
                    : 'bg-red-500 dark:bg-red-600'
                }`}
                onPressIn={() => {
                  if (!selectedReason || submitting) return;
                  submitScale.value = withSpring(0.96, { damping: 10 });
                  triggerMediumHapticSync();
                }}
                onPressOut={() => {
                  submitScale.value = withSpring(1, { damping: 10 });
                }}
              >
                <View className="flex-row items-center">
                  {submitting && (
                    <OptimizedIcon
                      name="loading1"
                      size={16}
                      className="text-white mr-2"
                    />
                  )}
                  <Text className={`font-medium ${
                    !selectedReason || submitting
                      ? 'text-neutral-500 dark:text-neutral-400'
                      : 'text-white'
                  }`}>
                    {submitting ? t('contentReportModal.submitting') : t('contentReportModal.submit')}
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
