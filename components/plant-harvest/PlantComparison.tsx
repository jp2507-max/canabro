import React, { useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import { Plant } from '../../lib/models/Plant';
import {
  HarvestData,
  PlantComparison as PlantComparisonType,
  comparePlantYields,
  formatWeight,
  convertWeight,
} from '../../lib/utils/yield-calculator';
import {
  triggerLightHaptic,
} from '../../lib/utils/haptics';

export interface PlantComparisonProps {
  harvests: Array<{ plant: Plant; harvestData: HarvestData }>;
  selectedPlants?: string[];
  onPlantSelect?: (plantId: string) => void;
  sortBy?: 'totalYield' | 'yieldPerDay' | 'growDays' | 'dryingEfficiency';
  className?: string;
}

interface ComparisonCardProps {
  comparison: PlantComparisonType;
  isSelected?: boolean;
  onPress?: () => void;
  rank: number;
}

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 400,
};

const ComparisonCard: React.FC<ComparisonCardProps> = ({ 
  comparison, 
  isSelected = false, 
  onPress,
  rank 
}) => {
  const { t } = useTranslation();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const gesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      scale.value = withTiming(0.98, { duration: 100 });
    })
    .onFinalize(() => {
      'worklet';
      scale.value = withSpring(1, SPRING_CONFIG);
      if (onPress) {
        runOnJS(onPress)();
      }
    });

  const getRankBadge = (rank: number): { icon: import('../ui/OptimizedIcon').IconName; color: string; bg: string } => {
    if (rank === 1) return { icon: 'star', color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20' };
    if (rank === 2) return { icon: 'medal', color: 'text-gray-400', bg: 'bg-gray-50 dark:bg-gray-900/20' };
    if (rank === 3) return { icon: 'bookmark', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' };
    return { icon: 'leaf', color: 'text-neutral-500 dark:text-neutral-400', bg: 'bg-neutral-50 dark:bg-neutral-800' };
  };

  const rankBadge = getRankBadge(rank);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>
        <ThemedView 
          className={`rounded-lg border p-4 mb-3 relative ${isSelected 
            ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700' 
            : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'
          }`}
        >
          {/* Rank Badge */}
          <View
            className={`absolute -top-2 -right-2 w-8 h-8 rounded-full ${rankBadge.bg} items-center justify-center border border-neutral-200 dark:border-neutral-700`}
          >
            <OptimizedIcon name={rankBadge.icon} size={16} className={rankBadge.color} />
          </View>

          {/* Selection Indicator */}
          {isSelected && (
            <View
              accessible={true}
              accessibilityLabel={isSelected ? 'Selected plant indicator' : 'Unselected plant indicator'}
              className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-primary-500 items-center justify-center"
            >
              <OptimizedIcon name="checkmark" size={12} className="text-white" />
            </View>
          )}

          {/* Plant Info */}
          <View className="mb-4">
            <ThemedText className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              {comparison.plantName}
            </ThemedText>
            <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
              {comparison.strain}
            </ThemedText>
            <ThemedText className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
              {t('plantComparison.harvestedOn', { date: comparison.harvestDate.toLocaleDateString() })}
            </ThemedText>
          </View>

          {/* Metrics Flexbox Layout */}
          <View className="flex-row flex-wrap">
            <View className="w-1/2 p-1">
              <ThemedView className="bg-white dark:bg-neutral-900 rounded-lg p-3">
                <View className="flex-row items-center space-x-2 mb-1">
                  <OptimizedIcon name="scale-balance" size={16} className="text-primary-600 dark:text-primary-400" />
                  <ThemedText className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">
                    {t('plantComparison.totalYield')}
                  </ThemedText>
                </View>
                <ThemedText className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  {formatWeight(comparison.totalYield, 'grams')}
                </ThemedText>
              </ThemedView>
            </View>
            <View className="w-1/2 p-1">
              <ThemedView className="bg-white dark:bg-neutral-900 rounded-lg p-3">
                <View className="flex-row items-center space-x-2 mb-1">
                  <OptimizedIcon name="arrow-expand-vertical" size={16} className="text-primary-600 dark:text-primary-400" />
                  <ThemedText className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">
                    {t('plantComparison.yieldPerDay')}
                  </ThemedText>
                </View>
                <ThemedText className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  {formatWeight(comparison.yieldPerDay, 'grams')}/day
                </ThemedText>
              </ThemedView>
            </View>
            <View className="w-1/2 p-1">
              <ThemedView className="bg-white dark:bg-neutral-900 rounded-lg p-3">
                <View className="flex-row items-center space-x-2 mb-1">
                  <OptimizedIcon name="calendar-outline" size={16} className="text-primary-600 dark:text-primary-400" />
                  <ThemedText className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">
                    {t('plantComparison.growDays')}
                  </ThemedText>
                </View>
                <ThemedText className="text-base font-semibold text-neutral-700 dark:text-neutral-300">
                  {comparison.growDays} {t('common.days')}
                </ThemedText>
              </ThemedView>
            </View>
            <View className="w-1/2 p-1">
              <ThemedView className="bg-white dark:bg-neutral-900 rounded-lg p-3">
                <View className="flex-row items-center space-x-2 mb-1">
                  <OptimizedIcon name="water-outline" size={16} className="text-primary-600 dark:text-primary-400" />
                  <ThemedText className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">
                    {t('plantComparison.dryingEfficiency')}
                  </ThemedText>
                </View>
                <ThemedText className="text-base font-semibold text-neutral-700 dark:text-neutral-300">
                  {comparison.dryingEfficiency}%
                </ThemedText>
              </ThemedView>
            </View>
          </View>
        </ThemedView>
      </Animated.View>
    </GestureDetector>
  );
};interface SortButtonProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

