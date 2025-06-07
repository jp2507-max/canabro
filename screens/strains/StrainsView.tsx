// React & React Native Core
import * as Haptics from 'expo-haptics';
import { Image as ExpoImage } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import React, { memo, useMemo, useCallback } from 'react';
import { View, ScrollView, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// Local Components
import placeholderImageSource from '../../assets/images/placeholder.png';

import EffectTag from '@/components/strains/EffectTag';
import FlavorTag from '@/components/strains/FlavorTag';
import StrainFilterModal, { ActiveFilters } from '@/components/strains/StrainFilterModal';
import StrainSearch from '@/components/strains/StrainSearch';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';
import ThemedText from '@/components/ui/ThemedText';
import ThemedView from '@/components/ui/ThemedView';
// Animation System (Modern Reanimated v3)
import { useScrollAnimation, AnimatedCard, useAnimationSequence } from '@/lib/animations';
// Types & Utils
import { StrainEffectType, StrainFlavorType } from '@/lib/types/strain';
import { Strain as BaseStrain } from '@/lib/types/weed-db';
import { ensureUuid } from '@/lib/utils/uuid';

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
  { id: 'sativa', name: 'Sativa', icon: 'white-balance-sunny', emoji: '🌞' },
  { id: 'indica', name: 'Indica', icon: 'moon-waning-crescent', emoji: '🌙' },
  { id: 'hybrid', name: 'Hybrid', icon: 'palette-swatch', emoji: '🧬' },
];

// ✅ MIGRATED: Simple helper that returns CSS colors for strain types
const getStrainTypeColor = (type: string) => {
  switch (type) {
    case 'sativa':
      return 'rgb(var(--color-sativa-500))';
    case 'indica':
      return 'rgb(var(--color-indica-500))';
    case 'hybrid':
      return 'rgb(var(--color-hybrid-500))';
    default:
      return 'rgb(var(--color-neutral-600))';
  }
};

