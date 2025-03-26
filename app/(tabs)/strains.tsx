"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, TouchableOpacity, ScrollView, TextInput, Image, FlatList, ActivityIndicator, Pressable, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useProtectedRoute } from '../../lib/hooks/useProtectedRoute';
import { StatusBar } from 'expo-status-bar';
import { useDatabase } from '../../lib/contexts/DatabaseProvider';
import { router } from 'expo-router';
import ThemedView from '../../components/ui/ThemedView';
import ThemedText from '../../components/ui/ThemedText';
import { useTheme } from '../../lib/contexts/ThemeContext';
import { Strain, StrainSpecies, StrainEffectType, StrainFlavorType, StrainDifficulty } from '../../lib/types/strain';

// Define filter categories
const CATEGORIES = [
  { id: 'all', name: 'All Strains', icon: 'cannabis' },
  { id: StrainSpecies.INDICA, name: 'Indica', icon: 'moon-waning-crescent' },
  { id: StrainSpecies.SATIVA, name: 'Sativa', icon: 'white-balance-sunny' },
  { id: StrainSpecies.HYBRID, name: 'Hybrid', icon: 'palette-swatch' },
  { id: 'popular', name: 'Popular', icon: 'star' },
];

// Mock strains data (in a real app, this would come from your backend)
const MOCK_STRAINS: Strain[] = [
  {
    id: '1',
    name: 'OG Kush',
    species: StrainSpecies.HYBRID,
    thc_content: 20,
    cbd_content: 0.3,
    description: 'OG Kush is a legendary strain with a strong, fuel-like aroma and euphoric high.',
    image_url: 'https://leafly-public.imgix.net/strains/photos/jjpNJdwSQPeregHTfbJt_OG-Kush-1.jpg',
    effects: [StrainEffectType.RELAXED, StrainEffectType.HAPPY, StrainEffectType.EUPHORIC, StrainEffectType.UPLIFTED, StrainEffectType.SLEEPY],
    flavors: [StrainFlavorType.EARTHY, StrainFlavorType.PINE, StrainFlavorType.WOODY],
    difficulty: StrainDifficulty.INTERMEDIATE,
    flowering_time: 8,
    yield_indoor: 'medium',
    yield_outdoor: 'medium',
    is_auto_flower: false,
    is_feminized: true,
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Blue Dream',
    species: StrainSpecies.HYBRID,
    thc_content: 18,
    cbd_content: 0.1,
    description: 'Blue Dream is a sativa-dominant hybrid known for its balanced effects and sweet berry aroma.',
    image_url: 'https://leafly-public.imgix.net/strains/photos/gaDeFIaSRV23V6XvE43a_blue-dream-1.jpg',
    effects: [StrainEffectType.RELAXED, StrainEffectType.HAPPY, StrainEffectType.EUPHORIC, StrainEffectType.CREATIVE, StrainEffectType.ENERGETIC],
    flavors: [StrainFlavorType.BERRY, StrainFlavorType.SWEET, StrainFlavorType.BLUEBERRY],
    difficulty: StrainDifficulty.BEGINNER,
    flowering_time: 10,
    yield_indoor: 'high',
    yield_outdoor: 'high',
    is_auto_flower: false,
    is_feminized: true,
    created_at: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Girl Scout Cookies',
    species: StrainSpecies.HYBRID,
    thc_content: 23,
    cbd_content: 0.2,
    description: 'GSC is a hybrid strain with a sweet and earthy aroma, known for its potent effects.',
    image_url: 'https://leafly-public.imgix.net/strains/photos/SMKn4NVmRBmlCUWyPLwj_cookies-1.jpg',
    effects: [StrainEffectType.RELAXED, StrainEffectType.HAPPY, StrainEffectType.EUPHORIC, StrainEffectType.UPLIFTED, StrainEffectType.CREATIVE],
    flavors: [StrainFlavorType.SWEET, StrainFlavorType.EARTHY, StrainFlavorType.VANILLA],
    difficulty: StrainDifficulty.INTERMEDIATE,
    flowering_time: 9,
    yield_indoor: 'medium',
    yield_outdoor: 'medium',
    is_auto_flower: false,
    is_feminized: true,
    created_at: new Date().toISOString()
  },
  {
    id: '4',
    name: 'Northern Lights',
    species: StrainSpecies.INDICA,
    thc_content: 16,
    cbd_content: 0.1,
    description: 'Northern Lights is a pure indica strain known for its resinous buds and resilient growth.',
    image_url: 'https://leafly-public.imgix.net/strains/photos/JlFmcIgXR7SD7zL6rGR0_northern-lights-1.jpg',
    effects: [StrainEffectType.RELAXED, StrainEffectType.SLEEPY, StrainEffectType.HAPPY, StrainEffectType.HUNGRY, StrainEffectType.EUPHORIC],
    flavors: [StrainFlavorType.SWEET, StrainFlavorType.SPICY, StrainFlavorType.EARTHY],
    difficulty: StrainDifficulty.BEGINNER,
    flowering_time: 7,
    yield_indoor: 'high',
    yield_outdoor: 'high',
    is_auto_flower: false,
    is_feminized: true,
    created_at: new Date().toISOString()
  },
  {
    id: '5',
    name: 'Sour Diesel',
    species: StrainSpecies.SATIVA,
    thc_content: 19,
    cbd_content: 0.2,
    description: 'Sour Diesel is a fast-acting sativa with a pungent diesel aroma, delivering energizing effects.',
    image_url: 'https://leafly-public.imgix.net/strains/photos/lSTyn2nURy207UJaZHBZ_sour-diesel-1.jpg',
    effects: [StrainEffectType.ENERGETIC, StrainEffectType.HAPPY, StrainEffectType.UPLIFTED, StrainEffectType.FOCUSED, StrainEffectType.CREATIVE],
    flavors: [StrainFlavorType.DIESEL, StrainFlavorType.PUNGENT, StrainFlavorType.CITRUS],
    difficulty: StrainDifficulty.INTERMEDIATE,
    flowering_time: 10,
    yield_indoor: 'medium',
    yield_outdoor: 'medium',
    is_auto_flower: false,
    is_feminized: true,
    created_at: new Date().toISOString()
  },
  {
    id: '6',
    name: 'Granddaddy Purple',
    species: StrainSpecies.INDICA,
    thc_content: 17,
    cbd_content: 0.1,
    description: 'GDP is a famous indica strain with dense purple buds and grape flavor.',
    image_url: 'https://leafly-public.imgix.net/strains/photos/N3qGtLCSQKabpBg7phbf_granddaddy-purple-20.jpg',
    effects: [StrainEffectType.RELAXED, StrainEffectType.SLEEPY, StrainEffectType.HAPPY, StrainEffectType.HUNGRY, StrainEffectType.EUPHORIC],
    flavors: [StrainFlavorType.GRAPE, StrainFlavorType.BERRY, StrainFlavorType.SWEET],
    difficulty: StrainDifficulty.BEGINNER,
    flowering_time: 8,
    yield_indoor: 'medium',
    yield_outdoor: 'medium',
    is_auto_flower: false,
    is_feminized: true,
    created_at: new Date().toISOString()
  },
  {
    id: '7',
    name: 'Jack Herer',
    species: StrainSpecies.SATIVA,
    thc_content: 18,
    cbd_content: 0.2,
    description: 'Jack Herer is a sativa-dominant strain that delivers a clear-headed, blissful high.',
    image_url: 'https://leafly-public.imgix.net/strains/photos/g9EE8xWSR2OJZiPhvdcE_jack-herer.jpg',
    effects: [StrainEffectType.HAPPY, StrainEffectType.UPLIFTED, StrainEffectType.CREATIVE, StrainEffectType.ENERGETIC, StrainEffectType.FOCUSED],
    flavors: [StrainFlavorType.EARTHY, StrainFlavorType.PINE, StrainFlavorType.WOODY],
    difficulty: StrainDifficulty.INTERMEDIATE,
    flowering_time: 9,
    yield_indoor: 'medium',
    yield_outdoor: 'medium',
    is_auto_flower: false,
    is_feminized: true,
    created_at: new Date().toISOString()
  },
  {
    id: '8',
    name: 'Durban Poison',
    species: StrainSpecies.SATIVA,
    thc_content: 20,
    cbd_content: 0.02,
    description: 'Durban Poison is a pure sativa with an energetic and uplifting high, perfect for daytime use.',
    image_url: 'https://leafly-public.imgix.net/strains/photos/9yIX8jjTRB28gDc4hgHx_durban-poison-5.jpg',
    effects: [StrainEffectType.ENERGETIC, StrainEffectType.FOCUSED, StrainEffectType.HAPPY, StrainEffectType.CREATIVE, StrainEffectType.UPLIFTED],
    flavors: [StrainFlavorType.SWEET, StrainFlavorType.PINE, StrainFlavorType.EARTHY],
    difficulty: StrainDifficulty.BEGINNER,
    flowering_time: 9,
    yield_indoor: 'high',
    yield_outdoor: 'high',
    is_auto_flower: false,
    is_feminized: true,
    created_at: new Date().toISOString()
  }
];

