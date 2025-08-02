import React, { useCallback, useState } from 'react';
import { Pressable } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { formatLocaleDate, addDays } from '@/lib/utils/date';
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import { triggerLightHapticSync, triggerMediumHaptic } from '@/lib/utils/haptics';
import { useTranslation } from 'react-i18next';

export interface TaskNavigationProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onTodayPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function TaskNavigation({
  selectedDate,
  onDateSelect,
  onTodayPress
}: TaskNavigationProps) {
  const { t, i18n } = useTranslation();
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Animation values for buttons
  const todayScale = useSharedValue(1);
  const datePickerScale = useSharedValue(1);

  // Handle today button press
  const handleTodayPress = useCallback(() => {
    const today = new Date();
    onDateSelect(today);
    onTodayPress?.();
    triggerMediumHaptic();
  }, [onDateSelect, onTodayPress]);

  // Handle date picker
  const handleDatePickerPress = useCallback(() => {
    setShowDatePicker(true);
    triggerLightHapticSync();
  }, []);

  type DateTimeChangeEvent = { type: 'set' | 'dismissed' | string };

  const handleDatePickerChange = useCallback((event: DateTimeChangeEvent, date?: Date) => {
    setShowDatePicker(false);
    if (date && event.type === 'set') {
      onDateSelect(date);
      triggerLightHapticSync();
    }
  }, [onDateSelect]);

  // Today button gesture
  const todayTapGesture = Gesture.Tap()
    .onStart(() => {
      todayScale.value = withSpring(0.95, { damping: 20, stiffness: 400 });
    })
    .onEnd(() => {
      todayScale.value = withSpring(1, { damping: 15, stiffness: 300 });
    })
    .onFinalize(() => {
      runOnJS(handleTodayPress)();
    });

  // Date picker button gesture
  const datePickerTapGesture = Gesture.Tap()
    .onStart(() => {
      datePickerScale.value = withSpring(0.95, { damping: 20, stiffness: 400 });
    })
    .onEnd(() => {
      datePickerScale.value = withSpring(1, { damping: 15, stiffness: 300 });
    })
    .onFinalize(() => {
      runOnJS(handleDatePickerPress)();
    });

  // Animated styles
  const todayAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: todayScale.value }],
  }));

  const datePickerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: datePickerScale.value }],
  }));

  return (
    <ThemedView className="flex-row items-center justify-between px-4 mb-3">
      {/* Today button */}
      <GestureDetector gesture={todayTapGesture}>
        <AnimatedPressable
          style={[todayAnimatedStyle]}
          className="flex-row items-center bg-primary/10 dark:bg-primary-dark/10 px-4 py-2.5 rounded-full"
          accessibilityRole="button"
          accessibilityLabel={t('calendar.navigation.today_button', 'Go to today')}
          accessibilityHint={t('calendar.navigation.today_hint', 'Navigates to today\'s date')}
        >
          <OptimizedIcon 
            name="calendar" 
            size={18} 
            className="text-primary dark:text-primary-dark mr-2" 
          />
          <ThemedText className="text-sm font-semibold text-primary dark:text-primary-dark">
            {t('calendar.navigation.today', 'Today')}
          </ThemedText>
        </AnimatedPressable>
      </GestureDetector>

      {/* Current date display and date picker trigger */}
      <GestureDetector gesture={datePickerTapGesture}>
        <AnimatedPressable
          style={[datePickerAnimatedStyle]}
          className="flex-row items-center bg-neutral-100 dark:bg-neutral-800 px-4 py-2.5 rounded-full"
          accessibilityRole="button"
          accessibilityLabel={t('calendar.navigation.date_picker', 'Open date picker')}
          accessibilityHint={t('calendar.navigation.date_picker_hint', 'Opens calendar to select a specific date')}
        >
          <OptimizedIcon 
            name="calendar-outline" 
            size={18} 
            className="text-neutral-600 dark:text-neutral-400 mr-2" 
          />
          <ThemedText className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            {formatLocaleDate(selectedDate, { 
              format: 'MMM d, yyyy', 
              language: i18n.language as 'en' | 'de' 
            })}
          </ThemedText>
          <OptimizedIcon 
            name="chevron-down" 
            size={16} 
            className="text-neutral-500 dark:text-neutral-400 ml-1" 
          />
        </AnimatedPressable>
      </GestureDetector>

      {/* Date picker modal */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDatePickerChange}
          maximumDate={addDays(new Date(), 365)} // Allow selection up to 1 year in future
          minimumDate={addDays(new Date(), -365)} // Allow selection up to 1 year in past
          locale={i18n.language}
        />
      )}
    </ThemedView>
  );
}
