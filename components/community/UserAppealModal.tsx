/**
 * UserAppealModal - Modal for users to appeal moderation actions
 * 
 * Features:
 * - Appeal system using existing form patterns with EnhancedKeyboardWrapper
 * - Evidence upload and documentation
 * - Integration with user reporting system
 * - Clear appeal process and guidelines
 */

import React, { useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, Alert } from 'react-native';
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
import { EnhancedTextInput } from '@/components/ui/EnhancedTextInput';
import { EnhancedKeyboardWrapper } from '@/components/keyboard/EnhancedKeyboardWrapper';
import TagPill from '@/components/ui/TagPill';
import { useTranslation } from 'react-i18next';
import { userReportingService } from '@/lib/services/user-reporting.service';

interface UserAppealModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (appealData: AppealData) => void;
  reportData: {
    id: string;
    category: string;
    severity: string;
    description: string;
    createdAt: Date;
    moderationAction?: string;
  };
  submitting?: boolean;
}

export interface AppealData {
  reportId: string;
  appealReason: string;
  evidence?: string[];
  additionalContext?: string;
}

const APPEAL_GUIDELINES_KEYS = [
  'userAppealModal.appealGuidelines.guideline1',
  'userAppealModal.appealGuidelines.guideline2',
  'userAppealModal.appealGuidelines.guideline3',
  'userAppealModal.appealGuidelines.guideline4',
  'userAppealModal.appealGuidelines.guideline5',
] as const;