// Define Components for Reuse
const EffectTag = ({ effect, size = 'small' }: { effect: StrainEffectType, size?: 'small' | 'large' }) => {
  const { isDarkMode } = useTheme();
  
  // Map effects to colors
  const effectColors: Record<string, { bg: string, text: string }> = {
    // Positive effects
    [StrainEffectType.HAPPY]: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-800 dark:text-yellow-300' },
    [StrainEffectType.RELAXED]: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-800 dark:text-blue-300' },
    [StrainEffectType.EUPHORIC]: { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-800 dark:text-purple-300' },
    [StrainEffectType.UPLIFTED]: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-300' },
    [StrainEffectType.CREATIVE]: { bg: 'bg-pink-100 dark:bg-pink-900', text: 'text-pink-800 dark:text-pink-300' },
    [StrainEffectType.ENERGETIC]: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-300' },
    [StrainEffectType.FOCUSED]: { bg: 'bg-indigo-100 dark:bg-indigo-900', text: 'text-indigo-800 dark:text-indigo-300' },
    // Potential concerns
    [StrainEffectType.SLEEPY]: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-800 dark:text-gray-300' },
    [StrainEffectType.HUNGRY]: { bg: 'bg-orange-100 dark:bg-orange-900', text: 'text-orange-800 dark:text-orange-300' },
    // Additional effects could be added here as they become available in the enum
  };
  
  const style = effectColors[effect] || { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-300' };
  
  return (
    <View className={`${style.bg} rounded-full px-2 py-1 mr-2 mb-2`}>
      <ThemedText className={`${style.text} text-xs ${size === 'large' ? 'font-medium' : ''}`}>
        {effect}
      </ThemedText>
    </View>
  );
};

const FlavorTag = ({ flavor }: { flavor: StrainFlavorType }) => {
  // Map flavors to colors
  const flavorColors: Record<string, { bg: string, text: string }> = {
    [StrainFlavorType.SWEET]: { bg: 'bg-pink-100 dark:bg-pink-900', text: 'text-pink-800 dark:text-pink-300' },
    [StrainFlavorType.EARTHY]: { bg: 'bg-brown-100 dark:bg-amber-900', text: 'text-amber-800 dark:text-amber-300' },
    [StrainFlavorType.CITRUS]: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-800 dark:text-yellow-300' },
    [StrainFlavorType.BERRY]: { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-800 dark:text-purple-300' },
    [StrainFlavorType.PINE]: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-300' },
    [StrainFlavorType.WOODY]: { bg: 'bg-amber-100 dark:bg-amber-900', text: 'text-amber-800 dark:text-amber-300' },
    [StrainFlavorType.DIESEL]: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-800 dark:text-gray-300' },
    [StrainFlavorType.PUNGENT]: { bg: 'bg-indigo-100 dark:bg-indigo-900', text: 'text-indigo-800 dark:text-indigo-300' },
    [StrainFlavorType.SPICY]: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-300' },
    [StrainFlavorType.VANILLA]: { bg: 'bg-cream-100 dark:bg-amber-900', text: 'text-amber-800 dark:text-amber-300' },
    [StrainFlavorType.BLUEBERRY]: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-800 dark:text-blue-300' },
    [StrainFlavorType.GRAPE]: { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-800 dark:text-purple-300' },
  };
  
  const style = flavorColors[flavor] || { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-300' };
  
  return (
    <View className={`${style.bg} rounded-full px-2 py-1 mr-2 mb-2`}>
      <ThemedText className={`${style.text} text-xs`}>
        {flavor}
      </ThemedText>
    </View>
  );
};

export default function StrainsScreen() {
  useProtectedRoute();
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [strains, setStrains] = useState<Strain[]>([]);
  const [strainsByCategory, setStrainsByCategory] = useState<{[key: string]: Strain[]}>({});
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Filter strains based on search query
  const filteredStrains = strains.filter(strain => {
    const matchesSearch = searchQuery === '' || 
      strain.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      strain.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || 
      strain.species === selectedCategory || 
      (selectedCategory === 'popular' && strains.indexOf(strain) < 4); // First 4 strains are considered popular
    
    return matchesSearch && matchesCategory;
  });

  // Featured strains (top rated or newly added)
  const featuredStrains = useMemo(() => {
    return strains.slice(0, 3); // Just take the first 3 for now
  }, [strains]);

  // Fetch strains data (would connect to your backend in a real app)
  useEffect(() => {
    const loadStrains = async () => {
      try {
        setLoading(true);
        // In a real app, you'd fetch from your API here
        // For now, using mock data
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setStrains(MOCK_STRAINS);
        
        // Organize strains by category
        const byCategory: {[key: string]: Strain[]} = {
          all: MOCK_STRAINS,
          [StrainSpecies.INDICA]: MOCK_STRAINS.filter(s => s.species === StrainSpecies.INDICA),
          [StrainSpecies.SATIVA]: MOCK_STRAINS.filter(s => s.species === StrainSpecies.SATIVA),
          [StrainSpecies.HYBRID]: MOCK_STRAINS.filter(s => s.species === StrainSpecies.HYBRID),
          popular: MOCK_STRAINS.slice(0, 4), // Just a simple way to mock "popular" strains
        };
        
        setStrainsByCategory(byCategory);
        setLoading(false);
      } catch (error) {
        console.error('Error loading strains:', error);
        setLoading(false);
      }
    };

    loadStrains();
  }, []);

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // In a real app, you'd refetch data here
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  // View strain details (would navigate to a detail screen in a real app)
  const viewStrainDetails = (strain: Strain) => {
    // In a real app, navigate to a detail screen
    // router.push(`/strain/${strain.id}`);
    
    // Instead of just showing an alert, let's create a modal view in the future
    // For now, enhancing the Alert dialog
    Alert.alert(
      strain.name,
      `${strain.description}\n\nTHC: ${strain.thc_content}% | CBD: ${strain.cbd_content}%\n\nGrow Difficulty: ${strain.difficulty}\nFlowering Time: ${strain.flowering_time} weeks\n\nEffects: ${strain.effects?.join(', ') || 'None'}\nFlavors: ${strain.flavors?.join(', ') || 'None'}`,
      [
        {
          text: 'Close',
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <ThemedView className="flex-1">
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="px-4 pt-2 pb-2 flex-row items-center justify-between">
          <ThemedText className="text-2xl font-bold">Strains</ThemedText>
          <TouchableOpacity
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-800"
            onPress={() => {
              // In a real app, navigate to settings or filter page
              Alert.alert('Coming Soon', 'Filter options will be available here.');
            }}
          >
            <Ionicons name="options-outline" size={24} color={isDarkMode ? '#d1d5db' : '#374151'} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="px-4 pb-3">
          <View className="flex-row items-center px-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
            <Ionicons name="search" size={20} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
            <TextInput
              placeholder="Search strains..."
              placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
              className="flex-1 py-3 px-2 text-gray-900 dark:text-white"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color={isDarkMode ? '#d1d5db' : '#374151'} />
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {/* Featured Strains */}
            {searchQuery.length === 0 && (
              <View className="mb-6">
                <View className="px-4 flex-row justify-between items-center mb-2">
                  <ThemedText className="text-lg font-bold">Featured Strains</ThemedText>
                  <TouchableOpacity onPress={() => setSelectedCategory('popular')}>
                    <ThemedText className="text-sm text-blue-600 dark:text-blue-400">See All</ThemedText>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingLeft: 16, paddingRight: 8 }}
                >
                  {featuredStrains.map((strain) => (
                    <Pressable
                      key={strain.id}
                      onPress={() => viewStrainDetails(strain)}
                      className="mr-4 bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm w-72"
                    >
                      {strain.image_url ? (
                        <Image
                          source={{ uri: strain.image_url }}
                          className="w-full h-40"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="w-full h-40 bg-gray-200 dark:bg-gray-700 justify-center items-center">
                          <MaterialCommunityIcons name="cannabis" size={40} color={isDarkMode ? '#4b5563' : '#9ca3af'} />
                        </View>
                      )}
                      <View className="p-3">
                        <View className="flex-row justify-between items-center mb-1">
                          <ThemedText className="text-lg font-semibold">{strain.name}</ThemedText>
                          <View className="bg-green-100 dark:bg-green-900 rounded-full px-2 py-1">
                            <ThemedText className="text-xs font-medium text-green-800 dark:text-green-300 capitalize">
                              {strain.species}
                            </ThemedText>
                          </View>
                        </View>
                        <ThemedText numberOfLines={2} className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {strain.description}
                        </ThemedText>
                        <View className="flex-row">
                          <View className="bg-purple-100 dark:bg-purple-900 rounded-full px-2 py-1 mr-2">
                            <ThemedText className="text-xs font-medium text-purple-800 dark:text-purple-300">
                              THC: {strain.thc_content}%
                            </ThemedText>
                          </View>
                          <View className="bg-blue-100 dark:bg-blue-900 rounded-full px-2 py-1">
                            <ThemedText className="text-xs font-medium text-blue-800 dark:text-blue-300">
                              CBD: {strain.cbd_content}%
                            </ThemedText>
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Category Filter */}
            <View className="mb-4">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingLeft: 16, paddingRight: 8 }}
              >
                {CATEGORIES.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    onPress={() => setSelectedCategory(category.id)}
                    className={`mr-2 px-4 py-2 rounded-full flex-row items-center 
                      ${selectedCategory === category.id
                        ? 'bg-green-500 dark:bg-green-700'
                        : 'bg-gray-200 dark:bg-gray-800'
                      }`}
                  >
                    <MaterialCommunityIcons
                      name={category.icon as any}
                      size={18}
                      color={
                        selectedCategory === category.id
                          ? 'white'
                          : isDarkMode
                            ? '#d1d5db'
                            : '#4b5563'
                      }
                    />
                    <ThemedText
                      className={`ml-1 ${
                        selectedCategory === category.id
                          ? 'text-white dark:text-white'
                          : 'text-gray-900 dark:text-gray-300'
                      }`}
                    >
                      {category.name}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Strain Listings */}
            <View className="px-4 mb-6">
              <ThemedText className="text-lg font-bold mb-4">
                {CATEGORIES.find(c => c.id === selectedCategory)?.name || 'All Strains'}
              </ThemedText>
              
              {filteredStrains.length === 0 ? (
                <View className="flex-1 items-center justify-center py-8">
                  <MaterialCommunityIcons name="cannabis" size={50} color={isDarkMode ? '#6b7280' : '#9ca3af'} />
                  <ThemedText className="mt-2 text-center text-gray-500 dark:text-gray-400">
                    No strains found. Try a different search or category.
                  </ThemedText>
                </View>
              ) : (
                <FlatList
                  data={filteredStrains}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => viewStrainDetails(item)}
                      className="bg-white dark:bg-gray-800 rounded-xl mb-4 overflow-hidden shadow-sm"
                    >
                      {item.image_url ? (
                        <Image
                          source={{ uri: item.image_url }}
                          className="w-full h-48"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="w-full h-48 bg-gray-200 dark:bg-gray-700 justify-center items-center">
                          <MaterialCommunityIcons name="cannabis" size={40} color={isDarkMode ? '#4b5563' : '#9ca3af'} />
                        </View>
                      )}
                      <View className="p-4">
                        <View className="flex-row justify-between items-center mb-2">
                          <ThemedText className="text-lg font-semibold">{item.name}</ThemedText>
                          <View className="bg-green-100 dark:bg-green-900 rounded-full px-2 py-1">
                            <ThemedText className="text-xs font-medium text-green-800 dark:text-green-300 capitalize">
                              {item.species}
                            </ThemedText>
                          </View>
                        </View>
                        <ThemedText numberOfLines={2} className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {item.description}
                        </ThemedText>
                        <View className="flex-row mb-3">
                          <View className="bg-gray-100 dark:bg-gray-700 rounded-full px-2 py-1 mr-2">
                            <ThemedText className="text-xs font-medium">
                              THC: {item.thc_content}%
                            </ThemedText>
                          </View>
                          <View className="bg-gray-100 dark:bg-gray-700 rounded-full px-2 py-1">
                            <ThemedText className="text-xs font-medium">
                              CBD: {item.cbd_content}%
                            </ThemedText>
                          </View>
                        </View>
                        
                        {/* Effects Tags */}
                        {item.effects && item.effects.length > 0 && (
                          <View className="mb-2">
                            <ThemedText className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Effects:
                            </ThemedText>
                            <View className="flex-row flex-wrap">
                              {item.effects.slice(0, 3).map((effect, idx) => (
                                <EffectTag key={`${item.id}-effect-${idx}`} effect={effect} />
                              ))}
                              {item.effects.length > 3 && (
                                <View className="bg-gray-100 dark:bg-gray-700 rounded-full px-2 py-1 mr-2 mb-2">
                                  <ThemedText className="text-xs text-gray-600 dark:text-gray-400">
                                    +{item.effects.length - 3} more
                                  </ThemedText>
                                </View>
                              )}
                            </View>
                          </View>
                        )}
                        
                        {/* Flavors Tags */}
                        {item.flavors && item.flavors.length > 0 && (
                          <View className="mb-3">
                            <ThemedText className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Flavors:
                            </ThemedText>
                            <View className="flex-row flex-wrap">
                              {item.flavors.slice(0, 2).map((flavor, idx) => (
                                <FlavorTag key={`${item.id}-flavor-${idx}`} flavor={flavor} />
                              ))}
                              {item.flavors.length > 2 && (
                                <View className="bg-gray-100 dark:bg-gray-700 rounded-full px-2 py-1 mr-2 mb-2">
                                  <ThemedText className="text-xs text-gray-600 dark:text-gray-400">
                                    +{item.flavors.length - 2} more
                                  </ThemedText>
                                </View>
                              )}
                            </View>
                          </View>
                        )}
                        
                        <View className="flex-row justify-between items-center">
                          <View className="flex-row items-center">
                            <MaterialCommunityIcons
                              name={
                                item.difficulty === StrainDifficulty.BEGINNER
                                  ? 'signal-cellular-1'
                                  : item.difficulty === StrainDifficulty.INTERMEDIATE
                                  ? 'signal-cellular-2'
                                  : 'signal-cellular-3'
                              }
                              size={16}
                              color={isDarkMode ? '#d1d5db' : '#6b7280'}
                            />
                            <ThemedText className="ml-1 text-xs text-gray-600 dark:text-gray-400 capitalize">
                              {item.difficulty} to grow
                            </ThemedText>
                          </View>
                          
                          <ThemedText className="text-xs text-gray-500 dark:text-gray-400">
                            {item.flowering_time} weeks to flower
                          </ThemedText>
                        </View>
                      </View>
                    </Pressable>
                  )}
                />
              )}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}
