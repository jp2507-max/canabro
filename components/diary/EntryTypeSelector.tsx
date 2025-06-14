import * as Haptics from '@/lib/utils/haptics';
import React from 'react';
import { FlatList } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor as rInterpolateColor,
} from 'react-native-reanimated';

import { OptimizedIcon, IconName } from '../ui/OptimizedIcon';
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';

const AnimatedPressable = Animated.createAnimatedComponent(Animated.View);

// Utility function to convert hex to rgba with proper alpha handling for cross-platform compatibility
const hexToRgba = (hex: string, alpha: number): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(0, 0, 0, ${alpha})`;

  const r = parseInt(result[1]!, 16);
  const g = parseInt(result[2]!, 16);
  const b = parseInt(result[3]!, 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Define the entry types based on user requirements
export type DiaryEntryType =
  | 'note'
  | 'watering'
  | 'feeding'
  | 'defoliating'
  | 'training'
  | 'flushing'
  | 'pest_control'
  | 'environment'
  | 'photo'
  | 'harvest';

interface EntryTypeOption {
  type: DiaryEntryType;
  label: string;
  icon: IconName;
  color: string;
  description?: string;
}

// Map entry types to labels, icons and colors
const entryTypeOptions: EntryTypeOption[] = [
  {
    type: 'note',
    label: 'Note',
    icon: 'note-text-outline',
    color: '#6b7280',
    description: 'General observations and notes',
  },
  {
    type: 'watering',
    label: 'Watering',
    icon: 'water-outline',
    color: '#3b82f6',
    description: 'Water your plants',
  },
  {
    type: 'feeding',
    label: 'Feeding',
    icon: 'flask-outline',
    color: '#8b5cf6',
    description: 'Nutrient feeding session',
  },
  {
    type: 'defoliating',
    label: 'Defoliating',
    icon: 'content-cut',
    color: '#f59e0b',
    description: 'Remove leaves and trim',
  },
  {
    type: 'training',
    label: 'Training',
    icon: 'vector-polyline',
    color: '#10b981',
    description: 'LST, topping, and shaping',
  },
  {
    type: 'flushing',
    label: 'Flushing',
    icon: 'waves',
    color: '#06b6d4',
    description: 'Pre-harvest water flush',
  },
  {
    type: 'pest_control',
    label: 'Pest Control',
    icon: 'spider-thread',
    color: '#dc2626',
    description: 'Bug and pest management',
  },
  {
    type: 'environment',
    label: 'Environment',
    icon: 'thermometer-lines',
    color: '#059669',
    description: 'Temperature and humidity',
  },
  {
    type: 'photo',
    label: 'Photo',
    icon: 'camera-outline',
    color: '#7c3aed',
    description: 'Progress photos',
  },
  {
    type: 'harvest',
    label: 'Harvest',
    icon: 'scissors-cutting',
    color: '#ea580c',
    description: 'Final harvest time',
  },
];

interface EntryTypeSelectorProps {
  onSelectType: (type: DiaryEntryType) => void;
}

// Individual option component with animations
function EntryOption({
  item,
  onSelect,
  index,
}: {
  item: EntryTypeOption;
  onSelect: (type: DiaryEntryType) => void;
  index: number;
}) {
  const scale = useSharedValue(1);
  const backgroundColor = useSharedValue(0);
  const shadowOpacity = useSharedValue(0.1);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const bgColor = rInterpolateColor(
      backgroundColor.value,
      [0, 1],
      ['rgba(255, 255, 255, 0)', hexToRgba(item.color, 0.06)]
    );

    return {
      transform: [{ scale: scale.value }],
      backgroundColor: bgColor,
      shadowOpacity: shadowOpacity.value,
    };
  });

  const gesture = Gesture.Tap()
    .onStart(() => {
      scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
      backgroundColor.value = withSpring(1, { damping: 15, stiffness: 300 });
      shadowOpacity.value = withSpring(0.15, { damping: 15, stiffness: 300 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    })
    .onEnd(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      backgroundColor.value = withSpring(0, { damping: 15, stiffness: 300 });
      shadowOpacity.value = withSpring(0.1, { damping: 15, stiffness: 300 });
      onSelect(item.type);
    });

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(600)} className="mb-3">
      <GestureDetector gesture={gesture}>
        <AnimatedPressable
          style={[animatedStyle]}
          className="flex-row items-center rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800"
          accessibilityRole="button"
          accessibilityLabel={`Select ${item.label} entry type`}
          accessibilityHint={item.description}>
          {/* Icon Container */}
          <Animated.View
            className="mr-4 rounded-xl p-3"
            style={{ backgroundColor: hexToRgba(item.color, 0.08) }}>
            <OptimizedIcon name={item.icon} size={24} color={item.color} />
          </Animated.View>

          {/* Content */}
          <Animated.View className="flex-1">
            <ThemedText className="mb-1 text-lg font-bold">{item.label}</ThemedText>
            {item.description && (
              <ThemedText variant="muted" className="text-sm leading-relaxed">
                {item.description}
              </ThemedText>
            )}
          </Animated.View>

          {/* Arrow indicator */}
          <OptimizedIcon name="chevron-forward-outline" size={20} color="#9ca3af" />
        </AnimatedPressable>
      </GestureDetector>
    </Animated.View>
  );
}

function EntryTypeSelector({ onSelectType }: EntryTypeSelectorProps) {
  // 🎯 Performance optimized callbacks
  const keyExtractor = React.useCallback((item: EntryTypeOption) => item.type, []);
  
  const renderItem = React.useCallback(
    ({ item, index }: { item: EntryTypeOption; index: number }) => (
      <EntryOption item={item} onSelect={onSelectType} index={index} />
    ),
    [onSelectType]
  );

  return (
    <ThemedView className="flex-1 p-4">
      <Animated.View entering={FadeInDown.duration(600)} className="mb-6">
        <ThemedText className="mb-2 text-2xl font-extrabold">Select Entry Type</ThemedText>
        <ThemedText variant="muted" className="text-base leading-relaxed">
          Choose the type of activity you want to record in your grow journal
        </ThemedText>
      </Animated.View>

      <FlatList
        data={entryTypeOptions}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        // ⚡ Reanimated v3 compatible performance optimizations
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={10}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={true}
      />
    </ThemedView>
  );
}

export default React.memo(EntryTypeSelector);
