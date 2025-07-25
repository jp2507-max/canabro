import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor as aliasedInterpolateColor,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { format, addDays, isToday, formatLocaleDate, isSameDay } from '@/lib/utils/date';
import { PlantTask } from '@/lib/models/PlantTask';
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';
import { triggerLightHapticSync, triggerMediumHaptic } from '@/lib/utils/haptics';
import { useTranslation } from 'react-i18next';

export interface DaySelectorProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  tasks?: PlantTask[];
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
  dateRange?: number; // Number of days to show (default: 14)
}

interface DayItemData {
  date: Date;
  dateId: string;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  isSelected: boolean;
  taskCount: number;
}

interface DayItemProps {
  item: DayItemData;
  onSelect: (date: Date) => void;
}

// Individual day item component with smooth animations
const DayItem = React.memo(({ item, onSelect }: DayItemProps) => {
  const { i18n } = useTranslation();
  const scale = useSharedValue(1);
  const selection = useSharedValue(item.isSelected ? 1 : 0);

  // Update selection animation when prop changes
  useEffect(() => {
    selection.value = withTiming(item.isSelected ? 1 : 0, { duration: 250 });
  }, [item.isSelected, selection]);

  const handlePress = useCallback(() => {
    triggerLightHapticSync();
    onSelect(item.date);
  }, [item.date, onSelect]);

  // Swipe gesture for smooth momentum scrolling
  const tapGesture = Gesture.Tap()
    .onStart(() => {
      scale.value = withSpring(0.95, { damping: 20, stiffness: 400 });
    })
    .onEnd(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    })
    .onFinalize(() => {
      runOnJS(handlePress)();
    });

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = aliasedInterpolateColor(
      selection.value,
      [0, 1],
      ['transparent', 'var(--primary-500)'] // Use CSS variable for primary-500
    );

    return {
      transform: [{ scale: scale.value }],
      backgroundColor,
    };
  });

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View
        className="mx-2 h-16 w-16 items-center justify-center rounded-full relative"
        style={[
          animatedStyle,
          {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowRadius: 3,
            shadowOpacity: item.isSelected ? 0.2 : 0.1,
            elevation: item.isSelected ? 3 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Select ${formatLocaleDate(item.date, { 
          format: 'EEEE, MMMM d', 
          language: i18n.language as 'en' | 'de' 
        })}${item.taskCount > 0 ? `, ${item.taskCount} tasks` : ''}`}
        accessibilityState={{ selected: item.isSelected }}
        accessibilityHint={item.isSelected ? 'Currently selected date' : 'Tap to select this date'}
      >
        {/* Task count indicator */}
        {item.taskCount > 0 && (
          <ThemedView className="absolute -top-1 -right-1 bg-primary dark:bg-primary-dark rounded-full min-w-5 h-5 items-center justify-center px-1">
            <ThemedText className="text-xs font-bold text-white dark:text-foreground">
              {item.taskCount > 9 ? '9+' : item.taskCount}
            </ThemedText>
          </ThemedView>
        )}

        {/* Day name */}
        <ThemedText
          className={`text-xs font-medium ${
            item.isSelected
              ? 'text-white'
              : item.isToday
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-neutral-500 dark:text-neutral-400'
          }`}
        >
          {item.dayName}
        </ThemedText>

        {/* Day number */}
        <ThemedText
          className={`text-lg font-bold ${
            item.isSelected
              ? 'text-white'
              : item.isToday
                ? 'text-primary-700 dark:text-primary-300'
                : 'text-neutral-800 dark:text-neutral-200'
          }`}
        >
          {item.dayNumber}
        </ThemedText>
      </Animated.View>
    </GestureDetector>
  );
});

DayItem.displayName = 'DayItem';

export default function DaySelector({
  selectedDate,
  onDateSelect,
  tasks = [],
  onRefresh,
  refreshing = false,
  dateRange = 14
}: DaySelectorProps) {
  const { i18n } = useTranslation();
  const flashListRef = useRef<FlashList<DayItemData>>(null);

  // Generate date range
  const dates = useMemo(() => {
    const result = [];
    const today = new Date();
    const halfRange = Math.floor(dateRange / 2);
    
    for (let i = -halfRange; i < dateRange - halfRange; i++) {
      result.push(addDays(today, i));
    }
    return result;
  }, [dateRange]);

  // Calculate task counts for each date
  const taskCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    tasks.forEach(task => {
      try {
        const taskDate = new Date(task.dueDate);
        if (!isNaN(taskDate.getTime())) {
          const dateKey = format(taskDate, 'yyyy-MM-dd');
          counts[dateKey] = (counts[dateKey] || 0) + 1;
        }
      } catch (error) {
        console.warn('[DaySelector] Invalid task due date:', task.dueDate);
      }
    });
    
    return counts;
  }, [tasks]);

  // Transform dates into day item data
  const dayItems = useMemo(() => {
    return dates.map((date): DayItemData => {
      const dateId = format(date, 'yyyy-MM-dd');
      const selectedDateId = format(selectedDate, 'yyyy-MM-dd');
      
      return {
        date,
        dateId,
        dayName: formatLocaleDate(date, { 
          format: 'E', 
          language: i18n.language as 'en' | 'de' 
        }),
        dayNumber: parseInt(format(date, 'd')),
        isToday: isToday(date),
        isSelected: dateId === selectedDateId,
        taskCount: taskCounts[dateId] || 0,
      };
    });
  }, [dates, selectedDate, taskCounts, i18n.language]);

  const handleDateSelect = useCallback((date: Date) => {
    onDateSelect(date);
  }, [onDateSelect]);

  // Render individual day item
  const renderDayItem = useCallback(({ item }: { item: DayItemData }) => (
    <DayItem item={item} onSelect={handleDateSelect} />
  ), [handleDateSelect]);

  // Scroll to selected date when it changes
  useEffect(() => {
    const selectedIndex = dayItems.findIndex(item => item.isSelected);
    
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
  }, [dayItems]);

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      triggerMediumHaptic();
      await onRefresh();
    }
  }, [onRefresh]);

  return (
    <ThemedView className="mb-4">
      <FlashList
        ref={flashListRef}
        data={dayItems}
        renderItem={renderDayItem}
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
              onRefresh={handleRefresh}
              tintColor={"var(--primary-500)"}
              colors={["var(--primary-500)"]}
            />
          ) : undefined
        }
        keyExtractor={(item) => item.dateId}
        getItemType={() => 'day-item'} // Single item type for better performance
      />
    </ThemedView>
  );
}