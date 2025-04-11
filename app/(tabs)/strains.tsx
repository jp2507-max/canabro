'use client';

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router'; // Import useRouter
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  FlatList,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EffectTag from '../../components/strains/EffectTag';
import FlavorTag from '../../components/strains/FlavorTag';
import StrainFilterModal, { ActiveFilters } from '../../components/strains/StrainFilterModal'; // Import Modal
import StorageImage from '../../components/ui/StorageImage';
import ThemedText from '../../components/ui/ThemedText';
import ThemedView from '../../components/ui/ThemedView';
import { useTheme } from '../../lib/contexts/ThemeContext';
import { useProtectedRoute } from '../../lib/hooks/useProtectedRoute';
import usePullToRefresh from '../../lib/hooks/usePullToRefresh';
import {
  Strain,
  StrainSpecies,
  StrainEffectType,
  StrainFlavorType,
  StrainDifficulty,
} from '../../lib/types/strain';

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
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // Replaced with UUID
    name: 'OG Kush',
    species: StrainSpecies.HYBRID,
    thc_content: 20,
    cbd_content: 0.3,
    description: 'OG Kush is a legendary strain with a strong, fuel-like aroma and euphoric high.',
    image_url: undefined, // Use fallback icon (match type string | undefined)
    effects: [
      StrainEffectType.RELAXED,
      StrainEffectType.HAPPY,
      StrainEffectType.EUPHORIC,
      StrainEffectType.UPLIFTED,
      StrainEffectType.SLEEPY,
    ],
    flavors: [StrainFlavorType.EARTHY, StrainFlavorType.PINE, StrainFlavorType.WOODY],
    difficulty: StrainDifficulty.INTERMEDIATE,
    flowering_time: 8,
    yield_indoor: 'medium',
    yield_outdoor: 'medium',
    is_auto_flower: false,
    is_feminized: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef', // Replaced with UUID
    name: 'Blue Dream',
    species: StrainSpecies.HYBRID,
    thc_content: 18,
    cbd_content: 0.1,
    description:
      'Blue Dream is a sativa-dominant hybrid known for its balanced effects and sweet berry aroma.',
    image_url: undefined, // Use fallback icon (match type string | undefined)
    effects: [
      StrainEffectType.RELAXED,
      StrainEffectType.HAPPY,
      StrainEffectType.EUPHORIC,
      StrainEffectType.CREATIVE,
      StrainEffectType.ENERGETIC,
    ],
    flavors: [StrainFlavorType.BERRY, StrainFlavorType.SWEET, StrainFlavorType.BLUEBERRY],
    difficulty: StrainDifficulty.BEGINNER,
    flowering_time: 10,
    yield_indoor: 'high',
    yield_outdoor: 'high',
    is_auto_flower: false,
    is_feminized: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'b2c3d4e5-f6a7-8901-2345-67890abcdef0', // Replaced with UUID
    name: 'Girl Scout Cookies',
    species: StrainSpecies.HYBRID,
    thc_content: 23,
    cbd_content: 0.2,
    description:
      'GSC is a hybrid strain with a sweet and earthy aroma, known for its potent effects.',
    image_url: undefined, // Use fallback icon (match type string | undefined)
    effects: [
      StrainEffectType.RELAXED,
      StrainEffectType.HAPPY,
      StrainEffectType.EUPHORIC,
      StrainEffectType.UPLIFTED,
      StrainEffectType.CREATIVE,
    ],
    flavors: [StrainFlavorType.SWEET, StrainFlavorType.EARTHY, StrainFlavorType.VANILLA],
    difficulty: StrainDifficulty.INTERMEDIATE,
    flowering_time: 9,
    yield_indoor: 'medium',
    yield_outdoor: 'medium',
    is_auto_flower: false,
    is_feminized: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c3d4e5f6-a7b8-9012-3456-7890abcdef01', // Replaced with UUID
    name: 'Northern Lights',
    species: StrainSpecies.INDICA,
    thc_content: 16,
    cbd_content: 0.1,
    description:
      'Northern Lights is a pure indica strain known for its resinous buds and resilient growth.',
    image_url: undefined, // Use fallback icon (match type string | undefined)
    effects: [
      StrainEffectType.RELAXED,
      StrainEffectType.SLEEPY,
      StrainEffectType.HAPPY,
      StrainEffectType.HUNGRY,
      StrainEffectType.EUPHORIC,
    ],
    flavors: [StrainFlavorType.SWEET, StrainFlavorType.SPICY, StrainFlavorType.EARTHY],
    difficulty: StrainDifficulty.BEGINNER,
    flowering_time: 7,
    yield_indoor: 'high',
    yield_outdoor: 'high',
    is_auto_flower: false,
    is_feminized: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'd4e5f6a7-b8c9-0123-4567-890abcdef012', // Replaced with UUID
    name: 'Sour Diesel',
    species: StrainSpecies.SATIVA,
    thc_content: 19,
    cbd_content: 0.2,
    description:
      'Sour Diesel is a fast-acting sativa with a pungent diesel aroma, delivering energizing effects.',
    image_url: undefined, // Use fallback icon (match type string | undefined)
    effects: [
      StrainEffectType.ENERGETIC,
      StrainEffectType.HAPPY,
      StrainEffectType.UPLIFTED,
      StrainEffectType.FOCUSED,
      StrainEffectType.CREATIVE,
    ],
    flavors: [StrainFlavorType.DIESEL, StrainFlavorType.PUNGENT, StrainFlavorType.CITRUS],
    difficulty: StrainDifficulty.INTERMEDIATE,
    flowering_time: 10,
    yield_indoor: 'medium',
    yield_outdoor: 'medium',
    is_auto_flower: false,
    is_feminized: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'e5f6a7b8-c9d0-1234-5678-90abcdef0123', // Replaced with UUID
    name: 'Granddaddy Purple',
    species: StrainSpecies.INDICA,
    thc_content: 17,
    cbd_content: 0.1,
    description: 'GDP is a famous indica strain with dense purple buds and grape flavor.',
    image_url: undefined, // Use fallback icon (match type string | undefined)
    effects: [
      StrainEffectType.RELAXED,
      StrainEffectType.SLEEPY,
      StrainEffectType.HAPPY,
      StrainEffectType.HUNGRY,
      StrainEffectType.EUPHORIC,
    ],
    flavors: [StrainFlavorType.GRAPE, StrainFlavorType.BERRY, StrainFlavorType.SWEET],
    difficulty: StrainDifficulty.BEGINNER,
    flowering_time: 8,
    yield_indoor: 'medium',
    yield_outdoor: 'medium',
    is_auto_flower: false,
    is_feminized: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'f6a7b8c9-d0e1-2345-6789-0abcdef01234', // Replaced with UUID
    name: 'Jack Herer',
    species: StrainSpecies.SATIVA,
    thc_content: 18,
    cbd_content: 0.2,
    description:
      'Jack Herer is a sativa-dominant strain that delivers a clear-headed, blissful high.',
    image_url: undefined, // Use fallback icon (match type string | undefined)
    effects: [
      StrainEffectType.HAPPY,
      StrainEffectType.UPLIFTED,
      StrainEffectType.CREATIVE,
      StrainEffectType.ENERGETIC,
      StrainEffectType.FOCUSED,
    ],
    flavors: [StrainFlavorType.EARTHY, StrainFlavorType.PINE, StrainFlavorType.WOODY],
    difficulty: StrainDifficulty.INTERMEDIATE,
    flowering_time: 9,
    yield_indoor: 'medium',
    yield_outdoor: 'medium',
    is_auto_flower: false,
    is_feminized: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'a7b8c9d0-e1f2-3456-7890-bcdef0123456', // Replaced with UUID
    name: 'Durban Poison',
    species: StrainSpecies.SATIVA,
    thc_content: 20,
    cbd_content: 0.02,
    description:
      'Durban Poison is a pure sativa with an energetic and uplifting high, perfect for daytime use.',
    image_url: undefined, // Use fallback icon (match type string | undefined)
    effects: [
      StrainEffectType.ENERGETIC,
      StrainEffectType.FOCUSED,
      StrainEffectType.HAPPY,
      StrainEffectType.CREATIVE,
      StrainEffectType.UPLIFTED,
    ],
    flavors: [StrainFlavorType.SWEET, StrainFlavorType.PINE, StrainFlavorType.EARTHY],
    difficulty: StrainDifficulty.BEGINNER,
    flowering_time: 9,
    yield_indoor: 'high',
    yield_outdoor: 'high',
    is_auto_flower: false,
    is_feminized: true,
    created_at: new Date().toISOString(),
  },
];

