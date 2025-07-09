import { parseISO, isValid } from '@/lib/utils/date';
import {
  triggerMediumHapticSync,
  triggerSuccessHaptic,
  triggerErrorHaptic,
} from '@/lib/utils/haptics';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TextInput, ActivityIndicator, Alert, Pressable, ScrollView, Keyboard } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeInDown,
  SlideInDown,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EnhancedTextInput } from '@/components/ui/EnhancedTextInput';
import ThemedText from '@/components/ui/ThemedText';
import ThemedView from '@/components/ui/ThemedView';
import { useDatabase } from '@/lib/hooks/useDatabase';
import { Profile } from '@/lib/models/Profile';
import EnhancedKeyboardWrapper from '@/components/keyboard/EnhancedKeyboardWrapper';

// Enhanced Profile Edit Component with Keyboard Management

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
          triggerMediumHapticSync();
          onPress();
        }
      });

    const animatedStyle = useAnimatedStyle(() => {
      'worklet';
      return {
        transform: [{ scale: scale.value }],
        shadowOpacity: shadowOpacity.value,
      };
    });

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

  // Enhanced keyboard management for 7 form fields
  const usernameRef = useRef<TextInput>(null);
  const displayNameRef = useRef<TextInput>(null);
  const bioRef = useRef<TextInput>(null);
  const locationRef = useRef<TextInput>(null);
  const experienceLevelRef = useRef<TextInput>(null);
  const preferredGrowMethodRef = useRef<TextInput>(null);
  const growingSinceRef = useRef<TextInput>(null);

  // Simplified keyboard handling – no advanced navigation
  const dismissKeyboard = () => Keyboard.dismiss();

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
        const dateStr = new Date(profile.growingSince).toISOString().split('T')[0];
        setGrowingSince(dateStr || '');
      } else {
        setGrowingSince('');
      }
    }
  }, [profile]);

  const handleSave = useCallback(async () => {
    if (!validateForm()) {
      triggerErrorHaptic();
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

        await profileToUpdate.update((p: Profile) => {
          p.username = username.trim();
          p.displayName = displayName.trim();
          p.bio = bio.trim();
          p.location = location.trim();
          p.experienceLevel = experienceLevel.trim();
          p.preferredGrowMethod = preferredGrowMethod.trim();

          if (growingSince.trim()) {
            const parsedDate = parseISO(growingSince.trim());
            if (isValid(parsedDate)) {
              p.growingSince = parsedDate.getTime(); // Convert to timestamp number
            } else {
              // This should not happen due to form validation, but handle gracefully
              console.error('Invalid date detected during save operation:', growingSince);
              throw new Error(
                'Invalid date format detected during save. Please check the date and try again.'
              );
            }
          } else {
            p.growingSince = undefined;
          }
        });
      });

      triggerSuccessHaptic();
      Alert.alert('Success', 'Profile updated successfully!');
      router.back();
    } catch (error) {
      console.error('Error updating profile:', error);
      triggerErrorHaptic();
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

      <EnhancedKeyboardWrapper className="flex-1" showToolbar={false}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 120,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <EnhancedTextInput
            ref={usernameRef}
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="Your public username"
            index={0}
            showCharacterCount={true}
            maxLength={30}
            error={errors.username}
            accessibilityLabel="Username input field"
            accessibilityHint="Enter your public username"
            returnKeyType="next"
            onSubmitEditing={() => dismissKeyboard()}
          />

          <EnhancedTextInput
            ref={displayNameRef}
            label="Display Name"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your display name (optional)"
            index={1}
            showCharacterCount={true}
            maxLength={50}
            accessibilityLabel="Display name input field"
            accessibilityHint="Enter your display name (optional)"
            returnKeyType="next"
            onSubmitEditing={() => dismissKeyboard()}
          />

          <EnhancedTextInput
            ref={bioRef}
            label="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about yourself"
            index={2}
            multiline={true}
            numberOfLines={4}
            showCharacterCount={true}
            maxLength={500}
            error={errors.bio}
            accessibilityLabel="Bio input field"
            accessibilityHint="Tell us about yourself"
            returnKeyType="next"
            onSubmitEditing={() => dismissKeyboard()}
          />

          <EnhancedTextInput
            ref={locationRef}
            label="Location"
            value={location}
            onChangeText={setLocation}
            placeholder="City, Country (optional)"
            index={3}
            showCharacterCount={true}
            maxLength={100}
            accessibilityLabel="Location input field"
            accessibilityHint="Enter your location (optional)"
            returnKeyType="next"
            onSubmitEditing={() => dismissKeyboard()}
          />

          <EnhancedTextInput
            ref={experienceLevelRef}
            label="Experience Level"
            value={experienceLevel}
            onChangeText={setExperienceLevel}
            placeholder="e.g., Beginner, Intermediate, Expert"
            index={4}
            showCharacterCount={true}
            maxLength={50}
            accessibilityLabel="Experience level input field"
            accessibilityHint="Enter your growing experience level"
            returnKeyType="next"
            onSubmitEditing={() => dismissKeyboard()}
          />

          <EnhancedTextInput
            ref={preferredGrowMethodRef}
            label="Preferred Grow Method"
            value={preferredGrowMethod}
            onChangeText={setPreferredGrowMethod}
            placeholder="e.g., Soil, Hydroponics, Coco"
            index={5}
            showCharacterCount={true}
            maxLength={50}
            accessibilityLabel="Preferred grow method input field"
            accessibilityHint="Enter your preferred growing method"
            returnKeyType="next"
            onSubmitEditing={() => dismissKeyboard()}
          />

          <EnhancedTextInput
            ref={growingSinceRef}
            label="Growing Since"
            value={growingSince}
            onChangeText={setGrowingSince}
            placeholder="YYYY-MM-DD"
            index={6}
            showCharacterCount={true}
            maxLength={10}
            error={errors.growingSince}
            accessibilityLabel="Growing since date input field"
            accessibilityHint="Enter the date you started growing (YYYY-MM-DD format)"
            returnKeyType="done"
            onSubmitEditing={() => dismissKeyboard()}
          />

          <AnimatedSaveButton onPress={handleSave} isLoading={isSaving} />
        </ScrollView>
      </EnhancedKeyboardWrapper>
    </SafeAreaView>
  );
}
