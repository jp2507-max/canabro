import { parseISO, isValid } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  FadeIn,
  FadeInDown,
  SlideInDown,
  interpolateColor,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import ThemedText from '../../../components/ui/ThemedText';
import ThemedView from '../../../components/ui/ThemedView';
import { useDatabase } from '../../../lib/hooks/useDatabase';
import { Profile } from '../../../lib/models/Profile';

// Animated Input Component
interface AnimatedInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
  index?: number;
  error?: string;
}

const AnimatedInput: React.FC<AnimatedInputProps> = React.memo(
  ({
    label,
    value,
    onChangeText,
    placeholder,
    multiline = false,
    numberOfLines = 1,
    index = 0,
    error,
  }) => {
    const focusProgress = useSharedValue(0);
    const errorShake = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => {
      const borderColor = interpolateColor(
        focusProgress.value,
        [0, 1],
        ['rgb(212 212 212)', 'rgb(34 197 94)'] // neutral-300 to primary-500
      );

      return {
        borderColor,
        transform: [{ translateX: errorShake.value }],
      };
    });

    const handleFocus = () => {
      focusProgress.value = withSpring(1, { damping: 15, stiffness: 400 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleBlur = () => {
      focusProgress.value = withSpring(0, { damping: 15, stiffness: 400 });
    };

    useEffect(() => {
      if (error) {
        errorShake.value = withSequence(
          withSpring(-10, { damping: 10, stiffness: 1000 }),
          withSpring(10, { damping: 10, stiffness: 1000 }),
          withSpring(-5, { damping: 10, stiffness: 1000 }),
          withSpring(0, { damping: 10, stiffness: 1000 })
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }, [error]);

    return (
      <Animated.View entering={FadeInDown.delay(index * 100).duration(600)} className="mb-6">
        <ThemedText
          variant="caption"
          className="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          {label}
        </ThemedText>
        <Animated.View style={animatedStyle}>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            placeholderTextColor="rgb(156 163 175)" // neutral-400
            multiline={multiline}
            numberOfLines={multiline ? numberOfLines : 1}
            style={{
              textAlignVertical: multiline ? 'top' : 'center',
            }}
            className={`
            rounded-2xl border-2 p-4 text-base font-medium
            ${multiline ? 'h-24' : 'h-14'}
            bg-white text-neutral-900 
            dark:bg-neutral-800 dark:text-neutral-100
          `}
            accessibilityLabel={`${label} input field`}
            accessibilityHint={placeholder}
          />
        </Animated.View>
        {error && (
          <Animated.View entering={FadeIn.duration(300)}>
            <ThemedText variant="muted" className="mt-2 text-sm text-red-500 dark:text-red-400">
              {error}
            </ThemedText>
          </Animated.View>
        )}
      </Animated.View>
    );
  }
);

// Animated Save Button Component
interface AnimatedSaveButtonProps {
  onPress: () => void;
  isLoading: boolean;
}

const AnimatedSaveButton: React.FC<AnimatedSaveButtonProps> = React.memo(
  ({ onPress, isLoading }) => {
    const scale = useSharedValue(1);
    const shadowOpacity = useSharedValue(0.15);

    const pressGesture = Gesture.Tap()
      .onBegin(() => {
        scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
        shadowOpacity.value = withSpring(0.25);
      })
      .onFinalize(() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
        shadowOpacity.value = withSpring(0.15);
      })
      .onEnd(() => {
        if (!isLoading) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onPress();
        }
      });

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      shadowOpacity: shadowOpacity.value,
    }));

    return (
      <GestureDetector gesture={pressGesture}>
        <Animated.View
          entering={SlideInDown.delay(600).duration(700)}
          style={animatedStyle}
          className="mt-8 h-14 rounded-2xl bg-primary-500 shadow-lg shadow-primary-500/25 dark:bg-primary-600">
          <Pressable
            // Pressable kept only for accessibility/ink-ripple; logic lives in the gesture
            disabled={isLoading}
            className="h-full items-center justify-center rounded-2xl"
            accessibilityLabel="Save Profile Changes"
            accessibilityRole="button">
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <ThemedText className="text-base font-bold text-white">Save Changes</ThemedText>
            )}
          </Pressable>
        </Animated.View>
      </GestureDetector>
    );
  }
);

