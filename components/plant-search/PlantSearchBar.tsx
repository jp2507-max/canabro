/**
 * PlantSearchBar - Search component for plant filtering
 *
 * Features:
 * - Real-time search with debouncing
 * - Clear button with smooth animations
 * - Filter indicator badge
 * - Reanimated v3 animations for state changes
 * - Follows EnhancedTextInput patterns
 */
import React, { useState, useCallback } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { triggerLightHaptic } from '@/lib/utils/haptics';
import { EnhancedTextInput } from '@/components/ui/EnhancedTextInput';
import ThemedView from '@/components/ui/ThemedView';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';

interface PlantSearchBarProps {
  onSearchChange: (query: string) => void;
  onFilterPress: () => void;
  placeholder?: string;
  showFilterBadge?: boolean;
  initialValue?: string;
}

export const PlantSearchBar = React.memo(({
  onSearchChange,
  onFilterPress,
  placeholder,
  showFilterBadge = false,
  initialValue = '',
}: PlantSearchBarProps) => {
  const { t } = useTranslation('plantSearch');
  const [searchQuery, setSearchQuery] = useState(initialValue);
  const debouncedQuery = useDebounce(searchQuery, 300);
  
  // Use provided placeholder or default to translation
  const searchPlaceholder = placeholder || t('searchPlaceholder');

  // Animation values
  const clearButtonScale = useSharedValue(0);
  const filterBadgeScale = useSharedValue(showFilterBadge ? 1 : 0);
  const searchBarScale = useSharedValue(1);

  // Trigger search callback when debounced value changes
  React.useEffect(() => {
    onSearchChange(debouncedQuery);
  }, [debouncedQuery, onSearchChange]);

  // Update filter badge animation when prop changes
  React.useEffect(() => {
    filterBadgeScale.value = withSpring(showFilterBadge ? 1 : 0, {
      damping: 15,
      stiffness: 200,
    });
  }, [showFilterBadge]);

  // Update clear button visibility
  React.useEffect(() => {
    clearButtonScale.value = withSpring(searchQuery.length > 0 ? 1 : 0, {
      damping: 15,
      stiffness: 200,
    });
  }, [searchQuery]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  const handleClearPress = useCallback(() => {
    setSearchQuery('');
    triggerLightHaptic();
    
    // Animate search bar scale for feedback
    searchBarScale.value = withSpring(0.98, { damping: 15 }, () => {
      searchBarScale.value = withSpring(1, { damping: 15 });
    });
  }, []);

  const handleFilterPress = useCallback(() => {
    triggerLightHaptic();
    onFilterPress();
  }, [onFilterPress]);

  const handleFocus = useCallback(() => {
    searchBarScale.value = withSpring(1.02, { damping: 15 });
  }, []);

  const handleBlur = useCallback(() => {
    searchBarScale.value = withSpring(1, { damping: 15 });
  }, []);

  // Animated styles
  const clearButtonAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { scale: clearButtonScale.value },
        { 
          rotate: `${interpolate(clearButtonScale.value, [0, 1], [180, 0])}deg` 
        }
      ],
      opacity: clearButtonScale.value,
    };
  });

  const filterBadgeAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: filterBadgeScale.value }],
      opacity: filterBadgeScale.value,
    };
  });

  const searchBarAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: searchBarScale.value }],
    };
  });

  return (
    <ThemedView className="px-4 pb-3">
      <Animated.View 
        style={searchBarAnimatedStyle}
        className="flex-row items-center space-x-3"
      >
        {/* Search Input Container */}
        <ThemedView className="flex-1">
          <EnhancedTextInput
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChangeText={handleSearchChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            leftIcon="search"
            rightIcon={searchQuery.length > 0 ? "close-circle" : undefined}
            onRightIconPress={searchQuery.length > 0 ? handleClearPress : undefined}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="never" // We handle clear button manually
          />
        </ThemedView>

        {/* Filter Button */}
          <Pressable
            onPress={handleFilterPress}
            className="relative h-12 w-12 items-center justify-center rounded-lg border-2 border-neutral-300 bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800"
            accessibilityLabel="Filter plants"
            accessibilityRole="button"
          >
          <OptimizedIcon
            name="settings"
            size={20}
            className="text-neutral-600 dark:text-neutral-400"
          />
          
          {/* Filter Badge */}
          <Animated.View
            style={filterBadgeAnimatedStyle}
            className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-primary-500"
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
          />
        </Pressable>
      </Animated.View>
    </ThemedView>
  );
});

PlantSearchBar.displayName = 'PlantSearchBar';