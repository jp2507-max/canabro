import React, { useState } from 'react';
import { View, Text, Alert, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

import { OptimizedIcon } from './OptimizedIcon';
import { resetDatabase } from '../../lib/database/database';
import {
  triggerHeavyHaptic,
  triggerLightHapticSync,
  triggerSuccessHaptic,
  triggerErrorHaptic,
} from '@/lib/utils/haptics';

// Animation configurations
const SPRING_CONFIG = { damping: 15, stiffness: 200 };
const SCALE_VALUES = { pressed: 0.97, default: 1 };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface StepItemProps {
  number: number;
  title: string;
  description: string;
  index: number;
}

function StepItem({ number, title, description, index }: StepItemProps) {
  const stepScale = useSharedValue(0.9);
  const stepOpacity = useSharedValue(0);

  React.useEffect(() => {
    const delay = index * 200;
    const id = setTimeout(() => {
      stepScale.value = withSpring(1, SPRING_CONFIG);
      stepOpacity.value = withTiming(1, { duration: 300 });
    }, delay);

    return () => clearTimeout(id);
  }, []);

  const stepAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: stepScale.value }],
      opacity: stepOpacity.value,
    };
  });

  return (
    <Animated.View style={stepAnimatedStyle} className="mb-4 flex-row">
      <View className="mr-3 mt-1 h-8 w-8 items-center justify-center rounded-full bg-blue-600 dark:bg-blue-500">
        <Text className="text-sm font-bold text-white">{number}</Text>
      </View>
      <View className="flex-1">
        <Text className="mb-1 text-base font-semibold text-neutral-900 dark:text-white">
          {title}
        </Text>
        <Text className="text-sm leading-5 text-neutral-600 dark:text-neutral-400">
          {description}
        </Text>
      </View>
    </Animated.View>
  );
}

/**
 * DatabaseResetHelper component - renders a helper with guidance and reset functionality.
 * This can help recover from migration issues that can't be solved with regular migration logic.
 *
 * CAUTION: This will delete all local data. Use only when necessary!
 */
