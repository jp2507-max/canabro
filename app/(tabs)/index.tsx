import { Link, router } from 'expo-router';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Image, FlatList, ActivityIndicator, Pressable, Modal, RefreshControl } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useMemo, useCallback, ComponentType } from 'react';
import { useTheme } from '../../lib/contexts/ThemeContext';
import ThemedView from '../../components/ui/ThemedView';
import ThemedText from '../../components/ui/ThemedText';
import { AddPlantForm } from '../../components/AddPlantForm';
import { Plant } from '../../lib/models/Plant';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import useWatermelon from '../../lib/hooks/useWatermelon';
import { Q, Database } from '@nozbe/watermelondb';
import React from 'react';
import { Observable } from 'rxjs';
import { withObservables, withDatabase, compose } from '@nozbe/watermelondb/react';

type LocationType = 'indoor' | 'outdoor' | 'unknown';

const LOCATIONS = [
  { id: 'all', name: 'All Plants', icon: 'cannabis' },
  { id: 'indoor', name: 'Indoor', icon: 'home' },
  { id: 'outdoor', name: 'Outdoor', icon: 'white-balance-sunny' },
  { id: 'seedling', name: 'Seedlings', icon: 'seed' },
  { id: 'flowering', name: 'Flowering', icon: 'flower' },
];

interface HomeScreenProps {
  plants: Plant[];
}

type PlantFilterKey = 'all' | 'indoor' | 'outdoor' | 'seedling' | 'flowering';

interface FilteredPlants {
  all: Plant[];
  indoor: Plant[];
  outdoor: Plant[];
  seedling: Plant[];
  flowering: Plant[];
}

