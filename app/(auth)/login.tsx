import { OptimizedIcon } from '../../components/ui/OptimizedIcon';
import * as Haptics from '@/lib/utils/haptics';
import { Link } from 'expo-router';
import React, { useState, useRef } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Platform,
  TextInput,
} from 'react-native';
import Animated, {

  FadeIn,
  FadeInDown,
  SlideInDown,
} from 'react-native-reanimated';

import ThemedText from '../../components/ui/ThemedText';
import { useTranslation } from 'react-i18next';
import ThemedView from '../../components/ui/ThemedView';
import { isDevelopment, authConfig } from '../../lib/config';
import { useAuth } from '../../lib/contexts/AuthProvider';

// Lightweight keyboard handling components
import { EnhancedTextInput } from '../../components/ui/EnhancedTextInput';
import SimpleFormWrapper from '../../components/keyboard/SimpleFormWrapper';
import AnimatedButton from '@/components/buttons/AnimatedButton';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const { t } = useTranslation('auth');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, devBypassAuth } = useAuth();

  // Lightweight keyboard handling
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);


  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    setIsLoading(true);

    try {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        const key = signInError.message.toLowerCase().includes('email') ? 'email' : 'password';
        setErrors({ [key]: signInError.message });
        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      } else {
        setErrors({}); // Clear errors on successful login
        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        // Navigation or other success actions would typically follow here
      }
    } catch (_error) {
      setErrors({ password: 'An unexpected error occurred. Please try again.' });
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevBypass = async () => {
    setIsLoading(true);
    try {
      const { error } = await devBypassAuth();
      if (error) {
        setErrors({ password: error.message });
      }
    } catch (error) {
      console.error('Dev bypass error:', error);
      setErrors({ password: 'Dev bypass failed' });
    } finally {
      setIsLoading(false);
    }
  };

  const showDevOptions = isDevelopment && !authConfig.forceDevBypass;

  return (
    <ThemedView variant="default" className="flex-1">
      <SimpleFormWrapper className="flex-1">
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingVertical: 24, // Extra space so inputs are fully visible
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View className="px-6">
            {/* Logo Section */}
            <Animated.View entering={FadeIn.duration(800)} className="mb-12 items-center">
              <View className="mb-6 h-20 w-20 items-center justify-center rounded-3xl bg-primary-500 shadow-lg dark:bg-primary-600">
                <OptimizedIcon name="leaf" size={32} className="text-white" />
              </View>
              <ThemedText variant="heading" className="text-4xl font-black tracking-tight">
                CanaBro
              </ThemedText>
              <ThemedText variant="muted" className="mt-2 text-center text-lg">
                {t('login.welcomeSubtitle')}
              </ThemedText>
            </Animated.View>

            {/* Development Mode Banner */}
            {isDevelopment && (
              <Animated.View
                entering={SlideInDown.duration(600).delay(200)}
                className="mb-6 rounded-2xl border border-yellow-200 bg-yellow-100 p-4 dark:border-yellow-800 dark:bg-yellow-900/30">
                <View className="flex-row items-center">
                  <OptimizedIcon
                    name="code-working"
                    size={18}
                    className="mr-2 text-yellow-800 dark:text-yellow-200"
                  />
                  <ThemedText className="flex-1 text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    {authConfig.forceDevBypass
                      ? 'Development mode: Auto-login enabled'
                      : 'Development mode: Manual login required'}
                  </ThemedText>
                </View>
              </Animated.View>
            )}

            {/* Form Section */}
            <Animated.View entering={FadeInDown.duration(600).delay(100)}>
              <EnhancedTextInput
                ref={emailRef}
                leftIcon="mail"
                placeholder={t('login.emailPlaceholder')}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
                error={errors.email}
                onSubmitEditing={() => {
                  if (passwordRef.current) {
                    passwordRef.current.focus();
                  }
                }}
              />

              <EnhancedTextInput
                ref={passwordRef}
                leftIcon="lock-closed"
                placeholder={t('login.passwordPlaceholder')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!isLoading}
                error={errors.password}
                onSubmitEditing={handleLogin}
              />

              <AnimatedButton
                title={t('login.signIn')}
                onPress={handleLogin}
                loading={isLoading}
                icon="log-in"
              />

              {showDevOptions && (
                <AnimatedButton
                  title={t('login.developerLogin')}
                  onPress={handleDevBypass}
                  loading={isLoading}
                  variant="secondary"
                  icon="code-working"
                />
              )}
            </Animated.View>

            {/* Footer Link */}
            <Animated.View
              entering={FadeInDown.duration(800).delay(600)}
              className="mt-8 flex-row justify-center">
              <ThemedText variant="muted" className="text-base">
                {t('login.noAccount')}{' '}
              </ThemedText>
              <Link href="/(auth)/register" asChild>
                <Pressable
                  disabled={isLoading}
                  accessible
                  accessibilityLabel="Go to registration screen"
                  accessibilityRole="link">
                  <ThemedText className="text-base font-semibold text-primary-500 dark:text-primary-400">
                    {t('login.signUp')}
                  </ThemedText>
                </Pressable>
              </Link>
            </Animated.View>
          </View>
        </ScrollView>
      </SimpleFormWrapper>
    </ThemedView>
  );
}
