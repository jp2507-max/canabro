import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import { BlurView as ExpoBlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import * as React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  FlatList,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomSkeletonPlaceholder from '../../components/ui/CustomSkeletonPlaceholder';

import { AddPlantForm } from '../../components/AddPlantForm';
import ThemedText from '../../components/ui/ThemedText';
import ThemedView from '../../components/ui/ThemedView';
import { useTheme } from '../../lib/contexts/ThemeContext';
import usePullToRefresh from '../../lib/hooks/usePullToRefresh';
import useWatermelon from '../../lib/hooks/useWatermelon';
import { Plant } from '../../lib/models/Plant';

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
  // const { sync } = useWatermelon(); // sync is unused
  const { theme, isDarkMode } = useTheme();
  const { refreshing, handleRefresh } = usePullToRefresh({
    // Restore hook usage
    showFeedback: true,
    forceSync: true,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<PlantFilterKey>('all');
  const [isAddPlantModalVisible, setIsAddPlantModalVisible] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  // Initialize isLoading based on the initial state of the plants prop
  const [isLoading, setIsLoading] = useState(!plants || plants.length === 0);

  useEffect(() => {
    // Update loading state if plants data arrives after the initial render
    // and the state was previously loading.
    if (plants && plants.length > 0 && isLoading) {
      setIsLoading(false);
    }
    // Optional: Handle case where plants array becomes empty after loading?
    // else if ((!plants || plants.length === 0) && !isLoading) {
    //   setIsLoading(true); // Or handle differently if needed
    // }
  }, [plants, isLoading]); // Dependencies are correct

  const filteredPlants = useMemo<FilteredPlants>(() => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    const filtered = plants.filter(
      (plant) =>
        plant.name.toLowerCase().includes(lowerCaseQuery) ||
        plant.strain.toLowerCase().includes(lowerCaseQuery)
    );

    return {
      all: filtered,
      indoor: filtered.filter((p) => getLocationType(p) === 'indoor'),
      outdoor: filtered.filter((p) => getLocationType(p) === 'outdoor'),
      seedling: filtered.filter((p) => p.growthStage === 'Seedling'),
      flowering: filtered.filter((p) => p.growthStage === 'Flowering'),
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

  const renderLocationItem = ({ item }: { item: (typeof LOCATIONS)[0] }) => (
    <TouchableOpacity
      className={`mr-2 flex-row items-center rounded-full px-4 py-2 ${selectedFilter === item.id ? 'bg-green-600' : ''}`}
      style={{
        backgroundColor:
          selectedFilter === item.id
            ? theme.colors.primary[500]
            : isDarkMode
              ? theme.colors.neutral[100]
              : '#e5e7eb',
      }}
      onPress={() => setSelectedFilter(item.id as PlantFilterKey)}>
      <MaterialCommunityIcons
        name={item.icon as any}
        size={16}
        color={
          selectedFilter === item.id
            ? '#ffffff'
            : isDarkMode
              ? theme.colors.neutral[800]
              : '#4b5563'
        }
        style={{ marginRight: 4 }}
      />
      <ThemedText
        className={`text-sm font-medium ${selectedFilter === item.id ? 'text-white' : ''}`}
        lightClassName={selectedFilter === item.id ? '' : 'text-neutral-700'}
        darkClassName={selectedFilter === item.id ? '' : 'text-neutral-800'}>
        {item.name}
      </ThemedText>
    </TouchableOpacity>
  );

  const renderPlantCard = (plant: Plant) => {
    const waterInfo = getNextAction(plant, 'water');
    const feedInfo = getNextAction(plant, 'feed');
    const locationType = getLocationType(plant);
    const locationIcon =
      locationType === 'indoor'
        ? 'home'
        : locationType === 'outdoor'
          ? 'white-balance-sunny'
          : 'help-circle-outline';
    const locationLabel =
      locationType === 'indoor'
        ? 'Indoor'
        : locationType === 'outdoor'
          ? 'Outdoor'
          : 'Unknown Location';

    return (
      // Note: The parent View sets the width to w-[48%]
      <TouchableOpacity
        className="mb-4 w-full active:opacity-80" // Added press effect
        onPress={() => router.push(`/plant/${plant.id}` as any)}
        key={plant.id}
        accessibilityLabel={`View details for plant: ${plant.name}, Strain: ${plant.strain}, Stage: ${plant.growthStage}`}
        accessibilityRole="button">
        <ThemedView
          className="overflow-hidden rounded-xl border shadow-md" // Enhanced shadow
          lightClassName="bg-white border-neutral-200" // Adjusted border color
          darkClassName="bg-neutral-800 border-neutral-700">
          <View className="relative aspect-square">
            {plant.imageUrl ? (
              <Image
                source={{ uri: plant.imageUrl }}
                className="h-full w-full"
                resizeMode="cover"
                accessibilityLabel={`Image of ${plant.name}`}
              />
            ) : (
              <View className="h-full w-full items-center justify-center bg-neutral-200 dark:bg-neutral-700">
                <MaterialCommunityIcons
                  name="flower-tulip"
                  size={60}
                  color={isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[400]}
                  accessibilityLabel="Placeholder image for plant"
                />
              </View>
            )}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']} // Slightly darker gradient
              className="absolute bottom-0 left-0 right-0 h-24 justify-end p-3" // Increased height, adjusted padding
            >
              <Text
                className="text-base font-semibold text-white shadow-black" // Adjusted size/weight
                style={{ textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 } }}
                numberOfLines={1} // Ensure name doesn't wrap excessively
              >
                {plant.name}
              </Text>
              <Text
                className="text-xs text-neutral-200 shadow-black"
                style={{ textShadowRadius: 1, textShadowOffset: { width: 0, height: 1 } }}
                numberOfLines={1}>
                {plant.strain} • {plant.growthStage}
              </Text>
            </LinearGradient>
            {/* Action Indicators */}
            <View className="absolute right-2 top-2 flex-row space-x-1.5">
              {waterInfo && (
                <View
                  className="flex-row items-center rounded-full bg-black/60 px-1.5 py-0.5" // Adjusted padding/opacity
                  accessibilityLabel={`Next watering in ${waterInfo.days} days`}>
                  <MaterialCommunityIcons
                    name={waterInfo.icon as any}
                    size={12}
                    color={waterInfo.color}
                  />
                  <Text className="ml-1 text-[10px] font-medium text-white">{waterInfo.days}d</Text>
                </View>
              )}
              {feedInfo && (
                <View
                  className="flex-row items-center rounded-full bg-black/60 px-1.5 py-0.5" // Adjusted padding/opacity
                  accessibilityLabel={`Next feeding in ${feedInfo.days} days`}>
                  <MaterialCommunityIcons
                    name={feedInfo.icon as any}
                    size={12}
                    color={feedInfo.color}
                  />
                  <Text className="ml-1 text-[10px] font-medium text-white">{feedInfo.days}d</Text>
                </View>
              )}
            </View>
            {/* Location Indicator */}
            <View
              className="absolute left-2 top-2 rounded-full bg-black/60 p-1" // Adjusted padding/opacity
              accessibilityLabel={`Location: ${locationLabel}`}>
              <MaterialCommunityIcons name={locationIcon as any} size={14} color="#ffffff" />
            </View>
          </View>
        </ThemedView>
      </TouchableOpacity>
    );
  };

  const getNextAction = (plant: Plant, type: 'water' | 'feed') => {
    if (!plant.createdAt) return null;
    const plantDate = new Date(plant.createdAt);
    const mockDays =
      type === 'water'
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
      // Use theme colors for consistency
      color: type === 'water' ? theme.colors.special.watering : theme.colors.special.feeding,
    };
  };

  const handleAddPlant = () => {
    setIsAddPlantModalVisible(true);
  };

  const handleAddPlantSuccess = () => {
    setIsAddPlantModalVisible(false);
    // Use handleRefresh from the hook if you want to trigger sync after adding
    // Or call sync directly if needed: sync({ force: true });
    handleRefresh(); // Example: Trigger refresh after adding
  };

  // handleRefresh is now provided by the usePullToRefresh hook

  // Skeleton component matching the PlantCard structure
  const PlantCardSkeleton = () => (
    <View className="mb-4 w-[48%]">
      <CustomSkeletonPlaceholder
        backgroundColor={isDarkMode ? theme.colors.neutral[700] : theme.colors.neutral[200]}
        highlightColor={isDarkMode ? theme.colors.neutral[600] : theme.colors.neutral[100]}
        speed={1000}>
        <CustomSkeletonPlaceholder.Item width="100%" aspectRatio={1} borderRadius={12} />
        {/* Mimics the image container */}
      </CustomSkeletonPlaceholder>
    </View>
  );

  return (
    <SafeAreaView className="flex-1">
      <ThemedView
        className="flex-1 p-4"
        lightClassName="bg-neutral-50"
        darkClassName="bg-neutral-900">
        <View className="mb-4 flex-row items-center justify-between">
          <ThemedText
            className="text-2xl font-bold"
            lightClassName="text-neutral-800"
            darkClassName="text-white">
            My Plants
          </ThemedText>
          <View className="flex-row">
            <TouchableOpacity
              className="mr-2 h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: theme.colors.primary[500] }}
              onPress={handleRefresh}>
              <Ionicons name="refresh" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: theme.colors.primary[500] }}
              onPress={() => setShowAddMenu(!showAddMenu)}>
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {showAddMenu && (
          <ThemedView
            className="absolute right-4 top-16 z-10 rounded-lg border p-2 shadow-lg"
            lightClassName="bg-white border-neutral-200"
            darkClassName="bg-neutral-800 border-neutral-700">
            <TouchableOpacity className="flex-row items-center p-2" onPress={handleAddPlant}>
              <Ionicons
                name="add-circle-outline"
                size={20}
                color={isDarkMode ? theme.colors.primary[400] : theme.colors.primary[500]}
              />
              <ThemedText
                className="ml-2"
                lightClassName="text-neutral-800"
                darkClassName="text-white">
                Add New Plant
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center p-2"
              onPress={() => {
                setShowAddMenu(false);
                router.push('/scan-plant' as any);
              }}>
              <Ionicons
                name="scan-outline"
                size={20}
                color={isDarkMode ? theme.colors.primary[400] : theme.colors.primary[500]}
              />
              <ThemedText
                className="ml-2"
                lightClassName="text-neutral-800"
                darkClassName="text-white">
                Scan Plant
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}

        <View className="mb-4">
          <ThemedView
            className="mb-4 flex-row items-center rounded-full border px-4 py-2"
            lightClassName="bg-white border-neutral-200"
            darkClassName="bg-neutral-800 border-neutral-700">
            <Ionicons
              name="search"
              size={20}
              color={isDarkMode ? theme.colors.neutral[400] : theme.colors.neutral[500]}
            />
            <TextInput
              className="ml-2 flex-1 text-base"
              style={{ color: isDarkMode ? theme.colors.neutral[200] : theme.colors.neutral[800] }}
              placeholder="Search plants..."
              placeholderTextColor={
                isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[400]
              }
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
          // Show skeleton loader when loading
          <View className="flex-1">
            <ScrollView
              className="flex-1"
              showsVerticalScrollIndicator={false}
              // No refresh control needed for skeleton view
            >
              <View className="flex-row flex-wrap justify-between">
                {/* Render multiple skeletons */}
                {[...Array(6)].map((_, index) => (
                  <PlantCardSkeleton key={`skeleton-${index}`} />
                ))}
              </View>
            </ScrollView>
          </View>
        ) : currentPlantList.length === 0 ? (
          <View className="flex-1 items-center justify-center pt-10">
            {' '}
            {/* Added padding top */}
            <MaterialCommunityIcons
              name="leaf-off"
              size={60}
              color={isDarkMode ? theme.colors.neutral[600] : theme.colors.neutral[400]}
            />
            <ThemedText
              className="mt-4 text-center text-lg font-medium"
              lightClassName="text-neutral-700"
              darkClassName="text-neutral-300">
              {' '}
              {/* Adjusted colors */}
              No plants found
            </ThemedText>
            <ThemedText
              className="mt-2 px-4 text-center"
              lightClassName="text-neutral-500"
              darkClassName="text-neutral-400">
              {' '}
              {/* Adjusted colors and padding */}
              {searchQuery
                ? `No plants match "${searchQuery}". Try a different search.`
                : 'Your garden is empty! Add your first plant to get started.'}
            </ThemedText>
            <TouchableOpacity
              className="mt-8 rounded-full px-8 py-3 active:opacity-80" // Increased margin, padding, added effect
              style={{ backgroundColor: theme.colors.primary[500] }}
              onPress={handleAddPlant}>
              <Text className="font-medium text-white">Add Plant</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing} // Use refreshing from the hook
                onRefresh={handleRefresh} // Use handleRefresh from the hook
                // Optionally add colors if desired, but hook doesn't provide them by default
                // colors={[theme.colors.primary[500]]}
                // tintColor={theme.colors.primary[500]}
              />
            }>
            {/* Use FlatList for better performance with large lists */}
            <FlatList
              data={currentPlantList}
              renderItem={({ item }) => (
                // Apply width styling here for the grid item
                <View className="w-[48%]">{renderPlantCard(item)}</View>
              )}
              keyExtractor={(item) => item.id}
              numColumns={2} // Specify number of columns for FlatList grid layout
              columnWrapperStyle={{ justifyContent: 'space-between' }} // Distribute space between columns
              showsVerticalScrollIndicator={false}
              // Keep RefreshControl on the parent ScrollView if preferred,
              // or move it here if this FlatList becomes the primary scrollable element.
              // For simplicity, let's assume the parent ScrollView handles refresh for now.
            />
          </ScrollView>
        )}

        <Modal
          visible={isAddPlantModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setIsAddPlantModalVisible(false)}>
          <ExpoBlurView
            intensity={10}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <ThemedView
            className="mt-20 flex-1 overflow-hidden rounded-t-3xl"
            lightClassName="bg-white"
            darkClassName="bg-neutral-900">
            <View
              className="flex-row items-center justify-between border-b p-4"
              style={{
                borderColor: isDarkMode ? theme.colors.neutral[800] : theme.colors.neutral[200],
              }}>
              <ThemedText
                className="text-xl font-bold"
                lightClassName="text-neutral-800"
                darkClassName="text-white">
                Add New Plant
              </ThemedText>
              <TouchableOpacity onPress={() => setIsAddPlantModalVisible(false)}>
                <Ionicons
                  name="close"
                  size={24}
                  color={isDarkMode ? theme.colors.neutral[400] : theme.colors.neutral[500]}
                />
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
      .observeWithColumns([
        'id',
        'name',
        'strain',
        'growthStage',
        'imageUrl',
        'locationId',
        'notes',
        'createdAt',
        'next_water_date',
        'next_feed_date',
      ]),
  }))(HomeScreen);

  // Render the enhanced component
  return <EnhancedHomeScreen />;
}
