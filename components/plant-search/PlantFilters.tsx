/**
 * PlantFilters - Bottom sheet modal for plant filtering options
 *
 * Features:
 * - Bottom sheet modal with smooth animations
 * - Multi-select chips for growth stages and strain types
 * - Range sliders for health and numeric values
 * - Quick filter presets and clear all functionality
 * - Follows existing modal patterns from AddPlantModal
 */
import React, { useState, useCallback, useEffect } from 'react';
import { Modal, Platform, useWindowDimensions, ScrollView, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { PanGestureHandlerEventPayload as _PanGestureHandlerEventPayload } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import { triggerLightHaptic, triggerMediumHaptic } from '@/lib/utils/haptics';
import { GrowthStage, CannabisType } from '@/lib/types/plant';
import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { OptimizedIcon, IconName } from '@/components/ui/OptimizedIcon';
import { TagPill } from '@/components/ui/TagPill';

export interface PlantFiltersData {
  growthStages: GrowthStage[];
  healthRange: [number, number];
  strainTypes: CannabisType[];
  needsAttention: boolean;
  sortBy: 'name' | 'planted_date' | 'health' | 'next_watering';
  sortOrder: 'asc' | 'desc';
}

interface PlantFiltersProps {
  visible: boolean;
  onClose: () => void;
  filters: PlantFiltersData;
  onFiltersChange: (filters: PlantFiltersData) => void;
  onClearAll: () => void;
}

// Animation configurations
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 200,
  mass: 1,
};

const ENTRANCE_CONFIG = {
  damping: 20,
  stiffness: 300,
  mass: 0.8,
};

// Filter options
const GROWTH_STAGE_OPTIONS = [
  { key: GrowthStage.GERMINATION, label: 'Germination' },
  { key: GrowthStage.SEEDLING, label: 'Seedling' },
  { key: GrowthStage.VEGETATIVE, label: 'Vegetative' },
  { key: GrowthStage.PRE_FLOWER, label: 'Pre-Flower' },
  { key: GrowthStage.FLOWERING, label: 'Flowering' },
  { key: GrowthStage.LATE_FLOWERING, label: 'Late Flowering' },
  { key: GrowthStage.HARVEST, label: 'Harvest' },
  { key: GrowthStage.CURING, label: 'Curing' },
];

const STRAIN_TYPE_OPTIONS = [
  { key: CannabisType.Indica, label: 'Indica' },
  { key: CannabisType.Sativa, label: 'Sativa' },
  { key: CannabisType.Hybrid, label: 'Hybrid' },
  { key: CannabisType.Ruderalis, label: 'Ruderalis' },
];

const SORT_OPTIONS = [
  { key: 'name', label: 'Name' },
  { key: 'planted_date', label: 'Planted Date' },
  { key: 'health', label: 'Health' },
  { key: 'next_watering', label: 'Next Watering' },
] as const;

const QUICK_FILTER_PRESETS: Array<{
  key: string;
  icon: IconName;
}> = [
  {
    key: 'needsAttention',
    icon: 'warning',
  },
  {
    key: 'floweringPlants',
    icon: 'flower',
  },
  {
    key: 'healthyPlants',
    icon: 'heart',
  },
];

