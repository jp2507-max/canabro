import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Link } from 'expo-router';
import React, { useState } from 'react';
import {
  View,
  ActivityIndicator,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  runOnUI,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';

import ThemedText from '../../components/ui/ThemedText';
import ThemedView from '../../components/ui/ThemedView';
import { useAuth } from '../../lib/contexts/AuthProvider';
import supabase from '../../lib/supabase';

// Shared strict-mode safe AnimatedInput
import AnimatedInput from '../../components/ui/AnimatedInput';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Error recovery types
interface RegistrationState {
  userId?: string;
  email: string;
  username: string;
  retryCount: number;
  maxRetries: number;
}

// Exponential backoff utility
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const getBackoffDelay = (attempt: number) => Math.min(1000 * Math.pow(2, attempt), 30000);

interface AnimatedButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
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

  const getButtonStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-primary-500 dark:bg-primary-600';
      case 'secondary':
        return 'bg-neutral-200 dark:bg-neutral-700';
      case 'danger':
        return 'bg-status-danger dark:bg-red-600';
      default:
        return 'bg-primary-500 dark:bg-primary-600';
    }
  };

  const getTextStyles = () => {
    switch (variant) {
      case 'primary':
      case 'danger':
        return 'text-white';
      case 'secondary':
        return 'text-neutral-700 dark:text-neutral-300';
      default:
        return 'text-white';
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'primary':
      case 'danger':
        return 'text-white';
      case 'secondary':
        return 'text-neutral-700 dark:text-neutral-300';
      default:
        return 'text-white';
    }
  };

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
        ${getButtonStyles()}
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
            color={variant === 'secondary' ? '#6B7280' : 'white'}
            size="small"
            className="mr-2"
          />
        ) : icon ? (
          <Ionicons name={icon} size={18} className={`mr-2 ${getIconColor()}`} />
        ) : null}

        <ThemedText variant="default" className={`font-semibold ${getTextStyles()}`}>
          {title}
        </ThemedText>
      </View>
    </AnimatedPressable>
  );
}

interface PasswordStrengthProps {
  password: string;
}

function PasswordStrength({ password }: PasswordStrengthProps) {
  const getStrength = () => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const strength = getStrength();
  const strengthText = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][strength] || 'Very Weak';
  const strengthColor =
    ['text-red-500', 'text-orange-500', 'text-yellow-500', 'text-blue-500', 'text-green-500'][
      strength
    ] || 'text-red-500';

  if (!password) return null;

  return (
    <Animated.View entering={FadeInDown.duration(300)} className="mb-2">
      <View className="mb-1 flex-row items-center justify-between">
        <ThemedText variant="caption">Password Strength</ThemedText>
        <ThemedText variant="caption" className={strengthColor}>
          {strengthText}
        </ThemedText>
      </View>
      <View className="flex-row space-x-1">
        {[...Array(5)].map((_, i) => (
          <View
            key={i}
            className={`h-1 flex-1 rounded-full ${
              i < strength
                ? i < 2
                  ? 'bg-red-500'
                  : i < 3
                    ? 'bg-yellow-500'
                    : i < 4
                      ? 'bg-blue-500'
                      : 'bg-green-500'
                : 'bg-neutral-200 dark:bg-neutral-700'
            }`}
          />
        ))}
      </View>
    </Animated.View>
  );
}

interface ErrorRecoveryBannerProps {
  registrationState: RegistrationState | null;
  onRetry: () => void;
  onCancel: () => void;
  isRetrying: boolean;
}

