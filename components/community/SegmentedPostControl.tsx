/**
 * SegmentedPostControl - iOS-like segmented control for Ask Question/Create Post modes
 *
 * Features:
 * - Smooth 200ms animations with animated blue indicator
 * - 36px height with 2px indicator height
 * - Minimum 88px segment width
 * - Haptic feedback on selection
 * - Accessibility support
 *
 * Note: Uses ThemedText which wraps React Native Text component
 */

import React from 'react';
import { View, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { triggerSelectionHaptic } from '@/lib/utils/haptics';
import ThemedText from '@/components/ui/ThemedText';

export type PostMode = 'question' | 'post';

interface SegmentedPostControlProps {
  selectedMode: PostMode;
  onModeChange: (mode: PostMode) => void;
  disabled?: boolean;
}

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 400,
} as const;

// Segment width constant for consistent sizing and animations
const SEGMENT_WIDTH = 88;

/**
 * iOS-like segmented control for switching between Ask Question and Create Post modes
 */
export function SegmentedPostControl({
  selectedMode,
  onModeChange,
  disabled = false,
}: SegmentedPostControlProps) {
  // Animated indicator position (0 = question, 1 = post)
  const indicatorPosition = useSharedValue(selectedMode === 'post' ? 1 : 0);
  // Update indicator position when selectedMode changes
  React.useEffect(() => {
    indicatorPosition.value = withSpring(selectedMode === 'post' ? 1 : 0, SPRING_CONFIG);
  }, [selectedMode]);

  const handleModePress = (mode: PostMode) => {
    if (disabled || mode === selectedMode) return;

    triggerSelectionHaptic();
    onModeChange(mode);
  };

  // Animated indicator style
  const indicatorAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        {
          translateX: indicatorPosition.value * SEGMENT_WIDTH,
        },
      ],
    };
  });

  // Segment text styles with smooth transitions
  const getSegmentTextStyle = (mode: PostMode) => {
    const isSelected = selectedMode === mode;
    return `text-sm font-semibold ${
      isSelected
        ? 'text-primary-600 dark:text-primary-400'
        : 'text-neutral-600 dark:text-neutral-400'
    }`;
  };

  return (
    <View className="relative h-9 flex-row rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
      {/* Animated blue indicator */}
      <Animated.View
        style={indicatorAnimatedStyle}
        className={`absolute bottom-1 h-0.5 w-[${SEGMENT_WIDTH}px] rounded-full bg-primary-500 dark:bg-primary-400`}
      />

      {/* Ask Question Segment */}
      <Pressable
        onPress={() => handleModePress('question')}
        disabled={disabled}
        className={`min-w-[${SEGMENT_WIDTH}px] flex-1 items-center justify-center rounded-lg`}
        accessibilityRole="button"
        accessibilityState={{ selected: selectedMode === 'question' }}
        accessibilityLabel="Ask Question mode">
        <ThemedText className={getSegmentTextStyle('question')}>Ask Question</ThemedText>
      </Pressable>

      {/* Create Post Segment */}
      <Pressable
        onPress={() => handleModePress('post')}
        disabled={disabled}
        className={`min-w-[${SEGMENT_WIDTH}px] flex-1 items-center justify-center rounded-lg`}
        accessibilityRole="button"
        accessibilityState={{ selected: selectedMode === 'post' }}
        accessibilityLabel="Create Post mode">
        <ThemedText className={getSegmentTextStyle('post')}>Create Post</ThemedText>
      </Pressable>
    </View>
  );
}

export default SegmentedPostControl;
