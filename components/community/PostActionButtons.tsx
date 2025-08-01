/**
 * PostActionButtons - Native-style action buttons for post creation with content moderation
 *
 * Features:
 * - Native iOS-style action buttons with SF Symbol inspiration
 * - Modern rounded rectangular backgrounds with subtle shadows
 * - Spring animations and haptic feedback
 * - Proper accessibility support
 * - Consistent with app's native bottom tab aesthetic
 * - Integrated content moderation actions (ACF-T04.1)
 */
import React from 'react';
import { Pressable, Platform, Alert } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  interpolateColor,
  runOnJS
} from 'react-native-reanimated';
import { triggerLightHaptic, triggerMediumHapticSync } from '@/lib/utils/haptics';
import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { OptimizedIcon, type IconName } from '@/components/ui/OptimizedIcon';
import { useTranslation } from 'react-i18next';

interface PostActionButtonsProps {
  onCameraPress?: () => void;
  onPhotoLibraryPress?: () => void;
  onLocationPress?: () => void;
  onMentionPress?: () => void;
  onReportPress?: () => void;
  onModerationPress?: () => void;
  disabled?: boolean;
  showModerationActions?: boolean;
  isModeratorView?: boolean;
}

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 200,
  mass: 0.8,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
} as const;

interface NativeActionButtonProps {
  iconName: IconName;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
  variant?: 'primary' | 'secondary';
}

/**
 * Native-style action button with modern design
 */
function NativeActionButton({ 
  iconName, 
  label, 
  onPress, 
  disabled, 
  accessibilityLabel,
  variant = 'secondary'
}: NativeActionButtonProps) {
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = variant === 'primary' 
      ? interpolateColor(
          pressed.value,
          [0, 1],
          ['rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0.2)']
        )
      : interpolateColor(
          pressed.value,
          [0, 1],
          ['rgba(118, 118, 128, 0.08)', 'rgba(118, 118, 128, 0.16)']
        );

    return {
      transform: [{ scale: scale.value }],
      backgroundColor,
    };
  });

  const handlePressIn = () => {
    'worklet';
    scale.value = withSpring(0.95, SPRING_CONFIG);
    pressed.value = withSpring(1, SPRING_CONFIG);
    runOnJS(triggerLightHaptic)();
  };

  const handlePressOut = () => {
    'worklet';
    scale.value = withSpring(1, SPRING_CONFIG);
    pressed.value = withSpring(0, SPRING_CONFIG);
  };

  const handlePress = () => {
    if (disabled) return;
    triggerMediumHapticSync();
    onPress?.();
  };

  return (
    <Animated.View style={animatedStyle} className="rounded-2xl">
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        className={`flex-row items-center justify-center rounded-2xl px-4 py-3 ${
          disabled ? 'opacity-50' : ''
        }`}
        style={{
          minHeight: 44,
          minWidth: 44,
          ...(Platform.OS === 'ios' && {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 2,
          }),
        }}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button">
        <OptimizedIcon
          name={iconName}
          size={20}
          className={`${
            variant === 'primary' 
              ? 'text-primary-600 dark:text-primary-400' 
              : 'text-neutral-700 dark:text-neutral-300'
          }`}
        />
        <ThemedText 
          className={`ml-2 text-sm font-medium ${
            variant === 'primary'
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-neutral-700 dark:text-neutral-300'
          }`}
        >
          {label}
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

/**
 * Grid of native-style action buttons for post creation with moderation actions
 */
export function PostActionButtons({
  onCameraPress,
  onPhotoLibraryPress,
  onLocationPress,
  onMentionPress,
  onReportPress,
  onModerationPress,
  disabled = false,
  showModerationActions = false,
  isModeratorView = false,
}: PostActionButtonsProps) {
  const { t } = useTranslation('community');

  const handleReportPress = () => {
    Alert.alert(
      t('postActionButtons.report.title'),
      t('postActionButtons.report.message'),
      [
        { text: t('postActionButtons.report.cancel'), style: 'cancel' },
        { 
          text: t('postActionButtons.report.confirm'), 
          style: 'destructive',
          onPress: onReportPress 
        },
      ]
    );
  };

  return (
    <ThemedView className="flex-row flex-wrap gap-3">
      {/* Standard creation actions */}
      <NativeActionButton
        iconName="camera"
        label={t('postActionButtons.camera')}
        onPress={onCameraPress}
        disabled={disabled}
        accessibilityLabel={t('postActionButtons.accessibility.camera')}
        variant="primary"
      />

      <NativeActionButton
        iconName="images-outline"
        label={t('postActionButtons.photos')}
        onPress={onPhotoLibraryPress}
        disabled={disabled}
        accessibilityLabel={t('postActionButtons.accessibility.photos')}
      />

      <NativeActionButton
        iconName="location-outline"
        label={t('postActionButtons.location')}
        onPress={onLocationPress}
        disabled={disabled}
        accessibilityLabel={t('postActionButtons.accessibility.location')}
      />

      <NativeActionButton
        iconName="at-outline"
        label={t('postActionButtons.mention')}
        onPress={onMentionPress}
        disabled={disabled}
        accessibilityLabel={t('postActionButtons.accessibility.mention')}
      />

      {/* Moderation actions */}
      {showModerationActions && (
        <>
          <NativeActionButton
            iconName="warning"
            label={t('postActionButtons.report.button')}
            onPress={handleReportPress}
            disabled={disabled}
            accessibilityLabel={t('postActionButtons.accessibility.report')}
            variant="secondary"
          />

          {isModeratorView && (
            <NativeActionButton
              iconName="checkmark"
              label={t('postActionButtons.moderate')}
              onPress={onModerationPress}
              disabled={disabled}
              accessibilityLabel={t('postActionButtons.accessibility.moderate')}
              variant="secondary"
            />
          )}
        </>
      )}
    </ThemedView>
  );
}
