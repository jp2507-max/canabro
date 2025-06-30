/**
 * 🃏 AnimatedCard Component
 *
 * A reusable card component that matches the excellent design quality
 * of the strains screen. Provides consistent styling and animations.
 */

import React from 'react';
import { View, Pressable, ViewStyle, PressableProps } from 'react-native';
import Animated from 'react-native-reanimated';

import { useCardAnimation } from './useCardAnimation';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AnimatedCardProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;

  // Styling
  className?: string;
  style?: ViewStyle;

  // Animation configuration
  enableAnimation?: boolean;
  enableShadowAnimation?: boolean;
  enableHaptics?: boolean;

  // Card variants
  variant?: 'default' | 'elevated' | 'outlined' | 'strains-style';

  // Size variants
  size?: 'small' | 'medium' | 'large';

  // Callbacks
  onPress?: () => void;
}

export function AnimatedCard({
  children,
  className = '',
  style,
  enableAnimation = true,
  enableShadowAnimation = true,
  enableHaptics = false,
  variant = 'default',
  size = 'medium',
  onPress,
  ...pressableProps
}: AnimatedCardProps) {
  // Card animation hook
  const { animatedStyle, handlers } = useCardAnimation({
    enableShadowAnimation,
    enableHaptics,
    onPress,
  });

  // Get variant-specific className
  const getVariantClassName = (): string => {
    const baseClasses = 'bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden';

    switch (variant) {
      case 'strains-style':
        return `${baseClasses} mx-0.5 shadow-lg shadow-emerald-400/20 dark:shadow-black/40`;

      case 'elevated':
        return `${baseClasses} shadow-md shadow-black/10 dark:shadow-black/40`;

      case 'outlined':
        return `${baseClasses} border border-neutral-200 dark:border-neutral-700 shadow-none`;

      default:
        return `${baseClasses} shadow-sm shadow-black/5 dark:shadow-black/20`;
    }
  };

  // Get size-specific padding className
  const getSizeClassName = (): string => {
    switch (size) {
      case 'small':
        return 'p-3';
      case 'large':
        return 'p-6';
      default:
        return 'p-4';
    }
  };

  const variantClassName = getVariantClassName();
  const sizeClassName = getSizeClassName();
  const finalClassName = `${variantClassName} ${className}`.trim();

  if (!enableAnimation) {
    return (
      <Pressable style={style} className={finalClassName} onPress={onPress} {...pressableProps}>
        <View className={sizeClassName}>{children}</View>
      </Pressable>
    );
  }

  return (
    <AnimatedPressable
      style={[style, animatedStyle]}
      className={finalClassName}
      {...handlers}
      {...pressableProps}>
      <View className={sizeClassName}>{children}</View>
    </AnimatedPressable>
  );
}

export default AnimatedCard;
