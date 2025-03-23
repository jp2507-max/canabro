import { View, Text, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/contexts/AuthProvider';
import { useProtectedRoute } from '../../lib/hooks/useProtectedRoute';
import { useState, useEffect } from 'react';
import supabase from '../../lib/supabase';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { isLoading } = useProtectedRoute();
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
      <View className="flex-1 justify-center items-center bg-green-50">
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-green-50">
      <View className="px-4 py-6">
        <View className="flex-row justify-between items-center">
          <Text className="text-2xl font-bold text-green-800">My Profile</Text>
          <TouchableOpacity 
            onPress={handleSignOut}
            className="bg-red-500 px-4 py-2 rounded-full"
          >
            <Text className="text-white font-semibold">Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View className="mt-6 items-center">
          <View className="w-24 h-24 rounded-full bg-green-200 justify-center items-center">
            <Ionicons name="person" size={40} color="#065f46" />
          </View>
          <Text className="mt-4 text-xl font-bold text-green-800">{profile.username}</Text>
          <Text className="text-green-600">Joined {profile.joinDate}</Text>
        </View>

        <View className="mt-8 flex-row justify-around bg-white rounded-xl p-4 shadow-sm">
          <View className="items-center">
            <Text className="text-2xl font-bold text-green-800">{profile.plantsCount}</Text>
            <Text className="text-green-600">Plants</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-green-800">{profile.postsCount}</Text>
            <Text className="text-green-600">Posts</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-green-800">{profile.followersCount}</Text>
            <Text className="text-green-600">Followers</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-green-800">{profile.followingCount}</Text>
            <Text className="text-green-600">Following</Text>
          </View>
        </View>

        <View className="mt-8 bg-white rounded-xl p-4 shadow-sm">
          <Text className="text-lg font-bold text-green-800 mb-2">Account Settings</Text>
          <TouchableOpacity className="py-3 border-b border-gray-200">
            <Text className="text-green-700">Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity className="py-3 border-b border-gray-200">
            <Text className="text-green-700">Notification Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity className="py-3 border-b border-gray-200">
            <Text className="text-green-700">Privacy Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity className="py-3">
            <Text className="text-green-700">Help & Support</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
