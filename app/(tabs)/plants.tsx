"use client";

import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Modal, ScrollView, TextInput, Image, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AddPlantForm } from '../../components/AddPlantForm';
import { useProtectedRoute } from '../../lib/hooks/useProtectedRoute';
import { StatusBar } from 'expo-status-bar';
import { useDatabase } from '../../lib/contexts/DatabaseProvider';
import { Plant } from '../../lib/models/Plant';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import ThemedView from '../../components/ui/ThemedView';
import ThemedText from '../../components/ui/ThemedText';
import { useTheme } from '../../lib/contexts/ThemeContext';

// Define location types based on locationId values in the database
type LocationType = 'indoor' | 'outdoor' | 'unknown';

// Define plant location categories with proper icons
const LOCATIONS = [
  { id: 'all', name: 'All Plants', icon: 'cannabis' },
  { id: 'indoor', name: 'Indoor', icon: 'home' },
  { id: 'outdoor', name: 'Outdoor', icon: 'white-balance-sunny' },
  { id: 'seedling', name: 'Seedlings', icon: 'seed' },
  { id: 'flowering', name: 'Flowering', icon: 'flower' },
];

export default function PlantsScreen() {
  const { isLoading: authLoading } = useProtectedRoute();
  const { database } = useDatabase();
  const { isDarkMode, theme } = useTheme();
  const [isAddPlantModalVisible, setIsAddPlantModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [plantsByLocation, setPlantsByLocation] = useState<{[key: string]: Plant[]}>({});
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Helper function to get location type from locationId
  const getLocationType = (plant: Plant): LocationType => {
    // If needed, get actual location details from related location model
    // For now, extract from locationId with fallback logic
    if (!plant.locationId) return 'unknown';
    
    const locationId = plant.locationId.toLowerCase();
    if (locationId.includes('indoor')) return 'indoor';
    if (locationId.includes('outdoor')) return 'outdoor';
    
    // Default fallback logic - use notes field if available
    if (plant.notes) {
      const notes = plant.notes.toLowerCase();
      if (notes.includes('indoor')) return 'indoor';
      if (notes.includes('outdoor')) return 'outdoor';
    }
    
    return 'unknown';
  };

  // Fetch plants from database
  useEffect(() => {
    const fetchPlants = async () => {
      try {
        setLoading(true);
        
        // Set a timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
          setLoadingTimeout(true);
        }, 5000); // 5 seconds timeout
        
        const plantsCollection = database.get<Plant>('plants');
        const allPlants = await plantsCollection.query().fetch();
        setPlants(allPlants);
        
        // Group plants by location
        const groupedPlants: {[key: string]: Plant[]} = { 
          all: allPlants,
          indoor: allPlants.filter((p: Plant) => getLocationType(p) === 'indoor'), 
          outdoor: allPlants.filter((p: Plant) => getLocationType(p) === 'outdoor'),
          seedling: allPlants.filter((p: Plant) => p.growthStage === 'Seedling'),
          flowering: allPlants.filter((p: Plant) => p.growthStage === 'Flowering'),
        };
        
        setPlantsByLocation(groupedPlants);
        clearTimeout(timeoutId);
      } catch (error) {
        console.error('Error fetching plants:', error);
        setLoadingTimeout(true);
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

  // Calculate days until next action based on notes
  // This is a mock function since we don't have real watering/feeding dates yet
  // In a real app, you would store these in the database
  const getNextAction = (plant: Plant, type: 'water' | 'feed') => {
    // Mock data based on createdAt
    if (!plant.createdAt) return null;
    
    // Generate a mock next date based on plant id and action type
    const plantDate = new Date(plant.createdAt);
    const mockDays = type === 'water' 
      ? (parseInt(plant.id.slice(-2), 16) % 7) + 1 // 1-7 days for watering
      : (parseInt(plant.id.slice(-2), 16) % 14) + 7; // 7-21 days for feeding
      
    const nextDate = new Date(plantDate);
    nextDate.setDate(nextDate.getDate() + mockDays);
    
    const today = new Date();
    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Only return if in the future
    if (diffDays <= 0) return null;
    
    return {
      days: diffDays,
      icon: type === 'water' ? 'water-outline' : 'nutrition',
      color: diffDays <= 2 ? '#ef4444' : '#16a34a'
    };
  };

  // Render a location category button
  const renderLocationItem = ({ item }: { item: typeof LOCATIONS[0] }) => (
    <TouchableOpacity
      className={`py-2 px-4 mr-2 rounded-full flex-row items-center ${
        selectedCategory === item.id 
          ? 'bg-green-600' 
          : ''
      }`}
      style={{ 
        backgroundColor: selectedCategory === item.id 
          ? theme.colors.primary[500]
          : isDarkMode ? theme.colors.neutral[100] : '#e5e7eb'
      }}
      onPress={() => setSelectedCategory(item.id)}
    >
      <MaterialCommunityIcons 
        name={item.icon as any} 
        size={16} 
        color={selectedCategory === item.id 
          ? '#ffffff' 
          : isDarkMode ? theme.colors.neutral[800] : '#4b5563'
        } 
        style={{ marginRight: 4 }}
      />
      <ThemedText 
        className={`font-medium text-sm ${
          selectedCategory === item.id 
            ? 'text-white' 
            : ''
        }`}
        lightClassName={selectedCategory === item.id ? '' : 'text-gray-700'}
        darkClassName={selectedCategory === item.id ? '' : 'text-neutral-800'}
      >
        {item.name}
      </ThemedText>
    </TouchableOpacity>
  );

  // Render a plant card
  const renderPlantCard = (plant: Plant) => {
    const waterInfo = getNextAction(plant, 'water');
    const feedInfo = getNextAction(plant, 'feed');
    const locationType = getLocationType(plant);

    return (
      <TouchableOpacity 
        className="w-full mb-4"
        onPress={() => router.push(`/plant/${plant.id}`)}
      >
        <ThemedView 
          className="rounded-xl overflow-hidden shadow-sm border" 
          lightClassName="bg-white border-gray-100"
          darkClassName="bg-neutral-800 border-neutral-700"
        >
          <View className="aspect-square">
            {plant.imageUrl ? (
              <Image 
                source={{ uri: plant.imageUrl }} 
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <ThemedView 
                className="w-full h-full justify-center items-center" 
                lightClassName="bg-green-50"
                darkClassName="bg-primary-900"
              >
                <MaterialCommunityIcons 
                  name="cannabis" 
                  size={64} 
                  color={isDarkMode ? theme.colors.primary[300] : theme.colors.primary[500]} 
                />
              </ThemedView>
            )}
            
            {/* Status labels */}
            <View className="absolute top-3 right-3 flex-row">
              {waterInfo && (
                <ThemedView 
                  className="rounded-full px-2 py-1 flex-row items-center mr-2 shadow-sm"
                  lightClassName="bg-white/90"
                  darkClassName="bg-neutral-700/90"
                >
                  <Ionicons 
                    name={waterInfo.icon as any} 
                    size={12} 
                    color={waterInfo.color} 
                    style={{ marginRight: 2 }}
                  />
                  <ThemedText 
                    className="text-xs font-medium"
                    lightClassName="text-gray-700"
                    darkClassName="text-neutral-200"
                  >
                    {waterInfo.days}d
                  </ThemedText>
                </ThemedView>
              )}
              
              {feedInfo && (
                <ThemedView 
                  className="rounded-full px-2 py-1 flex-row items-center shadow-sm"
                  lightClassName="bg-white/90"
                  darkClassName="bg-neutral-700/90"
                >
                  <MaterialCommunityIcons 
                    name={feedInfo.icon as any} 
                    size={12} 
                    color={feedInfo.color} 
                    style={{ marginRight: 2 }}
                  />
                  <ThemedText 
                    className="text-xs font-medium"
                    lightClassName="text-gray-700"
                    darkClassName="text-neutral-200"
                  >
                    {feedInfo.days}d
                  </ThemedText>
                </ThemedView>
              )}
            </View>
            
            {/* Location badge */}
            <ThemedView 
              className="absolute bottom-3 left-3 rounded-full px-2 py-1 flex-row items-center shadow-sm"
              lightClassName="bg-white/90"
              darkClassName="bg-neutral-700/90"
            >
              <MaterialCommunityIcons 
                name={locationType === 'indoor' ? 'home' : locationType === 'outdoor' ? 'white-balance-sunny' : 'help-circle'} 
                size={12} 
                color={isDarkMode ? theme.colors.neutral[200] : '#4b5563'} 
                style={{ marginRight: 2 }}
              />
              <ThemedText 
                className="text-xs font-medium capitalize"
                lightClassName="text-gray-700"
                darkClassName="text-neutral-200"
              >
                {locationType}
              </ThemedText>
            </ThemedView>
          </View>
          
          <ThemedView 
            className="p-3"
            lightClassName="bg-white"
            darkClassName="bg-neutral-800"
          >
            <ThemedText 
              className="text-base font-bold mb-1"
              lightClassName="text-gray-800"
              darkClassName="text-neutral-100"
            >
              {plant.name}
            </ThemedText>
            
            <ThemedText 
              className="text-sm mb-2"
              lightClassName="text-gray-600"
              darkClassName="text-neutral-300"
            >
              {plant.strain}
            </ThemedText>
            
            <View className="flex-row items-center">
              <ThemedView 
                className="rounded-full px-2 py-0.5 mr-2"
                lightClassName="bg-green-100"
                darkClassName="bg-primary-800"
              >
                <ThemedText 
                  className="text-xs font-medium"
                  lightClassName="text-green-800"
                  darkClassName="text-primary-200"
                >
                  {plant.growthStage || 'Unknown stage'}
                </ThemedText>
              </ThemedView>
              
              {/* Calculate days to harvest based on growth stage if available */}
              {plant.growthStage === 'Flowering' && (
                <ThemedView 
                  className="rounded-full px-2 py-0.5"
                  lightClassName="bg-amber-100"
                  darkClassName="bg-amber-800"
                >
                  <ThemedText 
                    className="text-xs font-medium"
                    lightClassName="text-amber-800"
                    darkClassName="text-amber-100"
                  >
                    {/* Mock days to harvest based on plant ID as a placeholder */}
                    {parseInt(plant.id.slice(-2), 16) % 30 + 5} days to harvest
                  </ThemedText>
                </ThemedView>
              )}
            </View>
          </ThemedView>
        </ThemedView>
      </TouchableOpacity>
    );
  };

  // Only show loading if both auth is loading and our timeout hasn't been reached
  if ((authLoading || loading) && !loadingTimeout) {
    return (
      <ThemedView 
        className="flex-1 justify-center items-center"
        lightClassName="bg-white"
        darkClassName="bg-neutral-50"
      >
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      </ThemedView>
    );
  }

  return (
    <SafeAreaView className="flex-1">
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      
      <ThemedView 
        className="flex-1 px-4 pt-2"
        lightClassName="bg-white"
        darkClassName="bg-neutral-900"
      >
        {/* Search bar */}
        <ThemedView 
          className="flex-row items-center mb-4 px-3 py-2 rounded-full border"
          lightClassName="bg-gray-50 border-gray-200"
          darkClassName="bg-neutral-800 border-neutral-700"
        >
          <Ionicons 
            name="search" 
            size={18} 
            color={isDarkMode ? theme.colors.neutral[300] : '#9ca3af'} 
            style={{ marginRight: 8 }}
          />
          <TextInput
            placeholder="Search plants..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 text-base py-1"
            placeholderTextColor={isDarkMode ? theme.colors.neutral[400] : '#9ca3af'}
            style={{ color: isDarkMode ? theme.colors.neutral[100] : '#1f2937' }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons 
                name="close-circle" 
                size={18} 
                color={isDarkMode ? theme.colors.neutral[300] : '#9ca3af'} 
              />
            </TouchableOpacity>
          )}
        </ThemedView>
        
        {/* Location filter */}
        <View className="mb-4">
          <FlatList
            data={LOCATIONS}
            renderItem={renderLocationItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
          />
        </View>
        
        {/* Plants list */}
        {displayedPlants.length > 0 ? (
          <FlatList
            data={displayedPlants}
            renderItem={({ item }) => renderPlantCard(item)}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        ) : (
          <ThemedView 
            className="flex-1 justify-center items-center"
            lightClassName="bg-white"
            darkClassName="bg-neutral-900"
          >
            <MaterialCommunityIcons 
              name="cannabis" 
              size={64} 
              color={isDarkMode ? theme.colors.neutral[600] : '#d1d5db'} 
            />
            <ThemedText 
              className="text-xl font-bold mt-4 mb-2"
              lightClassName="text-gray-800"
              darkClassName="text-neutral-100"
            >
              No plants found
            </ThemedText>
            <ThemedText 
              className="text-base text-center mb-6 px-8"
              lightClassName="text-gray-600"
              darkClassName="text-neutral-300"
            >
              {searchQuery 
                ? `No plants matching "${searchQuery}"`
                : "You don't have any plants in this category yet"
              }
            </ThemedText>
          </ThemedView>
        )}
      </ThemedView>
      
      {/* Add Plant Button */}
      <View className="absolute bottom-6 right-6">
        <TouchableOpacity
          className="w-14 h-14 rounded-full justify-center items-center shadow-lg"
          style={{ 
            backgroundColor: theme.colors.primary[500],
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
          onPress={() => setIsAddPlantModalVisible(true)}
        >
          <Ionicons name="add" size={30} color="#ffffff" />
        </TouchableOpacity>
      </View>
      
      {/* Add Plant Modal */}
      <Modal
        visible={isAddPlantModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAddPlantModalVisible(false)}
      >
        <ThemedView 
          className="flex-1"
          lightClassName="bg-white"
          darkClassName="bg-neutral-900"
        >
          <SafeAreaView className="flex-1">
            <View className="flex-row items-center justify-between px-4 py-2 border-b"
              style={{ borderBottomColor: isDarkMode ? theme.colors.neutral[700] : '#e5e7eb' }}
            >
              <TouchableOpacity onPress={() => setIsAddPlantModalVisible(false)}>
                <Ionicons 
                  name="close" 
                  size={24} 
                  color={isDarkMode ? theme.colors.neutral[200] : '#4b5563'} 
                />
              </TouchableOpacity>
              <ThemedText 
                className="text-lg font-bold"
                lightClassName="text-gray-800"
                darkClassName="text-neutral-100"
              >
                Add New Plant
              </ThemedText>
              <View style={{ width: 24 }} />
            </View>
            
            <AddPlantForm 
              onSuccess={() => {
                setIsAddPlantModalVisible(false);
                // Refresh plants list
                // This would be handled by the database provider in a real app
              }}
            />
          </SafeAreaView>
        </ThemedView>
      </Modal>
    </SafeAreaView>
  );
}
