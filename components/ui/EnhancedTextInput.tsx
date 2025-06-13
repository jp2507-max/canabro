/**
 * EnhancedTextInput - Advanced input for complex forms and multi-step workflows
 * 
 * USE FOR:
 * - Multi-step forms (plant creation, diary entries)
 * - Forms with keyboard navigation
 * - Inputs requiring character counts
 * - Complex validation states
 * - Forms with optional icons
 * 
 * FOR SIMPLE FORMS: Use AnimatedInput instead
 * 
 * Key Features:
 * - Optional labels and icons
 * - Character counting
 * - Advanced validation states
 * - Keyboard navigation support via forwardRef
 * - Success/error/disabled states
 * - Smooth reanimated transitions
 */
import React, { forwardRef } from 'react';
import {
  TextInput,
  TextInputProps,
  Pressable,
} from 'react-native';
import Animated,
{
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
  useAnimatedKeyboard,
  FadeInDown,
} from 'react-native-reanimated';
import { triggerLightHaptic, triggerSelectionHaptic } from '@/lib/utils/haptics';
import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';

interface EnhancedTextInputProps extends TextInputProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  index?: number;
  multiline?: boolean;
  label?: string;
  error?: string;
  success?: boolean;
  disabled?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  onSubmitEditing?: () => void;
  showCharacterCount?: boolean;
  maxLength?: number;
  inputAccessoryViewID?: string;
}

export const EnhancedTextInput = forwardRef<TextInput, EnhancedTextInputProps>(
  (
    {
      placeholder,
      value = '',
      onChangeText,
      index = 0,
      multiline = false,
      label,
      error,
      success,
      disabled = false,
      leftIcon,
      rightIcon,
      onRightIconPress,
      onSubmitEditing,
      showCharacterCount = false,
      maxLength,
      inputAccessoryViewID,
      keyboardType = 'default',
      style,
      ...props
    },
    ref
  ) => {
    const inputScale = useSharedValue(1);
    const borderColor = useSharedValue(0);
    const backgroundColor = useSharedValue(0);

    // Determine the border color state based on props
    const getBorderColorState = () => {
      if (error) return 2; // Error state
      if (success) return 1; // Success/focused state
      return 0; // Default state
    };

    const animatedInputStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: inputScale.value }],
        borderColor: interpolateColor(
          borderColor.value,
          [0, 1, 2],
          [
            'rgb(233 216 192)', // neutral-300 - default
            'rgb(22 163 74)',   // primary-500 - focused/success
            'rgb(239 68 68)',   // red-500 - error
          ]
        ),
        backgroundColor: interpolateColor(
          backgroundColor.value,
          [0, 1],
          [
            'rgb(249 250 251)', // neutral-50 - default
            'rgb(254 254 254)', // white - focused
          ]
        ),
      };
    });    const handleFocus = () => {
      if (disabled) return;
      
      inputScale.value = withSpring(1.02, { damping: 15 });
      borderColor.value = withSpring(error ? 2 : 1, { duration: 200 });
      backgroundColor.value = withSpring(1, { duration: 200 });
      triggerLightHaptic();
    };

    const handleBlur = () => {
      inputScale.value = withSpring(1, { damping: 15 });
      borderColor.value = withSpring(getBorderColorState(), { duration: 200 });
      backgroundColor.value = withSpring(0, { duration: 200 });
    };    const handleSubmitEditing = () => {
      triggerSelectionHaptic();
      onSubmitEditing?.();
    };    const handleRightIconPress = () => {
      triggerLightHaptic();
      onRightIconPress?.();
    };

    // Update border color when error/success state changes
    React.useEffect(() => {
      borderColor.value = withSpring(getBorderColorState(), { duration: 200 });
    }, [error, success]);

    const characterCount = value?.length || 0;
    const isOverLimit = maxLength ? characterCount > maxLength : false;

    return (
      <ThemedView className="mb-4">
        {label && (
          <ThemedText className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {label}
          </ThemedText>
        )}
        
        <Animated.View 
          style={[animatedInputStyle]} 
          className={`
            relative flex-row items-center rounded-lg border-2 
            ${disabled ? 'opacity-50' : ''}
            ${multiline ? 'min-h-[100px] items-start' : 'h-12'}
          `}
        >          {leftIcon && (
            <ThemedView className="pl-3">
              <OptimizedIcon 
                name={leftIcon as any} 
                size={20} 
                className="text-neutral-400 dark:text-neutral-500" 
              />
            </ThemedView>
          )}
          
          <TextInput
            ref={ref}
            className={`
              flex-1 text-base font-medium
              text-neutral-900 placeholder:text-neutral-400
              dark:text-neutral-100 dark:placeholder:text-neutral-500
              ${leftIcon ? 'pl-2' : 'pl-4'}
              ${rightIcon ? 'pr-2' : 'pr-4'}
              ${multiline ? 'py-3' : 'py-0'}
            `}
            placeholder={placeholder}
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onSubmitEditing={handleSubmitEditing}
            multiline={multiline}
            keyboardType={keyboardType}
            textAlignVertical={multiline ? 'top' : 'center'}
            returnKeyType="next"
            blurOnSubmit={false}
            editable={!disabled}
            maxLength={maxLength}
            inputAccessoryViewID={inputAccessoryViewID}
            style={style}
            {...props}
          />
            {rightIcon && (
            <Pressable onPress={handleRightIconPress} className="pr-3">
              <OptimizedIcon 
                name={rightIcon as any} 
                size={20} 
                className="text-neutral-400 dark:text-neutral-500" 
              />
            </Pressable>
          )}
        </Animated.View>

        {/* Error message */}
        {error && (
          <Animated.View entering={FadeInDown.duration(200)}>
            <ThemedText className="mt-1 text-sm text-red-500 dark:text-red-400">
              {error}
            </ThemedText>
          </Animated.View>
        )}

        {/* Character count */}
        {showCharacterCount && maxLength && (
          <ThemedView className="mt-1 flex-row justify-end">
            <ThemedText 
              className={`text-xs ${
                isOverLimit 
                  ? 'text-red-500 dark:text-red-400' 
                  : 'text-neutral-500 dark:text-neutral-400'
              }`}
            >
              {characterCount}/{maxLength}
            </ThemedText>
          </ThemedView>
        )}
      </ThemedView>
    );
  }
);

EnhancedTextInput.displayName = 'EnhancedTextInput';
