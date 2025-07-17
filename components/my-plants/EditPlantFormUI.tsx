/* eslint-disable prettier/prettier */
import React from 'react';
import { Pressable, ActivityIndicator } from 'react-native';
import Animated from 'react-native-reanimated';

import { OptimizedIcon } from '../ui/OptimizedIcon';
import ThemedText from '../ui/ThemedText';

import { useButtonAnimation } from '@/lib/animations';
import { format as formatDate } from '@/lib/utils/date';

// Animated Button Components using modern hooks
interface AnimatedImageButtonProps {
  onPress: () => void;
  icon: 'camera-outline' | 'images-outline';
  label: string;
  disabled?: boolean;
  accessibilityHint: string;
}

export const AnimatedImageButton: React.FC<AnimatedImageButtonProps> = ({
  onPress,
  icon,
  label,
  disabled = false,
  accessibilityHint,
}) => {
  const { animatedStyle, handlers } = useButtonAnimation({
    onPress: disabled ? undefined : onPress,
    enableHaptics: !disabled,
    hapticStyle: 'light',
  });

  return (
    <Pressable
      {...handlers}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={disabled ? undefined : accessibilityHint}
      accessibilityState={{ disabled }}>
      <Animated.View
        style={animatedStyle}
        className={`mx-1 flex-1 flex-row items-center justify-center rounded-lg bg-primary-500 px-5 py-3 ${disabled ? 'opacity-70' : ''}`}>
        <OptimizedIcon name={icon} size={20} className="text-white" />
        <ThemedText className="ml-2 text-base font-bold text-white">{label}</ThemedText>
      </Animated.View>
    </Pressable>
  );
};

interface AnimatedRemoveButtonProps {
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint: string;
}

export const AnimatedRemoveButton: React.FC<AnimatedRemoveButtonProps> = ({ onPress, accessibilityLabel, accessibilityHint }) => {
  const { animatedStyle, handlers } = useButtonAnimation({
    onPress,
    enableHaptics: true,
    hapticStyle: 'medium',
  });

  return (
    <Pressable
      {...handlers}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}>
      <Animated.View
        style={animatedStyle}
        className="absolute right-1 top-1 rounded-full bg-white/70 p-0.5">
        <OptimizedIcon name="close-circle" size={24} className="text-status-danger" />
      </Animated.View>
    </Pressable>
  );
};

interface AnimatedDateButtonProps {
  onPress: () => void;
  value: Date;
  accessibilityLabel: string;
  accessibilityHint: string;
}

export const AnimatedDateButton: React.FC<AnimatedDateButtonProps> = ({ onPress, value, accessibilityLabel, accessibilityHint }) => {
  const { animatedStyle, handlers } = useButtonAnimation({
    onPress,
    enableHaptics: true,
    hapticStyle: 'light',
  });

  const formattedDate = formatDate(value, 'PPP');

  return (
    <Pressable
      {...handlers}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}>
      <Animated.View
        style={animatedStyle}
        className="mb-1 flex-row items-center justify-between rounded-lg border border-neutral-300 px-4 py-3 dark:border-neutral-600">
        <ThemedText className="text-neutral-800 dark:text-neutral-100">{formattedDate}</ThemedText>
        <OptimizedIcon
          name="calendar-outline"
          size={24}
          className="text-neutral-400 dark:text-neutral-500"
        />
      </Animated.View>
    </Pressable>
  );
};

interface AnimatedSubmitButtonProps {
  onPress: () => void;
  isSubmitting: boolean;
  label: string;
  accessibilityHint: string;
  accessibilityInProgressLabel: string;
}

export const AnimatedSubmitButton: React.FC<AnimatedSubmitButtonProps> = ({
  onPress,
  isSubmitting,
  label,
  accessibilityHint,
  accessibilityInProgressLabel,
}) => {
  const { animatedStyle, handlers } = useButtonAnimation({
    onPress: isSubmitting ? undefined : onPress,
    enableHaptics: !isSubmitting,
    hapticStyle: 'medium',
  });

  return (
    <Pressable
      {...handlers}
      disabled={isSubmitting}
      accessibilityRole="button"
      accessibilityLabel={isSubmitting ? accessibilityInProgressLabel : label}
      accessibilityHint={isSubmitting ? undefined : accessibilityHint}
      accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}>
      <Animated.View
        style={animatedStyle}
        className={`mt-6 flex-row items-center justify-center rounded-lg bg-primary-500 px-5 py-3 ${isSubmitting ? 'opacity-70' : ''}`}>
        {isSubmitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <ThemedText className="text-base font-bold text-white">{label}</ThemedText>
        )}
      </Animated.View>
    </Pressable>
  );
};
