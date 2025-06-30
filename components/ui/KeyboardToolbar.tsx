import React from 'react';
import { Pressable } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { triggerLightHaptic, triggerSelectionHaptic } from '@/lib/utils/haptics';
import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';

interface KeyboardToolbarProps {
  isVisible: boolean;
  keyboardHeight?: number;
  onPrevious?: () => void;
  onNext?: () => void;
  onDone: () => void;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  currentField?: string;
  totalFields?: number;
  currentIndex?: number;
}

export const KeyboardToolbar: React.FC<KeyboardToolbarProps> = ({
  isVisible,
  keyboardHeight = 0,
  onPrevious,
  onNext,
  onDone,
  canGoPrevious = false,
  canGoNext = false,
  currentField,
  totalFields,
  currentIndex,
}) => {
  const insets = useSafeAreaInsets();

  if (!isVisible) return null;

  const handlePrevious = () => {
    triggerLightHaptic();
    onPrevious?.();
  };

  const handleNext = () => {
    triggerLightHaptic();
    onNext?.();
  };

  const handleDone = () => {
    triggerSelectionHaptic();
    onDone();
  };

  return (
    <Animated.View 
      entering={FadeInDown.duration(200)}
      exiting={FadeOutDown.duration(200)}
      className="absolute left-0 right-0 z-50"
      style={{ 
        bottom: keyboardHeight > 0 ? keyboardHeight : insets.bottom,
      }}
    >
      <ThemedView className="flex-row items-center justify-between bg-neutral-100 border-t border-neutral-200 px-4 py-3 dark:bg-neutral-800 dark:border-neutral-700">
        
        {/* Navigation Controls */}
        <ThemedView className="flex-row items-center space-x-3">
          {(onPrevious || onNext) && (
            <>
              <Pressable 
                onPress={handlePrevious}
                disabled={!canGoPrevious}
                className={`rounded-lg p-2 ${!canGoPrevious ? 'opacity-30' : 'opacity-100'}`}
              >
                <OptimizedIcon 
                  name="chevron-up" 
                  size={20} 
                  className="text-neutral-600 dark:text-neutral-400" 
                />
              </Pressable>
              
              <Pressable 
                onPress={handleNext}
                disabled={!canGoNext}
                className={`rounded-lg p-2 ${!canGoNext ? 'opacity-30' : 'opacity-100'}`}
              >
                <OptimizedIcon 
                  name="chevron-down" 
                  size={20} 
                  className="text-neutral-600 dark:text-neutral-400" 
                />
              </Pressable>
            </>
          )}

          {/* Current field indicator */}
          {currentField && (
            <ThemedView className="ml-3">
              <ThemedText className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                {totalFields && currentIndex !== undefined
                  ? `${currentField} (${currentIndex + 1}/${totalFields})`
                  : currentField}
              </ThemedText>
            </ThemedView>
          )}
        </ThemedView>

        {/* Done Button */}
        <Pressable 
          onPress={handleDone} 
          className="rounded-lg bg-primary-500 px-6 py-2 dark:bg-primary-600"
        >
          <ThemedText className="font-semibold text-white">
            Done
          </ThemedText>
        </Pressable>
      </ThemedView>
    </Animated.View>
  );
};
