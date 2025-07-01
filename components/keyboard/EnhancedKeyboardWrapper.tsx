import React, { ReactNode } from 'react';
import { Keyboard, TouchableWithoutFeedback, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { KeyboardToolbar } from 'react-native-keyboard-controller';
import { useKeyboardPadding } from '@/lib/hooks/keyboard/useKeyboardPadding';

interface Props {
  /** Wrapped screen/content */
  children: ReactNode;
  /** NativeWind class names for the outer container */
  className?: string;
  /** Additional offset added to the baseline keyboard padding */
  extraOffset?: number;
  /** Whether to render the iOS accessory toolbar */
  showToolbar?: boolean;
  /** Optional custom toolbar content */
  toolbarContent?: React.ReactElement | null;
  /** Localised text for the keyboard "Done" button */
  doneText?: string;
  /** Minimum padding below the keyboard when it is hidden (defaults to 42) */
  minPadding?: number;
}

/**
 * EnhancedKeyboardWrapper
 * -----------------------
 * High-level component that keeps its children above the system keyboard,
 * renders an optional accessory toolbar, and dismisses the keyboard when
 * tapping outside of an input.
 */
export const EnhancedKeyboardWrapper = ({
  children,
  className = 'flex-1 bg-neutral-50 dark:bg-neutral-900',
  extraOffset = 0,
  showToolbar = true,
  toolbarContent,
  doneText = 'Close keyboard',
  minPadding,
}: Props) => {
  // Shared value representing the required bottom padding.
  const { padding } = useKeyboardPadding(extraOffset, minPadding);
  const paddingStyle = useAnimatedStyle(() => ({ height: padding.value }));

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View className={className}>
        {children}
        {/* Dynamic spacer to push content above the keyboard */}
        <Animated.View style={paddingStyle} />
        {showToolbar && (
          <KeyboardToolbar
            content={toolbarContent as any}
            showArrows={false}
            doneText={doneText}
            insets={{ left: 16, right: 16 }}
          />
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

export default EnhancedKeyboardWrapper; 