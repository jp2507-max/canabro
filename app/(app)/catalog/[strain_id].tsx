import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import {
  generateCDNImageURL,
  IMAGE_CACHE_POLICY,
  IMAGE_PRIORITY_HIGH,
  IMAGE_TRANSITION_DURATION,
  PLACEHOLDER_BLUR_HASH,
} from '@/lib/utils/image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, Alert, ScrollView, View, Linking } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  interpolateColor as rInterpolateColor,
  runOnJS,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OptimizedIcon } from '@/components/ui/OptimizedIcon';
import ThemedText from '@/components/ui/ThemedText';
import ThemedView from '@/components/ui/ThemedView';
import { useFavoriteManager } from '@/lib/hooks/strains/useFavoriteManager';
import { WeedDbService } from '@/lib/services/weed-db.service';
import { isObjectId } from '@/lib/utils/strainIdMapping';

// Animation configuration
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
  mass: 0.8,
};

/**
 * Enhanced hook to fetch strain details, using MongoDB ObjectId for API calls when available
 */
function useWeedDbStrain(
  strainId: string | undefined,
  getObjectId: (uuid: string) => string | null
) {
  // Use the ObjectId for API calls if available, otherwise fall back to the provided ID
  const apiId = strainId ? getObjectId(strainId) || strainId : undefined;

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

/**
 * Animated floating action button component for back navigation
 */
const AnimatedBackButton = ({ onPress }: { onPress: () => void }) => {
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);

  const gesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(0.92, SPRING_CONFIG);
      pressed.value = withTiming(1, { duration: 150 });
    })
    .onFinalize(() => {
      'worklet';
      scale.value = withSpring(1, SPRING_CONFIG);
      pressed.value = withTiming(0, { duration: 150 });
      runOnJS(onPress)();
    });

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = rInterpolateColor(
      pressed.value,
      [0, 1],
      ['rgba(255, 255, 255, 0.9)', 'rgba(245, 245, 245, 0.95)']
    );

    return {
      transform: [{ scale: scale.value }],
      backgroundColor,
      elevation: pressed.value === 1 ? 2 : 3,
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 18,
            left: 18,
            borderRadius: 18,
            padding: 7,
          },
          animatedStyle,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Go back">
        <OptimizedIcon name="arrow-back" size={22} className="text-neutral-900 dark:text-white" />
      </Animated.View>
    </GestureDetector>
  );
};

/**
 * Animated favorite heart button with sophisticated press animations
 */
const AnimatedFavoriteButton = ({
  isFavorite,
  onPress,
  isLoading,
}: {
  isFavorite: boolean;
  onPress: () => void;
  isLoading: boolean;
}) => {
  const scale = useSharedValue(1);
  const heartScale = useSharedValue(1);
  const pressed = useSharedValue(0);

  const gesture = Gesture.Tap()
    .enabled(!isLoading)
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(0.88, SPRING_CONFIG);
      heartScale.value = withSpring(0.85, SPRING_CONFIG);
      pressed.value = withTiming(1, { duration: 150 });
    })
    .onFinalize(() => {
      'worklet';
      scale.value = withSpring(1, SPRING_CONFIG);
      heartScale.value = withSequence(
        withSpring(1.15, SPRING_CONFIG),
        withSpring(1, SPRING_CONFIG)
      );
      pressed.value = withTiming(0, { duration: 150 });
      runOnJS(onPress)();
    });

  const containerAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    const backgroundColor = rInterpolateColor(
      pressed.value,
      [0, 1],
      ['rgba(255, 255, 255, 0.9)', 'rgba(245, 245, 245, 0.95)']
    );

    return {
      transform: [{ scale: scale.value }],
      backgroundColor,
      elevation: pressed.value === 1 ? 2 : 3,
    };
  });

  const heartAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: heartScale.value }],
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 18,
            right: 18,
            borderRadius: 18,
            padding: 7,
          },
          containerAnimatedStyle,
        ]}
        accessibilityRole="button"
        accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
        <Animated.View style={heartAnimatedStyle}>
          <OptimizedIcon
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={22}
            color={isFavorite ? '#f43f5e' : '#a1a1aa'}
          />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
};

/**
 * Animated expandable section with sophisticated reveal animations
 */
