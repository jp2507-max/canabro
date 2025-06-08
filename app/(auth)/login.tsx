import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Link } from 'expo-router';
import React, { useState } from 'react';
import {
  View,
  TextInput,
  ActivityIndicator,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  runOnUI,
  FadeIn,
  FadeInDown,
  SlideInDown,
} from 'react-native-reanimated';

import ThemedText from '../../components/ui/ThemedText';
import ThemedView from '../../components/ui/ThemedView';
import { isDevelopment, authConfig } from '../../lib/config';
import { useAuth } from '../../lib/contexts/AuthProvider';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AnimatedInputProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable?: boolean;
  error?: string;
  icon: keyof typeof Ionicons.glyphMap;
}

function AnimatedInput({
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  editable = true,
  error,
  icon,
}: AnimatedInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const focusScale = useSharedValue(1);
  const errorShake = useSharedValue(0);

  const animatedInputStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: focusScale.value }, { translateX: errorShake.value }],
    };
  });

  const handleFocus = () => {
    setIsFocused(true);
    focusScale.value = withSpring(1.02, { damping: 15, stiffness: 300 });
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    focusScale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  // Trigger error animation
  React.useEffect(() => {
    if (error) {
      errorShake.value = withSequence(
        withSpring(-8, { damping: 10, stiffness: 500 }),
        withSpring(8, { damping: 10, stiffness: 500 }),
        withSpring(-4, { damping: 10, stiffness: 500 }),
        withSpring(0, { damping: 10, stiffness: 500 })
      );
    }
  }, [error]);

  return (
    <View className="mb-4">
      <Animated.View
        style={animatedInputStyle}
        className={`
          relative rounded-2xl border-2 transition-all duration-200
          ${
            isFocused
              ? 'border-primary-500 bg-white shadow-lg dark:bg-neutral-800'
              : error
                ? 'border-status-danger bg-red-50 dark:bg-red-900/20'
                : 'border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50'
          }
        `}>
        <View className="flex-row items-center px-4 py-4">
          <Ionicons
            name={icon}
            size={20}
            className={`mr-3 ${
              isFocused
                ? 'text-primary-500'
                : error
                  ? 'text-status-danger'
                  : 'text-neutral-500 dark:text-neutral-400'
            }`}
          />
          <TextInput
            className="flex-1 text-base font-medium text-neutral-900 dark:text-neutral-100"
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            editable={editable}
            accessible
            accessibilityLabel={placeholder}
            accessibilityHint={`Enter your ${placeholder.toLowerCase()}`}
          />
        </View>
      </Animated.View>

      {error && (
        <Animated.View entering={FadeInDown.duration(300)} className="mt-2 flex-row items-center">
          <Ionicons name="alert-circle" size={16} className="text-status-danger mr-2" />
          <ThemedText variant="caption" className="text-status-danger flex-1">
            {error}
          </ThemedText>
        </Animated.View>
      )}
    </View>
  );
}

interface AnimatedButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  icon?: keyof typeof Ionicons.glyphMap;
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

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: scale.value }],
      shadowOpacity: shadowOpacity.value,
    };
  });

  const handlePressIn = () => {
    runOnUI(() => {
      scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
      shadowOpacity.value = withSpring(0.1, { damping: 15, stiffness: 400 });
    })();

    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handlePressOut = () => {
    runOnUI(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      shadowOpacity.value = withSpring(0.2, { damping: 15, stiffness: 400 });
    })();
  };

  const isPrimary = variant === 'primary';

  return (
    <AnimatedPressable
      style={[
        animatedStyle,
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
          <Ionicons
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
    setErrors({});

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setErrors({ password: error.message });
        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      } else {
        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrors({ password: 'An unexpected error occurred' });
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1">
        <View className="flex-1 justify-center px-6">
          {/* Logo Section */}
          <Animated.View entering={FadeIn.duration(800)} className="mb-12 items-center">
            <View className="mb-6 h-20 w-20 items-center justify-center rounded-3xl bg-primary-500 shadow-lg dark:bg-primary-600">
              <Ionicons name="leaf" size={32} className="text-white" />
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
                <Ionicons
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
            <AnimatedInput
              icon="mail"
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
              error={errors.email}
            />

            <AnimatedInput
              icon="lock-closed"
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isLoading}
              error={errors.password}
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
      </KeyboardAvoidingView>
    </ThemedView>
  );
}
