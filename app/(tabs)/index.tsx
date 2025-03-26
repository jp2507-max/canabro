import { Link, router } from 'expo-router';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Image, FlatList, ActivityIndicator, Pressable, Modal } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '../../lib/hooks/useDatabase';
import { useState, useEffect } from 'react';
import { useTheme } from '../../lib/contexts/ThemeContext';
import ThemedView from '../../components/ui/ThemedView';
import ThemedText from '../../components/ui/ThemedText';
import { AddPlantForm } from '../../components/AddPlantForm';
import { Plant } from '../../lib/models/Plant';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

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

export default function HomeScreen() {
  const { database } = useDatabase();
  const { theme, isDarkMode } = useTheme();
  const [plantCount, setPlantCount] = useState(0);
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
      setPlantCount(allPlants.length);
      
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

  useEffect(() => {
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
  const getNextAction = (plant: Plant, type: 'water' | 'feed') => {
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
          <View className="aspect-square relative">
            {plant.imageUrl ? (
              <Image 
                source={{ uri: plant.imageUrl }} 
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-full items-center justify-center bg-green-50">
                <MaterialCommunityIcons 
                  name="cannabis" 
                  size={64} 
                  color={isDarkMode ? theme.colors.primary[700] : theme.colors.primary[300]} 
                />
              </View>
            )}
            
            {/* Location badge */}
            <View 
              className="absolute top-2 left-2 px-2 py-1 rounded-full bg-black bg-opacity-50 flex-row items-center"
            >
              <Ionicons 
                name={locationType === 'indoor' ? 'home' : locationType === 'outdoor' ? 'sunny' : 'help-circle'} 
                size={12} 
                color="#fff" 
              />
              <Text className="text-white text-xs ml-1 capitalize">
                {locationType}
              </Text>
            </View>
            
            {/* Growth stage badge */}
            {plant.growthStage && (
              <View 
                className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black bg-opacity-50"
              >
                <Text className="text-white text-xs capitalize">
                  {plant.growthStage}
                </Text>
              </View>
            )}
          </View>
          
          <View className="p-3">
            <ThemedText 
              className="font-semibold text-lg" 
              lightClassName="text-gray-900"
              darkClassName="text-white"
            >
              {plant.name}
            </ThemedText>
            
            <ThemedText 
              className="text-sm mb-2" 
              lightClassName="text-gray-600"
              darkClassName="text-gray-400"
            >
              {plant.strain || 'Unknown strain'}
            </ThemedText>
            
            {/* Next actions row */}
            <View className="flex-row items-center mt-1">
              {waterInfo && (
                <View className="flex-row items-center mr-4">
                  <Ionicons name="water-outline" size={16} color={waterInfo.color} />
                  <ThemedText 
                    className="ml-1 text-xs" 
                    lightClassName="text-gray-700"
                    darkClassName="text-gray-300"
                  >
                    {waterInfo.days}d
                  </ThemedText>
                </View>
              )}
              
              {feedInfo && (
                <View className="flex-row items-center">
                  <MaterialCommunityIcons name="nutrition" size={16} color={feedInfo.color} />
                  <ThemedText 
                    className="ml-1 text-xs" 
                    lightClassName="text-gray-700"
                    darkClassName="text-gray-300"
                  >
                    {feedInfo.days}d
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        </ThemedView>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.neutral[50] }}>
      <ScrollView className="flex-1">
        <ThemedView className="p-4">
          <ThemedText className="text-2xl font-bold mb-4" 
                    lightClassName="text-neutral-900" 
                    darkClassName="text-white">
            Welcome to CanaBro
          </ThemedText>
          
          {/* Plant management section */}
          <ThemedView className="rounded-xl p-4 mb-6"
                     lightClassName="bg-green-50"
                     darkClassName="bg-primary-900">
            <View className="flex-row justify-between items-center mb-4">
              <ThemedText className="text-lg font-semibold"
                        lightClassName="text-neutral-900"
                        darkClassName="text-primary-300">
                Your Plants
              </ThemedText>
              <TouchableOpacity 
                className="bg-green-600 px-3 py-2 rounded-lg"
                onPress={() => setIsAddPlantModalVisible(true)}
              >
                <Text className="text-white font-medium">Add Plant</Text>
              </TouchableOpacity>
            </View>
            
            {/* Search bar */}
            <View className="mb-4">
              <View className="flex-row items-center px-3 py-2 bg-white dark:bg-neutral-700 rounded-lg border border-gray-200 dark:border-neutral-600">
                <Ionicons name="search" size={18} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                <TextInput
                  className="flex-1 ml-2 text-black dark:text-white"
                  placeholder="Search plants..."
                  placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>
            
            {/* Location filters */}
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={LOCATIONS}
              renderItem={renderLocationItem}
              keyExtractor={item => item.id}
              className="mb-4"
            />
            
            {/* Plants list */}
            {loading ? (
              <View className="py-8 items-center">
                <ActivityIndicator size="large" color={theme.colors.primary[500]} />
                <ThemedText className="mt-2 text-center" 
                         lightClassName="text-gray-500"
                         darkClassName="text-gray-400">
                  Loading your plants...
                </ThemedText>
              </View>
            ) : displayedPlants.length > 0 ? (
              <View>
                {displayedPlants.map(plant => (
                  <View key={plant.id}>
                    {renderPlantCard(plant)}
                  </View>
                ))}
              </View>
            ) : (
              <View className="py-8 items-center">
                <MaterialCommunityIcons 
                  name="cannabis" 
                  size={64} 
                  color={isDarkMode ? theme.colors.primary[700] : theme.colors.primary[300]} 
                />
                <ThemedText className="mt-4 text-center font-medium text-lg" 
                         lightClassName="text-gray-700"
                         darkClassName="text-gray-300">
                  No plants found
                </ThemedText>
                <ThemedText className="mt-1 text-center" 
                         lightClassName="text-gray-500"
                         darkClassName="text-gray-400">
                  {searchQuery 
                    ? "No plants match your search" 
                    : selectedCategory !== 'all' 
                      ? `You don't have any plants in this category yet` 
                      : "Tap 'Add Plant' to get started"}
                </ThemedText>
              </View>
            )}
          </ThemedView>
          
          {/* Quick access section */}
          <ThemedText className="text-lg font-semibold mb-3" 
                     lightClassName="text-neutral-900"
                     darkClassName="text-white">
            Quick Access
          </ThemedText>
          
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
              onPress={() => router.push('/strains')}
            >
              <Ionicons name="leaf-outline" size={24} color={isDarkMode ? "#4ade80" : "#16a34a"} />
              <ThemedText className="font-semibold mt-2"
                         lightClassName="text-neutral-900"
                         darkClassName="text-white">
                Strains
              </ThemedText>
              <ThemedText className="text-sm"
                         lightClassName="text-gray-600" 
                         darkClassName="text-neutral-400">
                Browse cannabis strains
              </ThemedText>
            </TouchableOpacity>
          </View>
          
          {/* Growing tips section */}
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

      {/* Add Plant Modal */}
      <Modal
        visible={isAddPlantModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAddPlantModalVisible(false)}
      >
        <ThemedView 
          className="flex-1 justify-end"
          lightClassName="bg-black bg-opacity-50"
          darkClassName="bg-black bg-opacity-70"
        >
          <ThemedView 
            className="rounded-t-3xl p-4 h-5/6"
            lightClassName="bg-white"
            darkClassName="bg-neutral-900"
          >
            <View className="flex-row justify-between items-center mb-4">
              <ThemedText className="text-xl font-bold"
                        lightClassName="text-neutral-900"
                        darkClassName="text-white">
                Add New Plant
              </ThemedText>
              <TouchableOpacity onPress={() => setIsAddPlantModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDarkMode ? 'white' : 'black'} />
              </TouchableOpacity>
            </View>
            <AddPlantForm 
              onSuccess={() => {
                setIsAddPlantModalVisible(false);
                // Refresh plants list
                fetchPlants();
              }}
            />
          </ThemedView>
        </ThemedView>
      </Modal>

      {/* Add button */}
      <TouchableOpacity
        className="absolute right-5 bottom-5 w-14 h-14 rounded-full bg-green-600 items-center justify-center shadow-lg z-10"
        onPress={() => setIsAddPlantModalVisible(true)}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
