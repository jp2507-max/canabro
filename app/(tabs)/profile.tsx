import { View, Text, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  // This will be replaced with actual user data
  const user = {
    username: 'GreenThumb',
    joinDate: 'March 2025',
    plantsCount: 0,
    postsCount: 0,
    followersCount: 0,
    followingCount: 0
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="p-4">
        <View className="items-center mb-6">
          <View className="w-24 h-24 rounded-full bg-gray-200 mb-2 justify-center items-center">
            <Ionicons name="person" size={40} color="#9ca3af" />
          </View>
          <Text className="text-xl font-bold">{user.username}</Text>
          <Text className="text-gray-500">Joined {user.joinDate}</Text>
        </View>

        <View className="flex-row justify-between mb-6">
          <View className="items-center">
            <Text className="text-xl font-bold">{user.plantsCount}</Text>
            <Text className="text-gray-500">Plants</Text>
          </View>
          <View className="items-center">
            <Text className="text-xl font-bold">{user.postsCount}</Text>
            <Text className="text-gray-500">Posts</Text>
          </View>
          <View className="items-center">
            <Text className="text-xl font-bold">{user.followersCount}</Text>
            <Text className="text-gray-500">Followers</Text>
          </View>
          <View className="items-center">
            <Text className="text-xl font-bold">{user.followingCount}</Text>
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

        <TouchableOpacity className="bg-red-50 p-4 rounded-lg flex-row items-center mt-6">
          <Ionicons name="log-out-outline" size={24} color="#ef4444" className="mr-3" />
          <Text className="text-red-500 ml-3">Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
