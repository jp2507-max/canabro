import React, { useState } from 'react';
import { Modal, View, Pressable, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../lib/contexts/ThemeContext';
import { StrainSpecies, StrainEffectType, StrainFlavorType } from '../../lib/types/strain'; // Assuming these enums/types exist
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';
import { OptimizedIcon } from '../ui/OptimizedIcon';

// Define the structure for active filters
export interface ActiveFilters {
  species: StrainSpecies | null;
  effects: StrainEffectType[];
  flavors: StrainFlavorType[];
  minThc: number | null;
  maxThc: number | null;
  minCbd: number | null;
  maxCbd: number | null;
}

interface StrainFilterModalProps {
  isVisible: boolean;
  onClose: () => void;
  initialFilters: ActiveFilters;
  onApplyFilters: (filters: ActiveFilters) => void;
}

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

// TODO: Add options for Potency ranges

export default function StrainFilterModal({
  isVisible,
  onClose,
  initialFilters,
  onApplyFilters,
}: StrainFilterModalProps) {
  const { theme, isDarkMode } = useTheme();
  const [currentFilters, setCurrentFilters] = useState<ActiveFilters>(initialFilters);

  const handleApply = () => {
    onApplyFilters(currentFilters);
    onClose();
  };

  const handleReset = () => {
    const defaultFilters: ActiveFilters = {
      species: null,
      effects: [],
      flavors: [],
      minThc: null,
      maxThc: null,
      minCbd: null,
      maxCbd: null,
    };
    setCurrentFilters(defaultFilters);
    // Optionally apply immediately on reset or wait for explicit apply
    // onApplyFilters(defaultFilters);
    // onClose();
  };

  // Toggle function for multi-select filters (effects, flavors)
  const toggleMultiSelectFilter = (
    filterKey: 'effects' | 'flavors',
    value: StrainEffectType | StrainFlavorType
  ) => {
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

  const renderFilterSection = (title: string, children: React.ReactNode) => (
    <ThemedView
      className="mb-6 rounded-lg border p-4"
      lightClassName="border-neutral-200 bg-white"
      darkClassName="border-neutral-700 bg-neutral-800">
      <ThemedText className="mb-3 text-lg font-semibold">{title}</ThemedText>
      {children}
    </ThemedView>
  );

  const renderSpeciesSelector = () => (
    <View className="flex-row flex-wrap gap-2">
      {SPECIES_OPTIONS.map((option) => (
        <TouchableOpacity
          key={option.id ?? 'any'}
          onPress={() => setCurrentFilters({ ...currentFilters, species: option.id })}
          className={`rounded-full px-4 py-2 ${
            currentFilters.species === option.id
              ? 'bg-primary-600 dark:bg-primary-700'
              : 'bg-neutral-200 dark:bg-neutral-700'
          }`}
          accessibilityState={{ selected: currentFilters.species === option.id }}
          accessibilityRole="radio">
          <ThemedText
            className={`font-medium ${
              currentFilters.species === option.id
                ? 'text-white dark:text-neutral-100'
                : 'text-neutral-700 dark:text-neutral-300'
            }`}>
            {option.name}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Render function for Effects (multi-select)
  const renderEffectsSelector = () => (
    <View className="flex-row flex-wrap gap-2">
      {EFFECT_OPTIONS.map((effect) => {
        const isSelected = currentFilters.effects.includes(effect);
        return (
          <TouchableOpacity
            key={effect}
            onPress={() => toggleMultiSelectFilter('effects', effect)}
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
          </TouchableOpacity>
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
          <TouchableOpacity
            key={flavor}
            onPress={() => toggleMultiSelectFilter('flavors', flavor)}
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
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // TODO: Implement render functions for Potency

  return (
    <Modal
      animationType="slide"
      transparent={false} // Use false for a full-screen modal
      visible={isVisible}
      onRequestClose={onClose}>
      <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
        {/* Modal Header */}
        <ThemedView
          className="flex-row items-center justify-between border-b px-4 py-3"
          lightClassName="border-neutral-200"
          darkClassName="border-neutral-700">
          <Pressable
            onPress={onClose}
            accessibilityLabel="Close filters"
            accessibilityRole="button">
            <OptimizedIcon name="close" size={28} color={theme.colors.neutral[isDarkMode ? 100 : 900]} />
          </Pressable>
          <ThemedText className="text-xl font-bold">Filters</ThemedText>
          <Pressable
            onPress={handleReset}
            accessibilityLabel="Reset filters"
            accessibilityRole="button">
            <ThemedText className="text-base text-primary-600 dark:text-primary-400">
              Reset
            </ThemedText>
          </Pressable>
        </ThemedView>

        {/* Filter Content */}
        <ScrollView contentContainerStyle={{ padding: theme.spacing[4] }}>
          {renderFilterSection('Species', renderSpeciesSelector())}
          {renderFilterSection('Effects', renderEffectsSelector())}
          {renderFilterSection('Flavors', renderFlavorsSelector())}
          {/* TODO: Add sections for Potency */}
          {/* {renderFilterSection('Potency (THC/CBD)', renderPotencySelector())} */}
        </ScrollView>

        {/* Footer / Apply Button */}
        <ThemedView
          className="border-t px-4 py-4"
          lightClassName="border-neutral-200"
          darkClassName="border-neutral-700">
          <TouchableOpacity
            onPress={handleApply}
            className="items-center justify-center rounded-full bg-primary-600 py-4 dark:bg-primary-700"
            accessibilityLabel="Apply selected filters"
            accessibilityRole="button">
            <ThemedText className="text-lg font-bold text-white">Apply Filters</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </SafeAreaView>
    </Modal>
  );
}
