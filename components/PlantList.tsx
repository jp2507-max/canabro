'use client';

import { Ionicons } from '@expo/vector-icons';
import { Database } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import { router } from 'expo-router';
import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';

// import { useDatabase } from '../lib/contexts/DatabaseProvider'; // useDatabase is unused
import { Plant } from '../lib/models/Plant';

interface PlantListComponentProps {
  plants: Plant[];
}

// Component to render when there are no plants
const EmptyPlantList = () => (
  <View className="flex-1 items-center justify-center p-6">
    <Ionicons name="leaf-outline" size={64} color="#d1d5db" />
    <Text className="mt-4 text-center text-lg text-gray-500">
      You don't have any plants yet. Add your first plant to get started!
    </Text>
  </View>
);

// Component for each plant item in the list
const PlantItem = ({ plant }: { plant: Plant }) => (
  <TouchableOpacity
    className="mb-3 rounded-xl bg-green-50 p-4"
    onPress={() => router.push(`/plant/${plant.id}`)}>
    <Text className="text-lg font-semibold">{plant.name}</Text>
    <Text className="text-gray-600">Strain: {plant.strain}</Text>
    <Text className="text-gray-600">Stage: {plant.growthStage}</Text>
    <Text className="text-gray-600">Planted: {plant.plantedDate}</Text>
  </TouchableOpacity>
);

// Base component that receives plants as an array (already transformed by withObservables)
const PlantListComponent = ({ plants }: PlantListComponentProps) => {
  return (
    <View className="flex-1">
      <FlatList
        data={plants}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PlantItem plant={item} />}
        ListEmptyComponent={<EmptyPlantList />}
        contentContainerStyle={{ flexGrow: 1 }}
      />
    </View>
  );
};

// Enhanced component with observables - withObservables automatically
// subscribes to the Observable and passes unwrapped values to the component
export const PlantList = withObservables([], ({ database }: { database: Database }) => ({
  plants: database.get<Plant>('plants').query().observe(),
}))(PlantListComponent);

export default PlantList;
