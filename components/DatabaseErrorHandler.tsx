import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Alert, ActivityIndicator, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
  interpolateColor as rInterpolateColor,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OptimizedIcon } from './ui/OptimizedIcon';
import ThemedText from './ui/ThemedText';
import ThemedView from './ui/ThemedView';

// Animation configurations
const SPRING_CONFIG = { damping: 15, stiffness: 200 };
const BUTTON_SCALE = { pressed: 0.96, default: 1 };

interface DatabaseErrorHandlerProps {
  error: Error | null;
  onResolve: () => void;
  onReset: () => Promise<void>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function DatabaseErrorHandler({ error, onResolve, onReset }: DatabaseErrorHandlerProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  // Animation values
  const buttonScale = useSharedValue(1);
  const errorBoxScale = useSharedValue(0);
  const infoBoxScale = useSharedValue(0);

  // Mount animations
  React.useEffect(() => {
    // Stagger the entrance animations using sequence
    errorBoxScale.value = withSequence(
      withTiming(0, { duration: 100 }),
      withSpring(1, SPRING_CONFIG)
    );
    infoBoxScale.value = withSequence(
      withTiming(0, { duration: 200 }),
      withSpring(1, SPRING_CONFIG)
    );
  }, []);

  const handleResetDatabase = async () => {
    try {
      // Heavy haptic feedback for critical action
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      setIsProcessing(true);
      await onReset();
      setIsProcessing(false);

      // Success haptic feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        'Database Reset',
        'Database has been reset successfully. The app will now reload.',
        [{ text: 'OK', onPress: onResolve }]
      );
    } catch (err) {
      console.error('Reset failed:', err);
      setIsProcessing(false);

      // Error haptic feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      Alert.alert('Reset Failed', 'Failed to reset the database. Please try again.');
    }
  };

  // Animated styles
  const buttonAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = rInterpolateColor(
      buttonScale.value,
      [BUTTON_SCALE.pressed, BUTTON_SCALE.default],
      ['#b91c1c', '#dc2626'] // Darker red when pressed
    );

    return {
      transform: [{ scale: buttonScale.value }],
      backgroundColor,
    };
  });

  const errorBoxAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: errorBoxScale.value }],
    opacity: errorBoxScale.value,
  }));

  const infoBoxAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: infoBoxScale.value }],
    opacity: infoBoxScale.value,
  }));

  // Helper functions for JS thread calls
  const mediumHaptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  const resetDatabase = () => handleResetDatabase();

  // Gesture handlers
  const buttonGesture = Gesture.Tap()
    .enabled(!isProcessing)
    .onBegin(() => {
      buttonScale.value = withTiming(BUTTON_SCALE.pressed, { duration: 100 });
      runOnJS(mediumHaptic)();
    })
    .onFinalize(() => {
      buttonScale.value = withSpring(BUTTON_SCALE.default, SPRING_CONFIG);
      if (!isProcessing) {
        runOnJS(resetDatabase)();
      }
    });

  const errorMessage = error?.message || 'Unknown database error occurred.';
  const isMigrationError =
    errorMessage.includes('Missing migration') || errorMessage.includes('schema version');

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
      <ThemedView className="w-full max-w-lg flex-1 items-center justify-center self-center p-5">
        <ThemedText
          variant="heading"
          className="mb-5 text-center text-2xl font-bold text-neutral-900 dark:text-white">
          Database Error
        </ThemedText>

        {/* Error Box */}
        <Animated.View
          style={errorBoxAnimatedStyle}
          className="mb-5 w-full rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
          <ThemedView className="mb-2 flex-row items-center">
            <OptimizedIcon
              name="warning-outline"
              size={20}
              className="mr-2 text-yellow-600 dark:text-yellow-400"
            />
            <ThemedText className="text-base font-semibold text-yellow-700 dark:text-yellow-300">
              Error Details:
            </ThemedText>
          </ThemedView>
          <ThemedText className="text-sm leading-5 text-yellow-700 dark:text-yellow-200">
            {errorMessage}
          </ThemedText>
        </Animated.View>

        {isMigrationError && (
          <>
            {/* Info Box */}
            <Animated.View
              style={infoBoxAnimatedStyle}
              className="mb-5 w-full rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
              <ThemedView className="mb-2 flex-row items-center">
                <OptimizedIcon
                  name="help-circle"
                  size={20}
                  className="mr-2 text-blue-600 dark:text-blue-400"
                />
                <ThemedText className="text-base font-semibold text-blue-700 dark:text-blue-300">
                  Schema Version Mismatch
                </ThemedText>
              </ThemedView>
              <ThemedText className="text-sm leading-5 text-blue-700 dark:text-blue-200">
                Your app's database schema version doesn't match the available migrations. This
                typically happens after updating the app with schema changes.
              </ThemedText>
            </Animated.View>

            {/* Actions Box */}
            <ThemedView className="w-full rounded-lg border border-neutral-200 bg-neutral-100 p-4 dark:border-neutral-700 dark:bg-neutral-800">
              <ThemedView className="mb-2 flex-row items-center">
                <OptimizedIcon
                  name="settings"
                  size={20}
                  className="mr-2 text-neutral-600 dark:text-neutral-400"
                />
                <ThemedText className="text-base font-semibold text-neutral-700 dark:text-neutral-300">
                  Suggested Action:
                </ThemedText>
              </ThemedView>
              <ThemedText className="mb-4 text-sm leading-5 text-neutral-600 dark:text-neutral-400">
                Reset the database to fix schema issues.{'\n'}
                Note: This will delete all local data.
              </ThemedText>

              {/* Reset Button */}
              <GestureDetector gesture={buttonGesture}>
                <AnimatedPressable
                  style={[
                    buttonAnimatedStyle,
                    {
                      paddingVertical: 12,
                      paddingHorizontal: 24,
                      borderRadius: 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Reset Database"
                  accessibilityHint="Deletes all local data to fix database issues"
                  accessibilityState={{ disabled: isProcessing }}>
                  <ThemedView className="flex-row items-center bg-transparent">
                    {isProcessing ? (
                      <>
                        <ActivityIndicator color="#ffffff" size="small" className="mr-2" />
                        <ThemedText className="text-base font-bold text-white">
                          Resetting...
                        </ThemedText>
                      </>
                    ) : (
                      <>
                        <OptimizedIcon
                          name="camera-flip-outline"
                          size={18}
                          className="mr-2 text-white"
                        />
                        <ThemedText className="text-base font-bold text-white">
                          Reset Database
                        </ThemedText>
                      </>
                    )}
                  </ThemedView>
                </AnimatedPressable>
              </GestureDetector>
            </ThemedView>
          </>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}
