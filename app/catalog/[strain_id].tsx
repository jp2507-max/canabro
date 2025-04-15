import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react'; // Removed useState, useEffect, useCallback
import { ScrollView, View, Pressable, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaterialCommunityIcons } from '@expo/vector-icons'; // Added for placeholder
import { useIsStrainFavorite, useMutateFavoriteStrain } from '@/lib/hooks/strains/useFavoriteStrains';
import { useStrainById } from '@/lib/hooks/strains/useStrainById'; // Use the new hook
import { useStrainEffects } from '@/lib/hooks/strains/useStrainEffects'; // Add effects hook
import { useStrainFlavors } from '@/lib/hooks/strains/useStrainFlavors'; // Add flavors hook
// Removed StorageImage import
import ThemedText from '@/components/ui/ThemedText';
import ThemedView from '@/components/ui/ThemedView';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { TheCannabisApiStrain } from '@/lib/types/the-cannabis-api'; // Use the new type

export default function StrainDetailPage() {
  // Get only strain_id from route params
  const { strain_id } = useLocalSearchParams<{ strain_id: string }>();
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();

  // Fetch strain data using the TanStack Query hook with strain_id
  const {
    data: strain,
    isLoading: isLoadingStrain,
    error: strainError,
    refetch: refetchStrain,
  } = useStrainById(strain_id);

  // Fetch effects and flavors using their hooks
  const {
    data: effectsData = [], // Default to empty array
    isLoading: isLoadingEffects,
    error: effectsError,
    refetch: refetchEffects,
  } = useStrainEffects(strain_id);

  const {
    data: flavorsData = [], // Default to empty array
    isLoading: isLoadingFlavors,
    error: flavorsError,
    refetch: refetchFlavors,
  } = useStrainFlavors(strain_id);

  // Hooks for favorite state and mutations (using strain_id directly)
  const {
    isFavorite,
    isLoading: isLoadingFavorite,
    error: favoriteError,
    refetch: refetchFavoriteStatus,
  } = useIsStrainFavorite(strain_id); // Use strain_id directly
  const {
    addFavorite,
    removeFavorite,
    isAdding,
    isRemoving,
    error: mutationError,
  } = useMutateFavoriteStrain();

  const isMutatingFavorite = isAdding || isRemoving;

  // Handle favorite toggle logic
  const toggleFavorite = async () => {
    if (!strain_id || isMutatingFavorite) return; // Prevent action if no ID or already mutating

    try {
      if (isFavorite) {
        await removeFavorite(strain_id);
      } else {
        // Ensure we have an ID to add (might be missing if API didn't return one)
        // Use strain_id from route params as the identifier for the favorite record
        await addFavorite(strain_id);
      }
      refetchFavoriteStatus();
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      Alert.alert('Error', 'Could not update favorite status. Please try again.');
    }
  };

  // --- Render Logic ---

  // 1. Handle Loading State (check all relevant loading states)
  const isLoading = isLoadingStrain || isLoadingEffects || isLoadingFlavors || isLoadingFavorite;
  if (isLoading) {
    return (
      <ThemedView className="flex-1 items-center justify-center" lightClassName="bg-neutral-50" darkClassName="bg-neutral-900">
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        <ThemedText className="mt-4 text-lg">Loading Strain Details...</ThemedText>
      </ThemedView>
    );
  }

  // 2. Handle Error State or Missing Data (after loading is complete)
  const combinedError = strainError || effectsError || flavorsError || favoriteError || mutationError;
  if (!strain_id || combinedError || !strain) {
    const canRetry = !!(strainError || effectsError || flavorsError); // Can retry if any fetch failed
    const errorMessage = !strain_id
      ? 'Strain ID is missing.'
      : combinedError
        ? `Error: ${combinedError.message}`
        : 'Strain not found or data could not be loaded.';
    return (
      <ThemedView className="flex-1 items-center justify-center p-4" lightClassName="bg-neutral-50" darkClassName="bg-neutral-900">
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.primary[500]} />
        <ThemedText className="mt-4 text-lg text-center text-primary-600 dark:text-primary-400">
          {errorMessage}
        </ThemedText>
        {canRetry && (
           <TouchableOpacity
             onPress={() => { // Refetch all relevant queries
               if (strainError) refetchStrain();
               if (effectsError) refetchEffects();
               if (flavorsError) refetchFlavors();
             }}
             className="mt-6 rounded-lg bg-primary-600 px-6 py-3">
             <ThemedText className="font-semibold text-white">Retry</ThemedText>
           </TouchableOpacity>
        )}
         <TouchableOpacity
             onPress={() => router.back()}
             className="mt-4 rounded-lg bg-neutral-200 px-6 py-3 dark:bg-neutral-700">
             <ThemedText className="font-semibold text-neutral-800 dark:text-neutral-200">Go Back</ThemedText>
           </TouchableOpacity>
      </ThemedView>
    );
  }

  // --- Render Helper Functions ---
  // --- Render Helper Functions ---
  // Removed renderInfoRow as THC/CBD info is not available

  // Updated renderTags to accept data directly
  const renderTags = (tags: string[], colorClass: string, label: string) => {
    if (!tags || tags.length === 0) return null;
    return (
      <ThemedView className="mt-4 p-4 rounded-2xl border" lightClassName="bg-white border-neutral-200" darkClassName="bg-neutral-800 border-neutral-700">
        <ThemedText className="text-xl font-semibold mb-2" lightClassName="text-neutral-800" darkClassName="text-neutral-100">
          {label}
        </ThemedText>
        <View className="flex-row flex-wrap gap-2 mt-1">
          {tags.map((tag) => (
            <View key={tag} className={`px-3 py-1 rounded-full ${colorClass}`}>
              <ThemedText className="text-sm capitalize text-white">{tag}</ThemedText>
            </View>
          ))}
        </View>
      </ThemedView>
    );
  };

  // --- Main Render ---
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing[8] }}>
        {/* Custom Header */}
         <View className="flex-row items-center justify-between p-4 pt-2 pb-2">
           <TouchableOpacity onPress={() => router.back()} className="p-2">
             <Ionicons name="arrow-back" size={28} color={isDarkMode ? theme.colors.neutral[100] : theme.colors.neutral[900]} />
           </TouchableOpacity>
           <View className="flex-1 items-center">
             {/* Optional: Add title here if needed */}
           </View>
           <Pressable
              onPress={toggleFavorite}
              disabled={isMutatingFavorite || !strain_id} // Also disable if no ID for favoriting
              className={`p-2 rounded-full ${(isMutatingFavorite || !strain_id) ? 'opacity-50' : ''}`}
              style={{ backgroundColor: isDarkMode ? theme.colors.neutral[800] : theme.colors.neutral[100] }}
              accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              accessibilityRole="button"
              accessibilityState={{ disabled: isMutatingFavorite || !strain_id, selected: isFavorite }}
            >
              {isMutatingFavorite ? (
                <ActivityIndicator size="small" color={theme.colors.primary[500]} />
              ) : (
                <Ionicons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={28}
                  color={isFavorite ? theme.colors.primary[500] : (isDarkMode ? theme.colors.neutral[400] : theme.colors.neutral[600])} // Use primary for favorite color
                />
              )}
            </Pressable>
         </View>

        <ThemedView className="p-4 pt-0" lightClassName="bg-neutral-50" darkClassName="bg-neutral-900">
          {/* Strain Name */}
           <ThemedText className="text-3xl font-bold mb-2" lightClassName="text-neutral-900" darkClassName="text-white">
              {strain.name}
            </ThemedText>
            {/* Strain Type */}
            <View className="mb-4 inline-flex self-start rounded-full bg-primary-100 px-3 py-1 dark:bg-primary-900">
              <ThemedText className="text-sm font-medium capitalize text-primary-800 dark:text-primary-300">
                {strain.type}
              </ThemedText>
            </View>

          {/* Placeholder Image */}
          <View className="mb-4 h-64 w-full items-center justify-center rounded-2xl bg-neutral-200 dark:bg-neutral-700">
            <MaterialCommunityIcons name="flower-tulip" size={80} color={theme.colors.neutral[400]} />
          </View>

          {/* Rating */}
          {strain.rating !== undefined && (
            <View className="mb-4 flex-row items-center">
              <Ionicons name="star" size={20} color="#FFC107" />
              <ThemedText className="ml-1 text-lg text-neutral-700 dark:text-neutral-300">
                {strain.rating.toFixed(1)} Rating
              </ThemedText>
            </View>
          )}

          {/* Description */}
          {strain.description && (
            <ThemedView className="mt-4 p-4 rounded-2xl border" lightClassName="bg-white border-neutral-200" darkClassName="bg-neutral-800 border-neutral-700">
              <ThemedText className="text-xl font-semibold mb-2" lightClassName="text-neutral-800" darkClassName="text-neutral-100">
                Description
              </ThemedText>
              <ThemedText className="text-base leading-relaxed" lightClassName="text-neutral-700" darkClassName="text-neutral-300">
                {strain.description}
              </ThemedText>
            </ThemedView>
          )}

          {/* Effects - Use effectsData from hook */}
          {renderTags(effectsData, isDarkMode ? 'bg-teal-700' : 'bg-teal-500', 'Effects')}

          {/* Flavors - Use flavorsData from hook */}
          {renderTags(flavorsData, isDarkMode ? 'bg-primary-700' : 'bg-primary-500', 'Flavors')}

        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}