export const PlantFilters = React.memo(({
  visible,
  onClose,
  filters,
  onFiltersChange,
  onClearAll,
}: PlantFiltersProps) => {
  const { t } = useTranslation('plantSearch');
  const { height: screenHeight } = useWindowDimensions();
  
  // Local state for range sliders
  const [healthRange, setHealthRange] = useState<[number, number]>(filters.healthRange);

  // Reanimated v3 shared values for modal animations
  const modalTranslateY = useSharedValue(screenHeight);
  const backdropOpacity = useSharedValue(0);
  const headerScale = useSharedValue(0.95);
  const blurIntensity = useSharedValue(0);

  // Enhanced modal entrance animation
  const showModal = () => {
    'worklet';
    const maxIntensity = Platform.OS === 'ios' ? 20 : 10;
    modalTranslateY.value = withSpring(0, ENTRANCE_CONFIG);
    backdropOpacity.value = withTiming(1, { duration: 300 });
    blurIntensity.value = withTiming(maxIntensity, { duration: 400 });
    headerScale.value = withSpring(1, SPRING_CONFIG);
  };

  // Enhanced modal exit animation
  const hideModal = () => {
    'worklet';
    modalTranslateY.value = withSpring(screenHeight * 0.6, SPRING_CONFIG, (finished) => {
      'worklet';
      if (finished) {
        runOnJS(onClose)();
      }
    });
    backdropOpacity.value = withTiming(0, { duration: 200 });
    blurIntensity.value = withTiming(0, { duration: 300 });
    headerScale.value = withSpring(0.95, SPRING_CONFIG);
  };

  // Gesture handlers for modal dismissal
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      'worklet';
      if (event.translationY > 0) {
        modalTranslateY.value = event.translationY;
        const progress = Math.min(event.translationY / (screenHeight * 0.3), 1);
        backdropOpacity.value = 1 - progress * 0.5;
        headerScale.value = 1 - progress * 0.05;
      }
    })
    .onEnd((event) => {
      'worklet';
      if (event.translationY > screenHeight * 0.15 || event.velocityY > 800) {
        runOnJS(hideModal)();
      } else {
        modalTranslateY.value = withSpring(0, SPRING_CONFIG);
        backdropOpacity.value = withTiming(1, { duration: 200 });
        headerScale.value = withSpring(1, SPRING_CONFIG);
      }
    });

  const backdropGesture = Gesture.Tap().onEnd(() => {
    'worklet';
    runOnJS(hideModal)();
  });

  // Animated styles
  const animatedModalStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateY: modalTranslateY.value }, { scale: headerScale.value }],
    };
  });

  const animatedBackdropStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: backdropOpacity.value,
    };
  });

  const animatedBlurStyle = useAnimatedStyle(() => {
    'worklet';
    const maxIntensity = Platform.OS === 'ios' ? 20 : 10;
    return {
      opacity: interpolate(blurIntensity.value, [0, maxIntensity], [0, 1]),
    };
  });

  // Handle modal visibility changes
  useEffect(() => {
    if (visible) {
      modalTranslateY.value = screenHeight;
      backdropOpacity.value = 0;
      headerScale.value = 0.95;
      blurIntensity.value = 0;

      setTimeout(() => {
        showModal();
      }, 50);
    }
  }, [visible, screenHeight]);

  // Update local health range when filters change
  useEffect(() => {
    setHealthRange(filters.healthRange);
  }, [filters.healthRange]);

  // Filter update handlers
  const handleGrowthStageToggle = useCallback((stage: GrowthStage) => {
    triggerLightHaptic();
    const newStages = filters.growthStages.includes(stage)
      ? filters.growthStages.filter(s => s !== stage)
      : [...filters.growthStages, stage];
    
    onFiltersChange({
      ...filters,
      growthStages: newStages,
    });
  }, [filters, onFiltersChange]);

  const handleStrainTypeToggle = useCallback((type: CannabisType) => {
    triggerLightHaptic();
    const newTypes = filters.strainTypes.includes(type)
      ? filters.strainTypes.filter(t => t !== type)
      : [...filters.strainTypes, type];
    
    onFiltersChange({
      ...filters,
      strainTypes: newTypes,
    });
  }, [filters, onFiltersChange]);

  const handleHealthRangeChange = useCallback((range: [number, number]) => {
    setHealthRange(range);
    onFiltersChange({
      ...filters,
      healthRange: range,
    });
  }, [filters, onFiltersChange]);

  const handleNeedsAttentionToggle = useCallback(() => {
    triggerLightHaptic();
    onFiltersChange({
      ...filters,
      needsAttention: !filters.needsAttention,
    });
  }, [filters, onFiltersChange]);

  const handleSortChange = useCallback((sortBy: PlantFiltersData['sortBy']) => {
    triggerLightHaptic();
    const newSortOrder = filters.sortBy === sortBy && filters.sortOrder === 'asc' ? 'desc' : 'asc';
    onFiltersChange({
      ...filters,
      sortBy,
      sortOrder: newSortOrder,
    });
  }, [filters, onFiltersChange]);

  const handleQuickFilterPress = useCallback((presetKey: string) => {
    triggerMediumHaptic();
    
    switch (presetKey) {
      case 'needsAttention':
        onFiltersChange({
          ...filters,
          needsAttention: true,
          healthRange: [0, 50],
        });
        break;
      case 'floweringPlants':
        onFiltersChange({
          ...filters,
          growthStages: [GrowthStage.FLOWERING],
        });
        break;
      case 'healthyPlants':
        onFiltersChange({
          ...filters,
          healthRange: [80, 100],
        });
        break;
    }
  }, [filters, onFiltersChange]);

  const handleClearAll = useCallback(() => {
    triggerMediumHaptic();
    onClearAll();
  }, [onClearAll]);

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={hideModal}
    >
      {/* Backdrop */}
      <GestureDetector gesture={backdropGesture}>
        <Animated.View style={[{ flex: 1 }, animatedBackdropStyle]}>
          <Animated.View style={[{ flex: 1 }, animatedBlurStyle]}>
            <BlurView
              intensity={Platform.OS === 'ios' ? 20 : 10}
              className="flex-1 bg-black/20"
            />
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      {/* Modal Content */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              maxHeight: screenHeight * 0.85,
            },
            animatedModalStyle,
          ]}
          className="rounded-t-3xl bg-white shadow-2xl dark:bg-neutral-900"
        >
          {/* Handle */}
          <ThemedView className="items-center py-3">
            <ThemedView className="h-1 w-12 rounded-full bg-neutral-300 dark:bg-neutral-600" />
          </ThemedView>

          {/* Header */}
          <ThemedView className="flex-row items-center justify-between px-6 pb-4">
            <ThemedText className="text-xl font-bold">{t('filterPlants')}</ThemedText>
            <Pressable
              onPress={handleClearAll}
              className="rounded-lg bg-neutral-100 px-3 py-1.5 dark:bg-neutral-800"
            >
              <ThemedText className="text-sm font-medium text-primary-600 dark:text-primary-400">
                {t('clearAll')}
              </ThemedText>
            </Pressable>
          </ThemedView>

          <ScrollView
            className="flex-1 px-6"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Quick Filter Presets */}
            <ThemedView className="mb-6">
              <ThemedText className="mb-3 text-base font-semibold">{t('filters.quickFilters')}</ThemedText>
              <ThemedView className="flex-row flex-wrap gap-2">
                {QUICK_FILTER_PRESETS.map((preset) => (
                  <Pressable
                    key={preset.key}
                    onPress={() => handleQuickFilterPress(preset.key)}
                    className="flex-row items-center rounded-full border border-neutral-300 bg-neutral-50 px-4 py-2 dark:border-neutral-600 dark:bg-neutral-800"
                    accessibilityLabel={`${t(`filters.${preset.key}`)} filter button`}
                    accessibilityRole="button"
                  >
                    <OptimizedIcon
                      name={preset.icon}
                      size={16}
                      className="mr-2 text-neutral-600 dark:text-neutral-400"
                    />
                    <ThemedText className="text-sm font-medium">{t(`filters.${preset.key}`)}</ThemedText>
                  </Pressable>
                ))}
              </ThemedView>
            </ThemedView>

            {/* Growth Stages */}
            <ThemedView className="mb-6">
              <ThemedText className="mb-3 text-base font-semibold">{t('filters.growthStages')}</ThemedText>
              <ThemedView className="flex-row flex-wrap gap-2">
                {GROWTH_STAGE_OPTIONS.map((option) => (
                  <TagPill
                    key={option.key}
                    text={option.label}
                    selected={filters.growthStages.includes(option.key)}
                    onPress={() => handleGrowthStageToggle(option.key)}
                  />
                ))}
              </ThemedView>
            </ThemedView>

            {/* Strain Types */}
            <ThemedView className="mb-6">
              <ThemedText className="mb-3 text-base font-semibold">{t('filters.strainTypes')}</ThemedText>
              <ThemedView className="flex-row flex-wrap gap-2">
                {STRAIN_TYPE_OPTIONS.map((option) => (
                  <TagPill
                    key={option.key}
                    text={option.label}
                    selected={filters.strainTypes.includes(option.key)}
                    onPress={() => handleStrainTypeToggle(option.key)}
                  />
                ))}
              </ThemedView>
            </ThemedView>

            {/* Health Range */}
            <ThemedView className="mb-6">
              <ThemedText className="mb-3 text-base font-semibold">{t('filters.healthRange')}</ThemedText>
              <HealthRangeSlider
                value={healthRange}
                onChange={handleHealthRangeChange}
              />
            </ThemedView>

            {/* Special Filters */}
            <ThemedView className="mb-6">
              <ThemedText className="mb-3 text-base font-semibold">{t('filters.specialFilters')}</ThemedText>
              <Pressable
                onPress={handleNeedsAttentionToggle}
                className="flex-row items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800"
              >
                <ThemedView className="flex-row items-center">
                  <OptimizedIcon
                    name="warning"
                    size={20}
                    className="mr-3 text-orange-500"
                  />
                  <ThemedView>
                    <ThemedText className="font-medium">{t('filters.needsAttention')}</ThemedText>
                    <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
                      {t('filters.needsAttentionDesc')}
                    </ThemedText>
                  </ThemedView>
                </ThemedView>
                <ThemedView
                  className={`h-6 w-6 rounded-full border-2 ${
                    filters.needsAttention
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-neutral-300 dark:border-neutral-600'
                  }`}
                >
                  {filters.needsAttention && (
                    <OptimizedIcon
                      name="checkmark"
                      size={14}
                      className="text-white"
                    />
                  )}
                </ThemedView>
              </Pressable>
            </ThemedView>

            {/* Sort Options */}
            <ThemedView className="mb-8">
              <ThemedText className="mb-3 text-base font-semibold">{t('filters.sortBy')}</ThemedText>
              <ThemedView className="space-y-2">
                {SORT_OPTIONS.map((option) => (
                  <Pressable
                    key={option.key}
                    onPress={() => handleSortChange(option.key)}
                    className={`flex-row items-center justify-between rounded-lg border p-4 ${
                      filters.sortBy === option.key
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800'
                    }`}
                  >
                    <ThemedText
                      className={`font-medium ${
                        filters.sortBy === option.key
                          ? 'text-primary-600 dark:text-primary-400'
                          : ''
                      }`}
                    >
                      {option.label}
                    </ThemedText>
                    <ThemedView className="flex-row items-center">
                      {filters.sortBy === option.key && (
                        <OptimizedIcon
                          name={filters.sortOrder === 'asc' ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          className="text-primary-600 dark:text-primary-400"
                        />
                      )}
                    </ThemedView>
                  </Pressable>
                ))}
              </ThemedView>
            </ThemedView>
          </ScrollView>
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
});

