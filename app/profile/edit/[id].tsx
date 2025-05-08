import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text, // Import Text
  KeyboardAvoidingView, // Import KeyboardAvoidingView
  Platform, // Import Platform for behavior prop
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ThemedText from '../../../components/ui/ThemedText';
import ThemedView from '../../../components/ui/ThemedView';
import { useTheme } from '../../../lib/contexts/ThemeContext';
import { useDatabase } from '../../../lib/hooks/useDatabase';
import { Profile } from '../../../lib/models/Profile';

// Define styles before components that use them
const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 16, // Apply horizontal padding here (p-4)
    paddingTop: 64, // Re-added paddingTop with a larger value (pt-16)
    paddingBottom: 100, // Increased paddingBottom significantly
  },
  inputBase: {
    // Can keep this empty or add non-Tailwind styles if ever needed
  },
  multilineInput: {
    // Keep multiline specific styles not handled by className
    textAlignVertical: 'top',
  },
});

// Basic Input component for reuse
interface FormInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
}

function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  numberOfLines = 1,
}: FormInputProps) {
  const { theme, isDarkMode } = useTheme();
  // Removed inputStyle state
  // Removed logging wrapper

  return (
    // Increase bottom margin even further
    <View className="mb-8">
      <ThemedText
        className="mb-1 text-sm font-medium"
        lightClassName="text-neutral-700"
        darkClassName="text-neutral-300">
        {label}
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText} // Reverted to original handler
        placeholder={placeholder}
        placeholderTextColor={theme.colors.neutral[isDarkMode ? 400 : 500]}
        multiline={multiline}
        numberOfLines={multiline ? numberOfLines : 1}
        style={[
          styles.inputBase, // Keep base style if needed, though likely empty now
          multiline && styles.multilineInput, // Apply multiline specific styles
        ]}
        // Apply styling via className, remove comments, handle text-top via style
        className={`
           rounded-lg border p-3 text-base
           ${multiline ? 'h-24' : ''}
           border-neutral-300 bg-neutral-100 text-neutral-900
           dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50
         `}
      />
    </View>
  );
}

export default function EditProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const database = useDatabase();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [preferredGrowMethod, setPreferredGrowMethod] = useState('');
  const [growingSince, setGrowingSince] = useState<string>('');
  // TODO: Add state for array fields like favoriteStrains, certifications

  // Fetch profile data
  useEffect(() => {
    // Ensure database object and its 'database' property exist
    if (!id || !database?.database) return;

    // Access the actual database instance via database.database
    const profileCollection = database.database.get<Profile>('profiles');
    const subscription = profileCollection.findAndObserve(id).subscribe({
      next: (fetchedProfile: Profile | null) => {
        // Add type
        if (fetchedProfile) {
          // Only update the profile state here
          setProfile(fetchedProfile);
        } else {
          Alert.alert('Error', 'Profile not found.');
          router.back();
        }
        setIsLoading(false);
      },
      error: (error: Error) => {
        // Add type
        console.error('Error fetching profile:', error);
        Alert.alert('Error', 'Failed to load profile data.');
        setIsLoading(false);
        router.back();
      },
    });

    return () => subscription.unsubscribe();
  }, [id, database, router]); // Keep dependencies for subscription setup

  // New useEffect to initialize form state when profile changes
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setDisplayName(profile.displayName || '');
      setBio(profile.bio || '');
      setLocation(profile.location || '');
      setExperienceLevel(profile.experienceLevel || '');
      setPreferredGrowMethod(profile.preferredGrowMethod || '');

      // Format date to string if it exists, otherwise use empty string
      if (profile.growingSince) {
        const dateStr = profile.growingSince.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        setGrowingSince(dateStr || ''); // Handle potential undefined with empty string fallback
      } else {
        setGrowingSince('');
      }

      // TODO: Initialize array fields
    }
  }, [profile]); // Run only when the profile state object changes

  const handleSave = useCallback(async () => {
    // Keep the initial check for the database object and ensure id is present
    if (!id || !database?.database) {
      console.error('Save aborted: Missing ID or database instance.');
      Alert.alert('Error', 'Cannot save profile. Missing required information.');
      return;
    }

    setIsSaving(true);
    try {
      // Access write via database.database
      await database.database.write(async () => {
        // Fetch the profile *inside* the transaction using its ID
        const profileToUpdate = await database.database.get<Profile>('profiles').find(id);

        // Check if the profile was found within the transaction
        if (!profileToUpdate) {
          console.error('Profile not found within transaction for ID:', id);
          throw new Error('Profile could not be found for update.'); // Throw to trigger catch block
        }

        // Perform the update on the fetched record
        await profileToUpdate.update((p) => {
          p.username = username.trim();
          p.displayName = displayName.trim();
          p.bio = bio.trim();
          p.location = location.trim();
          p.experienceLevel = experienceLevel.trim();
          p.preferredGrowMethod = preferredGrowMethod.trim();

          // Convert string date to Date object if not empty
          if (growingSince.trim()) {
            p.growingSince = new Date(growingSince.trim());
          } else {
            p.growingSince = undefined;
          }

          // TODO: Update array fields
        });
      });
      Alert.alert('Success', 'Profile updated successfully!');
      router.back();
    } catch (error) {
      console.error('Error updating profile:', error);
      // Include error message in the alert for better debugging
      Alert.alert(
        'Error',
        `Failed to update profile. ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    database,
    id, // Use id instead of profile in dependencies
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
      <ThemedView className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        <ThemedText className="mt-2">Loading Profile...</ThemedText>
      </ThemedView>
    );
  } // Closing brace for the if(isLoading) block

  return (
    // Apply safe area to top and bottom edges
    <SafeAreaView className="bg-background flex-1 dark:bg-neutral-900" edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Wrap ScrollView with KeyboardAvoidingView */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        // Removed style={{ flex: 1 }} - SafeAreaView already provides flex: 1
        // Removed keyboardVerticalOffset as header is hidden
      >
        <ScrollView
          // Apply padding directly to contentContainerStyle
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled">
          {/* Wrap first input to add specific top margin */}
          <View className="mt-6">
            <FormInput
              label="Username"
              value={username}
              onChangeText={setUsername}
              placeholder="Your public username"
            />
          </View>

          <FormInput
            label="Display Name"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your display name (optional)"
          />

          <FormInput
            label="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about yourself"
            multiline
            numberOfLines={4}
          />
          <FormInput
            label="Location"
            value={location}
            onChangeText={setLocation}
            placeholder="City, Country (optional)"
          />
          <FormInput
            label="Experience Level"
            value={experienceLevel}
            onChangeText={setExperienceLevel}
            placeholder="e.g., Beginner, Intermediate, Expert"
          />
          <FormInput
            label="Preferred Grow Method"
            value={preferredGrowMethod}
            onChangeText={setPreferredGrowMethod}
            placeholder="e.g., Soil, Hydroponics, Coco"
          />
          <FormInput
            label="Growing Since"
            value={growingSince}
            onChangeText={setGrowingSince}
            placeholder="e.g., 2020, 5 years"
          />

          {/* TODO: Add inputs for favoriteStrains, certifications (maybe multi-select or tag input) */}

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            className="mt-6 h-12 items-center justify-center rounded-full bg-primary-500 active:opacity-80 dark:bg-primary-600"
            accessibilityLabel="Save Profile Changes"
            accessibilityRole="button">
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-base font-semibold text-white">Save Changes</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
} // Added missing closing brace for EditProfileScreen
