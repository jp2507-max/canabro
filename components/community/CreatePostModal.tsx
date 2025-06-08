import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef } from 'react';
import { Modal, View, useWindowDimensions, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  runOnUI,
  interpolateColor as rInterpolateColor,
} from 'react-native-reanimated';

import { OptimizedIcon } from '../ui/OptimizedIcon';
import ThemedText from '../ui/ThemedText';

type CreatePostModalProps = {
  visible: boolean;
  onClose: () => void;
  onCreatePost: () => void;
  onAskQuestion: () => void;
};

// 🎯 Production Animation Configurations
const ANIMATION_CONFIG = {
  backdrop: { damping: 20, stiffness: 300 },
  modal: { damping: 18, stiffness: 350 },
  stagger: { damping: 15, stiffness: 400 },
  quick: { damping: 25, stiffness: 600 },
} as const;

const TIMING_CONFIG = {
  backdrop: { duration: 300 },
  modal: { duration: 400 },
  stagger: { duration: 300 },
} as const;

/**
 * Enhanced CreatePostModal with sophisticated animations and gesture handling
 * Following production patterns from AddPlantModal for consistency
 */
export default function CreatePostModal({
  visible,
  onClose,
  onCreatePost,
  onAskQuestion,
}: CreatePostModalProps) {
  const { height: screenHeight } = useWindowDimensions();

  // 🧹 Timer cleanup refs to prevent memory leaks
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // 🎬 Enhanced Animation System
  const backdropOpacity = useSharedValue(0);
  const modalTranslateY = useSharedValue(screenHeight);
  const modalScale = useSharedValue(0.9);
  const modalOpacity = useSharedValue(0);
  const blurIntensity = useSharedValue(0);

  // Action button animations
  const shareButtonScale = useSharedValue(0.8);
  const shareButtonOpacity = useSharedValue(0);
  const questionButtonScale = useSharedValue(0.8);
  const questionButtonOpacity = useSharedValue(0);
  const swipeIndicatorOpacity = useSharedValue(0);

  // Gesture handling
  const gestureContext = useSharedValue({ startY: 0 });
  const isGestureActive = useSharedValue(false);

  // 🧹 Safe setTimeout with automatic cleanup
  const safeSetTimeout = (callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      timersRef.current.delete(timer);
      callback();
    }, delay);
    timersRef.current.add(timer);
    return timer;
  };

  // 🧹 Cleanup function for all timers
  const clearAllTimers = () => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
  };

  // 🎨 Enhanced Animated Styles with Color Interpolation
  const animatedBackdropStyle = useAnimatedStyle(() => {
    'worklet';
    const backgroundColor = rInterpolateColor(
      backdropOpacity.value,
      [0, 1],
      ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.6)']
    );

    return {
      opacity: backdropOpacity.value,
      backgroundColor,
    };
  });

  const animatedModalStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateY: modalTranslateY.value }, { scale: modalScale.value }],
      opacity: modalOpacity.value,
    };
  });

  const animatedBlurStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: blurIntensity.value,
    };
  });

  const animatedShareButtonStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: shareButtonScale.value }],
      opacity: shareButtonOpacity.value,
    };
  });

  const animatedQuestionButtonStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: questionButtonScale.value }],
      opacity: questionButtonOpacity.value,
    };
  });

  const animatedSwipeIndicatorStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: swipeIndicatorOpacity.value,
    };
  });

  // 🎯 Enhanced Animation Functions
  const showModal = () => {
    'worklet';
    // Backdrop animation
    backdropOpacity.value = withTiming(1, TIMING_CONFIG.backdrop);
    blurIntensity.value = withTiming(1, TIMING_CONFIG.backdrop);

    // Modal entrance
    modalTranslateY.value = withSpring(0, ANIMATION_CONFIG.modal);
    modalScale.value = withSpring(1, ANIMATION_CONFIG.modal);
    modalOpacity.value = withTiming(1, TIMING_CONFIG.modal);

    // Swipe indicator
    swipeIndicatorOpacity.value = withDelay(200, withSpring(1, ANIMATION_CONFIG.quick));

    // Staggered button animations for premium feel
    shareButtonScale.value = withDelay(300, withSpring(1, ANIMATION_CONFIG.stagger));
    shareButtonOpacity.value = withDelay(300, withTiming(1, TIMING_CONFIG.stagger));

    questionButtonScale.value = withDelay(400, withSpring(1, ANIMATION_CONFIG.stagger));
    questionButtonOpacity.value = withDelay(400, withTiming(1, TIMING_CONFIG.stagger));
  };

  const hideModal = () => {
    'worklet';
    // Reverse staggered animations
    shareButtonOpacity.value = withTiming(0, { duration: 150 });
    shareButtonScale.value = withTiming(0.8, { duration: 150 });

    questionButtonOpacity.value = withDelay(50, withTiming(0, { duration: 150 }));
    questionButtonScale.value = withDelay(50, withTiming(0.8, { duration: 150 }));

    swipeIndicatorOpacity.value = withTiming(0, { duration: 150 });

    // Modal exit
    modalTranslateY.value = withSpring(screenHeight, ANIMATION_CONFIG.modal);
    modalScale.value = withSpring(0.9, ANIMATION_CONFIG.modal);
    modalOpacity.value = withTiming(0, TIMING_CONFIG.modal);

    // Backdrop fade
    backdropOpacity.value = withTiming(0, TIMING_CONFIG.backdrop);
    blurIntensity.value = withTiming(0, TIMING_CONFIG.backdrop);
  };

  // 🎯 Enhanced Gesture Handlers
  const backdropGesture = Gesture.Tap().onEnd(() => {
    'worklet';
    // UI-side: trigger animation only
    hideModal();

    // JS-side: haptics + delayed close with cleanup
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    safeSetTimeout(() => onClose(), 300);
  });

  const panGesture = Gesture.Pan()
    .onStart((event) => {
      'worklet';
      gestureContext.value.startY = event.translationY;
      isGestureActive.value = true;
    })
    .onUpdate((event) => {
      'worklet';
      const translation = Math.max(0, event.translationY);
      modalTranslateY.value = translation;

      // Dynamic opacity based on swipe distance
      const progress = Math.min(translation / (screenHeight * 0.3), 1);
      modalOpacity.value = 1 - progress * 0.5;
      backdropOpacity.value = 1 - progress * 0.7;
    })
    .onEnd((event) => {
      'worklet';
      isGestureActive.value = false;

      const shouldClose = event.translationY > screenHeight * 0.2 || event.velocityY > 500;

      if (shouldClose) {
        // UI-side: trigger animation only
        hideModal();

        // JS-side: haptics + delayed close with cleanup
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        safeSetTimeout(() => onClose(), 300);
      } else {
        // Snap back
        modalTranslateY.value = withSpring(0, ANIMATION_CONFIG.modal);
        modalOpacity.value = withSpring(1, ANIMATION_CONFIG.modal);
        backdropOpacity.value = withSpring(1, ANIMATION_CONFIG.modal);
      }
    });

  // 🎯 Enhanced Button Handlers with Haptic Feedback
  const handleSharePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    hideModal();
    safeSetTimeout(() => {
      onClose();
      onCreatePost();
    }, 250);
  };

  const handleQuestionPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    hideModal();
    safeSetTimeout(() => {
      onClose();
      onAskQuestion();
    }, 250);
  };

  // 🎯 Effect Management
  useEffect(() => {
    if (visible) {
      runOnUI(showModal)();
    } else {
      runOnUI(hideModal)();
    }
  }, [visible]);

  // 🧹 Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent>
      <GestureDetector gesture={backdropGesture}>
        <Animated.View style={animatedBackdropStyle} className="flex-1">
          {/* 🎨 Enhanced Blur Background for iOS */}
          {Platform.OS === 'ios' && (
            <Animated.View
              style={[
                animatedBlurStyle,
                { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
              ]}>
              <BlurView intensity={20} style={{ flex: 1 }} />
            </Animated.View>
          )}

          {/* Modal Container */}
          <View className="flex-1 justify-end">
            <GestureDetector gesture={panGesture}>
              <Animated.View
                style={animatedModalStyle}
                className="overflow-hidden rounded-t-3xl border-t border-neutral-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                pointerEvents="box-none">
                {/* 🎯 Enhanced Swipe Indicator */}
                <Animated.View style={animatedSwipeIndicatorStyle} className="items-center py-4">
                  <View className="h-1.5 w-12 rounded-full bg-neutral-300 dark:bg-zinc-600" />
                </Animated.View>

                {/* 📝 Enhanced Content Section */}
                <View className="pb-safe-or-6 px-6">
                  <ThemedText className="mb-6 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    Create
                  </ThemedText>

                  {/* 🌱 Enhanced Share Plant Option */}
                  <Animated.View style={animatedShareButtonStyle}>
                    <GestureDetector gesture={Gesture.Tap().onEnd(handleSharePress)}>
                      <View className="mb-4 flex-row items-center rounded-2xl bg-neutral-50 p-4 active:bg-neutral-100 dark:bg-zinc-800 dark:active:bg-zinc-700">
                        <View className="mr-4 h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-900/30">
                          <OptimizedIcon name="leaf" size={28} color="#10b981" />
                        </View>
                        <View className="flex-1">
                          <ThemedText className="mb-1 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                            Share a Plant
                          </ThemedText>
                          <ThemedText className="text-base leading-5 text-neutral-600 dark:text-neutral-400">
                            Post photos and updates about your plants
                          </ThemedText>
                        </View>
                        <OptimizedIcon name="chevron-forward" size={20} color="#9ca3af" />
                      </View>
                    </GestureDetector>
                  </Animated.View>

                  {/* ❓ Enhanced Ask Question Option */}
                  <Animated.View style={animatedQuestionButtonStyle}>
                    <GestureDetector gesture={Gesture.Tap().onEnd(handleQuestionPress)}>
                      <View className="flex-row items-center rounded-2xl bg-neutral-50 p-4 active:bg-neutral-100 dark:bg-zinc-800 dark:active:bg-zinc-700">
                        <View className="mr-4 h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30">
                          <OptimizedIcon name="help-circle" size={28} color="#d97706" />
                        </View>
                        <View className="flex-1">
                          <ThemedText className="mb-1 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                            Ask a Question
                          </ThemedText>
                          <ThemedText className="text-base leading-5 text-neutral-600 dark:text-neutral-400">
                            Get help from the community on growing issues
                          </ThemedText>
                        </View>
                        <OptimizedIcon name="chevron-forward" size={20} color="#9ca3af" />
                      </View>
                    </GestureDetector>
                  </Animated.View>
                </View>
              </Animated.View>
            </GestureDetector>
          </View>
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
}
