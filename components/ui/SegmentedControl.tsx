import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, useColorScheme, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { OptimizedIcon } from './OptimizedIcon';
import { triggerLightHapticSync } from '../../lib/utils/haptics';

// Import the icon type from OptimizedIcon
type IconName = Parameters<typeof OptimizedIcon>[0]['name'];

const ANIMATION_CONFIG = {
  spring: { 
    damping: 20, 
    stiffness: 300,
    mass: 0.8,
  },
  timing: { 
    duration: 200,
  },
  indicator: {
    damping: 25,
    stiffness: 400,
    mass: 0.6,
  },
} as const;

export interface SegmentedControlOption {
  key: string;
  label: string;
  icon: IconName;
  color: string;
}

interface SegmentedControlProps {
  options: SegmentedControlOption[];
  selectedKey: string;
  onSelectionChange: (key: string) => void;
  className?: string;
}

const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  selectedKey,
  onSelectionChange,
  className = '',
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Track container width for proper positioning
  const [containerWidth, setContainerWidth] = useState(0);
  
  // Get current selected index
  const getCurrentIndex = useCallback(() => {
    const index = options.findIndex(option => option.key === selectedKey);
    return index >= 0 ? index : 0;
  }, [options, selectedKey]);
  
  // Initialize shared value with current index
  const indicatorPosition = useSharedValue(getCurrentIndex());
  
  // Always keep indicator position in sync with selectedKey
  useEffect(() => {
    const currentIndex = getCurrentIndex();
    indicatorPosition.value = withSpring(currentIndex, ANIMATION_CONFIG.indicator);
  }, [selectedKey, getCurrentIndex, indicatorPosition]);

  // Handle selection with haptic feedback
  const handleSelection = useCallback((key: string) => {
    if (key !== selectedKey) {
      triggerLightHapticSync();
      onSelectionChange(key);
    }
  }, [selectedKey, onSelectionChange]);

  // Handle container layout to get width
  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setContainerWidth(width);
  }, []);

  // Animated style for the sliding indicator using pixel-based positioning
  const indicatorStyle = useAnimatedStyle(() => {
    'worklet';
    const numberOfOptions = options.length;
    const itemWidth = containerWidth / numberOfOptions;
    const translateX = indicatorPosition.value * itemWidth;
    
    return {
      transform: [{ translateX }],
      width: itemWidth,
    };
  }, [options.length, containerWidth]);

  return (
    <View className={`relative ${className}`}>
      {/* Container with modern styling */}
      <View 
        className="flex-row bg-neutral-100/80 dark:bg-neutral-800/90 rounded-2xl p-1.5 backdrop-blur-sm border border-neutral-200/50 dark:border-neutral-700/50"
        onLayout={handleContainerLayout}
      >
        
        {/* Sliding selection indicator */}
        <Animated.View
          style={[
            indicatorStyle,
            {
              position: 'absolute',
              top: 6,
              bottom: 6,
              left: 6,
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.95)',
              borderRadius: 12,
              shadowColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.08)',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 1,
              shadowRadius: isDark ? 8 : 4,
              elevation: isDark ? 4 : 2,
            }
          ]}
        />

        {/* Render all options */}
        {options.map((option, index) => {
          const isSelected = option.key === selectedKey;
          
          return (
            <SegmentedControlItem
              key={option.key}
              option={option}
              isSelected={isSelected}
              onPress={() => handleSelection(option.key)}
              index={index}
            />
          );
        })}
      </View>
    </View>
  );
};

// Separate component for each segmented control item
const SegmentedControlItem: React.FC<{
  option: SegmentedControlOption;
  isSelected: boolean;
  onPress: () => void;
  index: number;
}> = ({ option, isSelected, onPress, index: _index }) => {
  // Animation values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(isSelected ? 1 : 0.7);
  
  // Update animations when selection changes
  useEffect(() => {
    opacity.value = withTiming(isSelected ? 1 : 0.7, ANIMATION_CONFIG.timing);
  }, [isSelected, opacity]);

  // Press animations
  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.95, ANIMATION_CONFIG.spring);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, ANIMATION_CONFIG.spring);
  }, [scale]);

  // Animated styles
  const itemStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      className="flex-1 z-10"
    >
      <Animated.View
        style={itemStyle}
        className="flex-row items-center justify-center px-4 py-3 min-h-[44px]"
      >
        <OptimizedIcon
          name={option.icon}
          size={18}
          className={`${
            isSelected 
              ? option.color 
              : 'text-gray-500 dark:text-gray-400'
          }`}
        />
        
        <Text
          className={`text-sm font-semibold leading-none ml-2 ${
            isSelected 
              ? 'text-gray-900 dark:text-white' 
              : 'text-gray-500 dark:text-gray-400'
          }`}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {option.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

export default SegmentedControl; 