import { format, addDays, isToday, isYesterday, isTomorrow, formatLocaleDate } from '@/lib/utils/date';
import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl } from 'react-native';

import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor as rnInterpolateColor,
  runOnJS,
} from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import DateTimePicker from '@react-native-community/datetimepicker';

import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import { triggerLightHapticSync, triggerMediumHaptic } from '../../lib/utils/haptics';
import { useTranslation } from 'react-i18next';
import { refreshControlColors } from '@/lib/constants/colors';
import { PlantTask } from '@/lib/models/PlantTask';

// Reanimated AnimatedPressable
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface DateSelectorProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  tasks?: PlantTask[];
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
}

interface DateItemProps {
  date: Date;
  isSelected: boolean;
  onSelect: (date: Date) => void;
  taskCount?: number;
}

// Individual date item component with animations and task count
const DateItem = React.memo(({ date, isSelected, onSelect, taskCount = 0 }: DateItemProps) => {
  const { t, i18n } = useTranslation();
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

  // Get display label for special dates with locale support
  const getDateLabel = useCallback(() => {
    // Validate date before using it
    if (!date || typeof date.getTime !== 'function' || isNaN(date.getTime())) {
      console.warn('[DateSelector] Invalid date in getDateLabel:', date);
      return t('calendar.date_selector.invalid_date', 'Invalid');
    }

    if (isCurrentToday) return t('calendar.date_selector.today', 'Today');
    if (isCurrentYesterday) return t('calendar.date_selector.yesterday', 'Yesterday');
    if (isCurrentTomorrow) return t('calendar.date_selector.tomorrow', 'Tomorrow');

    try {
      // Use locale-aware formatting
      return formatLocaleDate(date, { 
        format: 'E', 
        language: i18n.language as 'en' | 'de' 
      });
    } catch (error) {
      console.error('[DateSelector] Error formatting date label:', error);
      return t('calendar.date_selector.invalid_date', 'Invalid');
    }
  }, [isCurrentToday, isCurrentYesterday, isCurrentTomorrow, date, t, i18n.language]);

  // Pre-compute a serialisable primitive so the worklet never touches Date methods
  const timestamp = useMemo(() => {
    if (date && typeof date.getTime === 'function' && !isNaN(date.getTime())) {
      return date.getTime();
    }
    return NaN; // surface the invalid state instead of silently correcting it
  }, [date]);

  // Wrapper to convert the timestamp coming from the UI thread back into a Date
  const handleSelect = useCallback(
    (timestamp: number) => {
      // Bail out early for invalid timestamps
      if (isNaN(timestamp)) {
        console.warn('[DateSelector] Ignoring tap on invalid date item');
        return;
      }

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
    const backgroundColor = rnInterpolateColor(
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
        className="mx-2 h-16 w-16 items-center justify-center rounded-full relative"
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
          !date || typeof date.getTime !== 'function' || isNaN(date.getTime())
            ? 'Invalid Date'
            : formatLocaleDate(date, { format: 'PPP', language: i18n.language as 'en' | 'de' })
        }${taskCount > 0 ? `, ${taskCount} tasks` : ''}`}
        accessibilityState={{ selected: isSelected }}
        accessibilityHint={isSelected ? 'Currently selected date' : 'Tap to select this date'}>
        
        {/* Task count indicator */}
        {taskCount > 0 && (
          <ThemedView className="absolute -top-1 -right-1 bg-accent rounded-full min-w-5 h-5 items-center justify-center px-1">
            <ThemedText className="text-xs font-bold text-white dark:text-foreground">
              {taskCount > 9 ? '9+' : taskCount}
            </ThemedText>
          </ThemedView>
        )}
        
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
          {!date || typeof date.getTime !== 'function' || isNaN(date.getTime())
            ? '?'
            : format(date, 'd')}
        </ThemedText>
      </AnimatedPressable>
    </GestureDetector>
  );
});

DateItem.displayName = 'DateItem';

function DateSelector({ selectedDate, onDateSelect, tasks = [], onRefresh, refreshing = false }: DateSelectorProps) {
  const { t, i18n } = useTranslation();
  const flashListRef = useRef<FlashList<Date>>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Ensure selectedDate is always a valid Date object with more robust validation
  const safeSelectedDate = useMemo(() => {
    // Check for null, undefined, or non-objects first
    if (!selectedDate) {
      console.warn('[DateSelector] selectedDate is null/undefined, using current date');
      return new Date();
    }

    // Check if it's actually a Date object or has Date-like properties
    if (!(selectedDate instanceof Date)) {
      console.warn(
        '[DateSelector] selectedDate is not a Date instance:',
        selectedDate,
        'Type:',
        typeof selectedDate
      );
      return new Date();
    }

    // Check if the Date object has a valid getTime method and is not Invalid Date
    if (typeof selectedDate.getTime !== 'function' || isNaN(selectedDate.getTime())) {
      console.warn(
        '[DateSelector] Invalid selectedDate provided, using current date:',
        selectedDate
      );
      return new Date();
    }

    return selectedDate;
  }, [selectedDate]);

  // Generate extended date range (14 days: 7 before, today, 6 after) for better navigation
  const dates = useMemo(() => {
    const result = [];
    const today = new Date();
    for (let i = -7; i <= 6; i++) {
      result.push(addDays(today, i));
    }
    return result;
  }, []);

  // Calculate task counts for each date with explicit type checking
  const taskCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    tasks.forEach(task => {
      // Skip if task or dueDate is falsy or not a string/number
      if (!task?.dueDate || (typeof task.dueDate !== 'string' && typeof task.dueDate !== 'number')) {
        if (__DEV__ && task?.dueDate !== undefined) {
          console.warn('[DateSelector] Invalid task due date format:', task.dueDate);
        }
        return;
      }
      
      // Create date and validate
      const taskDate = new Date(task.dueDate);
      const time = taskDate.getTime();
      
      // Check if the date is valid
      if (!isNaN(time) && taskDate.toString() !== 'Invalid Date') {
        const dateKey = format(taskDate, 'yyyy-MM-dd');
        counts[dateKey] = (counts[dateKey] || 0) + 1;
      } else if (__DEV__) {
        console.warn('[DateSelector] Invalid task due date value:', task.dueDate);
      }
    });
    
    return counts;
  }, [tasks]);

  const handleDateSelect = useCallback(
    (date: Date) => {
      // Validate the date before calling the parent callback
      if (
        !date ||
        !(date instanceof Date) ||
        typeof date.getTime !== 'function' ||
        isNaN(date.getTime())
      ) {
        console.error('[DateSelector] Attempted to select invalid date:', date);
        return;
      }

      triggerLightHapticSync();
      console.log('[DateSelector] Date selected:', date);
      onDateSelect(date);
    },
    [onDateSelect]
  );

  // Navigate to today
  const handleTodayPress = useCallback(() => {
    const today = new Date();
    handleDateSelect(today);
    
    // Scroll to today in the list
    const todayIndex = dates.findIndex(date => isToday(date));
    if (todayIndex !== -1 && flashListRef.current) {
      flashListRef.current.scrollToIndex({ index: todayIndex, animated: true });
    }
    
    triggerMediumHaptic();
  }, [dates, handleDateSelect]);

  // Handle date picker
  const handleDatePickerChange = useCallback((event: { type: string }, date?: Date) => {
    setShowDatePicker(false);
    if (date && event.type === 'set') {
      handleDateSelect(date);
    }
  }, [handleDateSelect]);

  const handleDatePickerPress = useCallback(() => {
    setShowDatePicker(true);
    triggerLightHapticSync();
  }, []);

  // Render individual date item for FlashList
  const renderDateItem = useCallback(({ item: date, index }: { item: Date; index: number }) => {
    // Validate dates before formatting to avoid RangeError
    let dateString = 'invalid';
    let selectedDateString = 'invalid';
    let isSelected = false;
    let taskCount = 0;

    try {
      if (date && typeof date.getTime === 'function' && !isNaN(date.getTime())) {
        dateString = format(date, 'yyyy-MM-dd');
        taskCount = taskCounts[dateString] || 0;
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
        taskCount={taskCount}
      />
    );
  }, [safeSelectedDate, handleDateSelect, taskCounts]);

  // Scroll to selected date when it changes
  useEffect(() => {
    const selectedIndex = dates.findIndex(date => {
      try {
        const dateStr = format(date, 'yyyy-MM-dd');
        const selectedStr = format(safeSelectedDate, 'yyyy-MM-dd');
        return dateStr === selectedStr;
      } catch {
        return false;
      }
    });
    
    if (selectedIndex !== -1 && flashListRef.current) {
      // Small delay to ensure FlashList is ready
      setTimeout(() => {
        flashListRef.current?.scrollToIndex({ 
          index: selectedIndex, 
          animated: true,
          viewPosition: 0.5 // Center the selected item
        });
      }, 100);
    }
  }, [safeSelectedDate, dates]);

  return (
    <ThemedView className="mb-4">
      {/* Navigation controls */}
      <ThemedView className="flex-row items-center justify-between px-4 mb-2">
        <Pressable
          onPress={handleTodayPress}
          className="flex-row items-center bg-primary/10 dark:bg-primary-dark/10 px-3 py-2 rounded-full"
          accessibilityRole="button"
          accessibilityLabel={t('calendar.date_selector.today_button', 'Go to today')}
        >
          <OptimizedIcon name="calendar" size={16} className="text-primary dark:text-primary-dark mr-1" />
          <ThemedText className="text-sm font-medium text-primary dark:text-primary-dark">
            {t('calendar.date_selector.today', 'Today')}
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={handleDatePickerPress}
          className="flex-row items-center bg-neutral-100 dark:bg-neutral-800 px-3 py-2 rounded-full"
          accessibilityRole="button"
          accessibilityLabel={t('calendar.date_selector.date_picker', 'Open date picker')}
        >
          <OptimizedIcon name="calendar-outline" size={16} className="text-neutral-600 dark:text-neutral-400 mr-1" />
          <ThemedText className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
            {formatLocaleDate(safeSelectedDate, { 
              format: 'MMM d', 
              language: i18n.language as 'en' | 'de' 
            })}
          </ThemedText>
        </Pressable>
      </ThemedView>

      {/* Horizontal scrollable date list with FlashList */}
      <FlashList
        ref={flashListRef}
        data={dates}
        renderItem={renderDateItem}
        estimatedItemSize={80}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        decelerationRate="fast"
        snapToInterval={80} // Snap to each date item (64px width + 16px margin)
        snapToAlignment="center"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={refreshControlColors.tintColor}
              colors={refreshControlColors.colors}
              title={t('calendar.date_selector.pull_to_refresh', 'Pull to refresh tasks')}
            />
          ) : undefined
        }
        keyExtractor={(item, index) => `date-${format(item, 'yyyy-MM-dd')}-${index}`}
      />

      {/* Date picker modal */}
      {showDatePicker && (
        <DateTimePicker
          value={safeSelectedDate}
          mode="date"
          display="default"
          onChange={handleDatePickerChange}
          maximumDate={addDays(new Date(), 365)} // Allow selection up to 1 year in future
          minimumDate={addDays(new Date(), -365)} // Allow selection up to 1 year in past
        />
      )}
    </ThemedView>
  );
}

export default React.memo(DateSelector);
