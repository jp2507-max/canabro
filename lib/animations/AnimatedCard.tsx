/**
 * 🃏 AnimatedCard Component
 * 
 * A reusable card component that matches the excellent design quality 
 * of the strains screen. Provides consistent styling and animations.
 */

import React from 'react';
import { View, Pressable, ViewStyle, PressableProps } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTheme } from '@/lib/contexts/ThemeContext';
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
  const { theme, isDarkMode } = useTheme();

  // Card animation hook
  const { animatedStyle, handlers } = useCardAnimation({
    enableShadowAnimation,
    enableHaptics,
    onPress,
  });

  // Variant styles based on strains screen patterns
  const getVariantStyles = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      backgroundColor: isDarkMode ? '#18181b' : '#fff',
      borderRadius: 24,
      overflow: 'hidden',
    };

    switch (variant) {
      case 'strains-style':
        return {
          ...baseStyle,
          borderRadius: 26,
          elevation: 8,
          shadowColor: isDarkMode ? '#000' : '#34d399',
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 16,
          marginHorizontal: 2,
        };
      
      case 'elevated':
        return {
          ...baseStyle,
          elevation: 5,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 8,
        };
      
      case 'outlined':
        return {
          ...baseStyle,
          borderWidth: 1,
          borderColor: isDarkMode ? '#27272a' : '#e5e7eb',
          elevation: 0,
          shadowOpacity: 0,
        };
      
      default:
        return {
          ...baseStyle,
          elevation: 3,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 4,
        };
    }
  };

  // Size-based padding
  const getSizePadding = () => {
    switch (size) {
      case 'small':
        return 12;
      case 'large':
        return 24;
      default:
        return 16;
    }
  };

  const variantStyles = getVariantStyles();
  const padding = getSizePadding();

  // Combine all styles
  const combinedStyle: ViewStyle = {
    ...variantStyles,
    ...style,
  };

  if (!enableAnimation) {
    return (
      <Pressable
        style={combinedStyle}
        className={className}
        onPress={onPress}
        {...pressableProps}>
        <View style={{ padding }}>
          {children}
        </View>
      </Pressable>
    );
  }

  return (
    <AnimatedPressable
      style={[combinedStyle, animatedStyle]}
      className={className}
      {...handlers}
      {...pressableProps}>
      <View style={{ padding }}>
        {children}
      </View>
    </AnimatedPressable>
  );
}

export default AnimatedCard;
