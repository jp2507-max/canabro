/* eslint-disable prettier/prettier */
import { format } from 'date-fns';
import React from 'react';
import { Pressable, ActivityIndicator } from 'react-native';
import Animated from 'react-native-reanimated';

import { OptimizedIcon } from '../ui/OptimizedIcon';
import ThemedText from '../ui/ThemedText';

import { useButtonAnimation } from '@/lib/animations';

// Animated Button Components using modern hooks
interface AnimatedImageButtonProps {
  onPress: () => void;
  icon: 'camera-outline' | 'images-outline';
  label: string;
  disabled?: boolean;
}

export const AnimatedImageButton: React.FC<AnimatedImageButtonProps> = ({
  onPress,
  icon,
  label,
  disabled = false,
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
      accessibilityHint={disabled ? undefined : `Tap to ${label.toLowerCase()}`}
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
}

export const AnimatedRemoveButton: React.FC<AnimatedRemoveButtonProps> = ({ onPress }) => {
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
      accessibilityLabel="Remove photo"
      accessibilityHint="Tap to remove this photo from the plant">
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
}

export const AnimatedDateButton: React.FC<AnimatedDateButtonProps> = ({ onPress, value }) => {
  const { animatedStyle, handlers } = useButtonAnimation({
    onPress,
    enableHaptics: true,
    hapticStyle: 'light',
  });

  const formattedDate = format(value, 'PPP');

  return (
    <Pressable
      {...handlers}
      accessibilityRole="button"
      accessibilityLabel={`Date: ${formattedDate}`}
      accessibilityHint="Tap to change the date">
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
}

export const AnimatedSubmitButton: React.FC<AnimatedSubmitButtonProps> = ({
  onPress,
  isSubmitting,
  label,
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
      accessibilityLabel={isSubmitting ? `${label} in progress` : label}
      accessibilityHint={isSubmitting ? undefined : `Tap to ${label.toLowerCase()}`}
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
