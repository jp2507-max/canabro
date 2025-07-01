import dayjs from 'dayjs';
import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor as rInterpolateColor,
  runOnJS,
} from 'react-native-reanimated';

import { triggerLightHapticSync } from '../../lib/utils/haptics';
import { DiaryEntryType } from './EntryTypeSelector';
import { DiaryEntry } from '../../lib/types/diary';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import NetworkResilientImage from '../ui/NetworkResilientImage';
import ThemedText from '../ui/ThemedText';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface DiaryEntryItemProps {
  entry: DiaryEntry;
  onPress?: () => void;
}

// Helper to get icon and color for entry type
const getEntryTypeDetails = (type: DiaryEntryType) => {
  const details: { [key in DiaryEntryType]?: { icon: string; label: string; color: string } } = {
    note: { icon: 'note-text-outline', label: 'Note', color: '#6b7280' },
    watering: { icon: 'water-outline', label: 'Watering', color: '#3b82f6' },
    feeding: { icon: 'flask-outline', label: 'Feeding', color: '#8b5cf6' },
    defoliating: { icon: 'content-cut', label: 'Defoliating', color: '#f59e0b' },
    training: { icon: 'vector-polyline', label: 'Training', color: '#10b981' },
    flushing: { icon: 'waves', label: 'Flushing', color: '#06b6d4' },
    pest_control: { icon: 'spider-thread', label: 'Pest Control', color: '#dc2626' },
    environment: { icon: 'thermometer-lines', label: 'Environment', color: '#059669' },
    photo: { icon: 'camera-outline', label: 'Photo', color: '#7c3aed' },
    harvest: { icon: 'scissors-cutting', label: 'Harvest', color: '#ea580c' },
  };
  return details[type] || { icon: 'help-circle-outline', label: type, color: '#6b7280' };
};

// Helper to render metrics nicely
const renderMetrics = (metrics: Record<string, any> | undefined | null) => {
  if (!metrics || typeof metrics !== 'object' || Object.keys(metrics).length === 0) {
    return null;
  }

  let parsedMetrics = metrics;
  if (typeof metrics === 'string') {
    try {
      parsedMetrics = JSON.parse(metrics);
    } catch (error) {
      console.error('Failed to parse metrics JSON string:', metrics, error);
      return <ThemedText className="text-status-danger text-xs">Invalid metrics data</ThemedText>;
    }
  }

  if (typeof parsedMetrics !== 'object' || parsedMetrics === null) {
    return null;
  }

  return (
    <View className="mt-3 flex-row flex-wrap gap-2">
      {Object.entries(parsedMetrics).map(([key, value]) => (
        <View key={key} className="rounded-full bg-neutral-100 px-3 py-1.5 dark:bg-neutral-700">
          <ThemedText className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
            <ThemedText className="font-bold">{key.replace(/_/g, ' ')}:</ThemedText> {String(value)}
          </ThemedText>
        </View>
      ))}
    </View>
  );
};

export default function DiaryEntryItem({ entry, onPress }: DiaryEntryItemProps) {
  const { icon, label, color } = getEntryTypeDetails(entry.entry_type as DiaryEntryType);

  // Animation values
  const scale = useSharedValue(1);
  const shadowOpacity = useSharedValue(0.1);
  const elevation = useSharedValue(2);
  const backgroundColor = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const bgColor = rInterpolateColor(
      backgroundColor.value,
      [0, 1],
      ['transparent', 'rgba(16, 185, 129, 0.05)']
    );

    return {
      transform: [{ scale: scale.value }],
      backgroundColor: bgColor,
      shadowOpacity: shadowOpacity.value, // iOS shadow
      elevation: elevation.value, // Android shadow
    };
  });

  // Gesture handling
  const gesture = useMemo(
    () =>
      Gesture.Tap()
        .onStart(() => {
          if (onPress) {
            scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
            shadowOpacity.value = withSpring(0.2, { damping: 15, stiffness: 300 }); // iOS
            elevation.value = withSpring(8, { damping: 15, stiffness: 300 }); // Android
            backgroundColor.value = withSpring(1, { damping: 15, stiffness: 300 });
            runOnJS(triggerLightHapticSync)();
          }
        })
        .onEnd(() => {
          if (onPress) {
            scale.value = withSpring(1, { damping: 15, stiffness: 300 });
            shadowOpacity.value = withSpring(0.1, { damping: 15, stiffness: 300 }); // iOS
            elevation.value = withSpring(2, { damping: 15, stiffness: 300 }); // Android
            backgroundColor.value = withSpring(0, { damping: 15, stiffness: 300 });
            runOnJS(onPress)();
          }
        }),
    [onPress]
  );

  // Format date with proper validation
  let formattedDate = 'Invalid Date';
  try {
    if (!entry.entry_date) {
      console.warn('[DiaryEntryItem] Missing entry_date for entry:', entry.id);
      formattedDate = 'No Date';
    } else {
      const parsedDate = dayjs(entry.entry_date);
      if (!parsedDate.isValid()) {
        console.warn('[DiaryEntryItem] Invalid entry_date for entry:', entry.id, entry.entry_date);
        formattedDate = 'Invalid Date';
      } else {
        formattedDate = parsedDate.format('MMM D, YYYY');
      }
    }
  } catch (error) {
    console.error('[DiaryEntryItem] Error formatting date:', entry.entry_date, error);
    formattedDate = 'Invalid Date';
  }

  return (
    <Animated.View entering={FadeIn.duration(600)}>
      <GestureDetector gesture={gesture}>
        <AnimatedPressable
          style={[animatedStyle]}
          className="mb-4 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-800"
          accessibilityRole={onPress ? 'button' : undefined}
          accessibilityLabel={`${label} entry from ${formattedDate}`}>
          {/* Image Header (if image exists) */}
          {entry.image_url && (
            <NetworkResilientImage
              url={entry.image_url}
              height={180}
              contentFit="cover"
              accessibilityLabel={`Image for diary entry on ${formattedDate}`}
              maxRetries={3}
              retryDelayMs={800}
              timeoutMs={6000}
              enableRetry={true}
              showProgress={true}
              fallbackIconName="image-outline"
              fallbackIconSize={48}
            />
          )}

          {/* Content Area */}
          <View className="p-4">
            <View className="mb-3 flex-row items-center justify-between">
              {/* Type Icon and Label */}
              <View className="flex-row items-center">
                <View className="mr-3 rounded-xl p-2" style={{ backgroundColor: `${color}15` }}>
                  <OptimizedIcon name={icon as any} size={18} color={color} />
                </View>
                <ThemedText className="text-base font-bold">{label}</ThemedText>
              </View>

              {/* Date */}
              <ThemedText variant="muted" className="text-sm font-medium">
                {formattedDate}
              </ThemedText>
            </View>

            {/* Content/Notes */}
            {entry.content && entry.content.trim() && (
              <ThemedText className="mb-3 text-base leading-relaxed">{entry.content}</ThemedText>
            )}

            {/* Metrics */}
            {renderMetrics(entry.metrics)}
          </View>
        </AnimatedPressable>
      </GestureDetector>
    </Animated.View>
  );
}