const DatabaseResetHelper = () => {
  const [showGuidance, setShowGuidance] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Animation values
  const resetButtonScale = useSharedValue(1);
  const guidanceButtonScale = useSharedValue(1);
  const guidanceHeight = useSharedValue(0);
  const guidanceRotation = useSharedValue(0);

  // Update guidance animations
  React.useEffect(() => {
    guidanceHeight.value = withSpring(showGuidance ? 1 : 0, SPRING_CONFIG);
    guidanceRotation.value = withSpring(showGuidance ? 180 : 0, SPRING_CONFIG);
  }, [showGuidance]);

  const handleReset = async () => {
    // Critical action haptic
    await triggerHeavyHaptic();

    setIsResetting(true);

    try {
      const result = await resetDatabase();

      // Success haptic
      await triggerSuccessHaptic();

      if (result) {
        Alert.alert(
          'Reset Successful',
          'Database reset successfully. The app will now reload. Your local data has been deleted.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Reset Not Needed', "Database reset not needed or couldn't be completed.", [
          { text: 'OK' },
        ]);
      }
    } catch (error) {
      console.error('Error resetting database:', error);

      // Error haptic
      await triggerErrorHaptic();

      Alert.alert(
        'Reset Failed',
        `Error resetting database: ${error instanceof Error ? error.message : String(error)}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsResetting(false);
    }
  };

  const toggleGuidance = () => {
    triggerLightHapticSync();
    setShowGuidance(!showGuidance);
  };

  // Animated styles
  const resetButtonAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: resetButtonScale.value }],
    };
  });

  const guidanceButtonAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: guidanceButtonScale.value }],
    };
  });

  const guidanceContentAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      maxHeight: guidanceHeight.value * 400,
      opacity: guidanceHeight.value,
    };
  });

  const iconAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ rotate: `${guidanceRotation.value}deg` }],
    };
  });

  // Gesture handlers
  const resetGesture = Gesture.Tap()
    .enabled(!isResetting)
    .onBegin(() => {
      'worklet';
      resetButtonScale.value = withTiming(SCALE_VALUES.pressed, { duration: 100 });
    })
    .onFinalize(() => {
      'worklet';
      resetButtonScale.value = withSpring(SCALE_VALUES.default, SPRING_CONFIG);
      if (!isResetting) {
        runOnJS(handleReset)();
      }
    });

  const guidanceGesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      guidanceButtonScale.value = withTiming(SCALE_VALUES.pressed, { duration: 100 });
    })
    .onFinalize(() => {
      'worklet';
      guidanceButtonScale.value = withSpring(SCALE_VALUES.default, SPRING_CONFIG);
      runOnJS(toggleGuidance)();
    });

  const resetSteps = [
    {
      title: 'Close App Completely',
      description:
        "Swipe away the app from recent apps or force-quit it to ensure it's fully closed.",
    },
    {
      title: 'Uninstall App',
      description: 'Remove the app from your device or emulator completely.',
    },
    {
      title: 'Reinstall App',
      description: "Use 'npx expo run:android' or 'npx expo run:ios' to reinstall the app.",
    },
    {
      title: 'Fresh Start',
      description: 'The database will be recreated automatically on the next app launch.',
    },
  ];

  return (
    <View className="m-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
      {/* Warning Header */}
      <View className="mb-3 flex-row items-center">
        <OptimizedIcon
          name="warning-outline"
          size={24}
          className="mr-2 text-yellow-600 dark:text-yellow-400"
        />
        <Text className="text-lg font-bold text-yellow-800 dark:text-yellow-200">
          Database Troubleshooting
        </Text>
      </View>

      {/* Description */}
      <Text className="mb-4 text-sm leading-5 text-yellow-800 dark:text-yellow-200">
        If you're experiencing database errors about missing columns, use the reset button
        below.
        <Text className="font-semibold">
          {' '}
          WARNING: This will delete all local data that hasn't been synced!
        </Text>
      </Text>

      {/* Action Buttons */}
      <View className="mb-4 space-y-3">
        {/* Reset Button */}
        <GestureDetector gesture={resetGesture}>
          <AnimatedPressable
            style={resetButtonAnimatedStyle}
            className="flex-row items-center justify-center rounded-lg bg-red-600 px-4 py-3 dark:bg-red-500"
            accessibilityRole="button"
            accessibilityLabel="Reset local database"
            accessibilityHint="Permanently deletes all local data and recreates the database">
            <OptimizedIcon
              name={isResetting ? 'loading1' : 'camera-flip-outline'}
              size={18}
              className="mr-2 text-white"
            />
            <Text className="text-base font-semibold text-white">
              {isResetting ? 'Resetting...' : 'Reset Local Database'}
            </Text>
          </AnimatedPressable>
        </GestureDetector>

        {/* Guidance Toggle Button */}
        <GestureDetector gesture={guidanceGesture}>
          <AnimatedPressable
            style={guidanceButtonAnimatedStyle}
            className="flex-row items-center justify-center rounded-lg bg-blue-600 px-4 py-3 dark:bg-blue-500"
            accessibilityRole="button"
            accessibilityLabel={showGuidance ? 'Hide reset guidance' : 'Show reset guidance'}>
            <OptimizedIcon name="help-circle" size={18} className="mr-2 text-white" />
            <Text className="mr-2 text-base font-semibold text-white">
              {showGuidance ? 'Hide' : 'Show'} Reset Guidance
            </Text>
            <Animated.View style={iconAnimatedStyle}>
              <OptimizedIcon name="chevron-down" size={16} className="text-white" />
            </Animated.View>
          </AnimatedPressable>
        </GestureDetector>
      </View>

      {/* Expandable Guidance Section */}
      <Animated.View style={guidanceContentAnimatedStyle} className="overflow-hidden">
        <View className="rounded-lg border border-yellow-200 bg-white p-4 dark:border-yellow-700 dark:bg-neutral-800">
          <Text className="mb-4 text-base font-semibold text-neutral-900 dark:text-white">
            Manual Reset Steps:
          </Text>

          {resetSteps.map((step, index) => (
            <StepItem
              key={index}
              number={index + 1}
              title={step.title}
              description={step.description}
              index={index}
            />
          ))}
        </View>
      </Animated.View>

      {/* Footer Note */}
      <Text className="mt-3 text-center text-xs italic text-yellow-700 dark:text-yellow-300">
        After reset, close and restart the app completely for changes to take effect.
      </Text>
    </View>
  );
};

export default DatabaseResetHelper;
