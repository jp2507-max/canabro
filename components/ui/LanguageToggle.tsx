
import React from 'react';
import { Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
  runOnJS,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useI18n } from '../../lib/hooks/useI18n';
import { triggerMediumHapticSync } from '../../lib/utils/haptics';
import type { SupportedLanguage } from '../../lib/contexts/LanguageProvider';

// Helper to get CSS variable color as rgb string (for web/Expo) or fallback to static for native
const getCssVarRgb = (cssVar: string, fallback: string): string => {
  // Only attempt to read CSS variables on web
  // On React Native, always return fallback
  // @ts-ignore: DOM globals only available on web
  if (typeof window !== 'undefined' && typeof document !== 'undefined' && typeof getComputedStyle !== 'undefined') {
    try {
      // @ts-ignore: getComputedStyle/document only on web
      const value = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
      if (value) return `rgb(${value})`;
    } catch { /* ignore error, fallback below */ }
  }
  return fallback;
};

// Use semantic tokens from NativeWind/global.css
const neutral200 = getCssVarRgb('--color-neutral-200', 'rgb(245,234,220)'); // neutral-200
const primary500 = getCssVarRgb('--color-success-500', 'rgb(34,197,94)');   // success-500 (matches Tailwind/NativeWind primary-500)
const neutral600 = getCssVarRgb('--color-neutral-600', 'rgb(156,132,110)'); // neutral-600

interface LanguageToggleProps {
  showLabel?: boolean;
  compact?: boolean;
}

function LanguageToggle({ showLabel = true, compact = false }: LanguageToggleProps) {
  const { currentLanguage, switchLanguage } = useI18n();
  const { t } = useTranslation('common');
  
  const isGerman = currentLanguage === 'de';
  
  // Animation values
  const scale = useSharedValue(1);
  const colorProgress = useSharedValue(isGerman ? 1 : 0);

  // Update color progress when language changes
  React.useEffect(() => {
    colorProgress.value = withSpring(isGerman ? 1 : 0, {
      damping: 20,
      stiffness: 300,
    });
  }, [isGerman, colorProgress]);

  const toggleLanguage = async () => {
    try {
      await triggerMediumHapticSync();
      const newLanguage: SupportedLanguage = isGerman ? 'en' : 'de';
      console.log('[LanguageToggle] Switching language to:', newLanguage);
      await switchLanguage(newLanguage);
    } catch (error) {
      console.error('[LanguageToggle] Error switching language:', error);
    }
  };

  // Gesture handler
  const toggleGesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
    })
    .onFinalize(() => {
      'worklet';
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      runOnJS(toggleLanguage)();
    });

  // Size classes
  const sizeClasses = compact ? 'px-3 py-2' : 'px-4 py-3';
  const iconSizeClasses = compact ? 'h-6 w-6' : 'h-8 w-8';
  const textSizeClasses = compact ? 'text-sm' : 'text-base';
  // iconSize is unused

  // Animated styles

  // Get semantic color values from CSS variables or fallback to static RGB
  // These are resolved once at render (not animated), but are correct for theme
  const white = '#fff';
  // For shadow, use a muted/neutral color with opacity (slate-500)
  const shadowLight = 'rgba(100,116,139,0.10)';
  const shadowDark = 'rgba(100,116,139,0.20)';

  const containerAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    const backgroundColor = interpolateColor(
      colorProgress.value,
      [0, 1],
      [neutral200, primary500]
    );
    return {
      backgroundColor,
      transform: [{ scale: scale.value }],
    };
  });

  const iconContainerAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    const backgroundColor = interpolateColor(
      colorProgress.value,
      [0, 1],
      [white, white]
    );
    const shadowColor = interpolateColor(
      colorProgress.value,
      [0, 1],
      [shadowLight, shadowDark]
    );
    return {
      backgroundColor,
      shadowColor,
    };
  });

  const textAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    const color = interpolateColor(
      colorProgress.value,
      [0, 1],
      [neutral600, white]
    );
    return { color };
  });

  return (
    <GestureDetector gesture={toggleGesture}>
      <Animated.View
        style={containerAnimatedStyle}
        className={`flex-row items-center ${sizeClasses} rounded-full transition-colors`}
        accessibilityRole="switch"
        accessibilityState={{ checked: isGerman }}
        accessibilityLabel={isGerman ? t('switch_to_english') : t('switch_to_german')}
        accessibilityHint="Switches between English and German language">
        <Animated.View
          style={iconContainerAnimatedStyle}
          className={`${iconSizeClasses} items-center justify-center rounded-full shadow-sm transition-colors`}>
          <Text className="text-lg font-bold">
            {isGerman ? '🇩🇪' : '🇺🇸'}
          </Text>
        </Animated.View>

        {showLabel && (
          <Animated.Text
            style={textAnimatedStyle}
            className={`ml-2 ${textSizeClasses} font-medium transition-colors`}>
            {isGerman ? 'Deutsch' : 'English'}
          </Animated.Text>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

export default React.memo(LanguageToggle); 