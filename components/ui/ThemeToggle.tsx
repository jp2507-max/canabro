import { useColorScheme, colorScheme } from 'nativewind';
import React from 'react';
import { Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
  interpolateColor as rInterpolateColor,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { OptimizedIcon } from './OptimizedIcon';
import { triggerLightHapticSync, triggerMediumHapticSync } from '@/lib/utils/haptics';
import { THEME_STORAGE_KEY } from '../../app/_layout';

interface ThemeToggleProps {
  showLabel?: boolean;
  compact?: boolean;
}

// Animation configurations
const SPRING_CONFIG = { damping: 15, stiffness: 200 };
const ICON_ROTATION = { light: 0, dark: 180 };
const SCALE_VALUES = { pressed: 0.95, default: 1 };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ThemeToggle({ showLabel = true, compact = false }: ThemeToggleProps) {
  const { colorScheme: currentScheme, setColorScheme } = useColorScheme();
  const isDarkMode = currentScheme === 'dark';

  // Animation values
  const iconRotation = useSharedValue(isDarkMode ? ICON_ROTATION.dark : ICON_ROTATION.light);
  const iconScale = useSharedValue(1);
  const containerScale = useSharedValue(1);
  const backgroundProgress = useSharedValue(isDarkMode ? 1 : 0);

  // Update animations when theme changes
  React.useEffect(() => {
    iconRotation.value = withSpring(
      isDarkMode ? ICON_ROTATION.dark : ICON_ROTATION.light,
      SPRING_CONFIG
    );
    backgroundProgress.value = withSpring(isDarkMode ? 1 : 0, SPRING_CONFIG);
  }, [isDarkMode]);

  const toggleTheme = React.useCallback(async () => {
    console.log('[ThemeToggle] Starting toggle. Current scheme:', currentScheme, 'isDarkMode:', isDarkMode);
    
    // Context-aware haptic feedback
    triggerMediumHapticSync();

    // Icon bounce animation
    iconScale.value = withSequence(
      withTiming(1.2, { duration: 150 }),
      withSpring(1, SPRING_CONFIG)
    );

    try {
      const newTheme = isDarkMode ? 'light' : 'dark';
      console.log('[ThemeToggle] Setting theme to:', newTheme);
      
      // CRITICAL FIX: Use the robust theme setting approach
      // Step 1: Clear any existing theme storage to ensure clean state
      await AsyncStorage.removeItem('nativewind-theme'); // Clear NativeWind's internal storage
      
      // Step 2: Set using imperative method first (most reliable)
      colorScheme.set(newTheme);
      
      // Step 3: Store in our custom key for persistence
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
      
      // Step 4: Use hook method as backup
      setColorScheme(newTheme);
      
      // Step 5: Force a small delay and verify the change
      setTimeout(async () => {
        const storedCustom = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        const storedNative = await AsyncStorage.getItem('nativewind-theme');
        console.log('[ThemeToggle] Post-toggle verification:');
        console.log('  - Target theme:', newTheme);
        console.log('  - Current scheme:', currentScheme);
        console.log('  - Custom stored:', storedCustom);
        console.log('  - NativeWind stored:', storedNative);
        
        // If theme didn't apply correctly, force it again
        if (currentScheme !== newTheme) {
          console.log('[ThemeToggle] Theme mismatch detected, forcing re-application');
          colorScheme.set(newTheme);
        }
      }, 300);
      
    } catch (error) {
      console.error('[ThemeToggle] Error setting theme:', error);
    }
  }, [isDarkMode, setColorScheme, currentScheme]);

  // Gesture handlers
  const toggleGesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      containerScale.value = withTiming(SCALE_VALUES.pressed, { duration: 100 });
      runOnJS(triggerLightHapticSync)();
    })
    .onFinalize(() => {
      'worklet';
      containerScale.value = withSpring(SCALE_VALUES.default, SPRING_CONFIG);
      runOnJS(toggleTheme)();
    });

  // Animated styles
  const containerAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    const backgroundColor = rInterpolateColor(
      backgroundProgress.value,
      [0, 1],
      ['rgb(245, 245, 245)', 'rgb(38, 38, 38)'] // neutral-100 to neutral-800
    );

    return {
      transform: [{ scale: containerScale.value }],
      backgroundColor,
    };
  });

  const iconContainerAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    const backgroundColor = rInterpolateColor(
      backgroundProgress.value,
      [0, 1],
      ['rgb(229, 229, 229)', 'rgb(34, 197, 94)'] // neutral-200 to primary-600
    );

    return {
      backgroundColor,
    };
  });

  const iconAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ rotate: `${iconRotation.value}deg` }, { scale: iconScale.value }],
    };
  });

  const textAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    const color = rInterpolateColor(
      backgroundProgress.value,
      [0, 1],
      ['rgb(38, 38, 38)', 'rgb(255, 255, 255)'] // neutral-800 to white
    );

    return { color };
  });

  const sizeClasses = compact ? 'p-1' : 'p-2';
  const iconSizeClasses = compact ? 'h-8 w-8' : 'h-10 w-10';
  const iconSize = compact ? 16 : 20;
  const textSizeClasses = compact ? 'text-sm' : 'text-base';

  return (
    <GestureDetector gesture={toggleGesture}>
      <AnimatedPressable
        style={containerAnimatedStyle}
        className={`flex-row items-center ${sizeClasses} rounded-full transition-colors`}
        accessibilityRole="switch"
        accessibilityState={{ checked: isDarkMode }}
        accessibilityLabel="Toggle dark mode"
        accessibilityHint="Switches between light and dark themes">
        <Animated.View
          style={iconContainerAnimatedStyle}
          className={`${iconSizeClasses} items-center justify-center rounded-full transition-colors`}>
          <Animated.View style={iconAnimatedStyle}>
            <OptimizedIcon
              name={isDarkMode ? 'moon-outline' : 'sun'}
              size={iconSize}
              className={isDarkMode ? 'text-white' : 'text-primary-600'}
            />
          </Animated.View>
        </Animated.View>

        {showLabel && (
          <Animated.Text
            style={textAnimatedStyle}
            className={`ml-2 ${textSizeClasses} font-medium transition-colors`}>
            {isDarkMode ? 'Dark' : 'Light'}
          </Animated.Text>
        )}
      </AnimatedPressable>
    </GestureDetector>
  );
}

export { ThemeToggle };
export default ThemeToggle;
