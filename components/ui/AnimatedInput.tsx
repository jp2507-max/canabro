import React, { useCallback, useEffect } from 'react';
import { TextInput, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  runOnUI,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
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
  icon: keyof typeof Ionicons.glyphMap;
}

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
  const errorShake = useSharedValue(0);

  /* ----------------------------  Callbacks (JS)  --------------------------- */
  const handleFocus = useCallback(() => {
    runOnUI((fp: typeof focusProgress) => {
      'worklet';
      fp.value = 1;
    })(focusProgress);
    if (Platform.OS === 'ios') Haptics.selectionAsync();
  }, [focusProgress]);

  const handleBlur = useCallback(() => {
    runOnUI((fp: typeof focusProgress) => {
      'worklet';
      fp.value = 0;
    })(focusProgress);
  }, [focusProgress]);

  /* ----------------------------  Side-Effects  ----------------------------- */
  useEffect(() => {
    if (error) {
      runOnUI((shake: typeof errorShake) => {
        'worklet';
        shake.value = withSequence(
          withSpring(-8, { damping: 10, stiffness: 500 }),
          withSpring(8, { damping: 10, stiffness: 500 }),
          withSpring(-4, { damping: 10, stiffness: 500 }),
          withSpring(0, { damping: 10, stiffness: 500 })
        );
      })(errorShake);
    } else {
      runOnUI((shake: typeof errorShake) => {
        'worklet';
        shake.value = withSpring(0, { damping: 10, stiffness: 500 });
      })(errorShake);
    }
  }, [error, errorShake]);

  /* -------------------------  Derived / Animated  ------------------------- */
  const containerStyle = useAnimatedStyle(() => {
    const scale = 1 + 0.02 * focusProgress.value; // 1 → 1.02
    return {
      transform: [{ scale }, { translateX: errorShake.value }],
    };
  });

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
          <Ionicons
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
          <Ionicons name="alert-circle" size={16} className="text-status-danger mr-2" />
          <ThemedText variant="caption" className="text-status-danger flex-1">
            {error}
          </ThemedText>
        </Animated.View>
      )}
    </View>
  );
} 