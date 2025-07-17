import { BlurView as ExpoBlurView } from 'expo-blur';
import * as Haptics from '@/lib/utils/haptics';
import React, { useEffect } from 'react';
import { Modal, Platform, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

import { OptimizedIcon } from './OptimizedIcon';
import ThemedText from './ThemedText';
import ThemedView from './ThemedView';
import { AddPlantForm } from '../AddPlantForm';

interface AddPlantModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddPlantModal({ visible, onClose, onSuccess }: AddPlantModalProps) {
  const { t } = useTranslation('addPlantModal');
  const { height: screenHeight } = useWindowDimensions();

  // Reanimated v3 shared values for sophisticated modal animations
  const modalTranslateY = useSharedValue(screenHeight);
  const backdropOpacity = useSharedValue(0);
  const headerScale = useSharedValue(0.95);
  const contentOpacity = useSharedValue(0);
  const blurIntensity = useSharedValue(0);

  // Animation configurations matching FloatingActionButton quality
  const SPRING_CONFIG = {
    damping: 20,
    stiffness: 400,
    mass: 1,
  };

  const ENTRANCE_CONFIG = {
    damping: 25,
    stiffness: 350,
    mass: 1.2,
  };

  // Trigger haptic feedback
  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Enhanced modal entrance animation
  const showModal = () => {
    'worklet';
    // Sophisticated entrance sequence
    modalTranslateY.value = withSpring(0, ENTRANCE_CONFIG);
    backdropOpacity.value = withTiming(1, { duration: 300 });
    blurIntensity.value = withTiming(20, { duration: 400 });

    // Staggered content animations for polish
    headerScale.value = withSequence(
      withTiming(1.05, { duration: 200 }),
      withSpring(1, SPRING_CONFIG)
    );
    contentOpacity.value = withTiming(1, { duration: 400 });
  };

  // Enhanced modal exit animation
  const hideModal = () => {
    // Sophisticated exit sequence with proper completion callback
    modalTranslateY.value = withSpring(screenHeight * 0.6, SPRING_CONFIG, (finished) => {
      'worklet';
      if (finished) {
        runOnJS(onClose)();
      }
    });
    backdropOpacity.value = withTiming(0, { duration: 250 });
    blurIntensity.value = withTiming(0, { duration: 300 });
    headerScale.value = withTiming(0.95, { duration: 200 });
    contentOpacity.value = withTiming(0, { duration: 200 });
  };

  // Close button gesture with enhanced feedback
  const closeButtonGesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      runOnJS(triggerHaptic)();
    })
    .onEnd(() => {
      'worklet';
      runOnJS(hideModal)();
    });

  // Backdrop tap to close gesture
  const backdropGesture = Gesture.Tap().onEnd(() => {
    'worklet';
    runOnJS(hideModal)();
  });

  // Swipe down to dismiss gesture
  const swipeGesture = Gesture.Pan()
    .onUpdate((event) => {
      'worklet';
      if (event.translationY > 0) {
        modalTranslateY.value = event.translationY;
        const progress = Math.min(event.translationY / (screenHeight * 0.3), 1);
        backdropOpacity.value = 1 - progress * 0.5;
        headerScale.value = 1 - progress * 0.05;
      }
    })
    .onEnd((event) => {
      'worklet';
      if (event.translationY > screenHeight * 0.15 || event.velocityY > 800) {
        // Dismiss modal
        runOnJS(hideModal)();
      } else {
        // Snap back
        modalTranslateY.value = withSpring(0, SPRING_CONFIG);
        backdropOpacity.value = withTiming(1, { duration: 200 });
        headerScale.value = withSpring(1, SPRING_CONFIG);
      }
    });

  // Animated styles with sophisticated interpolations
  const animatedModalStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateY: modalTranslateY.value }, { scale: headerScale.value }],
    };
  });

  const animatedBackdropStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: backdropOpacity.value,
    };
  });

  const animatedContentStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: contentOpacity.value,
    };
  });

  const animatedBlurStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: interpolate(blurIntensity.value, [0, 20], [0, 1], Extrapolation.CLAMP),
    };
  });

  // Handle modal visibility changes
  useEffect(() => {
    if (visible) {
      // Reset values and trigger entrance
      modalTranslateY.value = screenHeight;
      backdropOpacity.value = 0;
      headerScale.value = 0.95;
      contentOpacity.value = 0;
      blurIntensity.value = 0;

      // Small delay for smooth entrance
      setTimeout(() => {
        showModal();
      }, 50);
    }
  }, [visible, screenHeight]);

  // Enhanced success handler with animation
  const handleSuccess = () => {
    triggerHaptic();
    hideModal();
    // Call original success after animation completes
    setTimeout(() => {
      onSuccess();
    }, 350);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="none" // We handle animations manually
      transparent
      onRequestClose={hideModal}
      statusBarTranslucent={Platform.OS === 'android'}>
      {/* Enhanced backdrop with blur effect */}
      <GestureDetector gesture={backdropGesture}>
        <Animated.View className="absolute inset-0" style={animatedBackdropStyle}>
          <Animated.View
            style={[
              { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
              animatedBlurStyle,
            ]}>
            <ExpoBlurView intensity={20} style={{ flex: 1 }} tint="systemMaterialDark" />
          </Animated.View>
          {/* Gradient overlay for enhanced depth */}
          <Animated.View
            className="absolute inset-0 bg-black/20 dark:bg-black/40"
            style={animatedBackdropStyle}
          />
        </Animated.View>
      </GestureDetector>

      {/* Enhanced modal container with gestures */}
      <GestureDetector gesture={swipeGesture}>
        <Animated.View className="flex-1 justify-end" style={animatedModalStyle}>
          <ThemedView className="mx-4 mb-8 overflow-hidden rounded-3xl bg-white/95 backdrop-blur-xl dark:bg-neutral-900/95">
            {/* Enhanced header with sophisticated styling */}
            <ThemedView className="border-b border-neutral-200/50 dark:border-neutral-700/50">
              {/* Swipe indicator */}
              <ThemedView className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-neutral-300 dark:bg-neutral-600" />

              <ThemedView className="flex-row items-center justify-between p-6 pb-4">
                <ThemedView className="flex-1">
                  <ThemedText className="text-2xl font-extrabold text-neutral-900 dark:text-white">
                    {t('addNewPlant')}
                  </ThemedText>
                  <ThemedText className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                    {t('startGrowingJourney')}
                  </ThemedText>
                </ThemedView>

                {/* Enhanced close button with gesture feedback */}
                <GestureDetector gesture={closeButtonGesture}>
                  <Animated.View className="rounded-full bg-neutral-100 p-2 dark:bg-neutral-800">
                    <OptimizedIcon
                      name="close"
                      size={24}
                      color="#6b7280"
                      accessibilityLabel={t('closeModal')}
                    />
                  </Animated.View>
                </GestureDetector>
              </ThemedView>
            </ThemedView>

            {/* Enhanced content area with animation */}
            <Animated.View style={animatedContentStyle}>
              <ThemedView className="max-h-[75vh] flex-1">
                <AddPlantForm onSuccess={handleSuccess} />
              </ThemedView>
            </Animated.View>
          </ThemedView>
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
}

export default AddPlantModal;
