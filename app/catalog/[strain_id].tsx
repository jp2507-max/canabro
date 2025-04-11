import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react'; // Import useEffect
import { ScrollView, View, Pressable, ActivityIndicator, Alert } from 'react-native'; // Import Alert
import { SafeAreaView } from 'react-native-safe-area-context';

import { useIsStrainFavorite, useMutateFavoriteStrain } from '@/lib/hooks/strains/useFavoriteStrains'; // Import hooks
import StorageImage from '@/components/ui/StorageImage';
import ThemedText from '@/components/ui/ThemedText';
import ThemedView from '@/components/ui/ThemedView';
import { useTheme } from '@/lib/contexts/ThemeContext';
// Assume a hook exists to fetch strain data by ID
// import { useStrain } from '@/lib/hooks/strains/useStrain';
// Assume Strain type definition exists
// import { Strain } from '@/lib/types/strain';

// Mock Strain type for development until actual type is available
interface Strain {
  id: string;
  name: string;
  type: 'Indica' | 'Sativa' | 'Hybrid';
  thc_content?: number | null;
  cbd_content?: number | null;
  description?: string | null;
  flavor_profile?: string[] | null;
  effects?: string[] | null;
  grow_difficulty?: 'Easy' | 'Medium' | 'Hard' | null;
  flowering_time_weeks?: number | null;
  yield_grams_per_plant?: number | null;
  image_url?: string | null;
}

// Mock hook for development
const useStrain = (id: string | undefined): { strain: Strain | null; isLoading: boolean; error: Error | null } => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [strain, setStrain] = useState<Strain | null>(null);

  React.useEffect(() => {
    if (!id) {
      setError(new Error('Strain ID is missing'));
      setIsLoading(false);
      return;
    }
    // Simulate API call (Removed setTimeout for faster mock loading)
    // setTimeout(() => {
      setStrain({
        id: id, // Use the actual ID passed in
        name: 'Mock Kush', // Keep mock details for now
        type: 'Indica',
        thc_content: 22.5,
        cbd_content: 0.8,
        description:
          'A classic Indica strain known for its relaxing effects and earthy aroma. Perfect for evening use.',
        flavor_profile: ['Earthy', 'Pine', 'Pungent'],
        effects: ['Relaxed', 'Happy', 'Sleepy', 'Euphoric'],
        grow_difficulty: 'Medium',
        flowering_time_weeks: 8,
        yield_grams_per_plant: 450,
        image_url: undefined, // Use fallback icon
      });
      setIsLoading(false);
    // }, 1500); // Removed setTimeout
  }, [id]);

  return { strain, isLoading, error };
};