const SortButton: React.FC<SortButtonProps> = ({ label, isActive, onPress }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const gesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      scale.value = withTiming(0.95, { duration: 100 });
    })
    .onFinalize(() => {
      'worklet';
      scale.value = withSpring(1, SPRING_CONFIG);
      runOnJS(onPress)();
    });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>
        <ThemedView 
          className={`
            px-3 py-2 rounded-lg border
            ${isActive 
              ? 'bg-primary-500 border-primary-500' 
              : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'
            }
          `}
        >
          <ThemedText 
            className={`text-sm font-medium ${isActive 
              ? 'text-white' 
              : 'text-neutral-700 dark:text-neutral-300'
            }`}
          >
            {label}
          </ThemedText>
        </ThemedView>
      </Animated.View>
    </GestureDetector>
  );
};

export const PlantComparison: React.FC<PlantComparisonProps> = ({
  harvests,
  selectedPlants = [],
  onPlantSelect,
  sortBy = 'totalYield',
  className = '',
}) => {
  const { t } = useTranslation();
  const [currentSort, setCurrentSort] = useState<typeof sortBy>(sortBy);

  const sortedComparisons = useMemo(() => {
    const comparisons = comparePlantYields(harvests);
    
    return comparisons.sort((a, b) => {
      switch (currentSort) {
        case 'yieldPerDay':
          return b.yieldPerDay - a.yieldPerDay;
        case 'growDays':
          return a.growDays - b.growDays; // Ascending for grow days (faster is better)
        case 'dryingEfficiency':
          return b.dryingEfficiency - a.dryingEfficiency;
        case 'totalYield':
        default:
          return b.totalYield - a.totalYield;
      }
    });
  }, [harvests, currentSort]);

  const handlePlantPress = useCallback((plantId: string) => {
    triggerLightHaptic();
    if (onPlantSelect) {
      onPlantSelect(plantId);
    }
  }, [onPlantSelect]);

  const handleSortChange = useCallback((newSort: typeof sortBy) => {
    triggerLightHaptic();
    setCurrentSort(newSort);
  }, []);

  if (harvests.length === 0) {
    return (
      <ThemedView className={`items-center justify-center py-12 ${className}`}>
        <OptimizedIcon 
          name="stats-chart-outline" 
          size={64} 
          className="text-neutral-300 dark:text-neutral-600 mb-4" 
        />
        <ThemedText variant="heading" className="text-lg font-semibold mb-2">
          {t('plantComparison.empty.title')}
        </ThemedText>
        <ThemedText variant="muted" className="text-center">
          {t('plantComparison.empty.subtitle')}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView className={`space-y-6 ${className}`}>
      {/* Header */}
      <ThemedView className="items-center space-y-2">
        <OptimizedIcon 
          name="stats-chart-outline" 
          size={32} 
          className="text-primary-600 dark:text-primary-400" 
        />
        <ThemedText variant="heading" className="text-xl font-bold">
          {t('plantComparison.title')}
        </ThemedText>
        <ThemedText variant="muted" className="text-center text-sm">
          {t('plantComparison.subtitle', { count: harvests.length })}
        </ThemedText>
      </ThemedView>

      {/* Sort Controls */}
      <ThemedView>
        <ThemedText className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-3">
          {t('plantComparison.sortBy')}
        </ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row space-x-2">
          <SortButton
            label={t('plantComparison.sort.totalYield')}
            isActive={currentSort === 'totalYield'}
            onPress={() => handleSortChange('totalYield')}
          />
          <SortButton
            label={t('plantComparison.sort.yieldPerDay')}
            isActive={currentSort === 'yieldPerDay'}
            onPress={() => handleSortChange('yieldPerDay')}
          />
          <SortButton
            label={t('plantComparison.sort.growDays')}
            isActive={currentSort === 'growDays'}
            onPress={() => handleSortChange('growDays')}
          />
          <SortButton
            label={t('plantComparison.sort.dryingEfficiency')}
            isActive={currentSort === 'dryingEfficiency'}
            onPress={() => handleSortChange('dryingEfficiency')}
          />
        </ScrollView>
      </ThemedView>

      {/* Comparison Cards */}
      <ScrollView className="max-h-96">
        {sortedComparisons.map((comparison, index) => (
          <ComparisonCard
            key={comparison.plantId}
            comparison={comparison}
            rank={index + 1}
            isSelected={selectedPlants.includes(comparison.plantId)}
            onPress={() => handlePlantPress(comparison.plantId)}
          />
        ))}
      </ScrollView>

      {/* Selection Summary */}
      {selectedPlants.length > 0 && (
        <ThemedView className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4">
          <ThemedText className="text-sm font-medium text-primary-600 dark:text-primary-400 mb-2">
            {t('plantComparison.selected', { count: selectedPlants.length })}
          </ThemedText>
          <View className="flex-row flex-wrap gap-2">
            {selectedPlants.map(plantId => {
              const plant = sortedComparisons.find(c => c.plantId === plantId);
              return plant ? (
                <ThemedView 
                  key={plantId}
                  className="bg-primary-100 dark:bg-primary-800 rounded-full px-3 py-1"
                >
                  <ThemedText className="text-xs font-medium text-primary-700 dark:text-primary-300">
                    {plant.plantName}
                  </ThemedText>
                </ThemedView>
              ) : null;
            })}
          </View>
        </ThemedView>
      )}
    </ThemedView>
  );
};

export default PlantComparison;