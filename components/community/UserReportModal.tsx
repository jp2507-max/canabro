/**
 * UserReportModal - Modal for reporting users for community violations
 * 
 * Features:
 * - User-friendly reporting interface for user behavior
 * - Multiple report categories with SegmentedControl
 * - TagPill components for quick category selection
 * - Optional description field with EnhancedTextInput
 * - Integration with user reporting system
 * - Community policing functionality
 */

import React, { useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView } from 'react-native';
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
import SegmentedControl, { SegmentedControlOption } from '@/components/ui/SegmentedControl';
import TagPill from '@/components/ui/TagPill';
import UserAvatar from './UserAvatar';
import { useTranslation } from 'react-i18next';

interface UserReportModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reportData: UserReportData) => void;
  reportedUser: {
    id: string;
    username: string;
    avatar?: string;
    displayName?: string;
  };
  submitting?: boolean;
}

export interface UserReportData {
  reportedUserId: string;
  category: UserReportCategory;
  subcategory?: string;
  severity: ReportSeverity;
  description: string;
  evidence?: string[];
  isAnonymous: boolean;
}

export type UserReportCategory = 
  | 'harassment'
  | 'spam'
  | 'inappropriate_behavior'
  | 'misinformation'
  | 'impersonation'
  | 'community_guidelines'
  | 'other';

export type ReportSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Category and options helpers must be translation-aware.
 * Define as functions that receive `t` so they re-evaluate per locale.
 */
const getReportCategories = (t: (k: string) => string): SegmentedControlOption[] => [
  { key: 'harassment', label: t('moderation.userReport.categories.harassment'), icon: 'person', color: 'text-red-600 dark:text-red-400' },
  { key: 'spam', label: t('moderation.userReport.categories.spam'), icon: 'mail', color: 'text-orange-600 dark:text-orange-400' },
  { key: 'inappropriate_behavior', label: t('moderation.userReport.categories.inappropriate_behavior'), icon: 'warning', color: 'text-red-600 dark:text-red-400' },
  { key: 'misinformation', label: t('moderation.userReport.categories.misinformation'), icon: 'help-circle', color: 'text-yellow-600 dark:text-yellow-400' },
  { key: 'impersonation', label: t('moderation.userReport.categories.impersonation'), icon: 'person', color: 'text-purple-600 dark:text-purple-400' },
  { key: 'community_guidelines', label: t('moderation.userReport.categories.community_guidelines'), icon: 'document-text-outline', color: 'text-blue-600 dark:text-blue-400' },
  { key: 'other', label: t('moderation.userReport.categories.other'), icon: 'settings', color: 'text-neutral-600 dark:text-neutral-400' },
];

/**
 * Subcategories helpers use translation function to return localized arrays.
 */
const getHarassmentSubcategories = (t: (k: string) => string): string[] => [
  t('moderation.userReport.subcategories.harassment.bullying'),
  t('moderation.userReport.subcategories.harassment.targeted'),
  t('moderation.userReport.subcategories.harassment.hate_speech'),
  t('moderation.userReport.subcategories.harassment.threats'),
  t('moderation.userReport.subcategories.harassment.doxxing'),
];

const getSpamSubcategories = (t: (k: string) => string): string[] => [
  t('moderation.userReport.subcategories.spam.excessive_posting'),
  t('moderation.userReport.subcategories.spam.promotional'),
  t('moderation.userReport.subcategories.spam.repetitive'),
  t('moderation.userReport.subcategories.spam.off_topic'),
  t('moderation.userReport.subcategories.spam.bot_behavior'),
];

const getInappropriateSubcategories = (t: (k: string) => string): string[] => [
  t('moderation.userReport.subcategories.inappropriate.offensive_language'),
  t('moderation.userReport.subcategories.inappropriate.sexual_content'),
  t('moderation.userReport.subcategories.inappropriate.discriminatory'),
  t('moderation.userReport.subcategories.inappropriate.trolling'),
  t('moderation.userReport.subcategories.inappropriate.disruptive'),
];

const getSeverityOptions = (t: (k: string) => string): SegmentedControlOption[] => [
  { key: 'low', label: t('moderation.userReport.severity.low'), icon: 'checkmark', color: 'text-green-600 dark:text-green-400' },
  { key: 'medium', label: t('moderation.userReport.severity.medium'), icon: 'warning', color: 'text-yellow-600 dark:text-yellow-400' },
  { key: 'high', label: t('moderation.userReport.severity.high'), icon: 'warning', color: 'text-orange-600 dark:text-orange-400' },
  { key: 'critical', label: t('moderation.userReport.severity.critical'), icon: 'warning', color: 'text-red-600 dark:text-red-400' },
];

