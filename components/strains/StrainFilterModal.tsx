import * as Haptics from '@/lib/utils/haptics';
import React, { useState } from 'react';
import { Modal, View, ScrollView, ActivityIndicator } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnUI,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SPRING_CONFIGS } from '../../lib/animations/presets';
import { StrainSpecies, StrainEffectType, StrainFlavorType } from '../../lib/types/strain';
import {
  triggerSelectionHaptic,
  triggerSuccessHaptic,
  triggerMediumHaptic,
  triggerLightHaptic,
} from '../../lib/utils/haptics';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import PotencySlider from '../ui/PotencySlider';
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';

// Species icon color constants for consistency and maintainability
const SPECIES_ICON_COLORS = {
  [StrainSpecies.INDICA]: '#9333ea',
  [StrainSpecies.SATIVA]: '#ea580c',
  [StrainSpecies.HYBRID]: '#16a34a',
  [StrainSpecies.RUDERALIS]: '#0891b2', // cyan-600 for ruderalis
  default: '#059669',
  inactive: '#6b7280',
};

// Define the structure for active filters
export interface ActiveFilters {
  species: StrainSpecies | null;
  effects: StrainEffectType[];
  flavors: StrainFlavorType[];
  minThc: number | null;
  maxThc: number | null;
  minCbd: number | null;
  maxCbd: number | null;
  showFavoritesOnly?: boolean; // Enhanced: Add favorites filter
}

interface StrainFilterModalProps {
  isVisible: boolean;
  onClose: () => void;
  initialFilters: ActiveFilters;
  onApplyFilters: (filters: ActiveFilters) => void;
  enableHaptics?: boolean;
  isLoading?: boolean; // Enhanced: Add loading state support
}

// Enhanced: Add type-specific styling helpers
const getSpeciesColor = (species: StrainSpecies | null, isSelected: boolean) => {
  if (!isSelected) return 'text-neutral-600 dark:text-neutral-400';

  switch (species) {
    case StrainSpecies.INDICA:
      return 'text-purple-600 dark:text-purple-400';
    case StrainSpecies.SATIVA:
      return 'text-orange-600 dark:text-orange-400';
    case StrainSpecies.HYBRID:
      return 'text-green-600 dark:text-green-400';
    default:
      return 'text-primary-600 dark:text-primary-400';
  }
};

const getSpeciesBackgroundColor = (species: StrainSpecies | null, isSelected: boolean) => {
  if (!isSelected) return 'bg-neutral-100 dark:bg-neutral-800';

  switch (species) {
    case StrainSpecies.INDICA:
      return 'bg-purple-100 dark:bg-purple-900/30';
    case StrainSpecies.SATIVA:
      return 'bg-orange-100 dark:bg-orange-900/30';
    case StrainSpecies.HYBRID:
      return 'bg-green-100 dark:bg-green-900/30';
    default:
      return 'bg-primary-100 dark:bg-primary-900/30';
  }
};

const getSpeciesIcon = (species: StrainSpecies | null) => {
  switch (species) {
    case StrainSpecies.INDICA:
      return 'moon-outline';
    case StrainSpecies.SATIVA:
      return 'sunny-outline';
    case StrainSpecies.HYBRID:
      return 'leaf-outline'; // Use available icon
    default:
      return 'search'; // Use available icon
  }
};

// Define available options for filters
const SPECIES_OPTIONS = [
  { id: null, name: 'Any Species' },
  { id: StrainSpecies.INDICA, name: 'Indica' },
  { id: StrainSpecies.SATIVA, name: 'Sativa' },
  { id: StrainSpecies.HYBRID, name: 'Hybrid' },
];

// Get all possible values from the enums
const EFFECT_OPTIONS = Object.values(StrainEffectType);
const FLAVOR_OPTIONS = Object.values(StrainFlavorType);

// Potency ranges for THC and CBD
const POTENCY_RANGES = {
  thc: { min: 0, max: 35, step: 1, defaultMin: 5, defaultMax: 25 },
  cbd: { min: 0, max: 25, step: 0.5, defaultMin: 1, defaultMax: 15 },
};

// Animated Selection Button Component - moved to module scope for performance
interface AnimatedSelectionButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  selected: boolean;
  disabled?: boolean;
  className?: string;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'checkbox' | 'radio';
  accessibilityState?: any;
  enableHaptics?: boolean;
}

