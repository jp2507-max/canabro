import { Ionicons } from '@expo/vector-icons';
import { Database } from '@nozbe/watermelondb'; // Re-add Database import
import { withObservables } from '@nozbe/watermelondb/react'; // Use HOC
import React, { ComponentType } from 'react'; // Import React
import {
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { of as of$ } from 'rxjs';
import { switchMap } from 'rxjs/operators'; // Import ComponentType for explicit typing

import ThemeToggle from '../components/ui/ThemeToggle';
import ThemedText from '../components/ui/ThemedText';
import ThemedView from '../components/ui/ThemedView';
import { useAuth } from '../lib/contexts/AuthProvider';
import { useTheme } from '../lib/contexts/ThemeContext';
import usePullToRefresh from '../lib/hooks/usePullToRefresh'; // Import the new hook
// import { useProtectedRoute } from '../lib/hooks/useProtectedRoute'; // Removed as HOC handles data loading
// import { useProfileData } from '../lib/hooks/useProfileData'; // Removed hook
// import useWatermelon from '../lib/hooks/useWatermelon'; // useWatermelon is unused
import { Profile } from '../lib/models/Profile'; // Import WatermelonDB Profile model
// --- Container Component ---
// Imports needed for observables in enhance HOC

// Helper component to render profile details (Keep as is)
interface ProfileDetailProps {
  label: string;
  value?: string | string[] | null;
}

function ProfileDetail({ label, value }: ProfileDetailProps) {
  // const { isDarkMode } = useTheme(); // isDarkMode is unused
  const displayValue = value || 'Not specified';

  return (
    <View className="mb-4">
      <ThemedText
        className="mb-1 text-sm font-semibold uppercase tracking-wider"
        lightClassName="text-muted-foreground"
        darkClassName="text-darkMutedForeground">
        {label}
      </ThemedText>
      {Array.isArray(displayValue) ? (
        <View className="flex-row flex-wrap">
          {displayValue.length > 0 ? (
            displayValue.map((item, index) => (
              <ThemedView
                key={index}
                className="mb-2 mr-2 rounded-full px-3 py-1"
                lightClassName="bg-secondary"
                darkClassName="bg-darkSecondary">
                <ThemedText
                  className="text-sm"
                  lightClassName="text-secondary-foreground"
                  darkClassName="text-darkSecondaryForeground">
                  {item || ''}
                </ThemedText>
              </ThemedView>
            ))
          ) : (
            <ThemedText
              className="text-base"
              lightClassName="text-foreground"
              darkClassName="text-darkForeground">
              None
            </ThemedText>
          )}
        </View>
      ) : (
        <ThemedText
          className="text-base"
          lightClassName="text-foreground"
          darkClassName="text-darkForeground">
          {displayValue}
        </ThemedText>
      )}
    </View>
  );
}

// Define the props for the base component (receives profile and counts from HOC)
interface ProfileScreenBaseProps {
  profile: Profile | null;
  plantsCount: number | undefined; // Allow undefined initially
  postsCount: number | undefined; // Allow undefined initially
}

// Base component - receives profile and counts directly from HOC
function ProfileScreenBase({
  profile,
  plantsCount: initialPlantsCount,
  postsCount: initialPostsCount,
}: ProfileScreenBaseProps) {
  const { signOut } = useAuth(); // user is unused
  const { theme, isDarkMode } = useTheme();
  const { refreshing, handleRefresh } = usePullToRefresh({
    showFeedback: true, // Provide visual feedback during refresh
    forceSync: true, // Trigger a full sync on refresh
  });

  // Provide default values for counts if undefined
  const plantsCount = initialPlantsCount ?? 0;
  const postsCount = initialPostsCount ?? 0;

  const handleSignOut = async () => {
    try {
      await signOut();
      // Optional: Navigate to login screen after sign out
      // router.replace('/(auth)/login');
    } catch (signOutError) {
      // Renamed error variable
      console.error('Sign out error:', signOutError);
      Alert.alert(
        'Error signing out',
        signOutError instanceof Error ? signOutError.message : 'Please try again'
      );
    }
  };

  const handleEditProfile = () => {
    // Navigate to the edit profile screen (implement later)
    console.log('Navigate to Edit Profile Screen');
    // router.push('/profile/edit'); // Example navigation
  };

  // Handle loading state (profile is null initially from withObservables)
  // Handle error state (profile might remain null, or HOC could pass an error prop if designed)
  if (!profile) {
    // Show loading indicator or a 'not found' message after a delay?
    // For simplicity, show loading initially, assuming profile will load.
    // If it stays null, it means not found or error.
    return (
      <ThemedView
        className="flex-1 items-center justify-center p-4"
        lightClassName="bg-background"
        darkClassName="bg-darkBackground">
        <ActivityIndicator
          size="large"
          color={isDarkMode ? theme.colors.primary[400] : theme.colors.primary[600]}
        />
        <ThemedText
          className="mt-2"
          lightClassName="text-muted-foreground"
          darkClassName="text-darkMutedForeground">
          Loading Profile...
        </ThemedText>
        {/* Consider adding a message if it remains null after a timeout */}
      </ThemedView>
    );
  }

  // Format join date from profile.createdAt (WatermelonDB model uses Date object)
  const joinDate = profile.createdAt; // Already a Date object
  const formattedJoinDate = joinDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <SafeAreaView className="flex-1">
      <ThemedView
        style={{ flex: 1 }}
        lightClassName="bg-background"
        darkClassName="bg-darkBackground">
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary[500]]}
              tintColor={isDarkMode ? theme.colors.primary[400] : theme.colors.primary[600]}
            />
          }>
          <View className="pb-20">
            {/* Header */}
            <ThemedView
              className="flex-row items-center justify-between border-b px-4 py-4" // Increased padding
              lightClassName="border-border"
              darkClassName="border-darkBorder">
              <ThemedText
                className="text-xl font-bold tracking-tight" // Added tracking
                lightClassName="text-foreground"
                darkClassName="text-darkForeground">
                My Profile
              </ThemedText>
              <View className="flex-row items-center space-x-3">
                {' '}
                {/* Increased spacing */}
                <ThemeToggle compact showLabel={false} />
                <TouchableOpacity
                  onPress={handleSignOut}
                  className="rounded-lg p-2 active:opacity-70" // Changed shape, added active state
                  accessibilityLabel="Sign Out"
                  accessibilityRole="button"
                  accessibilityHint="Logs you out of the application" // Added hint
                >
                  <Ionicons
                    name="log-out-outline"
                    size={26}
                    color={isDarkMode ? theme.colors.status.danger : theme.colors.status.danger}
                  />
                </TouchableOpacity>
              </View>
            </ThemedView>

            {/* Profile Info Section */}
            <ThemedView className="items-center p-6 pt-8">
              {' '}
              {/* Increased top padding */}
              <View className="relative mb-4">
                <Image
                  source={{ uri: profile.avatarUrl || 'https://via.placeholder.com/150' }}
                  className="h-28 w-28 rounded-full border-4" // Increased size and border
                  style={{
                    borderColor: isDarkMode ? theme.colors.primary[500] : theme.colors.primary[500],
                  }} // Consistent color
                  accessibilityLabel={`${profile.username}'s profile picture`} // More descriptive label
                  accessibilityRole="image"
                />
                {/* Optional: Add an edit icon overlay for avatar */}
              </View>
              <ThemedText
                className="mb-1 text-2xl font-bold tracking-tight" // Added tracking
                lightClassName="text-foreground"
                darkClassName="text-darkForeground">
                {profile.username}
              </ThemedText>
              <ThemedText
                className="mb-4 text-sm" // Added margin bottom
                lightClassName="text-muted-foreground"
                darkClassName="text-darkMutedForeground">
                Joined {formattedJoinDate}
              </ThemedText>
              <TouchableOpacity
                onPress={handleEditProfile}
                className="bg-primary dark:bg-darkPrimary mt-2 rounded-full px-6 py-2.5 shadow-sm active:opacity-80" // Adjusted padding, added shadow
                accessibilityLabel="Edit Profile"
                accessibilityRole="button"
                accessibilityHint="Navigates to the profile editing screen">
                <ThemedText
                  className="text-base font-semibold" // Increased font size
                  lightClassName="text-primary-foreground"
                  darkClassName="text-darkPrimaryForeground">
                  Edit Profile
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>

            {/* Stats Section */}
            <ThemedView
              className="mx-4 mb-8 flex-row justify-around rounded-lg p-5 shadow-md" // Increased margin, padding, roundedness, shadow
              lightClassName="bg-card"
              darkClassName="bg-darkCard">
              <View className="items-center px-2">
                {' '}
                {/* Added padding */}
                <ThemedText
                  className="text-2xl font-bold tracking-tight" // Increased size, added tracking
                  lightClassName="text-foreground"
                  darkClassName="text-darkForeground">
                  {String(plantsCount)}
                </ThemedText>
                <ThemedText
                  className="mt-0.5 text-sm" // Added margin top
                  lightClassName="text-muted-foreground"
                  darkClassName="text-darkMutedForeground">
                  Plants
                </ThemedText>
              </View>
              {/* Divider */}
              <ThemedView
                className="h-full w-px"
                lightClassName="bg-border"
                darkClassName="bg-darkBorder"
              />
              <View className="items-center px-2">
                {' '}
                {/* Added padding */}
                <ThemedText
                  className="text-2xl font-bold tracking-tight" // Increased size, added tracking
                  lightClassName="text-foreground"
                  darkClassName="text-darkForeground">
                  {String(postsCount)}
                </ThemedText>
                <ThemedText
                  className="mt-0.5 text-sm" // Added margin top
                  lightClassName="text-muted-foreground"
                  darkClassName="text-darkMutedForeground">
                  Posts
                </ThemedText>
              </View>
            </ThemedView>

            {/* Details Section */}
            <ThemedView
              className="mx-4 mb-8 rounded-lg p-5 shadow-md" // Increased margin, padding, roundedness, shadow
              lightClassName="bg-card"
              darkClassName="bg-darkCard">
              {/* Added a title for the details section */}
              <ThemedText
                className="mb-5 text-lg font-semibold"
                lightClassName="text-foreground"
                darkClassName="text-darkForeground">
                About Me
              </ThemedText>
              <ProfileDetail label="Bio" value={profile.bio} />
              <ProfileDetail label="Experience Level" value={profile.experienceLevel} />
              <ProfileDetail label="Preferred Grow Method" value={profile.preferredGrowMethod} />
              {/* Use helper methods for serialized fields with null checks */}
              <ProfileDetail
                label="Favorite Strains"
                value={profile.getFavoriteStrains ? profile.getFavoriteStrains() : []}
              />
              <ProfileDetail label="Location" value={profile.location} />
              <ProfileDetail label="Growing Since" value={profile.growingSince} />
              <ProfileDetail label="Certified" value={profile.isCertified ? 'Yes' : 'No'} />
              <ProfileDetail
                label="Certifications"
                value={profile.getCertifications ? profile.getCertifications() : []}
              />
            </ThemedView>
          </View>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

