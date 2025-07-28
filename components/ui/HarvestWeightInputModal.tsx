/**
 * HarvestWeightInputModal - Cross-platform modal for harvest weight input
 * 
 * Replaces iOS-only Alert.prompt with a custom modal that works on both platforms.
 * Features input validation, haptic feedback, and smooth animations.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Modal, Pressable, TextInput, useWindowDimensions, Keyboard } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { triggerLightHaptic, triggerSuccessHaptic, triggerErrorHaptic } from '@/lib/utils/haptics';
import ThemedView from './ThemedView';
import ThemedText from './ThemedText';
import { OptimizedIcon } from './OptimizedIcon';

interface HarvestWeightInputModalProps {
  visible: boolean;
  plantName: string;
  onCancel: () => void;
  onConfirm: (weight?: string) => void;
}

export const HarvestWeightInputModal: React.FC<HarvestWeightInputModalProps> = ({
  visible,
  plantName,
  onCancel,
  onConfirm,
}) => {
  const [weightInput, setWeightInput] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<TextInput>(null);
  const { height: screenHeight } = useWindowDimensions();

  // Animation values
  const modalTranslateY = useSharedValue(screenHeight);
  const backdropOpacity = useSharedValue(0);
  const contentScale = useSharedValue(0.9);

  // Animation configs
  const SPRING_CONFIG = {
    damping: 20,
    stiffness: 400,
    mass: 1,
  };

  // Show/hide modal animations
  useEffect(() => {
    if (visible) {
      // Reset state when modal opens
      setWeightInput('');
      setError('');
      
      // Entrance animation
      backdropOpacity.value = withTiming(1, { duration: 200 });
      modalTranslateY.value = withSpring(0, SPRING_CONFIG);
      contentScale.value = withSpring(1, SPRING_CONFIG);

      // Focus input after animation
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);

      return () => clearTimeout(timer);
    } else {
      // Exit animation
      backdropOpacity.value = withTiming(0, { duration: 200 });
      modalTranslateY.value = withTiming(screenHeight, { duration: 200 });
      contentScale.value = withTiming(0.9, { duration: 200 });
    }
  }, [visible, screenHeight]);

  // Input validation
  const validateInput = (input: string): string | null => {
    if (input === '') return null; // Optional field
    
    const weight = parseFloat(input);
    if (isNaN(weight)) {
      return 'Please enter a valid number';
    }
    if (weight < 0) {
      return 'Weight cannot be negative';
    }
    if (weight > 10000) {
      return 'Weight seems too high (max 10kg)';
    }
    return null;
  };

  const handleInputChange = (text: string) => {
    // Only allow numbers and decimal point
    const cleanText = text.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const decimalCount = cleanText.split('.').length - 1;
    if (decimalCount > 1) return;
    
    setWeightInput(cleanText);
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleConfirm = async () => {
    const validationError = validateInput(weightInput);
    
    if (validationError) {
      setError(validationError);
      await triggerErrorHaptic();
      return;
    }

    await triggerSuccessHaptic();
    Keyboard.dismiss();
    onConfirm(weightInput || undefined);
  };

  const handleCancel = async () => {
    await triggerLightHaptic();
    Keyboard.dismiss();
    onCancel();
  };

  const handleBackdropPress = async () => {
    await triggerLightHaptic();
    handleCancel();
  };

  // Animated styles
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const modalStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: modalTranslateY.value },
      { scale: contentScale.value },
    ],
  }));

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      {/* Backdrop */}
      <Pressable 
        className="flex-1" 
        onPress={handleBackdropPress}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <Animated.View style={[backdropStyle]} className="flex-1">
          <BlurView
            intensity={50}
            className="flex-1 bg-black/30"
          />
        </Animated.View>
      </Pressable>

      {/* Modal Content */}
      <ThemedView className="flex-1 justify-center items-center px-6 pt-safe">
        <Animated.View style={[modalStyle]} className="w-full max-w-sm">
          <ThemedView 
            variant="elevated" 
            className="p-6 mx-4 bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl"
          >
            {/* Header */}
            <ThemedView className="items-center mb-6">
              <ThemedView className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full items-center justify-center mb-4">
                <OptimizedIcon 
                  name="leaf" 
                  size={32} 
                  className="text-green-600 dark:text-green-400" 
                />
              </ThemedView>
              
              <ThemedText className="text-xl font-semibold text-center text-neutral-900 dark:text-neutral-100">
                Record Harvest Weight
              </ThemedText>
              
              <ThemedText className="text-base text-center text-neutral-600 dark:text-neutral-400 mt-2">
                {plantName}
              </ThemedText>
            </ThemedView>

            {/* Input Section */}
            <ThemedView className="mb-6">
              <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Wet Weight (grams) - Optional
              </ThemedText>
              
              <ThemedView 
                className={`border rounded-xl px-4 py-3 ${
                  error 
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                    : 'border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700'
                }`}
              >
                <TextInput
                  ref={inputRef}
                  value={weightInput}
                  onChangeText={handleInputChange}
                  placeholder="Enter weight in grams"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  onSubmitEditing={handleConfirm}
                  className="text-lg text-neutral-900 dark:text-neutral-100"
                  maxLength={8}
                />
              </ThemedView>
              
              {error ? (
                <ThemedText className="text-red-500 text-sm mt-2">
                  {error}
                </ThemedText>
              ) : null}
              
              <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                Leave empty to record harvest without weight
              </ThemedText>
            </ThemedView>

            {/* Buttons */}
            <ThemedView className="flex-row space-x-3">
              <Pressable
                onPress={handleCancel}
                className="flex-1 py-3 px-4 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-700 active:bg-neutral-200 dark:active:bg-neutral-600"
              >
                <ThemedText className="text-center font-medium text-neutral-700 dark:text-neutral-300">
                  Cancel
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={handleConfirm}
                className="flex-1 py-3 px-4 rounded-xl bg-green-600 dark:bg-green-700 active:bg-green-700 dark:active:bg-green-800"
              >
                <ThemedText className="text-center font-medium text-white">
                  Harvest
                </ThemedText>
              </Pressable>
            </ThemedView>
          </ThemedView>
        </Animated.View>
      </ThemedView>
    </Modal>
  );
};
