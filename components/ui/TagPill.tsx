import React from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor as rInterpolateColor,
} from 'react-native-reanimated';

import ThemedText from './ThemedText';
import { triggerLightHapticSync } from '@/lib/utils/haptics';

interface TagPillProps {
  text: string;
  onPress?: () => void;
  selected?: boolean;
  variant?: 'default' | 'strain' | 'category' | 'blue' | 'green' | 'neutral';
  size?: 'small' | 'medium';
  disabled?: boolean;
  enableHaptics?: boolean;
  className?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function TagPill({
  text,
  onPress,
  selected = false,
  variant = 'default',
  size = 'medium',
  disabled = false,
  enableHaptics = true,
  className = '',
}: TagPillProps) {
  // Shared values for animations
  const scale = useSharedValue(1);
  const selectedProgress = useSharedValue(selected ? 1 : 0);

  // Update selection animation when selected prop changes
  React.useEffect(() => {
    selectedProgress.value = withTiming(selected ? 1 : 0, { duration: 200 });
  }, [selected, selectedProgress]);

  // Animated styles for press and selection effects
  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    // Color mappings: use semantic CSS variables for theme support
    const colorFrom = 'var(--color-neutral-200)'; // neutral-200
    let colorTo = 'var(--color-indigo-500)'; // indigo-500 (default)
    switch (variant) {
      case 'strain':
      case 'green':
        colorTo = 'var(--color-green-500)'; // green-500
        break;
      case 'category':
      case 'blue':
        colorTo = 'var(--color-blue-500)'; // blue-500
        break;
      case 'neutral':
        colorTo = 'var(--color-neutral-500)'; // neutral-500
        break;
      // default: indigo-500
    }
    const backgroundColor = rInterpolateColor(
      selectedProgress.value,
      [0, 1],
      [colorFrom, colorTo]
    );

    return {
      transform: [{ scale: scale.value }],
      backgroundColor, // Light mode
      // Note: Dark mode handled via CSS variables in global.css
    };
  });

  const textAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    const textColor = rInterpolateColor(
      selectedProgress.value,
      [0, 1],
      ['rgb(64, 64, 64)', 'rgb(255, 255, 255)'] // neutral-700 to white
    );

    return {
      color: textColor,
    };
  });

  const handlePress = () => {
    if (disabled) return;

    // Haptic feedback
    if (enableHaptics) {
      triggerLightHapticSync();
    }

    // Press animation
    scale.value = withTiming(0.95, { duration: 100 }, () => {
      scale.value = withTiming(1, { duration: 200 });
    });

    onPress?.();
  };

  // CSS classes for different variants and states
  const getVariantClasses = () => {
    if (selected) {
      switch (variant) {
        case 'strain':
        case 'green':
          return 'bg-green-500';
        case 'category':
        case 'blue':
          return 'bg-blue-500';
        case 'neutral':
          return 'bg-neutral-500';
        default:
          return 'bg-indigo-500';
      }
    }
    return 'bg-neutral-200 dark:bg-neutral-700';
  };

  const getSizeClasses = () => {
    return size === 'small' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-xs';
  };

  const getTextClasses = () => {
    if (selected) {
      return 'text-white';
    }
    return 'text-neutral-700 dark:text-neutral-300';
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      disabled={disabled}
      style={animatedStyle}
      className={`
        mr-2 rounded-full
        ${getSizeClasses()}
        ${getVariantClasses()}
        ${disabled ? 'opacity-50' : ''}
        ${className}
        transition-colors duration-200
      `}
      accessible
      accessibilityRole="button"
      accessibilityState={{
        selected,
        disabled,
      }}
      accessibilityLabel={`${text} tag${selected ? ', selected' : ''}`}
      accessibilityHint={onPress ? 'Tap to toggle selection' : undefined}>
      <Animated.View>
        <ThemedText className={`font-medium ${getTextClasses()}`} style={textAnimatedStyle}>
          {text}
        </ThemedText>
      </Animated.View>
    </AnimatedPressable>
  );
}

export default TagPill;