export default function StrainDetailPage() {
  const { strain_id } = useLocalSearchParams<{ strain_id: string }>();
  const { strain, isLoading: isLoadingStrain, error: strainError } = useStrain(strain_id); // Rename loading/error
  const { theme, isDarkMode } = useTheme();

  // Use hooks for favorite state and mutations
  const {
    isFavorite,
    isLoading: isLoadingFavorite,
    error: favoriteError,
    refetch: refetchFavoriteStatus,
  } = useIsStrainFavorite(strain_id);
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
        await addFavorite(strain_id);
      }
      // Refetch the favorite status after mutation completes
      refetchFavoriteStatus();
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      Alert.alert('Error', 'Could not update favorite status. Please try again.');
    }
  };

  // Display combined loading state
  if (isLoadingStrain || isLoadingFavorite) {
    return (
      <ThemedView className="flex-1 items-center justify-center" lightClassName="bg-neutral-50" darkClassName="bg-neutral-900">
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        <ThemedText className="mt-4 text-lg">Loading Strain Details...</ThemedText>
      </ThemedView>
    );
  }

  // Display combined error state
  const combinedError = strainError || favoriteError || mutationError;
  if (combinedError || !strain) {
    return (
      <ThemedView className="flex-1 items-center justify-center p-4" lightClassName="bg-neutral-50" darkClassName="bg-neutral-900">
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.status.danger} />
        <ThemedText className="mt-4 text-lg text-center">
          {combinedError ? `Error: ${combinedError.message}` : 'Strain not found.'}
        </ThemedText>
      </ThemedView>
    );
  }

  const renderInfoRow = (label: string, value: string | number | null | undefined, unit: string = '') => {
    if (value === null || value === undefined || value === '') return null;
    return (
      <View className="flex-row justify-between items-center mb-2">
        <ThemedText className="text-base font-medium" lightClassName="text-neutral-600" darkClassName="text-neutral-400">{label}:</ThemedText>
        <ThemedText className="text-base" lightClassName="text-neutral-800" darkClassName="text-neutral-200">{`${value}${unit}`}</ThemedText>
      </View>
    );
  };

  const renderTags = (tags: string[] | null | undefined, colorClass: string) => {
    if (!tags || tags.length === 0) return null;
    return (
      <View className="flex-row flex-wrap gap-2 mt-1">
        {tags.map((tag) => (
          <View key={tag} className={`px-3 py-1 rounded-full ${colorClass}`}>
            <ThemedText className="text-sm text-white">{tag}</ThemedText>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      {/* Remove the header */}
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing[8] }}>
        {/* Add a custom back button or rely on gesture */}
        <ThemedView className="p-4 pt-0" lightClassName="bg-neutral-50" darkClassName="bg-neutral-900">
          {/* Header Section (Now part of the ScrollView content) */}
          <View className="flex-row items-center justify-between mb-4">
            <ThemedText className="text-3xl font-bold" lightClassName="text-neutral-900" darkClassName="text-white">
              {strain.name}
            </ThemedText>
            <Pressable
              onPress={toggleFavorite}
              disabled={isMutatingFavorite} // Disable button during mutation
              className={`p-2 rounded-full ${isMutatingFavorite ? 'opacity-50' : ''}`}
              style={{ backgroundColor: isDarkMode ? theme.colors.neutral[800] : theme.colors.neutral[100] }}
              accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              accessibilityRole="button"
              accessibilityState={{ disabled: isMutatingFavorite, selected: isFavorite }}
            >
              {isMutatingFavorite ? (
                <ActivityIndicator size="small" color={theme.colors.primary[500]} />
              ) : (
                <Ionicons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={28}
                  color={isFavorite ? theme.colors.status.danger : (isDarkMode ? theme.colors.neutral[400] : theme.colors.neutral[600])}
                />
              )}
            </Pressable>
          </View>

          {/* Image */}
          <StorageImage
            url={strain.image_url ? strain.image_url : null} // Explicitly pass null if undefined/null
            width="100%"
            height={250}
            borderRadius={theme.borderRadius['2xl']}
            contentFit="cover"
            accessibilityLabel={`Image of ${strain.name}`}
            fallbackIconSize={60}
          />

          {/* Basic Info Card */}
          <ThemedView className="mt-4 p-4 rounded-2xl border" lightClassName="bg-white border-neutral-200" darkClassName="bg-neutral-800 border-neutral-700">
            <ThemedText className="text-xl font-semibold mb-3" lightClassName="text-neutral-800" darkClassName="text-neutral-100">
              Strain Info
            </ThemedText>
            {renderInfoRow('Type', strain.type)}
            {renderInfoRow('THC', strain.thc_content, '%')}
            {renderInfoRow('CBD', strain.cbd_content, '%')}
          </ThemedView>

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

          {/* Flavors */}
          {strain.flavor_profile && strain.flavor_profile.length > 0 && (
             <ThemedView className="mt-4 p-4 rounded-2xl border" lightClassName="bg-white border-neutral-200" darkClassName="bg-neutral-800 border-neutral-700">
              <ThemedText className="text-xl font-semibold mb-2" lightClassName="text-neutral-800" darkClassName="text-neutral-100">
                Flavors
              </ThemedText>
              {renderTags(strain.flavor_profile, isDarkMode ? 'bg-primary-700' : 'bg-primary-500')}
            </ThemedView>
          )}

          {/* Effects */}
          {strain.effects && strain.effects.length > 0 && (
             <ThemedView className="mt-4 p-4 rounded-2xl border" lightClassName="bg-white border-neutral-200" darkClassName="bg-neutral-800 border-neutral-700">
              <ThemedText className="text-xl font-semibold mb-2" lightClassName="text-neutral-800" darkClassName="text-neutral-100">
                Effects
              </ThemedText>
              {renderTags(strain.effects, isDarkMode ? 'bg-special-feeding' : 'bg-special-feeding')}
            </ThemedView>
          )}

          {/* Grow Info */}
          <ThemedView className="mt-4 p-4 rounded-2xl border" lightClassName="bg-white border-neutral-200" darkClassName="bg-neutral-800 border-neutral-700">
            <ThemedText className="text-xl font-semibold mb-3" lightClassName="text-neutral-800" darkClassName="text-neutral-100">
              Grow Information
            </ThemedText>
            {renderInfoRow('Difficulty', strain.grow_difficulty)}
            {renderInfoRow('Flowering Time', strain.flowering_time_weeks, ' weeks')}
            {renderInfoRow('Avg. Yield', strain.yield_grams_per_plant, 'g/plant')}
          </ThemedView>

        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}
