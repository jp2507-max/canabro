/**
 * CommunitySegmentedControl - Enhanced segmented control for content filtering
 *
 * Features:
 * - Smooth animations with animated slider background
 * - Visual differentiation for different content types
 * - Haptic feedback on selection
 * - Accessibility support
 * - Auto dark mode compatibility
 */

import React, { useCallback } from 'react';
import { View, Text, Pressable, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import { triggerLightHapticSync } from '../../lib/utils/haptics';
import { COMMUNITY_ANIMATION_CONFIG } from '@/lib/types/community';
import type { ContentType } from '../../lib/types/community';

interface CommunitySegmentedControlProps {
  activeSegment: ContentType | 'all';
  onSegmentChange: (segment: ContentType | 'all') => void;
  className?: string;
}

const SEGMENTS = [
  { key: 'all' as const, label: 'All Posts', icon: 'layers-outline' },
  { key: 'questions' as const, label: 'Questions', icon: 'help-circle' },
  { key: 'plant_shares' as const, label: 'Plant Shares', icon: 'leaf-outline' },
] as const;

const SPRING_CONFIG = COMMUNITY_ANIMATION_CONFIG.segment;

export default function CommunitySegmentedControl({
  activeSegment,
  onSegmentChange,
  className = '',
}: CommunitySegmentedControlProps) {
  const slidePosition = useSharedValue(0);
  const containerWidth = useSharedValue(0);
  const segmentWidth = useSharedValue(0);

  // Calculate slide position based on active segment
  React.useEffect(() => {
    const segmentIndex = SEGMENTS.findIndex(s => s.key === activeSegment);
    slidePosition.value = withSpring(segmentIndex, SPRING_CONFIG);
  }, [activeSegment, slidePosition]);

  const animatedSliderStyle = useAnimatedStyle(() => {
    const translateX = slidePosition.value * segmentWidth.value;
    
    return {
      transform: [{ translateX }],
      width: segmentWidth.value,
    };
  });

  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    containerWidth.value = width;
    segmentWidth.value = width / SEGMENTS.length;
  }, [containerWidth, segmentWidth]);

  const handleSegmentPress = useCallback((segment: ContentType | 'all') => {
    if (segment !== activeSegment) {
      triggerLightHapticSync();
      onSegmentChange(segment);
    }
  }, [activeSegment, onSegmentChange]);

  return (
    <View className={`mx-4 mb-4 ${className}`}>
      <View 
        className="relative bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1"
        onLayout={handleContainerLayout}
      >
        {/* Animated Slider Background */}
        <Animated.View
          style={animatedSliderStyle}
          className="absolute top-1 bottom-1 bg-white dark:bg-neutral-700 rounded-lg shadow-sm"
        />
        
        {/* Segment Buttons */}
        <View className="flex-row">
          {SEGMENTS.map((segment) => {
            const isActive = activeSegment === segment.key;
            
            return (
              <Pressable
                key={segment.key}
                onPress={() => handleSegmentPress(segment.key)}
                className="flex-1 flex-row items-center justify-center py-3 px-2"
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${segment.label}`}
                accessibilityState={{ selected: isActive }}
              >
                <OptimizedIcon
                  name={segment.icon}
                  size={16}
                  className={`mr-2 ${
                    isActive 
                      ? segment.key === 'questions' 
                        ? 'text-blue-600 dark:text-blue-400'
                        : segment.key === 'plant_shares'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-neutral-700 dark:text-neutral-300'
                      : 'text-neutral-500 dark:text-neutral-400'
                  }`}
                />
                <Text
                  className={`text-sm font-medium ${
                    isActive
                      ? segment.key === 'questions'
                        ? 'text-blue-600 dark:text-blue-400'
                        : segment.key === 'plant_shares'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-neutral-700 dark:text-neutral-300'
                      : 'text-neutral-500 dark:text-neutral-400'
                  }`}
                  numberOfLines={1}
                >
                  {segment.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