export default function EditProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const database = useDatabase();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [preferredGrowMethod, setPreferredGrowMethod] = useState('');
  const [growingSince, setGrowingSince] = useState<string>('');

  // Validation function
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!username.trim()) {
      newErrors.username = 'Username is required';
    } else if (username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (bio.length > 500) {
      newErrors.bio = 'Bio must be less than 500 characters';
    }

    // Growing-since must be empty or a valid ISO-date
    if (growingSince.trim()) {
      const isoDatePattern = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
      if (!isoDatePattern.test(growingSince.trim())) {
        newErrors.growingSince = 'Date must be in YYYY-MM-DD format';
      } else {
        // Use parseISO with isValid for stricter validation
        const parsedDate = parseISO(growingSince.trim());
        if (!isValid(parsedDate)) {
          newErrors.growingSince = "Invalid date (e.g., February 30th doesn't exist)";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Fetch profile data
  useEffect(() => {
    if (!id || !database?.database) return;

    const profileCollection = database.database.get<Profile>('profiles');
    const subscription = profileCollection.findAndObserve(id).subscribe({
      next: (fetchedProfile: Profile | null) => {
        if (fetchedProfile) {
          setProfile(fetchedProfile);
        } else {
          Alert.alert('Error', 'Profile not found.');
          router.back();
        }
        setIsLoading(false);
      },
      error: (error: Error) => {
        console.error('Error fetching profile:', error);
        Alert.alert('Error', 'Failed to load profile data.');
        setIsLoading(false);
        router.back();
      },
    });

    return () => subscription.unsubscribe();
  }, [id, database, router]);

  // Initialize form state when profile changes
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setDisplayName(profile.displayName || '');
      setBio(profile.bio || '');
      setLocation(profile.location || '');
      setExperienceLevel(profile.experienceLevel || '');
      setPreferredGrowMethod(profile.preferredGrowMethod || '');

      if (profile.growingSince) {
        const dateStr = profile.growingSince.toISOString().split('T')[0];
        setGrowingSince(dateStr || '');
      } else {
        setGrowingSince('');
      }
    }
  }, [profile]);

  const handleSave = useCallback(async () => {
    if (!validateForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (!id || !database?.database) {
      Alert.alert('Error', 'Cannot save profile. Missing required information.');
      return;
    }

    setIsSaving(true);
    try {
      await database.database.write(async () => {
        const profileToUpdate = await database.database.get<Profile>('profiles').find(id);

        if (!profileToUpdate) {
          throw new Error('Profile could not be found for update.');
        }

        await profileToUpdate.update((p) => {
          p.username = username.trim();
          p.displayName = displayName.trim();
          p.bio = bio.trim();
          p.location = location.trim();
          p.experienceLevel = experienceLevel.trim();
          p.preferredGrowMethod = preferredGrowMethod.trim();

          if (growingSince.trim()) {
            const parsedDate = parseISO(growingSince.trim());
            // Use parseISO with isValid for stricter validation
            if (isValid(parsedDate)) {
              p.growingSince = parsedDate;
            } else {
              p.growingSince = undefined;
            }
          } else {
            p.growingSince = undefined;
          }
        });
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Profile updated successfully!');
      router.back();
    } catch (error) {
      console.error('Error updating profile:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Error',
        `Failed to update profile. ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    database,
    id,
    router,
    username,
    displayName,
    bio,
    location,
    experienceLevel,
    preferredGrowMethod,
    growingSince,
  ]);

  if (isLoading) {
    return (
      <ThemedView
        variant="default"
        className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-900">
        <Animated.View entering={FadeIn.duration(600)}>
          <ActivityIndicator size="large" color="rgb(34 197 94)" />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <ThemedText variant="muted" className="mt-4 text-base">
            Loading Profile...
          </ThemedText>
        </Animated.View>
      </ThemedView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Animated Header */}
      <Animated.View entering={FadeInDown.delay(100).duration(600)} className="px-6 pb-2 pt-4">
        <ThemedText
          variant="heading"
          className="text-2xl font-extrabold text-neutral-900 dark:text-neutral-100">
          Edit Profile
        </ThemedText>
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1">
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 120,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <AnimatedInput
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="Your public username"
            index={0}
            error={errors.username}
          />

          <AnimatedInput
            label="Display Name"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your display name (optional)"
            index={1}
          />

          <AnimatedInput
            label="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about yourself"
            multiline
            numberOfLines={4}
            index={2}
            error={errors.bio}
          />

          <AnimatedInput
            label="Location"
            value={location}
            onChangeText={setLocation}
            placeholder="City, Country (optional)"
            index={3}
          />

          <AnimatedInput
            label="Experience Level"
            value={experienceLevel}
            onChangeText={setExperienceLevel}
            placeholder="e.g., Beginner, Intermediate, Expert"
            index={4}
          />

          <AnimatedInput
            label="Preferred Grow Method"
            value={preferredGrowMethod}
            onChangeText={setPreferredGrowMethod}
            placeholder="e.g., Soil, Hydroponics, Coco"
            index={5}
          />

          <AnimatedInput
            label="Growing Since"
            value={growingSince}
            onChangeText={setGrowingSince}
            placeholder="YYYY-MM-DD"
            index={6}
            error={errors.growingSince}
          />

          <AnimatedSaveButton onPress={handleSave} isLoading={isSaving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
