import React, { memo, useRef } from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { useButtonAnimation } from '../../lib/animations/useButtonAnimation';

interface StrainSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder?: string;
}

const StrainSearch = memo<StrainSearchProps>(({ 
  searchQuery, 
  onSearchChange, 
  placeholder = 'Search strains...' 
}) => {
  const inputRef = useRef<TextInput>(null);
  const { animatedStyle: clearButtonStyle, handlers: clearHandlers } = useButtonAnimation({
    pressedScale: 0.9,
  });

  const handleClear = () => {
    onSearchChange('');
    inputRef.current?.focus();
  };

  return (
    <View className="px-4 pb-3">
      <View className="relative">
        {/* Search Input */}
        <View className="flex-row items-center bg-neutral-100 dark:bg-neutral-800 rounded-xl px-4 py-3 border border-neutral-200 dark:border-neutral-700">
          <Ionicons 
            name="search-outline" 
            size={20} 
            className="text-neutral-500 dark:text-neutral-400 mr-3"
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
            accessible={true}
            accessibilityLabel="Search strains"
            accessibilityHint="Type to search for specific strains"
            testID="strain-search-input"
          />

          {/* Clear Button */}
          {searchQuery.length > 0 && (
            <Animated.View style={clearButtonStyle}>
              <TouchableOpacity
                onPress={handleClear}
                onPressIn={clearHandlers.onPressIn}
                onPressOut={clearHandlers.onPressOut}
                className="ml-2 p-1 rounded-full bg-neutral-200 dark:bg-neutral-600"
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                testID="clear-search-button"
              >
                <Ionicons 
                  name="close" 
                  size={16} 
                  className="text-neutral-600 dark:text-neutral-300"
                />
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </View>
    </View>
  );
});

StrainSearch.displayName = 'StrainSearch';

export default StrainSearch;