function HomeScreen({ plants }: HomeScreenProps) {
  const { sync, isSyncing } = useWatermelon();
  const { theme, isDarkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<PlantFilterKey>('all');
  const [isAddPlantModalVisible, setIsAddPlantModalVisible] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    console.log('DEBUG: Effective plants prop length:', plants?.length || 0);
    if (plants?.length > 0 && isLoading) {
      setIsLoading(false);
    }
  }, [plants, isLoading]);

  const filteredPlants = useMemo<FilteredPlants>(() => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    const filtered = plants.filter(plant =>
      plant.name.toLowerCase().includes(lowerCaseQuery) ||
      plant.strain.toLowerCase().includes(lowerCaseQuery)
    );

    return {
      all: filtered,
      indoor: filtered.filter(p => getLocationType(p) === 'indoor'),
      outdoor: filtered.filter(p => getLocationType(p) === 'outdoor'),
      seedling: filtered.filter(p => p.growthStage === 'Seedling'),
      flowering: filtered.filter(p => p.growthStage === 'Flowering'),
    };
  }, [plants, searchQuery]);

  const currentPlantList = filteredPlants[selectedFilter];

  const getLocationType = (plant: Plant): LocationType => {
    if (!plant.locationId) return 'unknown';
    const locationId = plant.locationId.toLowerCase();
    if (locationId.includes('indoor')) return 'indoor';
    if (locationId.includes('outdoor')) return 'outdoor';
    if (plant.notes) {
      const notes = plant.notes.toLowerCase();
      if (notes.includes('indoor')) return 'indoor';
      if (notes.includes('outdoor')) return 'outdoor';
    }
    return 'unknown';
  };

  const renderLocationItem = ({ item }: { item: typeof LOCATIONS[0] }) => (
    <TouchableOpacity
      className={`py-2 px-4 mr-2 rounded-full flex-row items-center ${selectedFilter === item.id ? 'bg-green-600' : ''}`}
      style={{
        backgroundColor: selectedFilter === item.id
          ? theme.colors.primary[500]
          : isDarkMode ? theme.colors.neutral[100] : '#e5e7eb'
      }}
      onPress={() => setSelectedFilter(item.id as PlantFilterKey)}
    >
      <MaterialCommunityIcons
        name={item.icon as any}
        size={16}
        color={selectedFilter === item.id ? '#ffffff' : isDarkMode ? theme.colors.neutral[800] : '#4b5563'}
        style={{ marginRight: 4 }}
      />
      <ThemedText
        className={`font-medium text-sm ${selectedFilter === item.id ? 'text-white' : ''}`}
        lightClassName={selectedFilter === item.id ? '' : 'text-neutral-700'}
        darkClassName={selectedFilter === item.id ? '' : 'text-neutral-800'}
      >
        {item.name}
      </ThemedText>
    </TouchableOpacity>
  );

  const renderPlantCard = (plant: Plant) => {
    const waterInfo = getNextAction(plant, 'water');
    const feedInfo = getNextAction(plant, 'feed');
    const locationType = getLocationType(plant);

    return (
      <TouchableOpacity
        className="w-full mb-4"
        onPress={() => router.push(`/plant/${plant.id}` as any)}
        key={plant.id}
      >
        <ThemedView
          className="rounded-xl overflow-hidden shadow-sm border"
          lightClassName="bg-white border-neutral-100"
          darkClassName="bg-neutral-800 border-neutral-700"
        >
          <View className="aspect-square relative">
            {plant.imageUrl ? (
              <Image
                source={{ uri: plant.imageUrl }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-full bg-neutral-200 dark:bg-neutral-700 items-center justify-center">
                <MaterialCommunityIcons name="flower-tulip" size={60} color={isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[400]} />
              </View>
            )}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.6)']}
              className="absolute bottom-0 left-0 right-0 h-20 justify-end p-3"
            >
              <Text className="text-white text-lg font-bold shadow-black" style={{ textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 } }}>
                {plant.name}
              </Text>
              <Text className="text-neutral-200 text-xs shadow-black" style={{ textShadowRadius: 1, textShadowOffset: { width: 0, height: 1 } }}>
                {plant.strain} ({plant.growthStage})
              </Text>
            </LinearGradient>
            <View className="absolute top-2 right-2 flex-row space-x-1">
              {waterInfo && (
                <View className="bg-black/50 rounded-full p-1 flex-row items-center">
                  <MaterialCommunityIcons name={waterInfo.icon as any} size={12} color={waterInfo.color} />
                  <Text className="text-white text-[10px] font-bold ml-1">{waterInfo.days}d</Text>
                </View>
              )}
              {feedInfo && (
                <View className="bg-black/50 rounded-full p-1 flex-row items-center">
                  <MaterialCommunityIcons name={feedInfo.icon as any} size={12} color={feedInfo.color} />
                  <Text className="text-white text-[10px] font-bold ml-1">{feedInfo.days}d</Text>
                </View>
              )}
            </View>
            <View className="absolute top-2 left-2 bg-black/50 rounded-full p-1.5">
              <MaterialCommunityIcons
                name={locationType === 'indoor' ? 'home' : locationType === 'outdoor' ? 'white-balance-sunny' : 'help-circle-outline'}
                size={14}
                color="#ffffff"
              />
            </View>
          </View>
        </ThemedView>
      </TouchableOpacity>
    );
  };

  const getNextAction = (plant: Plant, type: 'water' | 'feed') => {
    if (!plant.createdAt) return null;
    const plantDate = new Date(plant.createdAt);
    const mockDays = type === 'water'
      ? (parseInt(plant.id.slice(-2), 16) % 7) + 1
      : (parseInt(plant.id.slice(-2), 16) % 14) + 7;
    const nextDate = new Date(plantDate);
    nextDate.setDate(nextDate.getDate() + mockDays);
    const today = new Date();
    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return null;
    return {
      days: diffDays,
      icon: type === 'water' ? 'water-outline' : 'nutrition',
      color: type === 'water' ? '#3b82f6' : '#f59e0b'
    };
  };

  const handleAddPlant = () => {
    setIsAddPlantModalVisible(true);
  };

  const handleAddPlantSuccess = () => {
    setIsAddPlantModalVisible(false);
    sync(); // Sync after adding a plant
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      if (sync) {
        console.log("Manual sync triggered on refresh");
        await sync();
      }
    } catch (error) {
      console.error('Error refreshing plants:', error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1">
      <ThemedView 
        className="flex-1 p-4"
        lightClassName="bg-neutral-50"
        darkClassName="bg-neutral-900"
      >
        <View className="flex-row items-center justify-between mb-4">
          <ThemedText className="text-2xl font-bold" lightClassName="text-neutral-800" darkClassName="text-white">
            My Plants
          </ThemedText>
          <View className="flex-row">
            <TouchableOpacity 
              className="mr-2 w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: theme.colors.primary[500] }}
              onPress={handleRefresh}
            >
              <Ionicons name="refresh" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity 
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: theme.colors.primary[500] }}
              onPress={() => setShowAddMenu(!showAddMenu)}
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {showAddMenu && (
          <ThemedView 
            className="absolute right-4 top-16 z-10 rounded-lg shadow-lg p-2 border"
            lightClassName="bg-white border-neutral-200"
            darkClassName="bg-neutral-800 border-neutral-700"
          >
            <TouchableOpacity 
              className="flex-row items-center p-2"
              onPress={handleAddPlant}
            >
              <Ionicons name="add-circle-outline" size={20} color={isDarkMode ? theme.colors.primary[400] : theme.colors.primary[500]} />
              <ThemedText className="ml-2" lightClassName="text-neutral-800" darkClassName="text-white">
                Add New Plant
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              className="flex-row items-center p-2"
              onPress={() => {
                setShowAddMenu(false);
                router.push('/scan-plant' as any);
              }}
            >
              <Ionicons name="scan-outline" size={20} color={isDarkMode ? theme.colors.primary[400] : theme.colors.primary[500]} />
              <ThemedText className="ml-2" lightClassName="text-neutral-800" darkClassName="text-white">
                Scan Plant
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}

        <View className="mb-4">
          <ThemedView 
            className="flex-row items-center rounded-full px-4 py-2 mb-4 border"
            lightClassName="bg-white border-neutral-200"
            darkClassName="bg-neutral-800 border-neutral-700"
          >
            <Ionicons name="search" size={20} color={isDarkMode ? theme.colors.neutral[400] : theme.colors.neutral[500]} />
            <TextInput
              className="flex-1 ml-2 text-base"
              style={{ color: isDarkMode ? theme.colors.neutral[200] : theme.colors.neutral[800] }}
              placeholder="Search plants..."
              placeholderTextColor={isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[400]}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </ThemedView>

          <FlatList
            data={LOCATIONS}
            renderItem={renderLocationItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4"
          />
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={theme.colors.primary[500]} />
            <ThemedText className="mt-4 text-center" lightClassName="text-neutral-600" darkClassName="text-neutral-400">
              Loading plants...
            </ThemedText>
          </View>
        ) : currentPlantList.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <MaterialCommunityIcons 
              name="leaf-off" 
              size={60} 
              color={isDarkMode ? theme.colors.neutral[600] : theme.colors.neutral[400]} 
            />
            <ThemedText className="mt-4 text-center text-lg font-medium" lightClassName="text-neutral-600" darkClassName="text-neutral-400">
              No plants found
            </ThemedText>
            <ThemedText className="mt-2 text-center" lightClassName="text-neutral-500" darkClassName="text-neutral-500">
              {searchQuery ? 'Try a different search term' : 'Add your first plant to get started'}
            </ThemedText>
            <TouchableOpacity
              className="mt-6 px-6 py-3 rounded-full"
              style={{ backgroundColor: theme.colors.primary[500] }}
              onPress={handleAddPlant}
            >
              <Text className="text-white font-medium">Add Plant</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView 
            className="flex-1"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          >
            <View className="flex-row flex-wrap justify-between">
              {currentPlantList.map((plant) => (
                <View key={plant.id} className="w-[48%]">
                  {renderPlantCard(plant)}
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        <Modal
          visible={isAddPlantModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsAddPlantModalVisible(false)}
        >
          <BlurView intensity={10} className="absolute inset-0" />
          <ThemedView 
            className="flex-1 mt-20 rounded-t-3xl overflow-hidden"
            lightClassName="bg-white"
            darkClassName="bg-neutral-900"
          >
            <View className="flex-row justify-between items-center p-4 border-b" style={{ borderColor: isDarkMode ? theme.colors.neutral[800] : theme.colors.neutral[200] }}>
              <ThemedText className="text-xl font-bold" lightClassName="text-neutral-800" darkClassName="text-white">
                Add New Plant
              </ThemedText>
              <TouchableOpacity onPress={() => setIsAddPlantModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDarkMode ? theme.colors.neutral[400] : theme.colors.neutral[500]} />
              </TouchableOpacity>
            </View>
            <ScrollView className="flex-1 p-4">
              <AddPlantForm onSuccess={handleAddPlantSuccess} />
            </ScrollView>
          </ThemedView>
        </Modal>
      </ThemedView>
    </SafeAreaView>
  );
}

// Export the HomeScreen component for use with HOCs
export default function HomeScreenContainer() {
  // Get access to the plants collection from the Watermelon hook
  const { plants } = useWatermelon();
  
  // Create an enhanced component that observes the plants collection
  const EnhancedHomeScreen = withObservables([], () => ({
    plants: plants
      .query(Q.where('is_deleted', Q.notEq(true)))
      .observeWithColumns(['id', 'name', 'strain', 'growthStage', 'imageUrl', 'locationId', 'notes', 'createdAt', 'next_water_date', 'next_feed_date'])
  }))(HomeScreen);
  
  // Render the enhanced component
  return <EnhancedHomeScreen />;
}