// ✅ MIGRATED: Helper for className-based strain colors
const getStrainClassName = (type: string) => {
  switch (type) {
    case 'sativa':
      return 'text-sativa-500';
    case 'indica':
      return 'text-indica-500';
    case 'hybrid':
      return 'text-hybrid-500';
    default:
      return 'text-neutral-600';
  }
};

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
      .onFinalize(() => {
        'worklet';
        scale.set(withSpring(1));
        pressed.set(false);
      })
      .onEnd(() => {
        'worklet';
        const handleToggle = () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

          // Extract the ID from item and pass it to onToggleFavorite
          const id = item?.id ?? item?._id;
          if (id) onToggleFavorite?.(id);
        };
        runOnJS(handleToggle)();
      });

    // Convert the strain ID to UUID for consistent comparison - must be before any early returns
    const strainUuid = useMemo(
      () => ensureUuid(item?.id || item?._id || ''),
      [item?.id, item?._id]
    );

    // Function to determine the proper strain type from available data - must be before any early returns
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
    }, [item?.type, item?.genetics]);

    // Safety checks - if item is invalid, don't render anything (must be after hooks)
    if (!item || typeof item !== 'object') {
      console.log('[DEBUG] StrainCard received invalid item:', item);
      return null;
    }

    // Get the actual strain type
    const actualType = determineStrainType();

    // Log for debugging
    console.log(`[DEBUG] StrainCard rendering:`, {
      name: item.name,
      originalId: item.id || item._id,
      uuid: strainUuid,
      isFavorite,
    });

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
      emoji: '🧬',
    };

    return (
      <AnimatedCard
        variant="strains-style"
        size="medium"
        enableAnimation
        enableShadowAnimation
        enableHaptics={false}
        onPress={onPress}
        className="mb-8 bg-white dark:bg-zinc-900">
        <View className="-m-4 overflow-hidden rounded-3xl">
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
          <View className="absolute left-5 top-5 flex-row items-center rounded-2xl bg-black/50 px-3 py-1">
            <OptimizedIcon
              name={strainTypeConfig.icon as any}
              size={20}
              className="mr-1 text-neutral-50"
            />
            <ThemedText
              className="text-xs font-bold text-white"
              style={{ textShadowColor: 'rgb(var(--color-neutral-900))', textShadowRadius: 4 }}>
              {safeItem.type.charAt(0).toUpperCase() + safeItem.type.slice(1)}
            </ThemedText>
          </View>

          <GestureDetector gesture={tapGesture}>
            <Animated.View
              style={favoriteAnimation}
              className="absolute right-5 top-5 rounded-2xl bg-white p-2 shadow-lg dark:bg-zinc-800"
              accessibilityRole="button"
              accessibilityLabel={safeIsFavorite ? 'Remove from favorites' : 'Add to favorites'}>
              <OptimizedIcon
                name={safeIsFavorite ? 'heart' : 'heart-outline'}
                size={22}
                className={safeIsFavorite ? 'text-danger-500' : 'text-neutral-400'}
                style={{ transform: [{ scale: safeIsFavorite ? 1.15 : 1 }] }}
              />
            </Animated.View>
          </GestureDetector>
        </View>

        <View className="-m-4 mt-0 p-6 px-6 py-5">
          <ThemedText
            className="mb-1 text-2xl font-extrabold capitalize"
            style={{ letterSpacing: 0.2 }}>
            {safeItem.name}
          </ThemedText>
          <View className="mb-2 flex-row items-center">
            {safeItem.growDifficulty && (
              <View className="mr-2 rounded-lg bg-warning-100 px-2 py-1 dark:bg-warning-900">
                <ThemedText className="text-xs font-semibold text-warning-800 dark:text-warning-300">
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
              <View className="ml-1 justify-center rounded-lg bg-neutral-100 px-2 dark:bg-neutral-700">
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
              <View className="ml-1 justify-center rounded-lg bg-neutral-100 px-2 dark:bg-neutral-700">
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
          if (!cat || typeof cat !== 'object' || !cat.id || !cat.name || !cat.icon || !cat.emoji) {
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

const CategoryChip = memo(
  ({
    category,
    isSelected,
    onPress,
  }: {
    category: (typeof CATEGORIES_NEW)[0];
    isSelected: boolean;
    onPress: () => void;
  }) => {
    // 🎯 React Compiler Compatible Animation
    const scale = useSharedValue(1);

    const chipAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    // 🎬 Modern gesture handling
    const handlePress = useCallback(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }, [onPress]);

    const tapGesture = Gesture.Tap()
      .onBegin(() => {
        'worklet';
        scale.set(withSpring(0.96));
      })
      .onFinalize(() => {
        'worklet';
        scale.set(withSpring(1));
      })
      .onEnd(() => {
        'worklet';
        runOnJS(handlePress)();
      });

    // ✅ MIGRATED: Get CSS color for strain type
    const strainColor = getStrainTypeColor(category.id);

    return (
      <GestureDetector gesture={tapGesture}>
        <Animated.View
          style={[
            chipAnimatedStyle,
            {
              backgroundColor: isSelected ? strainColor : undefined,
              shadowColor: isSelected ? strainColor : 'transparent',
              shadowOpacity: isSelected ? 0.18 : 0,
              shadowRadius: 8,
              elevation: isSelected ? 3 : 0,
            },
          ]}
          className={`mr-2 flex-row items-center rounded-2xl px-5 py-2 ${
            isSelected ? 'shadow-lg' : 'bg-neutral-100 dark:bg-zinc-800'
          }`}
          accessibilityRole="button"
          accessibilityLabel={`Filter by ${category.name}`}>
          <OptimizedIcon
            name={category.icon as any}
            size={20}
            className={
              isSelected ? 'mr-2 text-neutral-50' : `${getStrainClassName(category.id)} mr-2`
            }
          />
          <ThemedText
            className={`font-bold ${
              isSelected ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'
            }`}>
            {category.name}
          </ThemedText>
        </Animated.View>
      </GestureDetector>
    );
  }
);

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
  useAnimationSequence();

  // 🎯 Haptic feedback functions (worklet-safe)
  const triggerMediumHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

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
            <ActivityIndicator size="large" color="rgb(var(--color-primary-500))" />
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
          <OptimizedIcon name="warning-outline" size={64} className="mb-4 text-danger-500" />
          <ThemedText className="mb-2 text-center text-xl font-bold">
            Failed to load strains
          </ThemedText>
          <ThemedText className="mb-6 text-center text-base text-neutral-600 dark:text-neutral-400">
            {error.message || 'An error occurred while fetching strains.'}
          </ThemedText>
          <GestureDetector
            gesture={Gesture.Tap()
              .onBegin(() => {
                'worklet';
                runOnJS(triggerMediumHaptic)();
              })
              .onEnd(() => {
                'worklet';
                runOnJS(handleRefresh)();
              })}>
            <Animated.View
              className="rounded-xl bg-primary-500 px-6 py-3 shadow-sm"
              accessibilityRole="button">
              <ThemedText className="font-semibold text-white">Try Again</ThemedText>
            </Animated.View>
          </GestureDetector>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top']}>
      <StatusBar style="auto" />
      <View className="pt-safe-or-2 px-4">
        <CategoryChips selected={selectedStrainType} onSelect={setSelectedStrainType} />
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
            enableAnimation
            onPress={() => router.push('/strains/favorites')}
            className="ml-2">
            <OptimizedIcon name="heart" size={24} className="text-danger-500" />
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
          paddingTop: 4,
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
            tintColor="rgb(var(--color-primary-500))"
          />
        }
        accessibilityLabel="Strains list"
        // Performance optimizations
        initialNumToRender={6}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      />
      <StrainFilterModal
        isVisible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        initialFilters={activeFilters}
        onApplyFilters={handleApplyFilters}
        enableHaptics
        isLoading={isLoading || isFetching}
      />
    </SafeAreaView>
  );
};

export default memo(StrainsView);