const AnimatedSelectionButton = React.memo<AnimatedSelectionButtonProps>(
  ({
    onPress,
    children,
    selected,
    disabled = false,
    className = '',
    accessibilityLabel,
    accessibilityRole,
    accessibilityState,
    enableHaptics = true,
  }) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => {
      'worklet';
      return {
        transform: [{ scale: scale.value }],
      };
    });

    const gesture = Gesture.Tap()
      .enabled(!disabled)
      .onBegin(() => {
        runOnUI(() => {
          scale.value = withTiming(0.95, { duration: 100 });
        })();
        if (enableHaptics) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      })
      .onFinalize(() => {
        runOnUI(() => {
          scale.value = withSpring(1, SPRING_CONFIGS.quick);
        })();
        if (!disabled) onPress();
      });

    return (
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={animatedStyle}
          className={className}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole={accessibilityRole}
          accessibilityState={accessibilityState}>
          {children}
        </Animated.View>
      </GestureDetector>
    );
  }
);

// Animated Action Button Component - moved to module scope for performance
interface AnimatedActionButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
  accessibilityLabel?: string;
  accessibilityRole?: 'button';
  enableHaptics?: boolean;
}

const AnimatedActionButton = React.memo<AnimatedActionButtonProps>(
  ({
    onPress,
    children,
    disabled = false,
    className = '',
    accessibilityLabel,
    accessibilityRole,
    enableHaptics = true,
  }) => {
    const scale = useSharedValue(1);
    const shadowOpacity = useSharedValue(0.2);

    const animatedStyle = useAnimatedStyle(() => {
      'worklet';
      return {
        transform: [{ scale: scale.value }],
        shadowOpacity: shadowOpacity.value,
      };
    });

    const gesture = Gesture.Tap()
      .enabled(!disabled)
      .onBegin(() => {
        runOnUI(() => {
          scale.value = withTiming(0.98, { duration: 100 });
          shadowOpacity.value = withTiming(0.1, { duration: 100 });
        })();
        if (enableHaptics) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      })
      .onFinalize(() => {
        runOnUI(() => {
          scale.value = withSpring(1, SPRING_CONFIGS.smooth);
          shadowOpacity.value = withSpring(0.2, SPRING_CONFIGS.smooth);
        })();
        if (!disabled) onPress();
      });

    return (
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={animatedStyle}
          className={className}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole={accessibilityRole}>
          {children}
        </Animated.View>
      </GestureDetector>
    );
  }
);

