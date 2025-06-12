import React, { useCallback, useEffect, useRef } from 'react';
import { TextInput, View, Platform } from 'react-native';
import { OptimizedIcon, IconName } from './OptimizedIcon';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  useDerivedValue,
  cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import ThemedText from './ThemedText';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export interface AnimatedInputProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable?: boolean;
  error?: string;
  icon: IconName;
}

// Spring config used in the shake animation – declared once to prevent
// re-allocation in every worklet execution.
const SPRING = { damping: 10, stiffness: 500 } as const;

/**
 * Strict-mode safe AnimatedInput component.
 * – No `.value` reads during the React render phase
 * – All mutations happen outside render or on the UI thread via `runOnUI`
 * – Reads happen only inside worklet hooks (`useAnimatedStyle`, `useDerivedValue`)
 */
export default function AnimatedInput({
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  editable = true,
  error,
  icon,
}: AnimatedInputProps) {
  // Shared values
  const focusProgress = useSharedValue(0); // 0 = blurred, 1 = focused
  const shakePhase = useSharedValue(0);

  /* ---------------------------  Trigger shake  --------------------------- */
  const prevErrorRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!error) {
      prevErrorRef.current = undefined;
      return;
    }

    // Start a new shake only when the *message* actually changes
    if (prevErrorRef.current === error) return;
    prevErrorRef.current = error;

    // worklet defined inline for shake animation
    const triggerShake = () => {
      'worklet';
      cancelAnimation(shakePhase);
      shakePhase.value = 0;
      shakePhase.value = withSequence(
        withSpring(-8, SPRING),
        withSpring(8, SPRING),
        withSpring(-4, SPRING),
        withSpring(0, SPRING)
      );
    };

    triggerShake();
  }, [error, shakePhase]);

  /* ----------------------------  Callbacks (JS)  --------------------------- */
  const handleFocus = useCallback(() => {
    focusProgress.value = 1; // direct write – UI proxy handles thread hop
    if (Platform.OS === 'ios') Haptics.selectionAsync();
  }, [focusProgress]);

  const handleBlur = useCallback(() => {
    focusProgress.value = 0;
  }, [focusProgress]);

  /* ----------------------------  Side-Effects  ----------------------------- */
  // Removed: Previous runOnUI loop that spawned a new animation each render.

  /* -------------------------  Derived / Animated  ------------------------- */
  // Memoised transform array to avoid creating a new reference every render
  const transformArray = useDerivedValue(() => [
    { scale: 1 + 0.02 * focusProgress.value },
    { translateX: shakePhase.value },
  ]);

  const containerStyle = useAnimatedStyle(
    () => ({ transform: transformArray.value }),
    [] // no JS-side dependencies – memoised
  );

  return (
    <View className="mb-4">
      <Animated.View
        style={containerStyle}
        className={`relative rounded-2xl border-2 transition-all duration-200 ${
          error
            ? 'border-status-danger bg-red-50 dark:bg-red-900/20'
            : 'border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50'
        }`}
      >
        <View className="flex-row items-center px-4 py-4">
          <OptimizedIcon
            name={icon}
            size={20}
            className={`mr-3 ${error ? 'text-status-danger' : 'text-neutral-500 dark:text-neutral-400'}`}
          />
          <AnimatedTextInput
            className="flex-1 text-base font-medium text-neutral-900 dark:text-neutral-100"
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            editable={editable}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            accessible
            accessibilityLabel={placeholder}
            accessibilityHint={`Enter your ${placeholder.toLowerCase()}`}
          />
        </View>
      </Animated.View>

      {error && (
        <Animated.View entering={FadeInDown.duration(300)} className="mt-2 flex-row items-center">
          <OptimizedIcon name="alert-circle" size={16} className="text-status-danger mr-2" />
          <ThemedText variant="caption" className="text-status-danger flex-1">
            {error}
          </ThemedText>
        </Animated.View>
      )}
    </View>
  );
} 