export default function UserAppealModal({
  visible,
  onClose,
  onSubmit,
  reportData,
  submitting = false,
}: UserAppealModalProps) {
  const { t } = useTranslation('moderation');
  const [appealReason, setAppealReason] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [evidence, setEvidence] = useState<string[]>([]);

  // Modal fade animation
  const fadeOpacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      fadeOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    } else {
      fadeOpacity.value = withTiming(0, { duration: 180, easing: Easing.in(Easing.cubic) });
      // Reset form when modal closes
      setAppealReason('');
      setAdditionalContext('');
      setEvidence([]);
    }
  }, [visible, fadeOpacity]);

  const fadeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fadeOpacity.value,
  }));

  // Animated scale values for buttons (hooks must be declared before any early return)
  const submitScale = useSharedValue(1);
  const cancelScale = useSharedValue(1);

  const submitAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: submitScale.value }],
  }));

  const cancelAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cancelScale.value }],
  }));

  const AnimatedPressable = React.useMemo(() => Animated.createAnimatedComponent(Pressable), []);

  const isFormValid = appealReason.trim().length >= 20;

  if (!visible && fadeOpacity.value === 0) return null;

  const handleSubmit = async () => {
    if (!appealReason.trim()) {
      Alert.alert(
        t('userAppealModal.error'),
        t('userAppealModal.appealReasonRequired')
      );
      return;
    }
    
    triggerMediumHapticSync();
    
    const appealData: AppealData = {
      reportId: reportData.id,
      appealReason: appealReason.trim(),
      evidence: evidence.length > 0 ? evidence : undefined,
      additionalContext: additionalContext.trim() || undefined,
    };
    
    onSubmit(appealData);
  };

  const addEvidence = () => {
    // This would typically open a file picker or camera
    // For now, we'll add a placeholder
    setEvidence(prev => [...prev, `Evidence ${prev.length + 1}`]);
    triggerLightHapticSync();
  };

  const removeEvidence = (index: number) => {
    setEvidence(prev => prev.filter((_, i) => i !== index));
    triggerLightHapticSync();
  };


  return (
    <Modal
      visible={visible || fadeOpacity.value > 0}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      accessibilityLabel={t('userAppealModal.title')}
      accessible
    >
      <Animated.View style={[{ flex: 1 }, fadeAnimatedStyle]}>
        <BlurView
          intensity={20}
          className="flex-1 items-center justify-center bg-black/30 px-4"
        >
          <EnhancedKeyboardWrapper>
            <ThemedView
              className="w-full max-w-md rounded-2xl bg-white/95 dark:bg-neutral-900/95 p-6 shadow-2xl max-h-[90%]"
              accessibilityRole="summary"
              accessibilityLabel={t('userAppealModal.title')}
              accessible
            >
              {/* Header */}
              <View className="items-center mb-6">
                <View className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 items-center justify-center mb-3">
                  <OptimizedIcon
                    name="document-text-outline"
                    size={24}
                    className="text-blue-600 dark:text-blue-400"
                  />
                </View>
                <ThemedText className="text-lg font-semibold text-center">
                  {t('userAppealModal.title')}
                </ThemedText>
                <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400 text-center mt-1">
                  {t('userAppealModal.subtitle')}
                </ThemedText>
              </View>

              <ScrollView className="max-h-96" showsVerticalScrollIndicator={false}>
                {/* Original Report Info */}
                <View className="mb-6 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800">
                  <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    {t('userAppealModal.originalReport')}
                  </ThemedText>
                  
                  <View className="flex-row items-center mb-2">
                    <TagPill
                      text={reportData.category}
                      variant="neutral"
                      size="small"
                    />
                    <TagPill
                      text={reportData.severity}
                      variant={reportData.severity === 'critical' ? 'default' : 'neutral'}
                      size="small"
                      className="ml-2"
                    />
                  </View>
                  
                  <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                    {reportData.description}
                  </ThemedText>
                  
                  <ThemedText className="text-xs text-neutral-500 dark:text-neutral-500">
                    {t('userAppealModal.reportedOn')} {reportData.createdAt.toLocaleDateString()}
                  </ThemedText>
                  
                  {reportData.moderationAction && (
                    <View className="mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                      <ThemedText className="text-xs text-neutral-500 dark:text-neutral-500">
                        {t('userAppealModal.moderationAction')}
                      </ThemedText>
                      <ThemedText className="text-sm font-medium text-red-600 dark:text-red-400">
                        {reportData.moderationAction}
                      </ThemedText>
                    </View>
                  )}
                </View>

                {/* Appeal Guidelines */}
                <View className="mb-6">
                  <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                    {t('userAppealModal.guidelinesTitle')}
                  </ThemedText>
                  <View className="space-y-2">
                    {APPEAL_GUIDELINES_KEYS.map((key, index) => (
                      <View key={index} className="flex-row items-start">
                        <View className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 mt-2 mr-3" />
                        <ThemedText className="text-xs text-neutral-600 dark:text-neutral-400 flex-1 leading-4">
                          {t(key)}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Appeal Reason */}
                <View className="mb-6">
                  <EnhancedTextInput
                    label={t('userAppealModal.appealReasonLabel')}
                    placeholder={t('userAppealModal.appealReasonPlaceholder')}
                    value={appealReason}
                    onChangeText={setAppealReason}
                    multiline
                    numberOfLines={4}
                    maxLength={1000}

                  />
                  <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    {t('userAppealModal.appealReasonHint')} ({appealReason.length}/1000)
                  </ThemedText>
                </View>

                {/* Additional Context */}
                <View className="mb-6">
                  <EnhancedTextInput
                    label={t('userAppealModal.additionalContextLabel')}
                    placeholder={t('userAppealModal.additionalContextPlaceholder')}
                    value={additionalContext}
                    onChangeText={setAdditionalContext}
                    multiline
                    numberOfLines={3}
                    maxLength={500}
                  />
                  <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    {t('userAppealModal.additionalContextHint')}
                  </ThemedText>
                </View>

                {/* Evidence Section */}
                <View className="mb-6">
                  <View className="flex-row items-center justify-between mb-3">
                    <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {t('userAppealModal.evidenceLabel')}
                    </ThemedText>
                    <Pressable
                      onPress={addEvidence}
                      className="flex-row items-center px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30"
                    >
                      <OptimizedIcon
                        name="add"
                        size={16}
                        className="text-blue-600 dark:text-blue-400 mr-1"
                      />
                      <Text className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {t('userAppealModal.addEvidence')}
                      </Text>
                    </Pressable>
                  </View>
                  
                  {evidence.length > 0 && (
                    <View className="space-y-2">
                      {evidence.map((item, index) => (
                        <View key={index} className="flex-row items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800">
                          <View className="flex-row items-center flex-1">
                            <OptimizedIcon
                              name="document-text-outline"
                              size={16}
                              className="text-neutral-500 dark:text-neutral-400 mr-2"
                            />
                            <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
                              {item}
                            </ThemedText>
                          </View>
                          <Pressable
                            onPress={() => removeEvidence(index)}
                            className="p-1"
                          >
                            <OptimizedIcon
                              name="close"
                              size={16}
                              className="text-red-500 dark:text-red-400"
                            />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}
                  
                  <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                    {t('userAppealModal.evidenceHint')}
                  </ThemedText>
                </View>
              </ScrollView>

              {/* Actions */}
              <View className="flex-row space-x-3 mt-4">
                {/* Cancel Button */}
                <AnimatedPressable
                  onPress={onClose}
                  disabled={submitting}
                  style={cancelAnimatedStyle}
                  className="flex-1 py-3 px-4 rounded-xl bg-neutral-100 dark:bg-neutral-800 items-center"
                  accessibilityRole="button"
                  accessibilityLabel={t('userAppealModal.cancel')}
                  onPressIn={() => {
                    cancelScale.value = withSpring(0.96, { damping: 10 });
                    triggerLightHapticSync();
                  }}
                  onPressOut={() => {
                    cancelScale.value = withSpring(1, { damping: 10 });
                  }}
                >
                  <Text className="font-medium text-neutral-700 dark:text-neutral-300">
                    {t('userAppealModal.cancel')}
                  </Text>
                </AnimatedPressable>

                {/* Submit Button */}
                <AnimatedPressable
                  onPress={handleSubmit}
                  disabled={!isFormValid || submitting}
                  style={submitAnimatedStyle}
                  className={`flex-1 py-3 px-4 rounded-xl items-center ${
                    !isFormValid || submitting
                      ? 'bg-neutral-300 dark:bg-neutral-700'
                      : 'bg-blue-500 dark:bg-blue-600'
                  }`}
                  accessibilityRole="button"
                  accessibilityLabel={
                    submitting ? t('userAppealModal.submitting') : t('userAppealModal.submit')
                  }
                  onPressIn={() => {
                    if (!isFormValid || submitting) return;
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
                      !isFormValid || submitting
                        ? 'text-neutral-500 dark:text-neutral-400'
                        : 'text-white'
                    }`}>
                      {submitting ? t('userAppealModal.submitting') : t('userAppealModal.submit')}
                    </Text>
                  </View>
                </AnimatedPressable>
              </View>
            </ThemedView>
          </EnhancedKeyboardWrapper>
        </BlurView>
      </Animated.View>
    </Modal>
  );
}
