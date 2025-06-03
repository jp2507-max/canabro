// React & React Native Core
import React, { memo, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Expo
import { Image as ExpoImage } from 'expo-image';
import { StatusBar } from 'expo-status-bar';

// Reanimated v3 - React Compiler Compatible
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnUI,
  interpolateColor as rInterpolateColor,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

// Local Components
import EffectTag from '@/components/strains/EffectTag';
import FlavorTag from '@/components/strains/FlavorTag';
import StrainFilterModal, { ActiveFilters } from '@/components/strains/StrainFilterModal';
import StrainSearch from '@/components/strains/StrainSearch';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';
import ThemedText from '@/components/ui/ThemedText';
import ThemedView from '@/components/ui/ThemedView';

// Animation System (Modern Reanimated v3)
import { 
  useButtonAnimation,
  useScrollAnimation,
  AnimatedCard,
  ANIMATION_PRESETS,
  useAnimationSequence,
  SEQUENCE_PRESETS
} from '@/lib/animations';

// Types & Utils
import { StrainEffectType, StrainFlavorType } from '@/lib/types/strain';
import { Strain as BaseStrain } from '@/lib/types/weed-db';
import { ensureUuid } from '@/lib/utils/uuid';

// Assets
import placeholderImageSource from '../../assets/images/placeholder.png';

const { width } = Dimensions.get('window');

interface Strain extends BaseStrain {
  isFavorite?: boolean;
  _id?: string; // MongoDB-style ID fallback
}

interface StrainsViewProps {
  router: any;
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
    isFavorite,
    onToggleFavorite,
  }: {
    item: any;
    onPress?: () => void;
    isFavorite?: boolean;
    onToggleFavorite?: (id: string) => void;
  }) => {
    // 🎯 React Compiler Compatible Animation
    const scale = useSharedValue(1);
    const pressed = useSharedValue(false);
    
    const favoriteAnimation = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    // 🎬 Modern gesture handling
    const tapGesture = Gesture.Tap()
      .onBegin(() => {
        'worklet';
        scale.set(withSpring(0.95));
        pressed.set(true);
      })
      .onEnd(() => {
        'worklet';
        scale.set(withSpring(1));
        pressed.set(false);
        
        // Extract the ID from item and pass it to onToggleFavorite
        const id = item?.id ?? item?._id;
        if (id) onToggleFavorite?.(id);
      });

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
    const determineStrainType = useCallback((): 'sativa' | 'indica' | 'hybrid' => {
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
    }, [item.type, item.genetics]);

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
      <AnimatedCard
        variant="strains-style"
        size="medium"
        enableAnimation={true}
        enableShadowAnimation={true}
        enableHaptics={false}
        onPress={onPress}
        className="mb-8 bg-white dark:bg-zinc-900">
        <View className="overflow-hidden rounded-3xl -m-4">
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
          <View className="absolute top-5 left-5 flex-row items-center bg-black/50 rounded-2xl px-3 py-1">
            <OptimizedIcon
              name={strainTypeConfig.icon as any}
              size={20}
              color="#fff"
              style={{ marginRight: 4 }}
            />
            <ThemedText
              className="text-xs font-bold text-white"
              style={{ textShadowColor: '#000', textShadowRadius: 4 }}>
              {safeItem.type.charAt(0).toUpperCase() + safeItem.type.slice(1)}
            </ThemedText>
          </View>
          
          <GestureDetector gesture={tapGesture}>
            <Animated.View style={favoriteAnimation}>
              <TouchableOpacity
                className="absolute top-5 right-5 bg-white dark:bg-zinc-800 rounded-2xl p-2 shadow-lg"
                accessibilityRole="button"
                accessibilityLabel={safeIsFavorite ? 'Remove from favorites' : 'Add to favorites'}
                activeOpacity={0.8}>
                <OptimizedIcon
                  name={safeIsFavorite ? 'heart' : 'heart-outline'}
                  size={22}
                  color={safeIsFavorite ? '#f43f5e' : '#a1a1aa'}
                  style={{ transform: [{ scale: safeIsFavorite ? 1.15 : 1 }] }}
                />
              </TouchableOpacity>
            </Animated.View>
          </GestureDetector>
        </View>
        
        <View className="px-6 py-5 -m-4 mt-0 p-6">
          <ThemedText
            className="mb-1 text-2xl font-extrabold capitalize"
            style={{ letterSpacing: 0.2 }}>
            {safeItem.name}
          </ThemedText>
          <View className="mb-2 flex-row items-center">
            {safeItem.growDifficulty && (
              <View className="bg-yellow-200 rounded-lg px-2 py-1 mr-2">
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
              <View className="bg-neutral-100 dark:bg-neutral-700 rounded-lg px-2 ml-1 justify-center">
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
              <View className="bg-neutral-100 dark:bg-neutral-700 rounded-lg px-2 ml-1 justify-center">
                <ThemedText className="text-xs text-neutral-600 dark:text-neutral-400">
                  +{safeItem.flavors.length - 2} more
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </AnimatedCard>
    );
  }
);

const CategoryChips = memo(
  ({
    selected = 'sativa',
    onSelect = () => {},
  }: {
    selected?: 'sativa' | 'indica' | 'hybrid';
    onSelect?: (id: 'sativa' | 'indica' | 'hybrid') => void;
  }) => {
    console.log('[DEBUG] CategoryChips rendering with:', { selected });

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
            <CategoryChip
              key={cat.id}
              category={cat}
              isSelected={selected === cat.id}
              onPress={() => onSelect(cat.id as 'sativa' | 'indica' | 'hybrid')}
            />
          );
        })}
      </ScrollView>
    );
  }
);