// Health Range Slider Component
interface HealthRangeSliderProps {
  value: [number, number];
  onChange: (value: [number, number]) => void;
}

const HealthRangeSlider = React.memo(({ value, onChange }: HealthRangeSliderProps) => {
  const SLIDER_WIDTH = 280;
  const THUMB_SIZE = 24;
  const TRACK_HEIGHT = 4;

  const valueToPosition = useCallback(
    (val: number) => ((val - 0) / (100 - 0)) * SLIDER_WIDTH,
    []
  );

  const positionToValue = useCallback(
    (position: number) => Math.round((position / SLIDER_WIDTH) * 100),
    []
  );

  const minThumbX = useSharedValue(valueToPosition(value[0]));
  const maxThumbX = useSharedValue(valueToPosition(value[1]));

  const triggerHaptic = useCallback(() => {
    triggerLightHaptic();
  }, []);


  // Use shared values for initial thumb positions for smooth movement
  const minThumbStartX = useSharedValue(0);
  const maxThumbStartX = useSharedValue(0);

  const minThumbGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      minThumbStartX.value = minThumbX.value;
    })
    .onUpdate((event) => {
      'worklet';
      const newX = Math.max(
        0,
        Math.min(minThumbStartX.value + event.translationX, maxThumbX.value - THUMB_SIZE)
      );
      minThumbX.value = newX;
      const newValue = positionToValue(newX);
      runOnJS(onChange)([newValue, positionToValue(maxThumbX.value)]);
    })
    .onEnd(() => {
      'worklet';
      runOnJS(triggerHaptic)();
    });

  const maxThumbGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      maxThumbStartX.value = maxThumbX.value;
    })
    .onUpdate((event) => {
      'worklet';
      const newX = Math.max(
        minThumbX.value + THUMB_SIZE,
        Math.min(maxThumbStartX.value + event.translationX, SLIDER_WIDTH)
      );
      maxThumbX.value = newX;
      const newValue = positionToValue(newX);
      runOnJS(onChange)([positionToValue(minThumbX.value), newValue]);
    })
    .onEnd(() => {
      'worklet';
      runOnJS(triggerHaptic)();
    });

  const activeTrackStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      left: minThumbX.value,
      width: maxThumbX.value - minThumbX.value,
    };
  });

  const minThumbStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateX: minThumbX.value }],
    };
  });

  const maxThumbStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateX: maxThumbX.value }],
    };
  });

  return (
    <ThemedView className="items-center">
      <ThemedView className="mb-4 flex-row justify-between" style={{ width: SLIDER_WIDTH }}>
        <ThemedText className="text-sm font-medium text-primary-600 dark:text-primary-400">
          {value[0]}%
        </ThemedText>
        <ThemedText className="text-sm font-medium text-primary-600 dark:text-primary-400">
          {value[1]}%
        </ThemedText>
      </ThemedView>

      <ThemedView className="h-12 justify-center">
        <ThemedView
          className="rounded-full bg-neutral-200 dark:bg-neutral-700"
          style={{ width: SLIDER_WIDTH, height: TRACK_HEIGHT }}
        >
          <Animated.View
            style={[
              activeTrackStyle,
              {
                height: TRACK_HEIGHT,
                backgroundColor: 'rgb(var(--color-info-500))',
                borderRadius: TRACK_HEIGHT / 2,
              },
            ]}
          />
        </ThemedView>

        <GestureDetector gesture={minThumbGesture}>
          <Animated.View
            style={[
              minThumbStyle,
              {
                position: 'absolute',
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                borderRadius: THUMB_SIZE / 2,
                backgroundColor: 'rgb(var(--color-info-500))',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 5,
              },
            ]}
          />
        </GestureDetector>

        <GestureDetector gesture={maxThumbGesture}>
          <Animated.View
            style={[
              maxThumbStyle,
              {
                position: 'absolute',
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                borderRadius: THUMB_SIZE / 2,
                backgroundColor: 'rgb(var(--color-info-500))',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 5,
              },
            ]}
          />
        </GestureDetector>
      </ThemedView>

      <ThemedView className="mt-2 flex-row justify-between" style={{ width: SLIDER_WIDTH }}>
        <ThemedText className="text-xs text-neutral-500">0%</ThemedText>
        <ThemedText className="text-xs text-neutral-500">100%</ThemedText>
      </ThemedView>
    </ThemedView>
  );
});

PlantFilters.displayName = 'PlantFilters';
HealthRangeSlider.displayName = 'HealthRangeSlider';