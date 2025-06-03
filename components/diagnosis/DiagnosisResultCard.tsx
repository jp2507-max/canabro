import * as Haptics from 'expo-haptics';
import React, { useEffect, useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  interpolate,
  Extrapolation,
  runOnUI,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { OptimizedIcon } from '../ui/OptimizedIcon';
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';
import { SPRING_CONFIGS } from '../../lib/animations/presets';
import type { DiagnosisResult } from '../../lib/types/diagnosis';

interface DiagnosisResultCardProps {
  diagnosisResult: DiagnosisResult;
  onRetry?: () => void;
}

const DiagnosisResultCard = React.memo(function DiagnosisResultCard({
  diagnosisResult,
  onRetry,
}: DiagnosisResultCardProps) {
  // Animation values
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);
  const confidenceWidth = useSharedValue(0);
  const titleY = useSharedValue(20);
  const contentY = useSharedValue(30);
  const cardPressScale = useSharedValue(1);

  // Animated styles
  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value * cardPressScale.value },
      { translateY: titleY.value }
    ],
    opacity: opacity.value,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: titleY.value }],
    opacity: interpolate(titleY.value, [20, 0], [0, 1], Extrapolation.CLAMP),
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentY.value }],
    opacity: interpolate(contentY.value, [30, 0], [0, 1], Extrapolation.CLAMP),
  }));

  const confidenceBarStyle = useAnimatedStyle(() => ({
    width: `${confidenceWidth.value}%`,
  }));

  const confidencePercentage = Math.round(diagnosisResult.confidence * 100);

  // Entrance animations
  useEffect(() => {
    const sequence = () => {
      'worklet';
      // Card entrance
      scale.value = withSpring(1, SPRING_CONFIGS.smooth);
      opacity.value = withTiming(1, { duration: 400 });
      
      // Staggered content entrance
      titleY.value = withDelay(100, withSpring(0, SPRING_CONFIGS.smooth));
      contentY.value = withDelay(200, withSpring(0, SPRING_CONFIGS.smooth));
      
      // Animated confidence bar
      confidenceWidth.value = withDelay(
        300,
        withTiming(diagnosisResult.confidence * 100, { duration: 800 })
      );
    };

    runOnUI(sequence)();
  }, [diagnosisResult.confidence]);

  // Gesture handlers
  const cardGesture = Gesture.Tap()
    .onStart(() => {
      'worklet';
      cardPressScale.value = withSequence(
        withSpring(0.98, SPRING_CONFIGS.quick),
        withSpring(1, SPRING_CONFIGS.smooth)
      );
    });

  const handleRetry = useCallback(async () => {
    if (onRetry) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onRetry();
    }
  }, [onRetry]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-status-success';
    if (confidence >= 0.6) return 'bg-primary-500';
    if (confidence >= 0.4) return 'bg-status-warning';
    return 'bg-status-danger';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return 'High confidence';
    if (confidence >= 0.6) return 'Good confidence';
    if (confidence >= 0.4) return 'Moderate confidence';
    return 'Low confidence';
  };

  return (
    <GestureDetector gesture={cardGesture}>
      <Animated.View style={cardStyle}>
        <ThemedView className="rounded-3xl bg-white dark:bg-neutral-800 p-6 shadow-lg shadow-black/10 dark:shadow-black/30">
          {/* Header */}
          <Animated.View style={titleStyle}>
            <View className="mb-4 flex-row items-center justify-between">
              <ThemedText className="text-2xl font-extrabold text-primary-600 dark:text-primary-400">
                Diagnosis Results
              </ThemedText>
              {onRetry && (
                <TouchableOpacity
                  onPress={handleRetry}
                  className="rounded-full bg-neutral-100 dark:bg-neutral-700 p-2"
                  accessibilityRole="button"
                  accessibilityLabel="Retry diagnosis">
                  <OptimizedIcon name="arrow-back" size={20} color="#10b981" />
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>

          {/* Main content */}
          <Animated.View style={contentStyle}>
            {/* Issue name */}
            <View className="mb-4 rounded-2xl bg-primary-50 dark:bg-primary-950/30 p-4">
              <ThemedText className="mb-2 text-xl font-bold text-primary-800 dark:text-primary-300">
                {diagnosisResult.details?.name || 'Unknown Issue'}
              </ThemedText>

              {/* Confidence indicator */}
              <View className="mb-3 space-y-2">
                <View className="flex-row items-center justify-between">
                  <ThemedText className="text-sm font-medium text-primary-700 dark:text-primary-400">
                    {getConfidenceText(diagnosisResult.confidence)}
                  </ThemedText>
                  <ThemedText className="text-sm font-bold text-neutral-600 dark:text-neutral-300">
                    {confidencePercentage}%
                  </ThemedText>
                </View>
                
                <View className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                  <Animated.View
                    style={confidenceBarStyle}
                    className={`h-full rounded-full ${getConfidenceColor(diagnosisResult.confidence)}`}
                  />
                </View>
              </View>

              {/* Description */}
              <ThemedText className="leading-6 text-neutral-700 dark:text-neutral-300">
                {diagnosisResult.details?.description || 'No description available'}
              </ThemedText>
            </View>

            {/* Recommendations */}
            {diagnosisResult.details?.recommendations && diagnosisResult.details.recommendations.length > 0 && (
              <View className="space-y-3">
                <ThemedText className="text-lg font-bold text-primary-800 dark:text-primary-300">
                  Recommended Actions
                </ThemedText>
                
                <View className="space-y-3">
                  {diagnosisResult.details.recommendations.map((recommendation, index) => (
                    <View key={index} className="flex-row items-start space-x-3">
                      <View className="mt-1 rounded-full bg-primary-500 p-1">
                        <OptimizedIcon name="checkmark" size={12} color="white" />
                      </View>
                      <ThemedText className="flex-1 leading-6 text-neutral-700 dark:text-neutral-300">
                        {recommendation}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </Animated.View>
        </ThemedView>
      </Animated.View>
    </GestureDetector>
  );
});

export default DiagnosisResultCard; 