import * as Haptics from 'expo-haptics';
import { useColorScheme } from 'nativewind';
import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  interpolateColor as rInterpolateColor,
} from 'react-native-reanimated';

import { OptimizedIcon } from './OptimizedIcon';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Animation configurations
const SPRING_CONFIG = { damping: 15, stiffness: 200 };

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <ErrorDisplay
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorDisplayProps {
  error: Error;
  errorInfo: React.ErrorInfo | null;
  onRetry: () => void;
}

function ErrorDisplay({ error, errorInfo, onRetry }: ErrorDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);
  const { colorScheme } = useColorScheme();

  // Animation values
  const retryScale = useSharedValue(1);
  const detailsToggleRotation = useSharedValue(0);
  const errorShake = useSharedValue(0);
  const detailsHeight = useSharedValue(0);
  const cardScale = useSharedValue(0.8);

  // Entrance animation
  React.useEffect(() => {
    cardScale.value = withSpring(1, SPRING_CONFIG);

    // Error shake effect on mount
    errorShake.value = withSequence(
      withTiming(-3, { duration: 100 }),
      withTiming(3, { duration: 100 }),
      withTiming(-2, { duration: 100 }),
      withTiming(2, { duration: 100 }),
      withTiming(0, { duration: 100 })
    );
  }, []);

  // Handle retry with animations
  const handleRetry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    retryScale.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withTiming(1, { duration: 200 })
    );

    // Add a slight delay for visual feedback
    setTimeout(onRetry, 200);
  };

  // Handle details toggle
  const handleToggleDetails = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setShowDetails(!showDetails);
    detailsToggleRotation.value = withSpring(showDetails ? 0 : 180, SPRING_CONFIG);
    detailsHeight.value = withSpring(showDetails ? 0 : 1, SPRING_CONFIG);
  };

  // Animated styles
  const cardAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: cardScale.value }, { translateX: errorShake.value }],
    };
  });

  const retryAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: retryScale.value }],
    };
  });

  const detailsToggleAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ rotate: `${detailsToggleRotation.value}deg` }],
    };
  });

  const detailsAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    const backgroundColor = rInterpolateColor(
      detailsHeight.value,
      [0, 1],
      [
        'transparent',
        colorScheme === 'dark'
          ? 'rgb(38, 38, 38)' // neutral-800
          : 'rgb(245, 245, 245)',
      ] // neutral-100
    );

    return {
      maxHeight: detailsHeight.value * 200,
      opacity: detailsHeight.value,
      backgroundColor,
    };
  });

  const errorMessage = error.message || 'An unexpected error occurred';
  const errorStack = error.stack || 'No stack trace available';
  const componentStack = errorInfo?.componentStack || 'No component stack available';

  return (
    <View className="flex-1 justify-center bg-neutral-50 px-6 py-8 dark:bg-neutral-900">
      <Animated.View style={cardAnimatedStyle}>
        {/* Main Error Card */}
        <View className="mb-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
          {/* Error Icon */}
          <View className="mb-4 items-center">
            <View className="bg-status-danger/10 mb-3 rounded-full p-4">
              <OptimizedIcon name="warning-outline" size={32} className="text-status-danger" />
            </View>

            <Text className="mb-2 text-center text-xl font-bold text-neutral-900 dark:text-white">
              Something went wrong
            </Text>

            <Text className="text-center text-base leading-6 text-neutral-600 dark:text-neutral-400">
              {errorMessage}
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="space-y-3">
            {/* Retry Button */}
            <AnimatedPressable
              style={retryAnimatedStyle}
              onPress={handleRetry}
              className="flex-row items-center justify-center space-x-2 rounded-xl bg-primary-600 px-6 py-4 dark:bg-primary-500"
              accessibilityRole="button"
              accessibilityLabel="Retry operation">
              <OptimizedIcon name="camera-flip-outline" size={18} className="text-white" />
              <Text className="ml-2 text-base font-semibold text-white">Try Again</Text>
            </AnimatedPressable>

            {/* Show Details Toggle */}
            <Pressable
              onPress={handleToggleDetails}
              className="flex-row items-center justify-center space-x-2 rounded-xl bg-neutral-100 px-4 py-3 dark:bg-neutral-700"
              accessibilityRole="button"
              accessibilityLabel={showDetails ? 'Hide error details' : 'Show error details'}>
              <Text className="font-medium text-neutral-700 dark:text-neutral-300">
                {showDetails ? 'Hide Details' : 'Show Details'}
              </Text>
              <Animated.View style={detailsToggleAnimatedStyle}>
                <OptimizedIcon
                  name="chevron-down"
                  size={16}
                  className="text-neutral-500 dark:text-neutral-400"
                />
              </Animated.View>
            </Pressable>
          </View>
        </View>

        {/* Error Details (Collapsible) */}
        <Animated.View
          style={detailsAnimatedStyle}
          className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
          <ScrollView className="p-4" showsVerticalScrollIndicator={false} nestedScrollEnabled>
            <View className="space-y-4">
              {/* Error Stack */}
              <View>
                <Text className="mb-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  Error Stack:
                </Text>
                <View className="rounded-lg bg-neutral-800 p-3 dark:bg-neutral-900">
                  <Text className="font-mono text-xs leading-4 text-green-400">{errorStack}</Text>
                </View>
              </View>

              {/* Component Stack */}
              {componentStack && (
                <View>
                  <Text className="mb-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                    Component Stack:
                  </Text>
                  <View className="rounded-lg bg-neutral-800 p-3 dark:bg-neutral-900">
                    <Text className="font-mono text-xs leading-4 text-blue-400">
                      {componentStack}
                    </Text>
                  </View>
                </View>
              )}

              {/* Timestamp */}
              <View>
                <Text className="text-xs text-neutral-500 dark:text-neutral-400">
                  Error occurred at: {new Date().toLocaleString()}
                </Text>
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </View>
  );
}
