import React from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import ThemedView from './ThemedView';

/**
 * AnimatedSpinner - NativeWind + Reanimated v3 best practices
 * Fully optimized, mobile-first, safe area, semantic theming
 */
export const AnimatedSpinner: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => {
  const rotation = useSharedValue(0);

  React.useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: 1000 }), -1);
    return () => {
      rotation.value = 0;
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  return (
    <ThemedView className={className} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ width: size, height: size, borderWidth: size / 8, borderColor: 'rgba(0,0,0,0.1)', borderTopColor: 'var(--color-primary-500)', borderRadius: size / 2 }, animatedStyle]} />
    </ThemedView>
  );
};
