import * as Haptics from 'expo-haptics';
import React, { useEffect, useCallback } from 'react';
import { View, Image, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
  Extrapolation,
  cancelAnimation,
  runOnUI,
  runOnJS,
} from 'react-native-reanimated';

import { SPRING_CONFIGS } from '../../lib/animations/presets';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';

interface PlantDoctorHeroProps {
  onTakePhoto: () => void;
}

const PlantDoctorHero = React.memo(function PlantDoctorHero({ onTakePhoto }: PlantDoctorHeroProps) {
  const { width } = useWindowDimensions();

  // Animation values
  const companionScale = useSharedValue(0.8);
  const companionY = useSharedValue(50);
  const companionRotation = useSharedValue(0);
  const titleY = useSharedValue(30);
  const subtitleY = useSharedValue(40);
  const buttonScale = useSharedValue(0.9);
  const buttonY = useSharedValue(50);
  const iconRotation = useSharedValue(0);

  // Animated styles
  const companionStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { translateY: companionY.value },
        { scale: companionScale.value },
        { rotate: `${companionRotation.value}deg` },
      ],
    };
  });

  const titleStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateY: titleY.value }],
      opacity: interpolate(titleY.value, [30, 0], [0, 1], Extrapolation.CLAMP),
    };
  });

  const subtitleStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateY: subtitleY.value }],
      opacity: interpolate(subtitleY.value, [40, 0], [0, 1], Extrapolation.CLAMP),
    };
  });

  const buttonStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateY: buttonY.value }, { scale: buttonScale.value }],
      opacity: interpolate(buttonY.value, [50, 0], [0, 1], Extrapolation.CLAMP),
    };
  });

  const iconStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ rotate: `${iconRotation.value}deg` }],
    };
  });

  // Entrance animations
  useEffect(() => {
    const sequence = () => {
      'worklet';
      // Companion entrance
      companionScale.value = withSpring(1, SPRING_CONFIGS.smooth);
      companionY.value = withSpring(0, SPRING_CONFIGS.smooth);

      // Staggered text entrance
      titleY.value = withSpring(0, SPRING_CONFIGS.smooth);
      subtitleY.value = withSpring(0, SPRING_CONFIGS.smooth);

      // Button entrance
      buttonScale.value = withSpring(1, SPRING_CONFIGS.bouncy);
      buttonY.value = withSpring(0, SPRING_CONFIGS.smooth);
    };

    // Start floating animation for companion
    const startFloating = () => {
      'worklet';
      companionY.value = withRepeat(
        withTiming(-10, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      companionScale.value = withRepeat(
        withTiming(1.05, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      companionRotation.value = withRepeat(
        withSequence(
          withTiming(2, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(-2, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    };

    runOnUI(sequence)();
    const timer = setTimeout(() => runOnUI(startFloating)(), 800);
    return () => {
      clearTimeout(timer);
      // Cancel infinite animation loops to prevent memory leaks
      cancelAnimation(companionY);
      cancelAnimation(companionScale);
      cancelAnimation(companionRotation);
    };
  }, []);

  // Memoized handlers
  const handleTakePhoto = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onTakePhoto();
  }, [onTakePhoto]);

  const handleCompanionTap = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Gesture handlers with proper completion patterns
  const buttonGesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      buttonScale.value = withSpring(0.95, SPRING_CONFIGS.quick);
      iconRotation.value = withTiming(15, { duration: 150 });
    })
    .onFinalize(() => {
      'worklet';
      buttonScale.value = withSpring(1, SPRING_CONFIGS.smooth);
      iconRotation.value = withTiming(0, { duration: 150 });
    })
    .onEnd(() => {
      runOnJS(handleTakePhoto)();
    });

  const companionGesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      companionScale.value = withSpring(1.1, SPRING_CONFIGS.quick);
      companionRotation.value = withTiming(10, { duration: 200 });
    })
    .onFinalize(() => {
      'worklet';
      companionRotation.value = withSequence(
        withTiming(-5, { duration: 200 }),
        withTiming(0, { duration: 200 })
      );
      companionScale.value = withSpring(1.05, SPRING_CONFIGS.smooth);
    })
    .onEnd(() => {
      runOnJS(handleCompanionTap)();
    });

  return (
    <ThemedView className="flex-1 items-center justify-center px-6 py-8">
      {/* Plant Doctor Companion */}
      <GestureDetector gesture={companionGesture}>
        <Animated.View
          style={[companionStyle, { marginBottom: 32 }]}
          accessibilityRole="button"
          accessibilityLabel="Plant Doctor companion"
          accessibilityHint="Tap for a friendly interaction">
          <View className="items-center justify-center rounded-full bg-primary-100 p-8 shadow-lg shadow-primary-500/20 dark:bg-primary-900/30">
            <Image
              source={require('../../assets/icon.png')}
              style={{ width: 120, height: 120 }}
              resizeMode="contain"
            />

            {/* Floating indicators */}
            <View className="absolute -right-2 -top-2 rounded-full bg-primary-500 p-2">
              <OptimizedIcon name="medal" size={16} color="white" />
            </View>

            <View className="bg-status-success absolute -bottom-1 -left-1 rounded-full p-1">
              <OptimizedIcon name="checkmark-circle" size={12} color="white" />
            </View>
          </View>
        </Animated.View>
      </GestureDetector>

      {/* Title */}
      <Animated.View style={titleStyle}>
        <ThemedText className="mb-3 text-center text-3xl font-extrabold text-primary-600 dark:text-primary-400">
          Plant Doctor
        </ThemedText>
      </Animated.View>

      {/* Subtitle */}
      <Animated.View style={subtitleStyle}>
        <ThemedText className="mb-12 text-center text-lg leading-7 text-neutral-600 dark:text-neutral-300">
          Take a photo of your plant and get{'\n'}
          <ThemedText className="font-semibold text-primary-600 dark:text-primary-400">
            AI-powered diagnosis
          </ThemedText>{' '}
          in seconds
        </ThemedText>
      </Animated.View>

      {/* Action Button */}
      <GestureDetector gesture={buttonGesture}>
        <Animated.View
          style={buttonStyle}
          accessibilityRole="button"
          accessibilityLabel="Take a photo"
          accessibilityHint="Opens camera to capture plant image for diagnosis">
          <View
            className="flex-row items-center justify-center rounded-2xl bg-primary-500 px-8 py-4 shadow-lg shadow-primary-500/25"
            style={{ minWidth: width * 0.7 }}>
            <Animated.View style={[iconStyle, { marginRight: 12 }]}>
              <OptimizedIcon name="camera" size={24} color="white" />
            </Animated.View>
            <ThemedText className="text-lg font-bold text-white">Take a Photo</ThemedText>
          </View>

          {/* Button glow effect */}
          <View className="absolute inset-0 -z-10 rounded-2xl bg-primary-400 opacity-40 blur-xl" />
        </Animated.View>
      </GestureDetector>

      {/* Features list */}
      <View className="mt-8 space-y-4">
        {[
          { icon: 'leaf', text: 'Detect diseases & pests' },
          { icon: 'search', text: 'Nutrient deficiency analysis' },
          { icon: 'star', text: 'Personalized recommendations' },
        ].map((feature, index) => (
          <View key={index} className="flex-row items-center space-x-3">
            <View className="rounded-full bg-primary-100 p-2 dark:bg-primary-900/30">
              <OptimizedIcon name={feature.icon as any} size={16} color="#10b981" />
            </View>
            <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
              {feature.text}
            </ThemedText>
          </View>
        ))}
      </View>
    </ThemedView>
  );
});

export default PlantDoctorHero;