function ErrorRecoveryBanner({
  registrationState,
  onRetry,
  onCancel,
  isRetrying,
}: ErrorRecoveryBannerProps) {
  if (!registrationState) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      className="mb-6 rounded-2xl border-2 border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
      <View className="flex-row items-start">
        <Ionicons name="warning" size={20} className="mr-3 mt-0.5 text-orange-500" />
        <View className="flex-1">
          <ThemedText
            variant="default"
            className="font-semibold text-orange-800 dark:text-orange-200">
            Registration Incomplete
          </ThemedText>
          <ThemedText variant="caption" className="mt-1 text-orange-700 dark:text-orange-300">
            Your account was created but profile setup failed. We'll help you complete the process.
          </ThemedText>

          <View className="mt-3 flex-row space-x-2">
            <AnimatedButton
              title={isRetrying ? 'Retrying...' : 'Retry Setup'}
              onPress={onRetry}
              loading={isRetrying}
              variant="primary"
              icon="refresh"
            />
            <AnimatedButton
              title="Cancel"
              onPress={onCancel}
              variant="secondary"
              icon="close"
              disabled={isRetrying}
            />
          </View>

          {registrationState.retryCount > 0 && (
            <ThemedText variant="caption" className="mt-2 text-orange-600 dark:text-orange-400">
              Attempt {registrationState.retryCount + 1} of {registrationState.maxRetries}
            </ThemedText>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    username?: string;
    confirmPassword?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [registrationState, setRegistrationState] = useState<RegistrationState | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const { signUp } = useAuth();

  const validateForm = () => {
    const newErrors: typeof errors = {};

    // Username validation
    if (!username) {
      newErrors.username = 'Username is required';
    } else if (username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Email validation
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createUserProfile = async (
    userId: string,
    email: string,
    username: string,
    attempt = 0
  ): Promise<boolean> => {
    try {
      const { error } = await supabase.from('profiles').insert({
        id: userId,
        username,
        email,
        created_at: new Date().toISOString(),
      });

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error(`Profile creation attempt ${attempt + 1} failed:`, error);

      // If we haven't reached max retries, try again with exponential backoff
      if (attempt < 2) {
        // 3 total attempts (0, 1, 2)
        await delay(getBackoffDelay(attempt));
        return createUserProfile(userId, email, username, attempt + 1);
      }

      return false;
    }
  };

  const cleanupFailedRegistration = async (userId: string) => {
    try {
      // Call secure edge function to cleanup failed registration
      const { data, error } = await supabase.functions.invoke('cleanup-failed-registration', {
        body: { userId },
      });

      if (error) {
        console.error('Failed to cleanup registration:', error);
        return false;
      }

      // Check if the edge function returned success
      if (data?.success) {
        return true;
      }

      console.error('Edge function returned error:', data?.error);
      return false;
    } catch (error) {
      console.error('Error during cleanup:', error);
      return false;
    }
  };

  const handleProfileRetry = async () => {
    if (!registrationState) return;

    setIsRetrying(true);

    try {
      const success = await createUserProfile(
        registrationState.userId!,
        registrationState.email,
        registrationState.username
      );

      if (success) {
        setRegistrationState(null);
        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        // Update retry count
        const newRetryCount = registrationState.retryCount + 1;

        if (newRetryCount >= registrationState.maxRetries) {
          // Max retries reached, offer cleanup or support contact
          Alert.alert(
            'Registration Failed',
            'We were unable to complete your profile setup. Would you like us to clean up and start over, or contact support?',
            [
              {
                text: 'Start Over',
                style: 'destructive',
                onPress: async () => {
                  const cleanupSuccess = await cleanupFailedRegistration(registrationState.userId!);

                  if (cleanupSuccess) {
                    // Successfully cleaned up, reset form
                    setRegistrationState(null);
                    setEmail('');
                    setPassword('');
                    setUsername('');
                    setConfirmPassword('');
                    setErrors({});
                  } else {
                    // Cleanup failed, direct to support
                    setErrors({
                      username:
                        'Unable to clean up automatically. Please contact support with your email address for manual account cleanup.',
                    });
                  }
                },
              },
              {
                text: 'Contact Support',
                onPress: () => {
                  setErrors({
                    username:
                      'Please contact support with your email address for manual account setup.',
                  });
                },
              },
            ]
          );
        } else {
          setRegistrationState({
            ...registrationState,
            retryCount: newRetryCount,
          });

          if (Platform.OS === 'ios') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
        }
      }
    } catch (error) {
      console.error('Retry failed:', error);
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const handleCancelRecovery = () => {
    Alert.alert(
      'Cancel Registration',
      "This will clean up your account and you'll need to start over. Are you sure?",
      [
        { text: 'Keep Trying', style: 'cancel' },
        {
          text: 'Start Over',
          style: 'destructive',
          onPress: async () => {
            let cleanupSuccess = true; // Default to true if no cleanup needed

            if (registrationState?.userId) {
              cleanupSuccess = await cleanupFailedRegistration(registrationState.userId);

              if (!cleanupSuccess) {
                // If cleanup fails, still reset form but show support message
                setErrors({
                  username:
                    'Cleanup may have failed. If you encounter issues, please contact support.',
                });
              }
            }

            setRegistrationState(null);
            setEmail('');
            setPassword('');
            setUsername('');
            setConfirmPassword('');
            // Only clear errors if cleanup was successful or no cleanup was needed
            if (cleanupSuccess) {
              setErrors({});
            }
          },
        },
      ]
    );
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    setIsLoading(true);
    setErrors({});
    setRegistrationState(null);

    try {
      // Register user with Supabase auth
      const { error, data } = await signUp(email, password);

      if (error) {
        setErrors({ email: error.message });
        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        return;
      }

      // If registration is successful, create a profile record
      if (data.user) {
        const profileSuccess = await createUserProfile(data.user.id, email, username);

        if (!profileSuccess) {
          // Set up recovery state
          setRegistrationState({
            userId: data.user.id,
            email,
            username,
            retryCount: 0,
            maxRetries: 3,
          });

          if (Platform.OS === 'ios') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
        } else {
          if (Platform.OS === 'ios') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ email: 'An unexpected error occurred during registration' });
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView variant="default" className="flex-1">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View className="flex-1 justify-center px-6 py-8">
            {/* Logo Section */}
            <Animated.View entering={FadeIn.duration(800)} className="mb-8 items-center">
              <View className="mb-6 h-20 w-20 items-center justify-center rounded-3xl bg-primary-500 shadow-lg dark:bg-primary-600">
                <Ionicons name="leaf" size={32} className="text-white" />
              </View>
              <ThemedText variant="heading" className="text-4xl font-black tracking-tight">
                CanaBro
              </ThemedText>
              <ThemedText variant="muted" className="mt-2 text-center text-lg">
                Join the growing community
              </ThemedText>
            </Animated.View>

            {/* Error Recovery Banner */}
            <ErrorRecoveryBanner
              registrationState={registrationState}
              onRetry={handleProfileRetry}
              onCancel={handleCancelRecovery}
              isRetrying={isRetrying}
            />

            {/* Form Section */}
            <Animated.View entering={FadeInDown.duration(800).delay(400)}>
              <AnimatedInput
                icon="person"
                placeholder="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                editable={!isLoading && !isRetrying}
                error={errors.username}
              />

              <AnimatedInput
                icon="mail"
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading && !isRetrying}
                error={errors.email}
              />

              <AnimatedInput
                icon="lock-closed"
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!isLoading && !isRetrying}
                error={errors.password}
              />

              <PasswordStrength password={password} />

              <AnimatedInput
                icon="lock-closed"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                editable={!isLoading && !isRetrying}
                error={errors.confirmPassword}
              />

              {!registrationState && (
                <AnimatedButton
                  title="Create Account"
                  onPress={handleRegister}
                  loading={isLoading}
                  icon="person-add"
                  disabled={isRetrying}
                />
              )}
            </Animated.View>

            {/* Footer Link */}
            <Animated.View
              entering={FadeInDown.duration(800).delay(600)}
              className="mt-6 flex-row justify-center">
              <ThemedText variant="muted" className="text-base">
                Already have an account?{' '}
              </ThemedText>
              <Link href="/(auth)/login" asChild>
                <Pressable
                  disabled={isLoading || isRetrying}
                  accessible
                  accessibilityLabel="Go to login screen"
                  accessibilityRole="link">
                  <ThemedText className="text-base font-semibold text-primary-500 dark:text-primary-400">
                    Sign In
                  </ThemedText>
                </Pressable>
              </Link>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}
