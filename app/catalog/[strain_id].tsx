import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFavoriteManager } from '@/lib/hooks/strains/useFavoriteManager';
import ThemedText from '@/components/ui/ThemedText';
import ThemedView from '@/components/ui/ThemedView';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { WeedDbService } from '@/lib/services/weed-db.service';
import { useQuery } from '@tanstack/react-query';
import { Linking } from 'react-native';
import { isObjectId, isUuid } from '@/lib/utils/strainIdMapping';

/**
 * Enhanced hook to fetch strain details, using MongoDB ObjectId for API calls when available
 */
function useWeedDbStrain(strainId: string | undefined, getObjectId: (uuid: string) => string | null) {
  // Use the ObjectId for API calls if available, otherwise fall back to the provided ID
  const apiId = strainId ? (getObjectId(strainId) || strainId) : undefined;
  
  // For debugging purposes, log the ID conversion
  useEffect(() => {
    if (strainId && apiId && strainId !== apiId) {
      console.log(`[DEBUG] Converting strain ID for API call: ${strainId} → ${apiId}`);
    }
  }, [strainId, apiId]);
  
  return useQuery({
    queryKey: ['strain', apiId], // Use apiId in query key for proper caching
    queryFn: () => {
      if (!apiId) return Promise.resolve(null);
      
      // Always use the API ID (which should be the MongoDB ObjectId when available)
      return WeedDbService.getById(apiId);
    },
    enabled: !!apiId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

export default function StrainDetailPage() {
  const { strain_id } = useLocalSearchParams<{ strain_id: string }>();
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const [imageError, setImageError] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [tipsExpanded, setTipsExpanded] = useState(false);

  // Use the favorite manager hook with enhanced ObjectId support
  const { 
    isFavorite, 
    toggleFavorite,
    getObjectId, // Get the MongoDB ObjectId if available
    isLoading: favoriteLoading, 
    error: favoriteError 
  } = useFavoriteManager();

  // Use the enhanced query function that resolves UUIDs to MongoDB ObjectIds
  const {
    data: strain,
    isLoading,
    error,
  } = useWeedDbStrain(strain_id, getObjectId);

  const isStrainFavorite = strain_id ? isFavorite(strain_id) : false;

  const handleToggleFavorite = async () => {
    if (!strain_id || !strain) return;
    
    try {
      // When toggling a favorite, include the original ObjectId if the strain ID is an ObjectId
      const originalId = isObjectId(strain.id) ? strain.id : undefined;
      
      await toggleFavorite(strain_id, {
        name: strain.name,
        type: strain.type,
        description: strain.description,
        effects: strain.effects,
        flavors: strain.flavors,
        image: typeof strain.image === 'string' ? strain.image : undefined,
        originalId // Include the MongoDB ObjectId if available
      });
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      Alert.alert('Error', 'Could not update favorite status. Please try again.');
    }
  };

  if (isLoading || favoriteLoading) {
    return (
      <ThemedView className="flex-1 items-center justify-center" lightClassName="bg-neutral-50" darkClassName="bg-neutral-900">
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        <ThemedText className="mt-4 text-lg">Loading Strain Details...</ThemedText>
      </ThemedView>
    );
  }

  const combinedError = error || favoriteError;
  const errorMessage =
    combinedError && typeof combinedError === 'object' && 'message' in combinedError && typeof combinedError.message === 'string'
      ? combinedError.message
      : 'Strain not found.';
  if (combinedError || !strain) {
    return (
      <ThemedView className="flex-1 items-center justify-center" lightClassName="bg-neutral-50" darkClassName="bg-neutral-900">
        <ThemedText className="text-red-600 dark:text-red-400 text-base mb-2">{errorMessage}</ThemedText>
      </ThemedView>
    );
  }

  const renderChips = (items: string[] | undefined, colorClass: string) =>
    items && items.length > 0 ? (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2" contentContainerStyle={{ gap: 8 }}>
        {items.map((item) => (
          <View key={item} className={`px-3 py-1 rounded-full ${colorClass}`}> 
            <ThemedText className="text-xs font-semibold text-white capitalize">{item}</ThemedText>
          </View>
        ))}
      </ScrollView>
    ) : null;

  const statChip = (icon: JSX.Element, label: string, value: string | number | undefined, bg: string, text: string) =>
    value !== null && value !== undefined ? (
      <View className={`flex-row items-center px-3 py-1 mr-2 mb-2 rounded-full ${bg}`}> 
        {icon}
        <ThemedText className={`ml-1 text-xs font-semibold ${text}`}>{label} {value}</ThemedText>
      </View>
    ) : null;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="relative">
          <Image
            source={imageError || !strain.image ? require('../../assets/images/placeholder.png') : { uri: strain.image }}
            style={{ width: '100%', height: 260, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}
            onError={() => setImageError(true)}
            contentFit="cover"
            accessibilityLabel={`${strain.name} image`}
          />
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 80, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, backgroundColor: isDarkMode ? 'rgba(24,24,27,0.7)' : 'rgba(255,255,255,0.7)' }} />
          <TouchableOpacity
            style={{ position: 'absolute', top: 18, left: 18, backgroundColor: isDarkMode ? '#18181bcc' : '#fff', borderRadius: 18, padding: 7, elevation: 3 }}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={isDarkMode ? '#fff' : '#18181b'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={{ position: 'absolute', top: 18, right: 18, backgroundColor: isDarkMode ? '#18181bcc' : '#fff', borderRadius: 18, padding: 7, elevation: 3 }}
            onPress={handleToggleFavorite}
            accessibilityRole="button"
            accessibilityLabel={isStrainFavorite ? 'Remove from favorites' : 'Add to favorites'}
            disabled={favoriteLoading}
          >
            <Ionicons name={isStrainFavorite ? 'heart' : 'heart-outline'} size={22} color={isStrainFavorite ? '#f43f5e' : '#a1a1aa'} />
          </TouchableOpacity>
          {strain.type && (
            <View style={{ position: 'absolute', bottom: 18, left: 18 }}>
              <View className={`px-4 py-1 rounded-full ${
                strain.type === 'indica' ? 'bg-indigo-500' : strain.type === 'sativa' ? 'bg-green-500' : 'bg-yellow-500'
              }`}>
                <ThemedText className="text-xs font-bold text-white uppercase tracking-wider">{strain.type}</ThemedText>
              </View>
            </View>
          )}
        </View>

        <View className="px-6 pt-5 pb-1">
          <ThemedText className="text-3xl font-extrabold capitalize mb-1" lightClassName="text-neutral-900" darkClassName="text-neutral-50">
            {strain.name}
          </ThemedText>
          <View className="flex-row items-center mb-2">
            {strain.rating && (
              <View className="flex-row items-center mr-2">
                <Ionicons name="star" size={18} color="#fbbf24" />
                <ThemedText className="ml-1 text-base font-semibold text-yellow-500">{strain.rating.toFixed(1)}</ThemedText>
              </View>
            )}
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-6 mb-2" contentContainerStyle={{ gap: 8 }}>
          {statChip(
            <MaterialCommunityIcons name="leaf" size={16} color="#34d399" />,
            'THC',
            strain.thc ?? undefined,
            'bg-green-100 dark:bg-green-900',
            'text-green-800 dark:text-green-300'
          )}
          {statChip(
            <MaterialCommunityIcons name="leaf" size={16} color="#38bdf8" />,
            'CBD',
            strain.cbd ?? undefined,
            'bg-blue-100 dark:bg-blue-900',
            'text-blue-800 dark:text-blue-300'
          )}
          {statChip(
            <MaterialCommunityIcons name="flower" size={16} color="#f59e42" />,
            'Flower',
            strain.floweringTime,
            'bg-yellow-100 dark:bg-yellow-900',
            'text-yellow-800 dark:text-yellow-300'
          )}
          {statChip(
            <MaterialCommunityIcons name="sprout" size={16} color="#818cf8" />,
            'Difficulty',
            strain.growDifficulty,
            'bg-indigo-100 dark:bg-indigo-900',
            'text-indigo-800 dark:text-indigo-300'
          )}
          {statChip(
            <MaterialCommunityIcons name="scale-balance" size={16} color="#fb7185" />,
            'Yield Indoor',
            strain.yieldIndoor ?? strain.yield_indoor,
            'bg-pink-100 dark:bg-pink-900',
            'text-pink-800 dark:text-pink-300'
          )}
          {statChip(
            <MaterialCommunityIcons name="scale-balance" size={16} color="#fb7185" />,
            'Yield Outdoor',
            strain.yieldOutdoor ?? strain.yield_outdoor,
            'bg-pink-200 dark:bg-pink-800',
            'text-pink-900 dark:text-pink-200'
          )}
          {statChip(
            <MaterialCommunityIcons name="arrow-expand-vertical" size={16} color="#14b8a6" />,
            'Height Indoor',
            strain.heightIndoor ?? strain.height_indoor,
            'bg-teal-100 dark:bg-teal-900',
            'text-teal-800 dark:text-teal-300'
          )}
          {statChip(
            <MaterialCommunityIcons name="arrow-expand-vertical" size={16} color="#0ea5e9" />,
            'Height Outdoor',
            strain.heightOutdoor ?? strain.height_outdoor,
            'bg-teal-200 dark:bg-teal-700',
            'text-teal-900 dark:text-teal-200'
          )}
          {statChip(
            <MaterialCommunityIcons name="calendar-range" size={16} color="#a3e635" />,
            'Harvest (Outdoor)',
            strain.harvestTimeOutdoor ?? strain.harvest_time_outdoor,
            'bg-lime-100 dark:bg-lime-900',
            'text-lime-800 dark:text-lime-300'
          )}
          {statChip(
            <MaterialCommunityIcons name="dna" size={16} color="#818cf8" />,
            'Genetics',
            strain.genetics,
            'bg-blue-100 dark:bg-blue-900',
            'text-blue-800 dark:text-blue-300'
          )}
          {statChip(
            <MaterialCommunityIcons name="flower-outline" size={16} color="#f472b6" />,
            'Flowering Type',
            strain.floweringType ?? strain.flowering_type,
            'bg-pink-100 dark:bg-pink-900',
            'text-pink-800 dark:text-pink-300'
          )}
        </ScrollView>

        <View className="px-6">
          {renderChips(strain.effects, isDarkMode ? 'bg-teal-700' : 'bg-teal-500')}
          {renderChips(strain.flavors, isDarkMode ? 'bg-primary-700' : 'bg-primary-500')}
        </View>

        {strain.description && (
          <ThemedView className="mt-4 mx-6 p-4 rounded-2xl border shadow-sm" lightClassName="bg-white border-neutral-200" darkClassName="bg-neutral-800 border-neutral-700">
            <TouchableOpacity onPress={() => setDescExpanded((v) => !v)} accessibilityRole="button" accessibilityLabel="Expand description">
              <ThemedText className="text-xl font-semibold mb-2" lightClassName="text-neutral-800" darkClassName="text-neutral-100">
                Description
                <Ionicons name={descExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={isDarkMode ? '#fff' : '#18181b'} style={{ marginLeft: 8 }} />
              </ThemedText>
            </TouchableOpacity>
            <ThemedText className="text-base leading-relaxed" numberOfLines={descExpanded ? undefined : 4} lightClassName="text-neutral-700" darkClassName="text-neutral-300">
              {Array.isArray(strain.description) ? strain.description.join('\n\n') : strain.description}
            </ThemedText>
          </ThemedView>
        )}

        {(strain.growingTips || strain.growing_tips) && (
          <ThemedView className="mt-4 mx-6 p-4 rounded-2xl border shadow-sm" lightClassName="bg-white border-neutral-200" darkClassName="bg-neutral-800 border-neutral-700">
            <TouchableOpacity onPress={() => setTipsExpanded((v) => !v)} accessibilityRole="button" accessibilityLabel="Expand growing tips">
              <ThemedText className="text-xl font-semibold mb-2" lightClassName="text-neutral-800" darkClassName="text-neutral-100">
                Growing Tips
                <Ionicons name={tipsExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={isDarkMode ? '#fff' : '#18181b'} style={{ marginLeft: 8 }} />
              </ThemedText>
            </TouchableOpacity>
            <ThemedText className="text-base leading-relaxed" numberOfLines={tipsExpanded ? undefined : 3} lightClassName="text-neutral-700" darkClassName="text-neutral-300">
              {strain.growingTips || strain.growing_tips}
            </ThemedText>
          </ThemedView>
        )}

        {strain.parents && Array.isArray(strain.parents) && strain.parents.length > 0 && (
          <ThemedView className="mt-4 mx-6 p-4 rounded-2xl border shadow-sm" lightClassName="bg-white border-neutral-200" darkClassName="bg-neutral-800 border-neutral-700">
            <ThemedText className="text-xl font-semibold mb-2" lightClassName="text-neutral-800" darkClassName="text-neutral-100">
              Parent Genetics
            </ThemedText>
            <View className="flex-row flex-wrap gap-2 mt-1">
              {strain.parents.map((parent: string) => (
                <View key={parent} className={`px-3 py-1 rounded-full ${isDarkMode ? 'bg-orange-700' : 'bg-orange-500'}`}>
                  <ThemedText className="text-sm capitalize text-white">{parent}</ThemedText>
                </View>
              ))}
            </View>
          </ThemedView>
        )}

        {/* Source Website Button */}
        {(strain.url || strain.link) && (
          <ThemedView className="mt-6 mx-6">
            <TouchableOpacity
              className="flex-row items-center justify-center px-4 py-3 rounded-xl bg-primary-600 dark:bg-primary-500"
              accessibilityRole="button"
              accessibilityLabel="Open strain source website"
              onPress={() => {
                const sourceUrl = strain.link || strain.url;
                if (sourceUrl) Linking.openURL(sourceUrl);
              }}
            >
              <Ionicons name="globe-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <ThemedText className="text-base font-semibold text-white">Visit Official Website</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
