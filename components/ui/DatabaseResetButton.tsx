import { BlurView } from 'expo-blur';
import {
  triggerHeavyHaptic,
  triggerHeavyHapticSync,
  triggerMediumHapticSync,
  triggerLightHapticSync,
  triggerSuccessHaptic,
  triggerErrorHaptic,
} from '@/lib/utils/haptics';
import React, { useState } from 'react';
import { Text, Alert, ActivityIndicator, Modal, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  runOnJS,
  interpolateColor as rInterpolateColor,
} from 'react-native-reanimated';

import { OptimizedIcon } from './OptimizedIcon';
import { resetDatabase } from '../../lib/database/database';

// Animation configurations
const SPRING_CONFIG = { damping: 15, stiffness: 200 };
const SCALE_VALUES = { pressed: 0.95, default: 1 };
const DANGER_COLORS = {
  light: { default: '#dc2626', pressed: '#b91c1c' }, // red-600 to red-700
  dark: { default: '#ef4444', pressed: '#dc2626' }, // red-500 to red-600
};

const AnimatedPressable = Animated.createAnimatedComponent(View);

/**
 * A button component that allows manually triggering a database reset
 * Use this only during development when you need to recover from database migration issues.
 */
const DatabaseResetButton = () => {
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Animation values
  const scale = useSharedValue(1);
  const shadowOpacity = useSharedValue(0.3);
  const pulseScale = useSharedValue(1);
  const buttonProgress = useSharedValue(0);
  const modalScale = useSharedValue(0);

  // Loading pulse animation
  React.useEffect(() => {
    if (isResetting) {
      pulseScale.value = withRepeat(
        withSequence(withTiming(1.05, { duration: 600 }), withTiming(1, { duration: 600 })),
        -1,
        true
      );
    } else {
      pulseScale.value = withSpring(1, SPRING_CONFIG);
    }
  }, [isResetting]);

  // Modal entrance animation
  React.useEffect(() => {
    if (showConfirmModal) {
      modalScale.value = withSpring(1, SPRING_CONFIG);
    } else {
      modalScale.value = withTiming(0, { duration: 200 });
    }
  }, [showConfirmModal]);

  const handleReset = async () => {
    setShowConfirmModal(false);
    setIsResetting(true);

    // Critical action haptic feedback
    await triggerHeavyHaptic();

    try {
      await resetDatabase();

      // Success haptic
      await triggerSuccessHaptic();

      Alert.alert(
        'Reset Complete',
        'Database has been reset. Please restart the app for changes to take effect.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to reset database:', error);

      // Error haptic
      await triggerErrorHaptic();

      Alert.alert(
        'Error',
        'Failed to reset database: ' + (error instanceof Error ? error.message : String(error))
      );
    } finally {
      setIsResetting(false);
    }
  };

  const showConfirmation = () => {
    // Warning haptic for opening destructive action modal
    triggerMediumHapticSync();
    setShowConfirmModal(true);
  };

  // Animated styles
  const buttonAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    const backgroundColor = rInterpolateColor(
      buttonProgress.value,
      [0, 1],
      [DANGER_COLORS.light.default, DANGER_COLORS.light.pressed]
    );

    return {
      transform: [{ scale: scale.value * pulseScale.value }],
      backgroundColor,
      shadowOpacity: shadowOpacity.value,
    };
  });

  const modalAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: modalScale.value }],
      opacity: modalScale.value,
    };
  });

  // Haptic feedback functions for runOnJS
  const mediumHaptic = () => triggerMediumHapticSync();
  const lightHaptic = () => triggerLightHapticSync();

  // Gesture handlers
  const buttonGesture = Gesture.Tap()
    .enabled(!isResetting)
    .onBegin(() => {
      'worklet';
      scale.value = withTiming(SCALE_VALUES.pressed, { duration: 100 });
      shadowOpacity.value = withTiming(0.1, { duration: 100 });
      buttonProgress.value = withTiming(1, { duration: 100 });
      runOnJS(mediumHaptic)();
    })
    .onFinalize(() => {
      'worklet';
      scale.value = withSpring(SCALE_VALUES.default, SPRING_CONFIG);
      shadowOpacity.value = withSpring(0.3, SPRING_CONFIG);
      buttonProgress.value = withSpring(0, SPRING_CONFIG);
      if (!isResetting) {
        runOnJS(showConfirmation)();
      }
    });

  const confirmGesture = Gesture.Tap()
    .onFinalize(() => {
      'worklet';
      runOnJS(handleReset)();
    });

  const cancelGesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      runOnJS(lightHaptic)();
    })
    .onFinalize(() => {
      'worklet';
      runOnJS(() => setShowConfirmModal(false))();
    });

  return (
    <>
      <GestureDetector gesture={buttonGesture}>
        <AnimatedPressable
          style={[
            buttonAnimatedStyle,
            {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 4,
              elevation: 3,
            },
          ]}
          className="items-center justify-center rounded-lg px-4 py-3">
          <View className="flex-row items-center justify-center">
            {isResetting ? (
              <>
                <ActivityIndicator color="#fff" size="small" className="mr-2" />
                <Text className="text-base font-bold text-white">Resetting...</Text>
              </>
            ) : (
              <>
                <OptimizedIcon name="camera-flip-outline" size={18} className="mr-2 text-white" />
                <Text className="text-base font-bold text-white">Reset Database</Text>
              </>
            )}
          </View>
        </AnimatedPressable>
      </GestureDetector>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}>
        <BlurView intensity={50} className="flex-1 items-center justify-center p-6">
          <Animated.View
            style={modalAnimatedStyle}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-800">
            {/* Warning Icon */}
            <View className="mb-4 items-center">
              <View className="mb-3 rounded-full bg-red-100 p-3 dark:bg-red-900/30">
                <OptimizedIcon
                  name="warning-outline"
                  size={32}
                  className="text-red-600 dark:text-red-400"
                />
              </View>
              <Text className="text-center text-xl font-bold text-neutral-900 dark:text-white">
                Reset Database?
              </Text>
            </View>

            {/* Warning Message */}
            <Text className="mb-6 text-center leading-6 text-neutral-600 dark:text-neutral-400">
              This will permanently delete all local data and create a fresh database. This action
              cannot be undone.
            </Text>

            {/* Action Buttons */}
            <View className="space-y-3">
              {/* Confirm Button */}
              <GestureDetector gesture={confirmGesture}>
                <View className="rounded-xl bg-red-600 px-4 py-3 dark:bg-red-500">
                  <Text className="text-center text-base font-semibold text-white">
                    Yes, Reset Database
                  </Text>
                </View>
              </GestureDetector>

              {/* Cancel Button */}
              <GestureDetector gesture={cancelGesture}>
                <View className="rounded-xl bg-neutral-100 px-4 py-3 dark:bg-neutral-700">
                  <Text className="text-center text-base font-medium text-neutral-700 dark:text-neutral-300">
                    Cancel
                  </Text>
                </View>
              </GestureDetector>
            </View>
          </Animated.View>
        </BlurView>
      </Modal>
    </>
  );
};

export default DatabaseResetButton;
