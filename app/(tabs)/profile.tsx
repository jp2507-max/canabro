import { View, Text, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useAuth } from '../../lib/contexts/AuthProvider';
import { useProtectedRoute } from '../../lib/hooks/useProtectedRoute';
import { useState, useEffect } from 'react';
import supabase from '../../lib/supabase';
import { useTheme } from '../../lib/contexts/ThemeContext';
import ThemeToggle from '../../components/ui/ThemeToggle';
import ThemedView from '../../components/ui/ThemedView';
import ThemedText from '../../components/ui/ThemedText';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { isLoading } = useProtectedRoute();
  const { theme, isDarkMode } = useTheme();
  const [profile, setProfile] = useState({
    username: '',
    joinDate: '',
    plantsCount: 0,
    postsCount: 0,
    followersCount: 0,
    followingCount: 0
  });
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Fetch user profile data
  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;

      try {
        // First try to get the existing profile
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        // If no profile exists or there's an error, create a new profile
        if (error && error.code === 'PGRST116') {
          console.log('Profile not found, creating a new one');
          
          // Create a default profile with only the columns that exist
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([
              { 
                id: user.id,
                username: user.email?.split('@')[0] || 'User',
                created_at: new Date().toISOString(),
                full_name: '',
                avatar_url: '',
                bio: 'New CanaBro user'
              }
            ])
            .select()
            .single();
            
          if (createError) {
            console.error('Error creating profile:', createError);
            return;
          }
          
          // Use the newly created profile
          const joinDate = new Date(newProfile.created_at);
          const formattedDate = joinDate.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
          });

          setProfile({
            username: newProfile.username || 'User',
            joinDate: formattedDate,
            plantsCount: 0,
            postsCount: 0,
            followersCount: 0,
            followingCount: 0
          });
        } else if (error) {
          // Handle other errors
          console.error('Error fetching profile:', error);
        } else if (data) {
          // Format join date
          const joinDate = new Date(data.created_at);
          const formattedDate = joinDate.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
          });

          // Fetch counts from related tables
          const [plantsCount, postsCount, followersCount, followingCount] = await Promise.all([
            fetchPlantsCount(user.id),
            fetchPostsCount(user.id),
            fetchFollowersCount(user.id),
            fetchFollowingCount(user.id)
          ]);

          setProfile({
            username: data.username || 'User',
            joinDate: formattedDate,
            plantsCount,
            postsCount,
            followersCount,
            followingCount
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoadingProfile(false);
      }
    }

    // Helper function to fetch plants count (grow_journals)
    async function fetchPlantsCount(userId: string): Promise<number> {
      try {
        const { count, error } = await supabase
          .from('grow_journals')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId);
          
        if (error) {
          console.error('Error fetching plants count:', error);
          return 0;
        }
        
        return count || 0;
      } catch (error) {
        console.error('Error in fetchPlantsCount:', error);
        return 0;
      }
    }

    // Helper function to fetch posts count
    async function fetchPostsCount(userId: string): Promise<number> {
      try {
        const { count, error } = await supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId);
          
        if (error) {
          console.error('Error fetching posts count:', error);
          return 0;
        }
        
        return count || 0;
      } catch (error) {
        console.error('Error in fetchPostsCount:', error);
        return 0;
      }
    }

    // Helper function to fetch followers count
    async function fetchFollowersCount(userId: string): Promise<number> {
      try {
        const { count, error } = await supabase
          .from('follows')
          .select('follower_id', { count: 'exact', head: true })
          .eq('following_id', userId);
          
        if (error) {
          console.error('Error fetching followers count:', error);
          return 0;
        }
        
        return count || 0;
      } catch (error) {
        console.error('Error in fetchFollowersCount:', error);
        return 0;
      }
    }

    // Helper function to fetch following count
    async function fetchFollowingCount(userId: string): Promise<number> {
      try {
        const { count, error } = await supabase
          .from('follows')
          .select('following_id', { count: 'exact', head: true })
          .eq('follower_id', userId);
          
        if (error) {
          console.error('Error fetching following count:', error);
          return 0;
        }
        
        return count || 0;
      } catch (error) {
        console.error('Error in fetchFollowingCount:', error);
        return 0;
      }
    }

    fetchProfile();
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      Alert.alert('Error signing out', 'Please try again');
    }
  };

  if (isLoading || loadingProfile) {
    return (
      <ThemedView className="flex-1 justify-center items-center" 
                  lightClassName="bg-green-50" 
                  darkClassName="bg-neutral-900">
        <ActivityIndicator size="large" color="#10b981" />
      </ThemedView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.neutral[50] }}>
      <ScrollView>
        <ThemedView className="px-4 py-6">
          <View className="flex-row justify-between items-center">
            <ThemedText className="text-2xl font-bold" 
                        lightClassName="text-green-800" 
                        darkClassName="text-primary-400">
              My Profile
            </ThemedText>
            <View className="flex-row items-center">
              <ThemeToggle compact showLabel={false} />
              <TouchableOpacity 
                onPress={handleSignOut}
                className="bg-red-500 ml-2 px-4 py-2 rounded-full"
              >
                <Text className="text-white font-semibold">Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ThemedView className="mt-6 items-center">
            <ThemedView className="w-24 h-24 rounded-full justify-center items-center"
                        lightClassName="bg-green-200"
                        darkClassName="bg-primary-800">
              <Ionicons name="person" size={40} color={isDarkMode ? "#4ade80" : "#065f46"} />
            </ThemedView>
            <ThemedText className="mt-4 text-xl font-bold" 
                        lightClassName="text-green-800" 
                        darkClassName="text-primary-300">{profile.username}</ThemedText>
            <ThemedText className="" 
                        lightClassName="text-green-600" 
                        darkClassName="text-primary-400">Joined {profile.joinDate}</ThemedText>
          </ThemedView>

          <ThemedView className="mt-8 flex-row justify-around p-4 rounded-xl shadow-sm"
                      lightClassName="bg-white"
                      darkClassName="bg-neutral-800">
            <View className="items-center">
              <ThemedText className="text-2xl font-bold" 
                         lightClassName="text-green-800" 
                         darkClassName="text-primary-300">{profile.plantsCount}</ThemedText>
              <ThemedText lightClassName="text-green-600" 
                         darkClassName="text-primary-400">Plants</ThemedText>
            </View>
            <View className="items-center">
              <ThemedText className="text-2xl font-bold" 
                         lightClassName="text-green-800" 
                         darkClassName="text-primary-300">{profile.postsCount}</ThemedText>
              <ThemedText lightClassName="text-green-600" 
                         darkClassName="text-primary-400">Posts</ThemedText>
            </View>
            <View className="items-center">
              <ThemedText className="text-2xl font-bold" 
                         lightClassName="text-green-800" 
                         darkClassName="text-primary-300">{profile.followersCount}</ThemedText>
              <ThemedText lightClassName="text-green-600" 
                         darkClassName="text-primary-400">Followers</ThemedText>
            </View>
            <View className="items-center">
              <ThemedText className="text-2xl font-bold" 
                         lightClassName="text-green-800" 
                         darkClassName="text-primary-300">{profile.followingCount}</ThemedText>
              <ThemedText lightClassName="text-green-600" 
                         darkClassName="text-primary-400">Following</ThemedText>
            </View>
          </ThemedView>

          <ThemedView className="mt-8 rounded-xl p-4 shadow-sm"
                      lightClassName="bg-white"
                      darkClassName="bg-neutral-800">
            <ThemedText className="text-lg font-bold mb-2"
                       lightClassName="text-green-800" 
                       darkClassName="text-primary-300">Account Settings</ThemedText>
            <TouchableOpacity className="flex-row items-center justify-between py-3 border-b" 
                            style={{ borderColor: isDarkMode ? '#333' : '#e5e7eb' }}>
              <ThemedText lightClassName="text-green-700" 
                         darkClassName="text-primary-400">Edit Profile</ThemedText>
              <Feather name="chevron-right" size={18} color={isDarkMode ? "#60a5fa" : "#059669"} />
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center justify-between py-3 border-b" 
                            style={{ borderColor: isDarkMode ? '#333' : '#e5e7eb' }}>
              <ThemedText lightClassName="text-green-700" 
                         darkClassName="text-primary-400">Notification Settings</ThemedText>
              <Feather name="chevron-right" size={18} color={isDarkMode ? "#60a5fa" : "#059669"} />
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center justify-between py-3 border-b" 
                            style={{ borderColor: isDarkMode ? '#333' : '#e5e7eb' }}>
              <ThemedText lightClassName="text-green-700" 
                         darkClassName="text-primary-400">Privacy Settings</ThemedText>
              <Feather name="chevron-right" size={18} color={isDarkMode ? "#60a5fa" : "#059669"} />
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center justify-between py-3">
              <ThemedText lightClassName="text-green-700" 
                         darkClassName="text-primary-400">Help & Support</ThemedText>
              <Feather name="chevron-right" size={18} color={isDarkMode ? "#60a5fa" : "#059669"} />
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}
