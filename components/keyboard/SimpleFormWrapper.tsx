import React, { ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  TouchableWithoutFeedback,
  ViewStyle,
} from 'react-native';

interface SimpleFormWrapperProps {
  /**
   * Form content to render inside the wrapper.
   */
  children: ReactNode;
  /**
   * Additional Tailwind / NativeWind className for the SafeAreaView container.
   */
  className?: string;
  /**
   * keyboardVerticalOffset is useful when you have a header that obscures the view
   */
  keyboardVerticalOffset?: number;
}

/**
 * SimpleFormWrapper
 * ---------------------------------------------------------------
 * Lightweight helper that provides:
 * 1. Safe-area handling via SafeAreaView.
 * 2. KeyboardAvoidingView with sane defaults (padding on iOS).
 * 3. Tap-to-dismiss behaviour using TouchableWithoutFeedback.
 *
 * This component is intended for *very simple* forms such as login, register,
 * and settings screens. For complex multi-step forms please use
 * `FormKeyboardWrapper` which offers better field navigation & performance.
 */
export function SimpleFormWrapper({
  children,
  className = 'flex-1 bg-neutral-50 dark:bg-neutral-900',
  keyboardVerticalOffset = 24,
}: SimpleFormWrapperProps) {
  return (
    <SafeAreaView className={className}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={keyboardVerticalOffset}
          style={{ flex: 1 } as ViewStyle}
        >
          {children}
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

export default SimpleFormWrapper; 