// Removed EffectTag and FlavorTag definitions

export default function StrainsScreen() {
  useProtectedRoute();
  const router = useRouter(); // Add router hook
  const { theme, isDarkMode } = useTheme(); // Get theme object
  // const { database } = useDatabase(); // database is unused - removed
  const { refreshing, handleRefresh } = usePullToRefresh({
    showFeedback: true,
    forceSync: true,
  });
  const [loading, setLoading] = useState(true);
  const [strains, setStrains] = useState<Strain[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all'); // Keep for category buttons for now
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({ // State for active filters
    species: null,
    effects: [],
    flavors: [],
    minThc: null,
    maxThc: null,
    minCbd: null,
    maxCbd: null,
  });

  // Filter strains based on search query AND active filters
  const filteredStrains = strains.filter((strain) => {
    const matchesSearch =
      searchQuery === '' ||
      strain.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (strain.description && strain.description.toLowerCase().includes(searchQuery.toLowerCase())); // Check if description exists

    // --- Apply Active Filters ---
    const matchesSpecies = !activeFilters.species || strain.species === activeFilters.species;

    // Check if the strain includes ALL selected effects
    const matchesEffects =
      activeFilters.effects.length === 0 ||
      activeFilters.effects.every((effect) => strain.effects?.includes(effect));

    // Check if the strain includes ALL selected flavors
    const matchesFlavors =
      activeFilters.flavors.length === 0 ||
      activeFilters.flavors.every((flavor) => strain.flavors?.includes(flavor));

    // TODO: Add filtering logic for potency based on activeFilters

    // Combine search and filter logic
    return matchesSearch && matchesSpecies && matchesEffects && matchesFlavors;
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
        await new Promise((resolve) => setTimeout(resolve, 1000));

        setStrains(MOCK_STRAINS);

        // Organize strains by category - This state is unused, removing the setter call
        // const byCategory: { [key: string]: Strain[] } = {
        //   all: MOCK_STRAINS,
        //   [StrainSpecies.INDICA]: MOCK_STRAINS.filter((s) => s.species === StrainSpecies.INDICA),
        //   [StrainSpecies.SATIVA]: MOCK_STRAINS.filter((s) => s.species === StrainSpecies.SATIVA),
        //   [StrainSpecies.HYBRID]: MOCK_STRAINS.filter((s) => s.species === StrainSpecies.HYBRID),
        //   popular: MOCK_STRAINS.slice(0, 4), // Just a simple way to mock "popular" strains
        // };
        // setStrainsByCategory(byCategory);

        setLoading(false);
      } catch (error) {
        console.error('Error loading strains:', error);
        setLoading(false);
      }
    };

    loadStrains();
  }, []);

  // View strain details - navigate to the detail screen
  const viewStrainDetails = (strain: Strain) => {
    // Navigate to the dynamic route for strain details in the 'catalog' directory
    router.push({
      pathname: '/catalog/[strain_id]', // Correct path to the detail page
      params: { strain_id: strain.id }, // Use 'strain_id' as the parameter name
    });
  };

  // Function to open the filter modal
  const openFilterModal = () => {
    setIsFilterModalVisible(true);
  };

  // Function to handle applying filters from the modal
  const handleApplyFilters = (newFilters: ActiveFilters) => {
    setActiveFilters(newFilters);
    // Optionally reset category selection when applying filters?
    // setSelectedCategory('all');
  };

  return (
    <ThemedView className="flex-1">
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      {/* Use theme background color for SafeAreaView */}
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pb-2 pt-2">
          <ThemedText className="text-2xl font-bold">Strains</ThemedText>
          <TouchableOpacity
            // Use theme neutral colors for filter button background
            className="rounded-full bg-neutral-100 p-2 dark:bg-neutral-800"
            onPress={openFilterModal} // Call function to open filter modal
            accessibilityLabel="Open strain filters"
            accessibilityRole="button">
            {/* Use theme neutral color for icon */}
            <Ionicons
              name="options-outline"
              size={24}
              color={theme.colors.neutral[isDarkMode ? 300 : 700]}
            />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="px-4 pb-3">
          {/* Use theme neutral colors for search bar background */}
          <View className="flex-row items-center rounded-xl bg-neutral-100 px-4 dark:bg-neutral-800">
            {/* Use theme neutral color for icon */}
            <Ionicons
              name="search"
              size={20}
              color={theme.colors.neutral[isDarkMode ? 400 : 500]}
            />
            <TextInput
              placeholder="Search strains..."
              placeholderTextColor={theme.colors.neutral[isDarkMode ? 400 : 500]} // Use theme neutral color
              // Use theme neutral color for text
              className="flex-1 px-2 py-3 text-neutral-900 dark:text-neutral-100"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                {/* Use theme neutral color for icon */}
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={theme.colors.neutral[isDarkMode ? 400 : 500]}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Modal */}
        <StrainFilterModal
          isVisible={isFilterModalVisible}
          onClose={() => setIsFilterModalVisible(false)}
          initialFilters={activeFilters}
          onApplyFilters={handleApplyFilters}
        />

        {loading ? (
          <View className="flex-1 items-center justify-center">
            {/* Use theme primary color for activity indicator */}
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
            {/* Featured Strains */}
            {searchQuery.length === 0 && (
              <View className="mb-6">
                <View className="mb-2 flex-row items-center justify-between px-4">
                  <ThemedText className="text-lg font-bold">Featured Strains</ThemedText>
                  <TouchableOpacity onPress={() => setSelectedCategory('popular')}>
                    {/* Use theme primary color for link */}
                    <ThemedText className="text-sm text-primary-600 dark:text-primary-400">
                      See All
                    </ThemedText>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingLeft: 16, paddingRight: 8 }}>
                  {featuredStrains.map((strain) => (
                    <Pressable
                      key={strain.id}
                      onPress={() => viewStrainDetails(strain)}
                      accessibilityLabel={`View details for ${strain.name}`}
                      accessibilityRole="button"
                      // Use theme neutral colors for card background
                      className="mr-4 w-72 overflow-hidden rounded-xl bg-neutral-50 shadow-sm dark:bg-neutral-800">
                      <StorageImage
                        url={strain.image_url ?? null} // Provide null fallback for undefined
                        width="100%"
                        height={160} // h-40 equivalent
                        contentFit="cover"
                        accessibilityLabel={`${strain.name} image`}
                      />
                      <View className="p-3">
                        <View className="mb-1 flex-row items-center justify-between">
                          <ThemedText className="text-lg font-semibold">{strain.name}</ThemedText>
                          {/* Use theme primary colors for species tag */}
                          <View className="rounded-full bg-primary-100 px-2 py-1 dark:bg-primary-900">
                            <ThemedText className="text-xs font-medium capitalize text-primary-800 dark:text-primary-300">
                              {strain.species}
                            </ThemedText>
                          </View>
                        </View>
                        {/* Use theme neutral colors for description */}
                        <ThemedText
                          numberOfLines={2}
                          className="mb-2 text-sm text-neutral-600 dark:text-neutral-400">
                          {strain.description}
                        </ThemedText>
                        <View className="flex-row">
                          {/* Keep specific colors for THC/CBD tags for now */}
                          <View className="mr-2 rounded-full bg-purple-100 px-2 py-1 dark:bg-purple-900">
                            <ThemedText className="text-xs font-medium text-purple-800 dark:text-purple-300">
                              THC: {strain.thc_content}%
                            </ThemedText>
                          </View>
                          <View className="rounded-full bg-blue-100 px-2 py-1 dark:bg-blue-900">
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
                contentContainerStyle={{ paddingLeft: 16, paddingRight: 8 }}>
                {CATEGORIES.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    onPress={() => setSelectedCategory(category.id)}
                    accessibilityLabel={`Filter by ${category.name}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedCategory === category.id }}
                    className={`mr-2 flex-row items-center rounded-full px-4 py-2
                      ${
                        selectedCategory === category.id
                          ? 'bg-primary-600 dark:bg-primary-700' // Use theme primary
                          : 'bg-neutral-200 dark:bg-neutral-800' // Use theme neutral
                      }`}>
                    <MaterialCommunityIcons
                      name={category.icon as any}
                      size={18}
                      color={
                        selectedCategory === category.id
                          ? theme.colors.neutral[50] // Use theme neutral light
                          : theme.colors.neutral[isDarkMode ? 300 : 700] // Use theme neutral
                      }
                    />
                    <ThemedText
                      className={`ml-1 ${
                        selectedCategory === category.id
                          ? 'text-neutral-50 dark:text-neutral-100' // Use theme neutral light
                          : 'text-neutral-900 dark:text-neutral-300' // Use theme neutral
                      }`}>
                      {category.name}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Strain Listings */}
            <View className="mb-6 px-4">
              <ThemedText className="mb-4 text-lg font-bold">
                {CATEGORIES.find((c) => c.id === selectedCategory)?.name || 'All Strains'}
              </ThemedText>

              {filteredStrains.length === 0 ? (
                <View className="flex-1 items-center justify-center py-8">
                  {/* Use theme neutral color for icon */}
                  <MaterialCommunityIcons
                    name="cannabis"
                    size={50}
                    color={theme.colors.neutral[isDarkMode ? 500 : 400]}
                  />
                  {/* Use theme neutral color for text */}
                  <ThemedText className="mt-2 text-center text-neutral-500 dark:text-neutral-400">
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
                      accessibilityLabel={`View details for ${item.name}`}
                      accessibilityRole="button"
                      // Use theme neutral colors for card background
                      className="mb-4 overflow-hidden rounded-xl bg-neutral-50 shadow-sm dark:bg-neutral-800">
                      <StorageImage
                        url={item.image_url ?? null} // Provide null fallback for undefined
                        width="100%"
                        height={192} // h-48 equivalent
                        contentFit="cover"
                        accessibilityLabel={`${item.name} image`}
                      />
                      <View className="p-4">
                        <View className="mb-2 flex-row items-center justify-between">
                          <ThemedText className="text-lg font-semibold">{item.name}</ThemedText>
                          {/* Use theme primary colors for species tag */}
                          <View className="rounded-full bg-primary-100 px-2 py-1 dark:bg-primary-900">
                            <ThemedText className="text-xs font-medium capitalize text-primary-800 dark:text-primary-300">
                              {item.species}
                            </ThemedText>
                          </View>
                        </View>
                        {/* Use theme neutral colors for description */}
                        <ThemedText
                          numberOfLines={2}
                          className="mb-2 text-sm text-neutral-600 dark:text-neutral-400">
                          {item.description}
                        </ThemedText>
                        {/* Use theme neutral colors for THC/CBD tags */}
                        <View className="mb-3 flex-row">
                          <View className="mr-2 rounded-full bg-neutral-100 px-2 py-1 dark:bg-neutral-700">
                            <ThemedText className="text-xs font-medium text-neutral-800 dark:text-neutral-300">
                              THC: {item.thc_content}%
                            </ThemedText>
                          </View>
                          <View className="rounded-full bg-neutral-100 px-2 py-1 dark:bg-neutral-700">
                            <ThemedText className="text-xs font-medium text-neutral-800 dark:text-neutral-300">
                              CBD: {item.cbd_content}%
                            </ThemedText>
                          </View>
                        </View>

                        {/* Effects Tags */}
                        {item.effects && item.effects.length > 0 && (
                          <View className="mb-2">
                            {/* Use theme neutral color for label */}
                            <ThemedText className="mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                              Effects:
                            </ThemedText>
                            <View className="flex-row flex-wrap">
                              {item.effects.slice(0, 3).map((effect) => (
                                <EffectTag key={`${item.id}-effect-${effect}`} effect={effect} />
                              ))}
                              {item.effects.length > 3 && (
                                // Use theme neutral colors for "more" tag
                                <View className="mb-2 mr-2 rounded-full bg-neutral-100 px-2 py-1 dark:bg-neutral-700">
                                  <ThemedText className="text-xs text-neutral-600 dark:text-neutral-400">
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
                            {/* Use theme neutral color for label */}
                            <ThemedText className="mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                              Flavors:
                            </ThemedText>
                            <View className="flex-row flex-wrap">
                              {item.flavors.slice(0, 2).map((flavor) => (
                                <FlavorTag key={`${item.id}-flavor-${flavor}`} flavor={flavor} />
                              ))}
                              {item.flavors.length > 2 && (
                                // Use theme neutral colors for "more" tag
                                <View className="mb-2 mr-2 rounded-full bg-neutral-100 px-2 py-1 dark:bg-neutral-700">
                                  <ThemedText className="text-xs text-neutral-600 dark:text-neutral-400">
                                    +{item.flavors.length - 2} more
                                  </ThemedText>
                                </View>
                              )}
                            </View>
                          </View>
                        )}

                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center">
                            {/* Use theme neutral color for icon */}
                            <MaterialCommunityIcons
                              name={
                                item.difficulty === StrainDifficulty.BEGINNER
                                  ? 'signal-cellular-1'
                                  : item.difficulty === StrainDifficulty.INTERMEDIATE
                                    ? 'signal-cellular-2'
                                    : 'signal-cellular-3'
                              }
                              size={16}
                              color={theme.colors.neutral[isDarkMode ? 300 : 500]}
                            />
                            {/* Use theme neutral color for text */}
                            <ThemedText className="ml-1 text-xs capitalize text-neutral-600 dark:text-neutral-400">
                              {item.difficulty} to grow
                            </ThemedText>
                          </View>
                          {/* Use theme neutral color for text */}
                          <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400">
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
