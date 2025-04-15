'use client';

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  FlatList,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  Image, // Import Image for placeholder
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EffectTag from '../../components/strains/EffectTag';
import FlavorTag from '../../components/strains/FlavorTag';
import StrainFilterModal, { ActiveFilters } from '../../components/strains/StrainFilterModal';
// Removed StorageImage import for now
import ThemedText from '../../components/ui/ThemedText';
import ThemedView from '../../components/ui/ThemedView';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { useProtectedRoute } from '@/lib/hooks/useProtectedRoute';
import { useStrainsByType } from '@/lib/hooks/strains/useStrainsByType'; // Use the new hook
import { TheCannabisApiStrain } from '@/lib/types/the-cannabis-api'; // Use the new type
import { StrainSpecies } from '@/lib/types/strain'; // Keep species enum for filter modal compatibility

// Define StrainType based on the new API
type StrainType = 'indica' | 'sativa' | 'hybrid';

// Updated categories to match StrainType and simplify
const CATEGORIES_NEW: { id: StrainType; name: string; icon: string }[] = [
  { id: StrainSpecies.SATIVA, name: 'Sativa', icon: 'white-balance-sunny' },
  { id: StrainSpecies.INDICA, name: 'Indica', icon: 'moon-waning-crescent' },
  { id: StrainSpecies.HYBRID, name: 'Hybrid', icon: 'palette-swatch' },
];

