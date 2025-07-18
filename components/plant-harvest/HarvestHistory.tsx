import React, { useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View, ScrollView, Alert, Share } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { FlashListWrapper } from '../ui/FlashListWrapper';

import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import { Plant } from '../../lib/models/Plant';
import {
  HarvestData,
  PlantComparison,
  comparePlantYields,
  calculateAverageMetrics,
  formatWeight,
  exportHarvestDataToCSV,
  exportHarvestDataToJSON,
} from '../../lib/utils/yield-calculator';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
} from '../../lib/utils/haptics';

export interface HarvestHistoryProps {
  harvests: Array<{ plant: Plant; harvestData: HarvestData }>;
  onExportData?: (format: 'csv' | 'json') => void;
  showComparison?: boolean;
  className?: string;
}

interface HarvestItemProps {
  comparison: PlantComparison;
  index: number;
  isHighlighted?: boolean;
  onPress?: () => void;
}

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 400,
};

const HarvestItem: React.FC<HarvestItemProps> = ({ 
  comparison, 
  index, 
  isHighlighted = false,
  onPress 
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

  const getRankIcon = (index: number): import('../ui/OptimizedIcon').IconName => {
    switch (index) {
      case 0: return 'star';
      case 1: return 'medal';
      case 2: return 'bookmark';
      default: return 'leaf';
    }
  };

  const getRankColor = (index: number) => {
    switch (index) {
      case 0: return 'text-yellow-500';
      case 1: return 'text-gray-400';
      case 2: return 'text-amber-600';
      default: return 'text-neutral-500 dark:text-neutral-400';
    }
  };

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>
        <ThemedView 
          className={`
            rounded-lg border p-4 mb-3
            ${isHighlighted 
              ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800' 
              : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'
            }
          `}
        >
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center space-x-3">
              <OptimizedIcon 
                name={getRankIcon(index)} 
                size={20} 
                className={getRankColor(index)} 
                aria-label={`Rank ${index + 1} icon`} 
              />
              <View>
                <ThemedText className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {comparison.plantName}
                </ThemedText>
                <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
                  {comparison.strain}
                </ThemedText>
              </View>
            </View>
            
            <ThemedText className="text-xs text-neutral-500 dark:text-neutral-500">
              {comparison.harvestDate.toLocaleDateString()}
            </ThemedText>
          </View>

          <View className="flex-row flex-wrap">
            <View className="w-1/2 pb-4 pr-2">
              <ThemedText className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">
                {t('harvestHistory.totalYield')}
              </ThemedText>
              <ThemedText className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                {formatWeight(comparison.totalYield, 'grams')}
              </ThemedText>
            </View>
            <View className="w-1/2 pb-4 pl-2">
              <ThemedText className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">
                {t('harvestHistory.yieldPerDay')}
              </ThemedText>
              <ThemedText className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                {formatWeight(comparison.yieldPerDay, 'grams')}/day
              </ThemedText>
            </View>
            <View className="w-1/2 pt-2 pr-2">
              <ThemedText className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">
                {t('harvestHistory.growDays')}
              </ThemedText>
              <ThemedText className="text-base font-semibold text-neutral-700 dark:text-neutral-300">
                {comparison.growDays} {t('common.days')}
              </ThemedText>
            </View>
            <View className="w-1/2 pt-2 pl-2">
              <ThemedText className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">
                {t('harvestHistory.dryingEfficiency')}
              </ThemedText>
              <ThemedText className="text-base font-semibold text-neutral-700 dark:text-neutral-300">
                {comparison.dryingEfficiency}%
              </ThemedText>
            </View>
          </View>
        </ThemedView>
      </Animated.View>
    </GestureDetector>
  );
};

interface ExportButtonProps {
  onPress: () => void;
  icon: import('../ui/OptimizedIcon').IconName;
  label: string;
  disabled?: boolean;
}

