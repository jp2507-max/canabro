import { Link, router } from 'expo-router';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '../../lib/hooks/useDatabase';
import { useState, useEffect } from 'react';

export default function HomeScreen() {
  const { database } = useDatabase();
  const [plantCount, setPlantCount] = useState(0);
  
  useEffect(() => {
    const fetchPlantCount = async () => {
      try {
        const plantsCollection = database.get('plants');
        const plants = await plantsCollection.query().fetch();
        setPlantCount(plants.length);
      } catch (error) {
        console.error('Error fetching plant count:', error);
      }
    };
    
    fetchPlantCount();
  }, [database]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1">
        <View className="p-4">
          <Text className="text-2xl font-bold mb-6">Welcome to CanaBro</Text>
          
          <View className="bg-green-50 rounded-xl p-4 mb-6">
            <Text className="text-lg font-semibold mb-2">Your Plants</Text>
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-600">
                {plantCount > 0 
                  ? `You have ${plantCount} plant${plantCount > 1 ? 's' : ''}` 
                  : 'You have no plants yet'}
              </Text>
              <TouchableOpacity 
                className="bg-green-600 px-3 py-2 rounded-lg"
                onPress={() => router.push('/plants')}
              >
                <Text className="text-white">Add Plant</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View className="flex-row flex-wrap justify-between mb-6">
            <TouchableOpacity 
              className="bg-green-100 w-[48%] rounded-xl p-4 mb-4"
              onPress={() => router.push('/diary')}
            >
              <Ionicons name="book-outline" size={24} color="#16a34a" />
              <Text className="font-semibold mt-2">Diary</Text>
              <Text className="text-gray-600 text-sm">Track your growing journey</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="bg-green-100 w-[48%] rounded-xl p-4 mb-4"
              onPress={() => router.push('/diagnosis')}
            >
              <Ionicons name="medkit-outline" size={24} color="#16a34a" />
              <Text className="font-semibold mt-2">Diagnosis</Text>
              <Text className="text-gray-600 text-sm">Check plant health</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="bg-green-100 w-[48%] rounded-xl p-4"
              onPress={() => router.push('/community')}
            >
              <Ionicons name="people-outline" size={24} color="#16a34a" />
              <Text className="font-semibold mt-2">Community</Text>
              <Text className="text-gray-600 text-sm">Connect with growers</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="bg-green-100 w-[48%] rounded-xl p-4"
              onPress={() => router.push('/plants')}
            >
              <Ionicons name="leaf-outline" size={24} color="#16a34a" />
              <Text className="font-semibold mt-2">My Plants</Text>
              <Text className="text-gray-600 text-sm">Manage your plants</Text>
            </TouchableOpacity>
          </View>
          
          <View className="bg-green-50 rounded-xl p-4">
            <Text className="text-lg font-semibold mb-2">Growing Tips</Text>
            <Text className="text-gray-600 mb-3">
              Ensure your plants get 18 hours of light during the vegetative stage and 12 hours during flowering.
            </Text>
            <Link href="https://www.growweedeasy.com/" asChild>
              <TouchableOpacity>
                <Text className="text-green-600">Learn more</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
