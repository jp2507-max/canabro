import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import React, { memo, useMemo } from 'react';
import {
  View,
  ScrollView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import placeholderImageSource from '../../assets/images/placeholder.png';

import EffectTag from '@/components/strains/EffectTag';
import FlavorTag from '@/components/strains/FlavorTag';
import StrainFilterModal, { ActiveFilters } from '@/components/strains/StrainFilterModal';
import ThemedText from '@/components/ui/ThemedText';
import ThemedView from '@/components/ui/ThemedView';
import { StrainEffectType, StrainFlavorType } from '@/lib/types/strain';
import { Strain as BaseStrain } from '@/lib/types/weed-db';
import { ensureUuid } from '@/lib/utils/uuid';

const { width } = Dimensions.get('window');

interface Strain extends BaseStrain {
  isFavorite?: boolean;
}

interface StrainsViewProps {
  router: any;
  theme: any;
  isDarkMode: boolean;
  selectedStrainType: 'sativa' | 'indica' | 'hybrid';
  setSelectedStrainType: (type: 'sativa' | 'indica' | 'hybrid') => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  isFilterModalVisible: boolean;
  setIsFilterModalVisible: (v: boolean) => void;
  strains: Strain[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  activeFilters: ActiveFilters;
  setActiveFilters: (f: ActiveFilters) => void;
  handleApplyFilters: (f: ActiveFilters) => void;
  handleRefresh: () => void;
  favoriteStrainIds: Set<string>;
  onToggleFavorite: (id: string) => void;
  onStrainHover: (strain: Strain) => void;
}

const CATEGORIES_NEW = [
  { id: 'sativa', name: 'Sativa', icon: 'white-balance-sunny', color: '#34d399', emoji: '🌞' },
  { id: 'indica', name: 'Indica', icon: 'moon-waning-crescent', color: '#818cf8', emoji: '🌙' },
  { id: 'hybrid', name: 'Hybrid', icon: 'palette-swatch', color: '#f59e42', emoji: '🧬' },
];

const StrainCard = memo(
  ({
    item,
    onPress,
    isDarkMode,
    isFavorite,
    onToggleFavorite,
  }: {
    item: any;
    onPress?: () => void;
    isDarkMode?: boolean;
    isFavorite?: boolean;
    onToggleFavorite?: (strain: any) => void;
  }) => {
    // Safety checks - if item is invalid, don't render anything
    if (!item || typeof item !== 'object') {
      console.log('[DEBUG] StrainCard received invalid item:', item);
      return null;
    }

    // Convert the strain ID to UUID for consistent comparison
    const strainUuid = useMemo(() => ensureUuid(item.id || item._id || ''), [item.id, item._id]);

    // Log for debugging
    console.log(`[DEBUG] StrainCard rendering:`, {
      name: item.name,
      originalId: item.id || item._id,
      uuid: strainUuid,
      isFavorite,
    });

    // Function to determine the proper strain type from available data
    const determineStrainType = (): 'sativa' | 'indica' | 'hybrid' => {
      // Use the type property directly if it's one of our expected values
      if (item.type === 'sativa' || item.type === 'indica' || item.type === 'hybrid') {
        return item.type;
      }

      // If the type property isn't valid, try to determine from genetics
      if (item.genetics) {
        const lowerGenetics = item.genetics.toLowerCase();

        if (lowerGenetics === 'sativa') return 'sativa';
        if (lowerGenetics === 'indica') return 'indica';
        if (
          lowerGenetics.includes('indica/sativa') ||
          lowerGenetics.includes('sativa/indica') ||
          lowerGenetics.includes('hybrid')
        )
          return 'hybrid';
        if (lowerGenetics.includes('indica') && !lowerGenetics.includes('sativa')) return 'indica';
        if (lowerGenetics.includes('sativa') && !lowerGenetics.includes('indica')) return 'sativa';
      }

      // Default fallback
      return 'hybrid';
    };

    // Get the actual strain type
    const actualType = determineStrainType();

    // Log type determination for debugging
    console.log(`[DEBUG] Strain ${item.name} type determined as: ${actualType}`, {
      originalType: item.type,
      genetics: item.genetics,
    });

    // Ensure all required properties exist
    const safeItem = {
      id: item.id || item._id || 'unknown',
      name: item.name || 'Unknown Strain',
      type: actualType, // Use the accurately determined type
      image: item.image || item.imageUrl || placeholderImageSource,
      description: Array.isArray(item.description)
        ? item.description[0]
        : item.description || 'No description available.',
      growDifficulty: item.growDifficulty || null,
      effects: Array.isArray(item.effects)
        ? item.effects
        : Array.isArray(item.effect)
          ? item.effect
          : [],
      flavors: Array.isArray(item.flavors)
        ? item.flavors
        : Array.isArray(item.smellAndFlavour)
          ? item.smellAndFlavour
          : [],
    };

    // Safe handlers
    const handlePress = onPress || (() => {});
    const handleToggleFavorite = () => {
      if (onToggleFavorite && item) onToggleFavorite(item);
    };

    const safeIsDarkMode = isDarkMode === true;
    const safeIsFavorite = isFavorite === true;

    // Determine strain type icon and color
    const strainType = safeItem.type || 'hybrid';
    const strainTypeConfig = CATEGORIES_NEW.find((c) => c.id === strainType) || {
      id: 'hybrid',
      name: 'Hybrid',
      icon: 'palette-swatch',
      color: '#f59e42',
      emoji: '🧬',
    };

    return (
      <Pressable
        className="mb-8"
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`View details for ${safeItem.name}`}
        style={({ pressed }) => [
          {
            shadowColor: safeIsDarkMode ? '#000' : '#34d399',
            shadowOpacity: pressed ? 0.15 : 0.25,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            transform: [{ scale: pressed ? 0.97 : 1 }],
            backgroundColor: safeIsDarkMode ? '#18181b' : '#fff',
            borderRadius: 26,
            elevation: pressed ? 2 : 8,
            marginHorizontal: 2,
          },
        ]}>
        <View style={{ overflow: 'hidden', borderRadius: 24 }}>
          <ExpoImage
            source={safeItem.image}
            style={{
              width: width - 32,
              height: 210,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
            }}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
          <View
            style={{
              position: 'absolute',
              top: 18,
              left: 18,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#0008',
              borderRadius: 14,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}>
            <MaterialCommunityIcons
              name={strainTypeConfig.icon as any}
              size={20}
              color="#fff"
              style={{ marginRight: 4 }}
            />
            <ThemedText
              className="text-xs font-bold"
              style={{ color: '#fff', textShadowColor: '#000', textShadowRadius: 4 }}>
              {safeItem.type.charAt(0).toUpperCase() + safeItem.type.slice(1)}
            </ThemedText>
          </View>
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 18,
              right: 18,
              backgroundColor: safeIsDarkMode ? '#27272a' : '#fff',
              borderRadius: 16,
              padding: 7,
              elevation: 4,
            }}
            accessibilityRole="button"
            accessibilityLabel={safeIsFavorite ? 'Remove from favorites' : 'Add to favorites'}
            activeOpacity={0.8}
            onPress={handleToggleFavorite}>
            <Ionicons
              name={safeIsFavorite ? 'heart' : 'heart-outline'}
              size={22}
              color={safeIsFavorite ? '#f43f5e' : '#a1a1aa'}
              style={{ transform: [{ scale: safeIsFavorite ? 1.15 : 1 }] }}
            />
          </TouchableOpacity>
        </View>
        <View className="px-6 py-5">
          <ThemedText
            className="mb-1 text-2xl font-extrabold capitalize"
            style={{ letterSpacing: 0.2 }}>
            {safeItem.name}
          </ThemedText>
          <View className="mb-2 flex-row items-center">
            {safeItem.growDifficulty && (
              <View
                style={{
                  backgroundColor: '#fde68a',
                  borderRadius: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  marginRight: 8,
                }}>
                <ThemedText className="text-xs font-semibold text-yellow-800">
                  {safeItem.growDifficulty}
                </ThemedText>
              </View>
            )}
          </View>
          <ThemedText
            numberOfLines={2}
            className="mb-2 text-base text-neutral-600 dark:text-neutral-400">
            {safeItem.description}
          </ThemedText>
          <View className="mb-2 flex-row flex-wrap">
            {safeItem.effects &&
              safeItem.effects
                .slice(0, 2)
                .map((effect: string, i: number) => (
                  <EffectTag
                    key={`${safeItem.id}-effect-${i}`}
                    effect={effect as StrainEffectType}
                    emoji
                  />
                ))}
            {safeItem.effects && safeItem.effects.length > 2 && (
              <View
                style={{
                  backgroundColor: '#f3f4f6',
                  borderRadius: 8,
                  paddingHorizontal: 6,
                  marginLeft: 4,
                  justifyContent: 'center',
                }}>
                <ThemedText className="text-xs text-neutral-600 dark:text-neutral-400">
                  +{safeItem.effects.length - 2} more
                </ThemedText>
              </View>
            )}
          </View>
          <View className="mb-2 flex-row flex-wrap">
            {safeItem.flavors &&
              safeItem.flavors
                .slice(0, 2)
                .map((flavor: string, i: number) => (
                  <FlavorTag
                    key={`${safeItem.id}-flavor-${i}`}
                    flavor={flavor as StrainFlavorType}
                    emoji
                  />
                ))}
            {safeItem.flavors && safeItem.flavors.length > 2 && (
              <View
                style={{
                  backgroundColor: '#f3f4f6',
                  borderRadius: 8,
                  paddingHorizontal: 6,
                  marginLeft: 4,
                  justifyContent: 'center',
                }}>
                <ThemedText className="text-xs text-neutral-600 dark:text-neutral-400">
                  +{safeItem.flavors.length - 2} more
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  }
);

const CategoryChips = memo(
  ({
    selected = 'sativa',
    onSelect = () => {},
    isDarkMode = false,
  }: {
    selected?: 'sativa' | 'indica' | 'hybrid';
    onSelect?: (id: 'sativa' | 'indica' | 'hybrid') => void;
    isDarkMode?: boolean;
  }) => {
    console.log('[DEBUG] CategoryChips rendering with:', { selected, isDarkMode });

    // Defensive check to ensure CATEGORIES_NEW is an array before mapping
    const safeCategories = Array.isArray(CATEGORIES_NEW) ? CATEGORIES_NEW : [];

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-3"
        contentContainerStyle={{ paddingHorizontal: 8, gap: 12 }}>
        {safeCategories.map((cat) => {
          // Ensure cat is a valid object with all required properties
          if (!cat || typeof cat !== 'object' || !cat.id || !cat.name || !cat.icon || !cat.color) {
            console.error('[ERROR] Invalid category:', cat);
            return null;
          }

          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => onSelect(cat.id as 'sativa' | 'indica' | 'hybrid')}
              style={{
                backgroundColor:
                  selected === cat.id ? cat.color : isDarkMode ? '#27272a' : '#f3f4f6',
                borderRadius: 18,
                paddingVertical: 8,
                paddingHorizontal: 20,
                flexDirection: 'row',
                alignItems: 'center',
                marginRight: 8,
                shadowColor: selected === cat.id ? cat.color : 'transparent',
                shadowOpacity: selected === cat.id ? 0.18 : 0,
                shadowRadius: 8,
                elevation: selected === cat.id ? 3 : 0,
              }}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${cat.name}`}>
              <MaterialCommunityIcons
                name={cat.icon as any}
                size={20}
                color={selected === cat.id ? '#fff' : cat.color}
                style={{ marginRight: 7 }}
              />
              <ThemedText
                className="text-base font-semibold"
                style={{
                  color: selected === cat.id ? '#fff' : isDarkMode ? '#e5e7eb' : '#374151',
                }}>
                {cat.emoji || ''} {cat.name}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  }
);

const StrainsView: React.FC<Partial<StrainsViewProps>> = ({
  router = { push: () => {} },
  theme = { colors: { primary: { 500: '#34d399' }, secondary: { 500: '#f59e42' } } },
  isDarkMode = false,
  selectedStrainType = 'sativa',
  setSelectedStrainType = () => {},
  searchQuery = '',
  setSearchQuery = () => {},
  isFilterModalVisible = false,
  setIsFilterModalVisible = () => {},
  strains = [],
  isLoading = false,
  isFetching = false,
  error = null,
  activeFilters = {
    species: null,
    effects: [],
    flavors: [],
    minThc: null,
    maxThc: null,
    minCbd: null,
    maxCbd: null,
  },
  handleApplyFilters = () => {},
  handleRefresh = () => {},
  favoriteStrainIds = new Set(),
  onToggleFavorite = () => {},
  onStrainHover = () => {},
}) => {
  // Define memoized values at the top level - not inside conditional blocks
  const filteredStrains = useMemo(() => {
    // Instead of placing useMemo inside a conditional, we handle the conditional inside useMemo
    return strains || [];
  }, [strains]);

  // Function to check if a strain is favorited, accounting for both original ID and UUID
  function checkIsFavorite(strainId: string): boolean {
    if (!strainId) return false;

    // Direct check using original ID
    if (favoriteStrainIds.has(strainId)) return true;

    // Try with UUID conversion
    const uuid = ensureUuid(strainId);
    if (uuid && favoriteStrainIds.has(uuid)) return true;

    // Check if we have a mapping where this strain is stored under a different ID
    // This is particularly important for sativa strains where IDs might be inconsistent
    for (const favoriteId of favoriteStrainIds) {
      const favoriteUuid = ensureUuid(favoriteId);
      // If there's a name match between the stored favorite and this strain
      // This is a fallback for when UUIDs don't match but we know it's the same strain
      if (uuid === favoriteUuid) return true;
    }

    return false;
  }

  if (isLoading && !isFetching)
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      </View>
    );

  if (error)
    return (
      <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-black">
        <ThemedText className="mb-2 text-center text-xl font-bold">
          Failed to load strains
        </ThemedText>
        <ThemedText className="mb-4 text-center text-base">
          {error.message || 'An error occurred.'}
        </ThemedText>
        <TouchableOpacity
          className="rounded-lg bg-green-400 px-6 py-3"
          onPress={handleRefresh}
          accessibilityRole="button">
          <ThemedText className="font-semibold text-white">Try Again</ThemedText>
        </TouchableOpacity>
      </View>
    );

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black">
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View className="px-4 pt-2">
        <CategoryChips
          selected={selectedStrainType}
          onSelect={setSelectedStrainType}
          isDarkMode={isDarkMode}
        />
        <View className="mb-3 mt-2 flex-row items-center">
          <View className="relative flex-1">
            <TextInput
              className="flex-1 rounded-xl bg-neutral-100 px-4 py-3 text-base text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100"
              placeholder="Search strains..."
              placeholderTextColor={isDarkMode ? '#a1a1aa' : '#6b7280'}
              value={searchQuery}
              onChangeText={(text) => {
                console.log(`[DEBUG] Search input changed: "${text}"`);
                setSearchQuery(text);
              }}
              accessibilityLabel="Search strains"
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
            {isFetching && searchQuery ? (
              <View className="absolute bottom-0 right-3 top-0 justify-center">
                <ActivityIndicator size="small" color={theme.colors.primary[500]} />
              </View>
            ) : searchQuery ? (
              <TouchableOpacity
                className="absolute bottom-0 right-3 top-0 justify-center"
                onPress={() => setSearchQuery('')}
                accessibilityLabel="Clear search">
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={isDarkMode ? '#a1a1aa' : '#6b7280'}
                />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity
            className="ml-2 rounded-full bg-neutral-200 p-2 dark:bg-neutral-700"
            accessibilityRole="button"
            accessibilityLabel="View favorite strains"
            onPress={() => router.push('/strains/favorites')}>
            <Ionicons name="heart" size={24} color={isDarkMode ? '#f43f5e' : '#be185d'} />
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={filteredStrains} // Use our memoized value here instead of direct strains
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <StrainCard
            item={item}
            onPress={() => router.push(`/catalog/${item.id}`)}
            isDarkMode={isDarkMode}
            isFavorite={checkIsFavorite(item.id)}
            onToggleFavorite={onToggleFavorite}
          />
        )}
        contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 32, paddingTop: 4 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="mt-24 flex-1 items-center justify-center">
            <ThemedText className="text-lg text-neutral-500 dark:text-neutral-400">
              {searchQuery ? `No strains found matching "${searchQuery}"` : 'No strains found.'}
            </ThemedText>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary[500]]}
            tintColor={theme.colors.primary[500]}
          />
        }
        accessibilityLabel="Strains list"
      />
      <StrainFilterModal
        isVisible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        initialFilters={activeFilters}
        onApplyFilters={handleApplyFilters}
      />
    </SafeAreaView>
  );
};

export default memo(StrainsView);
