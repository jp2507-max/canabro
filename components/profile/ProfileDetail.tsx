import * as Haptics from 'expo-haptics';
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  interpolateColor,
  runOnJS,
} from 'react-native-reanimated';

import { OptimizedIcon, IconName } from '../ui/OptimizedIcon';
import ThemedText from '../ui/ThemedText';

/**
 * Displays a labeled profile detail with optional icon and value(s).
 * Enhanced with sophisticated animations, gesture handling, and improved accessibility.
 */
export interface ProfileDetailProps {
  label: string;
  value?: string | string[] | null;
  icon?: IconName;
  onPress?: () => void;
  index?: number;
}

const ProfileDetail: React.FC<ProfileDetailProps> = React.memo(function ProfileDetail({
  label,
  value,
  icon,
  onPress,
  index = 0,
}) {
  const displayValue = value || 'Not specified';
  const hasValue = value && (Array.isArray(value) ? value.length > 0 : true);

  const scale = useSharedValue(1);
  const shadowOpacity = useSharedValue(0.05);
  const elevation = useSharedValue(1);
  const pressProgress = useSharedValue(0);

  // Press gesture with sophisticated feedback
  const pressGesture = useMemo(
    () =>
      Gesture.Tap()
        .onBegin(() => {
          pressProgress.value = withSpring(1, { damping: 15, stiffness: 400 });
          scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
          shadowOpacity.value = withSpring(0.1);
          elevation.value = withSpring(3);
        })
        .onFinalize(() => {
          pressProgress.value = withSpring(0, { damping: 15, stiffness: 400 });
          scale.value = withSpring(1, { damping: 15, stiffness: 400 });
          shadowOpacity.value = withSpring(0.05);
          elevation.value = withSpring(1);
        })
        .onEnd(() => {
          if (onPress) {
            runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
            runOnJS(onPress)();
          }
        }),
    [onPress]
  );

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      pressProgress.value,
      [0, 1],
      ['rgba(0,0,0,0)', 'rgba(34, 197, 94, 0.05)'] // primary-500 with opacity
    );

    return {
      transform: [{ scale: scale.value }],
      shadowOpacity: shadowOpacity.value,
      elevation: elevation.value,
      backgroundColor,
    };
  });

  const DetailContent = (
    <Animated.View
      entering={FadeIn.delay(index * 150).duration(700)}
      style={animatedStyle}
      className="mb-4 rounded-2xl bg-white p-4 shadow-sm shadow-neutral-200 dark:bg-neutral-800 dark:shadow-neutral-900">
      <View className="mb-3 flex-row items-center">
        {icon && (
          <OptimizedIcon
            name={icon}
            size={20}
            color="rgb(34 197 94)" // primary-500
            style={{ marginRight: 8 }}
          />
        )}
        <ThemedText
          variant="caption"
          className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {label}
        </ThemedText>
      </View>

      {Array.isArray(displayValue) ? (
        <View className="-mb-1 -mr-1 flex-row flex-wrap">
          {hasValue ? (
            displayValue.map((item, itemIndex) => (
              <Animated.View
                key={itemIndex}
                entering={FadeIn.delay(index * 150 + itemIndex * 100).duration(500)}
                className="mb-2 mr-2 rounded-full bg-primary-100 px-3 py-1.5 dark:bg-primary-900/30">
                <ThemedText
                  variant="caption"
                  className="text-xs font-medium text-primary-700 dark:text-primary-300">
                  {item || ''}
                </ThemedText>
              </Animated.View>
            ))
          ) : (
            <ThemedText
              variant="muted"
              className="text-sm italic text-neutral-500 dark:text-neutral-500">
              None specified
            </ThemedText>
          )}
        </View>
      ) : (
        <ThemedText
          variant={hasValue ? 'default' : 'muted'}
          className={`text-base ${!hasValue ? 'italic' : 'font-medium'} ${
            hasValue
              ? 'text-neutral-900 dark:text-neutral-100'
              : 'text-neutral-500 dark:text-neutral-500'
          }`}
          accessibilityRole="text"
          accessibilityLabel={`${label}: ${displayValue}`}>
          {displayValue}
        </ThemedText>
      )}
    </Animated.View>
  );

  // Wrap with gesture detector only if onPress is provided
  if (onPress) {
    return <GestureDetector gesture={pressGesture}>{DetailContent}</GestureDetector>;
  }

  return DetailContent;
});

export default ProfileDetail;
