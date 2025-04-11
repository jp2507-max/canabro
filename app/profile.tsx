import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Database } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import { Stack, useRouter } from 'expo-router';
import React, { ComponentType, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
  Text, // Added Text import
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { of as of$ } from 'rxjs'; // Import Observable
import { switchMap, catchError } from 'rxjs/operators'; // Import catchError

import StorageImage from '../components/ui/StorageImage'; // Added StorageImage
import ThemeToggle from '../components/ui/ThemeToggle';
import ThemedText from '../components/ui/ThemedText';
import ThemedView from '../components/ui/ThemedView';
import { useAuth } from '../lib/contexts/AuthProvider';
import { useTheme } from '../lib/contexts/ThemeContext';
import usePullToRefresh from '../lib/hooks/usePullToRefresh';
import { Profile } from '../lib/models/Profile';
import { resetDatabase, checkRecordExistsLocally } from '../lib/utils/database';

interface ProfileDetailProps {
  label: string;
  value?: string | string[] | null;
  icon?: keyof typeof Ionicons.glyphMap;
}

function ProfileDetail({ label, value, icon }: ProfileDetailProps) {
  const { isDarkMode, theme } = useTheme();
  const displayValue = value || 'Not specified';
  const hasValue = value && (Array.isArray(value) ? value.length > 0 : true);

  return (
    <ThemedView
      className="mb-3 rounded-lg p-3" // Reduced margin, padding, rounded-lg
      lightClassName="bg-neutral-100" // Lighter background
      darkClassName="bg-neutral-800">
      <View className="mb-1.5 flex-row items-center">
        {icon && (
          <Ionicons
            name={icon}
            size={18} // Slightly smaller icon
            color={isDarkMode ? theme.colors.primary[400] : theme.colors.primary[600]}
            style={{ marginRight: 6 }}
          />
        )}
        <ThemedText
          className="text-xs font-medium uppercase tracking-wide" // Smaller, less bold label
          lightClassName="text-neutral-500"
          darkClassName="text-neutral-400">
          {label}
        </ThemedText>
      </View>

      {Array.isArray(displayValue) ? (
        <View className="-mb-1 -mr-1 flex-row flex-wrap">
          {hasValue ? (
            displayValue.map((item, index) => (
              <ThemedView
                key={index}
                className="mb-1 mr-1 rounded-full px-2.5 py-0.5" // Smaller tags
                lightClassName="bg-primary-100"
                darkClassName="bg-primary-800">
                <ThemedText
                  className="text-xs" // Smaller text
                  lightClassName="text-primary-700"
                  darkClassName="text-primary-200">
                  {item || ''}
                </ThemedText>
              </ThemedView>
            ))
          ) : (
            <ThemedText
              className="text-sm italic" // Italic for 'None'
              lightClassName="text-neutral-500"
              darkClassName="text-neutral-500">
              None specified
            </ThemedText>
          )}
        </View>
      ) : (
        <ThemedText
          className={`text-sm ${!hasValue ? 'italic' : ''}`} // Smaller text, italic if no value
          lightClassName={hasValue ? 'text-neutral-700' : 'text-neutral-500'}
          darkClassName={hasValue ? 'text-neutral-200' : 'text-neutral-500'}>
          {displayValue}
        </ThemedText>
      )}
    </ThemedView>
  );
}

interface StatItemProps {
  value: number | string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

function StatItem({ value, label, icon }: StatItemProps) {
  const { isDarkMode, theme } = useTheme();

  return (
    <ThemedView
      className="mx-1.5 flex-1 items-center rounded-lg p-3" // Adjusted padding, margin, rounding
      lightClassName="bg-neutral-100" // Lighter background
      darkClassName="bg-neutral-800">
      <Ionicons
        name={icon}
        size={22} // Slightly smaller icon
        color={isDarkMode ? theme.colors.primary[400] : theme.colors.primary[600]}
        style={{ marginBottom: 6 }}
      />
      <ThemedText
        className="text-lg font-semibold tracking-tight" // Smaller, less bold value
        lightClassName="text-neutral-800"
        darkClassName="text-neutral-100">
        {String(value)}
      </ThemedText>
      <ThemedText
        className="mt-0.5 text-xs uppercase tracking-wide" // Smaller, uppercase label
        lightClassName="text-neutral-500"
        darkClassName="text-neutral-400">
        {label}
      </ThemedText>
    </ThemedView>
  );
}

// Base component - receives profile and counts directly from HOC
// Props should match the resolved types from EnhancedProps
interface ProfileScreenBaseProps {
  profile: Profile | null;
  plantsCount: number; // Expect number, not undefined
  postsCount: number; // Expect number, not undefined
}

function ProfileScreenBase({
  profile,
  plantsCount, // Use directly
  postsCount, // Use directly
}: ProfileScreenBaseProps) {
  const { signOut } = useAuth(); // Get user for profile ID check
  const { theme, isDarkMode } = useTheme();
  const router = useRouter();
  // Removed imageError state, handled by StorageImage

  const { refreshing, handleRefresh } = usePullToRefresh({
    showFeedback: true,
    forceSync: true, // Keep forceSync for profile data
  });

  // Removed nullish coalescing - HOC provides numbers
  // const plantsCount = initialPlantsCount ?? 0;
  // const postsCount = initialPostsCount ?? 0;

  const handleEditProfile = useCallback(() => {
    // Ensure we have a profile ID before navigating
    if (profile?.id) {
      router.push(`/profile/edit/${profile.id}` as any); // Pass profile ID
    } else {
      Alert.alert('Error', 'Cannot edit profile without a valid ID.');
    }
  }, [router, profile?.id]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      Alert.alert('Error Signing Out', error instanceof Error ? error.message : 'Please try again');
    }
  }, [signOut]);

  // Removed handleAvatarError, handled by StorageImage

  // Improved loading state
  if (!profile) {
    return (
      <ThemedView
        className="flex-1 items-center justify-center p-4"
        lightClassName="bg-background"
        darkClassName="bg-darkBackground">
        <ActivityIndicator size="large" color={theme.colors.primary[isDarkMode ? 400 : 500]} />
        <ThemedText
          className="mt-3 text-base"
          lightClassName="text-neutral-600"
          darkClassName="text-neutral-400">
          Loading Profile...
        </ThemedText>
      </ThemedView>
    );
  }

  const joinDate = profile.createdAt;
  const formattedJoinDate = joinDate
    ? joinDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Unknown';

  // Use StorageImage component
  const avatarUrl = profile.avatarUrl;

  return (
    <SafeAreaView className="bg-background flex-1 dark:bg-neutral-900" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary[500]]}
            tintColor={theme.colors.primary[isDarkMode ? 400 : 600]}
          />
        }>
        {/* Header */}
        <ThemedView
          className="flex-row items-center justify-between border-b p-4"
          lightClassName="border-neutral-200"
          darkClassName="border-neutral-700">
          <ThemedText
            className="text-xl font-bold tracking-tight"
            lightClassName="text-neutral-800"
            darkClassName="text-neutral-100">
            My Profile
          </ThemedText>
          <View className="flex-row items-center space-x-2">
            <ThemeToggle compact showLabel={false} />
            <TouchableOpacity
              onPress={handleSignOut}
              className="rounded-full p-2 active:opacity-70"
              accessibilityLabel="Sign Out"
              accessibilityRole="button"
              accessibilityHint="Logs you out of the application">
              <Ionicons
                name="log-out-outline"
                size={24} // Slightly smaller icon
                color={theme.colors.status.danger} // Use theme color directly
              />
            </TouchableOpacity>
          </View>
        </ThemedView>

        {/* Profile Header Section */}
        <ThemedView
          className="items-center p-6 pb-8" // Increased bottom padding
          lightClassName="bg-neutral-50" // Lighter background
          darkClassName="bg-neutral-800">
          <View className="relative mb-4">
            <StorageImage
              url={avatarUrl || null} // Ensure null is passed if undefined
              width={120} // Slightly smaller avatar
              height={120}
              borderRadius={60} // Keep it circular
              contentFit="cover"
              fallbackIconName="person-circle-outline" // More appropriate fallback
              fallbackIconSize={60}
              accessibilityLabel={`${profile.username || 'User'}'s profile picture`}
            />
            {/* Edit avatar button - positioned slightly differently */}
            <TouchableOpacity
              onPress={handleEditProfile} // Re-using edit profile for simplicity
              className="absolute -bottom-1 -right-1 h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-primary-500 active:opacity-80 dark:border-neutral-800" // Use dark: prefix
              accessibilityLabel="Edit profile picture"
              accessibilityRole="button">
              <Ionicons name="camera-outline" size={18} color="white" />
            </TouchableOpacity>
          </View>

          <ThemedText
            className="text-2xl font-bold tracking-tight"
            lightClassName="text-neutral-800"
            darkClassName="text-neutral-100">
            {profile.username || 'User'} {/* Removed fullName */}
          </ThemedText>
          {/* Removed conditional username display */}
          <ThemedText
            className="mt-1.5 text-xs" // Smaller text
            lightClassName="text-neutral-500"
            darkClassName="text-neutral-500">
            Member since {formattedJoinDate}
          </ThemedText>

          {/* Edit Profile Button - Refined Style */}
          <TouchableOpacity
            onPress={handleEditProfile}
            className="mt-5 flex-row items-center rounded-full border border-primary-500 bg-primary-500 px-5 py-2.5 active:opacity-80 dark:border-primary-400 dark:bg-transparent" // Use dark: prefix
            accessibilityLabel="Edit Profile"
            accessibilityRole="button"
            accessibilityHint="Opens the profile editing screen">
            <MaterialCommunityIcons
              name="account-edit-outline" // Outline icon
              size={16}
              color={isDarkMode ? theme.colors.primary[400] : 'white'}
              style={{ marginRight: 6 }}
            />
            <ThemedText
              className="text-sm font-medium" // Smaller font
              lightClassName="text-white"
              darkClassName="text-primary-400">
              Edit Profile
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {/* Stats Section */}
        <ThemedView
          className="mx-4 my-5" // Keep margins
          lightClassName="bg-transparent"
          darkClassName="bg-transparent">
          <View className="flex-row justify-around">
            {/* Removed problematic text node that was here */}
            <StatItem value={plantsCount} label="Plants" icon="leaf-outline" />
            <StatItem value={postsCount} label="Posts" icon="chatbubble-ellipses-outline" />
            {/* Placeholder for Following - consider hiding if always 0 */}
            <StatItem value={0} label="Following" icon="people-outline" />
          </View>
        </ThemedView>

        {/* Bio Section - Improved Styling */}
        {profile.bio && (
          <ThemedView
            className="mx-4 mb-5 rounded-xl p-4" // Keep card style
            lightClassName="bg-white border border-neutral-200" // Add border for light mode
            darkClassName="bg-neutral-800">
            <ThemedText
              className="mb-1.5 text-sm font-semibold uppercase tracking-wider" // Match ProfileDetail label
              lightClassName="text-neutral-500"
              darkClassName="text-neutral-400">
              Bio
            </ThemedText>
            <ThemedText
              className="text-base leading-relaxed" // Better line height for readability
              lightClassName="text-neutral-700"
              darkClassName="text-neutral-300">
              {profile.bio}
            </ThemedText>
          </ThemedView>
        )}

        {/* Details Section - Grouped in a Card */}
        <ThemedView
          className="mx-4 mb-8 rounded-xl p-4" // Card style
          lightClassName="bg-white border border-neutral-200" // Add border for light mode
          darkClassName="bg-neutral-800">
          <ThemedText
            className="mb-4 text-base font-semibold" // Slightly smaller title
            lightClassName="text-neutral-700"
            darkClassName="text-neutral-200">
            Grower Details
          </ThemedText>

          <ProfileDetail
            label="Experience Level"
            value={profile.experienceLevel}
            icon="trophy-outline"
          />
          <ProfileDetail
            label="Preferred Method"
            value={profile.preferredGrowMethod}
            icon="flask-outline"
          />
          <ProfileDetail
            label="Favorite Strains"
            value={profile.getFavoriteStrains ? profile.getFavoriteStrains() : []}
            icon="leaf-outline"
          />
          <ProfileDetail label="Location" value={profile.location} icon="location-outline" />
          <ProfileDetail
            label="Growing Since"
            value={profile.growingSince}
            icon="calendar-outline"
          />
          <ProfileDetail
            label="Certifications"
            value={profile.getCertifications ? profile.getCertifications() : []}
            icon="ribbon-outline"
          />
        </ThemedView>

        {/* Debug section - Conditionally render or remove for production */}
        {__DEV__ && ( // Only show in development mode
          <View className="mx-4 my-4 items-center border-t border-neutral-400 pt-4 dark:border-neutral-600">
            <ThemedText className="mb-3 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              Debug Tools (Dev Only)
            </ThemedText>
            <TouchableOpacity
              onPress={() =>
                checkRecordExistsLocally('plants', '21b50a5d-7e47-495e-ac52-83ab56e0c2ae')
              }
              className="mb-2 rounded-lg bg-blue-600 px-4 py-2 active:opacity-70">
              <Text className="font-semibold text-white">Check Plant Exists</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={resetDatabase}
              className="mb-2 rounded-lg bg-orange-600 px-4 py-2 active:opacity-70">
              <Text className="font-semibold text-white">Reset Local DB</Text>
            </TouchableOpacity>
            <ThemedText className="text-center text-xs text-neutral-500 dark:text-neutral-500">
              (Use if sync issues persist. Clears local data.)
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Data Fetching HOC ---
interface ProfileContainerProps {
  userId: string;
}

// Removed ProfileObservables type definition

// Simplify HOC call - remove explicit generics, let TS infer
const enhance = withObservables(
  ['userId'], // Observe changes to userId
  ({ userId }: ProfileContainerProps) => {
    // Dynamically require database inside the function to avoid potential circular dependencies
    // or issues during initialization.
    const getDb = () => require('../lib/database/database').default as Database;
    let db: Database | null = null;
    try {
      db = getDb();
    } catch (e) {
      console.error('[Profile enhance] Failed to get Database instance:', e);
      // Return observables emitting default/error values if DB fails
      return {
        profile: of$(null),
        plantsCount: of$(0),
        postsCount: of$(0),
      };
    }

    if (!db) {
      console.error('[Profile enhance] Database instance is null after require.');
      return {
        profile: of$(null),
        plantsCount: of$(0),
        postsCount: of$(0),
      };
    }

    try {
      // Observe the profile, handling potential errors within the observable pipeline
      const profileObservable = db
        .get<Profile>('profiles')
        .findAndObserve(userId)
        .pipe(
          catchError((error) => {
            console.error(`[Profile enhance] Error observing profile for userId ${userId}:`, error);
            return of$(null); // Emit null if observation fails
          })
        ); // This now returns Observable<Profile | null>

      // Observe counts based on the profile (which might be null)
      // Use switchMap to switch to the count observable when the profile emits
      // Use of$(0) as a fallback if the profile is null or doesn't exist
      const plantsCountObservable = profileObservable.pipe(
        switchMap((p: Profile | null) => (p ? p.plants.observeCount(false) : of$(0))) // isExpensive = false
      );
      const postsCountObservable = profileObservable.pipe(
        switchMap((p: Profile | null) => (p ? p.posts.observeCount(false) : of$(0))) // isExpensive = false
      );

      return {
        profile: profileObservable,
        plantsCount: plantsCountObservable,
        postsCount: postsCountObservable,
      };
    } catch (error) {
      // Catch potential errors during initial DB access or setup (outside the observable pipeline)
      console.error(`[Profile enhance] Error setting up observables for userId ${userId}:`, error);
      // Return observables matching the structure expected by EnhancedProps keys
      return {
        profile: of$(null),
        plantsCount: of$(0),
        postsCount: of$(0),
      };
    }
    // Removed the outer try/catch block's return for profile: of$(null) as it's handled inside the pipe now.
  }
);

// --- Container Component ---
// This component gets the userId and passes it to the HOC
const ProfileScreenContainer: React.FC = () => {
  const { user } = useAuth();
  const { theme, isDarkMode } = useTheme(); // Get theme for loading state
  const userId = user?.id;

  // Improved Authentication Check / Loading State
  if (!userId) {
    return (
      <ThemedView
        className="flex-1 items-center justify-center p-4"
        lightClassName="bg-background"
        darkClassName="bg-neutral-900">
        <ActivityIndicator size="large" color={theme.colors.primary[isDarkMode ? 400 : 500]} />
        <ThemedText
          className="mt-3 text-base"
          lightClassName="text-neutral-600"
          darkClassName="text-neutral-400">
          Authenticating...
        </ThemedText>
      </ThemedView>
    );
  }

  // Apply the HOC to the base component
  // Reinstate explicit casting as it helps TS understand the prop transformation
  const EnhancedProfileScreen = enhance(
    ProfileScreenBase as ComponentType<ProfileScreenBaseProps> // Cast base component
  );

  // Render the enhanced component, passing the userId
  // The HOC removes userId and adds the enhanced props (profile, plantsCount, postsCount)
  return <EnhancedProfileScreen userId={userId} />; // Pass userId to the HOC wrapper
};

// Removed StyleSheet as NativeWind is used primarily
// const styles = StyleSheet.create({ ... });

export default ProfileScreenContainer;
