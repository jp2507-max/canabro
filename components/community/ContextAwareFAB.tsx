/**
 * ContextAwareFAB - Dynamic FAB that changes based on active filter
 *
 * Features:
 * - Dynamic icons and colors based on content filter
 * - Smooth color transitions with interpolation
 * - Enhanced haptic feedback
 * - Accessibility support with dynamic labels
 * - Optimized spring animations
 */

import React, { useMemo } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';

import { FloatingActionButton } from '../ui/FloatingActionButton';
import { triggerMediumHapticSync } from '../../lib/utils/haptics';
import type { ContentType } from '../../lib/types/community';

interface ContextAwareFABProps {
  activeFilter: ContentType | 'all';
  onPress: () => void;
  className?: string;
}

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 400,
} as const;

export default function ContextAwareFAB({
  activeFilter,
  onPress,
  className = '',
}: ContextAwareFABProps) {
  const colorTransition = useSharedValue(0);

  // Update color transition based on active filter
  React.useEffect(() => {
    switch (activeFilter) {
      case 'questions':
        colorTransition.value = withSpring(1, SPRING_CONFIG);
        break;
      case 'plant_shares':
        colorTransition.value = withSpring(2, SPRING_CONFIG);
        break;
      default:
        colorTransition.value = withSpring(0, SPRING_CONFIG);
        break;
    }
  }, [activeFilter, colorTransition]);

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      colorTransition.value,
      [0, 1, 2],
      [
        '#10b981', // green for all/default
        '#3b82f6', // blue for questions
        '#10b981'  // green for plant shares
      ]
    );

    return {
      backgroundColor,
    };
  });

  const { icon, accessibilityLabel } = useMemo(() => {
    switch (activeFilter) {
      case 'questions':
        return {
          icon: 'help-circle' as const,
          accessibilityLabel: 'Ask a question',
        };
      case 'plant_shares':
        return {
          icon: 'leaf' as const,
          accessibilityLabel: 'Share a plant',
        };
      default:
        return {
          icon: 'add' as const,
          accessibilityLabel: 'Create new post',
        };
    }
  }, [activeFilter]);

  const handlePress = React.useCallback(async () => {
    await triggerMediumHapticSync();
    onPress();
  }, [onPress]);

  return (
    <Animated.View style={animatedStyle} className={`rounded-full ${className}`}>
      <FloatingActionButton
        onPress={handlePress}
        iconName={icon}
        size={56}
        className="bg-transparent shadow-lg"
        accessibilityLabel={accessibilityLabel}
      />
    </Animated.View>
  );
}
