import { OptimizedIcon, IconName } from '../../components/ui/OptimizedIcon';
import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import {
  View,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';

import ThemedText from '../../components/ui/ThemedText';
import { useTranslation } from 'react-i18next';
import ThemedView from '../../components/ui/ThemedView';
import { useAuth } from '../../lib/contexts/AuthProvider';

// Lightweight keyboard handling components
import { EnhancedTextInput } from '../../components/ui/EnhancedTextInput';
import SimpleFormWrapper from '../../components/keyboard/SimpleFormWrapper';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AnimatedButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  icon?: IconName;
}

function AnimatedButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  icon,
}: AnimatedButtonProps) {
  const { t } = useTranslation('translation');
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  return (
    <AnimatedPressable
      style={animatedStyle}
      className={`mb-4 flex-row items-center justify-center rounded-2xl px-6 py-4 ${
        variant === 'primary' ? 'bg-primary-500' : 'bg-neutral-200 dark:bg-neutral-700'
      } ${disabled || loading ? 'opacity-70' : ''}`}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? 'white' : '#6B7280'} size="small" className="mr-2" />
      ) : icon ? (
        <OptimizedIcon name={icon} size={18} className={`mr-2 ${variant === 'primary' ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'}`} />
      ) : null}
      <ThemedText className={`font-semibold ${variant === 'primary' ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>
        {loading ? t('common.loading') : title}
      </ThemedText>
    </AnimatedPressable>
  );
}

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation('auth');
  const { passwordReset } = useAuth();

  const handlePasswordReset = async () => {
    setLoading(true);
    const { error } = await passwordReset(email);
    if (error) {
      Alert.alert(t('forgotPassword.errorTitle'), error.message);
    } else {
      Alert.alert(t('forgotPassword.successTitle'), t('forgotPassword.successMessage'));
      router.back();
    }
    setLoading(false);
  };

  return (
    <ThemedView className="flex-1">
      <SimpleFormWrapper>
        <View className="flex-1 justify-center p-6">
          <Animated.View entering={FadeInDown.duration(500)} className="items-center mb-8">
            <ThemedText variant="heading" className="mb-2">{t('forgotPassword.title')}</ThemedText>
            <ThemedText variant="muted" className="text-center">{t('forgotPassword.subtitle')}</ThemedText>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <EnhancedTextInput
              leftIcon="mail"
              placeholder={t('forgotPassword.emailPlaceholder')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
            <AnimatedButton
              title={t('forgotPassword.buttonText')}
              onPress={handlePasswordReset}
              loading={loading}
              icon="send"
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(500).delay(400)} className="mt-6 items-center">
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <ThemedText className="text-primary-500 dark:text-primary-400 font-semibold">{t('forgotPassword.backToLogin')}</ThemedText>
              </Pressable>
            </Link>
          </Animated.View>
        </View>
      </SimpleFormWrapper>
    </ThemedView>
  );
}