// --- HOC to fetch profile data and counts ---
// Define props expected by the HOC
interface ProfileContainerProps {
  userId: string;
}

const enhance = withObservables(
  ['userId'], // Inputs that trigger re-evaluation
  ({ userId }: ProfileContainerProps) => {
    // Get database instance
    const db = require('../lib/database/database').default as Database;

    // Check if database is available before trying to query
    if (!db) {
      console.error('[Profile enhance] Database instance is not available.');
      // Return an empty object or an observable of null/empty array
      return { profile: null }; // Or potentially: { profile: of$(null) } if using RxJS explicitly
    }

    try {
      // Query for the profile based on userId
      // IMPORTANT: Check how your Profile model is identified.
      // Option 1: If the WatermelonDB record ID *is* the Supabase user ID:
      const profileQuery = db.get<Profile>('profiles').findAndObserve(userId);

      // Option 2: If the WatermelonDB record ID is different, and you have a 'user_id' column:
      // const profileQuery = db.get<Profile>('profiles')
      //   .query(Q.where('user_id', userId), Q.take(1)) // Ensure only one result
      //   .observe()
      //   .query(Q.where('user_id', userId), Q.take(1))
      //   .observe()
      //   .pipe(switchMap(results => of$(results[0] || null))); // Example if using user_id column

      // profileQuery is already an observable from findAndObserve
      const profileObservable = profileQuery; // No need for .observe()

      // Observe counts using switchMap, correctly handling potential null profile
      const plantsCountObservable = profileObservable.pipe(
        switchMap((p: Profile | null) => (p ? p.plants.observeCount() : of$(0))) // Explicitly type p
      );
      const postsCountObservable = profileObservable.pipe(
        switchMap((p: Profile | null) => (p ? p.posts.observeCount() : of$(0))) // Explicitly type p
      );

      return {
        profile: profileObservable, // Pass the profile observable directly
        plantsCount: plantsCountObservable,
        postsCount: postsCountObservable,
      };
    } catch (error) {
      console.error(`[Profile enhance] Error setting up observables for userId ${userId}:`, error);
      // Return observables of null/0 in case of error
      return {
        profile: of$(null),
        plantsCount: of$(0),
        postsCount: of$(0),
      };
    }
  }
);

// Manages getting the userId and rendering the enhanced component
const ProfileScreenContainer: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id;

  // If no user session, show authenticating message or redirect
  if (!userId) {
    return (
      <ThemedView
        className="flex-1 items-center justify-center p-4"
        lightClassName="bg-background"
        darkClassName="bg-darkBackground">
        <ThemedText
          className="text-center text-lg"
          lightClassName="text-muted-foreground"
          darkClassName="text-darkMutedForeground">
          Authenticating...
        </ThemedText>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  // Enhance the base component
  // Need to cast ProfileScreenBase because enhance adds props that aren't in ProfileScreenBaseProps
  const EnhancedProfileScreen = enhance(
    ProfileScreenBase as ComponentType<ProfileScreenBaseProps & ProfileContainerProps>
  );

  return <EnhancedProfileScreen userId={userId} />;
};

// Export the container component as the default export for this screen
export default ProfileScreenContainer;
