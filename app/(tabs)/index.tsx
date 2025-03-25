import { Link, router } from 'expo-router';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '../../lib/hooks/useDatabase';
import { useState, useEffect } from 'react';
import { useTheme } from '../../lib/contexts/ThemeContext';
import ThemedView from '../../components/ui/ThemedView';
import ThemedText from '../../components/ui/ThemedText';

export default function HomeScreen() {
  const { database } = useDatabase();
  const { theme, isDarkMode } = useTheme();
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
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.neutral[50] }}>
      <ScrollView className="flex-1">
        <ThemedView className="p-4">
          <ThemedText className="text-2xl font-bold mb-6" 
                    lightClassName="text-neutral-900" 
                    darkClassName="text-white">
            Welcome to CanaBro
          </ThemedText>
          
          <ThemedView className="rounded-xl p-4 mb-6"
                     lightClassName="bg-green-50"
                     darkClassName="bg-primary-900">
            <ThemedText className="text-lg font-semibold mb-2"
                       lightClassName="text-neutral-900"
                       darkClassName="text-primary-300">
              Your Plants
            </ThemedText>
            <View className="flex-row justify-between items-center">
              <ThemedText className=""
                         lightClassName="text-gray-600"
                         darkClassName="text-neutral-400">
                {plantCount > 0 
                  ? `You have ${plantCount} plant${plantCount > 1 ? 's' : ''}` 
                  : 'You have no plants yet'}
              </ThemedText>
              <TouchableOpacity 
                className="bg-green-600 px-3 py-2 rounded-lg"
                onPress={() => router.push('/plants')}
              >
                <Text className="text-white">Add Plant</Text>
              </TouchableOpacity>
            </View>
          </ThemedView>
          
          <View className="flex-row flex-wrap justify-between mb-6">
            <TouchableOpacity 
              className="bg-green-100 w-[48%] rounded-xl p-4 mb-4"
              onPress={() => router.push('/diary')}
            >
              <Ionicons name="book-outline" size={24} color={isDarkMode ? "#4ade80" : "#16a34a"} />
              <ThemedText className="font-semibold mt-2"
                         lightClassName="text-neutral-900"
                         darkClassName="text-white">
                Diary
              </ThemedText>
              <ThemedText className="text-sm"
                         lightClassName="text-gray-600" 
                         darkClassName="text-neutral-400">
                Track your growing journey
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="bg-green-100 w-[48%] rounded-xl p-4 mb-4"
              onPress={() => router.push('/diagnosis')}
            >
              <Ionicons name="medkit-outline" size={24} color={isDarkMode ? "#4ade80" : "#16a34a"} />
              <ThemedText className="font-semibold mt-2"
                         lightClassName="text-neutral-900"
                         darkClassName="text-white">
                Diagnosis
              </ThemedText>
              <ThemedText className="text-sm"
                         lightClassName="text-gray-600" 
                         darkClassName="text-neutral-400">
                Check plant health
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="bg-green-100 w-[48%] rounded-xl p-4"
              onPress={() => router.push('/community')}
            >
              <Ionicons name="people-outline" size={24} color={isDarkMode ? "#4ade80" : "#16a34a"} />
              <ThemedText className="font-semibold mt-2"
                         lightClassName="text-neutral-900"
                         darkClassName="text-white">
                Community
              </ThemedText>
              <ThemedText className="text-sm"
                         lightClassName="text-gray-600" 
                         darkClassName="text-neutral-400">
                Connect with growers
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="bg-green-100 w-[48%] rounded-xl p-4"
              onPress={() => router.push('/plants')}
            >
              <Ionicons name="leaf-outline" size={24} color={isDarkMode ? "#4ade80" : "#16a34a"} />
              <ThemedText className="font-semibold mt-2"
                         lightClassName="text-neutral-900"
                         darkClassName="text-white">
                My Plants
              </ThemedText>
              <ThemedText className="text-sm"
                         lightClassName="text-gray-600" 
                         darkClassName="text-neutral-400">
                Manage your plants
              </ThemedText>
            </TouchableOpacity>
          </View>
          
          <ThemedView className="rounded-xl p-4"
                     lightClassName="bg-green-50"
                     darkClassName="bg-primary-900">
            <ThemedText className="text-lg font-semibold mb-2"
                       lightClassName="text-neutral-900"
                       darkClassName="text-primary-300">
              Growing Tips
            </ThemedText>
            <ThemedText className="mb-3"
                       lightClassName="text-gray-600"
                       darkClassName="text-neutral-400">
              Ensure your plants get 18 hours of light during the vegetative stage and 12 hours during flowering.
            </ThemedText>
            <Link href="https://www.growweedeasy.com/" asChild>
              <TouchableOpacity>
                <ThemedText lightClassName="text-green-600" 
                          darkClassName="text-primary-400">
                  Learn more
                </ThemedText>
              </TouchableOpacity>
            </Link>
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}