const ExportButton: React.FC<ExportButtonProps> = ({ onPress, icon, label, disabled = false }) => {
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
            flex-row items-center justify-center space-x-2 rounded-lg border px-4 py-3
            ${disabled 
              ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 opacity-50' 
              : 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800'
            }
          `}
        >
          <OptimizedIcon 
            name={icon} 
            size={16} 
            className={disabled 
              ? 'text-neutral-400 dark:text-neutral-600' 
              : 'text-primary-600 dark:text-primary-400'
            }
            aria-label={label}
          />
          <ThemedText 
            className={`text-sm font-medium ${disabled 
              ? 'text-neutral-400 dark:text-neutral-600' 
              : 'text-primary-600 dark:text-primary-400'
            }`}
          >
            {label}
          </ThemedText>
        </ThemedView>
      </Animated.View>
    </GestureDetector>
  );
};

export const HarvestHistory: React.FC<HarvestHistoryProps> = ({
  harvests,
  onExportData,
  showComparison = true,
  className = '',
}) => {
  const { t } = useTranslation();
  const [selectedHarvest, setSelectedHarvest] = useState<string | null>(null);

  const comparisons = useMemo(() => {
    return comparePlantYields(harvests);
  }, [harvests]);

  const averageMetrics = useMemo(() => {
    return calculateAverageMetrics(comparisons);
  }, [comparisons]);

  const handleExportCSV = useCallback(async () => {
    try {
      triggerLightHaptic();
      const csvData = exportHarvestDataToCSV(comparisons);
      
      if (onExportData) {
        onExportData('csv');
      } else {
        // Default share behavior
        await Share.share({
          message: csvData,
          title: t('harvestHistory.export.csvTitle'),
        });
      }
    } catch (error) {
      console.error('CSV export error:', error);
      Alert.alert(t('harvestHistory.export.error'), t('harvestHistory.export.csvError'));
    }
  }, [comparisons, onExportData, t]);

  const handleExportJSON = useCallback(async () => {
    try {
      triggerLightHaptic();
      const jsonData = exportHarvestDataToJSON(comparisons);
      
      if (onExportData) {
        onExportData('json');
      } else {
        // Default share behavior
        await Share.share({
          message: jsonData,
          title: t('harvestHistory.export.jsonTitle'),
        });
      }
    } catch (error) {
      console.error('JSON export error:', error);
      Alert.alert(t('harvestHistory.export.error'), t('harvestHistory.export.jsonError'));
    }
  }, [comparisons, onExportData, t]);

  const handleHarvestPress = useCallback((plantId: string) => {
    triggerMediumHaptic();
    setSelectedHarvest(selectedHarvest === plantId ? null : plantId);
  }, [selectedHarvest]);

  if (harvests.length === 0) {
    return (
      <ThemedView className={`items-center justify-center py-12 ${className}`}>
        <OptimizedIcon 
          name="leaf-outline" 
          size={64} 
          className="text-neutral-300 dark:text-neutral-600 mb-4" 
        />
        <ThemedText variant="heading" className="text-lg font-semibold mb-2">
          {t('harvestHistory.empty.title')}
        </ThemedText>
        <ThemedText variant="muted" className="text-center">
          {t('harvestHistory.empty.subtitle')}
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
          {t('harvestHistory.title')}
        </ThemedText>
        <ThemedText variant="muted" className="text-center text-sm">
          {t('harvestHistory.subtitle', { count: harvests.length })}
        </ThemedText>
      </ThemedView>

      {/* Summary Statistics */}
      {averageMetrics && showComparison && (
            <ThemedView className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4">
              <ThemedText variant="heading" className="text-base font-semibold mb-3">
                {t('harvestHistory.summary.title')}
              </ThemedText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <View style={{ width: '50%', paddingBottom: 16, paddingRight: 8 }}>
                  <ThemedText className="text-xs font-medium text-primary-600 dark:text-primary-400 uppercase tracking-wide">
                    {t('harvestHistory.summary.averageYield')}
                  </ThemedText>
                  <ThemedText className="text-lg font-bold text-primary-700 dark:text-primary-300">
                    {formatWeight(averageMetrics.averageTotalYield, 'grams')}
                  </ThemedText>
                </View>
                <View style={{ width: '50%', paddingBottom: 16, paddingLeft: 8 }}>
                  <ThemedText className="text-xs font-medium text-primary-600 dark:text-primary-400 uppercase tracking-wide">
                    {t('harvestHistory.summary.bestYield')}
                  </ThemedText>
                  <ThemedText className="text-lg font-bold text-primary-700 dark:text-primary-300">
                    {formatWeight(averageMetrics.bestYield, 'grams')}
                  </ThemedText>
                </View>
                <View style={{ width: '50%', paddingTop: 8, paddingRight: 8 }}>
                  <ThemedText className="text-xs font-medium text-primary-600 dark:text-primary-400 uppercase tracking-wide">
                    {t('harvestHistory.summary.averageGrowDays')}
                  </ThemedText>
                  <ThemedText className="text-base font-semibold text-primary-700 dark:text-primary-300">
                    {averageMetrics.averageGrowDays} {t('common.days')}
                  </ThemedText>
                </View>
                <View style={{ width: '50%', paddingTop: 8, paddingLeft: 8 }}>
                  <ThemedText className="text-xs font-medium text-primary-600 dark:text-primary-400 uppercase tracking-wide">
                    {t('harvestHistory.summary.totalHarvests')}
                  </ThemedText>
                  <ThemedText className="text-base font-semibold text-primary-700 dark:text-primary-300">
                    {averageMetrics.totalHarvests}
                  </ThemedText>
                </View>
              </View>
            </ThemedView>
      )}

      {/* Export Actions */}
      <ThemedView className="flex-row space-x-4">
        <View className="flex-1">
          <ExportButton
            onPress={handleExportCSV}
            icon="document-text-outline"
            label={t('harvestHistory.export.csv')}
            disabled={comparisons.length === 0}
          />
        </View>
        <View className="flex-1">
          <ExportButton
            onPress={handleExportJSON}
            icon="code-working"
            label={t('harvestHistory.export.json')}
            disabled={comparisons.length === 0}
          />
        </View>
      </ThemedView>

      {/* Harvest Timeline */}
      <ThemedView>
        <ThemedText variant="heading" className="text-base font-semibold mb-4">
          {t('harvestHistory.timeline.title')}
        </ThemedText>
        
        <View className="h-96">
          <FlashListWrapper
            data={comparisons}
            renderItem={({ item: comparison, index }) => (
              <HarvestItem
                comparison={comparison}
                index={index}
                isHighlighted={selectedHarvest === comparison.plantId}
                onPress={() => handleHarvestPress(comparison.plantId)}
              />
            )}
            estimatedItemSize={140}
            keyExtractor={(item) => item.plantId}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </ThemedView>
    </ThemedView>
  );
};

export default HarvestHistory;