export default function StrainsScreen() {
  useProtectedRoute();
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const [selectedStrainType, setSelectedStrainType] = useState<StrainType>('sativa'); // Default to 'sativa'
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    species: null, // Keep for filter modal, but primary fetch is by type
    effects: [],
    flavors: [],
    minThc: null,
    maxThc: null,
    minCbd: null,
    maxCbd: null,
  });

  // --- Data Fetching with TanStack Query ---
  const {
    data: strains = [], // Default to empty array
    isLoading,
    error,
    refetch,
    isFetching,
  } = useStrainsByType(selectedStrainType); // Fetch based on selected type

  // --- Filtering Logic (Client-side) ---
  const filteredStrains = useMemo(() => {
    return strains.filter((strain: TheCannabisApiStrain) => {
      // Match search query (name or description)
      const matchesSearch =
        searchQuery === '' ||
        strain.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (strain.description && strain.description.toLowerCase().includes(searchQuery.toLowerCase()));

      // Match species filter from modal (secondary filter)
      const matchesSpecies =
        !activeFilters.species ||
        strain.type.toLowerCase() === activeFilters.species.toLowerCase();

      // Match effects filter (check if strain effects include ALL selected filter effects)
      const matchesEffects =
        activeFilters.effects.length === 0 ||
        activeFilters.effects.every((effectFilter) =>
          strain.effects?.map((e) => e.toLowerCase()).includes(effectFilter.toLowerCase())
        );

      // Match flavors filter (check if strain flavors include ALL selected filter flavors)
      const matchesFlavors =
        activeFilters.flavors.length === 0 ||
        activeFilters.flavors.every((flavorFilter) =>
          strain.flavor?.map((f) => f.toLowerCase()).includes(flavorFilter.toLowerCase())
        );

      // TODO: Add client-side filtering for potency if needed and if data becomes available

      return matchesSearch && matchesSpecies && matchesEffects && matchesFlavors;
    });
  }, [strains, searchQuery, activeFilters]);

  // Featured strains (simple slice for now)
  const featuredStrains = useMemo(() => {
    // Sort by rating (desc) and take top 5 from the currently filtered list
    return [...filteredStrains] // Create a copy before sorting
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 5);
  }, [filteredStrains]);

  // --- Navigation ---
  const viewStrainDetails = (strain: TheCannabisApiStrain) => {
    if (!strain._id) { // Use _id from the new API
      console.warn('Cannot view details for strain without _id:', strain);
      return;
    }
    router.push({
      pathname: '/catalog/[strain_id]',
      params: {
        strain_id: strain._id, // Pass the MongoDB _id as the route parameter
        // strain_name is no longer needed for lookup if we use ID
      },
    });
  };

  // --- Modal Handling ---
  const openFilterModal = () => setIsFilterModalVisible(true);
  const handleApplyFilters = (newFilters: ActiveFilters) => setActiveFilters(newFilters);

  // --- Render ---
  if (error && !isLoading && strains.length === 0) {
    return (
      <ThemedView className="flex-1 items-center justify-center p-4">
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={48}
          color={theme.colors.primary[500]}
        />
        <ThemedText className="mt-4 text-lg font-semibold text-primary-600 dark:text-primary-400">
          Error Loading Strains
        </ThemedText>
        <ThemedText className="mt-2 text-center text-neutral-600 dark:text-neutral-400">
          {error instanceof Error ? error.message : 'An unknown error occurred.'}
        </ThemedText>
        <TouchableOpacity
          onPress={() => refetch()}
          className="mt-6 rounded-lg bg-primary-600 px-6 py-3">
          <ThemedText className="font-semibold text-white">Retry</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView className="flex-1">
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pb-2 pt-2">
          <ThemedText className="text-2xl font-bold">Strains</ThemedText>
          <TouchableOpacity
            className="rounded-full bg-neutral-100 p-2 dark:bg-neutral-800"
            onPress={openFilterModal}
            accessibilityLabel="Open strain filters"
            accessibilityRole="button">
            <Ionicons
              name="options-outline"
              size={24}
              color={theme.colors.neutral[isDarkMode ? 300 : 700]}
            />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="px-4 pb-3">
          <View className="flex-row items-center rounded-xl bg-neutral-100 px-4 dark:bg-neutral-800">
            <Ionicons
              name="search"
              size={20}
              color={theme.colors.neutral[isDarkMode ? 400 : 500]}
            />
            <TextInput
              placeholder="Search strains..."
              placeholderTextColor={theme.colors.neutral[isDarkMode ? 400 : 500]}
              className="flex-1 px-2 py-3 text-neutral-900 dark:text-neutral-100"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
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

        {isLoading && strains.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            refreshControl={
              <RefreshControl
                refreshing={isFetching}
                onRefresh={refetch}
                tintColor={theme.colors.primary[600]}
                title="Refreshing strains..."
                titleColor={theme.colors.neutral[isDarkMode ? 300 : 700]}
              />
            }>
            {/* Featured Strains */}
            {searchQuery.length === 0 &&
            activeFilters.effects.length === 0 &&
            activeFilters.flavors.length === 0 &&
            !activeFilters.species &&
            featuredStrains.length > 0 && (
              <View className="mb-6">
                <View className="mb-2 flex-row items-center justify-between px-4">
                  <ThemedText className="text-lg font-bold">Featured Strains</ThemedText>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingLeft: 16, paddingRight: 8 }}>
                  {featuredStrains.map((strain) => (
                    <Pressable
                      key={strain._id} // Use _id as key
                      onPress={() => viewStrainDetails(strain)}
                      accessibilityLabel={`View details for ${strain.name}`}
                      accessibilityRole="button"
                      className="mr-4 w-72 overflow-hidden rounded-xl bg-neutral-50 shadow-sm dark:bg-neutral-800">
                      {/* Placeholder Image - API doesn't provide images */}
                      <View className="h-40 w-full items-center justify-center bg-neutral-200 dark:bg-neutral-700">
                         <MaterialCommunityIcons name="flower-tulip" size={60} color={theme.colors.neutral[400]} />
                      </View>
                      <View className="p-3">
                        <View className="mb-1 flex-row items-center justify-between">
                          <ThemedText className="text-lg font-semibold">{strain.name}</ThemedText>
                          <View className="rounded-full bg-primary-100 px-2 py-1 dark:bg-primary-900">
                            <ThemedText className="text-xs font-medium capitalize text-primary-800 dark:text-primary-300">
                              {strain.type}
                            </ThemedText>
                          </View>
                        </View>
                        <ThemedText
                          numberOfLines={2}
                          className="mb-2 text-sm text-neutral-600 dark:text-neutral-400">
                          {strain.description || 'No description available.'}
                        </ThemedText>
                         {/* Display Rating */}
                         {strain.rating !== undefined && (
                            <View className="flex-row items-center">
                              <Ionicons name="star" size={16} color="#FFC107" />
                              <ThemedText className="ml-1 text-sm text-neutral-600 dark:text-neutral-400">
                                {strain.rating.toFixed(1)}
                              </ThemedText>
                           </View>
                         )}
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Category Filter Buttons */}
            <View className="mb-4">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingLeft: 16, paddingRight: 8 }}>
                {CATEGORIES_NEW.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    onPress={() => setSelectedStrainType(category.id)} // Set the strain type for the hook
                    accessibilityLabel={`Filter by ${category.name}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedStrainType === category.id }}
                    className={`mr-2 flex-row items-center rounded-full px-4 py-2
                    ${
                      selectedStrainType === category.id
                        ? 'bg-primary-600 dark:bg-primary-700'
                        : 'bg-neutral-200 dark:bg-neutral-800'
                    }`}>
                    <MaterialCommunityIcons
                      name={category.icon as any}
                      size={18}
                      color={
                        selectedStrainType === category.id
                          ? theme.colors.neutral[50]
                          : theme.colors.neutral[isDarkMode ? 300 : 700]
                      }
                    />
                    <ThemedText
                      className={`ml-1 ${
                        selectedStrainType === category.id
                          ? 'text-neutral-50 dark:text-neutral-100'
                          : 'text-neutral-900 dark:text-neutral-300'
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
                {/* Adjust title based on filters/search */}
                {searchQuery
                  ? `Search Results for "${searchQuery}"`
                  : activeFilters.species ||
                      activeFilters.effects.length > 0 ||
                      activeFilters.flavors.length > 0
                    ? 'Filtered Strains'
                    : CATEGORIES_NEW.find((c) => c.id === selectedStrainType)?.name || 'Strains'}
              </ThemedText>

              {filteredStrains.length === 0 && !isLoading ? (
                <View className="flex-1 items-center justify-center py-8">
                  <MaterialCommunityIcons
                    name="cannabis-off"
                    size={50}
                    color={theme.colors.neutral[isDarkMode ? 500 : 400]}
                  />
                  <ThemedText className="mt-2 text-center text-neutral-500 dark:text-neutral-400">
                    No strains found matching your criteria.
                  </ThemedText>
                </View>
              ) : (
                <FlatList
                  data={filteredStrains}
                  keyExtractor={(item) => item._id} // Use _id as key
                  scrollEnabled={false} // Already inside a ScrollView
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => viewStrainDetails(item)}
                      accessibilityLabel={`View details for ${item.name}`}
                      accessibilityRole="button"
                      className="mb-4 overflow-hidden rounded-xl bg-neutral-50 shadow-sm dark:bg-neutral-800">
                      {/* Placeholder Image */}
                       <View className="h-48 w-full items-center justify-center bg-neutral-200 dark:bg-neutral-700">
                         <MaterialCommunityIcons name="flower-tulip" size={60} color={theme.colors.neutral[400]} />
                       </View>
                      <View className="p-4">
                        <View className="mb-2 flex-row items-center justify-between">
                          <ThemedText className="text-lg font-semibold">{item.name}</ThemedText>
                          <View className="rounded-full bg-primary-100 px-2 py-1 dark:bg-primary-900">
                            <ThemedText className="text-xs font-medium capitalize text-primary-800 dark:text-primary-300">
                              {item.type}
                            </ThemedText>
                          </View>
                        </View>
                        <ThemedText
                          numberOfLines={2}
                          className="mb-2 text-sm text-neutral-600 dark:text-neutral-400">
                          {item.description || 'No description available.'}
                        </ThemedText>
                          {/* Display Rating */}
                          {item.rating !== undefined && (
                            <View className="mb-3 flex-row items-center">
                              <Ionicons name="star" size={16} color="#FFC107" />
                              <ThemedText className="ml-1 text-sm text-neutral-600 dark:text-neutral-400">
                                {item.rating.toFixed(1)}
                              </ThemedText>
                           </View>
                         )}

                        {/* Effects Tags */}
                        {item.effects && item.effects.length > 0 && (
                          <View className="mb-2">
                            <ThemedText className="mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                              Effects:
                            </ThemedText>
                            <View className="flex-row flex-wrap">
                              {item.effects.slice(0, 3).map((effect) => (
                                <EffectTag key={`${item._id}-effect-${effect}`} effect={effect} />
                              ))}
                              {item.effects.length > 3 && (
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
                        {item.flavor && item.flavor.length > 0 && (
                          <View className="mb-3">
                            <ThemedText className="mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                              Flavors:
                            </ThemedText>
                            <View className="flex-row flex-wrap">
                              {item.flavor.slice(0, 2).map((flavor) => (
                                <FlavorTag key={`${item._id}-flavor-${flavor}`} flavor={flavor} />
                              ))}
                              {item.flavor.length > 2 && (
                                <View className="mb-2 mr-2 rounded-full bg-neutral-100 px-2 py-1 dark:bg-neutral-700">
                                  <ThemedText className="text-xs text-neutral-600 dark:text-neutral-400">
                                    +{item.flavor.length - 2} more
                                  </ThemedText>
                                </View>
                              )}
                            </View>
                          </View>
                        )}
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
