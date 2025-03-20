import { useLocalSearchParams } from 'expo-router';
import { View, Text, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PlantDetailsScreen() {
  const { id } = useLocalSearchParams();
  
  // This will be replaced with actual plant data from database
  const plant = {
    id,
    name: 'Sample Plant',
    strain: 'Unknown Strain',
    plantedDate: 'March 15, 2025',
    growthStage: 'Vegetative',
    notes: 'This is a placeholder for plant details. In the future, this screen will display detailed information about your specific plant, including growth history, care schedule, and images.'
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1">
        <View className="p-4">
          <View className="h-60 bg-gray-200 rounded-xl mb-4 justify-center items-center">
            <Text className="text-gray-500">Plant Image</Text>
          </View>
          
          <Text className="text-2xl font-bold mb-1">{plant.name}</Text>
          <Text className="text-gray-500 mb-4">ID: {plant.id}</Text>
          
          <View className="bg-green-50 p-4 rounded-xl mb-4">
            <View className="flex-row justify-between mb-2">
              <Text className="font-semibold">Strain</Text>
              <Text>{plant.strain}</Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="font-semibold">Planted Date</Text>
              <Text>{plant.plantedDate}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="font-semibold">Growth Stage</Text>
              <Text>{plant.growthStage}</Text>
            </View>
          </View>
          
          <View className="mb-4">
            <Text className="text-lg font-semibold mb-2">Notes</Text>
            <Text className="text-gray-600">{plant.notes}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
