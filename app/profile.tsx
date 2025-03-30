import React from 'react'; // Import React
import { View, Text, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/contexts/AuthProvider';
// import { useProtectedRoute } from '../lib/hooks/useProtectedRoute'; // Removed as HOC handles data loading
// import { useProfileData } from '../lib/hooks/useProfileData'; // Removed hook
import { useTheme } from '../lib/contexts/ThemeContext';
import ThemeToggle from '../components/ui/ThemeToggle';
import ThemedView from '../components/ui/ThemedView';
import ThemedText from '../components/ui/ThemedText';
import { router } from 'expo-router';
// import { Profile } from '../lib/types/user'; // Use WatermelonDB Profile model instead

// WatermelonDB imports
import { withObservables, withDatabase, compose } from '@nozbe/watermelondb/react';
import { Q } from '@nozbe/watermelondb';
import { Database } from '@nozbe/watermelondb';
import { Profile } from '../lib/models/Profile'; // Import WatermelonDB Profile model
import { of as of$ } from 'rxjs'; // Import of from rxjs
import { switchMap } from 'rxjs/operators'; // Import switchMap operator

// Helper component to render profile details
interface ProfileDetailProps {
  label: string;
  value?: string | string[] | null;
}

function ProfileDetail({ label, value }: ProfileDetailProps) {
  const { isDarkMode } = useTheme();
  const displayValue = value || 'Not specified';

  return (
    <View className="mb-4">
      <ThemedText className="text-sm font-semibold uppercase tracking-wider mb-1"
                  lightClassName="text-muted-foreground"
                  darkClassName="text-darkMutedForeground">
        {label}
      </ThemedText>
      {Array.isArray(displayValue) ? (
        <View className="flex-row flex-wrap">
          {displayValue.map((item, index) => (
            <ThemedView key={index} className="rounded-full px-3 py-1 mr-2 mb-2"
                        lightClassName="bg-secondary"
                        darkClassName="bg-darkSecondary">
              <ThemedText className="text-sm"
                          lightClassName="text-secondary-foreground"
                          darkClassName="text-darkSecondaryForeground">
                {item}
              </ThemedText>
            </ThemedView>
          ))}
        </View>
      ) : (
        <ThemedText className="text-base"
                    lightClassName="text-foreground"
                    darkClassName="text-darkForeground">
          {displayValue}
        </ThemedText>
      )}
    </View>
  );
}

// Define the props injected by withObservables (temporarily removing counts)
interface InjectedProps {
  profiles: Profile[] | null; // Receives an array or null
  // plantsCount: number; // Temporarily removed
  // postsCount: number; // Temporarily removed
  // Database prop injected by withDatabase (optional if not used directly in component)
  // database: Database;
}

// Base component - receives data as props (temporarily removing counts)
function ProfileScreenBase({ profiles }: InjectedProps) { // Removed plantsCount, postsCount
  const { user, signOut } = useAuth(); // Get user from auth context
  const { theme, isDarkMode } = useTheme();

  // Define placeholder counts for now
  const plantsCount = 0;
  const postsCount = 0;

  // Extract the single profile from the array prop
  const profile = profiles && profiles.length > 0 ? profiles[0] : null;

  const handleSignOut = async () => {
    // No need to check userId prop anymore
    try {
      await signOut();
      // Optional: Navigate to login screen after sign out
      // router.replace('/(auth)/login');
    } catch (signOutError) { // Renamed error variable
      console.error("Sign out error:", signOutError);
      Alert.alert('Error signing out', signOutError instanceof Error ? signOutError.message : 'Please try again');
    }
  };

  const handleEditProfile = () => {
    // Navigate to the edit profile screen (implement later)
    console.log('Navigate to Edit Profile Screen');
    // router.push('/profile/edit'); // Example navigation
  };

  // Loading is implicitly handled by withObservables HOC (component won't render until data is ready)
  // Error handling from the hook is removed. Errors from observables might need different handling if required.

  // Check if profile exists (after HOC provides it)
  if (!profile) {
     return (
      <ThemedView className="flex-1 justify-center items-center p-4"
                  lightClassName="bg-background"
                  darkClassName="bg-darkBackground">
        {/* Can show a loading indicator here while HOC fetches, or a 'not found' message */}
        <ThemedText className="text-center text-lg"
                    lightClassName="text-muted-foreground"
                    darkClassName="text-darkMutedForeground">
          Loading profile or profile not found...
        </ThemedText>
        {/* Or use ActivityIndicator */}
        {/* <ActivityIndicator size="large" color={isDarkMode ? theme.colors.primary[400] : theme.colors.primary[600]} /> */}
      </ThemedView>
    );
  }

  // Format join date from profile.createdAt (WatermelonDB model uses Date object)
  const joinDate = profile.createdAt; // Already a Date object
  const formattedJoinDate = joinDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <SafeAreaView className="flex-1"> {/* Remove explicit style */}
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Header */}
        <ThemedView className="px-4 py-3 flex-row justify-between items-center border-b"
                    lightClassName="border-border"
                    darkClassName="border-darkBorder">
          <ThemedText className="text-xl font-bold"
                      lightClassName="text-foreground"
                      darkClassName="text-darkForeground">
            My Profile
          </ThemedText>
          <View className="flex-row items-center space-x-2">
            <ThemeToggle compact showLabel={false} />
            {/* Apply styling via className with dark: prefix */}
            <TouchableOpacity
              onPress={handleSignOut}
              className="p-2 rounded-full bg-destructive/10 dark:bg-darkDestructive/20"
              accessibilityLabel="Sign Out"
              accessibilityRole="button"
            >
              {/* Use theme.colors.status.danger based on TS error */}
              <Ionicons name="log-out-outline" size={24} color={isDarkMode ? theme.colors.status.danger : theme.colors.status.danger} />
            </TouchableOpacity>
          </View>
        </ThemedView>

        {/* Profile Info Section */}
        <ThemedView className="items-center p-6">
          <Image
            source={{ uri: profile.avatarUrl || 'https://via.placeholder.com/150' }} // Corrected property name
            className="w-24 h-24 rounded-full mb-4 border-2"
            style={{ borderColor: isDarkMode ? theme.colors.primary[400] : theme.colors.primary[600] }}
            accessibilityLabel="Profile picture"
            accessibilityRole="image"
          />
          <ThemedText className="text-2xl font-bold mb-1"
                      lightClassName="text-foreground"
                      darkClassName="text-darkForeground">
            {profile.username} {/* Assuming full_name isn't available yet */}
          </ThemedText>
          <ThemedText className="text-base"
                      lightClassName="text-muted-foreground"
                      darkClassName="text-darkMutedForeground">
            @{profile.username}
          </ThemedText>
          <ThemedText className="text-sm mt-1"
                      lightClassName="text-muted-foreground"
                      darkClassName="text-darkMutedForeground">
            Joined {formattedJoinDate}
          </ThemedText>
          {/* Apply styling via className with dark: prefix */}
          <TouchableOpacity
            onPress={handleEditProfile}
            className="mt-4 py-2 px-6 rounded-full bg-primary dark:bg-darkPrimary"
            accessibilityLabel="Edit Profile"
            accessibilityRole="button"
          >
            <ThemedText className="font-semibold"
                        lightClassName="text-primary-foreground"
                        darkClassName="text-darkPrimaryForeground">
              Edit Profile
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {/* Stats Section */}
        <ThemedView className="mx-4 mb-6 flex-row justify-around p-4 rounded-xl shadow-sm"
                    lightClassName="bg-card"
                    darkClassName="bg-darkCard">
          <View className="items-center">
            <ThemedText className="text-xl font-bold"
                        lightClassName="text-foreground"
                        darkClassName="text-darkForeground">
              {plantsCount} {/* Using placeholder */}
            </ThemedText>
            <ThemedText className="text-sm"
                        lightClassName="text-muted-foreground"
                        darkClassName="text-darkMutedForeground">
              Plants
            </ThemedText>
          </View>
          <View className="items-center">
            <ThemedText className="text-xl font-bold"
                        lightClassName="text-foreground"
                        darkClassName="text-darkForeground">
              {postsCount} {/* Using placeholder */}
            </ThemedText>
            <ThemedText className="text-sm"
                        lightClassName="text-muted-foreground"
                        darkClassName="text-darkMutedForeground">
              Posts
            </ThemedText>
          </View>
          {/* Removed Followers/Following section for now */}
          {/* <View className="items-center"> ... </View> */}
          {/* <View className="items-center"> ... </View> */}
        </ThemedView> {/* Added closing tag */}

        {/* Details Section */}
        <ThemedView className="mx-4 p-4 rounded-xl shadow-sm"
                    lightClassName="bg-card"
                    darkClassName="bg-darkCard">
          <ProfileDetail label="Bio" value={profile.bio} />
          <ProfileDetail label="Experience Level" value={profile.experienceLevel} />
          <ProfileDetail label="Preferred Grow Method" value={profile.preferredGrowMethod} />
          {/* Use helper methods for serialized fields */}
          <ProfileDetail label="Favorite Strains" value={profile.getFavoriteStrains()} />
          <ProfileDetail label="Location" value={profile.location} />
          <ProfileDetail label="Growing Since" value={profile.growingSince} />
          <ProfileDetail label="Certified" value={profile.isCertified ? 'Yes' : 'No'} />
          <ProfileDetail label="Certifications" value={profile.getCertifications()} />
        </ThemedView>

      </ScrollView>
    </SafeAreaView>
  );
}

