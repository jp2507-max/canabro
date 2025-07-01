import { OptimizedIcon, IconName } from '../../components/ui/OptimizedIcon';
import * as Haptics from '@/lib/utils/haptics';
import { Link } from 'expo-router';
import React, { useState, useRef } from 'react';
import {
  View,
  ActivityIndicator,
  Pressable,
  Platform,
  TextInput,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeInDown,
  SlideInDown,
} from 'react-native-reanimated';

import ThemedText from '../../components/ui/ThemedText';
import ThemedView from '../../components/ui/ThemedView';
import { isDevelopment, authConfig } from '../../lib/config';
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
            className={`mr-2 ${
              isPrimary ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'
            }`}
          />
        ) : null}

        <ThemedText
          variant="default"
          className={`font-semibold ${
            isPrimary ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'
          }`}>
          {loading ? 'Please wait...' : title}
        </ThemedText>
      </View>
    </AnimatedPressable>
  );
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, devBypassAuth } = useAuth();

  // Lightweight keyboard handling
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const inputRefs = [emailRef, passwordRef];

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
    } catch (error) {
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
        <View className="flex-1 justify-center px-6">
          {/* Logo Section */}
          <Animated.View entering={FadeIn.duration(800)} className="mb-12 items-center">
            <View className="mb-6 h-20 w-20 items-center justify-center rounded-3xl bg-primary-500 shadow-lg dark:bg-primary-600">
              <OptimizedIcon name="leaf" size={32} className="text-white" />
            </View>
            <ThemedText variant="heading" className="text-4xl font-black tracking-tight">
              CanaBro
            </ThemedText>
            <ThemedText variant="muted" className="mt-2 text-center text-lg">
              Welcome back to your garden
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
          <Animated.View entering={FadeInDown.duration(800).delay(400)}>
            <EnhancedTextInput
              ref={emailRef}
              leftIcon="mail"
              placeholder="Email"
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
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isLoading}
              error={errors.password}
              onSubmitEditing={handleLogin}
            />

            <AnimatedButton
              title="Sign In"
              onPress={handleLogin}
              loading={isLoading}
              icon="log-in"
            />

            {showDevOptions && (
              <AnimatedButton
                title="Developer Login"
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
              Don't have an account?{' '}
            </ThemedText>
            <Link href="/(auth)/register" asChild>
              <Pressable
                disabled={isLoading}
                accessible
                accessibilityLabel="Go to registration screen"
                accessibilityRole="link">
                <ThemedText className="text-base font-semibold text-primary-500 dark:text-primary-400">
                  Sign Up
                </ThemedText>
              </Pressable>
            </Link>
          </Animated.View>
        </View>
      </SimpleFormWrapper>
    </ThemedView>
  );
}