const AnimatedExpandableSection = ({
  title,
  content,
  isExpanded,
  onToggle,
}: {
  title: string;
  content: string | string[];
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);
  const rotateZ = useSharedValue(0);

  useEffect(() => {
    rotateZ.value = withSpring(isExpanded ? 180 : 0, SPRING_CONFIG);
  }, [isExpanded]);

  const gesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(0.98, SPRING_CONFIG);
      pressed.value = withTiming(1, { duration: 100 });
    })
    .onFinalize(() => {
      'worklet';
      scale.value = withSpring(1, SPRING_CONFIG);
      pressed.value = withTiming(0, { duration: 100 });
      runOnJS(onToggle)();
    });

  const titleAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = rInterpolateColor(
      pressed.value,
      [0, 1],
      ['transparent', 'rgba(59, 130, 246, 0.05)']
    );

    return {
      transform: [{ scale: scale.value }],
      backgroundColor,
    };
  });

  const chevronAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${rotateZ.value}deg` }],
  }));

  return (
    <ThemedView className="mx-6 mt-4 rounded-2xl border border-neutral-200 p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[{ borderRadius: 8, padding: 4, margin: -4 }, titleAnimatedStyle]}
          accessibilityRole="button"
          accessibilityLabel={`${isExpanded ? 'Collapse' : 'Expand'} ${title.toLowerCase()}`}>
          <View className="flex-row items-center justify-between">
            <ThemedText className="text-xl font-semibold text-neutral-800 dark:text-neutral-100">
              {title}
            </ThemedText>
            <Animated.View style={chevronAnimatedStyle}>
              <OptimizedIcon
                name="chevron-down"
                size={18}
                className="text-neutral-900 dark:text-white"
              />
            </Animated.View>
          </View>
        </Animated.View>
      </GestureDetector>
      <ThemedText
        className="mt-2 text-base leading-relaxed text-neutral-700 dark:text-neutral-300"
        numberOfLines={isExpanded ? undefined : title === 'Description' ? 4 : 3}>
        {Array.isArray(content) ? content.join('\n\n') : content}
      </ThemedText>
    </ThemedView>
  );
};

/**
 * Animated website button with sophisticated press effects
 */
const AnimatedWebsiteButton = ({ onPress, url }: { onPress: () => void; url: string }) => {
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);

  const gesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(0.95, SPRING_CONFIG);
      pressed.value = withTiming(1, { duration: 150 });
    })
    .onFinalize(() => {
      'worklet';
      scale.value = withSpring(1, SPRING_CONFIG);
      pressed.value = withTiming(0, { duration: 150 });
      runOnJS(onPress)();
    });

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = rInterpolateColor(
      pressed.value,
      [0, 1],
      ['rgb(37, 99, 235)', 'rgb(29, 78, 216)'] // primary-600 to primary-700
    );

    return {
      transform: [{ scale: scale.value }],
      backgroundColor,
      elevation: pressed.value === 1 ? 4 : 2,
    };
  });

  return (
    <ThemedView className="mx-6 mt-6">
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
            },
            animatedStyle,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Open strain source website">
          <OptimizedIcon name="globe-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          <ThemedText className="text-base font-semibold text-white">
            Visit Official Website
          </ThemedText>
        </Animated.View>
      </GestureDetector>
    </ThemedView>
  );
};

export default function StrainDetailPage() {
  const { strain_id } = useLocalSearchParams<{ strain_id: string }>();
  const router = useRouter();
  const [imageError, setImageError] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [tipsExpanded, setTipsExpanded] = useState(false);

  // Use the favorite manager hook with enhanced ObjectId support
  const {
    isFavorite,
    toggleFavorite,
    getObjectId, // Get the MongoDB ObjectId if available
    isLoading: favoriteLoading,
    error: favoriteError,
  } = useFavoriteManager();

  // Use the enhanced query function that resolves UUIDs to MongoDB ObjectIds
  const { data: strain, isLoading, error } = useWeedDbStrain(strain_id, getObjectId);

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
        originalId, // Include the MongoDB ObjectId if available
      });
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      Alert.alert('Error', 'Could not update favorite status. Please try again.');
    }
  };

  const handleBackPress = useCallback(() => {
    router.back();
  }, [router]);

  const handleWebsitePress = useCallback(async () => {
    const sourceUrl = strain?.link || strain?.url;
    if (sourceUrl) {
      try {
        const canOpen = await Linking.canOpenURL(sourceUrl);
        if (canOpen) {
          await Linking.openURL(sourceUrl);
        } else {
          Alert.alert('Unable to open link', 'The provided URL cannot be opened on this device.');
        }
      } catch (error) {
        console.error('Error opening URL:', error);
        Alert.alert('Error', 'An error occurred while trying to open the link.');
      }
    }
  }, [strain]);

  if (isLoading || favoriteLoading) {
    return (
      <ThemedView className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-900">
        <ActivityIndicator size="large" color="rgb(34, 197, 94)" />
        <ThemedText className="mt-4 text-lg">Loading Strain Details...</ThemedText>
      </ThemedView>
    );
  }

  const combinedError = error || favoriteError;
  const errorMessage =
    combinedError &&
    typeof combinedError === 'object' &&
    'message' in combinedError &&
    typeof combinedError.message === 'string'
      ? combinedError.message
      : 'Strain not found.';
  if (combinedError || !strain) {
    return (
      <ThemedView className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-900">
        <ThemedText className="mb-2 text-base text-red-600 dark:text-red-400">
          {errorMessage}
        </ThemedText>
      </ThemedView>
    );
  }

  const renderChips = (items: string[] | undefined, colorClass: string) =>
    items && items.length > 0 ? (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-2"
        contentContainerStyle={{ gap: 8 }}>
        {items.map((item) => (
          <View key={item} className={`rounded-full px-3 py-1 ${colorClass}`}>
            <ThemedText className="text-xs font-semibold capitalize text-white">{item}</ThemedText>
          </View>
        ))}
      </ScrollView>
    ) : null;

  const statChip = (
    icon: React.JSX.Element,
    label: string,
    value: string | number | undefined,
    bg: string,
    text: string
  ) =>
    value !== null && value !== undefined ? (
      <View className={`mb-2 mr-2 flex-row items-center rounded-full px-3 py-1 ${bg}`}>
        {icon}
        <ThemedText className={`ml-1 text-xs font-semibold ${text}`}>
          {label} {value}
        </ThemedText>
      </View>
    ) : null;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="relative">
          <Image
            source={
              imageError || !strain.image
                ? require('../../../assets/placeholder.png')
                : generateCDNImageURL(strain.image, 'medium')
            }
            style={{
              width: '100%',
              height: 260,
              borderBottomLeftRadius: 32,
              borderBottomRightRadius: 32,
            }}
            onError={() => setImageError(true)}
            contentFit="cover"
            cachePolicy={IMAGE_CACHE_POLICY}
            priority={IMAGE_PRIORITY_HIGH}
            transition={{ duration: IMAGE_TRANSITION_DURATION }}
            placeholder={{ blurhash: PLACEHOLDER_BLUR_HASH }}
            accessibilityLabel={`${strain.name} image`}
          />
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 80,
              borderBottomLeftRadius: 32,
              borderBottomRightRadius: 32,
            }}
            className="bg-white/70 dark:bg-neutral-900/70"
          />

          <AnimatedBackButton onPress={handleBackPress} />
          <AnimatedFavoriteButton
            isFavorite={isStrainFavorite}
            onPress={handleToggleFavorite}
            isLoading={favoriteLoading}
          />

          {strain.type && (
            <View style={{ position: 'absolute', bottom: 18, left: 18 }}>
              <View
                className={`rounded-full px-4 py-1 ${
                  strain.type === 'indica'
                    ? 'bg-indigo-500'
                    : strain.type === 'sativa'
                      ? 'bg-green-500'
                      : 'bg-yellow-500'
                }`}>
                <ThemedText className="text-xs font-bold uppercase tracking-wider text-white">
                  {strain.type}
                </ThemedText>
              </View>
            </View>
          )}
        </View>

        <View className="px-6 pb-1 pt-5">
          <ThemedText className="mb-1 text-3xl font-extrabold capitalize text-neutral-900 dark:text-neutral-50">
            {strain.name}
          </ThemedText>
          <View className="mb-2 flex-row items-center">
            {strain.rating && (
              <View className="mr-2 flex-row items-center">
                <OptimizedIcon name="star" size={18} color="#fbbf24" />
                <ThemedText className="ml-1 text-base font-semibold text-yellow-500">
                  {strain.rating.toFixed(1)}
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-2 px-6"
          contentContainerStyle={{ gap: 8 }}>
          {statChip(
            <OptimizedIcon name="leaf" size={16} color="#34d399" />,
            'THC',
            strain.thc ?? undefined,
            'bg-green-100 dark:bg-green-900',
            'text-green-800 dark:text-green-300'
          )}
          {statChip(
            <OptimizedIcon name="leaf" size={16} color="#38bdf8" />,
            'CBD',
            strain.cbd ?? undefined,
            'bg-blue-100 dark:bg-blue-900',
            'text-blue-800 dark:text-blue-300'
          )}
          {statChip(
            <OptimizedIcon name="flower" size={16} color="#f59e42" />,
            'Flower',
            strain.floweringTime,
            'bg-yellow-100 dark:bg-yellow-900',
            'text-yellow-800 dark:text-yellow-300'
          )}
          {statChip(
            <OptimizedIcon name="sprout" size={16} color="#818cf8" />,
            'Difficulty',
            strain.growDifficulty,
            'bg-indigo-100 dark:bg-indigo-900',
            'text-indigo-800 dark:text-indigo-300'
          )}
          {statChip(
            <OptimizedIcon name="scale-balance" size={16} color="#fb7185" />,
            'Yield Indoor',
            strain.yieldIndoor ?? strain.yield_indoor,
            'bg-pink-100 dark:bg-pink-900',
            'text-pink-800 dark:text-pink-300'
          )}
          {statChip(
            <OptimizedIcon name="scale-balance" size={16} color="#fb7185" />,
            'Yield Outdoor',
            strain.yieldOutdoor ?? strain.yield_outdoor,
            'bg-pink-200 dark:bg-pink-800',
            'text-pink-900 dark:text-pink-200'
          )}
          {statChip(
            <OptimizedIcon name="arrow-expand-vertical" size={16} color="#14b8a6" />,
            'Height Indoor',
            strain.heightIndoor ?? strain.height_indoor,
            'bg-teal-100 dark:bg-teal-900',
            'text-teal-800 dark:text-teal-300'
          )}
          {statChip(
            <OptimizedIcon name="arrow-expand-vertical" size={16} color="#0ea5e9" />,
            'Height Outdoor',
            strain.heightOutdoor ?? strain.height_outdoor,
            'bg-teal-200 dark:bg-teal-700',
            'text-teal-900 dark:text-teal-200'
          )}
          {statChip(
            <OptimizedIcon name="calendar-range" size={16} color="#a3e635" />,
            'Harvest (Outdoor)',
            strain.harvestTimeOutdoor ?? strain.harvest_time_outdoor,
            'bg-lime-100 dark:bg-lime-900',
            'text-lime-800 dark:text-lime-300'
          )}
          {statChip(
            <OptimizedIcon name="dna" size={16} color="#818cf8" />,
            'Genetics',
            strain.genetics,
            'bg-blue-100 dark:bg-blue-900',
            'text-blue-800 dark:text-blue-300'
          )}
          {statChip(
            <OptimizedIcon name="flower-outline" size={16} color="#f472b6" />,
            'Flowering Type',
            strain.floweringType ?? strain.flowering_type,
            'bg-pink-100 dark:bg-pink-900',
            'text-pink-800 dark:text-pink-300'
          )}
        </ScrollView>

        <View className="px-6">
          {renderChips(strain.effects, 'bg-teal-500 dark:bg-teal-700')}
          {renderChips(strain.flavors, 'bg-primary-500 dark:bg-primary-700')}
        </View>

        {strain.description && (
          <AnimatedExpandableSection
            title="Description"
            content={strain.description}
            isExpanded={descExpanded}
            onToggle={() => setDescExpanded((v) => !v)}
          />
        )}

        {(strain.growingTips || strain.growing_tips) && (
          <AnimatedExpandableSection
            title="Growing Tips"
            content={(strain.growingTips || strain.growing_tips) as string}
            isExpanded={tipsExpanded}
            onToggle={() => setTipsExpanded((v) => !v)}
          />
        )}

        {strain.parents && Array.isArray(strain.parents) && strain.parents.length > 0 && (
          <ThemedView className="mx-6 mt-4 rounded-2xl border border-neutral-200 p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
            <ThemedText className="mb-2 text-xl font-semibold text-neutral-800 dark:text-neutral-100">
              Parent Genetics
            </ThemedText>
            <View className="mt-1 flex-row flex-wrap gap-2">
              {strain.parents.map((parent: string) => (
                <View
                  key={parent}
                  className="rounded-full bg-orange-500 px-3 py-1 dark:bg-orange-700">
                  <ThemedText className="text-sm capitalize text-white">{parent}</ThemedText>
                </View>
              ))}
            </View>
          </ThemedView>
        )}

        {/* Source Website Button */}
        {(strain.url || strain.link) && (
          <AnimatedWebsiteButton
            onPress={handleWebsitePress}
            url={(strain.link || strain.url) as string}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
