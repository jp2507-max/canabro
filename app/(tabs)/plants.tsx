"use client";

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, TextInput, Image, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PlantList from '../../components/PlantList';
import { AddPlantForm } from '../../components/AddPlantForm';
import { useProtectedRoute } from '../../lib/hooks/useProtectedRoute';
import { StatusBar } from 'expo-status-bar';
import { useDatabase } from '../../lib/contexts/DatabaseProvider';
import { Plant } from '../../lib/models/Plant';
import { router } from 'expo-router';
import { TestNativeWind, TestStyleSheet } from '../../components/TestStyles';

// Define plant location categories
const LOCATIONS = [
  { id: 'all', name: 'All Plants', icon: 'leaf-outline' },
  { id: 'indoor', name: 'Indoor', icon: 'home-outline' },
  { id: 'outdoor', name: 'Outdoor', icon: 'sunny-outline' },
  { id: 'seedling', name: 'Seedlings', icon: 'water-outline' },
  { id: 'flowering', name: 'Flowering', icon: 'flower-outline' },
];

export default function PlantsScreen() {
  const { isLoading: authLoading } = useProtectedRoute();
  const { database } = useDatabase();
  const [isAddPlantModalVisible, setIsAddPlantModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [plantsByLocation, setPlantsByLocation] = useState<{[key: string]: Plant[]}>({});

  // Fetch plants from database
  useEffect(() => {
    const fetchPlants = async () => {
      try {
        setLoading(true);
        const plantsCollection = database.get<Plant>('plants');
        const allPlants = await plantsCollection.query().fetch();
        setPlants(allPlants);
        
        // Group plants by location (this is just an example - you'll need to adapt this to your data model)
        const groupedPlants: {[key: string]: Plant[]} = { 
          all: allPlants,
          indoor: allPlants.filter((p: Plant) => p.notes?.includes('indoor') || Math.random() > 0.5), // Mock filter
          outdoor: allPlants.filter((p: Plant) => p.notes?.includes('outdoor') || Math.random() > 0.5), // Mock filter
          seedling: allPlants.filter((p: Plant) => p.growthStage === 'Seedling'),
          flowering: allPlants.filter((p: Plant) => p.growthStage === 'Flowering'),
        };
        
        setPlantsByLocation(groupedPlants);
      } catch (error) {
        console.error('Error fetching plants:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPlants();
  }, [database]);

  // Filter plants based on search query
  const filteredPlants = plants.filter((plant: Plant) => 
    plant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    plant.strain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get plants for the selected category
  const displayedPlants = searchQuery ? filteredPlants : (plantsByLocation[selectedCategory] || []);

  // Render a location category with plant count
  const renderLocationItem = ({ item }: { item: typeof LOCATIONS[0] }) => (
    <TouchableOpacity
      className={`px-3 py-2 mr-3 items-center ${selectedCategory === item.id ? 'border-b-2 border-green-600' : ''}`}
      onPress={() => setSelectedCategory(item.id)}
    >
      <Ionicons 
        name={item.icon as any} 
        size={20} 
        color={selectedCategory === item.id ? '#16a34a' : '#9ca3af'} 
      />
      <Text 
        className={`text-xs mt-1 ${selectedCategory === item.id ? 'text-green-600 font-medium' : 'text-gray-500'}`}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  // Render a plant card
  const renderPlantCard = (plant: Plant) => (
    <TouchableOpacity 
      className="w-1/2 p-2"
      onPress={() => router.push(`/plant/${plant.id}`)}
    >
      <View className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100">
        <View className="aspect-square bg-gray-100">
          {plant.imageUrl ? (
            <Image 
              source={{ uri: plant.imageUrl }} 
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full justify-center items-center">
              <Ionicons name="leaf-outline" size={40} color="#9ca3af" />
            </View>
          )}
        </View>
        <View className="p-2">
          <Text className="font-medium">{plant.name}</Text>
          <Text className="text-xs text-gray-500">{plant.strain}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Render a plant group (location with multiple plants)
  const renderPlantGroup = ({ location, plants }: { location: string, plants: Plant[] }) => {
    if (plants.length === 0) return null;
    
    return (
      <View className="mb-6">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-lg font-semibold">{location}</Text>
          <Text className="text-sm text-gray-500">{plants.length} plants</Text>
        </View>
        
        <View className="flex-row flex-wrap">
          {plants.slice(0, 4).map((plant) => (
            <React.Fragment key={plant.id}>
              {renderPlantCard(plant)}
            </React.Fragment>
          ))}
        </View>
        
        {plants.length > 4 && (
          <TouchableOpacity className="mt-1">
            <Text className="text-green-600">See all {plants.length} plants</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (authLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="px-4 pt-2 pb-0">
        <Text className="text-2xl font-bold text-center py-2">My Plants</Text>
      </View>
      
      {/* Search bar */}
      <View className="px-4 py-2">
        <View className="flex-row items-center bg-gray-100 rounded-full px-4 py-2">
          <Ionicons name="search" size={18} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-2 text-base"
            placeholder="Search plants..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Categories */}
      <View className="mt-2">
        <FlatList
          data={LOCATIONS}
          renderItem={renderLocationItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        />
      </View>

      {/* Plant content */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#16a34a" />
          <Text className="text-gray-500 mt-4">Loading plants...</Text>
        </View>
      ) : displayedPlants.length === 0 ? (
        <View className="flex-1 justify-center items-center p-6">
          <Ionicons name="leaf-outline" size={64} color="#d1d5db" />
          <Text className="text-lg text-gray-500 text-center mt-4">
            No plants found. Add your first plant to get started!
          </Text>
        </View>
      ) : selectedCategory === 'all' && !searchQuery ? (
        // Show grouped plants by location
        <ScrollView className="flex-1 px-4 mt-4">
          {Object.entries({
            'Indoor': plantsByLocation.indoor || [],
            'Outdoor': plantsByLocation.outdoor || [],
            'Seedlings': plantsByLocation.seedling || [],
            'Flowering': plantsByLocation.flowering || [],
          }).map(([location, plants]) => (
            <React.Fragment key={location}>
              {renderPlantGroup({ location, plants })}
            </React.Fragment>
          ))}
          <View className="h-20" />
        </ScrollView>
      ) : (
        // Show filtered plants in a grid
        <FlatList
          data={displayedPlants}
          numColumns={2}
          contentContainerStyle={{ padding: 16 }}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderPlantCard(item)}
          ListFooterComponent={<View className="h-20" />}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 bg-green-600 w-14 h-14 rounded-full justify-center items-center shadow-lg"
        onPress={() => setIsAddPlantModalVisible(true)}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>

      {/* Add Plant Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={isAddPlantModalVisible}
        onRequestClose={() => setIsAddPlantModalVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
            <Text className="text-xl font-bold">Add New Plant</Text>
            <TouchableOpacity onPress={() => setIsAddPlantModalVisible(false)}>
              <Ionicons name="close" size={24} color="black" />
            </TouchableOpacity>
          </View>
          <ScrollView>
            <AddPlantForm onSuccess={() => setIsAddPlantModalVisible(false)} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <TestNativeWind />
      <TestStyleSheet />
    </SafeAreaView>
  );
}