// Define the enhancer HOC chain
// We need a small wrapper component to use the useAuth hook
// because HOC enhance functions don't have access to hooks directly.
const ProfileLoader: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id; // Get userId from context

  // If no user, render loading/error or redirect (adjust as needed)
  if (!userId) {
    return (
      <ThemedView className="flex-1 justify-center items-center p-4"
                  lightClassName="bg-background"
                  darkClassName="bg-darkBackground">
        <ThemedText className="text-center text-lg"
                    lightClassName="text-muted-foreground"
                    darkClassName="text-darkMutedForeground">
          Authenticating...
        </ThemedText>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  // Now enhance the base component, passing the fetched userId
  const EnhancedProfileScreen = enhance(ProfileScreenBase);
  return <EnhancedProfileScreen userId={userId} />; // Pass userId as prop here
}


// Define the HOCs for the base component (which now expects userId prop)
const enhance = compose(
  withDatabase, // First, inject the database prop
  // Second, observe the profile based on the userId prop passed from ProfileLoader
  withObservables(
    ['userId'], // Trigger re-fetch if userId changes
    ({ database, userId }: { database: Database; userId: string }) => {
      const profilesCollection = database.get<Profile>('profiles');

      if (!profilesCollection) {
        // This case should ideally not happen if DB init is correct, but let's handle it defensively.
        console.error("ProfileScreen HOC Error: database.get('profiles') returned undefined/null.");
        return { profile: of$(null) }; // Return an observable emitting null
      }

      // Collection exists, query by user_id and observe the array result directly
      return {
        // Observe the query result which yields Profile[]
        profiles: profilesCollection.query(Q.where('user_id', userId)).observe(),
      };
    }
  ),
  // Restore the second HOC, ensuring correct structure and dependency
  withObservables(
    ['profiles'], // Trigger re-fetch if profiles array changes
    ({ profiles }: { profiles: Profile[] | null }) => { // Define the function body correctly
       // Get the single profile from the array, if it exists
       const profile = profiles && profiles.length > 0 ? profiles[0] : null;
       // Return the observables for counts
       return {
         plantsCount: profile ? profile.plants.observeCount(false) : of$(0),
         postsCount: profile ? profile.posts.observeCount(false) : of$(0),
       };
    }
  )
);

// Export the ProfileLoader which handles auth and renders the enhanced component
export default ProfileLoader;