export default function UserReportModal({
  visible,
  onClose,
  onSubmit,
  reportedUser,
  submitting = false,
}: UserReportModalProps) {
  const { t } = useTranslation('community');
  const [selectedCategory, setSelectedCategory] = useState<UserReportCategory>('harassment');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [severity, setSeverity] = useState<ReportSeverity>('medium');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Modal fade animation
  const fadeOpacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      fadeOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    } else {
      fadeOpacity.value = withTiming(0, { duration: 180, easing: Easing.in(Easing.cubic) });
      // Reset form when modal closes
      setSelectedCategory('harassment');
      setSelectedSubcategory('');
      setSeverity('medium');
      setDescription('');
      setIsAnonymous(false);
    }
  }, [visible, fadeOpacity]);

  const fadeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fadeOpacity.value,
  }));

  if (!visible && fadeOpacity.value === 0) return null;

  const getSubcategories = (): string[] => {
    switch (selectedCategory) {
      case 'harassment':
        return getHarassmentSubcategories(t);
      case 'spam':
        return getSpamSubcategories(t);
      case 'inappropriate_behavior':
        return getInappropriateSubcategories(t);
      default:
        return [];
    }
  };

  const handleSubmit = () => {
    if (!selectedCategory || !description.trim()) return;
    
    triggerMediumHapticSync();
    
    const reportData: UserReportData = {
      reportedUserId: reportedUser.id,
      category: selectedCategory,
      subcategory: selectedSubcategory || undefined,
      severity,
      description: description.trim(),
      isAnonymous,
    };
    
    onSubmit(reportData);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category as UserReportCategory);
    setSelectedSubcategory(''); // Reset subcategory when category changes
    triggerLightHapticSync();
  };

  const handleSubcategorySelect = (subcategory: string) => {
    setSelectedSubcategory(subcategory);
    triggerLightHapticSync();
  };

  const handleSeverityChange = (severityKey: string) => {
    setSeverity(severityKey as ReportSeverity);
    triggerLightHapticSync();
  };

  // Animated scale values for buttons
  const submitScale = useSharedValue(1);
  const cancelScale = useSharedValue(1);

  const submitAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: submitScale.value }],
  }));

  const cancelAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cancelScale.value }],
  }));

  const AnimatedPressable = React.useMemo(() => Animated.createAnimatedComponent(Pressable), []);

  const isFormValid = selectedCategory && description.trim().length > 0;

  return (
    <Modal
      visible={visible || fadeOpacity.value > 0}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      accessible
      // RN Modal does not support 'dialog' role; use accessibilityViewIsModal and labels instead
      accessibilityViewIsModal
      accessibilityLabel={t('userReportModal.title')}
      accessibilityHint={t('userReportModal.accessibility.modalHint', { defaultValue: 'User report dialog. Review details and submit or cancel.' })}
    >
      <Animated.View style={[{ flex: 1 }, fadeAnimatedStyle]}>
        <BlurView
          intensity={20}
          className="flex-1 items-center justify-center bg-black/30 px-4"
        >
          <EnhancedKeyboardWrapper>
            <ThemedView className="w-full max-w-md rounded-2xl bg-white/95 dark:bg-neutral-900/95 p-6 shadow-2xl max-h-[90%]">
              {/* Header */}
              <View className="items-center mb-6">
                <View className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 items-center justify-center mb-3">
                  <OptimizedIcon
                    name="person"
                    size={24}
                    className="text-red-600 dark:text-red-400"
                  />
                </View>
                <ThemedText className="text-lg font-semibold text-center">
                  {t('userReportModal.title')}
                </ThemedText>
                
                {/* Reported User Info */}
                <View className="flex-row items-center mt-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800">
                  <UserAvatar
                    uri={reportedUser.avatar || ''}
                    size={32}
                  />
                  <View className="ml-3">
                    <ThemedText className="font-medium">
                      {reportedUser.displayName || reportedUser.username}
                    </ThemedText>
                    <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
                      @{reportedUser.username}
                    </ThemedText>
                  </View>
                </View>
              </View>

              <ScrollView className="max-h-96" showsVerticalScrollIndicator={false}>
                {/* Report Category */}
                <View className="mb-6">
                  <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                    {t('userReportModal.categoryLabel')}
                  </ThemedText>
                  <SegmentedControl
                    options={getReportCategories(t)}
                    selectedKey={selectedCategory}
                    onSelectionChange={handleCategoryChange}
                  />
                </View>

                {/* Subcategory Selection */}
                {getSubcategories().length > 0 && (
                  <View className="mb-6">
                    <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                      {t('userReportModal.subcategoryLabel')}
                    </ThemedText>
                    <View className="flex-row flex-wrap gap-2">
                      {getSubcategories().map((subcategory) => (
                        <TagPill
                          key={subcategory}
                          text={subcategory}
                          onPress={() => handleSubcategorySelect(subcategory)}
                          variant={selectedSubcategory === subcategory ? 'default' : 'neutral'}
                          size="small"
                        />
                      ))}
                    </View>
                  </View>
                )}

                {/* Severity Level */}
                <View className="mb-6">
                  <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                    {t('userReportModal.severityLabel')}
                  </ThemedText>
                  <SegmentedControl
                    options={getSeverityOptions(t)}
                    selectedKey={severity}
                    onSelectionChange={handleSeverityChange}
                  />
                </View>

                {/* Description Field */}
                <View className="mb-6">
                  <EnhancedTextInput
                    label={t('userReportModal.descriptionLabel')}
                    placeholder={t('userReportModal.descriptionPlaceholder')}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={4}
                    maxLength={1000}

                  />
                  <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    {t('userReportModal.descriptionHint')}
                  </ThemedText>
                </View>

                {/* Anonymous Reporting Option */}
                <View className="mb-6">
                  <Pressable
                    onPress={() => {
                      setIsAnonymous(!isAnonymous);
                      triggerLightHapticSync();
                    }}
                    className="flex-row items-center p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800"
                    accessibilityRole="button"
                    accessibilityLabel={t('userReportModal.anonymousLabel')}
                    accessibilityHint={t('userReportModal.accessibility.anonymousHint', { defaultValue: 'Toggle anonymous reporting' })}
                    accessibilityState={{ checked: isAnonymous }}
                  >
                    <OptimizedIcon
                      name={isAnonymous ? "checkmark" : "close"}
                      size={20}
                      className={`mr-3 ${
                        isAnonymous 
                          ? 'text-blue-600 dark:text-blue-400' 
                          : 'text-neutral-400 dark:text-neutral-500'
                      }`}
                    />
                    <View className="flex-1">
                      <ThemedText className="font-medium">
                        {t('userReportModal.anonymousLabel')}
                      </ThemedText>
                      <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
                        {t('userReportModal.anonymousDescription')}
                      </ThemedText>
                    </View>
                  </Pressable>
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
                  accessibilityLabel={t('userReportModal.cancel')}
                  accessibilityHint={t('userReportModal.accessibility.cancelHint', { defaultValue: 'Close the report dialog without submitting' })}
                  accessibilityState={{ disabled: submitting }}
                  onPressIn={() => {
                    cancelScale.value = withSpring(0.96, { damping: 10 });
                    triggerLightHapticSync();
                  }}
                  onPressOut={() => {
                    cancelScale.value = withSpring(1, { damping: 10 });
                  }}
                >
                  <Text className="font-medium text-neutral-700 dark:text-neutral-300">
                    {t('userReportModal.cancel')}
                  </Text>
                </AnimatedPressable>

                {/* Submit Button */}
                <AnimatedPressable
                  onPress={handleSubmit}
                  disabled={!isFormValid || submitting}
                  style={submitAnimatedStyle}
                  accessibilityRole="button"
                  accessibilityLabel={submitting ? t('userReportModal.submitting') : t('userReportModal.submit')}
                  accessibilityHint={t('userReportModal.accessibility.submitHint', { defaultValue: 'Submit the user report' })}
                  accessibilityState={{ disabled: !isFormValid || submitting, busy: submitting }}
                  className={`flex-1 py-3 px-4 rounded-xl items-center ${
                    !isFormValid || submitting
                      ? 'bg-neutral-300 dark:bg-neutral-700'
                      : 'bg-red-500 dark:bg-red-600'
                  }`}
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
                      {submitting ? t('userReportModal.submitting') : t('userReportModal.submit')}
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
