import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useDatabase } from '../hooks/useDatabase';
import withObservables from '@nozbe/with-observables';
import { Plant } from '../lib/models/Plant';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Collection } from '@nozbe/watermelondb';
import { Observable } from '@nozbe/watermelondb/utils/rx';

interface PlantListProps {
  plants: Plant[];
}

interface EnhancedProps {
  plants: Collection<Plant>;
}

// Component to render when there are no plants
const EmptyPlantList = () => (
  <View className="flex-1 justify-center items-center p-6">
    <Ionicons name="leaf-outline" size={64} color="#d1d5db" />
    <Text className="text-lg text-gray-500 text-center mt-4">
      You don't have any plants yet. Add your first plant to get started!
    </Text>
  </View>
);

// Component for each plant item in the list
const PlantItem = ({ plant }: { plant: Plant }) => (
  <TouchableOpacity
    className="bg-green-50 p-4 rounded-xl mb-3"
    onPress={() => router.push(`/plant/${plant.id}`)}
  >
    <Text className="text-lg font-semibold">{plant.name}</Text>
    <Text className="text-gray-600">Strain: {plant.strain}</Text>
    <Text className="text-gray-600">Stage: {plant.growthStage}</Text>
    <Text className="text-gray-600">Planted: {plant.plantedDate}</Text>
  </TouchableOpacity>
);

// Component to convert Collection to Array
const PlantListComponent = ({ plants }: EnhancedProps) => {
  const [plantArray, setPlantArray] = useState<Plant[]>([]);
  
  useEffect(() => {
    const fetchPlants = async () => {
      const allPlants = await plants.query().fetch();
      setPlantArray(allPlants);
    };
    
    fetchPlants();
  }, [plants]);
  
  return (
    <View className="flex-1">
      <FlatList
        data={plantArray}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PlantItem plant={item} />}
        ListEmptyComponent={<EmptyPlantList />}
        contentContainerStyle={{ flexGrow: 1 }}
      />
    </View>
  );
};

// Enhanced component with observables
export const PlantList = withObservables([], ({ database }: { database: any }) => {
  const db = database || useDatabase().database;
  return {
    plants: db.get('plants'),
  };
})(PlantListComponent);

export default PlantList;
