import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Gesture, GestureDetector, State } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
  runOnUI,
} from 'react-native-reanimated';

import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';

interface JournalCalendarProps {
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  plantAge?: number; // Days since germination/planting
}

// Date item component with animations
const AnimatedDateItem = ({
  date,
  isSelected,
  onPress,
  index,
}: {
  date: Date;
  isSelected: boolean;
  onPress: (date: Date) => void;
  index: number;
}) => {
  const scale = useSharedValue(1);
  const backgroundColor = useSharedValue(isSelected ? 1 : 0);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const bgColor = interpolateColor(
      backgroundColor.value,
      [0, 1],
      ['transparent', 'rgb(34 197 94)'] // transparent to green-500
    );

    return {
      transform: [{ scale: scale.value }],
      backgroundColor: bgColor,
    };
  });

  const textAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    const textColor = interpolateColor(
      backgroundColor.value,
      [0, 1],
      ['rgb(115 115 115)', 'rgb(255 255 255)'] // neutral-500 to white
    );

    return { color: textColor };
  });

  const gesture = Gesture.Tap()
    .onBegin(() => {
      runOnUI(() => {
        scale.value = withSpring(0.9, { damping: 15 });
      })();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    })
    .onFinalize((event) => {
      runOnUI(() => {
        scale.value = withSpring(1, { damping: 15 });
        if (!isSelected) {
          backgroundColor.value = withSpring(1, { damping: 15 });
        }
      })();
      if (event.state === State.END) {
        onPress(date);
      }
    });

  // Update background animation when selection changes
  React.useEffect(() => {
    backgroundColor.value = withSpring(isSelected ? 1 : 0, { damping: 15 });
  }, [isSelected, backgroundColor]);

  const dayName = date.toLocaleDateString('en', { weekday: 'short' }).charAt(0);
  const dayNumber = date.getDate();

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(400)}>
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[animatedStyle]}
          className="mx-1 min-w-[50px] items-center rounded-xl p-3">
          <Animated.Text style={[textAnimatedStyle]} className="text-xs font-medium">
            {dayName}
          </Animated.Text>
          <Animated.Text style={[textAnimatedStyle]} className="mt-1 text-lg font-bold">
            {dayNumber}
          </Animated.Text>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
};

/**
 * Modern horizontal calendar view for the plant journal screen with animations and gesture handling.
 */
// Constants for layout calculations
const DATE_ITEM_WIDTH = 58; // min-width (50) + margins (8)

export default function JournalCalendar({
  selectedDate = new Date(),
  onDateSelect,
  plantAge = 32,
}: JournalCalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    // Start from the beginning of the week containing selectedDate
    const start = new Date(selectedDate);
    start.setDate(selectedDate.getDate() - selectedDate.getDay());
    return start;
  });

  // Keep week in sync with externally-controlled selectedDate
  React.useEffect(() => {
    const start = new Date(selectedDate);
    start.setDate(selectedDate.getDate() - selectedDate.getDay());
    setCurrentWeekStart(start);
  }, [selectedDate]);

  // Generate dates for the current week
  const weekDates = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [currentWeekStart]);

  const handleDatePress = useCallback(
    (date: Date) => {
      onDateSelect?.(date);
      Haptics.selectionAsync();
    },
    [onDateSelect]
  );

  const navigateWeek = useCallback(
    (direction: 'prev' | 'next') => {
      const newStart = new Date(currentWeekStart);
      newStart.setDate(currentWeekStart.getDate() + (direction === 'next' ? 7 : -7));
      setCurrentWeekStart(newStart);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [currentWeekStart]
  );

  // Calculate week number from germination
  const weekNumber = Math.ceil((plantAge + 1) / 7);

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900">
      <ThemedView className="px-4 py-3">
        {/* Week Navigation and Info */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          className="mb-4 flex-row items-center justify-between">
          <View className="flex-1">
            <ThemedText variant="muted" className="text-xs">
              Week {weekNumber} • Day {plantAge}
            </ThemedText>
            <ThemedText className="text-sm font-medium">
              {currentWeekStart.toLocaleDateString('en', {
                month: 'short',
                day: 'numeric',
              })}{' '}
              -{' '}
              {new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString(
                'en',
                {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }
              )}
            </ThemedText>
          </View>

          {/* Navigation Arrows */}
          <View className="flex-row space-x-2">
            <NavigationButton direction="prev" onPress={() => navigateWeek('prev')} />
            <NavigationButton direction="next" onPress={() => navigateWeek('next')} />
          </View>
        </Animated.View>

        {/* Date Scroll View */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 8 }}
          snapToInterval={DATE_ITEM_WIDTH}
          decelerationRate="fast">
          {weekDates.map((date, index) => {
            const isSelected = date.toDateString() === selectedDate.toDateString();
            return (
              <AnimatedDateItem
                key={date.toISOString()}
                date={date}
                isSelected={isSelected}
                onPress={handleDatePress}
                index={index}
              />
            );
          })}
        </ScrollView>
      </ThemedView>
    </Animated.View>
  );
}

// Navigation button component
const NavigationButton = ({
  direction,
  onPress,
}: {
  direction: 'prev' | 'next';
  onPress: () => void;
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.7);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const gesture = Gesture.Tap()
    .onBegin(() => {
      runOnUI(() => {
        scale.value = withSpring(0.9, { damping: 15 });
        opacity.value = withSpring(1, { damping: 15 });
      })();
    })
    .onFinalize((event) => {
      runOnUI(() => {
        scale.value = withSpring(1, { damping: 15 });
        opacity.value = withSpring(0.7, { damping: 15 });
      })();
      if (event.state === State.END) {
        onPress();
      }
    });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[animatedStyle]}
        className="h-8 w-8 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700">
        <ThemedText className="text-sm font-bold">{direction === 'prev' ? '‹' : '›'}</ThemedText>
      </Animated.View>
    </GestureDetector>
  );
};
