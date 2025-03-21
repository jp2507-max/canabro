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
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (data) {
          // Format join date
          const joinDate = new Date(data.created_at);
          const formattedDate = joinDate.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
          });

          setProfile({
            username: data.username || 'User',
            joinDate: formattedDate,
            plantsCount: data.plants_count || 0,
            postsCount: data.posts_count || 0,
            followersCount: data.followers_count || 0,
            followingCount: data.following_count || 0
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoadingProfile(false);
      }
    }

    fetchProfile();
  }, [user]);

  const handleSignOut = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Logout',
          onPress: signOut,
          style: 'destructive'
        }
      ]
    );
  };

  // Show loading indicator while checking authentication or loading profile
  if (isLoading || loadingProfile) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#16a34a" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="p-4">
        <View className="items-center mb-6">
          <View className="w-24 h-24 rounded-full bg-gray-200 mb-2 justify-center items-center">
            <Ionicons name="person" size={40} color="#9ca3af" />
          </View>
          <Text className="text-xl font-bold">{profile.username}</Text>
          <Text className="text-gray-500">Joined {profile.joinDate}</Text>
        </View>

        <View className="flex-row justify-between mb-6">
          <View className="items-center">
            <Text className="text-xl font-bold">{profile.plantsCount}</Text>
            <Text className="text-gray-500">Plants</Text>
          </View>
          <View className="items-center">
            <Text className="text-xl font-bold">{profile.postsCount}</Text>
            <Text className="text-gray-500">Posts</Text>
          </View>
          <View className="items-center">
            <Text className="text-xl font-bold">{profile.followersCount}</Text>
            <Text className="text-gray-500">Followers</Text>
          </View>
          <View className="items-center">
            <Text className="text-xl font-bold">{profile.followingCount}</Text>
            <Text className="text-gray-500">Following</Text>
          </View>
        </View>

        <TouchableOpacity className="bg-gray-100 p-4 rounded-lg flex-row items-center mb-3">
          <Ionicons name="settings-outline" size={24} color="#4b5563" className="mr-3" />
          <Text className="text-gray-800 ml-3">Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity className="bg-gray-100 p-4 rounded-lg flex-row items-center mb-3">
          <Ionicons name="help-circle-outline" size={24} color="#4b5563" className="mr-3" />
          <Text className="text-gray-800 ml-3">Help & Support</Text>
        </TouchableOpacity>

        <TouchableOpacity className="bg-gray-100 p-4 rounded-lg flex-row items-center mb-3">
          <Ionicons name="information-circle-outline" size={24} color="#4b5563" className="mr-3" />
          <Text className="text-gray-800 ml-3">About</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          className="bg-red-50 p-4 rounded-lg flex-row items-center mt-6"
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={24} color="#ef4444" className="mr-3" />
          <Text className="text-red-500 ml-3">Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
