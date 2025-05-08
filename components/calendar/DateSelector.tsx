import React, { useMemo } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { format, addDays, isToday } from 'date-fns';
import { useTheme } from '../../lib/contexts/ThemeContext';
import ThemedText from '../ui/ThemedText';

export interface DateSelectorProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

function DateSelector({ selectedDate, onDateSelect }: DateSelectorProps) {
  const { theme, isDarkMode } = useTheme();
  const dates = useMemo(() => {
    const result = [];
    const today = new Date();
    for (let i = -3; i <= 3; i++) {
      result.push(addDays(today, i));
    }
    return result;
  }, []);

  return (
    <View style={{ marginBottom: 16, flexDirection: 'row' }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}>
        {dates.map((date, index) => {
          const dateString = format(date, 'yyyy-MM-dd');
          const selectedDateString = format(selectedDate, 'yyyy-MM-dd');
          const isSelected = dateString === selectedDateString;
          const isCurrentDateToday = isToday(date);
          const bgColor = isSelected
            ? theme.colors.primary[600]
            : isCurrentDateToday
            ? isDarkMode
              ? theme.colors.primary[900]
              : theme.colors.primary[100]
            : isDarkMode
            ? theme.colors.neutral[800]
            : theme.colors.neutral[100];
          const dayTextColor = isSelected
            ? theme.colors.neutral[50]
            : isDarkMode
            ? theme.colors.neutral[400]
            : theme.colors.neutral[500];
          const dateTextColor = isSelected
            ? theme.colors.neutral[50]
            : isCurrentDateToday
            ? isDarkMode
              ? theme.colors.primary[500]
              : theme.colors.primary[700]
            : isDarkMode
            ? theme.colors.neutral[300]
            : theme.colors.neutral[800];
          return (
            <TouchableOpacity
              key={index}
              onPress={() => onDateSelect(date)}
              style={{
                marginHorizontal: 8,
                height: 64,
                width: 64,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 32,
                backgroundColor: bgColor,
              }}
              accessibilityRole="button"
              accessibilityLabel={`Select date ${format(date, 'PPP')}`}
              accessibilityState={{ selected: isSelected }}
            >
              <ThemedText style={{ fontSize: 12, color: dayTextColor }}>
                {`${format(date, 'E')}`}
              </ThemedText>
              <ThemedText style={{ fontSize: 18, fontWeight: 'bold', color: dateTextColor }}>
                {format(date, 'd')}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default React.memo(DateSelector);