export default function StrainFilterModal({
  isVisible,
  onClose,
  initialFilters,
  onApplyFilters,
  enableHaptics = true,
  isLoading = false, // Enhanced: Add loading state
}: StrainFilterModalProps) {
  const [currentFilters, setCurrentFilters] = useState<ActiveFilters>(initialFilters);
  const [isApplying, setIsApplying] = useState(false);

  // Enhanced: Improved haptic feedback patterns
  const handleApply = async () => {
    if (enableHaptics) {
      triggerMediumHaptic();
    }

    setIsApplying(true);

    // Wait for onApplyFilters to complete, handling both sync and async cases
    await Promise.resolve(onApplyFilters(currentFilters));

    if (enableHaptics) {
      triggerSuccessHaptic();
    }

    setIsApplying(false);
    onClose();
  };

  const handleReset = () => {
    if (enableHaptics) {
      triggerLightHaptic(); // Enhanced: Use lighter haptic for reset
    }

    const defaultFilters: ActiveFilters = {
      species: null,
      effects: [],
      flavors: [],
      minThc: null,
      maxThc: null,
      minCbd: null,
      maxCbd: null,
      showFavoritesOnly: false, // Enhanced: Reset favorites filter
    };
    setCurrentFilters(defaultFilters);
  };

  // Enhanced: Better close handling with haptics
  const handleClose = () => {
    if (enableHaptics) {
      triggerLightHaptic();
    }
    onClose();
  };

  // Toggle function for multi-select filters (effects, flavors)
  const toggleMultiSelectFilter = (
    filterKey: 'effects' | 'flavors',
    value: StrainEffectType | StrainFlavorType
  ) => {
    if (enableHaptics) {
      triggerSelectionHaptic();
    }

    setCurrentFilters((prevFilters) => {
      const currentSelection = prevFilters[filterKey] as (StrainEffectType | StrainFlavorType)[];
      const isSelected = currentSelection.includes(value);
      let newSelection: (StrainEffectType | StrainFlavorType)[];

      if (isSelected) {
        // Remove value if already selected
        newSelection = currentSelection.filter((item) => item !== value);
      } else {
        // Add value if not selected
        newSelection = [...currentSelection, value];
      }

      return {
        ...prevFilters,
        [filterKey]: newSelection,
      };
    });
  };

  // Enhanced: Add favorites toggle handler
  const handleToggleFavorites = () => {
    if (enableHaptics) {
      triggerLightHaptic();
    }
    setCurrentFilters({
      ...currentFilters,
      showFavoritesOnly: !currentFilters.showFavoritesOnly,
    });
  };

  const renderFilterSection = (title: string, children: React.ReactNode) => (
    <ThemedView variant="card" className="mb-6 p-4">
      <ThemedText className="mb-3 text-lg font-semibold">{title}</ThemedText>
      {children}
    </ThemedView>
  );

  // Enhanced: Improved species selector with better UI
  const renderSpeciesSelector = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mb-2"
      contentContainerStyle={{ paddingRight: 16 }}>
      <View className="flex-row gap-3">
        {SPECIES_OPTIONS.map((option) => {
          const isSelected = currentFilters.species === option.id;
          return (
            <AnimatedSelectionButton
              key={option.id ?? 'any'}
              onPress={() => {
                if (enableHaptics) {
                  triggerSelectionHaptic();
                }
                setCurrentFilters({ ...currentFilters, species: option.id });
              }}
              selected={isSelected}
              disabled={isLoading}
              enableHaptics={enableHaptics}
              className={`
                flex-row items-center rounded-xl border px-4 py-3
                ${getSpeciesBackgroundColor(option.id, isSelected)}
                ${isSelected ? 'border-current' : 'border-neutral-200 dark:border-neutral-700'}
                ${isLoading ? 'opacity-50' : ''}
              `}>
              <OptimizedIcon
                name={getSpeciesIcon(option.id)}
                size={18}
                color={
                  isSelected
                    ? SPECIES_ICON_COLORS[option.id as StrainSpecies] || SPECIES_ICON_COLORS.default
                    : SPECIES_ICON_COLORS.inactive
                }
              />
              <ThemedText className={`font-medium ${getSpeciesColor(option.id, isSelected)}`}>
                {option.name}
              </ThemedText>
            </AnimatedSelectionButton>
          );
        })}
      </View>
    </ScrollView>
  );

  // Render function for Effects (multi-select)
  const renderEffectsSelector = () => (
    <View className="flex-row flex-wrap gap-2">
      {EFFECT_OPTIONS.map((effect) => {
        const isSelected = currentFilters.effects.includes(effect);
        return (
          <AnimatedSelectionButton
            key={effect}
            onPress={() => toggleMultiSelectFilter('effects', effect)}
            selected={isSelected}
            enableHaptics={enableHaptics}
            className={`rounded-full px-3 py-1.5 ${
              isSelected
                ? 'bg-purple-600 dark:bg-purple-700' // Example color for effects
                : 'bg-neutral-200 dark:bg-neutral-700'
            }`}
            accessibilityState={{ selected: isSelected }}
            accessibilityRole="checkbox">
            <ThemedText
              className={`font-medium capitalize ${
                isSelected
                  ? 'text-white dark:text-neutral-100'
                  : 'text-neutral-700 dark:text-neutral-300'
              }`}>
              {effect}
            </ThemedText>
          </AnimatedSelectionButton>
        );
      })}
    </View>
  );

  // Render function for Flavors (multi-select)
  const renderFlavorsSelector = () => (
    <View className="flex-row flex-wrap gap-2">
      {FLAVOR_OPTIONS.map((flavor) => {
        const isSelected = currentFilters.flavors.includes(flavor);
        return (
          <AnimatedSelectionButton
            key={flavor}
            onPress={() => toggleMultiSelectFilter('flavors', flavor)}
            selected={isSelected}
            enableHaptics={enableHaptics}
            className={`rounded-full px-3 py-1.5 ${
              isSelected
                ? 'bg-orange-500 dark:bg-orange-600' // Example color for flavors
                : 'bg-neutral-200 dark:bg-neutral-700'
            }`}
            accessibilityState={{ selected: isSelected }}
            accessibilityRole="checkbox">
            <ThemedText
              className={`font-medium capitalize ${
                isSelected
                  ? 'text-white dark:text-neutral-100'
                  : 'text-neutral-700 dark:text-neutral-300'
              }`}>
              {flavor}
            </ThemedText>
          </AnimatedSelectionButton>
        );
      })}
    </View>
  );

  // Render function for Potency sliders
  const renderPotencySelector = () => (
    <View className="space-y-4">
      <PotencySlider
        label="THC Content"
        min={POTENCY_RANGES.thc.min}
        max={POTENCY_RANGES.thc.max}
        step={POTENCY_RANGES.thc.step}
        minValue={currentFilters.minThc}
        maxValue={currentFilters.maxThc}
        onValueChange={(minThc, maxThc) => {
          setCurrentFilters({
            ...currentFilters,
            minThc,
            maxThc,
          });
        }}
        unit="%"
        enableHaptics={enableHaptics}
      />

      <PotencySlider
        label="CBD Content"
        min={POTENCY_RANGES.cbd.min}
        max={POTENCY_RANGES.cbd.max}
        step={POTENCY_RANGES.cbd.step}
        minValue={currentFilters.minCbd}
        maxValue={currentFilters.maxCbd}
        onValueChange={(minCbd, maxCbd) => {
          setCurrentFilters({
            ...currentFilters,
            minCbd,
            maxCbd,
          });
        }}
        unit="%"
        trackColor="bg-neutral-300 dark:bg-neutral-600"
        activeTrackColor="bg-green-500"
        thumbColor="bg-green-600"
        enableHaptics={enableHaptics}
      />
    </View>
  );

  // Enhanced: Add favorites filter renderer
  const renderFavoritesSelector = () => (
    <AnimatedSelectionButton
      onPress={handleToggleFavorites}
      selected={currentFilters.showFavoritesOnly ?? false}
      disabled={isLoading}
      enableHaptics={enableHaptics}
      className={`
        flex-row items-center justify-between rounded-xl border p-4
        ${
          currentFilters.showFavoritesOnly
            ? 'border-red-500 bg-red-100 dark:border-red-400 dark:bg-red-900/30'
            : 'border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800'
        }
        ${isLoading ? 'opacity-50' : ''}
      `}>
      <View className="flex-row items-center">
        <OptimizedIcon
          name={currentFilters.showFavoritesOnly ? 'heart' : 'heart-outline'}
          size={20}
          color={currentFilters.showFavoritesOnly ? '#dc2626' : '#6b7280'}
        />
        <ThemedText
          className={`ml-3 font-medium ${
            currentFilters.showFavoritesOnly
              ? 'text-red-600 dark:text-red-400'
              : 'text-neutral-700 dark:text-neutral-300'
          }`}>
          Show Favorites Only
        </ThemedText>
      </View>

      {currentFilters.showFavoritesOnly && (
        <View className="rounded-full bg-red-500 px-2 py-1">
          <ThemedText className="text-xs font-medium text-white">Active</ThemedText>
        </View>
      )}
    </AnimatedSelectionButton>
  );

  return (
    <Modal
      animationType="slide"
      transparent={false} // Use false for a full-screen modal
      visible={isVisible}
      onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-white dark:bg-neutral-900">
        {/* Modal Header */}
        <ThemedView
          variant="card"
          className="flex-row items-center justify-between rounded-none border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
          <AnimatedActionButton
            onPress={handleClose}
            disabled={Boolean(isLoading)}
            enableHaptics={enableHaptics}
            accessibilityLabel="Close filters"
            accessibilityRole="button"
            className={isLoading ? 'opacity-50' : ''}>
            <OptimizedIcon name="close" size={28} color="#6b7280" />
          </AnimatedActionButton>
          <ThemedText className="text-xl font-bold">
            {isLoading ? 'Loading Filters...' : 'Filters'}
          </ThemedText>
          <AnimatedActionButton
            onPress={handleReset}
            disabled={Boolean(isLoading)}
            enableHaptics={enableHaptics}
            accessibilityLabel="Reset filters"
            accessibilityRole="button"
            className={isLoading ? 'opacity-50' : ''}>
            <ThemedText className="text-base text-primary-600 dark:text-primary-400">
              Reset
            </ThemedText>
          </AnimatedActionButton>
        </ThemedView>

        {/* Filter Content */}
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {renderFilterSection('Species', renderSpeciesSelector())}
          {renderFilterSection('Favorites', renderFavoritesSelector())}
          {renderFilterSection('Effects', renderEffectsSelector())}
          {renderFilterSection('Flavors', renderFlavorsSelector())}
          {renderFilterSection('Potency Range', renderPotencySelector())}
        </ScrollView>

        {/* Footer / Apply Button */}
        <ThemedView
          variant="card"
          className="rounded-none border-t border-neutral-200 px-4 py-4 dark:border-neutral-700">
          <AnimatedActionButton
            onPress={handleApply}
            disabled={isApplying || isLoading} // Enhanced: Disable when loading
            enableHaptics={enableHaptics}
            className={`items-center justify-center rounded-full py-4 ${
              isApplying || isLoading
                ? 'bg-neutral-400 dark:bg-neutral-600'
                : 'bg-primary-600 dark:bg-primary-700'
            }`}
            accessibilityLabel="Apply selected filters"
            accessibilityRole="button">
            {isApplying || isLoading ? (
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color="white" className="mr-2" />
                <ThemedText className="text-lg font-bold text-white">
                  {isLoading ? 'Loading...' : 'Applying...'}
                </ThemedText>
              </View>
            ) : (
              <ThemedText className="text-lg font-bold text-white">Apply Filters</ThemedText>
            )}
          </AnimatedActionButton>
        </ThemedView>
      </SafeAreaView>
    </Modal>
  );
}
