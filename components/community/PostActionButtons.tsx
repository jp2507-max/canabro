/**
 * PostActionButtons - Action buttons for post creation (camera, gif, mention)
 *
 * Features:
 * - Camera button for adding photos
 * - GIF button for adding GIFs
 * - Mention button for tagging users
 * - 44px touch targets with proper spacing
 * - Subtle animations and haptic feedback
 */
import React from 'react';
import { Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { triggerLightHaptic } from '@/lib/utils/haptics';
import ThemedView from '@/components/ui/ThemedView';
import { OptimizedIcon, type IconName } from '@/components/ui/OptimizedIcon';

interface PostActionButtonsProps {
  onCameraPress?: () => void;
  onGifPress?: () => void;
  onMentionPress?: () => void;
  onLocationPress?: () => void;
  disabled?: boolean;
}

const SPRING_CONFIG = {
  damping: 25,
  stiffness: 600,
} as const;

interface ActionButtonProps {
  iconName: IconName;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
}

/**
 * Individual action button with animation
 */
function ActionButton({ iconName, onPress, disabled, accessibilityLabel }: ActionButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (disabled) return;

    scale.value = withSpring(0.9, SPRING_CONFIG);
    setTimeout(() => {
      scale.value = withSpring(1, SPRING_CONFIG);
    }, 100);

    triggerLightHaptic();
    onPress?.();
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        className={`h-11 w-11 items-center justify-center rounded-full ${
          disabled ? 'opacity-50' : 'active:bg-neutral-100 dark:active:bg-neutral-800'
        }`}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button">
        <OptimizedIcon
          name={iconName}
          size={24}
          className="text-neutral-600 dark:text-neutral-400"
        />
      </Pressable>
    </Animated.View>
  );
}

/**
 * Row of action buttons for post creation
 */
export function PostActionButtons({
  onCameraPress,
  onGifPress,
  onMentionPress,
  onLocationPress,
  disabled = false,
}: PostActionButtonsProps) {
  return (
    <ThemedView className="flex-row items-center space-x-2">
      <ActionButton
        iconName="camera-outline"
        onPress={onCameraPress}
        disabled={disabled}
        accessibilityLabel="Add photo"
      />

      <ActionButton
        iconName="happy-outline"
        onPress={onGifPress}
        disabled={disabled}
        accessibilityLabel="Add GIF"
      />

      <ActionButton
        iconName="at-outline"
        onPress={onMentionPress}
        disabled={disabled}
        accessibilityLabel="Mention someone"
      />

      <ActionButton
        iconName="location-outline"
        onPress={onLocationPress}
        disabled={disabled}
        accessibilityLabel="Add location"
      />
    </ThemedView>
  );
}