const CategoryChip = memo(({
  category,
  isSelected,
  onPress,
}: {
  category: typeof CATEGORIES_NEW[0];
  isSelected: boolean;
  onPress: () => void;
}) => {
  // � Modern React Compiler Compatible Animation
  const scale = useSharedValue(1);
  
  const chipAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // 🎬 Modern gesture handling
  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      scale.set(withSpring(0.96));
    })
    .onEnd(() => {
      'worklet';
      scale.set(withSpring(1));
      onPress();
    });

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View style={chipAnimatedStyle}>
        <TouchableOpacity
          className={`rounded-2xl py-2 px-5 flex-row items-center mr-2 ${
            isSelected 
              ? 'shadow-lg' 
              : 'bg-neutral-100 dark:bg-zinc-800'
          }`}
          style={{
            backgroundColor: isSelected ? category.color : undefined,
            shadowColor: isSelected ? category.color : 'transparent',
            shadowOpacity: isSelected ? 0.18 : 0,
            shadowRadius: 8,
            elevation: isSelected ? 3 : 0,
          }}
          accessibilityRole="button"
          accessibilityLabel={`Filter by ${category.name}`}>
          <OptimizedIcon
            name={category.icon as any}
            size={20}
            color={isSelected ? '#fff' : category.color}
            style={{ marginRight: 7 }}
          />
          <ThemedText
            className={`text-base font-semibold ${
              isSelected 
                ? 'text-white' 
                : 'text-neutral-700 dark:text-neutral-300'
            }`}>
            {category.emoji || ''} {category.name}
          </ThemedText>
        </TouchableOpacity>
      </Animated.View>
    </GestureDetector>
  );
});

const StrainsView: React.FC<Partial<StrainsViewProps>> = ({
  router = { push: () => {} },
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
  // 🎬 Scroll animations for enhanced UX
  const scrollAnimation = useScrollAnimation({
    fadeDistance: 150,
    parallaxFactor: 0.2,
    scaleRange: { min: 0.98, max: 1 },
  });

  // 🎭 Animation sequence for loading states  
  const { runSequence } = useAnimationSequence();

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

  if (isLoading && !isFetching) {
    // 🎭 Enhanced loading state with animation sequence
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-black">
        <ThemedView variant="default" className="flex-1 items-center justify-center px-6">
          <View className="animate-pulse">
            <ActivityIndicator size="large" className="text-primary-500" />
          </View>
          <ThemedText className="mt-4 text-center text-base text-neutral-600 dark:text-neutral-400">
            Loading cannabis strains...
          </ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-black">
        <ThemedView variant="default" className="flex-1 items-center justify-center px-6">
          <OptimizedIcon 
            name="warning-outline" 
            size={64} 
            color="#ef4444" 
            style={{ marginBottom: 16 }}
          />
          <ThemedText className="mb-2 text-center text-xl font-bold">
            Failed to load strains
          </ThemedText>
          <ThemedText className="mb-6 text-center text-base text-neutral-600 dark:text-neutral-400">
            {error.message || 'An error occurred while fetching strains.'}
          </ThemedText>
          <TouchableOpacity
            className="rounded-xl bg-primary-500 px-6 py-3 shadow-sm"
            onPress={handleRefresh}
            accessibilityRole="button">
            <ThemedText className="font-semibold text-white">Try Again</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top']}>
      <StatusBar style="auto" />
      <View className="px-4 pt-safe-or-2">
        <CategoryChips
          selected={selectedStrainType}
          onSelect={setSelectedStrainType}
        />
        {/* Enhanced Search Component */}
        <StrainSearch 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder="Search strains..."
        />
        
        <View className="mb-3 flex-row items-center px-4">
          <AnimatedCard
            variant="outlined"
            size="small"
            enableAnimation={true}
            onPress={() => router.push('/strains/favorites')}
            className="ml-2">
            <OptimizedIcon name="heart" size={24} color="#f43f5e" />
          </AnimatedCard>
        </View>
      </View>
      <Animated.FlatList
        {...scrollAnimation.scrollHandler}
        data={filteredStrains} // Use our memoized value here instead of direct strains
        keyExtractor={(item, index) =>
          item.id ??
          item._id ??
          // deterministic fallback so the key is stable across renders
          `fallback-${index}`
        }
        renderItem={({ item }) => (
          <StrainCard
            item={item}
            onPress={() => router.push(`/catalog/${item.id}`)}
            isFavorite={checkIsFavorite(item.id ?? item._id)}
            onToggleFavorite={onToggleFavorite}
          />
        )}
        contentContainerStyle={{ 
          paddingHorizontal: 8, 
          paddingBottom: 32,
          paddingTop: 4 
        }}
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
            tintColor="#22c55e"
          />
        }
        accessibilityLabel="Strains list"
        // Performance optimizations
        initialNumToRender={6}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      />
      <StrainFilterModal
        isVisible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        initialFilters={activeFilters}
        onApplyFilters={handleApplyFilters}
        enableHaptics={true}
        isLoading={isLoading || isFetching}
      />
    </SafeAreaView>
  );
};

export default memo(StrainsView);
