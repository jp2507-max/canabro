import { format, addDays, isToday, isYesterday, isTomorrow } from 'date-fns';
import React, { useMemo, useCallback, useEffect } from 'react';
import { ScrollView, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
  runOnJS,
} from 'react-native-reanimated';

import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';
import { triggerLightHapticSync } from '../../lib/utils/haptics';

// Reanimated AnimatedPressable
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface DateSelectorProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

interface DateItemProps {
  date: Date;
  isSelected: boolean;
  onSelect: (date: Date) => void;
}

// Individual date item component with animations
const DateItem = React.memo(({ date, isSelected, onSelect }: DateItemProps) => {
  const scale = useSharedValue(1);
  const shadowOpacity = useSharedValue(0.1);
  const elevation = useSharedValue(1);
  const selection = useSharedValue(isSelected ? 1 : 0);

  const isCurrentToday = isToday(date);
  const isCurrentYesterday = isYesterday(date);
  const isCurrentTomorrow = isTomorrow(date);

  // Update selection shared value when prop changes
  useEffect(() => {
    selection.value = withTiming(isSelected ? 1 : 0, { duration: 250 });
  }, [isSelected, selection]);

  // Get display label for special dates
  const getDateLabel = useCallback(() => {
    // Validate date before using it
    if (!date || typeof date.getTime !== 'function' || isNaN(date.getTime())) {
      console.warn('[DateSelector] Invalid date in getDateLabel:', date);
      return 'Invalid';
    }
    
    if (isCurrentToday) return 'Today';
    if (isCurrentYesterday) return 'Yesterday';
    if (isCurrentTomorrow) return 'Tomorrow';
    
    try {
      return format(date, 'E');
    } catch (error) {
      console.error('[DateSelector] Error formatting date label:', error);
      return 'Invalid';
    }
  }, [isCurrentToday, isCurrentYesterday, isCurrentTomorrow, date]);

  // Pre-compute a serialisable primitive so the worklet never touches Date methods
  const timestamp = useMemo(() => {
    if (date && typeof date.getTime === 'function' && !isNaN(date.getTime())) {
      return date.getTime();
    }
    return Date.now(); // fallback – should never hit given our validation
  }, [date]);

  // Wrapper to convert the timestamp coming from the UI thread back into a Date
  const handleSelect = useCallback(
    (timestamp: number) => {
      const validDate = new Date(timestamp);
      if (!isNaN(validDate.getTime())) {
        onSelect(validDate);
      } else {
        console.error('[DateSelector] Received invalid timestamp from gesture:', timestamp);
      }
    },
    [onSelect]
  );

  const tapGesture = Gesture.Tap()
    .onStart(() => {
      'worklet';
      scale.value = withSpring(0.95, { damping: 20, stiffness: 400 });
      shadowOpacity.value = withTiming(0.15, { duration: 150 });
      elevation.value = withTiming(2, { duration: 150 });

      runOnJS(triggerLightHapticSync)();
    })
    .onEnd(() => {
      'worklet';
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      shadowOpacity.value = withTiming(isSelected ? 0.2 : 0.1, { duration: 200 });
      elevation.value = withTiming(isSelected ? 3 : 1, { duration: 200 });
    })
    .onFinalize(() => {
      'worklet';
      // Pass the pre-computed timestamp (primitive) to JS; no Date methods in UI runtime.
      runOnJS(handleSelect)(timestamp);
    });

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      selection.value,
      [0, 1],
      ['transparent', '#10b981'] // primary-500
    );

    return {
      transform: [{ scale: scale.value }],
      backgroundColor,
      shadowOpacity: shadowOpacity.value,
      elevation: elevation.value,
    };
  });

  return (
    <GestureDetector gesture={tapGesture}>
      <AnimatedPressable
        className="mx-2 h-16 w-16 items-center justify-center rounded-full"
        style={[
          animatedStyle,
          {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowRadius: 3,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Select date ${
          !date || typeof date.getTime !== 'function' || isNaN(date.getTime()) ? 'Invalid Date' : format(date, 'PPP')
        }`}
        accessibilityState={{ selected: isSelected }}
        accessibilityHint={isSelected ? 'Currently selected date' : 'Tap to select this date'}>
        <ThemedText
          className={`text-xs font-medium ${
            isSelected
              ? 'text-white'
              : isCurrentToday
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-neutral-500 dark:text-neutral-400'
          }`}>
          {getDateLabel()}
        </ThemedText>
        <ThemedText
          className={`text-lg font-bold ${
            isSelected
              ? 'text-white'
              : isCurrentToday
                ? 'text-primary-700 dark:text-primary-300'
                : 'text-neutral-800 dark:text-neutral-200'
          }`}>
          {!date || typeof date.getTime !== 'function' || isNaN(date.getTime()) ? '?' : format(date, 'd')}
        </ThemedText>
      </AnimatedPressable>
    </GestureDetector>
  );
});

DateItem.displayName = 'DateItem';

function DateSelector({ selectedDate, onDateSelect }: DateSelectorProps) {
  // Ensure selectedDate is always a valid Date object with more robust validation
  const safeSelectedDate = useMemo(() => {
    // Check for null, undefined, or non-objects first
    if (!selectedDate) {
      console.warn('[DateSelector] selectedDate is null/undefined, using current date');
      return new Date();
    }
    
    // Check if it's actually a Date object or has Date-like properties
    if (!(selectedDate instanceof Date)) {
      console.warn('[DateSelector] selectedDate is not a Date instance:', selectedDate, 'Type:', typeof selectedDate);
      return new Date();
    }
    
    // Check if the Date object has a valid getTime method and is not Invalid Date
    if (typeof selectedDate.getTime !== 'function' || isNaN(selectedDate.getTime())) {
      console.warn('[DateSelector] Invalid selectedDate provided, using current date:', selectedDate);
      return new Date();
    }
    
    return selectedDate;
  }, [selectedDate]);

  // Generate date range (7 days: 3 before, today, 3 after)
  const dates = useMemo(() => {
    const result = [];
    const today = new Date();
    for (let i = -3; i <= 3; i++) {
      result.push(addDays(today, i));
    }
    return result;
  }, []);

  const handleDateSelect = useCallback(
    (date: Date) => {
      // Validate the date before calling the parent callback
      if (!date || !(date instanceof Date) || typeof date.getTime !== 'function' || isNaN(date.getTime())) {
        console.error('[DateSelector] Attempted to select invalid date:', date);
        return;
      }
      
      console.log('[DateSelector] Date selected:', date);
      onDateSelect(date);
    },
    [onDateSelect]
  );

  return (
    <ThemedView className="mb-4">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        decelerationRate="fast"
        snapToInterval={80} // Snap to each date item (64px width + 16px margin)
        snapToAlignment="start">
        {dates.map((date, index) => {
          // Validate dates before formatting to avoid RangeError
          let dateString = 'invalid';
          let selectedDateString = 'invalid';
          let isSelected = false;
          
          try {
            if (date && typeof date.getTime === 'function' && !isNaN(date.getTime())) {
              dateString = format(date, 'yyyy-MM-dd');
            }
            // Use safeSelectedDate instead of selectedDate
            selectedDateString = format(safeSelectedDate, 'yyyy-MM-dd');
            isSelected = dateString === selectedDateString && dateString !== 'invalid';
          } catch (error) {
            console.error('[DateSelector] Error formatting dates for comparison:', error);
            isSelected = false;
          }

          return (
            <DateItem
              key={`${dateString}-${index}`}
              date={date}
              isSelected={isSelected}
              onSelect={handleDateSelect}
            />
          );
        })}
      </ScrollView>
    </ThemedView>
  );
}

export default React.memo(DateSelector);
