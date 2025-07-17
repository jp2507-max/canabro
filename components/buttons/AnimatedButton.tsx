import { useTranslation } from 'react-i18next';
import React from 'react';
import { ActivityIndicator, Pressable, Platform, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

import * as Haptics from '@/lib/utils/haptics';
import ThemedText from '@/components/ui/ThemedText';
import { OptimizedIcon, IconName } from '@/components/ui/OptimizedIcon';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AnimatedButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  icon?: IconName;
}

export default function AnimatedButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  icon,
}: AnimatedButtonProps) {
  const { t } = useTranslation('translation');

  const scale = useSharedValue(1);
  const shadowOpacity = useSharedValue(0.2);

  const buttonScaleStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const buttonShadowStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      shadowOpacity: shadowOpacity.value,
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
    shadowOpacity.value = withSpring(0.1, { damping: 15, stiffness: 400 });

    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    shadowOpacity.value = withSpring(0.2, { damping: 15, stiffness: 400 });
  };

  const isPrimary = variant === 'primary';

  return (
    <AnimatedPressable
      style={[
        buttonScaleStyle,
        buttonShadowStyle,
        {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 8,
          elevation: 4,
        },
      ]}
      className={`
        mb-4 rounded-2xl px-6 py-4 
        ${isPrimary ? 'bg-primary-500 dark:bg-primary-600' : 'bg-neutral-200 dark:bg-neutral-700'}
        ${disabled || loading ? 'opacity-70' : ''}
      `}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      accessible
      accessibilityLabel={title}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}>
      <View className="flex-row items-center justify-center">
        {loading ? (
          <ActivityIndicator
            color={isPrimary ? 'white' : '#6B7280'}
            size="small"
            className="mr-2"
          />
        ) : icon ? (
          <OptimizedIcon
            name={icon}
            size={18}
            className={`mr-2 ${isPrimary ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'}`}
          />
        ) : null}

        <ThemedText
          variant="default"
          className={`font-semibold ${isPrimary ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>
          {loading ? t('common.loading') : title}
        </ThemedText>
      </View>
    </AnimatedPressable>
  );
}
