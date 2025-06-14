import { triggerLightHapticSync } from '@/lib/utils/haptics';
import React, { memo, useRef } from 'react';
import { View, TextInput } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { useButtonAnimation } from '../../lib/animations/useButtonAnimation';
import { OptimizedIcon } from '../ui/OptimizedIcon';

interface StrainSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder?: string;
}

const StrainSearch = memo<StrainSearchProps>(
  ({ searchQuery, onSearchChange, placeholder = 'Search strains...' }) => {
    const inputRef = useRef<TextInput>(null);
    const { animatedStyle: clearButtonStyle, handlers: clearHandlers } = useButtonAnimation({
      pressedScale: 0.9,
    });

    const handleClear = () => {
      onSearchChange('');
      inputRef.current?.focus();
    };

    // Modern Gesture for clear button
    const clearGesture = Gesture.Tap()
      .onBegin(() => {
        clearHandlers.onPressIn();
        triggerLightHapticSync();
      })
      .onFinalize(() => {
        clearHandlers.onPressOut();
        handleClear();
      });

    return (
      <View className="px-4 pb-3">
        <View className="relative">
          {/* Search Input */}
          <View className="flex-row items-center rounded-xl border border-neutral-200 bg-neutral-100 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800">
            <OptimizedIcon
              name="search-outline"
              size={20}
              className="mr-3 text-neutral-500 dark:text-neutral-400"
            />

            <TextInput
              ref={inputRef}
              value={searchQuery}
              onChangeText={onSearchChange}
              placeholder={placeholder}
              placeholderTextColor="#9ca3af"
              className="flex-1 text-base text-neutral-900 dark:text-white"
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              accessible
              accessibilityLabel="Search strains"
              accessibilityHint="Type to search for specific strains"
              testID="strain-search-input"
            />

            {/* Clear Button with Gesture */}
            {searchQuery.length > 0 && (
              <GestureDetector gesture={clearGesture}>
                <Animated.View
                  style={clearButtonStyle}
                  className="ml-2 rounded-full bg-neutral-200 p-1 dark:bg-neutral-600"
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  testID="clear-search-button">
                  <OptimizedIcon
                    name="close"
                    size={16}
                    className="text-neutral-600 dark:text-neutral-300"
                  />
                </Animated.View>
              </GestureDetector>
            )}
          </View>
        </View>
      </View>
    );
  }
);

StrainSearch.displayName = 'StrainSearch';

export default StrainSearch;
